#pragma once

#include "board/board_clock.h"
#include "board/board_power.h"
#include "board/board_sensors.h"
#include "ivts_core/event/event.h"

/** Cấu hình khởi tạo board. */
typedef struct {
    ivts_sink_t sink;              /**< Nhận IVTS_EV_POWER_SAMPLE và IVTS_EV_MOTION_IRQ. */
    uint16_t    power_sample_ms;   /**< Chu kỳ phát IVTS_EV_POWER_SAMPLE. */
    uint8_t     imu_threshold;     /**< Ngưỡng THRS1_1 của LIS3DSH (đơn vị thô, thang ±2 g). */
    bool        imu_enabled;       /**< false: không khởi tạo IMU. */
    uint8_t     task_prio;         /**< Priority của task "board". */
    uint32_t    task_stack;        /**< Stack của task "board" (byte). */
} board_cfg_t;

/**
 * @brief Khởi tạo board và tạo task "board".
 *
 * Gọi một lần từ app_init. Lỗi IMU hoặc RTC không làm init thất bại: board vẫn chạy và
 * board_imu_ok()/board_rtc_ok() trả false. Lỗi bus I2C, ADC hoặc tạo task là lỗi nặng.
 *
 * @return IVTS_OK hoặc mã lỗi của bước thất bại.
 */
ivts_err_t board_init(const board_cfg_t *cfg);

/** @brief IMU đã khởi tạo thành công. */
bool board_imu_ok(void);
/** @brief DS3231M đã được phát hiện. */
bool board_rtc_ok(void);
