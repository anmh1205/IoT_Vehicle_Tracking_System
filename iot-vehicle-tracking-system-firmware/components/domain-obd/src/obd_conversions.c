#include "obd.h"

/**
 * @file obd_conversions.c
 * @brief Core OBD PID conversion helpers shared by OBD runtime policies.
 * This translation unit belongs to the OBD domain layer and keeps domain rules, staging helpers, and policy decisions separate from transport and board adapters.
 */


/**
 * @brief Convert OBD RPM payload to integer RPM.
 *
 * @param value Output RPM value.
 * @param data Source data bytes.
 * @param len Data length.
 * @return 0 on success, -1 on failure.
 */
int obd_convert_rpm(int32_t *value, const uint8_t *data, size_t len) {
    // RPM (PID 0x0C) is a 16-bit value split across two response bytes, so both must be present.
    if (value == NULL || data == NULL || len < 2) {
        return -1;
    }

    // SAE J1979 formula: ((A * 256) + B) / 4. data[0] is the high byte (A), data[1] is the low byte (B).
    // The /4 scale comes from the 0.25 rpm resolution defined by the standard.
    *value = ((data[0] << 8) | data[1]) / 4;
    return 0;
}

/**
 * @brief Convert OBD percentage payload to percentage.
 *
 * @param value Output percentage value.
 * @param data Source data bytes.
 * @param len Data length.
 * @return 0 on success, -1 on failure.
 */
int obd_convert_percent(int32_t *value, const uint8_t *data, size_t len) {
    // Percentage PIDs (e.g. fuel level, engine load) encode the value in a single byte.
    if (value == NULL || data == NULL || len < 1) {
        return -1;
    }

    // SAE J1979 formula: A * 100 / 255. A single byte 0..255 maps linearly onto 0..100 %.
    *value = (data[0] * 100) / 255;
    return 0;
}

/**
 * @brief Convert OBD temperature payload to Celsius.
 *
 * @param value Output temperature value.
 * @param data Source data bytes.
 * @param len Data length.
 * @return 0 on success, -1 on failure.
 */
int obd_convert_temperature(int32_t *value, const uint8_t *data, size_t len) {
    // Temperature PIDs (e.g. coolant) carry the value in a single byte.
    if (value == NULL || data == NULL || len < 1) {
        return -1;
    }

    // SAE J1979 formula: A - 40. The -40 offset lets a single unsigned byte span -40..215 C.
    *value = (int32_t)data[0] - 40;
    return 0;
}
