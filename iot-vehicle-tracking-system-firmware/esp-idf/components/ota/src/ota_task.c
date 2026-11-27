/**
 * @file ota_task.c
 * @brief Vòng đời của task "ota": tạo khi bắt đầu OTA, tự xoá khi xong.
 *
 * ## Mô hình thực thi
 *
 * - ota_start() chạy trong task gọi (task "app"). Hàm sao chép lệnh vào s_job rồi tạo task "ota".
 * - Task "ota" (priority và stack từ ota_cfg_t; app_init.c đặt 3 và 6144 B) chạy ota_job_run() rồi
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
