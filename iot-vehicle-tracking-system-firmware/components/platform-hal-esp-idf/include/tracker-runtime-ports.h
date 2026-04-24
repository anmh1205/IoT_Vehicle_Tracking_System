#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "app_config.h"
#include "esp_err.h"
#include "ota_contract.h"

/**
 * @file tracker-runtime-ports.h
 * @brief Explicit runtime port registry used by bootstrap-time dependency wiring.
 */

typedef void (*tracker_command_message_callback_t)(const char *topic, const char *payload);
typedef void (*tracker_mqtt_puback_callback_t)(int msg_id);
typedef void (*tracker_ota_status_callback_t)(const firmware_status_t *status, void *user_ctx);
typedef void (*tracker_obd_response_callback_t)(uint8_t mode,
                                                int pid,
                                                const uint8_t *data,
                                                size_t len,
                                                void *user_ctx);

typedef struct {
    void (*set_apn)(const char *apn);
    void (*request_connect)(void);
    bool (*is_initialized)(void);
    bool (*is_connected)(void);
    esp_err_t (*sleep)(void);
    esp_err_t (*wakeup)(void);
} modem_transport_port_t;

typedef struct {
    esp_err_t (*init)(const config_t *cfg);
    esp_err_t (*connect)(void);
    esp_err_t (*disconnect)(void);
    bool (*is_connected)(void);
    esp_err_t (*publish)(const char *topic, const char *payload, int qos);
    int (*publish_with_msg_id)(const char *topic, const char *payload, int qos);
    esp_err_t (*subscribe_commands)(void);
    void (*set_command_callback)(tracker_command_message_callback_t cb);
    void (*set_puback_callback)(tracker_mqtt_puback_callback_t cb);
} mqtt_transport_port_t;

typedef struct {
    esp_err_t (*init)(void);
    esp_err_t (*enqueue)(int record_type,
                         const char *payload,
                         bool gps_fix,
                         bool net_up,
                         bool time_trusted,
                         uint64_t timestamp_ms);
    void (*replay_tick)(void);
    void (*handle_publish_ack)(int msg_id);
    bool (*has_pending_ack)(void);
} storage_queue_port_t;

typedef struct {
    esp_err_t (*apply_update)(const config_t *cfg,
                              const char *current_version,
                              const ota_command_t *cmd,
                              firmware_status_t *out_status,
                              tracker_ota_status_callback_t status_callback,
                              void *status_callback_ctx);
    esp_err_t (*manual_rollback)(firmware_status_t *out_status);
} ota_download_port_t;

typedef struct {
    esp_err_t (*init)(void);
    esp_err_t (*load)(config_t *config);
    esp_err_t (*save)(const config_t *config);
} config_store_port_t;

typedef struct {
    esp_err_t (*init)(void);
    esp_err_t (*get_time_ms)(uint64_t *out_time_ms);
    esp_err_t (*set_time_ms)(uint64_t time_ms);
    esp_err_t (*get_health)(bool *available, bool *time_valid);
} rtc_clock_port_t;

typedef struct {
    void *(*connect)(tracker_obd_response_callback_t response_cb, void *user_ctx, uint32_t connect_timeout_ms);
    esp_err_t (*disconnect)(void *ctx);
    bool (*is_connected)(void *ctx);
    int (*request_pid)(void *ctx, uint8_t mode, uint8_t pid, uint32_t timeout_ms);
    int (*request_mode)(void *ctx, uint8_t mode, uint32_t timeout_ms);
    esp_err_t (*elm327_init)(void *ctx);
    const char *(*get_ecu_state_label)(void *ctx);
} obd_reader_port_t;

typedef struct {
    esp_err_t (*init)(void);
    esp_err_t (*power_on)(void);
    esp_err_t (*power_off)(void);
    esp_err_t (*set_dtr)(bool high);
    esp_err_t (*read_status)(bool *level);
} power_control_port_t;

typedef struct {
    const modem_transport_port_t *modem;
    const mqtt_transport_port_t *mqtt;
    const storage_queue_port_t *storage_queue;
    const ota_download_port_t *ota_download;
    const config_store_port_t *config_store;
    const rtc_clock_port_t *rtc_clock;
    const obd_reader_port_t *obd_reader;
    const power_control_port_t *power_control;
} tracker_runtime_ports_t;

esp_err_t tracker_runtime_ports_validate(const tracker_runtime_ports_t *ports);
