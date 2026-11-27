#include "sd/sd.h"
#include "storage_internal.h"

#include <dirent.h>
#include <stdio.h>
#include <sys/stat.h>

#define LOG_DIR SD_MOUNT "/log"   /* Thư mục chứa các file log. */

static uint32_t s_log_idx;     /* Số của file log đang ghi. */
static uint32_t s_log_size;    /* Kích thước hiện tại của file đang ghi, byte. */
static uint32_t s_log_total;   /* Tổng dung lượng mọi file log, byte. */

/**
 * @brief Tách chỉ số từ tên file dạng "LNNNNNNN.TXT".
 * @return true và ghi *idx nếu tên đúng định dạng; false nếu không.
 */
static bool parse_log_name(const char *n, uint32_t *idx)
{
    unsigned v;
    if (n[0] != 'L' || sscanf(n + 1, "%7u.TXT", &v) != 1) { return false; }
    *idx = v;
    return true;
}

/** Quét thư mục log để khôi phục s_log_idx, s_log_size và s_log_total. */
static void log_scan(void)
{
    DIR *d = opendir(LOG_DIR);
    if (d == NULL) { return; }
    struct dirent *de;
    while ((de = readdir(d)) != NULL) {
        uint32_t idx;
        if (!parse_log_name(de->d_name, &idx)) { continue; }
        char path[sizeof(LOG_DIR) + 1 + sizeof(de->d_name)];   /* d_name dài tối đa 255 ký tự. */
        snprintf(path, sizeof path, LOG_DIR "/%s", de->d_name);
        struct stat st;
        if (stat(path, &st) == 0) {
            s_log_total += (uint32_t)st.st_size;
            if (idx >= s_log_idx) { s_log_idx = idx; s_log_size = (uint32_t)st.st_size; }
        }
    }
    closedir(d);
}

void storage_sd_log_open(void)
{
    mkdir(LOG_DIR, 0775);
    log_scan();
}

/**
 * @brief Xoá file log cũ nhất cho đến khi tổng dung lượng không vượt log_quota_bytes.
 *
 * Mỗi vòng quét lại thư mục để tìm file có chỉ số nhỏ nhất; số file log nhỏ nên không cần giữ
 * chỉ mục trong RAM. File đang ghi không bao giờ bị xoá.
 */
static void log_enforce_quota(void)
{
    while (s_log_total > storage_config_view()->log_quota_bytes) {
        DIR *d = opendir(LOG_DIR);
        if (d == NULL) { return; }
        uint32_t oldest = UINT32_MAX;
        struct dirent *de;
        while ((de = readdir(d)) != NULL) {
            uint32_t idx;
            if (parse_log_name(de->d_name, &idx) && idx < oldest) { oldest = idx; }
        }
        closedir(d);
        if (oldest == UINT32_MAX || oldest == s_log_idx) { return; }   /* Không xoá file đang ghi. */
        char path[48];
        snprintf(path, sizeof path, LOG_DIR "/L%07lu.TXT", (unsigned long)oldest);
        struct stat st;
        uint32_t sz = (stat(path, &st) == 0) ? (uint32_t)st.st_size : 0u;
        if (remove(path) != 0) { return; }
        s_log_total = (s_log_total > sz) ? s_log_total - sz : 0u;
    }
}

/* Ghi @p line kèm ký tự xuống dòng; xoay file nếu vượt giới hạn kích thước. */
ivts_err_t storage_sd_log_write(const char *line, size_t len)
{
    if (!storage_sd_ok()) { return IVTS_ERR_INVALID_STATE; }
    if (s_log_size + len + 1u > storage_config_view()->log_file_max_bytes) {
        s_log_idx++;                                 /* Xoay sang file mới. */
        s_log_size = 0;
        log_enforce_quota();
    }
    char path[48];
    snprintf(path, sizeof path, LOG_DIR "/L%07lu.TXT", (unsigned long)s_log_idx);
    FILE *f = fopen(path, "a");
    if (f == NULL) { return IVTS_ERR_IO; }
    size_t w = fwrite(line, 1, len, f);
    w += fwrite("\n", 1, 1, f);
    /* fclose gọi f_close của FATFS, đồng bộ cả dữ liệu lẫn bảng FAT: mất nguồn sau lệnh này thì
     * dòng log đã nằm trên thẻ. */
    int rc = fclose(f);
    if (w != len + 1u || rc != 0) { return IVTS_ERR_IO; }
    s_log_size += (uint32_t)(len + 1u);
    s_log_total += (uint32_t)(len + 1u);
    return IVTS_OK;
}
