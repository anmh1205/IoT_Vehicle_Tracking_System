#include "obd.h"

/**
 * @file obd_conversions.c
 * @brief Core OBD PID conversion helpers shared by OBD runtime policies.
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
    if (value == NULL || data == NULL || len < 2) {
        return -1;
    }

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
    if (value == NULL || data == NULL || len < 1) {
        return -1;
    }

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
    if (value == NULL || data == NULL || len < 1) {
        return -1;
    }

    *value = (int32_t)data[0] - 40;
    return 0;
}
