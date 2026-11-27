/**
 * @file board_task.c
 * @brief ADC sampling and latched IMU interrupt handling on the board task.
 *
 * The task uses the priority and stack supplied by app wiring. It waits on
 * ulTaskNotifyTake() for up to power_sample_ms. A notification services the
 * latched IMU interrupt and emits a motion event. A timeout produces an ADC
 * sample if the sampling deadline is due.
 *
 * The GPIO ISR only sends a task notification. The sleep adapter can also
 * notify the board task in task context after an IMU wake. Notifications can
 * coalesce, so the worker reads OUTS1 to release the latched interrupt.
 *
 * The task keeps no durable state. Board initialization reapplies the IMU
 * configuration after reset.
 */
#include "board_internal.h"
#include "drivers/drivers.h"
#include "esp_check.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static TaskHandle_t s_task;             /* Board task handle. NULL until creation. */
static board_cfg_t s_cfg;   /* Configuration copied before starting the worker. */

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

static void handle_imu_irq(uint64_t now_ms)
{
    uint8_t outs = 0;
    (void)lis3dsh_clear_interrupt(&outs);
    ivts_event_t event = { .type = IVTS_EV_MOTION_IRQ, .ts_ms = now_ms };
    event.u.motion_irq.pin_level = (uint8_t)lis3dsh_interrupt_level();
    event.u.motion_irq.imu_delta_mmps2 = lis3dsh_sample_delta(now_ms);
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
    event.u.power.imu_delta_mmps2 = lis3dsh_sample_delta(now_ms);
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

/* Start the worker after ADC and IMU initialization. */
esp_err_t board_task_start(void)
{
    BaseType_t ok = xTaskCreate(board_task, "board", s_cfg.task_stack, NULL, s_cfg.task_prio, &s_task);
    ESP_RETURN_ON_FALSE(ok == pdPASS, ESP_ERR_NO_MEM, BOARD_TAG, "task");
    return ESP_OK;
}
