#include "board_internal.h"
#include "i2c_bus.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "driver/i2c_master.h"
#include "esp_check.h"

/* Thời gian tối đa của một giao dịch I2C, và thời gian chờ mutex bus. Giao dịch dài nhất
 * (đọc 7 byte ở 100 kHz) ngắn hơn 2 ms, nên 100 ms chỉ bị chạm khi bus bị treo. */
#define I2C_XFER_TIMEOUT_MS 50
#define I2C_LOCK_TIMEOUT_MS 100

static i2c_master_bus_handle_t s_bus;
static i2c_master_dev_handle_t s_dev[BOARD_DEV_COUNT];

static SemaphoreHandle_t s_i2c_mutex;

static bool board_i2c_lock(uint32_t timeout_ms)
{
    return xSemaphoreTake(s_i2c_mutex, pdMS_TO_TICKS(timeout_ms)) == pdTRUE;
}

static void board_i2c_unlock(void)
{
    xSemaphoreGive(s_i2c_mutex);
}

/* Bus I2C master port 0. Thiết bị trên bus được thêm sau bằng board_i2c_add(). */
esp_err_t board_i2c_init(void)
{
    s_i2c_mutex = xSemaphoreCreateMutex();
    ESP_RETURN_ON_FALSE(s_i2c_mutex != NULL, ESP_ERR_NO_MEM, BOARD_TAG, "mutex");

    i2c_master_bus_config_t cfg = {
        .i2c_port = 0,
        .sda_io_num = BOARD_PIN_I2C_SDA,
        .scl_io_num = BOARD_PIN_I2C_SCL,
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .glitch_ignore_cnt = 7,
        .flags.enable_internal_pullup = true,   /* Pull-up nội bổ sung cho pull-up ngoài của board. */
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
    if (!board_i2c_lock(I2C_LOCK_TIMEOUT_MS)) { return false; }
    bool ok = (i2c_master_probe(s_bus, addr, I2C_XFER_TIMEOUT_MS) == ESP_OK);
    board_i2c_unlock();
    return ok;
}

esp_err_t board_i2c_read(board_dev_t dev, uint8_t reg, uint8_t *buf, size_t n)
{
    ESP_RETURN_ON_FALSE(s_dev[dev] != NULL, ESP_ERR_INVALID_STATE, BOARD_TAG, "dev %d chưa được thêm vào bus", (int)dev);
    if (!board_i2c_lock(I2C_LOCK_TIMEOUT_MS)) { return ESP_ERR_TIMEOUT; }
    esp_err_t e = i2c_master_transmit_receive(s_dev[dev], &reg, 1, buf, n, I2C_XFER_TIMEOUT_MS);
    board_i2c_unlock();
    return e;
}

esp_err_t board_i2c_write(board_dev_t dev, uint8_t reg, const uint8_t *buf, size_t n)
{
    ESP_RETURN_ON_FALSE(s_dev[dev] != NULL, ESP_ERR_INVALID_STATE, BOARD_TAG, "dev %d chưa được thêm vào bus", (int)dev);
    ESP_RETURN_ON_FALSE(n <= 16, ESP_ERR_INVALID_SIZE, BOARD_TAG, "write dài quá 16 byte");
    uint8_t tmp[17];
    tmp[0] = reg;
    for (size_t i = 0; i < n; i++) { tmp[i + 1] = buf[i]; }
    if (!board_i2c_lock(I2C_LOCK_TIMEOUT_MS)) { return ESP_ERR_TIMEOUT; }
    esp_err_t e = i2c_master_transmit(s_dev[dev], tmp, n + 1, I2C_XFER_TIMEOUT_MS);
    board_i2c_unlock();
    return e;
}
