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

#define MODEM_GNSS_QUERY_TIMEOUT_MS 1500U
#define MODEM_GNSS_QUERY_SOFT_RETRY_COUNT 0U
#define MODEM_GNSS_QUERY_FAIL_SELF_HEAL_THRESHOLD 3U
#define MODEM_GNSS_QUERY_SELF_HEAL_COOLDOWN_MS 20000ULL
#define MODEM_GNSS_LOG_THROTTLE_MS 10000ULL
#define MODEM_GNSS_POWER_CMD_TIMEOUT_MS 3000U
#define MODEM_GNSS_POWER_DEBUG_BUF_LEN 256U
#define MODEM_GNSS_RESP_PREVIEW_LEN 160U
#define MODEM_GNSS_QUERY_PRIMARY_BACKOFF_FAIL_THRESHOLD 3U
#define MODEM_GNSS_QUERY_PRIMARY_BACKOFF_COOLDOWN_MS 60000ULL
#define MODEM_GNSS_POWER_CGPS_RESTART_DELAY_MS 2000U
#define MODEM_GNSS_NO_FIX_RECOVER_THRESHOLD 10U
#define MODEM_GNSS_NO_FIX_RECOVER_COOLDOWN_MS 180000ULL

typedef enum {
    MODEM_GNSS_READ_OK = 0,
    MODEM_GNSS_READ_TRANSPORT_FAIL,
    MODEM_GNSS_READ_PARSE_FAIL,
} modem_gnss_read_result_t;

static uint32_t s_query_fail_streak = 0;
static uint32_t s_no_fix_streak = 0;
static uint32_t s_fix_success_streak = 0;
static uint32_t s_cgnsinf_fail_streak = 0;
static bool s_use_cgps_query_only = false;
static uint64_t s_last_transport_fail_log_ms = 0;
static uint64_t s_last_parse_fail_log_ms = 0;
static uint64_t s_last_no_fix_log_ms = 0;
static uint64_t s_last_fix_success_log_ms = 0;
static uint64_t s_last_self_heal_ms = 0;
static uint64_t s_cgnsinf_backoff_until_ms = 0;
static uint64_t s_last_no_fix_recover_ms = 0;
static bool s_no_fix_recover_pending = false;
static uint64_t s_no_fix_recover_ready_ms = 0;

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

static bool modem_gnss_log_due(uint64_t *last_log_ms, uint64_t now_ms) {
    if (last_log_ms == NULL) {
        return false;
    }
    if (*last_log_ms == 0 || (now_ms - *last_log_ms) >= MODEM_GNSS_LOG_THROTTLE_MS) {
        *last_log_ms = now_ms;
        return true;
    }
    return false;
}

static void modem_gnss_prepare_response_preview(char *dst, size_t dst_size, const char *src) {
    if (dst == NULL || dst_size == 0) {
        return;
    }

    if (src == NULL) {
        util_copy_string(dst, dst_size, "<null>");
        return;
    }

    size_t src_len = strlen(src);
    size_t copy_len = src_len < (dst_size - 1U) ? src_len : (dst_size - 1U);
    for (size_t i = 0; i < copy_len; ++i) {
        char c = src[i];
        if (c == '\r' || c == '\n' || c == '\t') {
            dst[i] = ' ';
        } else {
            dst[i] = c;
        }
    }
    dst[copy_len] = '\0';
}

static void modem_gnss_log_command_response(const char *command, esp_err_t err, const char *response) {
    char preview[MODEM_GNSS_RESP_PREVIEW_LEN] = {0};
    modem_gnss_prepare_response_preview(preview, sizeof(preview), response);
    ESP_LOGI(TAG, "GNSS cmd=%s err=%s resp=%s", command, esp_err_to_name(err), preview);
}

