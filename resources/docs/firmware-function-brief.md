# Firmware Function Brief

This document summarizes each firmware source file and function (brief, input, output).

Generated from in-code Doxygen comments in iot-vehicle-tracking-system-firmware/main.

## iot-vehicle-tracking-system-firmware/main/main.c
- File brief: Firmware boot entrypoint and top-level state-machine loop.

| Function | Brief | Input | Output |
|---|---|---|---|
| app_main | ESP-IDF application entrypoint. | void | void |
| hile | (not documented) | true | w |

## iot-vehicle-tracking-system-firmware/main/src/adc_reader.c
- File brief: Battery voltage reading using ADC one-shot mode and optional calibration.

| Function | Brief | Input | Output |
|---|---|---|---|
| adc_reader_init | Initialize one-shot ADC channel and optional calibration engine. | void | esp_err_t |
| adc_read_battery_voltage | Sample battery voltage and convert it to board input voltage. | void | float |
| adc_reader_deinit | Release ADC and calibration resources. | void | void |

## iot-vehicle-tracking-system-firmware/main/src/ble_init.c
- File brief: NimBLE host stack startup/shutdown sequence for ESP-IDF.

| Function | Brief | Input | Output |
|---|---|---|---|
| ble_task | FreeRTOS task wrapper running NimBLE host loop. | void *param | static void |
| default_reset_cb | Default stack reset callback used when caller does not supply one. | int reason | static void |
| default_sync_cb | Default stack sync callback used when caller does not supply one. | void | static void |
| ble_init_stack | Initialize NimBLE stack with custom callbacks. | const ble_init_config_t *config | esp_err_t |
| ble_stack_init | Initialize NimBLE stack with built-in callbacks. | void | esp_err_t |
| ble_stack_deinit | Stop NimBLE host task and release stack resources. | void | esp_err_t |

## iot-vehicle-tracking-system-firmware/main/src/ble_mgr.c
- File brief: BLE central manager handling scan/connect/discovery/notify workflow.

| Function | Brief | Input | Output |
|---|---|---|---|
| ble_mgr_queue_clear | Reset result queue before new async operation. | ble_mgr_ctx_t *mgr_ctx | static void |
| ble_mgr_queue_send | Send operation result to waiting task. | ble_mgr_ctx_t *mgr_ctx, ble_mgr_status_t status | static void |
| ble_mgr_queue_wait | Wait for operation result posted by BLE callbacks. | ble_mgr_ctx_t *mgr_ctx, ble_mgr_status_t *status, uint32_t timeout_ms | static bool |
| ble_mgr_connect_complete | Finalize connect/discovery operation and notify waiter. | ble_mgr_ctx_t *mgr_ctx, ble_mgr_status_t status | static ble_mgr_status_t |
| ble_mgr_gap_stack_reset_cb | NimBLE stack reset callback. | int reason | static void |
| ble_mgr_gap_stack_sync_cb | NimBLE sync callback used to release init wait. | void | static void |
| ble_mgr_adv_contains_service | Check whether advertisement payload includes target service UUID. | const struct ble_hs_adv_fields *adv_fields, const char *target_uuid | static bool |
| ble_mgr_gap_notification_cb | Route notification payload to matching characteristic callback. | ble_mgr_ctx_t *mgr_ctx, struct os_mbuf *om, uint16_t attr_handle, uint16_t conn_handle, bool indication | static void |
| ble_mgr_gatt_svc_chr_disc_completed_check | Evaluate discovery completion state and finalize connect flow. | ble_mgr_ctx_t *mgr_ctx, const struct ble_gatt_error *error | static void |
| ble_mgr_gatt_chr_discovered_cb | Characteristic discovery callback. | uint16_t conn_handle, const struct ble_gatt_error *error, const struct ble_gatt_chr *chr, void *arg | static int |
| ble_mgr_gatt_svc_discovered_cb | Service discovery callback. | uint16_t conn_handle, const struct ble_gatt_error *error, const struct ble_gatt_svc *service, void *arg | static int |
| ble_mgr_gap_connected_cb | Process GAP connect completion event. | ble_mgr_ctx_t *mgr_ctx, uint16_t conn_handle, int status | static void |
| ble_mgr_gap_event_cb | Unified GAP event handler. | struct ble_gap_event *event, void *arg | static int |
| ble_mgr_status_to_string | Convert BLE manager status enum to readable string. | ble_mgr_status_t status | const char * |
| ble_mgr_init | Initialize BLE manager singleton and wait for NimBLE sync. | uint32_t timeout_ms | ble_mgr_ctx_t * |
| ble_mgr_connect_service | Scan, connect, and discover one target BLE service profile. | ble_mgr_ctx_t *mgr_ctx, const ble_mgr_disc_cfg_t *disc_cfg, uint32_t timeout_ms, void *usr_ctx | ble_mgr_status_t |
| ble_mgr_send | Send GATT write to characteristic handle. | ble_mgr_ctx_t *mgr_ctx, uint16_t chr_handle, const char *data, size_t len | ble_mgr_status_t |
| ble_mgr_is_connected | Check active connection state. | ble_mgr_ctx_t *mgr_ctx | bool |
| ble_mgr_disconnect | Disconnect active BLE link. | ble_mgr_ctx_t *mgr_ctx | esp_err_t |

