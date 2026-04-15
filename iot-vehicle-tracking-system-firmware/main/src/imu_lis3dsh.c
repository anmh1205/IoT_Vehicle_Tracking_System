#include "imu_lis3dsh.h"

#include <math.h>
#include <string.h>

#include "driver/gpio.h"
#include "driver/i2c_master.h"

#include "esp_log.h"

#include "pin_map.h"
#include "util.h"

/**
 * @file imu_lis3dsh.c
 * @brief LIS3DSH I2C driver with motion interrupt setup and vibration metric.
 */

#define LIS3DSH_I2C_PORT I2C_NUM_0
#define LIS3DSH_I2C_FREQ_HZ 400000
#define LIS3DSH_I2C_FREQ_FALLBACK_HZ 100000
#define LIS3DSH_ADDR_PRIMARY 0x1D
#define LIS3DSH_ADDR_SECONDARY 0x1E
#define LIS3DSH_WHO_AM_I_REG 0x0F
#define LIS3DSH_OUT_X_L 0x28
#define LIS3DSH_CTRL_REG4 0x20
#define LIS3DSH_CTRL_REG1 0x21
#define LIS3DSH_CTRL_REG2 0x22
#define LIS3DSH_CTRL_REG3 0x23
#define LIS3DSH_CTRL_REG5 0x24
#define LIS3DSH_INT1_CFG 0x30
#define LIS3DSH_INT1_THS 0x32
#define LIS3DSH_INT1_DURATION 0x33
#define IMU_I2C_XFER_TIMEOUT_MS 20U
#define IMU_READ_FAIL_BACKOFF_MS 2000ULL
#define IMU_READ_FAIL_BACKOFF_THRESHOLD 3U

static const char *TAG = "IMU_LIS3DSH";

/* I2C bus/device handles owned by this module. */
static i2c_master_bus_handle_t s_bus_handle = NULL;
static i2c_master_dev_handle_t s_dev_handle = NULL;
/* True when this module created the bus and is responsible for deleting it. */
static bool s_bus_owned = false;
/* Detected LIS3DSH I2C address (0x1D or 0x1E). */
static uint8_t s_lis3dsh_addr = LIS3DSH_ADDR_PRIMARY;
static uint32_t s_read_fail_streak = 0;
static uint64_t s_read_backoff_until_ms = 0;

/**
 * @brief Write one LIS3DSH register.
 *
 * @param reg Register address.
 * @param value Register value.
 *
 * @return ESP_OK on success, otherwise I2C error.
 */
static esp_err_t imu_write_reg(uint8_t reg, uint8_t value) {
    uint8_t payload[2] = {reg, value};
    return i2c_master_transmit(s_dev_handle,
                               payload,
                               sizeof(payload),
                               IMU_I2C_XFER_TIMEOUT_MS);
}

/**
 * @brief Read one LIS3DSH register.
 *
 * @param reg Register address.
 * @param value Output value pointer.
 *
 * @return ESP_OK on success, otherwise I2C error.
 */
static esp_err_t imu_read_reg(uint8_t reg, uint8_t *value) {
    ESP_RETURN_ON_NULL(value, ESP_ERR_INVALID_ARG, TAG, "value is NULL");
    esp_err_t err = i2c_master_transmit_receive(s_dev_handle,
                                                &reg,
                                                1,
                                                value,
                                                1,
                                                IMU_I2C_XFER_TIMEOUT_MS);
    if (err == ESP_OK || err != ESP_ERR_INVALID_STATE) {
        return err;
    }

    ESP_LOGW(TAG, "imu_read_reg fallback split-xfer reg=0x%02X err=%s", reg, esp_err_to_name(err));
    if (s_bus_handle != NULL) {
        (void)i2c_master_bus_reset(s_bus_handle);
    }

    err = i2c_master_transmit(s_dev_handle, &reg, 1, IMU_I2C_XFER_TIMEOUT_MS);
    if (err != ESP_OK) {
        return err;
    }
    return i2c_master_receive(s_dev_handle, value, 1, IMU_I2C_XFER_TIMEOUT_MS);
}

/**
 * @brief Read consecutive LIS3DSH registers.
 *
 * @param reg Start register address.
 * @param data Output byte buffer.
 * @param len Number of bytes to read.
 *
 * @return ESP_OK on success, otherwise I2C error.
 */
