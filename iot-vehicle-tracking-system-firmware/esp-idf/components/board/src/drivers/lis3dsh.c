/**
 * @file src/drivers/lis3dsh.c
 * @brief LIS3DSH motion detection using the SM1 interrupt state machine.
 *
 * SM1 waits for a masked axis to cross THRS1, asserts INT1 and returns to its waiting state.
 * Register and instruction encodings follow DocID022405 and AN3393. Board startup programs the sensor.
 * The ISR notifies the board task. That task acknowledges INT1 and owns the sample baseline.
 * The sleep adapter reads the INT1 level. Register access uses the board I2C mutex.
 */
#include "board_internal.h"
#include "platform/platform.h"
#include "drivers/drivers.h"
#include "drivers/drivers_calc.h"
#include <string.h>
#include "driver/gpio.h"
#include "esp_check.h"
#include "platform/log.h"

#define LIS_WHO_AM_I    0x0F   /**< Chip identification register. */
#define LIS_ID          0x3F   /**< Expected LIS3DSH identification byte. */
#define LIS_CTRL4       0x20   /**< Output data rate, block data update and axis enables. */
#define LIS_CTRL1       0x21   /**< SM1 hysteresis, interrupt routing and enable. */
#define LIS_CTRL3       0x23   /**< Interrupt polarity, latching and output enable. */
#define LIS_CTRL5       0x24   /**< Full-scale selection. Zero selects ±2 g. */
#define LIS_CTRL6       0x25   /**< Bit 4 enables sequential register reads. */
#define LIS_OUT_X_L     0x28   /**< First byte of the six output registers for X, Y and Z. */
#define LIS_ST1_1       0x40   /**< First SM1 instruction register. */
#define LIS_ST1_2       0x41   /**< Second SM1 instruction register. */
#define LIS_THRS1_1     0x57   /**< Threshold used by the SM1 comparison. */
#define LIS_MASK1_B     0x59   /**< Direction mask B for SM1. */
#define LIS_MASK1_A     0x5A   /**< Direction mask A for SM1. */
#define LIS_SETT1       0x5B   /**< SM1 options register, including SITR. */
#define LIS_OUTS1       0x5F   /**< SM1 output status. Reading it releases the latched interrupt. */

/* SM1 opcode encoding from AN3393. The high nibble is RESET and the low nibble is NEXT. */
#define SM_NOP_GNTH1    0x05   /**< Wait for a masked axis to cross the threshold. */
#define SM_CONT         0x11   /**< Assert INT1 and return to the first instruction. */
/* MASKx bits are P_X N_X P_Y N_Y P_Z N_Z P_V N_V, where P and N select direction. */
#define MASK_X          0xC0   /**< Select both directions of X. */
#define MASK_Y          0x30   /**< Select both directions of Y. */
#define MASK_Z          0x0C   /**< Select both directions of Z. */

/* Startup copies wiring and settings. Board and app task accesses only read the copy after initialization. */
static lis3dsh_cfg_t s_imu_cfg;

/** @brief Write an 8-bit register to the configured IMU slot. */
static esp_err_t wr(uint8_t reg, uint8_t v) { return board_i2c_write(s_imu_cfg.i2c_device, reg, &v, 1); }

static void IRAM_ATTR imu_isr(void *arg)
{
    (void)arg;
    /* The ISR only wakes the board task. Task context handles I2C and sink delivery. */
    board_task_notify_imu_from_isr();
}

/**
 * @brief Read and assemble the three little-endian signed acceleration counts.
 */
static esp_err_t read_axes(int16_t a[3])
{
    uint8_t b[6];
    esp_err_t e = board_i2c_read(s_imu_cfg.i2c_device, LIS_OUT_X_L, b, sizeof b);
    if (e != ESP_OK) { return e; }
    for (size_t i = 0; i < 3u; i++) {
        a[i] = (int16_t)(((uint16_t)b[2u * i + 1u] << 8) | b[2u * i]);
    }
    return ESP_OK;
}

/* Startup resets the timestamp. The board task owns the baseline and timestamp after startup. */
static int16_t s_previous_axes[3];
static uint64_t s_last_sample_ms;

uint32_t lis3dsh_sample_delta(uint64_t now_ms)
{
    int16_t axes[3];
    if (!board_imu_ok() || read_axes(axes) != ESP_OK) {
        s_last_sample_ms = 0;
        return 0;
    }
    uint32_t delta_mmps2 = s_last_sample_ms != 0u
        ? lis3dsh_delta_mmps2(s_previous_axes, axes, now_ms - s_last_sample_ms) : 0u;
    memcpy(s_previous_axes, axes, sizeof s_previous_axes);
    s_last_sample_ms = now_ms;
    return delta_mmps2;
}

/**
 * @brief Exclude the axis with the largest absolute reading from SM1.
 * A static component near 1 g can cross a lower threshold. A failed read falls back to X and Y.
 */
static uint8_t mask_without_gravity(void)
{
    int16_t a[3];
    if (read_axes(a) != ESP_OK) { return MASK_X | MASK_Y; }
    unsigned gravity_axis = lis3dsh_gravity_axis(a);
    static const uint8_t keep[3] = { MASK_Y | MASK_Z, MASK_X | MASK_Z, MASK_X | MASK_Y };
    IVTS_LOGI(BOARD_TAG, "imu gravity raw=%d,%d,%d axis=%c", a[0], a[1], a[2], "XYZ"[gravity_axis]);
    return keep[gravity_axis];
}

/**
 * @brief Register the first responding I2C address and check its chip ID.
 */
