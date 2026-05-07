#include "adc_reader.h"

#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"
#include "esp_check.h"
#include "esp_log.h"

#include "pin_map.h"

/**
 * @file adc_reader.c
 * @brief ADC one-shot readers for board supply and backup battery voltages.
 * This translation unit belongs to the ESP32-S3 board support layer and keeps board-specific pin mappings, peripherals, and power behavior isolated from portable runtime logic.
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


/* Board ADC profile: U_SUPPLY on GPIO3 (ADC1_CH2), U_BATT on GPIO4 (ADC1_CH3). */
#define ADC_UNIT_USED ADC_UNIT_1
#define ADC_CHANNEL_SUPPLY ADC_CHANNEL_2
#define ADC_CHANNEL_BATT ADC_CHANNEL_3
#define ADC_ATTEN_USED ADC_ATTEN_DB_12
#define ADC_SAMPLES 8
#define ADC_SUPPLY_DIVIDER_RATIO 11.0f
#define ADC_BATT_DIVIDER_RATIO 11.0f

static const char *TAG = "ADC_READER";

static adc_oneshot_unit_handle_t s_adc_handle = NULL;
static adc_cali_handle_t s_supply_cali_handle = NULL;
static adc_cali_handle_t s_batt_cali_handle = NULL;
static bool s_supply_calibration_enabled = false;
static bool s_batt_calibration_enabled = false;

/**
 * @brief Try enabling calibration for a given ADC channel.
 */
static void adc_reader_try_enable_calibration(adc_channel_t channel,
                                              adc_cali_handle_t *out_handle,
                                              bool *out_enabled) {
    // Read reader try enable calibration without widening the mutation surface of this module.
    if (out_handle == NULL || out_enabled == NULL) {
        return;
    }

    *out_handle = NULL;
    *out_enabled = false;

#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
    adc_cali_curve_fitting_config_t cali_cfg = {
        .unit_id = ADC_UNIT_USED,
        .chan = channel,
        .atten = ADC_ATTEN_USED,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };
    if (adc_cali_create_scheme_curve_fitting(&cali_cfg, out_handle) == ESP_OK) {
        *out_enabled = true;
    }
#else
    (void)channel;
#endif
}

/**
 * @brief Read one divider-scaled voltage from ADC.
 */
static float adc_reader_read_voltage(adc_channel_t channel,
                                     adc_cali_handle_t cali_handle,
                                     bool calibration_enabled,
                                     float divider_ratio) {
    // Read reader read voltage without widening the mutation surface of this module.
    if (s_adc_handle == NULL) {
        return 0.0f;
    }

    int raw_total = 0;
    int mv_total = 0;
    int valid_samples = 0;

    for (int i = 0; i < ADC_SAMPLES; ++i) {
        int raw = 0;
        if (adc_oneshot_read(s_adc_handle, channel, &raw) != ESP_OK) {
            continue;
        }
        raw_total += raw;

        if (calibration_enabled) {
            int mv = 0;
            if (adc_cali_raw_to_voltage(cali_handle, raw, &mv) == ESP_OK) {
                mv_total += mv;
            }
        }

        valid_samples += 1;
    }

    if (valid_samples == 0) {
        return 0.0f;
    }

    float sample_count = (float)valid_samples;
    float mv_avg = calibration_enabled
        ? (mv_total / sample_count)
        : ((raw_total / sample_count) * 3300.0f / 4095.0f);

    return (mv_avg / 1000.0f) * divider_ratio;
}

/**
 * @brief Initialize ADC one-shot unit and calibration.
 *
 * Initializes the ESP32 ADC1 in one-shot mode for reading
 * board supply voltage and vehicle battery voltage.
 * Uses voltage divider networks (11:1 ratio) to scale voltages
 * into ADC input range.
 *
 * Configures both GPIO3 (battery) and GPIO4 (supply) ADC channels.
 * Attempts to enable calibration scheme for accuracy.
 *
 * @return ESP_OK on success, ESP_FAIL on initialization failure.
 */
esp_err_t adc_reader_init(void) {
    // Initialize module-local state and dependencies before later runtime paths rely on them.
    adc_oneshot_unit_init_cfg_t unit_cfg = {
        .unit_id = ADC_UNIT_USED,
        .ulp_mode = ADC_ULP_MODE_DISABLE,
    };

    esp_err_t err = adc_oneshot_new_unit(&unit_cfg, &s_adc_handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "adc_oneshot_new_unit failed");

    adc_oneshot_chan_cfg_t chan_cfg = {
        .atten = ADC_ATTEN_USED,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };

    err = adc_oneshot_config_channel(s_adc_handle, ADC_CHANNEL_BATT, &chan_cfg);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "config battery ADC channel failed");

    err = adc_oneshot_config_channel(s_adc_handle, ADC_CHANNEL_SUPPLY, &chan_cfg);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "config supply ADC channel failed");

    adc_reader_try_enable_calibration(ADC_CHANNEL_BATT,
                                      &s_batt_cali_handle,
                                      &s_batt_calibration_enabled);
    adc_reader_try_enable_calibration(ADC_CHANNEL_SUPPLY,
                                      &s_supply_cali_handle,
                                      &s_supply_calibration_enabled);

    ESP_LOGI(TAG,
             "ADC reader initialized batt_gpio=%d supply_gpio=%d",
             PIN_U_BATT_ADC,
             PIN_U_SUPPLY_ADC);
    return ESP_OK;
}

/**
 * @brief Read device (ESP32) input voltage.
 *
 * Reads the voltage at the device's power input after the
 * voltage divider. This reflects the battery voltage after
 * the reverse-protection circuit.
 *
 * Takes multiple samples and averages for stability.
 *
 * @return Voltage in volts (V), 0.0 if ADC not initialized.
 */
float adc_read_device_battery_voltage(void) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
    return adc_reader_read_voltage(ADC_CHANNEL_BATT,
                                   s_batt_cali_handle,
                                   s_batt_calibration_enabled,
                                   ADC_BATT_DIVIDER_RATIO);
}

/**
 * @brief Read vehicle battery (external) voltage.
 *
 * Reads the voltage at the external vehicle battery input after
 * the voltage divider. This is the main vehicle system voltage.
 *
 * Takes multiple samples and averages for stability.
 *
 * @return Voltage in volts (V), 0.0 if ADC not initialized.
 */
float adc_read_vehicle_battery_voltage(void) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
    return adc_reader_read_voltage(ADC_CHANNEL_SUPPLY,
                                   s_supply_cali_handle,
                                   s_supply_calibration_enabled,
                                   ADC_SUPPLY_DIVIDER_RATIO);
}

/**
 * @brief Release ADC resources.
 *
 * Deletes calibration handles and ADC unit.
 * Called during shutdown or when ADC is no longer needed.
 */
void adc_reader_deinit(void) {
    // Initialize module-local state and dependencies before later runtime paths rely on them.
    if (s_batt_cali_handle != NULL) {
#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
        adc_cali_delete_scheme_curve_fitting(s_batt_cali_handle);
#endif
        s_batt_cali_handle = NULL;
        s_batt_calibration_enabled = false;
    }

    if (s_supply_cali_handle != NULL) {
#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
        adc_cali_delete_scheme_curve_fitting(s_supply_cali_handle);
#endif
        s_supply_cali_handle = NULL;
        s_supply_calibration_enabled = false;
    }

    if (s_adc_handle != NULL) {
        adc_oneshot_del_unit(s_adc_handle);
        s_adc_handle = NULL;
    }
}
