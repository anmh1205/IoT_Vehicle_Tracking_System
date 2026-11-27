/**
 * @file board.h
 * @brief Lớp board: gán chân, RTC DS3231M, IMU LIS3DSH, ADC nguồn, quản lý nguồn và sleep.
 *
 * Component board là nơi duy nhất gọi esp_sleep_* và cấu hình power management.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/event/event.h"

/**
 * @name Gán chân
 * Các component khác không include board.h; app_init.c chép các giá trị này sang cfg
 * của chúng để giữ hướng phụ thuộc.
 * @{
 */
#define BOARD_PIN_I2C_SDA        2
#define BOARD_PIN_I2C_SCL        1
#define BOARD_PIN_IMU_INT1       36   /**< INT1 nối chân vật lý 41 của ESP32-S3. GPIO36 chỉ đánh thức light sleep. */
#define BOARD_PIN_ADC_VEHICLE    3    /**< ADC1, chia áp 11:1. */
#define BOARD_PIN_ADC_DEVICE     4
#define BOARD_PIN_MODEM_TX       17
#define BOARD_PIN_MODEM_RX       18
#define BOARD_PIN_MODEM_PWRKEY   34   /**< GPIO33..37 dành cho octal flash/PSRAM: chỉ dùng được khi module không có octal PSRAM. */
#define BOARD_PIN_MODEM_RESET    35   /**< Xem ghi chú của BOARD_PIN_MODEM_PWRKEY. */
#define BOARD_PIN_LED            15
#define BOARD_PIN_SD_CLK         10
#define BOARD_PIN_SD_CMD         9
#define BOARD_PIN_SD_D0          11
#define BOARD_PIN_SD_D1          12
#define BOARD_PIN_SD_D2          7
#define BOARD_PIN_SD_D3          8
#define BOARD_PIN_SD_CD          13
#define BOARD_MODEM_UART_NUM     1
#define BOARD_MODEM_BAUD         115200
/** @} */

/** Cấu hình khởi tạo board. */
typedef struct {
    ivts_sink_t sink;              /**< Nhận IVTS_EV_POWER_SAMPLE và IVTS_EV_MOTION_IRQ. */
    uint16_t    power_sample_ms;   /**< Chu kỳ phát IVTS_EV_POWER_SAMPLE. */
    uint8_t     imu_threshold;     /**< Ngưỡng THRS1_1 của LIS3DSH (đơn vị thô, thang ±2 g). */
    bool        imu_enabled;       /**< false: không khởi tạo IMU. */
    uint8_t     task_prio;         /**< Priority của task "board". */
    uint32_t    task_stack;        /**< Stack của task "board" (byte). */
} board_cfg_t;

/** Nguyên nhân của lần thức. */
typedef enum {
    BOARD_WAKE_POWER_ON = 0,   /**< Cấp nguồn hoặc reset, không phải thức từ sleep. */
    BOARD_WAKE_TIMER,
    BOARD_WAKE_IMU,
    BOARD_WAKE_OTHER
} board_wake_t;

/** Yêu cầu ngủ. */
typedef struct {
    bool     deep;       /**< false: light sleep (hàm trả về khi thức). true: deep sleep (không trả về). */
    uint32_t seconds;    /**< Thời gian ngủ tối đa trước khi timer đánh thức. */
    bool     arm_imu;    /**< Cho phép IMU đánh thức, nếu chân INT hỗ trợ ở chế độ đã chọn. */
} board_sleep_req_t;

/**
 * @brief Khởi tạo board và tạo task "board".
 *
 * Gọi một lần từ app_init. Lỗi IMU hoặc RTC không làm init thất bại: board vẫn chạy và
 * board_imu_ok()/board_rtc_ok() trả false. Lỗi bus I2C, ADC hoặc tạo task là lỗi nặng.
 *
 * @return IVTS_OK hoặc mã lỗi của bước thất bại.
 */
ivts_err_t board_init(const board_cfg_t *cfg);

/**
 * @brief Đọc giờ từ DS3231M.
 * @param unix_ms  Nhận Unix time (ms); 0 nếu giá trị đọc được không phải ngày hợp lệ.
 * @param trusted  Nhận true khi cờ OSF (oscillator stop flag) không bật và giờ >= 2024-01-01.
 * @return IVTS_OK; IVTS_ERR_INVALID_STATE nếu không có RTC; lỗi I2C khác.
 */
ivts_err_t board_time_get(uint64_t *unix_ms, bool *trusted);

/**
 * @brief Ghi giờ vào DS3231M rồi xoá cờ OSF.
 * @param unix_ms  Unix time (ms), năm 2000..2099.
 */
ivts_err_t board_time_set(uint64_t unix_ms);

/**
 * @brief Đo điện áp nguồn xe và nguồn thiết bị (mV, sau chia áp và hiệu chuẩn).
 *
 * Gọi được từ nhiều task: adc_oneshot_read() an toàn đa luồng.
 */
ivts_err_t board_power_read(uint16_t *vehicle_mv, uint16_t *device_mv);
/** Điều khiển LED người dùng. LED tắt khi khởi tạo board. */
void board_led_set(bool on);

/** @brief IMU đã khởi tạo thành công. */
bool board_imu_ok(void);
/** @brief DS3231M đã được phát hiện. */
bool board_rtc_ok(void);
/** @brief Chân INT của IMU có thể đánh thức deep sleep (esp_sleep_is_valid_wakeup_gpio). */
bool board_motion_deep_wake_capable(void);
/** Cấu hình quản lý tần số và cho phép hoặc cấm light sleep tự động khi các task đang chờ. */
ivts_err_t board_set_auto_light_sleep(bool enabled);

/** @brief Nguyên nhân của lần boot hiện tại, chụp một lần ở đầu board_init(). */
board_wake_t board_wake_cause(void);

/**
 * @brief Vào light hoặc deep sleep.
 *
 * Light sleep: trả về nguyên nhân thức. Deep sleep: không trả về.
 * Nếu IMU được armed và chân INT đang ở mức cao thì hàm trả BOARD_WAKE_IMU ngay mà không ngủ.
 */
board_wake_t board_sleep(const board_sleep_req_t *req);

/** @brief Thời gian từ lúc boot (ms), theo esp_timer. */
uint64_t board_uptime_ms(void);
