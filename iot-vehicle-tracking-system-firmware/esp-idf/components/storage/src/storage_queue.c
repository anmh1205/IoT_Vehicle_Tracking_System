/**
 * @file storage_queue.c
 * @brief Offline queue trên SD: lưu bản ghi chưa gửi được và đưa lại khi có mạng.
 *
 * ## Định dạng trên thẻ
 *
 *     /sd/q/QNNNNNNN.BIN   file đoạn, chỉ nối thêm. Mỗi khung:
 *                          A5 | len | payload[len] | crc32(len + payload) little-endian
 *     /sd/q/CURSOR.BIN     {magic, seg, off, crc}: vị trí bản ghi chưa gửi cũ nhất
 *
 * ## Ngữ nghĩa
 *
 * - Chính sách khi đầy: bỏ đoạn cũ nhất, vì dữ liệu vị trí gần đây có giá trị hơn dữ liệu cũ.
 * - At-least-once: bản ghi chỉ rời queue sau pop (sau khi cloud ACK). Cursor chỉ được ghi xuống
 *   thẻ mỗi CURSOR_EVERY lần pop, nên reset có thể làm vài bản ghi đã gửi được gửi lại. Điều này
 *   chấp nhận được vì mỗi bản ghi mang boot_id và seq, cloud khử trùng lặp theo hai giá trị đó.
 *   Không bảo đảm exactly-once.
 *
 * ## Mô hình thực thi
 *
 * - Task "storage" là writer duy nhất của file đoạn, cursor và các biến s_head, s_tail,
 *   s_tail_size, s_rd_seg, s_rd_off, s_pops (không cần khoá).
 * - Ô peek (s_slot), bộ đếm s_pending và s_token được chia sẻ giữa task "storage" (ghi) và task
 *   "app" (đọc qua storage_queue_peek_copy() và storage_queue_pending()). Mutex s_mx bảo vệ cả
 *   ba. Mutex chỉ giữ trong lúc sao chép hoặc đổi cờ; không giữ khi truy cập file hay gọi sink.
 * - Luồng replay: app yêu cầu peek -> task "storage" nạp ô peek và phát IVTS_EV_QUEUE_READY ->
 *   app sao chép ô peek, gửi, nhận ACK -> app yêu cầu pop -> task "storage" giải phóng ô và
 *   dịch cursor. Ô peek chỉ chứa một bản ghi; peek khi ô còn đầy là không làm gì.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * - Mất nguồn trong lúc ghi khung: khung cuối bị dở; storage_queue_open() quét đoạn cuối và cắt
 *   bỏ phần dở bằng truncate().
 * - Cursor hỏng (ghi dở, CRC sai) hoặc nằm ngoài dải đoạn hiện có: đọc lại từ đầu đoạn cũ nhất;
 *   bản ghi đã gửi được gửi lại và cloud khử trùng.
 * - Yêu cầu push đang chờ trong queue RAM của task "storage" bị mất khi reset (xem storage_os.c).
 */

#include "storage_priv.h"
#include <dirent.h>
#include <errno.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#include "esp_log.h"
#include "platform/platform_clock.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "ivts_core/base/crc32.h"
#include "ivts_core/model/record.h"

#define Q_DIR          SD_MOUNT "/q"        /* Thư mục chứa các đoạn và cursor. */
#define CURSOR_PATH    Q_DIR "/CURSOR.BIN"
#define FRAME_MAGIC    0xA5u                /* Byte đầu của mỗi khung. */
#define FRAME_OVERHEAD 6u                   /* Magic (1) + len (1) + CRC32 (4). */
#define CURSOR_MAGIC   0x51435552u          /* ASCII "QCUR". */
#define CURSOR_EVERY   16u                  /* Ghi cursor xuống thẻ sau mỗi chừng này lần pop. */
#define MAX_SEGMENT_ID 9999999u             /* Số hiệu 7 chữ số trong tên FAT 8.3. */

enum { FRAME_END = 0, FRAME_CORRUPT = -1, FRAME_IO = -2 };

_Static_assert(IVTS_RECORD_MAX_SIZE <= UINT8_MAX, "độ dài khung phải vừa một byte");

