/**
 * @file crc32.h
 * @brief CRC-32 tương thích zlib (đa thức phản xạ 0xEDB88320).
 */
#pragma once
#include <stddef.h>
#include <stdint.h>

/**
 * @brief Tính hoặc cộng dồn CRC-32.
 *
 * Lần đầu truyền seed = 0. Ghép nhiều đoạn: crc = ivts_crc32(crc, next, len).
 *
 * @param seed  CRC của phần dữ liệu trước đó, 0 cho đoạn đầu.
 * @param data  Dữ liệu; không được NULL khi len > 0.
 * @param len   Số byte.
 * @return CRC-32 của toàn bộ dữ liệu đã cộng dồn.
 */
uint32_t ivts_crc32(uint32_t seed, const void *data, size_t len);
