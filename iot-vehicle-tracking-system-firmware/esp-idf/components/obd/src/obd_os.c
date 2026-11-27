/**
 * @file obd_os.c
 * @brief Task "obd": cầu nối giữa callback NimBLE và phiên ELM327.
 *
 * Phiên được viết tuần tự (quét, kết nối, discovery, khởi tạo ELM327, poll); mỗi bước chờ một
 * sự kiện từ queue với timeout.
 *
 * ## Mô hình thực thi
 *
 * Hai ngữ cảnh chạy song song:
 * - Host task NimBLE (do stack tạo): chạy các callback GAP/GATT. Callback chỉ gọi obd_post() để
 *   sao chép sự kiện vào s_q rồi trả về; không chờ, không gọi GATT đồng bộ, không gọi sink.
 * - Task "obd" (priority và stack từ obd_cfg_t; app_init.c đặt 4 và 4096 B): consumer duy nhất
 *   của s_q, sở hữu s_synced/s_link/s_conn/s_rx. Các biến này không cần khoá vì chỉ task
 *   này truy cập. Task "obd" gọi API NimBLE (scan, connect, write...) từ ngữ cảnh task, còn kết
 *   quả quay về dưới dạng sự kiện.
 *
 * Queue s_q (BEV_QUEUE_LEN phần tử) nhận cả sự kiện BLE lẫn lệnh điều khiển từ obd_start() và
 * obd_stop() (task app). Trạng thái yêu cầu được lưu riêng để không mất lệnh khi queue đầy.
 * STOP và BEV_DISCONNECTED cắt ngang các bước chờ BLE.
 *
 * g_obd_diag_mx bảo vệ g_obd_rd và g_obd_dtc: task "obd" ghi trong diag_once(), task "app" đọc
 * qua obd_diag_copy(). Mutex chỉ giữ trong lúc sao chép, không bao giờ giữ khi chờ sự kiện hoặc
 * gọi sink.
 *
 * Kết quả đo đến app qua sink (IVTS_EV_OBD_LINK, IVTS_EV_OBD_SAMPLE, IVTS_EV_OBD_DIAG_READY).
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Không có trạng thái bền vững. Sau reset, phiên BLE được dựng lại từ đầu khi app gọi obd_start().
 * Mất kết nối giữa chừng làm s_link = false; task phát IVTS_EV_OBD_LINK và thử lại theo backoff.
 */

#include "obd_priv.h"
#include <stdatomic.h>
#include <stdio.h>
#include <string.h>
#include "esp_log.h"
#include "platform/platform_clock.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "ivts_core/base/backoff.h"
#include "elm327.h"
#include "obd_pid.h"

#define BEV_QUEUE_LEN 24      /* Số sự kiện tối đa chờ trong s_q. */
#define ECU_PROBE_MS 15000u   /* Cho ATSP0 thời gian thử các giao thức trước khi gửi PID khác. */
#define UUID_RX 0x2AF0        /* Characteristic nhận notification từ ELM327. */
#define UUID_TX 0x2AF1        /* Characteristic ghi lệnh tới ELM327. */

/* Giá trị đặc biệt của tham số `want` trong wait_ev(), nằm ngoài miền của bev_type_t. */
#define WAIT_ANY  0xFFu       /* Trả về ở sự kiện đầu tiên, bất kể loại. */
#define WAIT_NONE 0xFEu       /* Không chờ sự kiện nào: chỉ chờ hết timeout hoặc bị ngắt (STOP, mất kết nối). */

static QueueHandle_t s_q;                   /* Queue sự kiện; consumer duy nhất là task "obd". */
static atomic_bool s_enabled;
static atomic_bool s_ble_active;
SemaphoreHandle_t g_obd_diag_mx;            /* Xem obd_priv.h. */
ivts_obd_readiness_t g_obd_rd;
ivts_dtc_list_t g_obd_dtc[3];

/* Trạng thái phiên; chỉ task "obd" truy cập. */
static bool s_synced;   /* Host NimBLE đã đồng bộ. */
static bool s_link;     /* Đang có kết nối BLE. */
static uint16_t s_conn; /* Connection handle của kết nối hiện tại. */
static uint16_t s_rx_handle; /* Value handle nhận notification của phiên hiện tại. */
static bool s_ecu_ready; /* ECU đã trả lời PID hỗ trợ (0100) trong phiên hiện tại. */
static elm_rx_t s_rx;   /* Bộ ghép phản hồi ELM327 từ các notification. */
/* Backoff giữa các lần dựng lại phiên: 2 s tăng dần đến 120 s, cộng jitter đến 1 s. */
static const ivts_backoff_t k_bo = { .base_ms = 2000, .max_ms = 120000, .jitter_ms = 1000 };