/** Nội dung file cursor; crc phủ các trường đứng trước. */
typedef struct { uint32_t magic, seg, off, crc; } cursor_t;

/* Trạng thái chỉ task "storage" truy cập (và storage_queue_open() trước khi task chạy). */
static uint32_t s_head;        /* Số của đoạn cũ nhất còn tồn tại. */
static uint32_t s_tail;        /* Số của đoạn đang ghi. */
static uint32_t s_tail_size;   /* Kích thước đoạn đang ghi, byte. */
static uint32_t s_rd_seg;      /* Đoạn chứa bản ghi chưa gửi cũ nhất. */
static uint32_t s_rd_off;      /* Vị trí của bản ghi đó trong đoạn. */
static uint32_t s_pops;        /* Số lần pop kể từ lần ghi cursor gần nhất. */
static bool s_open;            /* storage_queue_open() đã thành công. */
static bool s_tail_needs_repair;

/* Trạng thái dùng chung giữa task "storage" và task "app"; bảo vệ bằng s_mx. */
static SemaphoreHandle_t s_mx;
static struct {
    bool     full;                          /* Ô đang giữ một bản ghi chưa pop. */
    uint8_t  data[IVTS_RECORD_MAX_SIZE];    /* Bản ghi đã mã hoá. */
    size_t   len;
    uint32_t token;                         /* Định danh để pop. */
    uint32_t next_seg, next_off;            /* Vị trí cursor sau khi pop bản ghi này. */
} s_slot;
static uint32_t s_pending;     /* Số bản ghi còn trong queue, kể cả bản ghi trong ô peek. */
static uint32_t s_token;       /* Bộ đếm cấp token. */

/** Tạo đường dẫn file của đoạn @p seg. */
static void seg_path(char *out, size_t n, uint32_t seg)
{
    snprintf(out, n, Q_DIR "/Q%07lu.BIN", (unsigned long)seg);
}

static bool segment_id(const char *name, uint32_t *id)
{
    if (strlen(name) != sizeof("Q0000000.BIN") - 1u || name[0] != 'Q' ||
        strcmp(name + 8, ".BIN") != 0) {
        return false;
    }
    uint32_t value = 0;
    for (size_t i = 1; i < 8; i++) {
        if (name[i] < '0' || name[i] > '9') { return false; }
        value = value * 10u + (uint32_t)(name[i] - '0');
    }
    *id = value;
    return true;
}

/* Bỏ qua khoảng trống trong một lần quét thư mục nếu file kế tiếp đã biến mất. */
static bool next_segment(uint32_t first, uint32_t *next)
{
    *next = s_tail;
    DIR *dir = opendir(Q_DIR);
    if (dir == NULL) { return false; }
    for (;;) {
        errno = 0;
        struct dirent *entry = readdir(dir);
        if (entry == NULL) { break; }
        uint32_t id;
        if (segment_id(entry->d_name, &id) && id >= first && id < *next) { *next = id; }
    }
    bool ok = errno == 0;
    closedir(dir);
    return ok;
}

/* Xem storage_priv.h. */
void storage_queue_slot_init(void)
{
    s_mx = xSemaphoreCreateMutex();
}

/** Đặt bộ đếm bản ghi còn lại, dưới mutex. */
static void set_pending(uint32_t v)
{
    xSemaphoreTake(s_mx, portMAX_DELAY);
    s_pending = v;
    xSemaphoreGive(s_mx);
}

/* Xem storage.h. */
uint32_t storage_queue_pending(void)
{
    if (s_mx == NULL) { return 0; }
    xSemaphoreTake(s_mx, portMAX_DELAY);
    uint32_t v = s_pending;
    xSemaphoreGive(s_mx);
    return v;
}

/**
 * @brief Đọc và kiểm tra khung tại vị trí @p off.
 * @param[out] payload Nơi nhận payload; có thể NULL nếu chỉ cần kiểm tra.
 * @param[out] len     Độ dài payload.
 * @return Kích thước khung (> 0), FRAME_END, FRAME_CORRUPT hoặc FRAME_IO.
 */
