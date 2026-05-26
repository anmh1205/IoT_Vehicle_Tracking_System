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
 * @brief LIS3DSH I2C driver with motion interrupt setup and acceleration-delta metric.
 *
 * ## Runtime goals
 *    - Detect which accelerometer variant is actually wired on the board.
 *    - Keep motion interrupt setup isolated inside the board-driver layer.
 *    - Report a normalized acceleration-delta metric in `m/s^2` for telemetry.
 *
 * ## Measurement policy
 *    - The published metric is not absolute acceleration magnitude.
 *    - It is the peak inter-sample acceleration delta inside the current publish window.
 *    - A deadzone filters low noise so a parked device does not accumulate false motion.
 */


#define IMU_I2C_PORT I2C_NUM_0
#define IMU_I2C_FREQ_HZ 400000
#define IMU_I2C_FREQ_FALLBACK_HZ 100000
#define LIS3DH_LEGACY_ADDR_PRIMARY 0x18
#define LIS3DH_LEGACY_ADDR_SECONDARY 0x19
#define LIS3DSH_ADDR_PRIMARY 0x1D
#define LIS3DSH_ADDR_SECONDARY 0x1E
#define IMU_WHO_AM_I_REG 0x0F
#define LIS3DH_LEGACY_WHO_AM_I_VALUE 0x33
#define LIS3DSH_WHO_AM_I_VALUE 0x3F
#define IMU_OUT_X_L_REG 0x28
#define LIS3DH_LEGACY_CTRL_REG1 0x20
#define LIS3DH_LEGACY_CTRL_REG2 0x21
#define LIS3DH_LEGACY_CTRL_REG3 0x22
#define LIS3DH_LEGACY_CTRL_REG4 0x23
#define LIS3DH_LEGACY_CTRL_REG5 0x24
#define LIS3DSH_CTRL_REG4 0x20
#define LIS3DSH_CTRL_REG5 0x24
#define IMU_INT1_CFG_REG 0x30
#define IMU_INT1_SRC_REG 0x31
#define IMU_INT1_THS_REG 0x32
#define IMU_INT1_DURATION_REG 0x33
#define IMU_I2C_XFER_TIMEOUT_MS 20U
#define IMU_READ_FAIL_BACKOFF_MS 2000ULL
#define IMU_READ_FAIL_BACKOFF_THRESHOLD 3U
#define IMU_ACCEL_DELTA_DEADZONE_MG 60.0f
#define IMU_MG_TO_MPS2 0.00980665f

static const char *TAG = "IMU_LIS3DSH";

typedef enum {
    IMU_CHIP_LIS3DH_LEGACY = 0,
    IMU_CHIP_LIS3DSH,
} imu_chip_t;

typedef struct {
    uint8_t addr;
    uint8_t who_am_i;
    imu_chip_t chip;
} imu_probe_target_t;

/* I2C bus/device handles owned by this module. */
static i2c_master_bus_handle_t s_bus_handle = NULL;
/* I2C device handle for IMU chip. */
static i2c_master_dev_handle_t s_dev_handle = NULL;
/* True when this module created the bus and is responsible for deleting it. */
static bool s_bus_owned = false;
/* Detected IMU I2C address. */
static uint8_t s_imu_addr = LIS3DSH_ADDR_PRIMARY;
/* Detected IMU chip type. */
static imu_chip_t s_imu_chip = IMU_CHIP_LIS3DSH;
/* Consecutive I2C read failure count. */
static uint32_t s_read_fail_streak = 0;
/* Backoff deadline for I2C read retries. */
static uint64_t s_read_backoff_until_ms = 0;
/* Flag indicating previous sample was valid. */
static bool s_prev_sample_valid = false;
/* Previous X-axis acceleration sample in milli-g. */
static float s_prev_x_mg = 0.0f;
/* Previous Y-axis acceleration sample in milli-g. */
static float s_prev_y_mg = 0.0f;
/* Previous Z-axis acceleration sample in milli-g. */
static float s_prev_z_mg = 0.0f;
/* Peak acceleration delta captured since the last rawdata publish. */
static float s_accel_delta_window_peak_mps2 = 0.0f;

/**
 * @brief Check whether the detected accelerometer is the LIS3DSH variant.
 *
 * @return true when the active device uses the LIS3DSH register map.
 */
static bool imu_is_lis3dsh(void) {
    return s_imu_chip == IMU_CHIP_LIS3DSH;
}

/**
 * @brief Get detected chip name.
 *
 * @return String name.
 */
