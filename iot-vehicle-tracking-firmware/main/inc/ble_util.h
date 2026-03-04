#pragma once

#include "nimble/ble.h"

#define BLE_ADDR_STR_LEN 18

const char *ble_addr_to_str(const ble_addr_t *addr, char dst[BLE_ADDR_STR_LEN]);
bool ble_addr_from_str(const char *src, ble_addr_t *addr);
