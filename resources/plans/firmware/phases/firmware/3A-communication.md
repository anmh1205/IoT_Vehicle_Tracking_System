# Sub-Phase 3A: MQTT & Communication

> **Context:** ~6KB | **Max Files:** 8 | **Est. Time:** 1-2 sessions
> **CRITICAL:** Payloads MUST match `Tracking_MqttBridge` Zod schema (`payload.validator.ts`)

## Summary
Implement MQTT client (ESP-IDF component qua PPP), JSON data formatter cho telemetry, và command handler cho server commands. Firmware publish format phải khớp chính xác với backend bridge validator.

## Tasks
| ID     | Description                          | Files                                                        |
| ------ | ------------------------------------ | ------------------------------------------------------------ |
| FW-040 | MQTT client (connect, pub, sub)      | `main/inc/mqtt_client.h`, `main/src/mqtt_client.c`           |
| FW-041 | Data formatter (JSON payload)        | `main/inc/data_formatter.h`, `main/src/data_formatter.c`     |
| FW-042 | Command handler (server commands)    | `main/inc/command_handler.h`, `main/src/command_handler.c`   |

## 1. MQTT Client (`mqtt_client.c`)

| Item | Detail |
|------|--------|
| Library | ESP-IDF `esp_mqtt_client` |
| Transport | PPP over UART (via `esp_modem` from Phase 2C) |
| Broker | EMQX, TCP port 1883 (dev) / TLS 8883 (prod) |
| Auth | Username/password from NVS config |
| Session | `clean_session=0` (persistent, QoS 1 messages survive reconnect) |

### API
```c
esp_err_t tracker_mqtt_init(const config_t *cfg);
esp_err_t tracker_mqtt_connect(void);
esp_err_t tracker_mqtt_disconnect(void);
bool      tracker_mqtt_is_connected(void);

// Publish to topic with QoS
esp_err_t tracker_mqtt_publish(const char *topic, const char *payload, int qos);

// Convenience publishers
esp_err_t tracker_mqtt_publish_rawdata(const char *json_payload);
esp_err_t tracker_mqtt_publish_status(const char *status);  // "running" | "stopped"
esp_err_t tracker_mqtt_publish_event(const char *event_type, int code, const char *message);

// Subscribe to commands topic
esp_err_t tracker_mqtt_subscribe_commands(void);

// Register command callback
typedef void (*mqtt_command_cb_t)(const char *command, const char *payload);
void tracker_mqtt_set_command_callback(mqtt_command_cb_t cb);
```

### Topics (from config)
```c
// Topic format: v1/{device_id}/{type}
// Example: v1/TRACKER_001/rawdata

#define TOPIC_RAWDATA   "v1/%s/rawdata"    // QoS 0, periodic
#define TOPIC_STATUS    "v1/%s/status"      // QoS 1, state change
#define TOPIC_EVENTS    "v1/%s/events"      // QoS 1, alerts/errors
#define TOPIC_FIRMWARE  "v1/%s/firmware"    // QoS 1, OTA (future)
#define TOPIC_COMMANDS  "v1/%s/commands"    // QoS 1, subscribe
```

### Connection Config
```c
esp_mqtt_client_config_t mqtt_cfg = {
    .broker.address.uri = "mqtt://emqx-host:1883",
    .credentials.username = config->mqtt_username,
    .credentials.authentication.password = config->mqtt_password,
    .credentials.client_id = config->device_id,
    .session.keepalive = 60,
    .session.disable_clean_session = true,  // persistent session
    .network.reconnect_timeout_ms = 5000,
    .buffer.size = 1024,
    .buffer.out_size = 1024,
};
```

### Offline Buffer Strategy
```c
// When MQTT disconnected:
// 1. Store messages in NVS (max 10 entries, ~4KB each)
// 2. On reconnect: flush buffer in FIFO order
// 3. If NVS full: drop oldest rawdata (keep events)
//
// NVS keys: "buf_0"..."buf_9" + "buf_head" + "buf_tail"
```

## 2. Data Formatter (`data_formatter.c`)

### API
```c
// Build JSON payload for rawdata topic
// Returns cJSON string (caller must free with cJSON_free())
char *data_format_rawdata(
    const config_t    *cfg,
    const gnss_data_t *gnss,
    uint16_t           vibration,
    float              battery_top,
    float              battery_bot,
    bool               ignition,
    int                error_code
);

// Build JSON payload for status topic
char *data_format_status(const char *device_id, const char *status);

// Build JSON payload for event topic
char *data_format_event(
    const char *device_id,
    const char *event_type,  // "error" | "warning" | "info"
    int         code,
    const char *message
);
```

