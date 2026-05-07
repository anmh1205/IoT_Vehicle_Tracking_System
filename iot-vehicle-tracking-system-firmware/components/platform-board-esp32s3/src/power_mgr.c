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
 * This translation unit belongs to the ESP32-S3 board support layer and keeps board-specific pin mappings, peripherals, and power behavior isolated from portable runtime logic.
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


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
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    int raw_level = asserted ? 1 : 0;
    if (s_pwrkey_inverted_stage) {
        raw_level = asserted ? 1 : 0;
    } else {
        raw_level = asserted ? 0 : 1;
    }
    gpio_set_level(PIN_MODEM_PWRKEY, raw_level);
}

static const char *modem_pwrkey_profile_name(void) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
    return s_pwrkey_inverted_stage ? "INVERTED_STAGE" : "DIRECT";
}

/**
 * @brief Drive modem RESET line through inverting transistor stage.
 *
 * Hardware note: MCU GPIO HIGH turns on Q4 and pulls SIM7600 RESET LOW (asserted).
 */
static void modem_reset_drive(bool asserted) {
    // Reset the power-drive pulse state here so the next modem toggle starts from a clean edge sequence.
    if (PIN_MODEM_RESET == GPIO_NUM_NC) {
        return;
    }
    gpio_set_level(PIN_MODEM_RESET, asserted ? 1 : 0);
}

/**
 * @brief Drive modem DTR logical level through optional inverting transistor stage.
 */
static void modem_dtr_drive(bool high) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
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
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    if ((int)pin < 0 || (int)pin >= 64) {
        return 0;
    }
    return (1ULL << (uint32_t)pin);
}

/**
 * @brief Initialize power control GPIOs.
 *
 * Configures GPIO pins for modem control:
 * - Output: PWRKEY (power on/off), RESET, DTR (sleep control)
 * - Input: STATUS, NETLIGHT (status LEDs)
 *
 * All outputs are initialized to inactive/low state.
 *
 * @return ESP_OK on success.
 */
esp_err_t power_mgr_init(void) {
    // Initialize module-local state and dependencies before later runtime paths rely on them.
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
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
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

/**
 * @brief Power on the modem using PWRKEY pulse sequence.
 *
 * Sends a 500ms active-low PWRKEY pulse to turn on the SIM7600 modem.
 * This is the standard power-on sequence per SIM7600 hardware guide.
 *
 * @return ESP_OK on pulse sent, ESP_FAIL on error.
 */
esp_err_t modem_power_on(void) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
    return modem_power_key_pulse(MODEM_PWRKEY_ON_PULSE_MS);
}

/**
 * @brief Power off the modem using extended PWRKEY pulse.
 *
 * Sends a 3-second active-low PWRKEY pulse to safely power off
 * the SIM7600 modem. This is the standard power-off sequence.
 *
 * @return ESP_OK on pulse sent, ESP_FAIL on error.
 */
esp_err_t modem_power_off(void) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
    return modem_power_key_pulse(MODEM_PWRKEY_OFF_PULSE_MS);
}

/**
 * @brief Configure PWRKEY inversion stage.
 *
 * Some board designs use an inverting transistor between the ESP32
 * and modem PWRKEY. This allows polarity configuration
 * to match the hardware design.
 *
 * @param inverted true if hardware uses inverting stage, false for direct drive.
 * @return ESP_OK.
 */
esp_err_t modem_set_pwrkey_inverted_stage(bool inverted) {
    // Copy the caller-provided set pwrkey inverted stage into module-local state after lightweight guards.
    s_pwrkey_inverted_stage = inverted;
    modem_pwrkey_drive(false);
    ESP_LOGW(TAG,
             "PWRKEY profile switched -> %s",
             modem_pwrkey_profile_name());
    return ESP_OK;
}

/**
 * @brief Get current PWRKEY inversion stage setting.
 *
 * @return true if inverted stage is configured.
 */
bool modem_get_pwrkey_inverted_stage(void) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
    return s_pwrkey_inverted_stage;
}

/**
 * @brief Send modem RESET pulse.
 *
 * Sends a 200ms pulse to the modem RESET line to trigger
 * a hardware reset. This is used for recover scenarios.
 *
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED if RESET pin not connected.
 */
esp_err_t modem_reset_pulse(void) {
    // Reset the pulse timing state here so later power-key actions do not inherit stale timing.
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

/**
 * @brief Set modem DTR line for sleep/wake control.
 *
 * The DTR line controls modem low-power state. Setting high
 * tells modem it can enter sleep mode when idle.
 *
 * @param high true for active/high (allow sleep), false for active/wake.
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED if DTR pin not connected.
 */
esp_err_t modem_set_dtr(bool high) {
    // Copy the caller-provided set dtr into module-local state after lightweight guards.
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

/**
 * @brief Read modem STATUS pin.
 *
 * Reads the hardware STATUS output from the modem, which indicates
 * the modem's power state.
 *
 * @param level Output for pin level (true=high, false=low).
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED if STATUS pin not connected.
 */
esp_err_t modem_read_status(bool *level) {
    // Read read status without widening the mutation surface of this module.
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
 * @brief Read modem NETLIGHT (network LED) pin.
 *
 * Reads the NETLIGHT output which indicates network
 * registration and activity status.
 *
 * @param level Output for pin level.
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED if pin not connected.
 */
esp_err_t modem_read_netlight(bool *level) {
    // Read read netlight without widening the mutation surface of this module.
    if (PIN_MODEM_NETLIGHT == GPIO_NUM_NC) {
        return ESP_ERR_NOT_SUPPORTED;
    }
    if (level == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    *level = gpio_get_level(PIN_MODEM_NETLIGHT) == 1;
    return ESP_OK;
}
