#include "modem_gnss.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "esp_log.h"

#include "modem_at.h"
#include "telemetry_counters.h"
#include "util.h"

/**
 * @file modem_gnss.c
 * @brief GNSS control/parsing implementation over modem AT interface.
 * This translation unit belongs to the SIM7600 AT modem adapter layer and keeps adapter-local state, protocol sequencing, and recovery policy isolated behind the exported entry points.
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
#define MODEM_GNSS_QUERY_READY_HOT_START_MS 1500U
#define MODEM_GNSS_QUERY_READY_COLD_START_MS 5000U
#define MODEM_GNSS_QUERY_READY_RESUME_MS 0U
#define MODEM_GNSS_HOT_START_OFF_WINDOW_MS 5000ULL

/* Outcome of one GNSS read attempt, used to choose between fallback and recovery. */
typedef enum {
    MODEM_GNSS_READ_OK = 0,             /**< Reply received and parsed (fix may still be invalid). */
    MODEM_GNSS_READ_TRANSPORT_FAIL,     /**< Modem returned no usable reply (AT transport problem). */
    MODEM_GNSS_READ_PARSE_FAIL,         /**< Reply received but the payload could not be parsed. */
} modem_gnss_read_result_t;

/* Consecutive query failure count for self-heal decision. */
static uint32_t s_query_fail_streak = 0;
/* Consecutive no-fix count for recovery decision. */
static uint32_t s_no_fix_streak = 0;
/* Consecutive fix success count for stability tracking. */
static uint32_t s_fix_success_streak = 0;
/* Consecutive +CGNINF command failure count. */
static uint32_t s_cgnsinf_fail_streak = 0;
/* Flag to use +CGPS query only (bypass +CGNINF). */
static bool s_use_cgps_query_only = false;
/* Timestamp of last transport failure log. */
static uint64_t s_last_transport_fail_log_ms = 0;
/* Timestamp of last parse failure log. */
static uint64_t s_last_parse_fail_log_ms = 0;
/* Timestamp of last no-fix log. */
static uint64_t s_last_no_fix_log_ms = 0;
/* Timestamp of last fix success log. */
static uint64_t s_last_fix_success_log_ms = 0;
/* Timestamp of last self-heal action. */
static uint64_t s_last_self_heal_ms = 0;
/* Backoff deadline for +CGNINF queries. */
static uint64_t s_cgnsinf_backoff_until_ms = 0;
/* Timestamp of last no-fix recovery attempt. */
static uint64_t s_last_no_fix_recover_ms = 0;
/* Flag indicating no-fix recovery is pending. */
static bool s_no_fix_recover_pending = false;
/* Timestamp when no-fix recovery becomes ready. */
static uint64_t s_no_fix_recover_ready_ms = 0;
/* Timestamp of last GNSS power-off. */
static uint64_t s_last_power_off_ms = 0;
/* Timestamp when GNSS query becomes ready. */
static uint64_t s_query_ready_ms = 0;

/**
 * @brief Convert modem UTC timestamp string to milliseconds.
 *
 * Input format example: `20260221153045.123`.
 * Uses manual UTC conversion to avoid mktime() timezone dependency.
 *
 * @param utc_string UTC timestamp string from modem.
 *
 * @return Parsed epoch milliseconds (UTC), or uptime fallback on parse failure.
 */
static uint64_t modem_gnss_parse_timestamp(const char *utc_string) {
    // Need at least YYYYMMDDhhmmss (14 chars); shorter strings fall back to monotonic uptime.
    if (utc_string == NULL || strlen(utc_string) < 14) {
        return util_uptime_ms();
    }

    int year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0;
    char fractional[4] = {0};

    // CGNSINF timestamp layout: YYYYMMDDhhmmss.sss (fractional seconds optional).
    sscanf(utc_string,
           "%4d%2d%2d%2d%2d%2d.%3s",
           &year, &month, &day, &hour, &minute, &second, fractional);

    // Reject impossible calendar/clock fields rather than emitting a bogus epoch.
    if (year < 1970 || month < 1 || month > 12 || day < 1 || day > 31 ||
        hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
        return util_uptime_ms();
    }

    /* Manual UTC epoch calculation — avoids mktime() timezone dependency. */
    uint64_t days = 0;
    // Sum whole days for every full year since 1970, accounting for leap years.
    for (int y = 1970; y < year; ++y) {
        days += ((y % 4 == 0 && y % 100 != 0) || (y % 400 == 0)) ? 366ULL : 365ULL;
    }
    static const uint8_t mdays[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    // Add days for each elapsed month this year, adding the leap day in February when applicable.
    for (int m = 1; m < month; ++m) {
        days += mdays[m - 1];
        if (m == 2 && ((year % 4 == 0 && year % 100 != 0) || (year % 400 == 0))) {
            days += 1;
        }
    }
    days += (uint64_t)(day - 1);  // Days elapsed within the current month.

    // Convert accumulated days + time-of-day into seconds since the Unix epoch.
    uint64_t epoch_s = days * 86400ULL + (uint64_t)hour * 3600ULL +
                       (uint64_t)minute * 60ULL + (uint64_t)second;

    // Parse optional fractional seconds (milliseconds), clamping out-of-range values.
    long frac_ms = 0;
    if (fractional[0] != '\0') {
        char *end = NULL;
        frac_ms = strtol(fractional, &end, 10);
        if (frac_ms < 0 || frac_ms > 999) {
            frac_ms = 0;
        }
    }

    return epoch_s * 1000ULL + (uint64_t)frac_ms;
}

/**
 * @brief Check if log is due based on throttle interval.
 *
 * @param last_log_ms Last log timestamp.
 * @param now_ms Current time.
 * @return True if logging is allowed.
 */
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

/**
 * @brief Log GNSS command and response.
 *
 * @param command AT command.
 * @param err Error code.
 * @param response Response buffer.
 */
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
        dst[i] = (c == '\r' || c == '\n' || c == '\t') ? ' ' : c;
    }
    dst[copy_len] = '\0';
}