static esp_err_t imu_read_regs(uint8_t reg, uint8_t *data, size_t len) {
    ESP_RETURN_ON_NULL(data, ESP_ERR_INVALID_ARG, TAG, "data is NULL");
    /* Set auto-increment bit for multi-byte reads. */
    uint8_t read_reg = reg | 0x80;
    esp_err_t err = i2c_master_transmit_receive(s_dev_handle,
                                                &read_reg,
                                                1,
                                                data,
                                                len,
                                                IMU_I2C_XFER_TIMEOUT_MS);
    if (err == ESP_OK || err != ESP_ERR_INVALID_STATE) {
        return err;
    }

    ESP_LOGW(TAG, "imu_read_regs fallback split-xfer reg=0x%02X len=%u err=%s",
             read_reg,
             (unsigned)len,
             esp_err_to_name(err));
    if (s_bus_handle != NULL) {
        (void)i2c_master_bus_reset(s_bus_handle);
    }

    err = i2c_master_transmit(s_dev_handle, &read_reg, 1, IMU_I2C_XFER_TIMEOUT_MS);
    if (err != ESP_OK) {
        return err;
    }
    return i2c_master_receive(s_dev_handle, data, len, IMU_I2C_XFER_TIMEOUT_MS);
}

/**
 * @brief Attach LIS3DSH device handle, then verify WHO_AM_I register.
 *
 * @param device_addr Candidate LIS3DSH I2C address.
 * @param scl_speed_hz Per-device SCL frequency to use for transfers.
 * @param out_who_am_i Output WHO_AM_I value.
 *
 * @return ESP_OK when handle is bound and WHO_AM_I matches expected value.
 */
static esp_err_t imu_try_bind_device(uint8_t device_addr, uint32_t scl_speed_hz, uint8_t *out_who_am_i) {
    ESP_RETURN_ON_NULL(out_who_am_i, ESP_ERR_INVALID_ARG, TAG, "out_who_am_i is NULL");

    i2c_device_config_t dev_cfg = {
        .dev_addr_length = I2C_ADDR_BIT_LEN_7,
        .device_address = device_addr,
        .scl_speed_hz = scl_speed_hz,
    };

    esp_err_t err = i2c_master_bus_add_device(s_bus_handle, &dev_cfg, &s_dev_handle);
    if (err != ESP_OK) {
        return err;
    }

    uint8_t who_am_i = 0;
    err = imu_read_reg(LIS3DSH_WHO_AM_I_REG, &who_am_i);
    if (err != ESP_OK || who_am_i != 0x3F) {
        i2c_master_bus_rm_device(s_dev_handle);
        s_dev_handle = NULL;
        return err != ESP_OK ? err : ESP_ERR_NOT_FOUND;
    }

    *out_who_am_i = who_am_i;
    return ESP_OK;
}