/* Xem obd_priv.h. Không chờ vì host task NimBLE không được chặn. */
bool obd_post(const bev_t *e)
{
    return s_q != NULL && xQueueSend(s_q, e, 0) == pdTRUE;
}

ivts_err_t obd_os_set_enabled(bool enabled)
{
    if (s_q == NULL) { return IVTS_ERR_INVALID_STATE; }
    atomic_store(&s_enabled, enabled);
    bev_t event = { .type = BEV_CTRL_CHANGED };
    (void)obd_post(&event);   /* Nếu queue đầy, task đã có sự kiện để thức và kiểm tra s_enabled. */
    return IVTS_OK;
}

bool obd_is_stopped(void) { return !atomic_load(&s_ble_active); }

/** ms kể từ boot, từ esp_timer. */

/** Báo trạng thái liên kết OBD qua sink: BLE, ELM327 và ECU. */
static void emit_link(bool conn, bool elm, ivts_ecu_state_t ecu)
{
    static bool last_conn, last_elm;
    static ivts_ecu_state_t last_ecu = IVTS_ECU_UNKNOWN;
    if (last_conn == conn && last_elm == elm && last_ecu == ecu) { return; }
    last_conn = conn;
    last_elm = elm;
    last_ecu = ecu;
    ivts_event_t ev = { .type = IVTS_EV_OBD_LINK, .ts_ms = platform_uptime_ms() };
    ev.u.obd_link.connected = conn;
    ev.u.obd_link.elm_ready = elm;
    ev.u.obd_link.ecu = (uint8_t)ecu;
    (void)ivts_sink_emit(&g_obd_cfg.sink, &ev);
}

/**
 * @brief Chờ một sự kiện thuộc loại @p want, xử lý mọi sự kiện đến trong lúc chờ.
 *
 * Sự kiện không thuộc loại cần chờ vẫn được xử lý: BEV_SYNCED đặt s_synced;
 * BEV_NOTIFY được đổ vào s_rx. Yêu cầu STOP và BEV_DISCONNECTED cắt ngang và trả
 * false. Khi want = BEV_NOTIFY, hàm chỉ trả true khi s_rx đã nhận trọn một phản hồi (thấy '>').
 *
 * @param want       Loại cần chờ, hoặc WAIT_ANY, hoặc WAIT_NONE.
 * @param timeout_ms Thời gian chờ tối đa.
 * @param[out] out   Sự kiện khớp; có thể NULL.
 * @return true nếu nhận được sự kiện cần chờ; false khi hết timeout, bị STOP hoặc mất kết nối.
 */
static bool is_current_notification(const bev_t *event)
{
    return s_link && event->conn == s_conn && event->h_start == s_rx_handle;
}

static bool is_interrupting_event(const bev_t *event)
{
    if (event->type == BEV_CTRL_CHANGED) {
        return !atomic_load(&s_ble_active) || !atomic_load(&s_enabled);
    }
    if (event->type == BEV_DISCONNECTED) { return s_link && event->conn == s_conn; }
    return event->type == BEV_NOTIFY && is_current_notification(event) && event->status != 0;
}

static bool track_link_events(const bev_t *event)
{
    switch (event->type) {
    case BEV_SYNCED: s_synced = true; break;
    case BEV_CTRL_CHANGED:
    case BEV_DISCONNECTED:
        return false;
    case BEV_NOTIFY:
        if (!is_current_notification(event)) { return false; }
        (void)elm_rx_feed(&s_rx, event->data, event->len);
        break;
    default: break;
    }
    return true;
}

