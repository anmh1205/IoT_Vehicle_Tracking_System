/**
 * @file axes.h
 * @brief Suy ra trạng thái ignition, motion và vehicle từ mẫu cảm biến.
 *
 * Thuần: không đọc clock, thời gian được truyền vào qua tham số @c now.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/time.h"
#include "ivts_core/model/telemetry.h"

/** Tham số suy luận. */
typedef struct {
    uint16_t on_threshold_mv;   /**< Điện áp từ mức này trở lên là ignition ON. */
    uint16_t hysteresis_mv;     /**< Ignition OFF khi điện áp < on_threshold_mv - hysteresis_mv. */
    uint32_t on_hold_ms;        /**< Thời gian giữ ổn định trước khi chuyển sang ON. */
    uint32_t off_hold_ms;       /**< Thời gian giữ ổn định trước khi chuyển sang OFF. */
    uint32_t motion_quiet_ms;   /**< Không có IRQ trong khoảng này thì motion về STATIONARY. */
} ivts_axes_cfg_t;

typedef struct {
    ivts_ignition_t ign;              /**< Giá trị đã debounce. */
    ivts_ignition_t candidate;        /**< Giá trị thô gần nhất. */
    ivts_ms_t       candidate_since;  /**< Thời điểm candidate bắt đầu giữ nguyên. */
    ivts_motion_t   motion;
    ivts_ms_t       last_motion_ms;   /**< Thời điểm IRQ motion gần nhất. */
} ivts_axes_t;

/** @brief Đặt mọi trục về UNKNOWN. */
void ivts_axes_init(ivts_axes_t *a);

/**
 * @brief Nạp một mẫu điện áp nguồn xe.
 *
 * Mẫu đầu tiên sau init được chấp nhận ngay (không debounce) để boot không phải chờ
 * off_hold_ms chỉ để biết xe đang tắt. Các lần chuyển sau đó phải giữ ổn định
 * on_hold_ms (OFF->ON) hoặc off_hold_ms (ON->OFF). Trong dải trễ, giá trị hiện tại được giữ.
 *
 * @return true nếu ignition đổi giá trị.
 */
bool ivts_axes_on_power(ivts_axes_t *a, const ivts_axes_cfg_t *c, uint16_t vehicle_mv, ivts_ms_t now);

/**
 * @brief Ghi nhận một IRQ motion của IMU.
 * @return true nếu motion đổi giá trị.
 */
bool ivts_axes_on_motion(ivts_axes_t *a, ivts_ms_t now);

/**
 * @brief Gọi định kỳ: đưa motion về STATIONARY khi đã yên lặng đủ motion_quiet_ms.
 * @return true nếu motion đổi giá trị.
 */
bool ivts_axes_tick(ivts_axes_t *a, const ivts_axes_cfg_t *c, ivts_ms_t now);

/** @brief Tổ hợp ignition và motion thành trạng thái xe. */
ivts_vehicle_t ivts_axes_vehicle(const ivts_axes_t *a);