static uint64_t modem_gnss_parse_cgpsinfo_timestamp(const char *date_ddmmyy, const char *time_hhmmss) {
    if (date_ddmmyy == NULL || time_hhmmss == NULL || strlen(date_ddmmyy) < 6 || strlen(time_hhmmss) < 6) {
        return util_uptime_ms();
    }

    int day = 0;
    int month = 0;
    int year = 0;
    int hour = 0;
    int minute = 0;
    int second = 0;

    if (sscanf(date_ddmmyy, "%2d%2d%2d", &day, &month, &year) != 3) {
        return util_uptime_ms();
    }
    if (sscanf(time_hhmmss, "%2d%2d%2d", &hour, &minute, &second) != 3) {
        return util_uptime_ms();
    }

    struct tm tm_value = {0};
    tm_value.tm_mday = day;
    tm_value.tm_mon = month - 1;
    tm_value.tm_year = (2000 + year) - 1900;
    tm_value.tm_hour = hour;
    tm_value.tm_min = minute;
    tm_value.tm_sec = second;

    time_t epoch = mktime(&tm_value);
    if (epoch <= 0) {
        return util_uptime_ms();
    }
    return (uint64_t)epoch * 1000ULL;
}

static bool modem_gnss_parse_nmea_degrees(const char *value, char hemisphere, double *out_decimal) {
    if (value == NULL || out_decimal == NULL || value[0] == '\0') {
        return false;
    }

    double raw = atof(value);
    if (raw <= 0.0) {
        return false;
    }

    int degrees = (int)(raw / 100.0);
    double minutes = raw - ((double)degrees * 100.0);
    double decimal = (double)degrees + (minutes / 60.0);

    if (hemisphere == 'S' || hemisphere == 's' || hemisphere == 'W' || hemisphere == 'w') {
        decimal = -decimal;
    }

    *out_decimal = decimal;
    return true;
}

static modem_gnss_read_result_t modem_gnss_send_cgpsinfo_and_parse(gnss_data_t *data) {
    char response[512] = {0};
    esp_err_t err = ESP_FAIL;

    for (uint32_t attempt = 0; attempt <= MODEM_GNSS_QUERY_SOFT_RETRY_COUNT; ++attempt) {
        memset(response, 0, sizeof(response));
        err = modem_at_send("AT+CGPSINFO\r",
                            response,
                            sizeof(response),
                            MODEM_GNSS_QUERY_TIMEOUT_MS);

        ESP_LOGI(TAG, "GNSS fallback query attempt=%lu cmd=AT+CGPSINFO", (unsigned long)(attempt + 1U));
        modem_gnss_log_command_response("AT+CGPSINFO", err, response);

        if (err == ESP_OK) {
            break;
        }
    }

    if (err != ESP_OK) {
        return MODEM_GNSS_READ_TRANSPORT_FAIL;
    }

    char *marker = strstr(response, "+CGPSINFO:");
    if (marker == NULL) {
        ESP_LOGW(TAG, "GNSS fallback parse failed: +CGPSINFO marker missing");
        return MODEM_GNSS_READ_PARSE_FAIL;
    }

    char *line_end = strstr(marker, "\r\n");
    if (line_end != NULL) {
        *line_end = '\0';
    }

    char line[512] = {0};
    util_copy_string(line, sizeof(line), marker + strlen("+CGPSINFO: "));

    char *fields[16] = {0};
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

    if (field_count < 4) {
        ESP_LOGW(TAG, "GNSS fallback parse failed: field_count=%u", (unsigned)field_count);
        return MODEM_GNSS_READ_PARSE_FAIL;
    }

    memset(data, 0, sizeof(*data));
    bool has_lat = fields[0] != NULL && fields[0][0] != '\0';
    bool has_lon = fields[2] != NULL && fields[2][0] != '\0';
    bool has_lat_hemi = fields[1] != NULL && fields[1][0] != '\0';
    bool has_lon_hemi = fields[3] != NULL && fields[3][0] != '\0';

    if (!has_lat || !has_lon || !has_lat_hemi || !has_lon_hemi) {
        data->fix_valid = false;
        data->timestamp_ms = (field_count > 5) ? modem_gnss_parse_cgpsinfo_timestamp(fields[4], fields[5]) : util_uptime_ms();
        ESP_LOGI(TAG, "GNSS fallback AT+CGPSINFO reports no-fix");
        return MODEM_GNSS_READ_OK;
    }

    double latitude = 0.0;
    double longitude = 0.0;
    if (!modem_gnss_parse_nmea_degrees(fields[0], fields[1][0], &latitude) ||
        !modem_gnss_parse_nmea_degrees(fields[2], fields[3][0], &longitude)) {
        ESP_LOGW(TAG, "GNSS fallback parse failed: invalid lat/lon format");
        return MODEM_GNSS_READ_PARSE_FAIL;
    }

    data->fix_valid = true;
    data->latitude = latitude;
    data->longitude = longitude;
    data->satellites = 1;
    data->timestamp_ms = (field_count > 5) ? modem_gnss_parse_cgpsinfo_timestamp(fields[4], fields[5]) : util_uptime_ms();
    data->speed_kmh = (field_count > 7 && fields[7] != NULL && fields[7][0] != '\0') ? (float)(atof(fields[7]) * 1.852f) : 0.0f;
    data->course_deg = (field_count > 8 && fields[8] != NULL && fields[8][0] != '\0') ? (float)atof(fields[8]) : 0.0f;

    ESP_LOGI(TAG,
             "GNSS fallback fix lat=%.6f lon=%.6f speed_kmh=%.2f",
             data->latitude,
             data->longitude,
             data->speed_kmh);
    return MODEM_GNSS_READ_OK;
}

