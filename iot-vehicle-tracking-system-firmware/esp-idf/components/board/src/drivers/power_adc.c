/**
 * @file src/drivers/power_adc.c
 * @brief Calibrated ADC1 sampling of the vehicle and device supplies.
 *
 * Board startup configures the channels. The board task averages pin readings and applies divider and gain
 * correction.
 * The ESP-IDF one-shot driver arbitrates raw conversions. Application policy interprets the measured
 * voltages.
 */
#include "board_internal.h"
#include "drivers/drivers.h"
#include "drivers/drivers_calc.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_check.h"
#include "platform/log.h"

#define SAMPLES            8   /**< Samples per input averaged to reduce measurement noise. */

/** @brief Driver-owned channel setup populated during board startup. */
typedef struct {
    adc_channel_t     ch;   /**< ADC1 channel selected from the GPIO. */
    adc_cali_handle_t cali;   /**< Curve-fitting calibration handle retained by the driver. */
    uint32_t          gain_ppm;   /**< Input gain multiplier in parts per million. */
} chan_t;

/* Startup initializes the unit and calibration handles. SDK arbitration covers individual raw ADC reads. */
static adc_oneshot_unit_handle_t s_unit;
static chan_t s_veh, s_dev;
static uint32_t s_divider;

/**
 * @brief Configure a GPIO-backed ADC1 channel with eFuse curve fitting.
 */
static esp_err_t chan_init(int gpio, uint32_t gain_ppm, chan_t *c)
{
    adc_unit_t unit;
    ESP_RETURN_ON_ERROR(adc_oneshot_io_to_channel(gpio, &unit, &c->ch), BOARD_TAG, "io->ch %d", gpio);
    ESP_RETURN_ON_FALSE(unit == ADC_UNIT_1, ESP_ERR_INVALID_ARG, BOARD_TAG, "adc init gpio=%d result=not_adc1", gpio);
    adc_oneshot_chan_cfg_t cc = { .atten = ADC_ATTEN_DB_12, .bitwidth = ADC_BITWIDTH_DEFAULT };
    ESP_RETURN_ON_ERROR(adc_oneshot_config_channel(s_unit, c->ch, &cc), BOARD_TAG, "cfg ch");
    adc_cali_curve_fitting_config_t cal = {
        .unit_id = ADC_UNIT_1, .chan = c->ch, .atten = ADC_ATTEN_DB_12, .bitwidth = ADC_BITWIDTH_DEFAULT,
    };
    /*
     * Curve fitting requires eFuse calibration. If calibration is unavailable,
     * initialization fails because nominal scaling can shift the ignition
     * decision by several hundred millivolts at a 12 V input.
     */
    ESP_RETURN_ON_ERROR(adc_cali_create_scheme_curve_fitting(&cal, &c->cali), BOARD_TAG, "cali ch%d", (int)c->ch);
    c->gain_ppm = gain_ppm;
    return ESP_OK;
}

esp_err_t power_adc_init(const power_adc_cfg_t *cfg)
{
    s_divider = cfg->divider;
    adc_oneshot_unit_init_cfg_t uc = { .unit_id = ADC_UNIT_1 };
    ESP_RETURN_ON_ERROR(adc_oneshot_new_unit(&uc, &s_unit), BOARD_TAG, "adc unit");
    ESP_RETURN_ON_ERROR(chan_init(cfg->vehicle_gpio, cfg->vehicle_gain_ppm, &s_veh), BOARD_TAG, "veh");
    ESP_RETURN_ON_ERROR(chan_init(cfg->device_gpio, cfg->device_gain_ppm, &s_dev), BOARD_TAG, "dev");
    IVTS_LOGI(BOARD_TAG, "adc init vehicle_gpio=%d device_gpio=%d divider=%lu vehicle_gain=%luppm device_gain=%luppm",
              cfg->vehicle_gpio, cfg->device_gpio, (unsigned long)cfg->divider,
              (unsigned long)cfg->vehicle_gain_ppm, (unsigned long)cfg->device_gain_ppm);
    return ESP_OK;
}

/**
 * @brief Average calibrated pin samples before applying the channel correction.
 */
static esp_err_t read_mv(const chan_t *c, uint16_t *out)
{
    int sum = 0;
    for (int i = 0; i < SAMPLES; i++) {
        int raw = 0, mv = 0;
        ESP_RETURN_ON_ERROR(adc_oneshot_read(s_unit, c->ch, &raw), BOARD_TAG, "read");
        ESP_RETURN_ON_ERROR(adc_cali_raw_to_voltage(c->cali, raw, &mv), BOARD_TAG, "cali");
        sum += mv;
    }
    uint64_t pin_mv = (uint64_t)(sum / SAMPLES);
    *out = power_adc_scale_mv(pin_mv, s_divider, c->gain_ppm);
    return ESP_OK;
}

ivts_err_t board_power_read(uint16_t *vehicle_mv, uint16_t *device_mv)
{
    if (vehicle_mv == NULL || device_mv == NULL) { return IVTS_ERR_INVALID_ARG; }
    esp_err_t e = read_mv(&s_veh, vehicle_mv);
    if (e == ESP_OK) { e = read_mv(&s_dev, device_mv); }
    return board_err(e);
}
