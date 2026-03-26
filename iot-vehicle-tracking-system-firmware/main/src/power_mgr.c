#include "power_mgr.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "driver/gpio.h"

#include "adc_reader.h"
#include "pin_map.h"

/**
 * @file power_mgr.c
 * @brief Power domain selection, charger control, and low-voltage evaluation.
 */

/* Hysteresis latch to avoid rapid low-voltage toggling around threshold. */
static bool s_voltage_low_latched = false;

/**
 * @brief Configure power-control and status GPIOs.
 *
 * @return ESP_OK on success.
 */
esp_err_t power_mgr_init(void) {
    /* Configure output pins controlling mux, charger, and modem power key. */
    gpio_config_t output_cfg = {
        .pin_bit_mask = (1ULL << PIN_POWER_MUX_SEL) | (1ULL << PIN_CHARGER_EN) | (1ULL << PIN_MODEM_PWRKEY),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    ESP_ERROR_CHECK(gpio_config(&output_cfg));

    /* Configure digital input pins from low-voltage detector and ignition input. */
    gpio_config_t input_cfg = {
        .pin_bit_mask = (1ULL << PIN_LVD_STATUS) | (1ULL << PIN_IGN_IN),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    ESP_ERROR_CHECK(gpio_config(&input_cfg));

    /* Start from conservative power state after boot. */
    power_select_backup();
    charger_disable();
    gpio_set_level(PIN_MODEM_PWRKEY, 0);

    return ESP_OK;
}

/**
 * @brief Route system power from main battery path.
 */
void power_select_battery(void) {
    gpio_set_level(PIN_POWER_MUX_SEL, 0);
}

/**
 * @brief Route system power from backup path.
 */
void power_select_backup(void) {
    gpio_set_level(PIN_POWER_MUX_SEL, 1);
}

/**
 * @brief Enable charger control output.
 */
void charger_enable(void) {
    gpio_set_level(PIN_CHARGER_EN, 1);
}

/**
 * @brief Disable charger control output.
 */
void charger_disable(void) {
    gpio_set_level(PIN_CHARGER_EN, 0);
}

/**
 * @brief Read low-voltage status pin from external circuit.
 *
 * @return true when low-voltage status is asserted.
 */
bool power_is_low_voltage(void) {
    return gpio_get_level(PIN_LVD_STATUS) == 1;
}

/**
 * @brief Send modem power-key pulse sequence.
 *
 * @return ESP_OK always.
 */
static esp_err_t modem_power_key_pulse(void) {
    /* SIM7600 power key requires >1s high pulse. */
    gpio_set_level(PIN_MODEM_PWRKEY, 1);
    vTaskDelay(pdMS_TO_TICKS(1000));
    gpio_set_level(PIN_MODEM_PWRKEY, 0);
    return ESP_OK;
}

/**
 * @brief Request modem power-on by key pulse.
 *
 * @return ESP_OK always.
 */
esp_err_t modem_power_on(void) {
    return modem_power_key_pulse();
}

/**
 * @brief Request modem power-off by key pulse.
 *
 * @return ESP_OK always.
 */
esp_err_t modem_power_off(void) {
    return modem_power_key_pulse();
}

/**
 * @brief Read power status and evaluate low-voltage latch with hysteresis.
 *
 * @param lvd_threshold_v Enter-low threshold.
 * @param lvd_hysteresis_v Exit-low threshold.
 *
 * @return Power status snapshot.
 */
power_status_t power_get_status(float lvd_threshold_v, float lvd_hysteresis_v) {
    /* Capture current measurements and charger state. */
    power_status_t status = {
        .voltage = adc_read_battery_voltage(),
        .is_low = false,
        .charger_on = gpio_get_level(PIN_CHARGER_EN) == 1,
    };

    /* Enter low-voltage mode immediately when below threshold. */
    if (status.voltage <= lvd_threshold_v) {
        s_voltage_low_latched = true;
        /* Clear low-voltage mode only after recovery above hysteresis bound. */
    } else if (status.voltage >= lvd_hysteresis_v) {
        s_voltage_low_latched = false;
    }

    /* Final low-voltage state combines latched ADC and external detector pin. */
    status.is_low = s_voltage_low_latched || power_is_low_voltage();
    return status;
}
