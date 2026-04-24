#include "power_mgr.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "driver/gpio.h"

#include "esp_err.h"
#include "esp_log.h"

#include "pin_map.h"

/**
 * @file power_mgr.c
 * @brief Modem control lines for board revisions without MCU-side power management.
 */

static const char *TAG = "POWER_MGR";

/*
 * SIM7600CE HW guide (Power on/off timing):
 * - Ton active-low PWRKEY pulse: min 100 ms, typical 500 ms
 * - Toff active-low PWRKEY pulse: min 2.5 s
 */
#define MODEM_PWRKEY_ON_PULSE_MS 500
#define MODEM_PWRKEY_OFF_PULSE_MS 3000
#define MODEM_PWRKEY_INVERTED_STAGE_DEFAULT 1
#define MODEM_DTR_INVERTED_STAGE 1
#define MODEM_RESET_PULSE_MS 200

/* True when GPIO HIGH drives modem-side PWRKEY active (through an inverting stage). */
static bool s_pwrkey_inverted_stage = MODEM_PWRKEY_INVERTED_STAGE_DEFAULT != 0;

/**
 * @brief Drive modem PWRKEY line considering optional inversion stage.
 *
 * @param asserted true to assert modem-side PWRKEY, false to release.
 */
static void modem_pwrkey_drive(bool asserted) {
    int raw_level = asserted ? 1 : 0;
    if (s_pwrkey_inverted_stage) {
        raw_level = asserted ? 1 : 0;
    } else {
        raw_level = asserted ? 0 : 1;
    }
    gpio_set_level(PIN_MODEM_PWRKEY, raw_level);
}

static const char *modem_pwrkey_profile_name(void) {
    return s_pwrkey_inverted_stage ? "INVERTED_STAGE" : "DIRECT";
}

/**
 * @brief Drive modem RESET line through inverting transistor stage.
 *
 * Hardware note: MCU GPIO HIGH turns on Q4 and pulls SIM7600 RESET LOW (asserted).
 */
static void modem_reset_drive(bool asserted) {
    if (PIN_MODEM_RESET == GPIO_NUM_NC) {
        return;
    }
    gpio_set_level(PIN_MODEM_RESET, asserted ? 1 : 0);
}

/**
 * @brief Drive modem DTR logical level through optional inverting transistor stage.
 */
static void modem_dtr_drive(bool high) {
    if (PIN_MODEM_DTR == GPIO_NUM_NC) {
        return;
    }

#if MODEM_DTR_INVERTED_STAGE
    gpio_set_level(PIN_MODEM_DTR, high ? 0 : 1);
#else
    gpio_set_level(PIN_MODEM_DTR, high ? 1 : 0);
#endif
}

/**
 * @brief Build a GPIO bit mask safely for valid pins only.
 */
static uint64_t power_gpio_mask(gpio_num_t pin) {
    if ((int)pin < 0 || (int)pin >= 64) {
        return 0;
    }
    return (1ULL << (uint32_t)pin);
}

