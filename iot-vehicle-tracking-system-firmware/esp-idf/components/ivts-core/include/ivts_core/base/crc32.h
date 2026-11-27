/**
 * @file crc32.h
 * @brief CRC-32 functions for wire and durable record integrity.
 */
#pragma once
#include <stddef.h>
#include <stdint.h>

/**
 * @brief Compute or extend a CRC-32 checksum.
 * @param seed CRC of the preceding data, or zero for the first block.
 * @param data Input bytes. Required when len is positive.
 * @param len Number of input bytes.
 * @return CRC-32 after adding this block.
 */
uint32_t ivts_crc32(uint32_t seed, const void *data, size_t len);
