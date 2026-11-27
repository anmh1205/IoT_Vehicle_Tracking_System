#pragma once

#include "nimble/ble.h"

/**
 * @file ble_util.h
 * @brief Utility helpers for BLE address conversion.
 * This header belongs to the BLE OBD NimBLE adapter layer and exposes the adapter boundary so higher layers do not depend on hardware- or transport-private details.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/** @brief String length for BLE MAC `AA:BB:CC:DD:EE:FF` including null terminator. */
#define BLE_ADDR_STR_LEN 18

/**
 * @brief Convert NimBLE address into printable string.
 *
 * @param addr Source BLE address.
 * @param dst Destination buffer with size `BLE_ADDR_STR_LEN`.
 *
 * @return `dst` on success, otherwise NULL.
 */
const char *ble_addr_to_str(const ble_addr_t *addr, char dst[BLE_ADDR_STR_LEN]);

/**
 * @brief Parse BLE address string into NimBLE address structure.
 *
 * @param src Source string (`AA:BB:CC:DD:EE:FF`).
 * @param addr Output BLE address object.
 *
 * @return true on success, false when format is invalid.
 */
bool ble_addr_from_str(const char *src, ble_addr_t *addr);
