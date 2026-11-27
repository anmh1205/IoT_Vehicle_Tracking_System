/**
 * @file storage_sd.c
 * @brief Gắn thẻ SD (SDMMC 4-bit + FATFS) và ghi log có xoay file và giới hạn dung lượng.
 *
 * Log nằm ở /sd/log/LNNNNNNN.TXT (tên 8.3 để không phụ thuộc long file name). File đang ghi là
 * file có số lớn nhất; khi vượt log_file_max_bytes thì chuyển sang số kế tiếp và xoá các file cũ
 * nhất cho đến khi tổng dung lượng không vượt log_quota_bytes.
 *
 * ## Ngữ cảnh gọi
 *
 * storage_sd_mount() chạy trong storage_init(), trước khi task "storage" tồn tại.
 * storage_sd_log_write() chỉ chạy trong task "storage". Các biến s_log_* chỉ hai ngữ cảnh đó
 * truy cập, không bao giờ đồng thời, nên không cần khoá.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Mỗi dòng log được ghi bằng fopen/fwrite/fclose; fclose gọi f_close của FATFS nên đồng bộ cả
 * dữ liệu lẫn bảng FAT. Mất nguồn sau fclose thì dòng đã nằm trên thẻ; mất nguồn trong lúc ghi
 * có thể để lại dòng cuối dở. Lần mount sau quét thư mục để khôi phục chỉ số file và tổng dung lượng.
 */

#include "storage_priv.h"
#include <dirent.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include "driver/sdmmc_host.h"
#include "esp_log.h"
#include "esp_vfs_fat.h"
#include "sdmmc_cmd.h"

#define LOG_DIR SD_MOUNT "/log"   /* Thư mục chứa các file log. */

static sdmmc_card_t *s_card;   /* Thông tin thẻ sau khi gắn. */
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

/*
 * Xem storage_priv.h. Không tự định dạng thẻ khi gắn lỗi: thẻ hỏng cần được người kiểm tra,
 * và tự định dạng sẽ xoá dữ liệu.
 */
esp_err_t storage_sd_mount(void)
{
    const storage_cfg_t *c = &g_storage_cfg;
    sdmmc_host_t host = SDMMC_HOST_DEFAULT();
    sdmmc_slot_config_t slot = SDMMC_SLOT_CONFIG_DEFAULT();
    slot.width = 4;
    slot.clk = (gpio_num_t)c->pin_clk;
    slot.cmd = (gpio_num_t)c->pin_cmd;
    slot.d0 = (gpio_num_t)c->pin_d0;
    slot.d1 = (gpio_num_t)c->pin_d1;
    slot.d2 = (gpio_num_t)c->pin_d2;
    slot.d3 = (gpio_num_t)c->pin_d3;
    slot.cd = (c->pin_cd >= 0) ? (gpio_num_t)c->pin_cd : SDMMC_SLOT_NO_CD;
    /* Bật pull-up nội của SoC cho các chân SDMMC. Pull-up nội yếu; ESP-IDF khuyến nghị pull-up
     * ngoài 10 kΩ trên CMD và D0..D3 để chạy ổn định. */
    slot.flags |= SDMMC_SLOT_FLAG_INTERNAL_PULLUP;

    esp_vfs_fat_sdmmc_mount_config_t mc = {
        .format_if_mount_failed = false,   /* Không tự định dạng khi gắn lỗi. */
        .max_files = 4,
        .allocation_unit_size = 16 * 1024,
    };
    esp_err_t e = esp_vfs_fat_sdmmc_mount(SD_MOUNT, &host, &slot, &mc, &s_card);
    if (e != ESP_OK) {
        ESP_LOGW(STORAGE_TAG, "mount SD: %s", esp_err_to_name(e));
        return e;
    }
    mkdir(LOG_DIR, 0775);
    log_scan();
    return ESP_OK;
}

/**
 * @brief Xoá file log cũ nhất cho đến khi tổng dung lượng không vượt log_quota_bytes.
 *
 * Mỗi vòng quét lại thư mục để tìm file có chỉ số nhỏ nhất; số file log nhỏ nên không cần giữ
 * chỉ mục trong RAM. File đang ghi không bao giờ bị xoá.
 */
static void log_enforce_quota(void)
{
    while (s_log_total > g_storage_cfg.log_quota_bytes) {
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

/* Xem storage_priv.h. Ghi @p line kèm ký tự xuống dòng; xoay file nếu vượt giới hạn kích thước. */
ivts_err_t storage_sd_log_write(const char *line, size_t len)
{
    if (!storage_sd_ok()) { return IVTS_ERR_INVALID_STATE; }
    if (s_log_size + len + 1u > g_storage_cfg.log_file_max_bytes) {
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
