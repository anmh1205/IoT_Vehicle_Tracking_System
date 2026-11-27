#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/**
 * @brief Đo điện áp nguồn xe và nguồn thiết bị (mV, sau chia áp và hiệu chuẩn).
 *
 * Gọi được từ nhiều task: adc_oneshot_read() an toàn đa luồng.
 */
ivts_err_t board_power_read(uint16_t *vehicle_mv, uint16_t *device_mv);
/** Điều khiển LED người dùng. LED tắt khi khởi tạo board. */
void board_led_set(bool on);
