#include "board_internal.h"
#include "board/board_hw.h"
#include "board_task.h"
#include "bus/i2c_bus.h"
#include "drivers/ds3231.h"
#include "drivers/lis3dsh.h"
#include "drivers/power_adc.h"
#include "power/wake_cause.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "platform/platform.h"

static bool s_imu_ok;
static bool s_rtc_ok;
static bool s_led_ok;

ivts_err_t board_init(const board_cfg_t *cfg)
{
    if (cfg == NULL || cfg->sink.fn == NULL) {
        return IVTS_ERR_INVALID_ARG;
    }
    board_power_capture_wake();                 /* Chụp nguyên nhân thức ngay đầu init, trước các bước khác. */
    gpio_config_t led = { .pin_bit_mask = 1ULL << BOARD_PIN_LED, .mode = GPIO_MODE_OUTPUT };
    s_led_ok = gpio_config(&led) == ESP_OK;
    board_led_set(false);

    board_task_configure(cfg);
    esp_err_t e = board_i2c_init();
    if (e != ESP_OK) { return board_err(e); }   /* Không có bus I2C thì không có RTC và IMU. */

    s_rtc_ok = (ds3231_init(BOARD_DEV_RTC, BOARD_RTC_I2C_ADDR, BOARD_RTC_I2C_HZ) == ESP_OK);
    if (cfg->imu_enabled) {
        const lis3dsh_cfg_t imu_cfg = {
            .i2c_device = BOARD_DEV_IMU,
            .primary_address = BOARD_IMU_I2C_ADDR_PRIMARY,
            .alternate_address = BOARD_IMU_I2C_ADDR_ALT,
            .i2c_speed_hz = BOARD_IMU_I2C_HZ,
            .int_gpio = BOARD_PIN_IMU_INT1,
            .threshold = cfg->imu_threshold,
        };
        s_imu_ok = (lis3dsh_init(&imu_cfg) == ESP_OK);
    }
    const power_adc_cfg_t adc_cfg = {
        .vehicle_gpio = BOARD_PIN_ADC_VEHICLE,
        .device_gpio = BOARD_PIN_ADC_DEVICE,
        .divider = BOARD_ADC_DIVIDER,
        .vehicle_gain_ppm = BOARD_ADC_GAIN_VEHICLE_PPM,
        .device_gain_ppm = BOARD_ADC_GAIN_DEVICE_PPM,
    };
    e = power_adc_init(&adc_cfg);
    if (e != ESP_OK) { return board_err(e); }   /* Không có ADC thì không suy ra được ignition. */
    e = board_task_start();
    if (e != ESP_OK) { return board_err(e); }
    ESP_LOGI(BOARD_TAG, "init ok rtc=%d imu=%d wake=%d", s_rtc_ok, s_imu_ok, (int)board_wake_cause());
    return IVTS_OK;
}

bool board_imu_ok(void) { return s_imu_ok; }
bool board_rtc_ok(void) { return s_rtc_ok; }
void board_led_set(bool on)
{
    if (s_led_ok) { gpio_set_level(BOARD_PIN_LED, on ? 1 : 0); }
}

uint64_t board_uptime_ms(void)
{
    return platform_uptime_ms();
}
