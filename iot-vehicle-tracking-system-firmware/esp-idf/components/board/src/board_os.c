/**
 * @file board_os.c
 * @brief Task "board" và mutex bus I2C.
 *
 * ## Mô hình thực thi
 *
 * Task "board" (priority và stack lấy từ board_cfg_t; app_init.c đặt 2 và 3072 B):
 * - Sở hữu việc lấy mẫu ADC định kỳ và xử lý ngắt IMU. Không task nào khác đọc IMU.
 * - Chờ bằng ulTaskNotifyTake() với timeout = power_sample_ms:
 *   - có notify: đọc OUTS1 qua I2C (nhả ngắt đã chốt), phát IVTS_EV_MOTION_IRQ;
 *   - hết timeout: đọc ADC, phát IVTS_EV_POWER_SAMPLE.
 * - Priority thấp nhất trong hệ thống: mẫu ADC trễ vài trăm ms không ảnh hưởng chức năng,
 *   còn modem và app cần được phục vụ trước.
 *
 * ## Nguồn notify
 *
 * - imu_isr() gọi board_os_notify_imu_from_isr() (ngữ cảnh ISR).
 * - board_sleep() gọi board_os_notify_imu() (ngữ cảnh task) sau khi thức do IMU.
 *
 * ISR không gọi sink và không truy cập I2C; chỉ báo cho task. Task notification không đếm
 * theo từng lần: nhiều ngắt liên tiếp gộp thành một lần xử lý, và không có sự kiện nào bị mất
 * vì mỗi lần xử lý đều đọc OUTS1 để nhả ngắt.
 *
 * ## Mutex bus I2C
 *
 * s_i2c_mutex bảo vệ bus giữa task "board" (IMU) và caller của board_time_get()/board_time_set()
 * (task app). Mutex được lấy bên trong board_i2c_read/write/probe (timeout 100 ms), nên caller
 * không bao giờ giữ mutex khi gọi sink hoặc hàm khác của board.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Task không có state bền vững. Cấu hình IMU được ghi lại ở mỗi lần board_init().
 */

#include "board_priv.h"
#include "esp_check.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"

static SemaphoreHandle_t s_i2c_mutex;   /* Khoá bus I2C, xem mô tả ở đầu file. */
static TaskHandle_t s_task;             /* Task "board"; NULL khi chưa tạo. */
static board_cfg_t s_cfg;   /* Bản sao cfg; chỉ ghi trong board_os_init(), trước khi task tồn tại. */

bool board_i2c_lock(uint32_t timeout_ms)
{
    return xSemaphoreTake(s_i2c_mutex, pdMS_TO_TICKS(timeout_ms)) == pdTRUE;
}

void board_i2c_unlock(void)
{
    xSemaphoreGive(s_i2c_mutex);
}

void IRAM_ATTR board_os_notify_imu_from_isr(void)
{
    BaseType_t woken = pdFALSE;
    if (s_task != NULL) {
        vTaskNotifyGiveFromISR(s_task, &woken);
    }
    portYIELD_FROM_ISR(woken);
}

void board_os_notify_imu(void)
{
    if (s_task != NULL) {
        xTaskNotifyGive(s_task);
    }
}

static void emit(const ivts_event_t *ev)
{
    (void)ivts_sink_emit(&s_cfg.sink, ev);   /* Queue app đầy: app đã đếm event bị bỏ, board không gửi lại. */
}

static void handle_imu_irq(uint64_t now_ms)
{
    uint8_t outs = 0;
    (void)board_imu_clear(&outs);
    ivts_event_t event = { .type = IVTS_EV_MOTION_IRQ, .ts_ms = now_ms };
    event.u.motion_irq.pin_level = (uint8_t)board_imu_int_level();
    event.u.motion_irq.imu_delta_mmps2 = board_imu_sample_delta(now_ms);
    emit(&event);
}

static void sample_power(uint64_t now_ms)
{
    uint16_t vehicle_mv = 0;
    uint16_t device_mv = 0;
    if (board_power_read(&vehicle_mv, &device_mv) != IVTS_OK) { return; }

    ivts_event_t event = { .type = IVTS_EV_POWER_SAMPLE, .ts_ms = now_ms };
    event.u.power.vehicle_mv = vehicle_mv;
    event.u.power.device_mv = device_mv;
    event.u.power.imu_delta_mmps2 = board_imu_sample_delta(now_ms);
    emit(&event);
}

static void board_task(void *arg)
{
    (void)arg;
    for (;;) {
        uint32_t notifications = ulTaskNotifyTake(pdTRUE, pdMS_TO_TICKS(s_cfg.power_sample_ms));
        uint64_t now_ms = board_uptime_ms();
        if (notifications > 0u && board_imu_ok()) {
            handle_imu_irq(now_ms);
        } else {
            sample_power(now_ms);
        }
    }
}

esp_err_t board_os_init(const board_cfg_t *cfg)
{
    s_cfg = *cfg;
    s_i2c_mutex = xSemaphoreCreateMutex();
    ESP_RETURN_ON_FALSE(s_i2c_mutex != NULL, ESP_ERR_NO_MEM, BOARD_TAG, "mutex");
    return ESP_OK;
}

/* Tạo task sau khi ADC và IMU đã khởi tạo: task bắt đầu đọc ADC ngay ở lần timeout đầu tiên. */
esp_err_t board_os_start(void)
{
    BaseType_t ok = xTaskCreate(board_task, "board", s_cfg.task_stack, NULL, s_cfg.task_prio, &s_task);
    ESP_RETURN_ON_FALSE(ok == pdPASS, ESP_ERR_NO_MEM, BOARD_TAG, "task");
    return ESP_OK;
}