/**
 * @brief Initialize LIS3DSH bus/device and default runtime registers.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t imu_init(void) {
    esp_err_t err = ESP_OK;

    if (s_dev_handle != NULL) {
        return ESP_OK;
    }

    i2c_master_bus_config_t bus_cfg = {
        .i2c_port = LIS3DSH_I2C_PORT,
        .sda_io_num = PIN_LIS3DSH_SDA,
        .scl_io_num = PIN_LIS3DSH_SCL,
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .glitch_ignore_cnt = 7,
        .intr_priority = 0,
        /* Use synchronous transfers to avoid async driver edge cases on boot. */
        .trans_queue_depth = 0,
        .flags.enable_internal_pullup = true,
    };

    bool bus_reused = false;
    esp_err_t bus_err = i2c_master_get_bus_handle(LIS3DSH_I2C_PORT, &s_bus_handle);
    if (bus_err == ESP_OK) {
        bus_reused = true;
        ESP_LOGI(TAG, "Reusing shared I2C bus port=%d", (int)LIS3DSH_I2C_PORT);
    } else {
        bus_err = i2c_new_master_bus(&bus_cfg, &s_bus_handle);
    }

    if (bus_err == ESP_ERR_INVALID_STATE) {
        /* Resolve races where another module acquires the bus between checks. */
        bus_err = i2c_master_get_bus_handle(LIS3DSH_I2C_PORT, &s_bus_handle);
        if (bus_err == ESP_OK) {
            bus_reused = true;
            ESP_LOGI(TAG, "Reusing shared I2C bus port=%d", (int)LIS3DSH_I2C_PORT);
        }
    }
    if (bus_err == ESP_OK) {
        s_bus_owned = !bus_reused;
    }
    ESP_GOTO_ON_ERROR(bus_err, fail, TAG, "I2C bus setup failed");

    uint8_t candidate_addrs[2] = {0};
    size_t candidate_count = 0;

    esp_err_t primary_probe_err = i2c_master_probe(s_bus_handle, LIS3DSH_ADDR_PRIMARY, IMU_I2C_XFER_TIMEOUT_MS);
    if (primary_probe_err == ESP_OK) {
        candidate_addrs[candidate_count++] = LIS3DSH_ADDR_PRIMARY;
    } else {
        ESP_LOGW(TAG,
                 "IMU probe addr=0x%02X failed err=%s",
                 LIS3DSH_ADDR_PRIMARY,
                 esp_err_to_name(primary_probe_err));
    }

    esp_err_t secondary_probe_err = i2c_master_probe(s_bus_handle, LIS3DSH_ADDR_SECONDARY, IMU_I2C_XFER_TIMEOUT_MS);
    if (secondary_probe_err == ESP_OK) {
        candidate_addrs[candidate_count++] = LIS3DSH_ADDR_SECONDARY;
    } else {
        ESP_LOGW(TAG,
                 "IMU probe addr=0x%02X failed err=%s",
                 LIS3DSH_ADDR_SECONDARY,
                 esp_err_to_name(secondary_probe_err));
    }

    if (candidate_count == 0U) {
        /* Keep fallback WHO_AM_I checks even if probe fails due transient bus timing. */
        candidate_addrs[0] = LIS3DSH_ADDR_PRIMARY;
        candidate_addrs[1] = LIS3DSH_ADDR_SECONDARY;
        candidate_count = 2U;
        ESP_LOGW(TAG, "IMU probe found no address, falling back to WHO_AM_I scan");
    }

    static const uint32_t s_probe_speeds_hz[] = {
        LIS3DSH_I2C_FREQ_HZ,
        LIS3DSH_I2C_FREQ_FALLBACK_HZ,
    };

    uint8_t who_am_i = 0;
    uint32_t active_speed_hz = 0;
    bool imu_ready = false;
    for (size_t speed_idx = 0; speed_idx < (sizeof(s_probe_speeds_hz) / sizeof(s_probe_speeds_hz[0])); ++speed_idx) {
        uint32_t speed_hz = s_probe_speeds_hz[speed_idx];
        for (size_t addr_idx = 0; addr_idx < candidate_count; ++addr_idx) {
            uint8_t addr = candidate_addrs[addr_idx];
            err = imu_try_bind_device(addr, speed_hz, &who_am_i);
            if (err == ESP_OK) {
                s_lis3dsh_addr = addr;
                active_speed_hz = speed_hz;
                imu_ready = true;
                break;
            }
            ESP_LOGW(TAG,
                     "IMU WHO_AM_I failed addr=0x%02X speed=%lu err=%s",
                     addr,
                     (unsigned long)speed_hz,
                     esp_err_to_name(err));
        }
        if (imu_ready) {
            break;
        }
    }

    ESP_GOTO_ON_FALSE(imu_ready, fail, TAG, "WHO_AM_I read failed for all address/speed candidates");

    /* ODR=12.5Hz, BDU=1, XYZ enabled. */
    ESP_GOTO_ON_ERROR(imu_write_reg(LIS3DSH_CTRL_REG4, 0x3F), fail, TAG, "CTRL_REG4 write failed");
    /* BW=800Hz, full-scale +/-2g, self-test off. */
    ESP_GOTO_ON_ERROR(imu_write_reg(LIS3DSH_CTRL_REG5, 0x00), fail, TAG, "CTRL_REG5 write failed");

    /* Configure interrupt GPIO as input. */
    gpio_config_t int_cfg = {
        .pin_bit_mask = 1ULL << PIN_LIS3DSH_INT,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    ESP_GOTO_ON_ERROR(gpio_config(&int_cfg), fail, TAG, "INT GPIO config failed");

    ESP_LOGI(TAG,
             "LIS3DSH initialized addr=0x%02X who_am_i=0x%02X speed=%luHz",
             s_lis3dsh_addr,
             who_am_i,
             (unsigned long)active_speed_hz);
    s_read_fail_streak = 0;
    s_read_backoff_until_ms = 0;
    return ESP_OK;

fail:
    imu_deinit();
    return err;
}

/**
 * @brief Configure hardware motion interrupt for wakeup detection.
 *
 * @param threshold_mg Motion threshold in milli-g.
 * @param duration_ms Motion duration in milliseconds.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t imu_configure_motion_interrupt(uint8_t threshold_mg, uint8_t duration_ms) {
    ESP_RETURN_ON_NULL(s_dev_handle, ESP_ERR_INVALID_STATE, TAG, "IMU not initialized");

    /* LIS3DSH threshold unit ~16mg/LSB in +/-2g mode. */
    uint8_t threshold = (uint8_t)util_clamp_int((int)((threshold_mg + 15U) / 16U), 1, 127);
    /* Duration unit depends on ODR; this keeps approximation simple. */
    uint8_t duration = (uint8_t)util_clamp_int((int)(duration_ms / 100U), 0, 127);

    ESP_RETURN_ON_FALSE(imu_write_reg(LIS3DSH_CTRL_REG2, 0x01) == ESP_OK, ESP_FAIL, TAG, "CTRL_REG2 write failed");
    ESP_RETURN_ON_FALSE(imu_write_reg(LIS3DSH_CTRL_REG3, 0x40) == ESP_OK, ESP_FAIL, TAG, "CTRL_REG3 write failed");
    ESP_RETURN_ON_FALSE(imu_write_reg(LIS3DSH_CTRL_REG5, 0x00) == ESP_OK, ESP_FAIL, TAG, "CTRL_REG5 write failed");
    ESP_RETURN_ON_FALSE(imu_write_reg(LIS3DSH_INT1_CFG, 0x2A) == ESP_OK, ESP_FAIL, TAG, "INT1_CFG write failed");
    ESP_RETURN_ON_FALSE(imu_write_reg(LIS3DSH_INT1_THS, threshold) == ESP_OK, ESP_FAIL, TAG, "INT1_THS write failed");
    ESP_RETURN_ON_FALSE(imu_write_reg(LIS3DSH_INT1_DURATION, duration) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "INT1_DURATION write failed");

    return ESP_OK;
}