## iot-vehicle-tracking-system-firmware/main/src/ble_obd.c
- File brief: OBD-over-BLE session layer with ELM327 command/response handling.

| Function | Brief | Input | Output |
|---|---|---|---|
| ble_obd_tx_handle | Return discovered TX characteristic handle. | void | static uint16_t |
| ble_obd_rx_handle | Return discovered RX characteristic handle. | void | static uint16_t |
| ble_obd_device_filter_cb | Optional device filter used during BLE scan results. | ble_mgr_ctx_t *mgr_ctx, const ble_addr_t *addr, void *usr_ctx | static bool |
| ble_obd_disconnected_cb | Disconnect callback from BLE manager. | ble_mgr_ctx_t *mgr_ctx, void *usr_ctx | static bool |
| ble_obd_notify_cb | Notification handler for OBD RX characteristic. | const uint8_t *data, size_t len, uint16_t attr_handle, void *usr_ctx | static void |
| f | (not documented) | value_count >= 2 && values[0] == (ctx->tx_data.mode + 0x40) && values[1] == ctx->tx_data.pid | i |
| ble_obd_set_preferred_address | Configure preferred OBD adapter BLE address filter. | const char *address | esp_err_t |
| ble_obd_connect | Connect to OBD BLE service and prepare context. | ble_obd_response_cb_t response_cb, void *usr_ctx | ble_obd_ctx_t * |
| ble_obd_disconnect | Disconnect and free BLE OBD context. | ble_obd_ctx_t *ctx | esp_err_t |
| ble_obd_is_connected | Check whether BLE OBD session is currently connected. | ble_obd_ctx_t *ctx | bool |
| ble_obd_send_raw | Send raw adapter command and wait for response completion. | ble_obd_ctx_t *ctx, const char *command, uint32_t timeout_ms | esp_err_t |
| ble_obd_rxtx | Send OBD mode/PID request and wait for parsed response. | ble_obd_ctx_t *ctx, uint8_t mode, uint8_t pid, uint32_t timeout_ms | int |
| ble_obd_elm327_init | Run baseline ELM327 startup sequence. | ble_obd_ctx_t *ctx | esp_err_t |

## iot-vehicle-tracking-system-firmware/main/src/ble_util.c
- File brief: BLE address string/byte conversion helpers.

| Function | Brief | Input | Output |
|---|---|---|---|
| ble_addr_to_str | Convert BLE address bytes into standard MAC string. | const ble_addr_t *addr, char dst[BLE_ADDR_STR_LEN] | const char * |
| ble_addr_from_str | Parse MAC string into NimBLE address. | const char *src, ble_addr_t *addr | bool |

## iot-vehicle-tracking-system-firmware/main/src/command_handler.c
- File brief: Parse command payloads from cloud and expose consumable runtime actions.

| Function | Brief | Input | Output |
|---|---|---|---|
| command_handler_init | Initialize command parser state. | config_t *config | esp_err_t |
| command_parse_ota_update | Validate and parse OTA command parameters. | const cJSON *params, ota_command_t *out_cmd | static bool |
| command_apply_update_config | Apply remote configuration updates and persist into NVS. | const cJSON *params | static void |
| command_handler_process | Parse incoming command JSON and update internal action flags. | const char *command_json | void |
| command_handler_consume_location_request | Consume one-shot location request flag. | void | bool |
| command_handler_is_tracking_enabled | Read current tracking enabled state. | void | bool |
| command_handler_consume_action | Consume current pending high-level action. | void | command_action_t |
| command_handler_take_ota_command | Consume pending OTA command payload. | ota_command_t *out_cmd | bool |

