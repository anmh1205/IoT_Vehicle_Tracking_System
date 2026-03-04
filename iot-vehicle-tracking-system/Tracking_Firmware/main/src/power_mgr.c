#include "power_mgr.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "driver/gpio.h"

#include "adc_reader.h"
#include "pin_map.h"

static bool s_voltage_low_latched = false;

esp_err_t power_mgr_init(void) {
    gpio_config_t output_cfg = {
        .pin_bit_mask = (1ULL << PIN_POWER_MUX_SEL) | (1ULL << PIN_CHARGER_EN) | (1ULL << PIN_MODEM_PWRKEY),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    ESP_ERROR_CHECK(gpio_config(&output_cfg));

    gpio_config_t input_cfg = {
        .pin_bit_mask = (1ULL << PIN_LVD_STATUS) | (1ULL << PIN_IGN_IN),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    ESP_ERROR_CHECK(gpio_config(&input_cfg));

    power_select_backup();
    charger_disable();
    gpio_set_level(PIN_MODEM_PWRKEY, 0);

    return ESP_OK;
}

void power_select_battery(void) {
    gpio_set_level(PIN_POWER_MUX_SEL, 0);
}

void power_select_backup(void) {
    gpio_set_level(PIN_POWER_MUX_SEL, 1);
}

void charger_enable(void) {
    gpio_set_level(PIN_CHARGER_EN, 1);
}

void charger_disable(void) {
    gpio_set_level(PIN_CHARGER_EN, 0);
}

bool power_is_low_voltage(void) {
    return gpio_get_level(PIN_LVD_STATUS) == 1;
}

static esp_err_t modem_power_key_pulse(void) {
    gpio_set_level(PIN_MODEM_PWRKEY, 1);
    vTaskDelay(pdMS_TO_TICKS(1000));
    gpio_set_level(PIN_MODEM_PWRKEY, 0);
    return ESP_OK;
}

esp_err_t modem_power_on(void) {
    return modem_power_key_pulse();
}

esp_err_t modem_power_off(void) {
    return modem_power_key_pulse();
}

power_status_t power_get_status(float lvd_threshold_v, float lvd_hysteresis_v) {
    power_status_t status = {
        .voltage = adc_read_battery_voltage(),
        .is_low = false,
        .charger_on = gpio_get_level(PIN_CHARGER_EN) == 1,
    };

    if (status.voltage <= lvd_threshold_v) {
        s_voltage_low_latched = true;
    } else if (status.voltage >= lvd_hysteresis_v) {
        s_voltage_low_latched = false;
    }

    status.is_low = s_voltage_low_latched || power_is_low_voltage();
    return status;
}