static int read_frame(FILE *f, uint32_t off, uint8_t *payload, size_t *len)
{
    uint8_t h[2];
    if (fseek(f, (long)off, SEEK_SET) != 0) { return FRAME_IO; }
    size_t n = fread(h, 1, sizeof h, f);
    if (ferror(f)) { return FRAME_IO; }
    if (n == 0u) { return FRAME_END; }
    if (n != sizeof h || h[0] != FRAME_MAGIC || h[1] == 0u || h[1] > IVTS_RECORD_MAX_SIZE) {
        return FRAME_CORRUPT;
    }
    uint8_t tail[IVTS_RECORD_MAX_SIZE + 4];
    if (fread(tail, 1, (size_t)h[1] + 4u, f) != (size_t)h[1] + 4u) {
        return ferror(f) ? FRAME_IO : FRAME_CORRUPT;
    }
    uint32_t crc = ivts_crc32(0, &h[1], 1);
    crc = ivts_crc32(crc, tail, h[1]);
    uint32_t got = (uint32_t)tail[h[1]] | ((uint32_t)tail[h[1] + 1] << 8) |
                   ((uint32_t)tail[h[1] + 2] << 16) | ((uint32_t)tail[h[1] + 3] << 24);
    if (crc != got) { return FRAME_CORRUPT; }
    if (payload != NULL) { memcpy(payload, tail, h[1]); *len = h[1]; }
    return (int)(h[1] + FRAME_OVERHEAD);
}

/**
 * @brief Đếm các khung hợp lệ liên tiếp của đoạn @p seg, bắt đầu từ @p off.
 * @param[out] valid_end Vị trí ngay sau khung hợp lệ cuối cùng.
 * @return Trạng thái kết thúc scan; file không tồn tại được xem là đoạn rỗng.
 */
static int scan_segment(uint32_t seg, uint32_t off, uint32_t *valid_end, uint32_t *count)
{
    char p[48];
    seg_path(p, sizeof p, seg);
    FILE *f = fopen(p, "rb");
    *valid_end = off;
    *count = 0;
    if (f == NULL) { return errno == ENOENT ? FRAME_END : FRAME_IO; }
    int k;
    while ((k = read_frame(f, off, NULL, NULL)) > 0) {
        off += (uint32_t)k;
        (*count)++;
    }
    *valid_end = off;
    return fclose(f) == 0 ? k : FRAME_IO;
}

/** Ghi cursor xuống thẻ và đặt lại s_pops. Lỗi ghi bị bỏ qua: cursor chỉ là tối ưu hoá. */
static void cursor_save(void)
{
    cursor_t c = { CURSOR_MAGIC, s_rd_seg, s_rd_off, 0 };
    c.crc = ivts_crc32(0, &c, offsetof(cursor_t, crc));
    FILE *f = fopen(CURSOR_PATH, "wb");
    if (f == NULL) { return; }
    size_t written = fwrite(&c, 1, sizeof c, f);
    if (fclose(f) == 0 && written == sizeof c) { s_pops = 0; }
}

/** Nạp cursor vào s_rd_seg và s_rd_off. @return false nếu thiếu file hoặc file không hợp lệ. */
static bool cursor_load(void)
{
    cursor_t c;
    FILE *f = fopen(CURSOR_PATH, "rb");
    if (f == NULL) { return false; }
    size_t n = fread(&c, 1, sizeof c, f);
    fclose(f);
    if (n != sizeof c || c.magic != CURSOR_MAGIC || c.crc != ivts_crc32(0, &c, offsetof(cursor_t, crc))) {
        return false;
    }
    s_rd_seg = c.seg;
    s_rd_off = c.off;
    return true;
}

/*
 * Xem storage_priv.h. Các bước: tìm dải đoạn hiện có; cắt khung dở ở đoạn cuối; nạp cursor (hoặc
 * bắt đầu từ đoạn cũ nhất nếu cursor không hợp lệ); đếm số bản ghi chưa gửi.
 */
