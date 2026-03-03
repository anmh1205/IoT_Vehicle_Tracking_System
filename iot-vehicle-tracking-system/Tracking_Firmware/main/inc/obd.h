#pragma once

#include <stddef.h>
#include <stdint.h>

typedef int (*obd_conv_fn_t)(int32_t *value, const uint8_t *data, size_t len);

typedef struct {
    uint8_t pid;
    size_t len;
    const char *name;
    const char *unit;
    obd_conv_fn_t conversion;
} obd_pid_cfg_t;

int obd_convert_rpm(int32_t *value, const uint8_t *data, size_t len);
int obd_convert_percent(int32_t *value, const uint8_t *data, size_t len);
int obd_convert_temperature(int32_t *value, const uint8_t *data, size_t len);
