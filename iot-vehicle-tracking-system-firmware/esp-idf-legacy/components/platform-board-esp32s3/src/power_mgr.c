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


/* ESP_LOG category tag printed with every message emitted by this module. */
static const char *TAG = "POWER_MGR";

/*
 * SIM7600CE HW guide (Power on/off timing):
 * - Ton active-low PWRKEY pulse: min 100 ms, typical 500 ms
 * - Toff active-low PWRKEY pulse: min 2.5 s
 */
#define MODEM_PWRKEY_ON_PULSE_MS 500   /* PWRKEY assert width to boot the modem (typical Ton). */
#define MODEM_PWRKEY_OFF_PULSE_MS 3000 /* PWRKEY assert width to power down the modem (> min Toff 2.5 s). */
#define MODEM_PWRKEY_INVERTED_STAGE_DEFAULT 1 /* 1 = board routes PWRKEY through an inverting transistor stage. */
#define MODEM_DTR_INVERTED_STAGE 1 /* 1 = DTR is also driven through an inverting transistor stage. */
#define MODEM_RESET_PULSE_MS 200   /* Hardware RESET assert width for a forced modem reset. */

/* True when GPIO HIGH drives modem-side PWRKEY active (through an inverting stage). */
static bool s_pwrkey_inverted_stage = MODEM_PWRKEY_INVERTED_STAGE_DEFAULT != 0;

/**
 * @brief Drive modem PWRKEY line considering optional inversion stage.
 *
 * @param asserted true to assert modem-side PWRKEY, false to release.
 */
static void modem_pwrkey_drive(bool asserted) {
    bool inverted = s_pwrkey_inverted_stage;
    gpio_set_level(PIN_MODEM_PWRKEY, inverted == asserted ? 1 : 0);
}

/**
 * @brief Human-readable name of the active PWRKEY wiring profile (for logs).
 *
 * @return "INVERTED_STAGE" when an inverting transistor sits between MCU and PWRKEY,
 *         otherwise "DIRECT" for a straight active-low connection.
 */
static const char *modem_pwrkey_profile_name(void) {
    return s_pwrkey_inverted_stage ? "INVERTED_STAGE" : "DIRECT";
}

/**
 * @brief Drive modem RESET line through inverting transistor stage.
 *
 * Hardware note: MCU GPIO HIGH turns on Q4 and pulls SIM7600 RESET LOW (asserted).
 */
static void modem_reset_drive(bool asserted) {
    // Reset the power-drive pulse state here so the next modem toggle starts from a clean edge sequence.
    // Skip silently when the RESET line is not wired on this board revision.
    if (PIN_MODEM_RESET == GPIO_NUM_NC) {
        return;
    }
    // GPIO HIGH turns on the inverting transistor (Q4) which pulls SIM7600 RESET LOW = asserted.
    gpio_set_level(PIN_MODEM_RESET, asserted ? 1 : 0);
}

/**
 * @brief Drive modem DTR logical level through optional inverting transistor stage.
 */
static void modem_dtr_drive(bool high) {
    // DTR is optional; do nothing when the pin is not mapped on this board revision.
    if (PIN_MODEM_DTR == GPIO_NUM_NC) {
        return;
    }

#if MODEM_DTR_INVERTED_STAGE
    // Inverting stage: desired modem-side HIGH requires driving the MCU GPIO LOW (and vice versa).
    gpio_set_level(PIN_MODEM_DTR, high ? 0 : 1);
#else
    // Direct connection: MCU GPIO level matches the modem-side DTR level one-to-one.
    gpio_set_level(PIN_MODEM_DTR, high ? 1 : 0);
#endif
}

/**
 * @brief Build a GPIO bit mask safely for valid pins only.
 */