esp_err_t storage_queue_open(void)
{
    s_open = false;
    if (s_mx == NULL || g_storage_cfg.queue_max_segments < 2u ||
        g_storage_cfg.queue_segment_bytes < IVTS_RECORD_MAX_SIZE + FRAME_OVERHEAD) {
        return ESP_ERR_INVALID_ARG;
    }
    if (mkdir(Q_DIR, 0775) != 0 && errno != EEXIST) { return ESP_FAIL; }
    DIR *d = opendir(Q_DIR);
    if (d == NULL) { return ESP_FAIL; }
    s_head = UINT32_MAX;
    s_tail = 0;
    for (;;) {
        errno = 0;
        struct dirent *de = readdir(d);
        if (de == NULL) { break; }
        uint32_t v;
        if (segment_id(de->d_name, &v)) {
            if (v < s_head) { s_head = v; }
            if (v > s_tail) { s_tail = v; }
        }
    }
    bool listed = errno == 0;
    closedir(d);
    if (!listed) { return ESP_FAIL; }
    if (s_head == UINT32_MAX) { s_head = s_tail = 0; }

    /* Cắt khung dở ở cuối đoạn đang ghi (nguồn mất giữa lúc fwrite). */
    uint32_t total_in_tail;
    int result = scan_segment(s_tail, 0, &s_tail_size, &total_in_tail);
    if (result == FRAME_IO) { return ESP_FAIL; }
    if (result == FRAME_CORRUPT) {
        char path[48];
        seg_path(path, sizeof path, s_tail);
        if (truncate(path, (off_t)s_tail_size) != 0) { return ESP_FAIL; }
        ESP_LOGW(STORAGE_TAG, "queue: bỏ phần khung dở ở %s", path);
    }
    if (!cursor_load() || s_rd_seg < s_head || s_rd_seg > s_tail) {
        s_rd_seg = s_head;
        s_rd_off = 0;
    }
    if (s_rd_seg == s_tail && s_rd_off > s_tail_size) { s_rd_off = 0; }
    uint32_t pending = 0;
    d = opendir(Q_DIR);
    if (d == NULL) { return ESP_FAIL; }
    for (;;) {
        errno = 0;
        struct dirent *de = readdir(d);
        if (de == NULL) { listed = errno == 0; break; }
        uint32_t seg;
        if (!segment_id(de->d_name, &seg) || seg < s_rd_seg) { continue; }
        uint32_t count = total_in_tail;
        if (seg != s_tail || (seg == s_rd_seg && s_rd_off != 0u)) {
            uint32_t end;
            if (scan_segment(seg, seg == s_rd_seg ? s_rd_off : 0u, &end, &count) == FRAME_IO) {
                listed = false;
                break;
            }
        }
        pending += count;
    }
    closedir(d);
    if (!listed) { return ESP_FAIL; }
    xSemaphoreTake(s_mx, portMAX_DELAY);
    s_slot.full = false;
    s_pending = pending;
    xSemaphoreGive(s_mx);
    s_pops = 0;
    s_tail_needs_repair = false;
    s_open = true;
    return ESP_OK;
}

/** Xoá đoạn cũ nhất khi queue đầy, trừ đi các bản ghi chưa gửi trong đó khỏi bộ đếm. */
static ivts_err_t drop_head_segment(void)
{
    uint32_t lost = 0;
    if (s_rd_seg == s_head) {
        uint32_t end;
        if (scan_segment(s_head, s_rd_off, &end, &lost) == FRAME_IO) { return IVTS_ERR_IO; }
    }
    char p[48];
    seg_path(p, sizeof p, s_head);
    uint32_t next = s_head + 1u;
    if (remove(p) != 0) {
        if (errno != ENOENT || !next_segment(next, &next)) { return IVTS_ERR_IO; }
    }
    xSemaphoreTake(s_mx, portMAX_DELAY);
    /* ACK đến sau khi cả đoạn đã bị loại phải bỏ qua token của đoạn đó. */
    if (s_slot.full && s_slot.next_seg == s_head) { s_slot.full = false; }
    s_pending = s_pending > lost ? s_pending - lost : 0;
    xSemaphoreGive(s_mx);
    if (s_rd_seg < next) { s_rd_seg = next; s_rd_off = 0; cursor_save(); }
    s_head = next;
    ESP_LOGW(STORAGE_TAG, "queue đầy: bỏ %lu bản ghi cũ nhất", (unsigned long)lost);
    return IVTS_OK;
}

