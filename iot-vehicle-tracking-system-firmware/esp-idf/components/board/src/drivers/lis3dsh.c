/**
 * @file lis3dsh.c
 * @brief Driver LIS3DSH: phát hiện chuyển động bằng state machine SM1, ngắt qua chân INT1.
 *
 * LIS3DSH (datasheet ST DocID022405) không có thanh ghi INT1_CFG/INT1_THS của LIS3DH.
 * Ngắt chuyển động được tạo bởi state machine SM1 (thanh ghi 0x40..0x5F): SM1 chờ một trục
 * trong mask vượt ngưỡng THRS1, phát ngắt rồi quay lại trạng thái chờ.
 *
 * ## Ngữ cảnh gọi
 *
 * - lis3dsh_init(): gọi từ board_init() trước khi task "board" tạo ra.
 * - imu_isr(): ngữ cảnh ISR, chỉ báo task qua board_task_notify_imu_from_isr().
 * - lis3dsh_clear_interrupt(): task "board" gọi sau mỗi notify; board_sleep() gọi trước khi ngủ.
 *   Cả hai đi qua mutex bus I2C.
 *
 * Giá trị thanh ghi và mã lệnh state machine tra theo datasheet và AN3393.
 */

#include "board_internal.h"
#include "platform/platform.h"
#include "lis3dsh.h"
#include "lis3dsh_calc.h"
#include "bsp/board_task.h"
#include <string.h>
#include "driver/gpio.h"
#include "esp_check.h"
#include "esp_log.h"

#define LIS_WHO_AM_I    0x0F
#define LIS_ID          0x3F
#define LIS_CTRL4       0x20   /* ODR[7:4] BDU[3] Z/Y/X EN[2:0] */
#define LIS_CTRL1       0x21   /* SM1: HYST[7:5] SM1_PIN[3] SM1_EN[0] */
#define LIS_CTRL3       0x23   /* DR_EN[7] IEA[6] IEL[5] INT2_EN[4] INT1_EN[3] VFILT[2] STRT[0] */
#define LIS_CTRL5       0x24   /* FSCALE[5:3] = 000 -> ±2g */
#define LIS_CTRL6       0x25   /* ADD_INC[4] cho phép đọc liên tiếp. */
#define LIS_OUT_X_L     0x28
#define LIS_ST1_1       0x40
#define LIS_ST1_2       0x41
#define LIS_THRS1_1     0x57
#define LIS_MASK1_B     0x59
#define LIS_MASK1_A     0x5A
#define LIS_SETT1       0x5B
#define LIS_OUTS1       0x5F

/* Mã lệnh state machine (AN3393): nibble cao = điều kiện RESET, nibble thấp = điều kiện NEXT. */
#define SM_NOP_GNTH1    0x05   /* Chờ: một trục trong mask vượt THRS1. */
#define SM_CONT         0x11   /* Phát ngắt rồi quay về ST1_1. */
/* Bit của MASKx: P_X N_X P_Y N_Y P_Z N_Z P_V N_V (P = chiều dương, N = chiều âm). */
#define MASK_X          0xC0
#define MASK_Y          0x30
#define MASK_Z          0x0C

static lis3dsh_cfg_t s_imu_cfg;

/** Ghi một thanh ghi 8 bit của IMU. */
static esp_err_t wr(uint8_t reg, uint8_t v) { return board_i2c_write(s_imu_cfg.i2c_device, reg, &v, 1); }

