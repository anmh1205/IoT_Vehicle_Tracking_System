#include "modem_gnss.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "esp_log.h"

#include "modem_at.h"
#include "util.h"

static const char *TAG = "MODEM_GNSS";
static gnss_data_t s_last_gnss = {0};
static bool s_gnss_powered = false;

static uint64_t modem_gnss_parse_timestamp(const char *utc_string) {
    if (utc_string == NULL || strlen(utc_string) < 14) {
        return util_uptime_ms();
    }

    struct tm tm_value = {0};
    char fractional[4] = {0};

    sscanf(utc_string,
           "%4d%2d%2d%2d%2d%2d.%3s",
           &tm_value.tm_year,
           &tm_value.tm_mon,
           &tm_value.tm_mday,
           &tm_value.tm_hour,
           &tm_value.tm_min,
           &tm_value.tm_sec,
           fractional);

    tm_value.tm_year -= 1900;
    tm_value.tm_mon -= 1;

    time_t epoch = mktime(&tm_value);
    if (epoch <= 0) {
        return util_uptime_ms();
    }

    return ((uint64_t)epoch * 1000ULL) + (uint64_t)atoi(fractional);
}

esp_err_t modem_gnss_power_on(void) {
    esp_err_t err = modem_at_send_expect("AT+CGNSPWR=1\r", "OK", 5000);
    if (err == ESP_OK) {
        s_gnss_powered = true;
    }
    return err;
}

esp_err_t modem_gnss_power_off(void) {
    esp_err_t err = modem_at_send_expect("AT+CGNSPWR=0\r", "OK", 5000);
    if (err == ESP_OK) {
        s_gnss_powered = false;
    }
    return err;
}

bool modem_gnss_has_fix(void) {
    return s_last_gnss.fix_valid;
}

esp_err_t modem_gnss_get_location(gnss_data_t *data) {
    ESP_RETURN_ON_NULL(data, ESP_ERR_INVALID_ARG, TAG, "data is NULL");
    ESP_RETURN_ON_FALSE(s_gnss_powered, ESP_ERR_INVALID_STATE, TAG, "GNSS not powered");

    char response[512] = {0};
    ESP_RETURN_ON_FALSE(modem_at_send("AT+CGNSINF\r", response, sizeof(response), 5000) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "AT+CGNSINF failed");

    char *marker = strstr(response, "+CGNSINF:");
    ESP_RETURN_ON_NULL(marker, ESP_FAIL, TAG, "CGNSINF marker not found");

    char *line_end = strstr(marker, "\r\n");
    if (line_end != NULL) {
        *line_end = '\0';
    }

    char line[512] = {0};
    util_copy_string(line, sizeof(line), marker + strlen("+CGNSINF: "));

    char *fields[20] = {0};
    size_t field_count = 0;
    char *save_ptr = NULL;
    char *token = strtok_r(line, ",", &save_ptr);
    while (token != NULL && field_count < ARRAY_SIZE(fields)) {
        fields[field_count++] = token;
        token = strtok_r(NULL, ",", &save_ptr);
    }

    ESP_RETURN_ON_FALSE(field_count >= 16, ESP_FAIL, TAG, "CGNSINF response too short");

    memset(data, 0, sizeof(*data));
    data->fix_valid = atoi(fields[1]) == 1;
    data->latitude = atof(fields[3]);
    data->longitude = atof(fields[4]);
    data->speed_kmh = (float)atof(fields[6]);
    data->course_deg = (float)atof(fields[7]);
    data->satellites = (uint8_t)(atoi(fields[14]) + atoi(fields[15]));
    data->timestamp_ms = modem_gnss_parse_timestamp(fields[2]);

    if (!data->fix_valid) {
        data->latitude = 0.0;
        data->longitude = 0.0;
        data->satellites = 0;
    }

    s_last_gnss = *data;
    return ESP_OK;
}