/* Sau lỗi ghi, chỉ bỏ byte vượt khỏi kích thước cam kết trước lần append. */
static bool repair_tail(void)
{
    char path[48];
    seg_path(path, sizeof path, s_tail);
    struct stat st;
    if (stat(path, &st) != 0) { return errno == ENOENT && s_tail_size == 0u; }
    if (st.st_size < (off_t)s_tail_size) { return false; }
    return st.st_size == (off_t)s_tail_size || truncate(path, (off_t)s_tail_size) == 0;
}

/* Xem storage_priv.h. Sang đoạn mới khi đoạn hiện tại không còn đủ chỗ. */
ivts_err_t storage_queue_do_push(const uint8_t *rec, size_t len)
{
    if (!s_open) { return IVTS_ERR_INVALID_STATE; }
    if (len == 0u || len > IVTS_RECORD_MAX_SIZE) { return IVTS_ERR_INVALID_ARG; }
    if (s_tail_needs_repair) {
        if (!repair_tail()) { return IVTS_ERR_IO; }
        s_tail_needs_repair = false;
    }
    if (s_tail_size + len + FRAME_OVERHEAD > g_storage_cfg.queue_segment_bytes) {
        if (s_tail == MAX_SEGMENT_ID) { return IVTS_ERR_FULL; }
        /* Dọn đoạn cũ trước khi cập nhật tail; lỗi I/O giữ nguyên con trỏ ghi. */
        while (s_tail - s_head + 1u >= g_storage_cfg.queue_max_segments) {
            ivts_err_t result = drop_head_segment();
            if (result != IVTS_OK) { return result; }
        }
        s_tail++;
        s_tail_size = 0;
    }
    uint8_t fr[IVTS_RECORD_MAX_SIZE + FRAME_OVERHEAD];
    fr[0] = FRAME_MAGIC;
    fr[1] = (uint8_t)len;
    memcpy(&fr[2], rec, len);
    uint32_t crc = ivts_crc32(0, &fr[1], len + 1u);
    for (int i = 0; i < 4; i++) { fr[2 + len + (size_t)i] = (uint8_t)(crc >> (8 * i)); }

    char p[48];
    seg_path(p, sizeof p, s_tail);
    FILE *f = fopen(p, "ab");
    if (f == NULL) { return IVTS_ERR_IO; }
    if (fseek(f, 0, SEEK_END) != 0 || ftell(f) != (long)s_tail_size) {
        fclose(f);
        return IVTS_ERR_IO;
    }
    size_t w = fwrite(fr, 1, len + FRAME_OVERHEAD, f);
    int rc = fclose(f);
    if (w != len + FRAME_OVERHEAD || rc != 0) {
        s_tail_needs_repair = !repair_tail();
        return IVTS_ERR_IO;
    }
    s_tail_size += (uint32_t)(len + FRAME_OVERHEAD);
    xSemaphoreTake(s_mx, portMAX_DELAY);
    s_pending++;
    xSemaphoreGive(s_mx);
    return IVTS_OK;
}

/*
 * Xem storage_priv.h. Ô peek còn đầy hoặc queue trống thì không làm gì. Đoạn đã đọc hết được xoá
 * và cursor chuyển sang đoạn kế; khung hỏng thì bỏ phần còn lại của đoạn.
 */