static void modem_gnss_log_command_response(const char *command, esp_err_t err, const char *response) {
    char preview[MODEM_GNSS_RESP_PREVIEW_LEN] = {0};
    modem_gnss_prepare_response_preview(preview, sizeof(preview), response);
    ESP_LOGD(TAG, "event=gnss_cmd_response cmd=%s err=%s resp=%s", command, esp_err_to_name(err), preview);
}

/**
 * @brief Calculate query ready delay based on power state.
 *
 * @param known_power_off Whether power was off.
 * @param off_duration_ms Duration of power off.
 * @param resumed_session Whether resuming session.
 * @return Delay in ms.
 */
static uint32_t modem_gnss_query_ready_delay_ms(bool known_power_off, uint64_t off_duration_ms, bool resumed_session) {
    if (resumed_session) {
        return MODEM_GNSS_QUERY_READY_RESUME_MS;
    }

    if (known_power_off && off_duration_ms <= MODEM_GNSS_HOT_START_OFF_WINDOW_MS) {
        return MODEM_GNSS_QUERY_READY_HOT_START_MS;
    }

    return MODEM_GNSS_QUERY_READY_COLD_START_MS;
}

/**
 * @brief Arm query ready window after power on.
 *
 * @param start_path Start path name.
 * @param known_power_off Whether power was off.
 * @param off_duration_ms Off duration.
 * @param resumed_session Whether resuming session.
 */
static void modem_gnss_arm_query_ready_window(const char *start_path,
                                              bool known_power_off,
                                              uint64_t off_duration_ms,
                                              bool resumed_session) {
    uint64_t now_ms = util_uptime_ms();
    uint32_t delay_ms = modem_gnss_query_ready_delay_ms(known_power_off, off_duration_ms, resumed_session);
    s_query_ready_ms = now_ms + delay_ms;

    if (known_power_off) {
        ESP_LOGI(TAG,
                 "event=gnss_startup_gate path=%s off_ms=%llu first_query_in_ms=%u",
                 start_path,
                 (unsigned long long)off_duration_ms,
                 (unsigned)delay_ms);
        return;
    }

    ESP_LOGI(TAG,
             "event=gnss_startup_gate path=%s off_ms=unknown first_query_in_ms=%u",
             start_path,
             (unsigned)delay_ms);
}

/**
 * @brief Parse a CGPSINFO date+time pair into UTC epoch milliseconds.
 *
 * @param date_ddmmyy Date field in ddmmyy form.
 * @param time_hhmmss Time field in hhmmss(.s) form.
 * @return Epoch milliseconds (UTC), or uptime fallback on malformed input.
 */