## iot-vehicle-tracking-system-firmware/main/src/data_formatter.c
- File brief: JSON payload builders for telemetry/status/event/firmware channels.

| Function | Brief | Input | Output |
|---|---|---|---|
| data_formatter_print | Serialize cJSON object to compact string and free cJSON tree. | cJSON *root | static char * |
| data_format_rawdata | Format raw telemetry payload. | const config_t *cfg, const telemetry_t *telemetry | char * |
| data_format_status | Format status payload. | const config_t *cfg, const char *status, uint32_t session_id | char * |
| data_format_event | Format event payload. | const config_t *cfg, const char *event_type, int code, const char *message | char * |
| data_format_firmware | Format firmware status payload. | const config_t *cfg, const firmware_status_t *status | char * |

## iot-vehicle-tracking-system-firmware/main/src/imu_lis3dh.c
- File brief: LIS3DH I2C driver with motion interrupt setup and vibration metric.

| Function | Brief | Input | Output |
|---|---|---|---|
| imu_write_reg | Write one LIS3DH register. | uint8_t reg, uint8_t value | static esp_err_t |
| imu_read_reg | Read one LIS3DH register. | uint8_t reg, uint8_t *value | static esp_err_t |
| imu_read_regs | Read consecutive LIS3DH registers. | uint8_t reg, uint8_t *data, size_t len | static esp_err_t |
| imu_init | Initialize LIS3DH bus/device and default runtime registers. | void | esp_err_t |
| imu_configure_motion_interrupt | Configure hardware motion interrupt for wakeup detection. | uint8_t threshold_mg, uint8_t duration_ms | esp_err_t |
| imu_motion_detected | Read digital state of motion interrupt pin. | void | bool |
| imu_read_accel | Read raw acceleration for X/Y/Z axes. | int16_t *x, int16_t *y, int16_t *z | esp_err_t |
| imu_get_vibration_composite | Compute normalized vibration score from acceleration magnitude. | void | uint16_t |
| imu_deinit | Deinitialize IMU I2C resources. | void | void |

## iot-vehicle-tracking-system-firmware/main/src/modem_at.c
- File brief: Thread-safe AT command transport over UART with URC dispatch support.

| Function | Brief | Input | Output |
|---|---|---|---|
| modem_at_dispatch_line | Dispatch one response/URC line to registered callbacks. | const char *line | static void |
| modem_at_response_done | Detect AT command completion markers in response buffer. | const char *buffer | static bool |
| modem_at_init | Initialize UART and synchronization resources. | void | esp_err_t |
| modem_at_deinit | Release AT transport resources. | void | void |
| modem_at_send | Send command and wait for response completion. | const char *cmd, char *response, size_t resp_len, uint32_t timeout_ms | esp_err_t |
| modem_at_send_expect | Send AT command and assert expected marker in response. | const char *cmd, const char *expect, uint32_t timeout_ms | esp_err_t |
| modem_at_register_urc | Register URC prefix callback. | const char *prefix, modem_urc_cb_t cb | void |

## iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c
- File brief: GNSS control/parsing implementation over modem AT interface.

| Function | Brief | Input | Output |
|---|---|---|---|
| modem_gnss_parse_timestamp | Convert modem UTC timestamp string to milliseconds. | const char *utc_string | static uint64_t |
| modem_gnss_power_on | Enable modem GNSS engine. | void | esp_err_t |
| modem_gnss_power_off | Disable modem GNSS engine. | void | esp_err_t |
| modem_gnss_has_fix | Check whether last cached sample had valid fix. | void | bool |
| modem_gnss_get_location | Query modem for GNSS sample and parse `+CGNSINF` payload. | gnss_data_t *data | esp_err_t |

## iot-vehicle-tracking-system-firmware/main/src/modem_lte.c
- File brief: LTE modem initialization, network registration, and PDP data session flow.

