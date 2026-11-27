/**
 * @file lis3dsh.c
 * @brief LIS3DSH motion detection using the SM1 interrupt state machine.
 *
 * The LIS3DSH uses SM1 registers 0x40–0x5F for detection. The program waits
 * for a selected axis to cross THRS1, asserts INT1 and returns to its waiting
 * state. Register and instruction encodings follow the datasheet DocID022405
 * and AN3393.
 *
 * Board startup configures the sensor. Its ISR notifies the board task, which
 * acknowledges the interrupt. The sleep adapter also clears an old interrupt
 * before arming a wake source. Register access uses the board I2C mutex.
 */
#include "board_internal.h"
#include "platform/platform.h"
#include "drivers/drivers.h"
#include "drivers/drivers_calc.h"
#include <string.h>
#include "driver/gpio.h"
#include "esp_check.h"
#include "platform/log.h"

#define LIS_WHO_AM_I    0x0F
#define LIS_ID          0x3F
#define LIS_CTRL4       0x20   /* ODR[7:4] BDU[3] Z/Y/X EN[2:0] */
#define LIS_CTRL1       0x21   /* SM1: HYST[7:5] SM1_PIN[3] SM1_EN[0] */
#define LIS_CTRL3       0x23   /* DR_EN[7] IEA[6] IEL[5] INT2_EN[4] INT1_EN[3] VFILT[2] STRT[0] */
#define LIS_CTRL5       0x24   /* FSCALE[5:3] = 000 -> ±2g */
#define LIS_CTRL6       0x25   /* ADD_INC bit 4 enables sequential register reads. */
#define LIS_OUT_X_L     0x28
#define LIS_ST1_1       0x40
#define LIS_ST1_2       0x41
#define LIS_THRS1_1     0x57
#define LIS_MASK1_B     0x59
#define LIS_MASK1_A     0x5A
#define LIS_SETT1       0x5B
#define LIS_OUTS1       0x5F

/* SM1 opcode encoding from AN3393. The high nibble is RESET and the low nibble is NEXT. */
#define SM_NOP_GNTH1    0x05   /* Wait for a masked axis to cross THRS1. */
#define SM_CONT         0x11   /* Assert the interrupt and return to ST1_1. */
/* MASKx bits are P_X N_X P_Y N_Y P_Z N_Z P_V N_V, where P and N select direction. */
#define MASK_X          0xC0
#define MASK_Y          0x30
#define MASK_Z          0x0C

static lis3dsh_cfg_t s_imu_cfg;

/** Write one 8-bit IMU register. */
static esp_err_t wr(uint8_t reg, uint8_t v) { return board_i2c_write(s_imu_cfg.i2c_device, reg, &v, 1); }

static void IRAM_ATTR imu_isr(void *arg)
{
    (void)arg;
    /* The ISR only wakes the board task. Task context handles I2C and sink delivery. */
    board_task_notify_imu_from_isr();
}

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

static int16_t s_previous_axes[3];
static uint64_t s_last_sample_ms;

/* The board task compares successive vectors to remove static gravity. */
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
 * @brief Choose the motion axes by excluding the axis dominated by gravity.
 *
 * Read one OUT_X/Y/Z sample and omit its largest absolute component. A static
 * vertical component is close to 1 g and would otherwise cross a lower SM1
 * threshold. Recompute the mask at startup after changing the mounting angle.
 *
 * @return A mask for the remaining axes, or MASK_X | MASK_Y after a read
 * error.
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
