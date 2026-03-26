#include "modem_gnss.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "esp_log.h"

#include "modem_at.h"
#include "util.h"

/**
 * @file modem_gnss.c
 * @brief GNSS control/parsing implementation over modem AT interface.
 */

static const char *TAG = "MODEM_GNSS";
/* Last parsed GNSS sample used for fast fix checks. */
static gnss_data_t s_last_gnss = {0};
/* Reflects whether GNSS engine is currently powered by modem command. */
static bool s_gnss_powered = false;

/**
 * @brief Convert modem UTC timestamp string to milliseconds.
 *
 * Input format example: `20260221153045.123`.
 *
 * @param utc_string UTC timestamp string from modem.
 *
 * @return Parsed epoch-like milliseconds, or uptime fallback on parse failure.
 */
static uint64_t modem_gnss_parse_timestamp(const char *utc_string) {
    if (utc_string == NULL || strlen(utc_string) < 14) {
        return util_uptime_ms();
    }

    struct tm tm_value = {0};
    char fractional[4] = {0};

    /* Parse `YYYYMMDDhhmmss.xxx`. */
    sscanf(utc_string,
           "%4d%2d%2d%2d%2d%2d.%3s",
           &tm_value.tm_year,
           &tm_value.tm_mon,
           &tm_value.tm_mday,
           &tm_value.tm_hour,
           &tm_value.tm_min,
           &tm_value.tm_sec,
           fractional);

    /* `struct tm` expects year offset from 1900 and month 0..11. */
    tm_value.tm_year -= 1900;
    tm_value.tm_mon -= 1;

    time_t epoch = mktime(&tm_value);
    if (epoch <= 0) {
        return util_uptime_ms();
    }

    return ((uint64_t)epoch * 1000ULL) + (uint64_t)atoi(fractional);
}

/**
 * @brief Enable modem GNSS engine.
 *
 * @return ESP_OK on success, otherwise modem command error.
 */
esp_err_t modem_gnss_power_on(void) {
    esp_err_t err = modem_at_send_expect("AT+CGNSPWR=1\r", "OK", 5000);
    if (err == ESP_OK) {
        s_gnss_powered = true;
    }
    return err;
}

/**
 * @brief Disable modem GNSS engine.
 *
 * @return ESP_OK on success, otherwise modem command error.
 */
esp_err_t modem_gnss_power_off(void) {
    esp_err_t err = modem_at_send_expect("AT+CGNSPWR=0\r", "OK", 5000);
    if (err == ESP_OK) {
        s_gnss_powered = false;
    }
    return err;
}

/**
 * @brief Check whether last cached sample had valid fix.
 *
 * @return true when last fix is valid.
 */
bool modem_gnss_has_fix(void) {
    return s_last_gnss.fix_valid;
}

/**
 * @brief Query modem for GNSS sample and parse `+CGNSINF` payload.
 *
 * @param data Output GNSS sample.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_gnss_get_location(gnss_data_t *data) {
    ESP_RETURN_ON_NULL(data, ESP_ERR_INVALID_ARG, TAG, "data is NULL");
    ESP_RETURN_ON_FALSE(s_gnss_powered, ESP_ERR_INVALID_STATE, TAG, "GNSS not powered");

    /* Request GNSS information frame from modem. */
    char response[512] = {0};
    ESP_RETURN_ON_FALSE(modem_at_send("AT+CGNSINF\r", response, sizeof(response), 5000) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "AT+CGNSINF failed");

    char *marker = strstr(response, "+CGNSINF:");
    ESP_RETURN_ON_NULL(marker, ESP_FAIL, TAG, "CGNSINF marker not found");

    /* Trim line to avoid parsing trailing modem output. */
    char *line_end = strstr(marker, "\r\n");
    if (line_end != NULL) {
        *line_end = '\0';
    }

    /* Copy payload part only (after `+CGNSINF: `). */
    char line[512] = {0};
    util_copy_string(line, sizeof(line), marker + strlen("+CGNSINF: "));

    /* Tokenize CSV fields in-place. */
    char *fields[20] = {0};
    size_t field_count = 0;
    char *cursor = line;
    while (field_count < ARRAY_SIZE(fields)) {
        fields[field_count++] = cursor;
        char *comma = strchr(cursor, ',');
        if (comma == NULL) {
            break;
        }
        *comma = '\0';
        cursor = comma + 1;
    }

    ESP_RETURN_ON_FALSE(field_count >= 5, ESP_FAIL, TAG, "CGNSINF response too short");

    /* Map fields to firmware GNSS model. */
    memset(data, 0, sizeof(*data));
    data->fix_valid = field_count > 1 && fields[1] != NULL && atoi(fields[1]) == 1;
    data->latitude = field_count > 3 && fields[3] != NULL ? atof(fields[3]) : 0.0;
    data->longitude = field_count > 4 && fields[4] != NULL ? atof(fields[4]) : 0.0;
    data->speed_kmh = field_count > 6 && fields[6] != NULL ? (float)atof(fields[6]) : 0.0f;
    data->course_deg = field_count > 7 && fields[7] != NULL ? (float)atof(fields[7]) : 0.0f;

    /* Aggregate GPS + GLONASS satellites from known field positions. */
    int sat_gps = field_count > 14 && fields[14] != NULL ? atoi(fields[14]) : 0;
    int sat_glonass = field_count > 15 && fields[15] != NULL ? atoi(fields[15]) : 0;
    data->satellites = (uint8_t)(sat_gps + sat_glonass);
    data->timestamp_ms = field_count > 2 && fields[2] != NULL ? modem_gnss_parse_timestamp(fields[2]) : util_uptime_ms();

    /* Clear coordinates when fix is invalid to avoid stale-location publish. */
    if (!data->fix_valid) {
        data->latitude = 0.0;
        data->longitude = 0.0;
        data->satellites = 0;
    }

    s_last_gnss = *data;
    return ESP_OK;
}
