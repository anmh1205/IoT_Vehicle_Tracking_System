/**
 * @file src/board_task.c
 * @brief ADC sampling and latched IMU interrupt handling on the board task.
 *
 * Board startup publishes the task settings. The ISR and app sleep adapter only notify the task.
 * A notification with an available IMU services OUTS1 and emits a motion event. Otherwise the task samples
 * power.
 * The notification wait restarts each iteration and can coalesce interrupts. Events are borrowed by the sink.
 * The app interprets motion and power. Initialization reapplies hardware settings after reset.
 */
#include "board_internal.h"
#include "drivers/drivers.h"
#include "esp_check.h"
#include "platform/log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static TaskHandle_t s_task;             /* Startup publishes the handle for the ISR and app. */
static board_cfg_t s_cfg;   /* Startup writes once. The board task reads the copy. */

void IRAM_ATTR board_task_notify_imu_from_isr(void)
{
    BaseType_t woken = pdFALSE;
    if (s_task != NULL) {
        vTaskNotifyGiveFromISR(s_task, &woken);
    }
    portYIELD_FROM_ISR(woken);
}

void board_task_notify_imu(void)
{
    if (s_task != NULL) {
        xTaskNotifyGive(s_task);
    }
}

static void emit(const ivts_event_t *ev)
{
    (void)ivts_sink_emit(&s_cfg.sink, ev);   /* A full app queue counts the dropped event. The board does not retry it. */
}

/**
 * @brief Read the IMU latch and report pin level and acceleration from task context.
 */
static void handle_imu_irq(uint64_t now_ms)
{
    uint8_t outs = 0;
    (void)lis3dsh_clear_interrupt(&outs);
    ivts_event_t event = { .type = IVTS_EV_MOTION_IRQ, .ts_ms = now_ms };
    event.u.motion_irq.pin_level = (uint8_t)lis3dsh_interrupt_level();
    event.u.motion_irq.imu_delta_mmps2 = lis3dsh_sample_delta(now_ms);
    IVTS_LOGD(BOARD_TAG, "imu irq outs1=0x%02x pin=%u delta=%lummps2", outs, event.u.motion_irq.pin_level,
              (unsigned long)event.u.motion_irq.imu_delta_mmps2);
    emit(&event);
}

static void sample_power(uint64_t now_ms)
{
    uint16_t vehicle_mv = 0;
    uint16_t device_mv = 0;
    if (board_power_read(&vehicle_mv, &device_mv) != IVTS_OK) {
        IVTS_LOGW(BOARD_TAG, "adc sample result=fail");
        return;
    }

    ivts_event_t event = { .type = IVTS_EV_POWER_SAMPLE, .ts_ms = now_ms };
    event.u.power.vehicle_mv = vehicle_mv;
    event.u.power.device_mv = device_mv;
    event.u.power.imu_delta_mmps2 = lis3dsh_sample_delta(now_ms);
    IVTS_LOGD(BOARD_TAG, "adc sample vehicle=%umV device=%umV imu_delta=%lummps2", vehicle_mv, device_mv,
              (unsigned long)event.u.power.imu_delta_mmps2);
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

void board_task_configure(const board_cfg_t *cfg)
{
    s_cfg = *cfg;
}

esp_err_t board_task_start(void)
{
    BaseType_t ok = xTaskCreate(board_task, "board", s_cfg.task_stack, NULL, s_cfg.task_prio, &s_task);
    ESP_RETURN_ON_FALSE(ok == pdPASS, ESP_ERR_NO_MEM, BOARD_TAG, "task");
    return ESP_OK;
}