static bool wait_ev(uint8_t want, uint32_t timeout_ms, bev_t *out)
{
    uint64_t deadline_at_ms = platform_uptime_ms() + timeout_ms;
    for (;;) {
        if (atomic_load(&s_ble_active) && !atomic_load(&s_enabled)) { return false; }
        uint64_t now_ms = platform_uptime_ms();
        if (now_ms >= deadline_at_ms) { return false; }
        bev_t event;
        if (xQueueReceive(s_q, &event, pdMS_TO_TICKS(deadline_at_ms - now_ms)) != pdTRUE) { return false; }
        if (is_interrupting_event(&event)) {
            if (event.type == BEV_DISCONNECTED) { s_link = false; }
            if (event.type == BEV_NOTIFY) { s_rx.overflow = true; }
            return false;
        }
        if (!track_link_events(&event)) { continue; }
        if (want == BEV_NOTIFY) {
            if (s_rx.complete) { return true; }
            continue;
        }
        if (want == WAIT_ANY || event.type == want) {
            if (out != NULL) { *out = event; }
            return true;
        }
    }
}

static uint16_t s_tx_handle;   /* Value handle của characteristic TX (2AF1) của phiên hiện tại. */

/** Gửi một lệnh ELM327 (thêm "\r") và chờ phản hồi trọn vẹn. @return true nếu nhận được. */
static bool elm_cmd(const char *cmd, uint32_t timeout_ms)
{
    char line[16];
    snprintf(line, sizeof line, "%s\r", cmd);
    elm_rx_reset(&s_rx);
    if (obd_ble_write(s_conn, s_tx_handle, line) != 0) { return false; }
    bool ok = wait_ev(BEV_NOTIFY, timeout_ms, NULL) && s_rx.complete && !s_rx.overflow;
    if (!ok && s_link && atomic_load(&s_enabled)) { ESP_LOGW(OBD_TAG, "ELM %s: phản hồi thiếu hoặc quá dài", cmd); }
    return ok;
}

static bool wait_gatt(uint64_t deadline, bev_t *e)
{
    for (uint64_t now = platform_uptime_ms(); now < deadline; now = platform_uptime_ms()) {
        bev_t candidate;
        if (!wait_ev(WAIT_ANY, (uint32_t)(deadline - now), &candidate)) { return false; }
        if (candidate.conn == s_conn && candidate.type >= BEV_SVC && candidate.type <= BEV_WRITE_DONE) {
            *e = candidate;
            return true;
        }
    }
    return false;
}

/**
 * @brief Dựng một phiên: quét, kết nối, tìm service 0x18F0 và hai characteristic 2AF0/2AF1, bật
 *        notification, rồi chạy chuỗi khởi tạo ELM327.
 *
 * Mỗi bước có timeout riêng; bất kỳ bước nào thất bại hoặc bị STOP/mất kết nối thì hàm trả false
 * và caller dọn dẹp kết nối. Thành công thì phát IVTS_EV_OBD_LINK với elm_ready = true.
 */
typedef struct { uint16_t start, end; } obd_service_range_t;
typedef struct { uint16_t rx, tx, rx_end; } obd_characteristic_handles_t;
typedef void (*discovery_visitor_t)(const bev_t *event, void *ctx);

static bool collect_discovery(uint64_t deadline_at_ms, discovery_visitor_t visit, void *ctx)
{
    bev_t event;
    while (wait_gatt(deadline_at_ms, &event)) {
        if (event.type == BEV_DISC_DONE) { return s_link && event.status == 0; }
        visit(&event, ctx);
    }
    return false;
}

static bool scan_for_adapter(uint8_t addr[7])
{
    if (obd_ble_scan() != 0) { return false; }
    uint64_t deadline_at_ms = platform_uptime_ms() + 11000u;
    for (;;) {
        uint64_t now_ms = platform_uptime_ms();
        bev_t event;
        if (now_ms >= deadline_at_ms || !wait_ev(WAIT_ANY, (uint32_t)(deadline_at_ms - now_ms), &event) ||
            event.type == BEV_SCAN_DONE) {
            obd_ble_scan_stop();
            return false;
        }
        if (event.type == BEV_ADV) {
            memcpy(addr, event.addr, sizeof event.addr);
            return true;
        }
    }
}

static bool connect_adapter(const uint8_t addr[7])
{
    bev_t event;
    if (obd_ble_connect(addr) != 0 || !wait_ev(BEV_CONNECTED, 11000u, &event) || event.status != 0) {
        return false;
    }
    s_conn = event.conn;
    s_link = true;
    emit_link(true, false, IVTS_ECU_UNKNOWN);
    return true;
}

static void take_service(const bev_t *event, void *ctx)
{
    obd_service_range_t *range = ctx;
    if (event->type == BEV_SVC) {
        range->start = event->h_start;
        range->end = event->h_end;
    }
}