static void IRAM_ATTR imu_isr(void *arg)
{
    (void)arg;
    /* ISR không gọi sink và không truy cập I2C: chỉ đánh thức task "board". */
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

/* Chỉ task board gọi. Đo độ lớn của vector hiệu giữa hai mẫu để loại trọng lực tĩnh. */
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
 * @brief Chọn mask các trục dùng để phát hiện chuyển động, loại trục đang chịu trọng lực.
 *
 * Trục thẳng đứng luôn đo khoảng 1 g; so với ngưỡng nhỏ hơn 1 g thì SM1 ngắt liên tục.
 * Hàm đọc một mẫu OUT_X/Y/Z, coi trục có |giá trị| lớn nhất là trục trọng lực và loại nó.
 * Mask được tính một lần lúc init, nên cần khởi động lại sau khi thay đổi cách lắp thiết bị.
 *
 * @return Mask gồm hai trục còn lại; MASK_X | MASK_Y (lắp nằm ngang) nếu không đọc được IMU.
 */
static uint8_t mask_without_gravity(void)
{
    int16_t a[3];
    if (read_axes(a) != ESP_OK) { return MASK_X | MASK_Y; }
    unsigned gravity_axis = lis3dsh_gravity_axis(a);
    static const uint8_t keep[3] = { MASK_Y | MASK_Z, MASK_X | MASK_Z, MASK_X | MASK_Y };
    ESP_LOGI(BOARD_TAG, "imu raw x=%d y=%d z=%d -> trục trọng lực %u", a[0], a[1], a[2], gravity_axis);
    return keep[gravity_axis];
}

static esp_err_t lis3dsh_probe(void)
{
    uint16_t addr = board_i2c_probe(s_imu_cfg.primary_address) ? s_imu_cfg.primary_address
                  : board_i2c_probe(s_imu_cfg.alternate_address) ? s_imu_cfg.alternate_address : 0;
    ESP_RETURN_ON_FALSE(addr != 0, ESP_ERR_NOT_FOUND, BOARD_TAG, "LIS3DSH không trả lời 0x1D/0x1E");
    ESP_RETURN_ON_ERROR(board_i2c_add(s_imu_cfg.i2c_device, addr, s_imu_cfg.i2c_speed_hz), BOARD_TAG, "add imu");

    uint8_t id = 0;
    ESP_RETURN_ON_ERROR(board_i2c_read(s_imu_cfg.i2c_device, LIS_WHO_AM_I, &id, 1), BOARD_TAG, "who_am_i");
    ESP_RETURN_ON_FALSE(id == LIS_ID, ESP_ERR_NOT_SUPPORTED, BOARD_TAG, "WHO_AM_I=0x%02x (cần 0x3F)", id);

    return ESP_OK;
}

static esp_err_t lis3dsh_configure_sampling(void)
{
    ESP_RETURN_ON_ERROR(wr(LIS_CTRL1, 0x00), BOARD_TAG, "sm1 off");        /* Tắt SM1 trong lúc ghi chương trình. */
    ESP_RETURN_ON_ERROR(wr(LIS_CTRL4, 0x4F), BOARD_TAG, "ctrl4");          /* ODR 25 Hz, BDU, XYZ. */
    ESP_RETURN_ON_ERROR(wr(LIS_CTRL5, 0x00), BOARD_TAG, "ctrl5");          /* Thang đo ±2 g. */
    ESP_RETURN_ON_ERROR(wr(LIS_CTRL6, 0x10), BOARD_TAG, "ctrl6");          /* Burst I2C tự tăng địa chỉ. */
    platform_delay_ms(100);                                         /* Chờ vài mẫu đầu ổn định trước khi đọc trọng lực. */

    return ESP_OK;
}

static esp_err_t lis3dsh_program_sm1(uint8_t threshold, uint8_t mask)
{
    ESP_RETURN_ON_ERROR(wr(LIS_THRS1_1, threshold), BOARD_TAG, "thrs1");
    ESP_RETURN_ON_ERROR(wr(LIS_MASK1_B, mask), BOARD_TAG, "mask_b");
    ESP_RETURN_ON_ERROR(wr(LIS_MASK1_A, mask), BOARD_TAG, "mask_a");
    ESP_RETURN_ON_ERROR(wr(LIS_ST1_1, SM_NOP_GNTH1), BOARD_TAG, "st1_1");
    ESP_RETURN_ON_ERROR(wr(LIS_ST1_2, SM_CONT), BOARD_TAG, "st1_2");
    ESP_RETURN_ON_ERROR(wr(LIS_SETT1, 0x01), BOARD_TAG, "sett1");          /* SITR: lệnh CONT được phép đổi luồng. */
    ESP_RETURN_ON_ERROR(wr(LIS_CTRL3, 0x48), BOARD_TAG, "ctrl3");          /* IEA=1 tích cực mức cao, INT1_EN=1, IEL=0 ngắt chốt (giữ đến khi đọc OUTS1). */

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

    ESP_RETURN_ON_ERROR(wr(LIS_CTRL1, 0x01), BOARD_TAG, "sm1 on");         /* Bật SM1 sau cùng, khi mọi cấu hình đã xong. */
    uint8_t outs;
    return lis3dsh_clear_interrupt(&outs);
}

esp_err_t lis3dsh_clear_interrupt(uint8_t *outs)
{
    /* Theo datasheet, thao tác đọc OUTS1 tác động lên chức năng ngắt của SM1; ngắt chốt
     * (IEL=0) được nhả bằng lần đọc này. */
    return board_i2c_read(s_imu_cfg.i2c_device, LIS_OUTS1, outs, 1);
}

int lis3dsh_interrupt_level(void)
{
    return gpio_get_level(s_imu_cfg.int_gpio);
}
