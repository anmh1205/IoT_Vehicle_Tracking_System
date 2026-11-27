/**
 * @file board_power.c
 * @brief Quản lý nguồn: cấu hình PM, ngủ light/deep sleep, xác định nguyên nhân thức.
 *
 * Mọi lời gọi esp_sleep_* của firmware nằm trong file này.
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
 * Deep sleep reset CPU; RAM thường mất, chỉ RTC_DATA_ATTR còn (xem app_rtc_ctx.c).
 * Nguyên nhân thức được đọc lại từ esp_sleep_get_wakeup_causes() ở lần boot kế tiếp.
 */

#include "board_priv.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_pm.h"
#include "esp_sleep.h"
#include "sdkconfig.h"

/** Nguyên nhân thức của lần boot hiện tại, chốt bởi board_power_capture_wake(). */
static board_wake_t s_boot_wake = BOARD_WAKE_POWER_ON;

static board_wake_t map_causes(uint32_t causes)
{
    /* Dùng bitmap của esp_sleep_get_wakeup_causes() vì nhiều nguồn có thể thức cùng lúc.
     * Khi GPIO/EXT và timer cùng kích hoạt, IMU được ưu tiên báo vì là sự kiện không lặp lại. */
    if (causes & (BIT(ESP_SLEEP_WAKEUP_GPIO) | BIT(ESP_SLEEP_WAKEUP_EXT0) | BIT(ESP_SLEEP_WAKEUP_EXT1))) {
        return BOARD_WAKE_IMU;
    }
    if (causes & BIT(ESP_SLEEP_WAKEUP_TIMER)) {
        return BOARD_WAKE_TIMER;
    }
    return (causes == 0u || causes == BIT(ESP_SLEEP_WAKEUP_UNDEFINED)) ? BOARD_WAKE_POWER_ON : BOARD_WAKE_OTHER;
}

void board_power_capture_wake(void)
{
    s_boot_wake = map_causes(esp_sleep_get_wakeup_causes());
}

board_wake_t board_wake_cause(void)
{
    return s_boot_wake;
}

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

bool board_motion_deep_wake_capable(void)
{
    return esp_sleep_is_valid_wakeup_gpio((gpio_num_t)BOARD_PIN_IMU_INT1);
}

static void arm_timer_wake(uint32_t seconds)
{
    (void)esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);
    (void)esp_sleep_enable_timer_wakeup((uint64_t)seconds * 1000000u);
}

static bool imu_already_pending(bool is_imu_armed)
{
    if (!is_imu_armed || board_imu_int_level() != 1) { return false; }
    /* Giữ ngắt đã chốt đến khi task board đọc OUTS1. */
    board_os_notify_imu();
    return true;
}

static void enter_deep_sleep(uint32_t seconds, bool arm_imu)
{
    if (arm_imu && board_motion_deep_wake_capable()) {
        (void)esp_sleep_enable_ext1_wakeup_io(1ULL << BOARD_PIN_IMU_INT1, ESP_EXT1_WAKEUP_ANY_HIGH);
    } else if (arm_imu) {
        ESP_LOGW(BOARD_TAG, "INT IMU gpio%d không phải RTC GPIO: deep sleep chỉ thức theo timer",
                 BOARD_PIN_IMU_INT1);
    }
    ESP_LOGI(BOARD_TAG, "deep sleep %lus", (unsigned long)seconds);
    esp_deep_sleep_start();
}

static esp_err_t arm_imu_level_wake(void)
{
    const gpio_num_t imu_gpio = (gpio_num_t)BOARD_PIN_IMU_INT1;
    /* Chuyển chân sang wake theo mức mà không phát ISR lặp khi INT1 còn chốt. */
    (void)gpio_intr_disable(imu_gpio);
    esp_err_t error = gpio_wakeup_enable(imu_gpio, GPIO_INTR_HIGH_LEVEL);
    return error == ESP_OK ? esp_sleep_enable_gpio_wakeup() : error;
}

static void restore_imu_edge_irq(void)
{
    const gpio_num_t imu_gpio = (gpio_num_t)BOARD_PIN_IMU_INT1;
    (void)gpio_wakeup_disable(imu_gpio);
    (void)gpio_set_intr_type(imu_gpio, GPIO_INTR_POSEDGE);
    (void)gpio_intr_enable(imu_gpio);
}

static board_wake_t enter_light_sleep(bool arm_imu)
{
    esp_err_t error = arm_imu ? arm_imu_level_wake() : ESP_OK;
    if (error == ESP_OK) { error = esp_light_sleep_start(); }
    if (arm_imu) { restore_imu_edge_irq(); }
    if (error != ESP_OK) {
        if (imu_already_pending(arm_imu)) { return BOARD_WAKE_IMU; }
        ESP_LOGW(BOARD_TAG, "light sleep từ chối: %s", esp_err_to_name(error));
        return BOARD_WAKE_OTHER;
    }
    board_wake_t wake = map_causes(esp_sleep_get_wakeup_causes());
    if (wake == BOARD_WAKE_IMU) {
        board_os_notify_imu();                     /* Task board đọc OUTS1 và phát sự kiện. */
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
