#include "ble_util.h"

#include <stdio.h>
#include <string.h>

const char *ble_addr_to_str(const ble_addr_t *addr, char dst[BLE_ADDR_STR_LEN]) {
    if (addr == NULL || dst == NULL) {
        return NULL;
    }

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

bool ble_addr_from_str(const char *src, ble_addr_t *addr) {
    if (src == NULL || addr == NULL) {
        return false;
    }

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

    memset(addr, 0, sizeof(*addr));
    for (size_t i = 0; i < 6; ++i) {
        addr->val[i] = (uint8_t)values[i];
    }
    addr->type = BLE_ADDR_PUBLIC;
    return true;
}