static esp_err_t lis3dsh_probe(void)
{
    uint16_t addr = board_i2c_probe(s_imu_cfg.primary_address) ? s_imu_cfg.primary_address
                  : board_i2c_probe(s_imu_cfg.alternate_address) ? s_imu_cfg.alternate_address : 0;
    ESP_RETURN_ON_FALSE(addr != 0, ESP_ERR_NOT_FOUND, BOARD_TAG, "imu probe chip=LIS3DSH addr=0x1D/0x1E result=no_reply");
    ESP_RETURN_ON_ERROR(board_i2c_add(s_imu_cfg.i2c_device, addr, s_imu_cfg.i2c_speed_hz), BOARD_TAG, "add imu");

    uint8_t id = 0;
    ESP_RETURN_ON_ERROR(board_i2c_read(s_imu_cfg.i2c_device, LIS_WHO_AM_I, &id, 1), BOARD_TAG, "who_am_i");
    ESP_RETURN_ON_FALSE(id == LIS_ID, ESP_ERR_NOT_SUPPORTED, BOARD_TAG, "imu probe chip=LIS3DSH who_am_i=0x%02x expected=0x3F", id);
    IVTS_LOGI(BOARD_TAG, "imu probe chip=LIS3DSH addr=0x%02x who_am_i=0x%02x result=ok", addr, id);

    return ESP_OK;
}

static esp_err_t lis3dsh_configure_sampling(void)
{
    ESP_RETURN_ON_ERROR(wr(LIS_CTRL1, 0x00), BOARD_TAG, "sm1 off");        /* Disable SM1 while programming it. */
    ESP_RETURN_ON_ERROR(wr(LIS_CTRL4, 0x4F), BOARD_TAG, "ctrl4");          /* ODR 25 Hz, BDU, XYZ. */
    ESP_RETURN_ON_ERROR(wr(LIS_CTRL5, 0x00), BOARD_TAG, "ctrl5");          /* Select the ±2 g measurement range. */
    ESP_RETURN_ON_ERROR(wr(LIS_CTRL6, 0x10), BOARD_TAG, "ctrl6");          /* Enable I2C address auto-increment for burst reads. */
    platform_delay_ms(100);                                         /* Allow initial samples to settle before measuring gravity. */

    return ESP_OK;
}

static esp_err_t lis3dsh_program_sm1(uint8_t threshold, uint8_t mask)
{
    ESP_RETURN_ON_ERROR(wr(LIS_THRS1_1, threshold), BOARD_TAG, "thrs1");
    ESP_RETURN_ON_ERROR(wr(LIS_MASK1_B, mask), BOARD_TAG, "mask_b");
    ESP_RETURN_ON_ERROR(wr(LIS_MASK1_A, mask), BOARD_TAG, "mask_a");
    ESP_RETURN_ON_ERROR(wr(LIS_ST1_1, SM_NOP_GNTH1), BOARD_TAG, "st1_1");
    ESP_RETURN_ON_ERROR(wr(LIS_ST1_2, SM_CONT), BOARD_TAG, "st1_2");
    ESP_RETURN_ON_ERROR(wr(LIS_SETT1, 0x01), BOARD_TAG, "sett1");          /* SITR permits the CONT instruction to change program flow. */
    ESP_RETURN_ON_ERROR(wr(LIS_CTRL3, 0x48), BOARD_TAG, "ctrl3");          /* Select active-high latched INT1. Reading OUTS1 releases the interrupt. */

    return ESP_OK;
}

/**
 * @brief Bind the active-high edge handler, reusing the GPIO ISR service if present.
 */
static esp_err_t install_int1_isr(void)
{
    gpio_config_t io = {
        .pin_bit_mask = 1ULL << s_imu_cfg.int_gpio,
        .mode = GPIO_MODE_INPUT,
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .intr_type = GPIO_INTR_POSEDGE,
    };
    ESP_RETURN_ON_ERROR(gpio_config(&io), BOARD_TAG, "gpio int");
    esp_err_t e = gpio_install_isr_service(0);
    ESP_RETURN_ON_FALSE(e == ESP_OK || e == ESP_ERR_INVALID_STATE, e, BOARD_TAG, "isr service");
    ESP_RETURN_ON_ERROR(gpio_isr_handler_add(s_imu_cfg.int_gpio, imu_isr, NULL), BOARD_TAG, "isr add");

    return ESP_OK;
}

esp_err_t lis3dsh_init(const lis3dsh_cfg_t *cfg)
{
    s_imu_cfg = *cfg;
    s_last_sample_ms = 0;
    esp_err_t error = lis3dsh_probe();
    if (error == ESP_OK) { error = lis3dsh_configure_sampling(); }
    if (error == ESP_OK) { error = lis3dsh_program_sm1(s_imu_cfg.threshold, mask_without_gravity()); }
    if (error == ESP_OK) { error = install_int1_isr(); }
    if (error != ESP_OK) { return error; }

    ESP_RETURN_ON_ERROR(wr(LIS_CTRL1, 0x01), BOARD_TAG, "sm1 on");         /* Enable SM1 after all configuration writes succeed. */
    uint8_t outs;
    return lis3dsh_clear_interrupt(&outs);
}

esp_err_t lis3dsh_clear_interrupt(uint8_t *outs)
{
    /*
     * Reading OUTS1 releases the asserted SM1 interrupt in latched mode
     * (IEL=0).
     */
    return board_i2c_read(s_imu_cfg.i2c_device, LIS_OUTS1, outs, 1);
}

int lis3dsh_interrupt_level(void)
{
    return gpio_get_level(s_imu_cfg.int_gpio);
}
