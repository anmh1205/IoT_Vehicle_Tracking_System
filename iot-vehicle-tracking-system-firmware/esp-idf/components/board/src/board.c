#include "board_priv.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_timer.h"

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

    esp_err_t e = board_os_init(cfg);           /* Mutex phải tồn tại trước mọi truy cập I2C. */
    if (e != ESP_OK) { return board_err(e); }
    e = board_i2c_init();
    if (e != ESP_OK) { return board_err(e); }   /* Không có bus I2C thì không có RTC và IMU. */

    s_rtc_ok = (board_rtc_init() == ESP_OK);
    if (cfg->imu_enabled) {
        s_imu_ok = (board_imu_init(cfg->imu_threshold) == ESP_OK);
    }
    e = board_adc_init();
    if (e != ESP_OK) { return board_err(e); }   /* Không có ADC thì không suy ra được ignition. */
    e = board_os_start();
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
    return (uint64_t)esp_timer_get_time() / 1000u;
}