static uint64_t modem_gnss_parse_cgpsinfo_timestamp(const char *date_ddmmyy, const char *time_hhmmss) {
    // CGPSINFO splits date/time into two fields: ddmmyy and hhmmss(.s). Both must be present.
    if (date_ddmmyy == NULL || time_hhmmss == NULL || strlen(date_ddmmyy) < 6 || strlen(time_hhmmss) < 6) {
        return util_uptime_ms();
    }

    int day = 0;
    int month = 0;
    int year = 0;
    int hour = 0;
    int minute = 0;
    int second = 0;

    // Date arrives as ddmmyy (two-digit year); time as hhmmss.
    if (sscanf(date_ddmmyy, "%2d%2d%2d", &day, &month, &year) != 3) {
        return util_uptime_ms();
    }
    if (sscanf(time_hhmmss, "%2d%2d%2d", &hour, &minute, &second) != 3) {
        return util_uptime_ms();
    }

    int full_year = 2000 + year;  // Two-digit GNSS year is relative to 2000.
    if (full_year < 1970 || month < 1 || month > 12 || day < 1 || day > 31 ||
        hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
        return util_uptime_ms();
    }

    /* Manual UTC epoch calculation — avoids mktime() timezone dependency. */
    uint64_t days = 0;
    for (int y = 1970; y < full_year; ++y) {
        days += ((y % 4 == 0 && y % 100 != 0) || (y % 400 == 0)) ? 366ULL : 365ULL;
    }
    static const uint8_t mdays[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    for (int m = 1; m < month; ++m) {
        days += mdays[m - 1];
        if (m == 2 && ((full_year % 4 == 0 && full_year % 100 != 0) || (full_year % 400 == 0))) {
            days += 1;
        }
    }
    days += (uint64_t)(day - 1);

    uint64_t epoch_s = days * 86400ULL + (uint64_t)hour * 3600ULL +
                       (uint64_t)minute * 60ULL + (uint64_t)second;
    return epoch_s * 1000ULL;
}

/**
 * @brief Convert an NMEA ddmm.mmmm coordinate plus hemisphere into signed decimal degrees.
 *
 * NMEA encodes coordinates as degrees*100 + minutes (e.g. "4807.038" = 48 deg 7.038 min).
 * The hemisphere letter (N/S/E/W) determines the sign (S/W are negative).
 *
 * @param value NMEA coordinate string (ddmm.mmmm / dddmm.mmmm).
 * @param hemisphere Hemisphere character: N/S/E/W.
 * @param out_decimal Output signed decimal degrees.
 * @return true if a positive, well-formed value was converted; false otherwise.
 */
static bool modem_gnss_parse_nmea_degrees(const char *value, char hemisphere, double *out_decimal) {
    if (value == NULL || out_decimal == NULL || value[0] == '\0') {
        return false;
    }

    double raw = atof(value);
    if (raw <= 0.0) {
        return false;  // Empty/zero coordinate means no usable fix component.
    }

    // Split the combined ddmm.mmmm value: integer degrees are the hundreds part, the rest is minutes.
    int degrees = (int)(raw / 100.0);
    double minutes = raw - ((double)degrees * 100.0);
    double decimal = (double)degrees + (minutes / 60.0);  // 60 minutes per degree.

    // Southern / Western hemispheres are negative in decimal-degree convention.
    if (hemisphere == 'S' || hemisphere == 's' || hemisphere == 'W' || hemisphere == 'w') {
        decimal = -decimal;
    }

    *out_decimal = decimal;
    return true;
}

/**
 * @brief Run the legacy CGPSINFO query path and parse its NMEA-style CSV reply.
 *
 * Used as the simpler fallback when CGNSINF is unavailable or has been demoted.
 * Distinguishes transport failure (no usable reply) from parse failure (reply but
 * malformed) and from a valid "alive but no fix" frame.
 *
 * @param data Output GNSS sample.
 * @return Read result classification (OK / transport fail / parse fail).
 */
static modem_gnss_read_result_t modem_gnss_send_cgpsinfo_and_parse(gnss_data_t *data) {
    char response[512] = {0};
    esp_err_t err = ESP_FAIL;

    for (uint32_t attempt = 0; attempt <= MODEM_GNSS_QUERY_SOFT_RETRY_COUNT; ++attempt) {
        // Clear each retry buffer so partial UART leftovers never masquerade as a valid fallback frame.
        memset(response, 0, sizeof(response));
        err = modem_at_send("AT+CGPSINFO\r",
                            response,
                            sizeof(response),
                            MODEM_GNSS_QUERY_TIMEOUT_MS);

        ESP_LOGD(TAG, "event=gnss_fallback_query_attempt attempt=%lu cmd=AT+CGPSINFO", (unsigned long)(attempt + 1U));
        modem_gnss_log_command_response("AT+CGPSINFO", err, response);

        if (err == ESP_OK) {
            break;
        }
    }

    if (err != ESP_OK) {
        // If the modem never returned a usable frame, treat this as transport failure rather than bad GNSS content.
        return MODEM_GNSS_READ_TRANSPORT_FAIL;
    }

    // CGPSINFO is parsed from its URC-style prefix instead of assuming the payload starts at buffer offset zero.
    char *marker = strstr(response, "+CGPSINFO:");
    if (marker == NULL) {
        ESP_LOGW(TAG, "event=gnss_fallback_parse_failed reason=cgpsinfo_marker_missing");
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
        // Tokenize the modem CSV in-place so later field checks can work on stable NUL-terminated spans.
        fields[field_count++] = cursor;
        char *comma = strchr(cursor, ',');
        if (comma == NULL) {
            break;
        }
        *comma = '\0';
        cursor = comma + 1;
    }

    if (field_count < 4) {
        ESP_LOGW(TAG, "event=gnss_fallback_parse_failed reason=field_count field_count=%u", (unsigned)field_count);
        return MODEM_GNSS_READ_PARSE_FAIL;
    }

    memset(data, 0, sizeof(*data));
    bool has_lat = fields[0] != NULL && fields[0][0] != '\0';
    bool has_lon = fields[2] != NULL && fields[2][0] != '\0';
    bool has_lat_hemi = fields[1] != NULL && fields[1][0] != '\0';
    bool has_lon_hemi = fields[3] != NULL && fields[3][0] != '\0';

    if (!has_lat || !has_lon || !has_lat_hemi || !has_lon_hemi) {
        // CGPSINFO reports empty coordinate slots when GNSS is alive but still has no fix; that is not a parse error.
        data->fix_valid = false;
        data->query_mode = GNSS_QUERY_MODE_CGPSINFO;
        data->timestamp_ms = (field_count > 5) ? modem_gnss_parse_cgpsinfo_timestamp(fields[4], fields[5]) : util_uptime_ms();
        ESP_LOGD(TAG, "event=gnss_fallback_no_fix source=AT+CGPSINFO");
        return MODEM_GNSS_READ_OK;
    }

    double latitude = 0.0;
    double longitude = 0.0;
    if (!modem_gnss_parse_nmea_degrees(fields[0], fields[1][0], &latitude) ||
        !modem_gnss_parse_nmea_degrees(fields[2], fields[3][0], &longitude)) {
        // Once coordinate text is present, malformed NMEA degrees means the modem answered but the payload is unusable.
        ESP_LOGW(TAG, "event=gnss_fallback_parse_failed reason=invalid_coordinate_format");
        return MODEM_GNSS_READ_PARSE_FAIL;
    }

    // CGPSINFO fallback does not report constellation count. The previous behavior
    // hardcoded satellites=1 to indicate "fix valid". This kept compatibility with
    // cloud consumers that gate on satellites>0, but it misled diagnostics by
    // making fallback fixes indistinguishable from real CGNSINF fixes.
    //
    // Compromise: keep satellites=1 as a contract minimum so cloud filtering still
    // works, but emit a fallback marker via diagnostics so operators can detect
    // when the device is stuck on the simpler query path.
    data->fix_valid = true;
    data->latitude = latitude;
    data->longitude = longitude;
    data->satellites = 1;
    data->query_mode = GNSS_QUERY_MODE_CGPSINFO;
    data->timestamp_ms = (field_count > 5) ? modem_gnss_parse_cgpsinfo_timestamp(fields[4], fields[5]) : util_uptime_ms();
    data->speed_kmh = (field_count > 7 && fields[7] != NULL && fields[7][0] != '\0') ? (float)(atof(fields[7]) * 1.852f) : 0.0f;
    data->course_deg = (field_count > 8 && fields[8] != NULL && fields[8][0] != '\0') ? (float)atof(fields[8]) : 0.0f;

    ESP_LOGD(TAG,
             "event=gnss_fallback_fix speed_kmh=%.2f sat=%u",
             data->speed_kmh,
             (unsigned)data->satellites);
    return MODEM_GNSS_READ_OK;
}

/**
 * @brief Run the primary CGNSINF query path and parse its CSV reply.
 *
 * CGNSINF returns richer data (separate GPS/GLONASS satellite counts, course).
 * Performs coordinate-range validation to reject obvious modem garbage.
 *
 * @param data Output GNSS sample.
 * @return Read result classification (OK / transport fail / parse fail).
 */
static modem_gnss_read_result_t modem_gnss_send_and_parse(gnss_data_t *data) {
    char response[512] = {0};
    bool transport_ok = false;
    esp_err_t last_err = ESP_FAIL;

    for (uint32_t attempt = 0; attempt <= MODEM_GNSS_QUERY_SOFT_RETRY_COUNT; ++attempt) {
        // Retry the richer CGNSINF query a few times before demoting the failure into fallback logic above this helper.
        memset(response, 0, sizeof(response));
        last_err = modem_at_send("AT+CGNSINF\r",
                                 response,
                                 sizeof(response),
                                 MODEM_GNSS_QUERY_TIMEOUT_MS);

        ESP_LOGD(TAG, "event=gnss_primary_query_attempt attempt=%lu cmd=AT+CGNSINF", (unsigned long)(attempt + 1U));
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
        ESP_LOGW(TAG, "event=gnss_parse_failed reason=cgnsinf_marker_missing");
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
        // Split the modem CSV in-place so field indexes keep matching the SIM7600 response contract.
        fields[field_count++] = cursor;
        char *comma = strchr(cursor, ',');
        if (comma == NULL) {
            break;
        }
        *comma = '\0';
        cursor = comma + 1;
    }

    if (field_count < 5) {
        ESP_LOGW(TAG, "event=gnss_parse_failed reason=field_count field_count=%u", (unsigned)field_count);
        return MODEM_GNSS_READ_PARSE_FAIL;
    }

    memset(data, 0, sizeof(*data));
    // Copy only the subset of CGNSINF columns that the runtime telemetry model currently consumes.
    data->fix_valid = field_count > 1 && fields[1] != NULL && atoi(fields[1]) == 1;
    data->latitude = field_count > 3 && fields[3] != NULL ? atof(fields[3]) : 0.0;
    data->longitude = field_count > 4 && fields[4] != NULL ? atof(fields[4]) : 0.0;
    data->speed_kmh = field_count > 6 && fields[6] != NULL ? (float)atof(fields[6]) : 0.0f;

    /* Validate coordinate ranges to reject modem garbage data. */
    if (data->fix_valid) {
        if (data->latitude < -90.0 || data->latitude > 90.0 ||
            data->longitude < -180.0 || data->longitude > 180.0) {
            ESP_LOGW(TAG, "event=gnss_coordinate_out_of_range lat=%.6f lon=%.6f",
                     data->latitude, data->longitude);
            data->fix_valid = false;
            data->latitude = 0.0;
            data->longitude = 0.0;
        }
    }
    data->course_deg = field_count > 7 && fields[7] != NULL ? (float)atof(fields[7]) : 0.0f;

    // SIM7600 reports GPS and GLONASS counts separately, so merge them into one firmware-facing satellite total.
    int sat_gps = field_count > 14 && fields[14] != NULL ? atoi(fields[14]) : 0;
    int sat_glonass = field_count > 15 && fields[15] != NULL ? atoi(fields[15]) : 0;
    data->satellites = (uint8_t)(sat_gps + sat_glonass);
    data->timestamp_ms = field_count > 2 && fields[2] != NULL ? modem_gnss_parse_timestamp(fields[2]) : util_uptime_ms();

    if (!data->fix_valid) {
        // Clear stale coordinates whenever the modem explicitly says the fix bit is down.
        data->latitude = 0.0;
        data->longitude = 0.0;
        data->satellites = 0;
    }

    data->query_mode = GNSS_QUERY_MODE_CGNSINF;
    return MODEM_GNSS_READ_OK;
}

/**
 * @brief Power-cycle the GNSS engine to recover from a sustained query-failure streak.
 *
 * Rate-limited by a cooldown so a flapping modem is not repeatedly repowered.
 *
 * @param now_ms Current uptime in milliseconds.
 * @return true if a repower was performed this call, false if skipped or failed.
 */
static bool modem_gnss_try_self_heal(uint64_t now_ms) {
    // Respect the cooldown so back-to-back failures do not trigger constant repower cycles.
    if (s_last_self_heal_ms != 0 && (now_ms - s_last_self_heal_ms) < MODEM_GNSS_QUERY_SELF_HEAL_COOLDOWN_MS) {
        return false;
    }

    s_last_self_heal_ms = now_ms;
    // Toggle GNSS power off then on to reset a stuck engine.
    esp_err_t power_off_err = modem_gnss_power_off();
    esp_err_t power_on_err = modem_gnss_power_on();

    if (power_off_err != ESP_OK || power_on_err != ESP_OK) {
        ESP_LOGW(TAG,
                 "event=gnss_self_heal_failed off_err=%s on_err=%s",
                 esp_err_to_name(power_off_err),
                 esp_err_to_name(power_on_err));
        return false;
    }

    ESP_LOGW(TAG, "event=gnss_self_heal_executed action=repower");
    telemetry_counters_inc_gnss_self_heal();
    return true;
}

/**
 * @brief Two-stage recovery for a long no-fix streak: power off, wait, then power on.
 *
 * Unlike self-heal, the power-on is deferred by a restart delay so the GNSS engine
 * fully cold-restarts. State is carried across calls via the pending flag.
 *
 * @param now_ms Current uptime in milliseconds.
 * @return true when the deferred power-on completes; false while scheduling/waiting.
 */
static bool modem_gnss_try_no_fix_recover(uint64_t now_ms) {
    // Stage 2: a power-off was already scheduled; complete the cold restart once the delay elapses.
    if (s_no_fix_recover_pending) {
        if (now_ms < s_no_fix_recover_ready_ms) {
            return false;  // Still inside the restart delay window.
        }

        esp_err_t on_err = modem_gnss_power_on();
        if (on_err != ESP_OK) {
            ESP_LOGW(TAG, "event=gnss_no_fix_recover_power_on_failed err=%s", esp_err_to_name(on_err));
            return false;
        }

        s_no_fix_recover_pending = false;
        s_last_no_fix_recover_ms = now_ms;
        ESP_LOGW(TAG, "event=gnss_no_fix_recover_executed stage=power_on");
        telemetry_counters_inc_gnss_no_fix_recover();
        return true;
    }

    // Respect the cooldown between full no-fix recovery cycles.
    if (s_last_no_fix_recover_ms != 0 &&
        (now_ms - s_last_no_fix_recover_ms) < MODEM_GNSS_NO_FIX_RECOVER_COOLDOWN_MS) {
        return false;
    }

    // Stage 1: power the GNSS engine off and schedule the delayed power-on.
    esp_err_t off_err = modem_gnss_power_off();
    if (off_err != ESP_OK) {
        ESP_LOGW(TAG, "event=gnss_no_fix_recover_power_off_failed err=%s", esp_err_to_name(off_err));
        return false;
    }

    s_no_fix_recover_pending = true;
    s_no_fix_recover_ready_ms = now_ms + MODEM_GNSS_POWER_CGPS_RESTART_DELAY_MS;
    ESP_LOGW(TAG,
             "event=gnss_no_fix_recover_scheduled stage=power_off power_on_due_ms=%u",
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
    uint64_t now_ms = util_uptime_ms();
    bool known_power_off = s_last_power_off_ms != 0 && now_ms >= s_last_power_off_ms;
    uint64_t off_duration_ms = known_power_off ? (now_ms - s_last_power_off_ms) : 0;

    // Every fresh power-on attempt clears any prior fallback/backoff bias so the modem gets another chance at the primary query path.
    s_use_cgps_query_only = false;
    s_cgnsinf_fail_streak = 0;
    s_cgnsinf_backoff_until_ms = 0;

    ESP_LOGI(TAG, "event=gnss_power_on_start");

    if (!known_power_off) {
        // First try to resume an already-running GNSS engine to avoid unnecessary mode churn on warm boots.
        esp_err_t resume_err = modem_at_send("AT+CGNSPWR?\r", response, sizeof(response), MODEM_GNSS_POWER_CMD_TIMEOUT_MS);
        modem_gnss_log_command_response("AT+CGNSPWR?", resume_err, response);
        if (resume_err == ESP_OK && strstr(response, "+CGNSPWR: 1") != NULL) {
            s_gnss_powered = true;
            s_use_cgps_query_only = false;
            modem_gnss_arm_query_ready_window("cgnspwr_state_resume", false, 0, true);
            ESP_LOGI(TAG, "event=gnss_power_on_reuse source=CGNSPWR query_mode=CGNSINF");
            return ESP_OK;
        }

        memset(response, 0, sizeof(response));
        resume_err = modem_at_send("AT+CGPS?\r", response, sizeof(response), MODEM_GNSS_POWER_CMD_TIMEOUT_MS);
        modem_gnss_log_command_response("AT+CGPS?", resume_err, response);
        if (resume_err == ESP_OK && strstr(response, "+CGPS: 1") != NULL) {
            s_gnss_powered = true;
            s_use_cgps_query_only = true;
            modem_gnss_arm_query_ready_window("cgps_state_resume", false, 0, true);
            ESP_LOGI(TAG, "event=gnss_power_on_reuse source=CGPS query_mode=CGPSINFO");
            return ESP_OK;
        }
    }

    // Preferred path: enable the newer CGNS engine and keep the richer CGNSINF query mode.
    memset(response, 0, sizeof(response));
    esp_err_t err = modem_at_send("AT+CGNSPWR=1\r", response, sizeof(response), MODEM_GNSS_POWER_CMD_TIMEOUT_MS);
    modem_gnss_log_command_response("AT+CGNSPWR=1", err, response);
    if (err == ESP_OK && strstr(response, "OK") != NULL) {
        s_gnss_powered = true;
        s_use_cgps_query_only = false;
        modem_gnss_arm_query_ready_window("cgnspwr_start", known_power_off, off_duration_ms, false);
        ESP_LOGI(TAG, "event=gnss_power_on_ok source=CGNSPWR_SET query_mode=CGNSINF");
        return ESP_OK;
    }

    memset(response, 0, sizeof(response));
    err = modem_at_send("AT+CGNSPWR?\r", response, sizeof(response), MODEM_GNSS_POWER_CMD_TIMEOUT_MS);
    modem_gnss_log_command_response("AT+CGNSPWR?", err, response);
    if (err == ESP_OK && strstr(response, "+CGNSPWR: 1") != NULL) {
        s_gnss_powered = true;
        s_use_cgps_query_only = false;
        modem_gnss_arm_query_ready_window("cgnspwr_state", known_power_off, off_duration_ms, !known_power_off);
        ESP_LOGI(TAG, "event=gnss_power_on_ok source=CGNSPWR_QUERY query_mode=CGNSINF");
        return ESP_OK;
    }

    // Legacy CGPS commands stay as compatibility fallback for modem firmware that rejects the CGNS family.
    memset(response, 0, sizeof(response));
    err = modem_at_send("AT+CGPS=1\r", response, sizeof(response), MODEM_GNSS_POWER_CMD_TIMEOUT_MS);
    modem_gnss_log_command_response("AT+CGPS=1", err, response);
    if (err == ESP_OK && strstr(response, "OK") != NULL) {
        s_gnss_powered = true;
        s_use_cgps_query_only = true;
        modem_gnss_arm_query_ready_window("cgps_start", known_power_off, off_duration_ms, false);
        ESP_LOGI(TAG, "event=gnss_power_on_ok source=CGPS_SET query_mode=CGPSINFO");
        return ESP_OK;
    }

    memset(response, 0, sizeof(response));
    err = modem_at_send("AT+CGPS?\r", response, sizeof(response), MODEM_GNSS_POWER_CMD_TIMEOUT_MS);
    modem_gnss_log_command_response("AT+CGPS?", err, response);
    if (err == ESP_OK && strstr(response, "+CGPS: 1") != NULL) {
        s_gnss_powered = true;
        s_use_cgps_query_only = true;
        modem_gnss_arm_query_ready_window("cgps_state", known_power_off, off_duration_ms, !known_power_off);
        ESP_LOGI(TAG, "event=gnss_power_on_ok source=CGPS_QUERY query_mode=CGPSINFO");
        return ESP_OK;
    }

    ESP_LOGW(TAG, "event=gnss_power_on_failed");
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
        s_query_ready_ms = 0;
        s_last_power_off_ms = util_uptime_ms();
        return ESP_OK;
    }

    err = modem_at_send_expect("AT+CGPS=0\r", "OK", MODEM_GNSS_POWER_CMD_TIMEOUT_MS);
    if (err == ESP_OK) {
        s_gnss_powered = false;
        s_query_ready_ms = 0;
        s_last_power_off_ms = util_uptime_ms();
        ESP_LOGW(TAG, "event=gnss_power_off_ok source=CGPS");
        return ESP_OK;
    }

    return err;
}

/**
 * @brief Check if GNSS query is ready.
 *
 * @return True if ready.
 */
bool modem_gnss_is_query_ready(void) {
    if (!s_gnss_powered) {
        return false;
    }
    return util_uptime_ms() >= s_query_ready_ms;
}

/**
 * @brief Query modem for GNSS sample and parse `+CGNSINF` payload.
 *
 * @param data Output GNSS sample.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_gnss_get_location(gnss_data_t *data) {
    // Query GNSS through the primary/fallback AT paths and keep the recovery streak bookkeeping in one place.
    ESP_RETURN_ON_NULL(data, ESP_ERR_INVALID_ARG, TAG, "data is NULL");

    uint64_t now_ms = util_uptime_ms();
    if (s_no_fix_recover_pending) {
        // A deferred no-fix recovery is retried opportunistically before issuing a new location query.
        (void)modem_gnss_try_no_fix_recover(now_ms);
    }

    if (!s_gnss_powered) {
        return ESP_FAIL;
    }
    bool cgnsinf_backoff_active =
        (s_cgnsinf_backoff_until_ms != 0) &&
        (now_ms < s_cgnsinf_backoff_until_ms);

    // Prefer the richer primary query unless it is explicitly backoff-gated or the modem has already been downgraded.
    modem_gnss_read_result_t result = MODEM_GNSS_READ_TRANSPORT_FAIL;
    if (s_use_cgps_query_only) {
        result = modem_gnss_send_cgpsinfo_and_parse(data);
    } else if (!cgnsinf_backoff_active) {
        result = modem_gnss_send_and_parse(data);
        if (result == MODEM_GNSS_READ_OK) {
            s_cgnsinf_fail_streak = 0;
            telemetry_counters_inc_gnss_cgnsinf_fix_ok();
        } else {
            s_cgnsinf_fail_streak += 1;
            telemetry_counters_inc_gnss_cgnsinf_fail();
            // Repeated primary-query failures trigger a cooldown so we stop hammering AT+CGNSINF on unstable modems.
            if (s_cgnsinf_fail_streak >= MODEM_GNSS_QUERY_PRIMARY_BACKOFF_FAIL_THRESHOLD) {
                s_cgnsinf_backoff_until_ms = now_ms + MODEM_GNSS_QUERY_PRIMARY_BACKOFF_COOLDOWN_MS;
                ESP_LOGW(TAG,
                         "event=gnss_primary_backoff_active fail_streak=%lu cooldown_ms=%llu",
                         (unsigned long)s_cgnsinf_fail_streak,
                         (unsigned long long)MODEM_GNSS_QUERY_PRIMARY_BACKOFF_COOLDOWN_MS);
            }

            ESP_LOGW(TAG, "event=gnss_primary_query_failed action=try_fallback_cgpsinfo");
            result = modem_gnss_send_cgpsinfo_and_parse(data);
            if (result == MODEM_GNSS_READ_OK) {
                // Once the fallback succeeds where the primary fails, stay on the simpler query mode until recovery resets it.
                s_use_cgps_query_only = true;
                s_cgnsinf_fail_streak = 0;
                s_cgnsinf_backoff_until_ms = 0;
                ESP_LOGW(TAG, "event=gnss_query_mode_switched mode=CGPSINFO reason=primary_cgnsinf_failure");
                telemetry_counters_inc_gnss_query_mode_switched();
                telemetry_counters_inc_gnss_cgpsinfo_fix_ok();
            } else {
                telemetry_counters_inc_gnss_cgpsinfo_fail();
            }
        }
    } else {
        ESP_LOGD(TAG,
                 "event=gnss_primary_query_skipped reason=backoff remaining_ms=%llu",
                 (unsigned long long)(s_cgnsinf_backoff_until_ms - now_ms));
        result = modem_gnss_send_cgpsinfo_and_parse(data);
        if (result == MODEM_GNSS_READ_OK) {
            telemetry_counters_inc_gnss_cgpsinfo_fix_ok();
        } else {
            telemetry_counters_inc_gnss_cgpsinfo_fail();
        }
    }

    if (result != MODEM_GNSS_READ_OK) {
        s_query_fail_streak += 1;
        s_no_fix_streak = 0;
        s_fix_success_streak = 0;

        // Transport failures and parse failures are logged separately so field traces show whether the modem answered at all.
        if (result == MODEM_GNSS_READ_TRANSPORT_FAIL) {
            if (modem_gnss_log_due(&s_last_transport_fail_log_ms, now_ms)) {
                ESP_LOGW(TAG,
                         "event=gnss_transport_fail streak=%lu",
                         (unsigned long)s_query_fail_streak);
            }
        } else if (modem_gnss_log_due(&s_last_parse_fail_log_ms, now_ms)) {
            ESP_LOGW(TAG,
                     "event=gnss_parse_fail streak=%lu",
                     (unsigned long)s_query_fail_streak);
        }

        if (s_query_fail_streak >= MODEM_GNSS_QUERY_FAIL_SELF_HEAL_THRESHOLD) {
            // A long transport/parse failure streak escalates to GNSS self-heal before the caller gives up.
            if (modem_gnss_try_self_heal(now_ms)) {
                s_cgnsinf_fail_streak = 0;
                s_cgnsinf_backoff_until_ms = 0;

                if (s_use_cgps_query_only) {
                    result = modem_gnss_send_cgpsinfo_and_parse(data);
                } else {
                    result = modem_gnss_send_and_parse(data);
                    if (result != MODEM_GNSS_READ_OK) {
                        s_cgnsinf_fail_streak += 1;
                        ESP_LOGW(TAG, "event=gnss_primary_query_failed_after_self_heal action=try_fallback_cgpsinfo");
                        result = modem_gnss_send_cgpsinfo_and_parse(data);
                        if (result == MODEM_GNSS_READ_OK) {
                            s_use_cgps_query_only = true;
                            s_cgnsinf_fail_streak = 0;
                            s_cgnsinf_backoff_until_ms = 0;
                            ESP_LOGW(TAG, "event=gnss_query_mode_switched mode=CGPSINFO reason=self_heal_fallback_success");
                            telemetry_counters_inc_gnss_query_mode_switched();
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
        // A complete fix resets the no-fix streak and reinforces the success streak used by diagnostics.
        s_fix_success_streak += 1;
        s_no_fix_streak = 0;
        if (modem_gnss_log_due(&s_last_fix_success_log_ms, now_ms)) {
            ESP_LOGI(TAG,
                     "event=gnss_fix_success sat=%u streak=%lu speed_kmh=%.2f",
                     (unsigned)data->satellites,
                     (unsigned long)s_fix_success_streak,
                     data->speed_kmh);
        }
    } else {
        // Empty/weak fixes are tracked separately so no-fix recovery only fires after sustained degraded output.
        s_no_fix_streak += 1;
        s_fix_success_streak = 0;
        if (modem_gnss_log_due(&s_last_no_fix_log_ms, now_ms)) {
            ESP_LOGI(TAG,
                     "event=gnss_no_fix streak=%lu fix_valid=%d",
                     (unsigned long)s_no_fix_streak,
                     data->fix_valid ? 1 : 0);
        }

        if (s_no_fix_streak >= MODEM_GNSS_NO_FIX_RECOVER_THRESHOLD) {
            if (modem_gnss_try_no_fix_recover(now_ms)) {
                s_no_fix_streak = 0;
                s_query_fail_streak = 0;
                ESP_LOGW(TAG,
                         "event=gnss_no_fix_recovery_triggered threshold=%u",
                         (unsigned)MODEM_GNSS_NO_FIX_RECOVER_THRESHOLD);
            }
        }
    }

    s_last_gnss = *data;
    return ESP_OK;
}
