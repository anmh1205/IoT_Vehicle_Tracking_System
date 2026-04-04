#include "power_mgr.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "driver/gpio.h"

#include "esp_err.h"

#include "adc_reader.h"
#include "pin_map.h"

/**
 * @file power_mgr.c
 * @brief Power domain selection, charger control, and low-voltage evaluation.
 */

/* Hysteresis latch to avoid rapid low-voltage toggling around threshold. */
static bool s_voltage_low_latched = false;

#define MODEM_PWRKEY_PULSE_MS 1000
#define MODEM_RESET_PULSE_MS 200

/**
 * @brief Configure power-control and status GPIOs.
 *
 * @return ESP_OK on success.
 */
esp_err_t power_mgr_init(void) {
    uint64_t output_mask = (1ULL << PIN_POWER_MUX_SEL) | (1ULL << PIN_CHARGER_EN) | (1ULL << PIN_MODEM_PWRKEY);

    if (PIN_MODEM_RESET != GPIO_NUM_NC) {
        output_mask |= 1ULL << PIN_MODEM_RESET;
    }
    if (PIN_MODEM_DTR != GPIO_NUM_NC) {
        output_mask |= 1ULL << PIN_MODEM_DTR;
    }

    /* Configure output pins controlling mux, charger, and modem control lines. */
    gpio_config_t output_cfg = {
        .pin_bit_mask = output_mask,
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    ESP_ERROR_CHECK(gpio_config(&output_cfg));

    uint64_t input_mask = (1ULL << PIN_LVD_STATUS) | (1ULL << PIN_IGN_IN);
    if (PIN_MODEM_STATUS != GPIO_NUM_NC) {
        input_mask |= 1ULL << PIN_MODEM_STATUS;
    }
    if (PIN_MODEM_NETLIGHT != GPIO_NUM_NC) {
        input_mask |= 1ULL << PIN_MODEM_NETLIGHT;
    }

    /* Configure digital input pins from low-voltage detector and modem status lines. */
    gpio_config_t input_cfg = {
        .pin_bit_mask = input_mask,
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
    if (PIN_MODEM_RESET != GPIO_NUM_NC) {
        gpio_set_level(PIN_MODEM_RESET, 1);
    }
    if (PIN_MODEM_DTR != GPIO_NUM_NC) {
        gpio_set_level(PIN_MODEM_DTR, 0);
    }

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
    vTaskDelay(pdMS_TO_TICKS(MODEM_PWRKEY_PULSE_MS));
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
 * @brief Pulse modem reset line when mapped.
 *
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED when not mapped.
 */
esp_err_t modem_reset_pulse(void) {
    if (PIN_MODEM_RESET == GPIO_NUM_NC) {
        return ESP_ERR_NOT_SUPPORTED;
    }

    gpio_set_level(PIN_MODEM_RESET, 0);
    vTaskDelay(pdMS_TO_TICKS(MODEM_RESET_PULSE_MS));
    gpio_set_level(PIN_MODEM_RESET, 1);
    return ESP_OK;
}

/**
 * @brief Set modem DTR line level when mapped.
 *
 * @param high Desired DTR level.
 *
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED when not mapped.
 */
esp_err_t modem_set_dtr(bool high) {
    if (PIN_MODEM_DTR == GPIO_NUM_NC) {
        return ESP_ERR_NOT_SUPPORTED;
    }

    gpio_set_level(PIN_MODEM_DTR, high ? 1 : 0);
    return ESP_OK;
}

/**
 * @brief Read modem STATUS line when mapped.
 *
 * @param level Output level pointer.
 *
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED when not mapped.
 */
esp_err_t modem_read_status(bool *level) {
    if (PIN_MODEM_STATUS == GPIO_NUM_NC) {
        return ESP_ERR_NOT_SUPPORTED;
    }
    if (level == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    *level = gpio_get_level(PIN_MODEM_STATUS) == 1;
    return ESP_OK;
}

/**
 * @brief Read modem NET-LIGHT line when mapped.
 *
 * @param level Output level pointer.
 *
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED when not mapped.
 */
esp_err_t modem_read_netlight(bool *level) {
    if (PIN_MODEM_NETLIGHT == GPIO_NUM_NC) {
        return ESP_ERR_NOT_SUPPORTED;
    }
    if (level == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    *level = gpio_get_level(PIN_MODEM_NETLIGHT) == 1;
    return ESP_OK;
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
