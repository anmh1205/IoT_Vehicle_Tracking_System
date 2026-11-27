/**
 * @file backoff.h
 * @brief Thời gian chờ retry: cấp số nhân, chặn trên, cộng jitter.
 *
 * Hàm thuần, không giữ state; gọi từ task nào cũng được.
 */
#pragma once
#include <stdint.h>

/** Tham số của đường cong backoff. */
typedef struct {
    uint32_t base_ms;    /**< Độ trễ của lần thử 0. Giá trị 0 được xử lý như 1. */
    uint32_t max_ms;     /**< Chặn trên của đường cong (chưa gồm jitter). Giá trị nhỏ hơn base_ms được xử lý như base_ms. */
    uint32_t jitter_ms;  /**< Jitter cộng thêm nằm trong [0, jitter_ms]. 0 = không jitter. */
} ivts_backoff_t;

/**
 * @brief Tính độ trễ trước lần thử thứ @p attempt.
 *
 * delay = min(base * 2^attempt, max) + seed % (jitter_ms + 1), bão hoà ở UINT32_MAX.
 * Jitter được cộng sau khi chặn trên để các thiết bị cùng thất bại không đồng bộ lại
 * ở đúng mốc max_ms. Kết quả luôn nằm trong [base_ms, max_ms + jitter_ms].
 *
 * @param p        Tham số; NULL trả về 1.
 * @param attempt  Số lần đã thất bại liên tiếp (0 cho lần thử đầu).
 * @param seed     Nguồn ngẫu nhiên cho jitter (ví dụ uptime ms).
 * @return Độ trễ tính bằng ms.
 */
uint32_t ivts_backoff_ms(const ivts_backoff_t *p, uint32_t attempt, uint32_t seed);