| Function | Brief | Input | Output |
|---|---|---|---|
| modem_lte_send_simple | Send AT command and check expected token. | const char *cmd, const char *expect, uint32_t timeout_ms | static esp_err_t |
| modem_lte_cereg_registered | Parse `+CEREG` response and determine registration state. | const char *response | static bool |
| modem_lte_wait_cereg_registered | Poll registration state until attached or timeout. | void | static esp_err_t |
| modem_lte_init | Initialize modem power and LTE base profile. | void | esp_err_t |
| modem_lte_connect | Connect LTE data path by registration + PDP activation. | void | esp_err_t |
| modem_lte_disconnect | Deactivate LTE PDP context. | void | esp_err_t |
| modem_lte_sleep | Enable modem clock-stop low power mode. | void | esp_err_t |
| modem_lte_wakeup | Wake modem from low power mode with basic `AT` probe. | void | esp_err_t |
| modem_lte_get_rssi | Read RSSI value and convert CSQ index to dBm. | void | int |
| modem_lte_is_connected | Read cached LTE connection flag. | void | bool |

## iot-vehicle-tracking-system-firmware/main/src/mqtt_client.c
- File brief: Device-scoped MQTT topic management and publish/subscribe wrapper.

| Function | Brief | Input | Output |
|---|---|---|---|
| tracker_mqtt_build_topics | Build all MQTT topics from current device ID. | void | static void |
| tracker_mqtt_event_handler | Central MQTT event callback from ESP-IDF MQTT client. | void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data | static void |
| tracker_mqtt_init | Initialize MQTT client with topic mapping and credentials. | const config_t *cfg | esp_err_t |
| tracker_mqtt_connect | Start MQTT client and begin broker connection. | void | esp_err_t |
| tracker_mqtt_disconnect | Stop MQTT client and disconnect broker session. | void | esp_err_t |
| tracker_mqtt_is_connected | Read cached connection flag from event callbacks. | void | bool |
| tracker_mqtt_publish | Publish generic payload to specified topic. | const char *topic, const char *payload, int qos | esp_err_t |
| tracker_mqtt_publish_rawdata | Publish to raw telemetry topic. | const char *json_payload | esp_err_t |
| tracker_mqtt_publish_status | Publish to status topic. | const char *json_payload | esp_err_t |
| tracker_mqtt_publish_event | Publish to event topic. | const char *json_payload | esp_err_t |
| tracker_mqtt_publish_firmware | Publish to firmware topic. | const char *json_payload | esp_err_t |
| tracker_mqtt_subscribe_commands | Subscribe to command topic manually. | void | esp_err_t |
| tracker_mqtt_set_command_callback | Register command callback. | mqtt_command_cb_t cb | void |
| tracker_mqtt_rawdata_topic | Get rawdata topic string. | void | const char * |
| tracker_mqtt_status_topic | Get status topic string. | void | const char * |
| tracker_mqtt_events_topic | Get events topic string. | void | const char * |
| tracker_mqtt_firmware_topic | Get firmware topic string. | void | const char * |
| tracker_mqtt_commands_topic | Get commands topic string. | void | const char * |

## iot-vehicle-tracking-system-firmware/main/src/nvs_config.c
- File brief: Runtime configuration persistence in NVS with validation/fallback logic.

| Function | Brief | Input | Output |
|---|---|---|---|
| app_config_set_defaults | Populate default runtime configuration. | config_t *config | void |
| app_config_is_valid | Validate runtime configuration fields and constraints. | const config_t *config | bool |
| nvs_config_init | Initialize NVS flash and handle version/full-page recovery. | void | esp_err_t |
| nvs_config_save | Save runtime config blob into NVS. | const config_t *config | esp_err_t |
| nvs_config_load | Load runtime config from NVS with self-healing fallback behavior. | config_t *config | esp_err_t |

## iot-vehicle-tracking-system-firmware/main/src/power_mgr.c
- File brief: Power domain selection, charger control, and low-voltage evaluation.

