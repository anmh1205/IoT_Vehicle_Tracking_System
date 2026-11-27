/**
 * @file storage.c
 * @brief Khởi tạo component storage và trạng thái chung (cấu hình, cờ thẻ SD).
 */

#include "storage_internal.h"
#include "storage_task.h"
#include "nvs/nvs_store_internal.h"
#include "queue/queue.h"
#include "sd/sd_io.h"
#include "esp_log.h"
#include "platform/platform.h"

static storage_cfg_t s_storage_cfg;
static bool s_sd_ok;   /* Thẻ SD đã gắn và queue đã mở; ghi trong storage_init(), trước khi task "storage" tồn tại. */

const storage_cfg_t *storage_config_view(void) { return &s_storage_cfg; }

void storage_emit(const ivts_event_t *ev)
{
    (void)ivts_sink_emit(&s_storage_cfg.sink, ev);
}

/* Xem storage.h. */
bool storage_sd_ok(void) { return s_sd_ok; }

/*
 * Xem storage.h. Thứ tự: NVS, ô peek, thẻ SD và queue, rồi task "storage". Gắn thẻ hoặc mở queue
 * thất bại chỉ đặt s_sd_ok = false và báo IVTS_EV_STORE_RESULT (op SD_MOUNT); NVS thất bại làm
 * hàm lỗi vì không có NVS thì không có cấu hình.
 */
ivts_err_t storage_init(const storage_cfg_t *cfg)
{
    if (cfg == NULL || cfg->sink.fn == NULL) { return IVTS_ERR_INVALID_ARG; }
    s_storage_cfg = *cfg;

    esp_err_t e = storage_nvs_init();
    if (e != ESP_OK) {
        ESP_LOGE(STORAGE_TAG, "nvs init: %s", esp_err_to_name(e));
        return platform_err_from_esp(e);
    }
    storage_queue_slot_init();
    if (cfg->sd_enabled) {
        e = storage_sd_mount();
        s_sd_ok = (e == ESP_OK);
        if (s_sd_ok) {
            s_sd_ok = (storage_queue_open() == ESP_OK);
        }
        if (!s_sd_ok) {
            ivts_event_t ev = { .type = IVTS_EV_STORE_RESULT, .ts_ms = platform_uptime_ms() };
            ev.u.store_result.op = IVTS_STORE_OP_SD_MOUNT;
            ev.u.store_result.err = (int32_t)IVTS_ERR_IO;
            storage_emit(&ev);
        }
    }
    e = storage_task_start();
    ESP_LOGI(STORAGE_TAG, "init sd=%d pending=%lu", s_sd_ok, (unsigned long)storage_queue_count());
    return platform_err_from_esp(e);
}