/**
 * @brief Read digital state of motion interrupt pin.
 *
 * @return true when interrupt line is high.
 */
bool imu_motion_detected(void) {
    return gpio_get_level(PIN_LIS3DSH_INT) == 1;
}

/**
 * @brief Read raw acceleration for X/Y/Z axes.
 *
 * @param x Output X raw.
 * @param y Output Y raw.
 * @param z Output Z raw.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t imu_read_accel(int16_t *x, int16_t *y, int16_t *z) {
    ESP_RETURN_ON_NULL(s_dev_handle, ESP_ERR_INVALID_STATE, TAG, "IMU not initialized");
    ESP_RETURN_ON_NULL(x, ESP_ERR_INVALID_ARG, TAG, "x is NULL");
    ESP_RETURN_ON_NULL(y, ESP_ERR_INVALID_ARG, TAG, "y is NULL");
    ESP_RETURN_ON_NULL(z, ESP_ERR_INVALID_ARG, TAG, "z is NULL");

    uint8_t raw[6] = {0};
    ESP_RETURN_ON_FALSE(imu_read_regs(LIS3DSH_OUT_X_L, raw, sizeof(raw)) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "Accel read failed");

    /* Convert little-endian register bytes into signed 16-bit values. */
    *x = (int16_t)((raw[1] << 8) | raw[0]);
    *y = (int16_t)((raw[3] << 8) | raw[2]);
    *z = (int16_t)((raw[5] << 8) | raw[4]);
    return ESP_OK;
}

/**
 * @brief Compute normalized vibration score from acceleration magnitude.
 *
 * @return Score from 0..1000.
 */
uint16_t imu_get_vibration_composite(void) {
    uint64_t now_ms = util_uptime_ms();
    if (s_read_backoff_until_ms != 0 && now_ms < s_read_backoff_until_ms) {
        return 0;
    }

    int16_t x = 0;
    int16_t y = 0;
    int16_t z = 0;

    if (imu_read_accel(&x, &y, &z) != ESP_OK) {
        s_read_fail_streak += 1U;
        if (s_read_fail_streak >= IMU_READ_FAIL_BACKOFF_THRESHOLD) {
            s_read_backoff_until_ms = now_ms + IMU_READ_FAIL_BACKOFF_MS;
            ESP_LOGW(TAG,
                     "IMU read fail streak=%lu, apply backoff=%llums",
                     (unsigned long)s_read_fail_streak,
                     (unsigned long long)IMU_READ_FAIL_BACKOFF_MS);
            s_read_fail_streak = 0;
        }
        return 0;
    }

    s_read_fail_streak = 0;
    s_read_backoff_until_ms = 0;

    /* Convert raw high-resolution counts to mg approximation. */
    float x_mg = x / 16.0f;
    float y_mg = y / 16.0f;
    float z_mg = z / 16.0f;

    /* Compute 3D magnitude and subtract 1g static gravity baseline. */
    float magnitude = sqrtf((x_mg * x_mg) + (y_mg * y_mg) + (z_mg * z_mg));
    float vibration = magnitude - 1000.0f;
    if (vibration < 0.0f) {
        vibration = 0.0f;
    }

    /* Scale to 0..1000 score for payload compactness. */
    int scaled = (int)((vibration / 2000.0f) * 1000.0f);
    return (uint16_t)util_clamp_int(scaled, 0, 1000);
}

/**
 * @brief Deinitialize IMU I2C resources.
 */
void imu_deinit(void) {
    if (s_dev_handle != NULL) {
        i2c_master_bus_rm_device(s_dev_handle);
        s_dev_handle = NULL;
    }

    if (s_bus_handle != NULL && s_bus_owned) {
        i2c_del_master_bus(s_bus_handle);
    }
    s_bus_handle = NULL;
    s_bus_owned = false;
    s_read_fail_streak = 0;
    s_read_backoff_until_ms = 0;
}