static const char *imu_detected_chip_name(void) {
    return imu_is_lis3dsh() ? "lis3dsh" : "lis3dh-legacy";
}

/**
 * @brief Write one IMU register.
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
 * @brief Read one IMU register.
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
 * @brief Read consecutive IMU registers.
 *
 * @param reg Start register address.
 * @param data Output byte buffer.
 * @param len Number of bytes to read.
 *
 * @return ESP_OK on success, otherwise I2C error.
 */
static esp_err_t imu_read_regs(uint8_t reg, uint8_t *data, size_t len) {
    ESP_RETURN_ON_NULL(data, ESP_ERR_INVALID_ARG, TAG, "data is NULL");
    /*
     * LIS3DH uses SUB[7] to enable address auto-increment on multi-byte reads.
     * LIS3DSH uses CTRL_REG6.ADD_INC instead, so the register address must stay
     * unchanged on I2C burst reads.
     */
    uint8_t read_reg = imu_is_lis3dsh() ? reg : (uint8_t)(reg | 0x80);
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
 * @brief Attach IMU device handle, then verify WHO_AM_I register.
 *
 * @param device_addr Candidate IMU I2C address.
 * @param scl_speed_hz Per-device SCL frequency to use for transfers.
 * @param out_who_am_i Output WHO_AM_I value.
 *
 * @param expected_who_am_i Expected device ID for the candidate sensor.
 *
 * @return ESP_OK when handle is bound and WHO_AM_I matches expected value.
 */
static esp_err_t imu_try_bind_device(uint8_t device_addr,
                                     uint32_t scl_speed_hz,
                                     uint8_t expected_who_am_i,
                                     uint8_t *out_who_am_i) {
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
    err = imu_read_reg(IMU_WHO_AM_I_REG, &who_am_i);
    if (err != ESP_OK || who_am_i != expected_who_am_i) {
        i2c_master_bus_rm_device(s_dev_handle);
        s_dev_handle = NULL;
        return err != ESP_OK ? err : ESP_ERR_NOT_FOUND;
    }

    *out_who_am_i = who_am_i;
    return ESP_OK;
}

/**
 * @brief Initialize IMU bus/device and default runtime registers.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t imu_init(void) {
    esp_err_t err = ESP_OK;

    if (s_dev_handle != NULL) {
        return ESP_OK;
    }

    // Start with the preferred synchronous I2C profile; later code will reuse an existing bus when possible.
    i2c_master_bus_config_t bus_cfg = {
        .i2c_port = IMU_I2C_PORT,
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
    esp_err_t bus_err = i2c_master_get_bus_handle(IMU_I2C_PORT, &s_bus_handle);
    if (bus_err == ESP_OK) {
        bus_reused = true;
        ESP_LOGI(TAG, "Reusing shared I2C bus port=%d", (int)IMU_I2C_PORT);
    } else {
        bus_err = i2c_new_master_bus(&bus_cfg, &s_bus_handle);
    }

    if (bus_err == ESP_ERR_INVALID_STATE) {
        /* Resolve races where another module acquires the bus between checks. */
        bus_err = i2c_master_get_bus_handle(IMU_I2C_PORT, &s_bus_handle);
        if (bus_err == ESP_OK) {
            bus_reused = true;
            ESP_LOGI(TAG, "Reusing shared I2C bus port=%d", (int)IMU_I2C_PORT);
        }
    }
    if (bus_err == ESP_OK) {
        s_bus_owned = !bus_reused;
    }
    ESP_GOTO_ON_ERROR(bus_err, fail, TAG, "I2C bus setup failed");

    // Probe the known LIS3DH/LIS3DSH address set and keep every positive candidate for WHO_AM_I validation.
    static const imu_probe_target_t s_probe_targets[] = {
        {.addr = LIS3DH_LEGACY_ADDR_PRIMARY, .who_am_i = LIS3DH_LEGACY_WHO_AM_I_VALUE, .chip = IMU_CHIP_LIS3DH_LEGACY},
        {.addr = LIS3DH_LEGACY_ADDR_SECONDARY, .who_am_i = LIS3DH_LEGACY_WHO_AM_I_VALUE, .chip = IMU_CHIP_LIS3DH_LEGACY},
        {.addr = LIS3DSH_ADDR_PRIMARY, .who_am_i = LIS3DSH_WHO_AM_I_VALUE, .chip = IMU_CHIP_LIS3DSH},
        {.addr = LIS3DSH_ADDR_SECONDARY, .who_am_i = LIS3DSH_WHO_AM_I_VALUE, .chip = IMU_CHIP_LIS3DSH},
    };
    imu_probe_target_t candidate_targets[ARRAY_SIZE(s_probe_targets)] = {0};
    size_t candidate_count = 0;

    for (size_t i = 0; i < ARRAY_SIZE(s_probe_targets); ++i) {
        esp_err_t probe_err = i2c_master_probe(s_bus_handle, s_probe_targets[i].addr, IMU_I2C_XFER_TIMEOUT_MS);
        if (probe_err == ESP_OK) {
            candidate_targets[candidate_count++] = s_probe_targets[i];
            continue;
        }
        ESP_LOGW(TAG,
                 "IMU probe addr=0x%02X failed err=%s",
                 s_probe_targets[i].addr,
                 esp_err_to_name(probe_err));
    }

    if (candidate_count == 0U) {
        /* Keep fallback WHO_AM_I checks even if probe fails due transient bus timing. */
        memcpy(candidate_targets, s_probe_targets, sizeof(s_probe_targets));
        candidate_count = ARRAY_SIZE(s_probe_targets);
        ESP_LOGW(TAG, "IMU probe found no address, falling back to WHO_AM_I scan");
    }

    // Retry the WHO_AM_I sweep at a fallback bus speed because some boards only answer reliably on the slower profile.
    static const uint32_t s_probe_speeds_hz[] = {
        IMU_I2C_FREQ_HZ,
        IMU_I2C_FREQ_FALLBACK_HZ,
    };

    uint8_t who_am_i = 0;
    uint32_t active_speed_hz = 0;
    bool imu_ready = false;
    for (size_t speed_idx = 0; speed_idx < (sizeof(s_probe_speeds_hz) / sizeof(s_probe_speeds_hz[0])); ++speed_idx) {
        uint32_t speed_hz = s_probe_speeds_hz[speed_idx];
        for (size_t target_idx = 0; target_idx < candidate_count; ++target_idx) {
            // Bind the device only after both address and WHO_AM_I match the expected chip profile.
            imu_probe_target_t target = candidate_targets[target_idx];
            err = imu_try_bind_device(target.addr, speed_hz, target.who_am_i, &who_am_i);
            if (err == ESP_OK) {
                s_imu_addr = target.addr;
                s_imu_chip = target.chip;
                active_speed_hz = speed_hz;
                imu_ready = true;
                break;
            }
            ESP_LOGW(TAG,
                     "IMU WHO_AM_I failed chip=%s addr=0x%02X speed=%lu err=%s",
                     target.chip == IMU_CHIP_LIS3DSH ? "lis3dsh" : "lis3dh-legacy",
                     target.addr,
                     (unsigned long)speed_hz,
                     esp_err_to_name(err));
        }
        if (imu_ready) {
            break;
        }
    }

    ESP_GOTO_ON_FALSE(imu_ready, fail, TAG, "WHO_AM_I read failed for all address/speed candidates");

    // Once the chip is known, write the correct register map for that silicon so later motion reads are trustworthy.
    if (imu_is_lis3dsh()) {
        /*
         * LIS3DSH control register addresses differ from LIS3DH.
         * Use CTRL_REG4 (0x20) for ODR/BDU/axis enable and CTRL_REG5 (0x24)
         * for the full-scale/bandwidth bank. Writing the LIS3DH map here left
         * the output registers pinned and the acceleration delta stayed at zero.
         */
        ESP_GOTO_ON_ERROR(imu_write_reg(LIS3DSH_CTRL_REG4, 0x6F), fail, TAG, "LIS3DSH CTRL_REG4 write failed");
        ESP_GOTO_ON_ERROR(imu_write_reg(LIS3DSH_CTRL_REG5, 0x00), fail, TAG, "LIS3DSH CTRL_REG5 write failed");
    } else {
        /* 10 Hz, XYZ enabled; combine with high-resolution mode for stable delta sampling. */
        ESP_GOTO_ON_ERROR(imu_write_reg(LIS3DH_LEGACY_CTRL_REG1, 0x27), fail, TAG, "CTRL_REG1 write failed");
        /* BDU=1, high-resolution enabled, full-scale +/-2g. */
        ESP_GOTO_ON_ERROR(imu_write_reg(LIS3DH_LEGACY_CTRL_REG4, 0x88), fail, TAG, "CTRL_REG4 write failed");
        ESP_GOTO_ON_ERROR(imu_write_reg(LIS3DH_LEGACY_CTRL_REG5, 0x00), fail, TAG, "CTRL_REG5 write failed");
    }

    /* Configure interrupt GPIO as input. */
    // Motion wake uses the dedicated INT line later, so the GPIO mode is prepared during init rather than at sleep time.
    gpio_config_t int_cfg = {
        .pin_bit_mask = 1ULL << PIN_LIS3DSH_INT,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    ESP_GOTO_ON_ERROR(gpio_config(&int_cfg), fail, TAG, "INT GPIO config failed");

    ESP_LOGI(TAG,
             "IMU initialized chip=%s addr=0x%02X who_am_i=0x%02X speed=%luHz",
             imu_detected_chip_name(),
             s_imu_addr,
             who_am_i,
             (unsigned long)active_speed_hz);
    s_read_fail_streak = 0;
    s_read_backoff_until_ms = 0;
    return ESP_OK;

fail:
    // A partially initialized bus/device is torn down here so the next retry starts from a clean hardware state.
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

    /* LIS3DH threshold unit ~16mg/LSB in +/-2g mode. */
    uint8_t threshold = (uint8_t)util_clamp_int((int)((threshold_mg + 15U) / 16U), 1, 127);
    /* Duration LSB ~= 100ms at 10 Hz ODR. */
    uint8_t duration = (uint8_t)util_clamp_int((int)((duration_ms + 99U) / 100U), 0, 127);

    if (imu_is_lis3dsh()) {
        /*
         * LIS3DSH uses a different register map than LIS3DH for interrupt config.
         * CTRL_REG3 (0x23): INT1_EN=1, IEA=1 (active-high), IEL=0 (latched)
         * INT1_CFG/THS/DURATION registers (0x30-0x33) are shared with LIS3DH.
         * Threshold unit for LIS3DSH at FS=+/-2g: 1 LSB = 16mg (same as LIS3DH).
         */
        /* CTRL_REG3: enable INT1, active-high output */
        ESP_RETURN_ON_FALSE(imu_write_reg(0x23, 0x48) == ESP_OK, ESP_FAIL, TAG, "LIS3DSH CTRL_REG3 write failed");
        /* Ensure CTRL_REG5 full-scale stays at +/-2g for consistent threshold scaling */
        ESP_RETURN_ON_FALSE(imu_write_reg(LIS3DSH_CTRL_REG5, 0x00) == ESP_OK, ESP_FAIL, TAG, "LIS3DSH CTRL_REG5 write failed");
    } else {
        /* Keep runtime ODR aligned with the interrupt generator configuration. */
        ESP_RETURN_ON_FALSE(imu_write_reg(LIS3DH_LEGACY_CTRL_REG1, 0x27) == ESP_OK, ESP_FAIL, TAG, "CTRL_REG1 write failed");
        /* Enable high-pass filtering on interrupt 1 to reject static gravity. */
        ESP_RETURN_ON_FALSE(imu_write_reg(LIS3DH_LEGACY_CTRL_REG2, 0x01) == ESP_OK, ESP_FAIL, TAG, "CTRL_REG2 write failed");
        /* Route IA1 interrupt generator to INT1 pin. */
        ESP_RETURN_ON_FALSE(imu_write_reg(LIS3DH_LEGACY_CTRL_REG3, 0x40) == ESP_OK, ESP_FAIL, TAG, "CTRL_REG3 write failed");
        ESP_RETURN_ON_FALSE(imu_write_reg(LIS3DH_LEGACY_CTRL_REG4, 0x88) == ESP_OK, ESP_FAIL, TAG, "CTRL_REG4 write failed");
        ESP_RETURN_ON_FALSE(imu_write_reg(LIS3DH_LEGACY_CTRL_REG5, 0x00) == ESP_OK, ESP_FAIL, TAG, "CTRL_REG5 write failed");
    }
    ESP_RETURN_ON_FALSE(imu_write_reg(IMU_INT1_CFG_REG, 0x2A) == ESP_OK, ESP_FAIL, TAG, "INT1_CFG write failed");
    ESP_RETURN_ON_FALSE(imu_write_reg(IMU_INT1_THS_REG, threshold) == ESP_OK, ESP_FAIL, TAG, "INT1_THS write failed");
    ESP_RETURN_ON_FALSE(imu_write_reg(IMU_INT1_DURATION_REG, duration) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "INT1_DURATION write failed");

    return ESP_OK;
}