static modem_gnss_read_result_t modem_gnss_send_and_parse(gnss_data_t *data) {
    char response[512] = {0};
    bool transport_ok = false;
    esp_err_t last_err = ESP_FAIL;

    for (uint32_t attempt = 0; attempt <= MODEM_GNSS_QUERY_SOFT_RETRY_COUNT; ++attempt) {
        memset(response, 0, sizeof(response));
        last_err = modem_at_send("AT+CGNSINF\r",
                                 response,
                                 sizeof(response),
                                 MODEM_GNSS_QUERY_TIMEOUT_MS);

        ESP_LOGI(TAG, "GNSS query attempt=%lu cmd=AT+CGNSINF", (unsigned long)(attempt + 1U));
        modem_gnss_log_command_response("AT+CGNSINF", last_err, response);

        if (last_err == ESP_OK) {
            transport_ok = true;
            break;
        }
    }

    if (!transport_ok) {
        return MODEM_GNSS_READ_TRANSPORT_FAIL;
    }

    char *marker = strstr(response, "+CGNSINF:");
    if (marker == NULL) {
        ESP_LOGW(TAG, "GNSS parse failed: +CGNSINF marker missing");
        return MODEM_GNSS_READ_PARSE_FAIL;
    }

    char *line_end = strstr(marker, "\r\n");
    if (line_end != NULL) {
        *line_end = '\0';
    }

    char line[512] = {0};
    util_copy_string(line, sizeof(line), marker + strlen("+CGNSINF: "));

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

    if (field_count < 5) {
        ESP_LOGW(TAG, "GNSS parse failed: field_count=%u", (unsigned)field_count);
        return MODEM_GNSS_READ_PARSE_FAIL;
    }

    memset(data, 0, sizeof(*data));
    data->fix_valid = field_count > 1 && fields[1] != NULL && atoi(fields[1]) == 1;
    data->latitude = field_count > 3 && fields[3] != NULL ? atof(fields[3]) : 0.0;
    data->longitude = field_count > 4 && fields[4] != NULL ? atof(fields[4]) : 0.0;
    data->speed_kmh = field_count > 6 && fields[6] != NULL ? (float)atof(fields[6]) : 0.0f;
    data->course_deg = field_count > 7 && fields[7] != NULL ? (float)atof(fields[7]) : 0.0f;

    int sat_gps = field_count > 14 && fields[14] != NULL ? atoi(fields[14]) : 0;
    int sat_glonass = field_count > 15 && fields[15] != NULL ? atoi(fields[15]) : 0;
    data->satellites = (uint8_t)(sat_gps + sat_glonass);
    data->timestamp_ms = field_count > 2 && fields[2] != NULL ? modem_gnss_parse_timestamp(fields[2]) : util_uptime_ms();

    if (!data->fix_valid) {
        data->latitude = 0.0;
        data->longitude = 0.0;
        data->satellites = 0;
    }

    return MODEM_GNSS_READ_OK;
}

