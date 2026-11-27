#pragma once

/**
 * @file storage_priv.h
 * @brief Khai báo nội bộ của component storage.
 */

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "esp_err.h"
#include "storage/storage.h"

#define STORAGE_TAG   "storage"
#ifndef SD_MOUNT
#define SD_MOUNT      "/sd"   /* Điểm gắn VFS của thẻ SD. */
#endif

/** Đổi esp_err_t sang ivts_err_t; mã không có tương ứng thành IVTS_ERR_IO. */
static inline ivts_err_t storage_err(esp_err_t e)
{
    switch (e) {
    case ESP_OK:                return IVTS_OK;
    case ESP_ERR_INVALID_ARG:   return IVTS_ERR_INVALID_ARG;
    case ESP_ERR_INVALID_STATE: return IVTS_ERR_INVALID_STATE;
    case ESP_ERR_TIMEOUT:       return IVTS_ERR_TIMEOUT;
    case ESP_ERR_NOT_FOUND:     return IVTS_ERR_NOT_FOUND;
    case ESP_ERR_NO_MEM:        return IVTS_ERR_FULL;
    default:                    return IVTS_ERR_IO;
    }
}

/** Cấu hình storage; ghi trong storage_init(), chỉ đọc sau đó. */
extern storage_cfg_t g_storage_cfg;

/** Gửi sự kiện qua sink, không chờ. */
void storage_emit(const ivts_event_t *ev);

/* ---- storage_nvs.c ---- */

/** Khởi tạo NVS, giữ nguyên dữ liệu nếu phân vùng gặp lỗi. */
esp_err_t storage_nvs_init(void);

/* ---- storage_sd.c: chỉ task "storage" gọi (sau khi storage_init đã gắn thẻ) ---- */

/** Gắn thẻ SD qua SDMMC 4-bit và FATFS tại SD_MOUNT. */
esp_err_t storage_sd_mount(void);
/** Ghi một dòng vào file log hiện tại, xoay file và xoá file cũ khi cần. */
ivts_err_t storage_sd_log_write(const char *line, size_t len);

/* ---- storage_queue.c: chỉ task "storage" gọi, trừ ô peek được bảo vệ bằng mutex ---- */

/** Mở offline queue: quét các file đoạn hiện có và khôi phục bộ đếm. */
esp_err_t storage_queue_open(void);
/** Thêm một bản ghi vào cuối queue. */
ivts_err_t storage_queue_do_push(const uint8_t *rec, size_t len);
/** Nạp bản ghi cũ nhất vào ô peek và phát IVTS_EV_QUEUE_READY. */
ivts_err_t storage_queue_do_peek(void);
/** Bỏ bản ghi có @p token; token không khớp được bỏ qua. */
ivts_err_t storage_queue_do_pop(uint32_t token);
/** Tạo mutex của ô peek; gọi trước khi task "storage" chạy. */
void storage_queue_slot_init(void);

/* ---- storage_os.c ---- */

/** Tạo queue yêu cầu và task "storage". */
esp_err_t storage_os_start(void);
