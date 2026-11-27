/**
 * @file time.h
 * @brief Kiểu thời gian tương đối (uptime) dùng trong core.
 */
#pragma once
#include <stdint.h>

/**
 * Thời gian tính từ lúc boot, đơn vị ms.
 * Không được lưu vào NVS, RTC hay record: giá trị chỉ có nghĩa trong một lần boot.
 */
typedef uint64_t ivts_ms_t;

/**
 * @brief Số ms đã trôi qua từ @p since đến @p now.
 * @return now - since; 0 nếu @p since nằm sau @p now (không underflow).
 */
static inline ivts_ms_t ivts_elapsed(ivts_ms_t now, ivts_ms_t since)
{
    return (now >= since) ? (now - since) : 0u;
}
