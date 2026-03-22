#include "adc_reader.h"

#include <math.h>

#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"
#include "esp_log.h"

#include "pin_map.h"
#include "util.h"

#define ADC_UNIT_USED ADC_UNIT_1
#define ADC_CHANNEL_USED ADC_CHANNEL_3
#define ADC_ATTEN_USED ADC_ATTEN_DB_12
#define ADC_SAMPLES 8
#define ADC_DIVIDER_RATIO 11.0f

static const char *TAG = "ADC_READER";

static adc_oneshot_unit_handle_t s_adc_handle = NULL;
static adc_cali_handle_t s_cali_handle = NULL;
static bool s_calibration_enabled = false;

esp_err_t adc_reader_init(void) {
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

    err = adc_oneshot_config_channel(s_adc_handle, ADC_CHANNEL_USED, &chan_cfg);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "adc_oneshot_config_channel failed");

#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
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

    ESP_LOGI(TAG, "ADC reader initialized on GPIO %d", PIN_U_BATT_ADC);
    return ESP_OK;
}

float adc_read_battery_voltage(void) {
    if (s_adc_handle == NULL) {
        return 0.0f;
    }

    int raw_total = 0;
    int mv_total = 0;

    for (int i = 0; i < ADC_SAMPLES; ++i) {
        int raw = 0;
        if (adc_oneshot_read(s_adc_handle, ADC_CHANNEL_USED, &raw) != ESP_OK) {
            continue;
        }
        raw_total += raw;

        int mv = 0;
        if (s_calibration_enabled) {
            if (adc_cali_raw_to_voltage(s_cali_handle, raw, &mv) == ESP_OK) {
                mv_total += mv;
            }
        }
    }

    float sample_count = (float)ADC_SAMPLES;
    float mv_avg = s_calibration_enabled
        ? (mv_total / sample_count)
        : ((raw_total / sample_count) * 3300.0f / 4095.0f);

    return (mv_avg / 1000.0f) * ADC_DIVIDER_RATIO;
}

void adc_reader_deinit(void) {
    if (s_cali_handle != NULL) {
#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
        adc_cali_delete_scheme_curve_fitting(s_cali_handle);
#endif
        s_cali_handle = NULL;
        s_calibration_enabled = false;
    }

    if (s_adc_handle != NULL) {
        adc_oneshot_del_unit(s_adc_handle);
        s_adc_handle = NULL;
    }
}