/**
 * @brief Clear motion interrupt flag.
 *
 * @return ESP_OK on success.
 */
esp_err_t imu_clear_motion_interrupt(void) {
    ESP_RETURN_ON_NULL(s_dev_handle, ESP_ERR_INVALID_STATE, TAG, "IMU not initialized");

    uint8_t src = 0;
    return imu_read_reg(IMU_INT1_SRC_REG, &src);
}

/**
 * @brief Check motion interrupt status.
 *
 * Reads the active INT pin chosen by the board mapping. The driver uses the
 * hardware interrupt line only for wake decisions; the cloud-facing vibration
 * signal comes from the acceleration-delta metric path instead.
 *
 * @return true if motion interrupt line is asserted.
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
    ESP_RETURN_ON_FALSE(imu_read_regs(IMU_OUT_X_L_REG, raw, sizeof(raw)) == ESP_OK,
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
 * @brief Compute peak acceleration delta for the current publish window.
 *
 * @return Peak acceleration delta in m/s^2.
 */
float imu_get_peak_accel_delta_mps2(void) {
    uint64_t now_ms = util_uptime_ms();
    if (s_read_backoff_until_ms != 0 && now_ms < s_read_backoff_until_ms) {
        s_prev_sample_valid = false;
        return s_accel_delta_window_peak_mps2;
    }

    int16_t x = 0;
    int16_t y = 0;
    int16_t z = 0;

    if (imu_read_accel(&x, &y, &z) != ESP_OK) {
        s_prev_sample_valid = false;
        s_read_fail_streak += 1U;
        if (s_read_fail_streak >= IMU_READ_FAIL_BACKOFF_THRESHOLD) {
            s_read_backoff_until_ms = now_ms + IMU_READ_FAIL_BACKOFF_MS;
            ESP_LOGW(TAG,
                     "IMU read fail streak=%lu, apply backoff=%llums",
                     (unsigned long)s_read_fail_streak,
                     (unsigned long long)IMU_READ_FAIL_BACKOFF_MS);
            s_read_fail_streak = 0;
        }
        return s_accel_delta_window_peak_mps2;
    }

    s_read_fail_streak = 0;
    s_read_backoff_until_ms = 0;

    /*
     * Convert raw counts to mg.
     * LIS3DH (12-bit left-justified in 16-bit, FS=+/-2g): 1 mg/LSB after >>4, so raw/16.
     * LIS3DSH (16-bit, FS=+/-2g): 0.06 mg/LSB per datasheet.
     */
    float scale = imu_is_lis3dsh() ? 0.06f : (1.0f / 16.0f);
    float x_mg = (float)x * scale;
    float y_mg = (float)y * scale;
    float z_mg = (float)z * scale;

    if (!s_prev_sample_valid) {
        s_prev_x_mg = x_mg;
        s_prev_y_mg = y_mg;
        s_prev_z_mg = z_mg;
        s_prev_sample_valid = true;
        return s_accel_delta_window_peak_mps2;
    }

    /*
     * Use acceleration delta instead of absolute magnitude so static gravity,
     * sensor offset, and mounting bias do not pin the score at rest.
     */
    float dx_mg = x_mg - s_prev_x_mg;
    float dy_mg = y_mg - s_prev_y_mg;
    float dz_mg = z_mg - s_prev_z_mg;
    s_prev_x_mg = x_mg;
    s_prev_y_mg = y_mg;
    s_prev_z_mg = z_mg;

    float delta_mg = sqrtf((dx_mg * dx_mg) + (dy_mg * dy_mg) + (dz_mg * dz_mg));
    if (delta_mg <= IMU_ACCEL_DELTA_DEADZONE_MG) {
        return s_accel_delta_window_peak_mps2;
    }

    float accel_delta_mps2 = delta_mg * IMU_MG_TO_MPS2;
    if (accel_delta_mps2 > s_accel_delta_window_peak_mps2) {
        s_accel_delta_window_peak_mps2 = accel_delta_mps2;
    }
    return s_accel_delta_window_peak_mps2;
}

/**
 * @brief Reset the publish-window acceleration delta accumulator.
 *
 * The publish pipeline calls this after a successful rawdata publish so the
 * next window reports fresh movement intensity in `m/s^2`.
 */
void imu_reset_accel_delta_window(void) {
    // Reset the acceleration-delta window here so a new motion sample starts from a clean baseline.
    s_accel_delta_window_peak_mps2 = 0.0f;
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
    s_imu_chip = IMU_CHIP_LIS3DSH;
    s_read_fail_streak = 0;
    s_read_backoff_until_ms = 0;
    s_prev_sample_valid = false;
    s_prev_x_mg = 0.0f;
    s_prev_y_mg = 0.0f;
    s_prev_z_mg = 0.0f;
    s_accel_delta_window_peak_mps2 = 0.0f;
}

