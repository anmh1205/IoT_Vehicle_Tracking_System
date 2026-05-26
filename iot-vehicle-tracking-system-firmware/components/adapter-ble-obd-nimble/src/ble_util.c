#include "ble_util.h"

#include <stdio.h>
#include <string.h>

/**
 * @file ble_util.c
 * @brief BLE address string/byte conversion helpers.
 * This translation unit belongs to the BLE OBD NimBLE adapter layer and keeps adapter-local state, protocol sequencing, and recovery policy isolated behind the exported entry points.
 */


/**
 * @brief Convert BLE address bytes into standard MAC string.
 *
 * @param addr Source BLE address.
 * @param dst Output string buffer (`BLE_ADDR_STR_LEN`).
 *
 * @return `dst` on success, otherwise NULL.
 */
const char *ble_addr_to_str(const ble_addr_t *addr, char dst[BLE_ADDR_STR_LEN]) {
    /* Validate pointers before formatting. */
    if (addr == NULL || dst == NULL) {
        return NULL;
    }

    /* NimBLE stores bytes in little-endian order; print as human-readable MAC. */
    snprintf(dst,
             BLE_ADDR_STR_LEN,
             "%02X:%02X:%02X:%02X:%02X:%02X",
             addr->val[5],
             addr->val[4],
             addr->val[3],
             addr->val[2],
             addr->val[1],
             addr->val[0]);
    return dst;
}

/**
 * @brief Parse MAC string into NimBLE address.
 *
 * @param src Source string (`AA:BB:CC:DD:EE:FF`).
 * @param addr Output BLE address.
 *
 * @return true when parse succeeds.
 */
bool ble_addr_from_str(const char *src, ble_addr_t *addr) {
    /* Reject invalid pointers early. */
    if (src == NULL || addr == NULL) {
        return false;
    }

    /* Parse hex octets into temporary integer array. */
    unsigned int values[6] = {0};
    if (sscanf(src,
               "%02x:%02x:%02x:%02x:%02x:%02x",
               &values[5],
               &values[4],
               &values[3],
               &values[2],
               &values[1],
               &values[0]) != 6) {
        return false;
    }

    /* Clear destination structure and copy converted octets. */
    memset(addr, 0, sizeof(*addr));
    for (size_t i = 0; i < 6; ++i) {
        addr->val[i] = (uint8_t)values[i];
    }

    /* Default to public address type for known OBD adapters. */
    addr->type = BLE_ADDR_PUBLIC;
    return true;
}
