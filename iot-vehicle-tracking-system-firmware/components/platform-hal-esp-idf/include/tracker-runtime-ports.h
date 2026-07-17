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
 * This header belongs to the ESP-IDF runtime port layer and defines the port boundary that lets runtime code call ESP-IDF services through a narrow surface.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/** @brief Receive one MQTT command payload delivered from the transport adapter. */
typedef void (*tracker_command_message_callback_t)(const char *topic, const char *payload);
/** @brief Receive OTA progress/status events emitted during update execution. */
typedef void (*tracker_ota_status_callback_t)(const firmware_status_t *status, void *user_ctx);
/** @brief Receive one decoded OBD response frame from the OBD adapter. */
typedef void (*tracker_obd_response_callback_t)(uint8_t mode,
                                                int pid,
                                                const uint8_t *data,
                                                size_t len,
                                                void *user_ctx);

/** @brief LTE modem control surface consumed by the app/domain layers. */
typedef struct {
    void (*set_apn)(const char *apn);     /* Program the cellular APN used for the data context. */
    void (*request_connect)(void);        /* Asynchronously request modem attach + data connection. */
    bool (*is_initialized)(void);         /* True once the modem driver has completed bring-up. */
    bool (*is_connected)(void);           /* True when a data bearer is currently established. */
    esp_err_t (*sleep)(void);             /* Put the modem into its low-power state (DTR handshake). */
    esp_err_t (*wakeup)(void);            /* Bring the modem back from low-power state. */
} modem_transport_port_t;

/** @brief MQTT transport surface consumed by the app/domain layers. */
typedef struct {
    esp_err_t (*init)(const config_t *cfg);                            /* Configure broker/credentials from config. */
    esp_err_t (*connect)(void);                                        /* Open the MQTT session to the broker. */
    esp_err_t (*disconnect)(void);                                     /* Cleanly close the MQTT session. */
    bool (*is_connected)(void);                                        /* True while the MQTT session is live. */
    esp_err_t (*publish)(const char *topic, const char *payload, int qos); /* Fire-and-forget publish at given QoS. */
    int (*publish_with_msg_id)(const char *topic, const char *payload, int qos); /* Publish; returns broker message id for QoS>0 tracking. */
    esp_err_t (*subscribe_commands)(void);                             /* Subscribe to the inbound command topic(s). */
    void (*set_command_callback)(tracker_command_message_callback_t cb); /* Register the inbound-command handler. */
} mqtt_transport_port_t;

/** @brief Offline queue persistence/replay surface. */
typedef struct {
    esp_err_t (*init)(void);              /* Open/restore the persistent offline queue. */
    esp_err_t (*enqueue)(int record_type, /* Append one telemetry/event record for later replay. */
                         const char *payload,
                         bool gps_fix,        /* Whether a valid GPS fix was present at capture. */
                         bool net_up,         /* Whether the network was up at capture. */
                         bool time_trusted,   /* Whether the timestamp came from a trusted clock. */
                         uint64_t timestamp_ms);
    void (*replay_tick)(void);            /* Drain a slice of queued records when connectivity returns. */
} storage_queue_port_t;

/** @brief OTA download/apply surface used by OTA runtime policy. */
typedef struct {
    esp_err_t (*apply_update)(const config_t *cfg,            /* Download+verify+flash the firmware named by the command. */
                              const char *current_version,   /* Running version, for upgrade/skip decisions. */
                              const ota_command_t *cmd,      /* OTA command describing target image/URL. */
                              firmware_status_t *out_status, /* Out: resulting OTA status. */
                              tracker_ota_status_callback_t status_callback, /* Progress/status events. */
                              void *status_callback_ctx);    /* Opaque context passed back to the callback. */
    esp_err_t (*manual_rollback)(firmware_status_t *out_status); /* Force a rollback to the previous OTA slot. */
} ota_download_port_t;

/** @brief Persistent configuration storage surface. */
typedef struct {
    esp_err_t (*init)(void);                  /* Open/mount the configuration store (e.g. NVS). */
    esp_err_t (*load)(config_t *config);      /* Load the persisted configuration into @p config. */
    esp_err_t (*save)(const config_t *config);/* Persist the given configuration. */
} config_store_port_t;

/** @brief RTC clock surface for wall-clock sync and health checks. */
typedef struct {
    esp_err_t (*init)(void);                       /* Bring up the external RTC (e.g. DS3231). */
    esp_err_t (*get_time_ms)(uint64_t *out_time_ms); /* Read current wall-clock time in epoch ms. */
    esp_err_t (*set_time_ms)(uint64_t time_ms);    /* Set the RTC wall-clock time (epoch ms). */
    esp_err_t (*get_health)(bool *available, bool *time_valid); /* Report RTC presence and time validity. */
} rtc_clock_port_t;

/** @brief OBD reader surface for BLE connect, request, and ECU status flows. */
typedef struct {
    void *(*connect)(tracker_obd_response_callback_t response_cb, void *user_ctx, uint32_t connect_timeout_ms); /* Connect to the OBD adapter; returns opaque session ctx. */
    esp_err_t (*disconnect)(void *ctx);            /* Tear down the OBD session. */
    bool (*is_connected)(void *ctx);               /* True while the OBD session is active. */
    int (*request_pid)(void *ctx, uint8_t mode, uint8_t pid, uint32_t timeout_ms); /* Query a single OBD PID; returns response length or <0 on error. */
    int (*request_mode)(void *ctx, uint8_t mode, uint32_t timeout_ms); /* Issue a bare OBD mode request. */
    esp_err_t (*elm327_init)(void *ctx);           /* Run the ELM327 initialization handshake. */
    const char *(*get_ecu_state_label)(void *ctx); /* Human-readable label of current ECU/link state. */
} obd_reader_port_t;

/** @brief Board-level modem power control surface. */
typedef struct {
    esp_err_t (*init)(void);              /* Initialize modem power-control GPIOs. */
    esp_err_t (*power_on)(void);          /* Pulse PWRKEY to power the modem on. */
    esp_err_t (*power_off)(void);         /* Pulse PWRKEY to power the modem off. */
    esp_err_t (*set_dtr)(bool high);      /* Drive modem DTR for sleep/wake handshake. */
    esp_err_t (*read_status)(bool *level);/* Read the modem STATUS line level. */
} power_control_port_t;

/** @brief Complete dependency registry injected once during bootstrap. */
typedef struct {
    const modem_transport_port_t *modem;        /* Cellular modem control surface. */
    const mqtt_transport_port_t *mqtt;          /* MQTT transport surface. */
    const storage_queue_port_t *storage_queue;  /* Offline queue persistence/replay. */
    const ota_download_port_t *ota_download;    /* OTA download/apply/rollback. */
    const config_store_port_t *config_store;    /* Persistent configuration storage. */
    const rtc_clock_port_t *rtc_clock;          /* External RTC clock access. */
    const obd_reader_port_t *obd_reader;        /* OBD/ECU reader access. */
    const power_control_port_t *power_control;  /* Board-level modem power control. */
} tracker_runtime_ports_t;

/**
 * @brief Validate that all mandatory runtime ports and callbacks are present.
 *
 * @param ports Bootstrap-time dependency registry.
 *
 * @return ESP_OK when the registry is complete, otherwise ESP_ERR_INVALID_ARG.
 */
esp_err_t tracker_runtime_ports_validate(const tracker_runtime_ports_t *ports);
