/**
 * @file sleep.c
 * @brief Quản lý nguồn: cấu hình PM, ngủ light/deep sleep, xác định nguyên nhân thức.
 *
 * Component board sở hữu mọi lời gọi sleep của ESP-IDF.
 *
 * ## Ngữ cảnh gọi
 *
 * - board_power_capture_wake(): gọi một lần trong board_init(), trước khi task nào chạy.
 * - board_sleep(): chỉ task app (sleep controller) gọi. Hàm chặn trong suốt thời gian ngủ;
 *   khi light sleep, mọi task khác bị đóng băng cùng CPU. Deep sleep không trả về.
 * - board_wake_cause(): đọc s_boot_wake, giá trị chỉ ghi một lần lúc khởi động nên không cần khoá.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Deep sleep reset CPU; RAM thường mất, chỉ RTC_DATA_ATTR còn (xem rtc_context.c).
 * Nguyên nhân thức được đọc lại từ esp_sleep_get_wakeup_causes() ở lần boot kế tiếp.
 */

#include "board_internal.h"
#include "imu_wake.h"
#include "wake_cause.h"
#include "bsp/board_task.h"
#include "drivers/lis3dsh.h"
#include "esp_log.h"
#include "esp_pm.h"
#include "esp_sleep.h"
#include "sdkconfig.h"

ivts_err_t board_set_auto_light_sleep(bool enabled)
{
#if CONFIG_PM_ENABLE
    /* Khi cho phép tự ngủ, modem giữ ESP_PM_NO_LIGHT_SLEEP trong lúc cần UART. */
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
    /* Giữ ngắt đã chốt đến khi task board đọc OUTS1. */
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
        board_task_notify_imu();                     /* Task board đọc OUTS1 và phát sự kiện. */
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
