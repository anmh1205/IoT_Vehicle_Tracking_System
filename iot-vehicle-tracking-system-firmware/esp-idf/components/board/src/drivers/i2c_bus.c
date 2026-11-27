/**
 * @file src/drivers/i2c_bus.c
 * @brief Shared board I2C master, device registry and timed transfer lock.
 *
 * Board startup creates bus and slot handles. RTC and IMU drivers borrow the handles through this adapter.
 * App, modem, OTA and board task I/O shares a mutex. The RTC driver holds it across calendar and status
 * sequences. Single-transfer callers acquire it through the read and write wrappers.
 */
#include "board_internal.h"
#include "board/board_hw.h"
#include "platform/platform.h"
#include "driver/i2c_master.h"
#include "esp_check.h"

/*
 * I2C transfers and acquisition of the bus mutex have separate deadlines. A
 * normal 7-byte transfer at 100 kHz takes less than 2 ms.
 */
#define I2C_XFER_TIMEOUT_MS 50   /**< SDK transfer timeout in milliseconds, separate from the mutex timeout. */
#define I2C_LOCK_TIMEOUT_MS 100   /**< Mutex acquisition timeout in milliseconds. */

/* Startup creates the master and device handles. Tasks serialize transfers with the bus mutex below. */
static i2c_master_bus_handle_t s_bus;
static i2c_master_dev_handle_t s_dev[BOARD_DEV_COUNT];

static platform_mutex_t s_i2c_mutex;

bool board_i2c_lock(void)
{
    return platform_mutex_lock_for(s_i2c_mutex, I2C_LOCK_TIMEOUT_MS);
}

void board_i2c_unlock(void)
{
    platform_mutex_unlock(s_i2c_mutex);
}

esp_err_t board_i2c_init(void)
{
    s_i2c_mutex = platform_mutex_create();
    ESP_RETURN_ON_FALSE(s_i2c_mutex != NULL, ESP_ERR_NO_MEM, BOARD_TAG, "mutex");

    i2c_master_bus_config_t cfg = {
        .i2c_port = 0,
        .sda_io_num = BOARD_PIN_I2C_SDA,
        .scl_io_num = BOARD_PIN_I2C_SCL,
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .glitch_ignore_cnt = 7,
        .flags.enable_internal_pullup = true,   /* Enable internal pull-ups in addition to the external board pull-ups. */
    };
    return i2c_new_master_bus(&cfg, &s_bus);
}

esp_err_t board_i2c_add(board_dev_t dev, uint16_t addr, uint32_t hz)
{
    i2c_device_config_t cfg = {
        .dev_addr_length = I2C_ADDR_BIT_LEN_7,
        .device_address = addr,
        .scl_speed_hz = hz,
    };
    return i2c_master_bus_add_device(s_bus, &cfg, &s_dev[dev]);
}

bool board_i2c_probe(uint16_t addr)
{
    if (!board_i2c_lock()) { return false; }
    bool ok = (i2c_master_probe(s_bus, addr, I2C_XFER_TIMEOUT_MS) == ESP_OK);
    board_i2c_unlock();
    return ok;
}

esp_err_t board_i2c_read_locked(board_dev_t dev, uint8_t reg, uint8_t *buf, size_t n)
{
    ESP_RETURN_ON_FALSE(s_dev[dev] != NULL, ESP_ERR_INVALID_STATE, BOARD_TAG, "i2c read dev=%d result=not_added", (int)dev);
    return i2c_master_transmit_receive(s_dev[dev], &reg, 1, buf, n, I2C_XFER_TIMEOUT_MS);
}

esp_err_t board_i2c_write_locked(board_dev_t dev, uint8_t reg, const uint8_t *buf, size_t n)
{
    ESP_RETURN_ON_FALSE(s_dev[dev] != NULL, ESP_ERR_INVALID_STATE, BOARD_TAG, "i2c write dev=%d result=not_added", (int)dev);
    ESP_RETURN_ON_FALSE(n <= 16, ESP_ERR_INVALID_SIZE, BOARD_TAG, "i2c write result=len_over_16B");
    uint8_t tmp[17];
    tmp[0] = reg;
    for (size_t i = 0; i < n; i++) { tmp[i + 1] = buf[i]; }
    return i2c_master_transmit(s_dev[dev], tmp, n + 1, I2C_XFER_TIMEOUT_MS);
}

esp_err_t board_i2c_read(board_dev_t dev, uint8_t reg, uint8_t *buf, size_t n)
{
    if (!board_i2c_lock()) { return ESP_ERR_TIMEOUT; }
    esp_err_t e = board_i2c_read_locked(dev, reg, buf, n);
    board_i2c_unlock();
    return e;
}

esp_err_t board_i2c_write(board_dev_t dev, uint8_t reg, const uint8_t *buf, size_t n)
{
    if (!board_i2c_lock()) { return ESP_ERR_TIMEOUT; }
    esp_err_t e = board_i2c_write_locked(dev, reg, buf, n);
    board_i2c_unlock();
    return e;
}
