#include "adc_reader.h"

#include <math.h>

#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"
#include "esp_log.h"

#include "pin_map.h"
#include "util.h"

/**
 * @file adc_reader.c
 * @brief Battery voltage reading using ADC one-shot mode and optional calibration.
 */

/* ADC hardware profile used by the board. */
#define ADC_UNIT_USED ADC_UNIT_1
#define ADC_CHANNEL_USED ADC_CHANNEL_3
#define ADC_ATTEN_USED ADC_ATTEN_DB_12
/* Number of samples per read to reduce noise. */
#define ADC_SAMPLES 8
/* Hardware resistor divider ratio (Rtop+Rbottom)/Rbottom. */
#define ADC_DIVIDER_RATIO 11.0f

static const char *TAG = "ADC_READER";

/* One-shot ADC handle, created once during init. */
static adc_oneshot_unit_handle_t s_adc_handle = NULL;
/* ADC calibration handle (available on supported targets). */
static adc_cali_handle_t s_cali_handle = NULL;
/* Indicates whether calibration conversion path is active. */
static bool s_calibration_enabled = false;

/**
 * @brief Initialize one-shot ADC channel and optional calibration engine.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t adc_reader_init(void) {
    /* Configure one-shot ADC unit. */
    adc_oneshot_unit_init_cfg_t unit_cfg = {
        .unit_id = ADC_UNIT_USED,
        .ulp_mode = ADC_ULP_MODE_DISABLE,
    };

    /* Allocate ADC unit driver object. */
    esp_err_t err = adc_oneshot_new_unit(&unit_cfg, &s_adc_handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "adc_oneshot_new_unit failed");

    /* Configure attenuation/bitwidth for the battery channel. */
    adc_oneshot_chan_cfg_t chan_cfg = {
        .atten = ADC_ATTEN_USED,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };

    /* Bind channel configuration to the ADC unit. */
    err = adc_oneshot_config_channel(s_adc_handle, ADC_CHANNEL_USED, &chan_cfg);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "adc_oneshot_config_channel failed");

#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
    /* Try enabling curve-fitting calibration for more accurate millivolts. */
    adc_cali_curve_fitting_config_t cali_cfg = {
        .unit_id = ADC_UNIT_USED,
        .chan = ADC_CHANNEL_USED,
        .atten = ADC_ATTEN_USED,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };
    if (adc_cali_create_scheme_curve_fitting(&cali_cfg, &s_cali_handle) == ESP_OK) {
        s_calibration_enabled = true;
    }
#endif

    /* Log selected ADC GPIO for hardware diagnostics. */
    ESP_LOGI(TAG, "ADC reader initialized on GPIO %d", PIN_U_BATT_ADC);
    return ESP_OK;
}

/**
 * @brief Sample battery voltage and convert it to board input voltage.
 *
 * @return Battery voltage in volts, or 0.0f if ADC is not initialized.
 */
float adc_read_battery_voltage(void) {
    /* Fast-fail when ADC was not initialized yet. */
    if (s_adc_handle == NULL) {
        return 0.0f;
    }

    /* Accumulate raw and calibrated results across multiple samples. */
    int raw_total = 0;
    int mv_total = 0;

    for (int i = 0; i < ADC_SAMPLES; ++i) {
        int raw = 0;
        /* Skip failed conversions but continue averaging remaining samples. */
        if (adc_oneshot_read(s_adc_handle, ADC_CHANNEL_USED, &raw) != ESP_OK) {
            continue;
        }
        raw_total += raw;

        int mv = 0;
        if (s_calibration_enabled) {
            /* Use calibration table when available. */
            if (adc_cali_raw_to_voltage(s_cali_handle, raw, &mv) == ESP_OK) {
                mv_total += mv;
            }
        }
    }

    /* Convert averaged sample to millivolts. */
    float sample_count = (float)ADC_SAMPLES;
    float mv_avg = s_calibration_enabled
        /* Already calibrated in mV. */
        ? (mv_total / sample_count)
        /* Approximate conversion from raw code when calibration unavailable. */
        : ((raw_total / sample_count) * 3300.0f / 4095.0f);

    /* Scale ADC input voltage back to battery voltage via divider ratio. */
    return (mv_avg / 1000.0f) * ADC_DIVIDER_RATIO;
}

/**
 * @brief Release ADC and calibration resources.
 */
void adc_reader_deinit(void) {
    /* Destroy calibration context first because it references channel setup. */
    if (s_cali_handle != NULL) {
#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
        adc_cali_delete_scheme_curve_fitting(s_cali_handle);
#endif
        s_cali_handle = NULL;
        s_calibration_enabled = false;
    }

    /* Destroy one-shot ADC unit. */
    if (s_adc_handle != NULL) {
        adc_oneshot_del_unit(s_adc_handle);
        s_adc_handle = NULL;
    }
}