static bool discover_obd_service(obd_service_range_t *range)
{
    if (obd_ble_disc_svc(s_conn) != 0) { return false; }
    if (!collect_discovery(platform_uptime_ms() + 5000u, take_service, range) || range->start == 0u) {
        ESP_LOGW(OBD_TAG, "không thấy service 0x18F0");
        return false;
    }
    return true;
}

static void take_characteristic(const bev_t *event, void *ctx)
{
    obd_characteristic_handles_t *handles = ctx;
    if (event->type != BEV_CHR) { return; }
    if (handles->rx != 0u && event->h_start > handles->rx && event->h_start <= handles->rx_end) {
        handles->rx_end = (uint16_t)(event->h_start - 1u);
    }
    if (event->uuid16 == UUID_RX) { handles->rx = event->h_end; }
    if (event->uuid16 == UUID_TX) { handles->tx = event->h_end; }
}

static bool discover_rx_tx_chars(const obd_service_range_t *range, obd_characteristic_handles_t *handles)
{
    if (obd_ble_disc_chrs(s_conn, range->start, range->end) != 0) { return false; }
    handles->rx_end = range->end;
    if (!collect_discovery(platform_uptime_ms() + 5000u, take_characteristic, handles) ||
        handles->rx == 0u || handles->tx == 0u) {
        ESP_LOGW(OBD_TAG, "thiếu char 2AF0/2AF1");
        return false;
    }
    return true;
}

static void take_cccd(const bev_t *event, void *ctx)
{
    uint16_t *cccd = ctx;
    if (event->type == BEV_DSC && event->uuid16 == 0x2902 && *cccd == 0u) { *cccd = event->h_start; }
}

static bool discover_rx_cccd(const obd_characteristic_handles_t *handles, uint16_t *cccd)
{
    /* NimBLE starts descriptor discovery one handle beyond the value handle. */
    if (handles->rx_end <= handles->rx || obd_ble_disc_dscs(s_conn, handles->rx, handles->rx_end) != 0) {
        return false;
    }
    return collect_discovery(platform_uptime_ms() + 5000u, take_cccd, cccd) && *cccd != 0u;
}

static bool enable_rx_notify(uint16_t cccd)
{
    bev_t event;
    return obd_ble_enable_notify(s_conn, cccd) == 0 &&
           wait_gatt(platform_uptime_ms() + 5000u, &event) && event.type == BEV_WRITE_DONE && event.status == 0;
}

static bool run_elm_init_sequence(void)
{
    for (size_t i = 0; i < ELM_INIT_SEQ_LEN; i++) {
        const elm_init_step_t *step = &ELM_INIT_SEQ[i];
        if (!elm_cmd(step->cmd, step->timeout_ms) || !elm_reply_valid(s_rx.buf, step->is_reset, true)) {
            ESP_LOGW(OBD_TAG, "ELM init %s lỗi: %s", step->cmd, s_rx.buf);
            return false;
        }
    }
    return true;
}

static bool session_setup(void)
{
    uint8_t addr[7] = {0};
    obd_service_range_t range = {0};
    obd_characteristic_handles_t handles = {0};
    uint16_t cccd = 0;
    if (!scan_for_adapter(addr) || !connect_adapter(addr) || !discover_obd_service(&range) ||
        !discover_rx_tx_chars(&range, &handles) || !discover_rx_cccd(&handles, &cccd) ||
        !enable_rx_notify(cccd)) {
        return false;
    }
    s_rx_handle = handles.rx;
    s_tx_handle = handles.tx;
    if (!run_elm_init_sequence()) { return false; }
    s_ecu_ready = false;
    emit_link(true, true, IVTS_ECU_UNKNOWN);
    return true;
}

static bool probe_ecu(void)
{
    if (!elm_cmd("0100", ECU_PROBE_MS)) { return false; }
    ESP_LOGD(OBD_TAG, "ELM 0100: %s", s_rx.buf);
    uint8_t b[16];
    size_t n;
    s_ecu_ready = elm_extract_bytes(s_rx.buf, 0x01, b, sizeof b, &n) == IVTS_OK && n >= 6u && b[1] == 0u;
    ivts_ecu_state_t ecu = elm_reply_ecu_state(s_rx.buf);
    emit_link(true, true, s_ecu_ready ? IVTS_ECU_LIVE
                                     : ecu == IVTS_ECU_STOPPED ? IVTS_ECU_STOPPED : IVTS_ECU_NO_DATA);
    return true;
}

