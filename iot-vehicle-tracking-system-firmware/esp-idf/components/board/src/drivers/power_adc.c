#include "board_internal.h"
#include "drivers/drivers.h"
#include "board_calc.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_check.h"
#include "esp_log.h"

#define SAMPLES            8   /* Số mẫu trung bình cho mỗi lần đọc, giảm nhiễu. */

typedef struct {
    adc_channel_t     ch;
    adc_cali_handle_t cali;
    uint32_t          gain_ppm;
} chan_t;

static adc_oneshot_unit_handle_t s_unit;
static chan_t s_veh, s_dev;
static uint32_t s_divider;

static esp_err_t chan_init(int gpio, uint32_t gain_ppm, chan_t *c)
{
    adc_unit_t unit;
    ESP_RETURN_ON_ERROR(adc_oneshot_io_to_channel(gpio, &unit, &c->ch), BOARD_TAG, "io->ch %d", gpio);
    ESP_RETURN_ON_FALSE(unit == ADC_UNIT_1, ESP_ERR_INVALID_ARG, BOARD_TAG, "gpio %d không ở ADC1", gpio);
    adc_oneshot_chan_cfg_t cc = { .atten = ADC_ATTEN_DB_12, .bitwidth = ADC_BITWIDTH_DEFAULT };
    ESP_RETURN_ON_ERROR(adc_oneshot_config_channel(s_unit, c->ch, &cc), BOARD_TAG, "cfg ch");
    adc_cali_curve_fitting_config_t cal = {
        .unit_id = ADC_UNIT_1, .chan = c->ch, .atten = ADC_ATTEN_DB_12, .bitwidth = ADC_BITWIDTH_DEFAULT,
    };
    /* Không có dữ liệu hiệu chuẩn trong eFuse thì curve fitting trả lỗi và init thất bại.
     * Không dùng công thức danh định thay thế: sai số vài trăm mV ở mức 12 V đủ để đổi kết quả
     * so với ngưỡng ignition. */
    ESP_RETURN_ON_ERROR(adc_cali_create_scheme_curve_fitting(&cal, &c->cali), BOARD_TAG, "cali ch%d", (int)c->ch);
    c->gain_ppm = gain_ppm;
    return ESP_OK;
}

/* ADC1 oneshot, hai kênh: nguồn xe và nguồn thiết bị. */
esp_err_t power_adc_init(const power_adc_cfg_t *cfg)
{
    s_divider = cfg->divider;
    adc_oneshot_unit_init_cfg_t uc = { .unit_id = ADC_UNIT_1 };
    ESP_RETURN_ON_ERROR(adc_oneshot_new_unit(&uc, &s_unit), BOARD_TAG, "adc unit");
    ESP_RETURN_ON_ERROR(chan_init(cfg->vehicle_gpio, cfg->vehicle_gain_ppm, &s_veh), BOARD_TAG, "veh");
    ESP_RETURN_ON_ERROR(chan_init(cfg->device_gpio, cfg->device_gain_ppm, &s_dev), BOARD_TAG, "dev");
    return ESP_OK;
}

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
    /* adc_oneshot_read() an toàn đa luồng (tài liệu ADC oneshot, mục Thread Safety): task "board"
     * (lấy mẫu định kỳ) và app (kiểm tra pin trước OTA) cùng gọi hàm này mà không cần khoá thêm. */
    esp_err_t e = read_mv(&s_veh, vehicle_mv);
    if (e == ESP_OK) { e = read_mv(&s_dev, device_mv); }
    return board_err(e);
}
