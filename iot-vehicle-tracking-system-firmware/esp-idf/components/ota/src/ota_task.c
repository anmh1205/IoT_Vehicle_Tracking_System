/**
 * @file ota_task.c
 * @brief Vòng đời của task "ota": tạo khi bắt đầu OTA, tự xoá khi xong.
 *
 * ## Mô hình thực thi
 *
 * - ota_start() chạy trong task gọi (task "app"). Hàm sao chép lệnh vào s_job rồi tạo task "ota".
 * - Task "ota" (priority và stack từ ota_cfg_t; app_wiring.c đặt 3 và 6144 B) chạy ota_job_run() rồi
 *   tự xoá. Task chỉ tồn tại khi đang tải nên stack được trả lại heap sau mỗi lần OTA.
 * - s_running là cờ duy nhất giữa hai task, kiểu atomic: ota_start() đặt, task "ota" xoá khi
 *   xong, ota_running() đọc từ task bất kỳ. Cờ cũng chặn hai lần OTA chạy chồng.
 * - s_job được ghi trong ota_start() trước khi tạo task và chỉ đọc bởi task "ota" sau đó;
 *   việc tạo task đảm bảo thứ tự ghi trước đọc, nên không cần khoá.
 * - ota_job_run() chặn trong các lời gọi nguồn byte (modem_http_*) và gửi sự kiện tiến độ qua sink
 *   (không chặn). Kết quả đến task "app" qua queue của app.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Reset trong lúc tải làm mất tiến độ; esp_ota_begin() đã xoá partition đích nhưng partition
 * đang chạy không bị ảnh hưởng và firmware khởi động lại bình thường. Lần OTA sau bắt đầu từ đầu.
 */

#include "ota_internal.h"
#include <stdatomic.h>
#include <string.h>
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_app_desc.h"
#include "esp_ota_ops.h"
#include "platform/platform.h"

/** Tham số của lần OTA đang chạy. */
static struct {
    ivts_ota_cmd_t cmd;
    uint16_t       battery_mv, min_mv;
} s_job;
static atomic_bool s_running;   /* true từ ota_start() đến khi task "ota" kết thúc. */

/** Thân task "ota": chạy một lần OTA rồi tự xoá. */
static void ota_task(void *arg)
{
    (void)arg;
    ota_job_run(&s_job.cmd, s_job.battery_mv, s_job.min_mv);
    atomic_store(&s_running, false);
    vTaskDelete(NULL);
}

/* Xem ota.h. */
/* Xem ota.h. Cờ s_running được chiếm bằng atomic_exchange nên hai lời gọi đồng thời không thể
 * cùng thành công. s_job chỉ được ghi sau khi đã chiếm cờ. */
ivts_err_t ota_start(const ivts_ota_cmd_t *cmd, uint16_t battery_mv, uint16_t min_battery_mv)
{
    if (cmd == NULL) { return IVTS_ERR_INVALID_ARG; }
    if (atomic_exchange(&s_running, true)) { return IVTS_ERR_INVALID_STATE; }
    s_job.cmd = *cmd;
    s_job.battery_mv = battery_mv;
    s_job.min_mv = min_battery_mv;
    if (xTaskCreate(ota_task, "ota", ota_config()->task_stack, NULL, ota_config()->task_prio, NULL) != pdPASS) {
        atomic_store(&s_running, false);
        return IVTS_ERR_FULL;
    }
    return IVTS_OK;
}

/* Xem ota.h. */
bool ota_running(void) { return atomic_load(&s_running); }

static ota_cfg_t s_ota_cfg;
static _Atomic uint32_t s_progress;

const ota_cfg_t *ota_config(void) { return &s_ota_cfg; }

ivts_err_t ota_init(const ota_cfg_t *cfg)
{
    if (cfg == NULL || cfg->src.open == NULL || cfg->src.read == NULL || cfg->src.close == NULL ||
        cfg->prepare_boot == NULL) {
        return IVTS_ERR_INVALID_ARG;
    }
    s_ota_cfg = *cfg;
    return IVTS_OK;
}

void ota_emit(uint8_t phase, uint8_t pct, uint8_t err)
{
    uint32_t progress = (1u << 24) | ((uint32_t)phase << 16) | ((uint32_t)pct << 8) | err;
    atomic_store(&s_progress, progress);
    ivts_event_t ev = { .type = IVTS_EV_OTA_PROGRESS, .ts_ms = platform_uptime_ms() };
    ev.u.ota_progress.phase = phase;
    ev.u.ota_progress.pct = pct;
    ev.u.ota_progress.err = err;
    (void)ivts_sink_emit(&s_ota_cfg.sink, &ev);
}

bool ota_progress_take(ivts_event_t *ev)
{
    uint32_t progress = atomic_exchange(&s_progress, 0u);
    if (progress == 0u) { return false; }
    *ev = (ivts_event_t){ .type = IVTS_EV_OTA_PROGRESS };
    ev->u.ota_progress.phase = (uint8_t)(progress >> 16);
    ev->u.ota_progress.pct = (uint8_t)(progress >> 8);
    ev->u.ota_progress.err = (uint8_t)progress;
    return true;
}

/* Xem ota.h. */
bool ota_image_pending_verify(void)
{
    esp_ota_img_states_t st;
    const esp_partition_t *run = esp_ota_get_running_partition();
    return run != NULL && esp_ota_get_state_partition(run, &st) == ESP_OK && st == ESP_OTA_IMG_PENDING_VERIFY;
}

/* Xem ota.h. */
ivts_err_t ota_mark_valid(void)
{
    return esp_ota_mark_app_valid_cancel_rollback() == ESP_OK ? IVTS_OK : IVTS_ERR_IO;
}

/* Xem ota.h. */
ivts_err_t ota_rollback_and_reboot(void)
{
    /* ESP-IDF khởi động lại nếu thành công, nên quay lại caller luôn là lỗi. */
    esp_err_t e = esp_ota_mark_app_invalid_rollback_and_reboot();
    ESP_LOGE(OTA_TAG, "rollback: %s", esp_err_to_name(e));
    return IVTS_ERR_IO;
}

bool ota_can_rollback(void)
{
    const esp_partition_t *running = esp_ota_get_running_partition();
    return running != NULL && running->subtype != ESP_PARTITION_SUBTYPE_APP_FACTORY &&
           esp_ota_check_rollback_is_possible();
}

ivts_err_t ota_schedule_rollback(void)
{
    if (!ota_can_rollback()) { return IVTS_ERR_INVALID_STATE; }
    return esp_ota_mark_app_invalid_rollback() == ESP_OK ? IVTS_OK : IVTS_ERR_INVALID_STATE;
}

/* Xem ota.h. */
const char *ota_running_version(void)
{
    return esp_app_get_description()->version;
}

/* Xem ota.h. */
const char *ota_running_partition(void)
{
    const esp_partition_t *p = esp_ota_get_running_partition();
    return p != NULL ? p->label : "";
}