static bool modem_gnss_try_self_heal(uint64_t now_ms) {
    if (s_last_self_heal_ms != 0 && (now_ms - s_last_self_heal_ms) < MODEM_GNSS_QUERY_SELF_HEAL_COOLDOWN_MS) {
        return false;
    }

    s_last_self_heal_ms = now_ms;
    esp_err_t power_off_err = modem_gnss_power_off();
    esp_err_t power_on_err = modem_gnss_power_on();

    if (power_off_err != ESP_OK || power_on_err != ESP_OK) {
        ESP_LOGW(TAG,
                 "GNSS self-heal failed off=%s on=%s",
                 esp_err_to_name(power_off_err),
                 esp_err_to_name(power_on_err));
        return false;
    }

    ESP_LOGW(TAG, "GNSS self-heal repower executed");
    return true;
}

static bool modem_gnss_try_no_fix_recover(uint64_t now_ms) {
    if (s_no_fix_recover_pending) {
        if (now_ms < s_no_fix_recover_ready_ms) {
            return false;
        }

        esp_err_t on_err = modem_gnss_power_on();
        if (on_err != ESP_OK) {
            ESP_LOGW(TAG, "GNSS no-fix recover power-on failed err=%s", esp_err_to_name(on_err));
            return false;
        }

        s_no_fix_recover_pending = false;
        s_last_no_fix_recover_ms = now_ms;
        ESP_LOGW(TAG, "GNSS no-fix recover repower executed");
        return true;
    }

    if (s_last_no_fix_recover_ms != 0 &&
        (now_ms - s_last_no_fix_recover_ms) < MODEM_GNSS_NO_FIX_RECOVER_COOLDOWN_MS) {
        return false;
    }

    esp_err_t off_err = modem_gnss_power_off();
    if (off_err != ESP_OK) {
        ESP_LOGW(TAG, "GNSS no-fix recover power-off failed err=%s", esp_err_to_name(off_err));
        return false;
    }

    s_no_fix_recover_pending = true;
    s_no_fix_recover_ready_ms = now_ms + MODEM_GNSS_POWER_CGPS_RESTART_DELAY_MS;
    ESP_LOGW(TAG,
             "GNSS no-fix recover stage=power-off done; power-on due in %u ms",
             (unsigned)MODEM_GNSS_POWER_CGPS_RESTART_DELAY_MS);
    return false;
}

/**
 * @brief Enable modem GNSS engine.
 *
 * @return ESP_OK on success, otherwise modem command error.
 */
esp_err_t modem_gnss_power_on(void) {
    char response[MODEM_GNSS_POWER_DEBUG_BUF_LEN] = {0};

    s_use_cgps_query_only = false;
    s_cgnsinf_fail_streak = 0;
    s_cgnsinf_backoff_until_ms = 0;

    ESP_LOGI(TAG, "GNSS power-on sequence start");
    esp_err_t err = modem_at_send("AT+CGNSPWR=1\r", response, sizeof(response), MODEM_GNSS_POWER_CMD_TIMEOUT_MS);
    modem_gnss_log_command_response("AT+CGNSPWR=1", err, response);
    if (err == ESP_OK && strstr(response, "OK") != NULL) {
        s_gnss_powered = true;
        ESP_LOGI(TAG, "GNSS power-on accepted via CGNSPWR=1");
        return ESP_OK;
    }

    memset(response, 0, sizeof(response));
    err = modem_at_send("AT+CGNSPWR?\r", response, sizeof(response), MODEM_GNSS_POWER_CMD_TIMEOUT_MS);
    modem_gnss_log_command_response("AT+CGNSPWR?", err, response);
    if (err == ESP_OK && strstr(response, "+CGNSPWR: 1") != NULL) {
        s_gnss_powered = true;
        ESP_LOGW(TAG, "GNSS power-on fallback accepted via CGNSPWR? state=1");
        return ESP_OK;
    }

    memset(response, 0, sizeof(response));
    err = modem_at_send("AT+CGPS=1\r", response, sizeof(response), MODEM_GNSS_POWER_CMD_TIMEOUT_MS);
    modem_gnss_log_command_response("AT+CGPS=1", err, response);
    if (err == ESP_OK && strstr(response, "OK") != NULL) {
        s_gnss_powered = true;
        s_use_cgps_query_only = true;
        ESP_LOGW(TAG, "GNSS power-on fallback accepted via CGPS=1 (query mode=CGPSINFO)");
        return ESP_OK;
    }


    memset(response, 0, sizeof(response));
    err = modem_at_send("AT+CGPS?\r", response, sizeof(response), MODEM_GNSS_POWER_CMD_TIMEOUT_MS);
    modem_gnss_log_command_response("AT+CGPS?", err, response);
    if (err == ESP_OK && strstr(response, "+CGPS: 1") != NULL) {
        s_gnss_powered = true;
        s_use_cgps_query_only = true;
        ESP_LOGW(TAG, "GNSS power-on fallback accepted via CGPS? state=1 (query mode=CGPSINFO)");
        return ESP_OK;
    }

    ESP_LOGW(TAG, "GNSS power-on sequence failed");
    return ESP_FAIL;
}

