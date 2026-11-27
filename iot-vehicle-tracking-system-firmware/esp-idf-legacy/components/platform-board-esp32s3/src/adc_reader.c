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


/* Board ADC profile: U_SUPPLY on GPIO3 (ADC1_CH2), U_BATT on GPIO4 (ADC1_CH3). */
#define ADC_UNIT_USED ADC_UNIT_1          /* ADC1 (RTC-capable unit) hosts both sense channels. */
#define ADC_CHANNEL_SUPPLY ADC_CHANNEL_2  /* Vehicle +12V supply divider -> ADC1 channel 2 (GPIO3). */
#define ADC_CHANNEL_BATT ADC_CHANNEL_3    /* Backup battery divider -> ADC1 channel 3 (GPIO4). */
#define ADC_ATTEN_USED ADC_ATTEN_DB_12    /* 12 dB attenuation widens the usable input span to ~0..3.1V. */
#define ADC_SAMPLES 8                     /* Samples averaged per read to suppress ADC noise/jitter. */
#define ADC_SUPPLY_DIVIDER_RATIO 11.0f    /* External 10:1(+1) resistor divider on the supply sense node. */
#define ADC_BATT_DIVIDER_RATIO 11.0f      /* Matching divider on the battery sense node. */

/* ESP_LOG category tag for this module. */
static const char *TAG = "ADC_READER";

/* One-shot ADC unit handle (NULL until adc_reader_init succeeds). */
static adc_oneshot_unit_handle_t s_adc_handle = NULL;
/* Calibration handle for the supply channel (raw->mV curve fitting). */
static adc_cali_handle_t s_supply_cali_handle = NULL;
/* Calibration handle for the battery channel. */
static adc_cali_handle_t s_batt_cali_handle = NULL;
/* True when supply-channel calibration was created and may be used. */
static bool s_supply_calibration_enabled = false;
/* True when battery-channel calibration was created and may be used. */
static bool s_batt_calibration_enabled = false;

/**
 * @brief Try enabling calibration for a given ADC channel.
 */
static void adc_reader_try_enable_calibration(adc_channel_t channel,
                                              adc_cali_handle_t *out_handle,
                                              bool *out_enabled) {
    if (out_handle == NULL || out_enabled == NULL) {
        return;
    }

    // Default to "no calibration": callers fall back to a nominal raw->voltage formula.
    *out_handle = NULL;
    *out_enabled = false;

#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
    // Curve-fitting calibration uses per-chip eFuse data for accurate raw->millivolt conversion.
    adc_cali_curve_fitting_config_t cali_cfg = {
        .unit_id = ADC_UNIT_USED,
        .chan = channel,
        .atten = ADC_ATTEN_USED,        // Must match the attenuation used for actual reads.
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };
    // Calibration is best-effort: if the scheme cannot be created, stay on the fallback path.
    if (adc_cali_create_scheme_curve_fitting(&cali_cfg, out_handle) == ESP_OK) {
        *out_enabled = true;
    }
#else
    (void)channel;  // Calibration scheme unavailable on this target; silence unused-param warning.
#endif
}

/**
 * @brief Read one divider-scaled voltage from ADC.
 */
static float adc_reader_read_voltage(adc_channel_t channel,
                                     adc_cali_handle_t cali_handle,
                                     bool calibration_enabled,
                                     float divider_ratio) {
    // Guard against reads before init; a 0V reading is the safe "unknown" value here.
    if (s_adc_handle == NULL) {
        return 0.0f;
    }

    int raw_total = 0;     // Accumulated raw ADC counts across successful samples.
    int mv_total = 0;      // Accumulated calibrated millivolts (only used when calibration is on).
    int valid_samples = 0; // Count of samples that actually read successfully.

    // Oversample and accumulate; skipping any individual failed conversion.
    for (int i = 0; i < ADC_SAMPLES; ++i) {
        int raw = 0;
        if (adc_oneshot_read(s_adc_handle, channel, &raw) != ESP_OK) {
            continue;  // Drop this sample but keep averaging the rest.
        }
        raw_total += raw;

        if (calibration_enabled) {
            // Translate this raw count to millivolts using the per-chip calibration curve.
            int mv = 0;
            if (adc_cali_raw_to_voltage(cali_handle, raw, &mv) == ESP_OK) {
                mv_total += mv;
            }
        }

        valid_samples += 1;
    }

    // No usable samples -> report 0V rather than dividing by zero.
    if (valid_samples == 0) {
        return 0.0f;
    }

    float sample_count = (float)valid_samples;
    // Calibrated path: average measured mV. Fallback path: scale raw counts by the
    // nominal reference (3300 mV full scale over 12-bit 4095 counts).
    float mv_avg = calibration_enabled
        ? (mv_total / sample_count)
        : ((raw_total / sample_count) * 3300.0f / 4095.0f);

    // Convert pin millivolts to volts, then undo the external resistor divider to
    // recover the true node voltage (e.g. ~12V supply seen as ~1.09V at the pin).
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
    // Create the ADC1 one-shot unit; ULP access is disabled since the main CPU owns these reads.
    adc_oneshot_unit_init_cfg_t unit_cfg = {
        .unit_id = ADC_UNIT_USED,
        .ulp_mode = ADC_ULP_MODE_DISABLE,
    };

    esp_err_t err = adc_oneshot_new_unit(&unit_cfg, &s_adc_handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "adc_oneshot_new_unit failed");

    // Shared per-channel config: same attenuation and default bit width for both sense lines.
    adc_oneshot_chan_cfg_t chan_cfg = {
        .atten = ADC_ATTEN_USED,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };

    // Bind the backup-battery sense channel (GPIO4 / ADC1_CH3).
    err = adc_oneshot_config_channel(s_adc_handle, ADC_CHANNEL_BATT, &chan_cfg);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "config battery ADC channel failed");

    // Bind the vehicle +12V supply sense channel (GPIO3 / ADC1_CH2).
    err = adc_oneshot_config_channel(s_adc_handle, ADC_CHANNEL_SUPPLY, &chan_cfg);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "config supply ADC channel failed");

    // Best-effort calibration per channel; failure simply leaves that channel on the fallback formula.
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
    // Tear down the battery-channel calibration scheme first (if it was created).
    if (s_batt_cali_handle != NULL) {
#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
        adc_cali_delete_scheme_curve_fitting(s_batt_cali_handle);
#endif
        s_batt_cali_handle = NULL;
        s_batt_calibration_enabled = false;
    }

    // Then the supply-channel calibration scheme.
    if (s_supply_cali_handle != NULL) {
#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
        adc_cali_delete_scheme_curve_fitting(s_supply_cali_handle);
#endif
        s_supply_cali_handle = NULL;
        s_supply_calibration_enabled = false;
    }

    // Finally release the one-shot unit and clear the handle so re-init starts clean.
    if (s_adc_handle != NULL) {
        adc_oneshot_del_unit(s_adc_handle);
        s_adc_handle = NULL;
    }
}
