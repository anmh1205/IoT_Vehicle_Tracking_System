/**
 * @file include/ivts_core/base/crc32.h
 * @brief CRC-32 functions for wire and durable record integrity.
 *
 * Storage queue and NVS code and the app's retained RTC context use this checksum.
 * The helper reads caller-owned bytes synchronously and leaves frame validation
 * and persistence to the caller.
 */
#pragma once
#include <stddef.h>
#include <stdint.h>

/**
 * @brief Compute or extend a reflected CRC-32 checksum.
 * @param seed CRC of the preceding data, or zero for the first block.
 * @param data Bytes borrowed for the call. NULL is allowed when len is zero.
 * @param len Number of input bytes.
 * @return CRC-32 after adding the block. An empty block returns seed.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
uint32_t ivts_crc32(uint32_t seed, const void *data, size_t len);
