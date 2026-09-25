#pragma once

#include <stddef.h>
#include <stdint.h>

/**
 * @file obd.h
 * @brief OBD PID conversion helpers and metadata.
 * This header belongs to the OBD domain layer and defines the conversion and model boundary that runtime code uses without duplicating OBD math.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Conversion callback signature for raw OBD response bytes.
 *
 * @param value Output converted value.
 * @param data Raw response bytes without mode/pid header.
 * @param len Length of `data`.
 *
 * @return 0 on success, -1 on invalid input.
 */
typedef int (*obd_conv_fn_t)(int32_t *value, const uint8_t *data, size_t len);

/**
 * @brief OBD PID metadata and conversion description.
 */
typedef struct {
    /** PID identifier. */
    uint8_t pid;
    /** Expected payload length. */
    size_t len;
    /** Human-readable signal name. */
    const char *name;
    /** Unit string (rpm, %, C, ...). */
    const char *unit;
    /** Conversion callback for this PID. */
    obd_conv_fn_t conversion;
} obd_pid_cfg_t;

/**
 * @brief Convert PID 0x0C response to RPM.
 *
 * @param value Output RPM.
 * @param data PID payload bytes.
 * @param len Payload length.
 *
 * @return 0 on success, -1 on invalid input.
 */
int obd_convert_rpm(int32_t *value, const uint8_t *data, size_t len);

/**
 * @brief Convert PID percentage format to integer percent.
 *
 * @param value Output percentage.
 * @param data PID payload bytes.
 * @param len Payload length.
 *
 * @return 0 on success, -1 on invalid input.
 */
int obd_convert_percent(int32_t *value, const uint8_t *data, size_t len);

/**
 * @brief Convert PID temperature format to Celsius.
 *
 * @param value Output temperature in Celsius.
 * @param data PID payload bytes.
 * @param len Payload length.
 *
 * @return 0 on success, -1 on invalid input.
 */
int obd_convert_temperature(int32_t *value, const uint8_t *data, size_t len);