| Function | Brief | Input | Output |
|---|---|---|---|
| power_mgr_init | Configure power-control and status GPIOs. | void | esp_err_t |
| power_select_battery | Route system power from main battery path. | void | void |
| power_select_backup | Route system power from backup path. | void | void |
| charger_enable | Enable charger control output. | void | void |
| charger_disable | Disable charger control output. | void | void |
| power_is_low_voltage | Read low-voltage status pin from external circuit. | void | bool |
| modem_power_key_pulse | Send modem power-key pulse sequence. | void | static esp_err_t |
| modem_power_on | Request modem power-on by key pulse. | void | esp_err_t |
| modem_power_off | Request modem power-off by key pulse. | void | esp_err_t |
| power_get_status | Read power status and evaluate low-voltage latch with hysteresis. | float lvd_threshold_v, float lvd_hysteresis_v | power_status_t |

## iot-vehicle-tracking-system-firmware/main/src/state_machine.c
- File brief: Main tracker runtime finite-state machine and subsystem orchestration.

| Function | Brief | Input | Output |
|---|---|---|---|
| obd_convert_rpm | Convert OBD RPM payload bytes to integer RPM. | int32_t *value, const uint8_t *data, size_t len | int |
| obd_convert_percent | Convert OBD percentage payload byte to percentage. | int32_t *value, const uint8_t *data, size_t len | int |
| obd_convert_temperature | Convert OBD temperature payload byte to Celsius. | int32_t *value, const uint8_t *data, size_t len | int |
| state_machine_obd_response_cb | Callback for parsed OBD responses. | int pid, const uint8_t *data, size_t len, void *usr_ctx | static void |
| state_machine_command_callback | MQTT command callback forwarding payload to command parser. | const char *topic, const char *payload | static void |
| state_machine_refresh_telemetry | Refresh telemetry snapshot from sensors/modem/OBD. | bool read_gnss, bool read_obd | static void |
| state_machine_publish_rawdata | Format and publish rawdata payload. | void | static void |
| state_machine_publish_status | Format and publish status payload. | const char *status | static void |
| state_machine_publish_event | Format and publish event payload. | const char *event_type, int code, const char *message | static void |
| state_machine_publish_firmware_payload | Publish firmware payload object to firmware topic. | const firmware_status_t *firmware | static void |
| state_machine_publish_firmware_status | Build firmware status payload fields then publish. | const char *status, uint8_t progress, const char *version, const char *job_id, const char *partition, const char *error | static void |
| state_machine_try_connect_ble | Attempt BLE OBD connection with retry and ELM327 initialization. | void | static void |
| state_machine_try_connect_network | Bring up LTE/GNSS/MQTT network stack. | void | static void |
| state_machine_try_confirm_running_firmware | Confirm newly booted OTA image if pending confirmation flag is set. | void | static void |
| state_machine_process_ota_command | Process OTA update/rollback actions consumed from command handler. | command_action_t action | static void |
| state_machine_prepare_sleep | Prepare peripherals and wakeup sources before deep sleep. | void | static void |
| state_machine_init | Initialize subsystem stack used by state machine. | const config_t *config | esp_err_t |
| state_machine_run | Execute one finite-state-machine iteration. | app_state_t current_state | app_state_t |
| state_machine_get_telemetry | Return current telemetry snapshot copy. | void | telemetry_t |

## iot-vehicle-tracking-system-firmware/main/src/util.c
- File brief: Generic utility functions and OTA update/rollback helpers.

| Function | Brief | Input | Output |
|---|---|---|---|
| util_copy_string | Safe bounded string copy with guaranteed null terminator. | char *dst, size_t dst_size, const char *src | size_t |
| util_uptime_ms | Convert ESP high-resolution timer to milliseconds. | void | uint64_t |
| util_clamp_float | Clamp float value to inclusive bounds. | float value, float min_value, float max_value | float |
| util_clamp_int | Clamp integer value to inclusive bounds. | int value, int min_value, int max_value | int |
| util_string_empty | Check whether string is NULL or empty. | const char *value | bool |
| util_hex_to_bytes | Convert lowercase/uppercase hex string to byte array. | const char *hex, uint8_t *out, size_t out_len | static bool |
| util_fill_partition_label | Fill human-readable partition label into output buffer. | const esp_partition_t *partition, char *out, size_t out_size | static void |
| util_ota_apply_update | Download, verify, and install OTA image. | const config_t *cfg, const char *current_version, const ota_command_t *cmd, firmware_status_t *out_status | esp_err_t |
| util_ota_trigger_manual_rollback | Trigger manual rollback by selecting fallback partition. | firmware_status_t *out_status | esp_err_t |

