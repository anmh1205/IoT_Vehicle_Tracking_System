#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

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