/**
 * @brief Disable modem GNSS engine.
 *
 * @return ESP_OK on success, otherwise modem command error.
 */
esp_err_t modem_gnss_power_off(void) {
    esp_err_t err = modem_at_send_expect("AT+CGNSPWR=0\r", "OK", MODEM_GNSS_POWER_CMD_TIMEOUT_MS);
    if (err == ESP_OK) {
        s_gnss_powered = false;
        return ESP_OK;
    }

    err = modem_at_send_expect("AT+CGPS=0\r", "OK", MODEM_GNSS_POWER_CMD_TIMEOUT_MS);
    if (err == ESP_OK) {
        s_gnss_powered = false;
        ESP_LOGW(TAG, "GNSS power-off fallback accepted via CGPS=0");
        return ESP_OK;
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

    uint64_t now_ms = util_uptime_ms();
    if (s_no_fix_recover_pending) {
        (void)modem_gnss_try_no_fix_recover(now_ms);
    }

    if (!s_gnss_powered) {
        return ESP_FAIL;
    }
    bool cgnsinf_backoff_active =
        (s_cgnsinf_backoff_until_ms != 0) &&
        (now_ms < s_cgnsinf_backoff_until_ms);

    modem_gnss_read_result_t result = MODEM_GNSS_READ_TRANSPORT_FAIL;
    if (s_use_cgps_query_only) {
        result = modem_gnss_send_cgpsinfo_and_parse(data);
    } else if (!cgnsinf_backoff_active) {
        result = modem_gnss_send_and_parse(data);
        if (result == MODEM_GNSS_READ_OK) {
            s_cgnsinf_fail_streak = 0;
        } else {
            s_cgnsinf_fail_streak += 1;
            if (s_cgnsinf_fail_streak >= MODEM_GNSS_QUERY_PRIMARY_BACKOFF_FAIL_THRESHOLD) {
                s_cgnsinf_backoff_until_ms = now_ms + MODEM_GNSS_QUERY_PRIMARY_BACKOFF_COOLDOWN_MS;
                ESP_LOGW(TAG,
                         "GNSS primary AT+CGNSINF backoff active fail_streak=%lu cooldown_ms=%llu",
                         (unsigned long)s_cgnsinf_fail_streak,
                         (unsigned long long)MODEM_GNSS_QUERY_PRIMARY_BACKOFF_COOLDOWN_MS);
            }

            ESP_LOGW(TAG, "GNSS primary query failed, trying fallback AT+CGPSINFO");
            result = modem_gnss_send_cgpsinfo_and_parse(data);
            if (result == MODEM_GNSS_READ_OK) {
                s_use_cgps_query_only = true;
                s_cgnsinf_fail_streak = 0;
                s_cgnsinf_backoff_until_ms = 0;
                ESP_LOGW(TAG, "GNSS query mode switched to CGPSINFO after primary CGNSINF failure");
            }
        }
    } else {
        ESP_LOGI(TAG,
                 "GNSS primary query skipped by backoff remaining_ms=%llu",
                 (unsigned long long)(s_cgnsinf_backoff_until_ms - now_ms));
        result = modem_gnss_send_cgpsinfo_and_parse(data);
    }

    if (result != MODEM_GNSS_READ_OK) {
        s_query_fail_streak += 1;
        s_no_fix_streak = 0;
        s_fix_success_streak = 0;

        if (result == MODEM_GNSS_READ_TRANSPORT_FAIL) {
            if (modem_gnss_log_due(&s_last_transport_fail_log_ms, now_ms)) {
                ESP_LOGW(TAG,
                         "GNSS transport fail streak=%lu",
                         (unsigned long)s_query_fail_streak);
            }
        } else if (modem_gnss_log_due(&s_last_parse_fail_log_ms, now_ms)) {
            ESP_LOGW(TAG,
                     "GNSS parse fail streak=%lu",
                     (unsigned long)s_query_fail_streak);
        }

        if (s_query_fail_streak >= MODEM_GNSS_QUERY_FAIL_SELF_HEAL_THRESHOLD) {
            if (modem_gnss_try_self_heal(now_ms)) {
                s_cgnsinf_fail_streak = 0;
                s_cgnsinf_backoff_until_ms = 0;

                if (s_use_cgps_query_only) {
                    result = modem_gnss_send_cgpsinfo_and_parse(data);
                } else {
                    result = modem_gnss_send_and_parse(data);
                    if (result != MODEM_GNSS_READ_OK) {
                        s_cgnsinf_fail_streak += 1;
                        ESP_LOGW(TAG, "GNSS primary query still failed after self-heal, trying fallback AT+CGPSINFO");
                        result = modem_gnss_send_cgpsinfo_and_parse(data);
                        if (result == MODEM_GNSS_READ_OK) {
                            s_use_cgps_query_only = true;
                            s_cgnsinf_fail_streak = 0;
                            s_cgnsinf_backoff_until_ms = 0;
                            ESP_LOGW(TAG, "GNSS query mode switched to CGPSINFO after self-heal fallback success");
                        }
                    }
                }
                if (result == MODEM_GNSS_READ_OK) {
                    s_query_fail_streak = 0;
                }
            }
        }

        if (result != MODEM_GNSS_READ_OK) {
            return ESP_FAIL;
        }
    }

    s_query_fail_streak = 0;
    if (data->fix_valid && data->latitude != 0.0 && data->longitude != 0.0 && data->satellites > 0) {
        s_fix_success_streak += 1;
        s_no_fix_streak = 0;
        if (modem_gnss_log_due(&s_last_fix_success_log_ms, now_ms)) {
            ESP_LOGI(TAG,
                     "GNSS fix success lat=%.6f lon=%.6f sat=%u streak=%lu",
                     data->latitude,
                     data->longitude,
                     (unsigned)data->satellites,
                     (unsigned long)s_fix_success_streak);
        }
    } else {
        s_no_fix_streak += 1;
        s_fix_success_streak = 0;
        if (modem_gnss_log_due(&s_last_no_fix_log_ms, now_ms)) {
            ESP_LOGI(TAG,
                     "GNSS no-fix streak=%lu fix_valid=%d",
                     (unsigned long)s_no_fix_streak,
                     data->fix_valid ? 1 : 0);
        }

        if (s_no_fix_streak >= MODEM_GNSS_NO_FIX_RECOVER_THRESHOLD) {
            if (modem_gnss_try_no_fix_recover(now_ms)) {
                s_no_fix_streak = 0;
                s_query_fail_streak = 0;
                ESP_LOGW(TAG,
                         "GNSS no-fix recovery triggered threshold=%u",
                         (unsigned)MODEM_GNSS_NO_FIX_RECOVER_THRESHOLD);
            }
        }
    }

    s_last_gnss = *data;
    return ESP_OK;
}