/**
 * @brief Đọc một vòng PID (0C, 0D, 05, 04, 2F) và phát IVTS_EV_OBD_SAMPLE nếu có giá trị hợp lệ.
 *
 * Không có giá trị nào nhưng ECU báo trạng thái (NO DATA, STOPPED khi tắt máy) thì phát
 * IVTS_EV_OBD_LINK để app cập nhật trạng thái ECU.
 */
static bool read_pid(uint8_t pid, ivts_obd_sample_t *sample, ivts_ecu_state_t *ecu)
{
    char command[5];
    snprintf(command, sizeof command, "01%02X", (unsigned)pid);
    if (!elm_cmd(command, 3000)) { return false; }
    ivts_ecu_state_t reply_state = elm_reply_ecu_state(s_rx.buf);
    if (reply_state == IVTS_ECU_STOPPED || reply_state == IVTS_ECU_NO_DATA) { *ecu = reply_state; }

    uint8_t bytes[16];
    size_t len;
    if (elm_extract_bytes(s_rx.buf, 0x01, bytes, sizeof bytes, &len) == IVTS_OK &&
        len >= 2u && bytes[1] == pid) {
        (void)obd_pid_decode(bytes, len, sample);
    }
    return true;
}

static void report_sample_or_ecu_state(const ivts_obd_sample_t *sample, ivts_ecu_state_t ecu)
{
    if (sample->valid_mask != 0u) {
        emit_link(true, true, IVTS_ECU_LIVE);
        ivts_event_t event = { .type = IVTS_EV_OBD_SAMPLE, .ts_ms = platform_uptime_ms() };
        event.u.obd_sample = *sample;
        (void)ivts_sink_emit(&g_obd_cfg.sink, &event);
    } else if (ecu != IVTS_ECU_UNKNOWN) {
        s_ecu_ready = false;
        emit_link(true, true, ecu);
    }
}

static bool poll_once(void)
{
    if (!s_ecu_ready) {
        if (!probe_ecu()) { return false; }
        if (!s_ecu_ready) { return true; }
    }
    static const uint8_t pids[] = { 0x0C, 0x0D, 0x05, 0x04, 0x2F };
    ivts_obd_sample_t sample = {0};
    ivts_ecu_state_t ecu = IVTS_ECU_UNKNOWN;
    for (size_t i = 0; i < sizeof pids / sizeof pids[0] && s_link && atomic_load(&s_enabled); i++) {
        if (!read_pid(pids[i], &sample, &ecu)) { return false; }
    }
    if (!atomic_load(&s_enabled) || !s_link) { return false; }
    report_sample_or_ecu_state(&sample, ecu);
    return true;
}

/**
 * @brief Đọc readiness (0101) và DTC (mode 03, 07, 0A), lưu dưới g_obd_diag_mx rồi phát
 *        IVTS_EV_OBD_DIAG_READY.
 *
 * Dữ liệu được dựng vào biến cục bộ trước và chỉ sao chép vào biến dùng chung trong mutex, nên
 * thời gian giữ mutex rất ngắn.
 */
static bool read_readiness(ivts_obd_readiness_t *readiness)
{
    uint8_t bytes[64];
    size_t len;
    if (!elm_cmd("0101", 3000)) { return false; }
    if (elm_extract_bytes(s_rx.buf, 0x01, bytes, sizeof bytes, &len) == IVTS_OK) {
        (void)obd_readiness_decode(bytes, len, readiness);
    }
    return true;
}

static bool read_dtc_mode(size_t index, ivts_dtc_list_t *list)
{
    static const char *const modes[] = { "03", "07", "0A" };
    static const uint8_t mode_ids[] = { 0x03, 0x07, 0x0A };
    uint8_t bytes[64];
    size_t len;
    if (!elm_cmd(modes[index], 5000)) { return false; }
    if (elm_extract_bytes(s_rx.buf, mode_ids[index], bytes, sizeof bytes, &len) == IVTS_OK) {
        (void)obd_dtc_decode(bytes, len, list);
    }
    return true;
}