static uint64_t power_gpio_mask(gpio_num_t pin) {
    // gpio_config() expects a 64-bit bit mask; reject NC/out-of-range pins to avoid an invalid shift.
    if ((int)pin < 0 || (int)pin >= 64) {
        return 0;
    }
    // Set exactly the bit that corresponds to this GPIO number.
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
    // Build the output bit mask: PWRKEY is always present, RESET and DTR only when mapped.
    uint64_t output_mask = power_gpio_mask(PIN_MODEM_PWRKEY);
    if (PIN_MODEM_RESET != GPIO_NUM_NC) {
        output_mask |= power_gpio_mask(PIN_MODEM_RESET);
    }
    if (PIN_MODEM_DTR != GPIO_NUM_NC) {
        output_mask |= power_gpio_mask(PIN_MODEM_DTR);
    }

    if (output_mask != 0ULL) {
        // Push-pull outputs, no internal pulls (external stages define idle level), interrupts off.
        gpio_config_t output_cfg = {
            .pin_bit_mask = output_mask,
            .mode = GPIO_MODE_OUTPUT,
            .pull_up_en = GPIO_PULLUP_DISABLE,
            .pull_down_en = GPIO_PULLDOWN_DISABLE,
            .intr_type = GPIO_INTR_DISABLE,
        };
        esp_err_t err = gpio_config(&output_cfg);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "GPIO output config failed: %s", esp_err_to_name(err));
            return err;
        }
    }

    // Build the input bit mask for status sense lines that exist on this board.
    uint64_t input_mask = 0ULL;
    if (PIN_MODEM_STATUS != GPIO_NUM_NC) {
        input_mask |= power_gpio_mask(PIN_MODEM_STATUS);
    }
    if (PIN_MODEM_NETLIGHT != GPIO_NUM_NC) {
        input_mask |= power_gpio_mask(PIN_MODEM_NETLIGHT);
    }

    if (input_mask != 0ULL) {
        // Inputs with pull-down so a floating/disconnected line reads as a defined LOW.
        gpio_config_t input_cfg = {
            .pin_bit_mask = input_mask,
            .mode = GPIO_MODE_INPUT,
            .pull_up_en = GPIO_PULLUP_DISABLE,
            .pull_down_en = GPIO_PULLDOWN_ENABLE,
            .intr_type = GPIO_INTR_DISABLE,
        };
        esp_err_t err = gpio_config(&input_cfg);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "GPIO input config failed: %s", esp_err_to_name(err));
            return err;
        }
    }

    // Drive all control lines to their inactive/idle state so the modem is not accidentally toggled.
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
 *
 * Asserts PWRKEY, holds it for @p pulse_ms, then releases. The same primitive
 * serves both power-on (short pulse) and power-off (long pulse); only the hold
 * duration differs per the SIM7600 timing spec.
 *
 * @param pulse_ms PWRKEY assert hold time in milliseconds.
 * @return ESP_OK once the pulse has been driven.
 */
static esp_err_t modem_power_key_pulse(uint32_t pulse_ms) {
    ESP_LOGI(TAG,
             "SIM7600 PWRKEY pulse begin gpio=%d pulse_ms=%lu profile=%s",
             (int)PIN_MODEM_PWRKEY,
             (unsigned long)pulse_ms,
             modem_pwrkey_profile_name());
    modem_pwrkey_drive(true);                  // Assert PWRKEY (modem-side active).
    vTaskDelay(pdMS_TO_TICKS(pulse_ms));       // Hold the asserted level for the required width.
    modem_pwrkey_drive(false);                 // Release PWRKEY back to idle.
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
    return modem_power_key_pulse(MODEM_PWRKEY_OFF_PULSE_MS);
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
    // RESET is optional hardware; report unsupported when the line is not mapped.
    if (PIN_MODEM_RESET == GPIO_NUM_NC) {
        return ESP_ERR_NOT_SUPPORTED;
    }

    ESP_LOGI(TAG,
             "SIM7600 RESET pulse begin gpio=%d pulse_ms=%lu",
             (int)PIN_MODEM_RESET,
             (unsigned long)MODEM_RESET_PULSE_MS);
    modem_reset_drive(true);                          // Assert RESET (pull modem RESET LOW).
    vTaskDelay(pdMS_TO_TICKS(MODEM_RESET_PULSE_MS));  // Hold for the minimum reset width.
    modem_reset_drive(false);                         // Release RESET so the modem reboots.
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
    if (PIN_MODEM_DTR == GPIO_NUM_NC) {
        return ESP_ERR_NOT_SUPPORTED;
    }

    // Compute the raw GPIO level purely for logging/diagnostics; the actual drive is done by modem_dtr_drive().
    int raw_gpio_level = high ? 1 : 0;
#if MODEM_DTR_INVERTED_STAGE
    raw_gpio_level = high ? 0 : 1;  // Inverting stage flips the physical level vs. the logical modem-side level.
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
    if (PIN_MODEM_STATUS == GPIO_NUM_NC) {
        return ESP_ERR_NOT_SUPPORTED;
    }
    if (level == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    // STATUS is an active-high modem output: GPIO HIGH means the modem reports powered/ready.
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
    if (PIN_MODEM_NETLIGHT == GPIO_NUM_NC) {
        return ESP_ERR_NOT_SUPPORTED;
    }
    if (level == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    // NETLIGHT mirrors the modem network LED: blink pattern encodes registration/data activity.
    *level = gpio_get_level(PIN_MODEM_NETLIGHT) == 1;
    return ESP_OK;
}
