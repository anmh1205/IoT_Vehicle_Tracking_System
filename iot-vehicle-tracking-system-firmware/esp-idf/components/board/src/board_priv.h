#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"
#include "board/board.h"
#include "platform/platform_err.h"

#define BOARD_TAG "board"

/* Giữ mã lỗi I/O của board khi không cấp phát được mutex hoặc task. */
static inline ivts_err_t board_err(esp_err_t error)
{
    return error == ESP_ERR_NO_MEM ? IVTS_ERR_IO : platform_err_from_esp(error);
}

/* board_os.c: task "board" và mutex bus I2C. */
esp_err_t board_os_init(const board_cfg_t *cfg);   /* Tạo mutex, lưu cfg. Gọi trước mọi truy cập I2C. */
esp_err_t board_os_start(void);                    /* Tạo task. Gọi sau khi ADC và IMU đã khởi tạo. */
bool board_i2c_lock(uint32_t timeout_ms);
void board_i2c_unlock(void);
void board_os_notify_imu(void);            /* Báo task đọc IMU. Chỉ gọi từ task. */
void board_os_notify_imu_from_isr(void);   /* Báo task đọc IMU. Chỉ gọi từ ISR. */

/* board_i2c.c */
typedef enum { BOARD_DEV_RTC = 0, BOARD_DEV_IMU, BOARD_DEV_COUNT } board_dev_t;
esp_err_t board_i2c_init(void);
esp_err_t board_i2c_add(board_dev_t dev, uint16_t addr, uint32_t hz);
bool board_i2c_probe(uint16_t addr);
/* Đọc/ghi thanh ghi. Mutex bus được lấy bên trong hàm; caller không giữ mutex. */
esp_err_t board_i2c_read(board_dev_t dev, uint8_t reg, uint8_t *buf, size_t n);
esp_err_t board_i2c_write(board_dev_t dev, uint8_t reg, const uint8_t *buf, size_t n);

/* board_rtc.c */
esp_err_t board_rtc_init(void);

/* board_imu.c */
esp_err_t board_imu_init(uint8_t threshold);
esp_err_t board_imu_clear(uint8_t *outs);  /* Đọc OUTS1 để nhả ngắt đã chốt. */
int board_imu_int_level(void);
uint32_t board_imu_sample_delta(uint64_t now_ms);

/* board_adc.c */
esp_err_t board_adc_init(void);

/* board_power.c */
void board_power_capture_wake(void);
