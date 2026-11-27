/**
 * @file sleep.c
 * @brief ESP-IDF light and deep sleep configuration for the board.
 *
 * Capture the ESP-IDF wake-source bitmap at board startup. The app sleep
 * controller is the sole caller that enters sleep. Light sleep suspends
 * execution until wake and returns the mapped wake reason. Deep sleep resets
 * the CPU on wake and preserves only the configured retained memory.
 */
#include "board_internal.h"
#include "board/board_hw.h"
#include "drivers/drivers.h"
#include "esp_log.h"
#include "esp_pm.h"
#include "esp_sleep.h"
#include "sdkconfig.h"

ivts_err_t board_set_auto_light_sleep(bool enabled)
{
#if CONFIG_PM_ENABLE
    /*
     * When automatic light sleep is enabled, the modem holds
     * ESP_PM_NO_LIGHT_SLEEP while it needs UART.
     */
    esp_pm_config_t pm = {
        .max_freq_mhz = CONFIG_ESP_DEFAULT_CPU_FREQ_MHZ,
        .min_freq_mhz = 40,
        .light_sleep_enable = enabled,
    };
    return board_err(esp_pm_configure(&pm));
#else
    (void)enabled;
    return IVTS_OK;
#endif
}

static void arm_timer_wake(uint32_t seconds)
{
    (void)esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);
    (void)esp_sleep_enable_timer_wakeup((uint64_t)seconds * 1000000u);
}

static bool imu_already_pending(bool is_imu_armed)
{
    if (!is_imu_armed || lis3dsh_interrupt_level() != 1) { return false; }
    /* Preserve the latched interrupt for the board task to acknowledge via OUTS1. */
    board_task_notify_imu();
    return true;
}

static void enter_deep_sleep(uint32_t seconds, bool arm_imu)
{
    if (arm_imu && board_motion_deep_wake_capable()) {
        board_power_arm_imu_deep_wake();
    } else if (arm_imu) {
        ESP_LOGW(BOARD_TAG, "INT IMU gpio%d không phải RTC GPIO: deep sleep chỉ thức theo timer",
                 BOARD_PIN_IMU_INT1);
    }
    ESP_LOGI(BOARD_TAG, "deep sleep %lus", (unsigned long)seconds);
    esp_deep_sleep_start();
}

static board_wake_t enter_light_sleep(bool arm_imu)
{
    esp_err_t error = arm_imu ? board_power_arm_imu_level_wake() : ESP_OK;
    if (error == ESP_OK) { error = esp_light_sleep_start(); }
    if (arm_imu) { board_power_restore_imu_edge_irq(); }
    if (error != ESP_OK) {
        if (imu_already_pending(arm_imu)) { return BOARD_WAKE_IMU; }
        ESP_LOGW(BOARD_TAG, "light sleep từ chối: %s", esp_err_to_name(error));
        return BOARD_WAKE_OTHER;
    }
    board_wake_t wake = board_power_read_wake_cause();
    if (wake == BOARD_WAKE_IMU) {
        board_task_notify_imu();                     /* The board task reads OUTS1 and publishes the motion event. */
    }
    return wake;
}

board_wake_t board_sleep(const board_sleep_req_t *req)
{
    if (req == NULL) { return BOARD_WAKE_OTHER; }
    arm_timer_wake(req->seconds);

    bool arm_imu = req->arm_imu && board_imu_ok();
    if (imu_already_pending(arm_imu)) { return BOARD_WAKE_IMU; }
    if (req->deep) { enter_deep_sleep(req->seconds, arm_imu); }
    return enter_light_sleep(arm_imu);
}