ivts_err_t storage_queue_do_peek(void)
{
    if (!s_open) { return IVTS_ERR_INVALID_STATE; }
    xSemaphoreTake(s_mx, portMAX_DELAY);
    bool busy = s_slot.full;
    uint32_t pend = s_pending;
    xSemaphoreGive(s_mx);
    if (busy || pend == 0u) { return IVTS_OK; }       /* Ô còn bản ghi chưa pop, hoặc queue trống. */

    while (s_rd_seg <= s_tail) {
        char p[48];
        seg_path(p, sizeof p, s_rd_seg);
        if (s_rd_seg == s_tail && s_rd_off >= s_tail_size) {
            set_pending(0);
            return IVTS_OK;
        }
        FILE *f = fopen(p, "rb");
        if (f == NULL && (errno != ENOENT || s_rd_seg == s_tail)) { return IVTS_ERR_IO; }
        bool exists = f != NULL;
        uint8_t buf[IVTS_RECORD_MAX_SIZE];
        size_t len = 0;
        int k = (f != NULL) ? read_frame(f, s_rd_off, buf, &len) : FRAME_END;
        if (f != NULL && fclose(f) != 0) { k = FRAME_IO; }
        if (k == FRAME_IO) { return IVTS_ERR_IO; }
        if (k > 0) {
            xSemaphoreTake(s_mx, portMAX_DELAY);
            memcpy(s_slot.data, buf, len);
            s_slot.len = len;
            if (++s_token == 0u) { s_token++; }
            s_slot.token = s_token;
            s_slot.next_seg = s_rd_seg;
            s_slot.next_off = s_rd_off + (uint32_t)k;
            s_slot.full = true;
            xSemaphoreGive(s_mx);
            ivts_event_t ev = { .type = IVTS_EV_QUEUE_READY, .ts_ms = platform_uptime_ms() };
            ev.u.queue_ready.pending = pend;
            storage_emit(&ev);
            return IVTS_OK;
        }
        if (k == FRAME_CORRUPT) {
            ESP_LOGW(STORAGE_TAG, "queue: khung hỏng %s@%lu, bỏ phần còn lại của đoạn", p, (unsigned long)s_rd_off);
        }
        if (s_rd_seg == s_tail) {
            set_pending(0);                            /* Bộ đếm lệch với nội dung file: lấy file làm chuẩn. */
            return IVTS_OK;
        }
        uint32_t next = s_rd_seg + 1u;
        if (exists) {
            if (remove(p) != 0 && errno != ENOENT) { return IVTS_ERR_IO; }
        } else if (!next_segment(next, &next)) {
            return IVTS_ERR_IO;
        }
        s_rd_seg = next;
        s_rd_off = 0;
        if (s_head < s_rd_seg) { s_head = s_rd_seg; }
        cursor_save();
    }
    return IVTS_OK;
}

/* Xem storage.h. @p cap nhỏ hơn bản ghi thì trả IVTS_ERR_FULL và ô peek giữ nguyên. */
ivts_err_t storage_queue_peek_copy(uint8_t *out, size_t cap, size_t *len, uint32_t *token)
{
    if (out == NULL || len == NULL || token == NULL || s_mx == NULL) { return IVTS_ERR_INVALID_ARG; }
    xSemaphoreTake(s_mx, portMAX_DELAY);
    ivts_err_t r = IVTS_ERR_NOT_FOUND;
    if (s_slot.full) {
        if (cap < s_slot.len) {
            r = IVTS_ERR_FULL;
        } else {
            memcpy(out, s_slot.data, s_slot.len);
            *len = s_slot.len;
            *token = s_slot.token;
            r = IVTS_OK;
        }
    }
    xSemaphoreGive(s_mx);
    return r;
}

/* Xem storage_priv.h. Cursor được ghi xuống thẻ sau mỗi CURSOR_EVERY lần pop, hoặc khi queue hết. */
ivts_err_t storage_queue_do_pop(uint32_t token)
{
    xSemaphoreTake(s_mx, portMAX_DELAY);
    bool match = s_slot.full && s_slot.token == token;
    uint32_t seg = s_slot.next_seg, off = s_slot.next_off;
    if (match) {
        s_slot.full = false;
        if (s_pending > 0u) { s_pending--; }
    }
    xSemaphoreGive(s_mx);
    if (!match) { return IVTS_ERR_NOT_FOUND; }       /* ACK trùng hoặc đến muộn: bỏ qua. */
    s_rd_seg = seg;
    s_rd_off = off;
    if (++s_pops >= CURSOR_EVERY || storage_queue_pending() == 0u) {
        cursor_save();
    }
    return IVTS_OK;
}
