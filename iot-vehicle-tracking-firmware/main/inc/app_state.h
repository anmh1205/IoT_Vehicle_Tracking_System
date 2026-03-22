#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

#include "app_config.h"
#include "modem_gnss.h"

typedef enum {
    APP_STATE_INIT = 0,
    APP_STATE_CHECK_IGN,
    APP_STATE_DRIVING,
    APP_STATE_PARKED,
    APP_STATE_ALARM,
    APP_STATE_HEARTBEAT,
    APP_STATE_SLEEP,
} app_state_t;

typedef struct {
    app_state_t last_state;
    uint32_t boot_count;
    uint32_t last_heartbeat_ts;
    uint8_t ble_mac[6];
    bool ign_last_known;
    float last_battery_v;
    bool ota_pending_confirm;
    uint32_t ota_confirm_timeout_sec;
    char ota_job_id[TRACKER_JOB_ID_MAX_LEN];
    char ota_target_version[TRACKER_TARGET_VERSION_MAX_LEN];
    char ota_previous_version[TRACKER_TARGET_VERSION_MAX_LEN];
    char ota_partition[TRACKER_PARTITION_MAX_LEN];
} rtc_context_t;

typedef struct {
    gnss_data_t gnss;
    float battery_top;
    float battery_bot;
    uint16_t vibration;
    bool ignition;
    int error_code;
    int32_t obd_rpm;
    int32_t obd_speed;
    int32_t obd_coolant_temp;
    int32_t obd_fuel_level;
    int32_t obd_engine_load;
} telemetry_t;

extern rtc_context_t g_rtc_context;

esp_err_t state_machine_init(const config_t *config);
app_state_t state_machine_run(app_state_t current_state);
telemetry_t state_machine_get_telemetry(void);