static void store_diag_snapshot(const ivts_obd_readiness_t *readiness, const ivts_dtc_list_t dtc[3])
{
    xSemaphoreTake(g_obd_diag_mx, portMAX_DELAY);
    g_obd_rd = *readiness;
    memcpy(g_obd_dtc, dtc, sizeof g_obd_dtc);
    xSemaphoreGive(g_obd_diag_mx);
    ivts_event_t event = { .type = IVTS_EV_OBD_DIAG_READY, .ts_ms = platform_uptime_ms() };
    (void)ivts_sink_emit(&g_obd_cfg.sink, &event);
}

static bool diag_once(void)
{
    ivts_obd_readiness_t readiness = {0};
    ivts_dtc_list_t dtc[3] = {0};
    if (!read_readiness(&readiness)) { return false; }
    for (size_t i = 0; i < 3u && s_link && atomic_load(&s_enabled); i++) {
        if (!read_dtc_mode(i, &dtc[i])) { return false; }
    }
    if (!atomic_load(&s_enabled) || !s_link) { return false; }
    store_diag_snapshot(&readiness, dtc);
    return true;
}

/** Thân task "obd": xem mô tả ở đầu file. */
static void handle_disabled(uint32_t *attempt)
{
    if (atomic_load(&s_ble_active)) {
        /* Keep active if the hardware state is unknown. */
        if (obd_ble_deinit() != 0) { vTaskSuspend(NULL); }
        s_synced = false;
        (void)xQueueReset(s_q);
        atomic_store(&s_ble_active, false);
    }
    *attempt = 0;
    if (!atomic_load(&s_enabled)) { (void)wait_ev(WAIT_ANY, 1000, NULL); }
}

static bool ensure_ble_up(void)
{
    if (!atomic_load(&s_ble_active)) {
        atomic_store(&s_ble_active, true);
        if (!atomic_load(&s_enabled) || obd_ble_init() != 0) {
            atomic_store(&s_ble_active, false);
            (void)wait_ev(WAIT_ANY, 2000, NULL);
            return false;
        }
    }
    if (!s_synced) {
        (void)wait_ev(BEV_SYNCED, 1000, NULL);
        return false;
    }
    return true;
}

static void run_session_loop(uint32_t *attempt)
{
    uint64_t next_diag_at_ms = platform_uptime_ms();
    while (s_link && atomic_load(&s_enabled)) {
        uint64_t started_at_ms = platform_uptime_ms();
        if (!poll_once()) { break; }
        *attempt = 0;
        if (s_ecu_ready && platform_uptime_ms() >= next_diag_at_ms) {
            if (!diag_once()) { break; }
            next_diag_at_ms = platform_uptime_ms() + (uint64_t)g_obd_cfg.diag_period_s * 1000u;
        }
        uint64_t elapsed_ms = platform_uptime_ms() - started_at_ms;
        if (elapsed_ms < g_obd_cfg.poll_ms) {
            (void)wait_ev(WAIT_NONE, (uint32_t)(g_obd_cfg.poll_ms - elapsed_ms), NULL);
        }
    }
}

static void reconnect_backoff(uint32_t *attempt)
{
    if (atomic_load(&s_enabled)) {
        uint32_t delay_ms = ivts_backoff_ms(&k_bo, (*attempt)++, (uint32_t)platform_uptime_ms());
        (void)wait_ev(WAIT_NONE, delay_ms, NULL);
    }
}

static void obd_task(void *arg)
{
    (void)arg;
    uint32_t attempt = 0;
    for (;;) {
        if (!atomic_load(&s_enabled)) {
            handle_disabled(&attempt);
            continue;
        }
        if (!ensure_ble_up()) { continue; }
        if (session_setup()) { run_session_loop(&attempt); }
        if (s_link) { obd_ble_disconnect(s_conn); s_link = false; }
        emit_link(false, false, IVTS_ECU_DISCONNECTED);
        reconnect_backoff(&attempt);
    }
}

/** Tạo queue, mutex và task "obd". @return 0 nếu thành công, -1 nếu thiếu bộ nhớ. */
int obd_os_start(void)
{
    s_q = xQueueCreate(BEV_QUEUE_LEN, sizeof(bev_t));
    g_obd_diag_mx = xSemaphoreCreateMutex();
    if (s_q == NULL || g_obd_diag_mx == NULL) { return -1; }
    return xTaskCreate(obd_task, "obd", g_obd_cfg.task_stack, NULL, g_obd_cfg.task_prio, NULL) == pdPASS ? 0 : -1;
}