### RawData JSON (MUST match bridge Zod schema)
```json
{
  "device_id": "TRACKER_001",
  "auth_token": "device-secret-token",
  "timestamp": 1704067200000,
  "uptime": 3600,
  "data": {
    "vibration": 120,
    "battery_top": 12.5,
    "battery_bot": 3.8,
    "latitude": 21.028511,
    "longitude": 105.804817,
    "speed": 60.0,
    "course": 180.0,
    "satellites": 8,
    "ignition": true,
    "error_code": 0
  }
}
```

### Validation Rules (bridge rejects if invalid)
```c
// MANDATORY fields:
// - device_id: string, len >= 1
// - auth_token: string, len >= 1
// - timestamp: number (Unix ms)
// - data.latitude: -90.0 to 90.0
// - data.longitude: -180.0 to 180.0
// - data.speed: >= 0
// - data.course: 0 to 360
// - data.satellites: >= 0
//
// If GNSS has no fix: set lat=0, lon=0, satellites=0
```

### cJSON Implementation
```c
// Use ESP-IDF built-in cJSON library
// Pattern:
//   cJSON *root = cJSON_CreateObject();
//   cJSON_AddStringToObject(root, "device_id", cfg->device_id);
//   cJSON *data = cJSON_AddObjectToObject(root, "data");
//   cJSON_AddNumberToObject(data, "latitude", gnss->latitude);
//   char *json = cJSON_PrintUnformatted(root);  // compact JSON
//   cJSON_Delete(root);
//   return json;  // caller frees with cJSON_free()
```

### Field Mapping (Source -> JSON)

| JSON Field | C Source | Notes |
|------------|----------|-------|
| `device_id` | `cfg->device_id` | From NVS |
| `auth_token` | `cfg->auth_token` | From NVS |
| `timestamp` | `gnss->timestamp_ms` or `esp_timer_get_time()/1000` | GNSS preferred |
| `uptime` | `esp_timer_get_time() / 1000` | ms from boot |
| `vibration` | `imu_get_vibration_composite()` | 0-1000 scale |
| `battery_top` | `adc_read_battery_voltage()` | Vehicle battery V |
| `battery_bot` | TBD (second ADC or fixed) | Backup battery V |
| `latitude` | `gnss->latitude` | 0.0 if no fix |
| `longitude` | `gnss->longitude` | 0.0 if no fix |
| `speed` | `gnss->speed_kmh` (priority) or OBD2 | km/h |
| `course` | `gnss->course_deg` | 0-360 |
| `satellites` | `gnss->satellites` | 0 if no fix |
| `ignition` | OBD2 RPM>0 (priority) or U_batt>13V | boolean |
| `error_code` | App error state | 0 = OK |

## 3. Command Handler (`command_handler.c`)

### API
```c
esp_err_t command_handler_init(void);

// Process incoming command from MQTT
void command_handler_process(const char *command_json);
```

### Supported Commands
| Command | Action | Response |
|---------|--------|----------|
| `update_config` | Update NVS config fields | Publish event "config_updated" |
| `request_location` | Force GNSS fix + publish rawdata | Immediate rawdata publish |
| `enable_tracking` | Set tracking mode ON/OFF | Publish event "tracking_changed" |
| `reboot` | `esp_restart()` | None (device reboots) |

### Command JSON Format (from server)
```json
{
  "command": "update_config",
  "params": {
    "heartbeat_interval_s": 600,
    "tracking_interval_s": 5
  }
}
```

## Dependencies
- ✅ Phase 1A done (app_config.h, util.h)
- ✅ Phase 2B done (adc_reader, imu_lis3dh for data sources)
- ✅ Phase 2C done (modem_lte for PPP connection, modem_gnss for GNSS data)
- ➡️ Phase 4A (State Machine) calls MQTT publish functions

## Verification
- [ ] `idf.py build` — compiles without errors
- [ ] MQTT connects to EMQX broker (check EMQX dashboard: http://localhost:18083)
- [ ] Publish rawdata: message visible in EMQX topic viewer
- [ ] Bridge processes rawdata: check VictoriaMetrics for data points
- [ ] JSON format matches Zod schema: no validation errors in bridge logs
- [ ] Status publish: "running"/"stopped" processed by bridge
- [ ] Event publish: appears in VictoriaLogs
- [ ] Command subscribe: receive and execute `request_location`
- [ ] Offline buffer: disconnect -> publish -> reconnect -> buffer flushed

## Full Spec Reference
- [00-firmware-architecture.md](../../00-firmware-architecture.md) — Section 6 (MQTT Integration)
- [22-backend-mqtt-bridge.md](../../../cloud/22-backend-mqtt-bridge.md) — Bridge payload contract
- [firmware-development-plan.md](../../../../reports/system-design/firmware-development/firmware-development-plan.md) — Phase 4