esp_err_t power_mgr_init(void) {
    uint64_t output_mask = power_gpio_mask(PIN_MODEM_PWRKEY);
    if (PIN_MODEM_RESET != GPIO_NUM_NC) {
        output_mask |= power_gpio_mask(PIN_MODEM_RESET);
    }
    if (PIN_MODEM_DTR != GPIO_NUM_NC) {
        output_mask |= power_gpio_mask(PIN_MODEM_DTR);
    }

    if (output_mask != 0ULL) {
        gpio_config_t output_cfg = {
            .pin_bit_mask = output_mask,
            .mode = GPIO_MODE_OUTPUT,
            .pull_up_en = GPIO_PULLUP_DISABLE,
            .pull_down_en = GPIO_PULLDOWN_DISABLE,
            .intr_type = GPIO_INTR_DISABLE,
        };
        ESP_ERROR_CHECK(gpio_config(&output_cfg));
    }

    uint64_t input_mask = 0ULL;
    if (PIN_MODEM_STATUS != GPIO_NUM_NC) {
        input_mask |= power_gpio_mask(PIN_MODEM_STATUS);
    }
    if (PIN_MODEM_NETLIGHT != GPIO_NUM_NC) {
        input_mask |= power_gpio_mask(PIN_MODEM_NETLIGHT);
    }

    if (input_mask != 0ULL) {
        gpio_config_t input_cfg = {
            .pin_bit_mask = input_mask,
            .mode = GPIO_MODE_INPUT,
            .pull_up_en = GPIO_PULLUP_DISABLE,
            .pull_down_en = GPIO_PULLDOWN_ENABLE,
            .intr_type = GPIO_INTR_DISABLE,
        };
        ESP_ERROR_CHECK(gpio_config(&input_cfg));
    }

    modem_pwrkey_drive(false);
    modem_reset_drive(false);
    if (PIN_MODEM_DTR != GPIO_NUM_NC) {
        modem_dtr_drive(false);
    }

    ESP_LOGI(TAG,
             "PWRKEY profile=%s default_inverted_stage=%d",
             modem_pwrkey_profile_name(),
             MODEM_PWRKEY_INVERTED_STAGE_DEFAULT);

    return ESP_OK;
}

/**
 * @brief Send modem power-key pulse sequence.
 */
static esp_err_t modem_power_key_pulse(uint32_t pulse_ms) {
    ESP_LOGI(TAG,
             "SIM7600 PWRKEY pulse begin gpio=%d pulse_ms=%lu profile=%s",
             (int)PIN_MODEM_PWRKEY,
             (unsigned long)pulse_ms,
             modem_pwrkey_profile_name());
    modem_pwrkey_drive(true);
    vTaskDelay(pdMS_TO_TICKS(pulse_ms));
    modem_pwrkey_drive(false);
    ESP_LOGI(TAG, "SIM7600 PWRKEY pulse end gpio=%d", (int)PIN_MODEM_PWRKEY);
    return ESP_OK;
}

esp_err_t modem_power_on(void) {
    return modem_power_key_pulse(MODEM_PWRKEY_ON_PULSE_MS);
}

esp_err_t modem_power_off(void) {
    return modem_power_key_pulse(MODEM_PWRKEY_OFF_PULSE_MS);
}

esp_err_t modem_set_pwrkey_inverted_stage(bool inverted) {
    s_pwrkey_inverted_stage = inverted;
    modem_pwrkey_drive(false);
    ESP_LOGW(TAG,
             "PWRKEY profile switched -> %s",
             modem_pwrkey_profile_name());
    return ESP_OK;
}

bool modem_get_pwrkey_inverted_stage(void) {
    return s_pwrkey_inverted_stage;
}

esp_err_t modem_reset_pulse(void) {
    if (PIN_MODEM_RESET == GPIO_NUM_NC) {
        return ESP_ERR_NOT_SUPPORTED;
    }

    ESP_LOGI(TAG,
             "SIM7600 RESET pulse begin gpio=%d pulse_ms=%lu",
             (int)PIN_MODEM_RESET,
             (unsigned long)MODEM_RESET_PULSE_MS);
    modem_reset_drive(true);
    vTaskDelay(pdMS_TO_TICKS(MODEM_RESET_PULSE_MS));
    modem_reset_drive(false);
    ESP_LOGI(TAG, "SIM7600 RESET pulse end gpio=%d", (int)PIN_MODEM_RESET);
    return ESP_OK;
}

esp_err_t modem_set_dtr(bool high) {
    if (PIN_MODEM_DTR == GPIO_NUM_NC) {
        return ESP_ERR_NOT_SUPPORTED;
    }

    int raw_gpio_level = high ? 1 : 0;
#if MODEM_DTR_INVERTED_STAGE
    raw_gpio_level = high ? 0 : 1;
#endif

    modem_dtr_drive(high);
    ESP_LOGI(TAG,
             "SIM7600 DTR set level=%d gpio=%d raw_gpio_level=%d inverted_stage=%d",
             high ? 1 : 0,
             (int)PIN_MODEM_DTR,
             raw_gpio_level,
             MODEM_DTR_INVERTED_STAGE);
    return ESP_OK;
}

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
