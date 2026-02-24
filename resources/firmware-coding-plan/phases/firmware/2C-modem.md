# Sub-Phase 2C: Modem SIMCom A7600CE-T

> **Context:** ~5KB | **Max Files:** 8 | **Est. Time:** 1-2 sessions

## Summary
Implement AT command engine, LTE connection control, và GNSS positioning cho modem SIMCom A7600CE-T. Tất cả viết mới. Giao tiếp qua UART (GPIO16=TX, GPIO17=RX, 115200 baud).

## Tasks
| ID     | Description                          | Files                                              |
| ------ | ------------------------------------ | -------------------------------------------------- |
| FW-030 | AT command engine (send/receive)     | `main/inc/modem_at.h`, `main/src/modem_at.c`       |
| FW-031 | LTE connection control               | `main/inc/modem_lte.h`, `main/src/modem_lte.c`     |
| FW-032 | GNSS positioning control             | `main/inc/modem_gnss.h`, `main/src/modem_gnss.c`   |

## 1. AT Command Engine (`modem_at.c`)

| Item | Detail |
|------|--------|
| UART | GPIO16=TX, GPIO17=RX, 115200 baud, 8N1 |
| Pattern | Send command -> wait response -> parse (OK/ERROR/URC) |
| Serialization | xQueue to prevent concurrent access |
| Timeout | Configurable per command (default 5s) |

### API
```c
esp_err_t modem_at_init(void);
void      modem_at_deinit(void);

// Send AT command and wait for response
// Returns ESP_OK if response contains `expect` string
esp_err_t modem_at_send(const char *cmd, char *response, size_t resp_len, uint32_t timeout_ms);

// Send AT command and expect specific response
esp_err_t modem_at_send_expect(const char *cmd, const char *expect, uint32_t timeout_ms);

// Register URC (Unsolicited Result Code) callback
typedef void (*modem_urc_cb_t)(const char *urc_line);
void modem_at_register_urc(const char *prefix, modem_urc_cb_t cb);
```

### Implementation Notes
```c
// UART event task pattern:
// 1. uart_driver_install() with RX buffer 1024 bytes
// 2. uart_pattern_queue_reset() for "\r\n" detection
// 3. xQueueSend() to serialize AT commands
// 4. Response parsing: scan for "OK", "ERROR", "+CME ERROR"
//
// URC handling:
// - "+CPIN:", "+CREG:", "+CSQ:" — status updates
// - "+CGNSINF:" — GNSS data (if using URC mode)
//
// Thread safety:
// - xSemaphore for AT command serialization
// - Only one AT command at a time
```

## 2. LTE Control (`modem_lte.c`)

### State Machine
| State | AT Sequence |
|-------|-------------|
| Init | AT -> CPIN? -> CREG? -> CSQ |
| Connect | CNMP=38 -> CGDCONT -> CGACT=1 |
| Disconnect | CGACT=0 |
| Sleep | CSCLK=1 or CFUN=0 |
| Power | GPIO25 PWRKEY toggle (1s pulse) |

### API
```c
esp_err_t modem_lte_init(void);       // Power on + AT init sequence
esp_err_t modem_lte_connect(void);    // Activate PDP context
esp_err_t modem_lte_disconnect(void); // Deactivate PDP context
esp_err_t modem_lte_sleep(void);      // Enter low-power mode
esp_err_t modem_lte_wakeup(void);     // Exit low-power mode
int       modem_lte_get_rssi(void);   // Signal strength (dBm)
bool      modem_lte_is_connected(void);
```

### AT Init Sequence (Detail)
```c
// 1. Power on: GPIO25 PWRKEY pulse 1s
// 2. Wait for "RDY" or "AT" echo (timeout 10s)
// 3. AT             -> OK (basic check)
// 4. ATE0           -> OK (echo off)
// 5. AT+CPIN?       -> +CPIN: READY (SIM check)
// 6. AT+CREG?       -> +CREG: 0,1 (network registered)
//                   -> Retry up to 30s if +CREG: 0,2 (searching)
// 7. AT+CSQ         -> +CSQ: xx,yy (signal quality)
//                   -> xx < 10: weak signal warning
// 8. AT+CNMP=38     -> OK (prefer LTE)
// 9. AT+CGDCONT=1,"IP","internet" -> OK (APN config)
//    APN may vary by carrier
```

### PDP Context Activation
```c
// AT+CGACT=1,1     -> OK (activate PDP context)
// AT+CGPADDR=1     -> +CGPADDR: 1,"x.x.x.x" (verify IP)
//
// For MQTT via PPP:
// Use esp_modem component for PPP over UART
// esp_modem_new_dev() -> esp_modem_set_mode(ESP_MODEM_MODE_DATA)
// This gives TCP/IP stack access for esp_mqtt_client
```

## 3. GNSS Control (`modem_gnss.c`)

| Item | Detail |
|------|--------|
| Power on | `AT+CGNSPWR=1` |
| Read | `AT+CGNSINF` -> parse lat, lon, speed, course, satellites |
| Power off | `AT+CGNSPWR=0` |
| Fix timeout | 60s -> fallback (send data without GPS) |

### API
```c
esp_err_t modem_gnss_power_on(void);
esp_err_t modem_gnss_power_off(void);
bool      modem_gnss_has_fix(void);

typedef struct {
    double   latitude;
    double   longitude;
    float    speed_kmh;
    float    course_deg;
    uint8_t  satellites;
    uint64_t timestamp_ms;   // Unix milliseconds from GNSS
    bool     fix_valid;
} gnss_data_t;

esp_err_t modem_gnss_get_location(gnss_data_t *data);
```

### CGNSINF Response Parsing
```c
// AT+CGNSINF
// Response: +CGNSINF: run,fix,utc,lat,lon,alt,speed,course,fixmode,
//           reserved,HDOP,PDOP,VDOP,reserved,satGPS,satGLONASS,reserved,C/N0
//
// Example:
// +CGNSINF: 1,1,20240101120000.000,21.028511,105.804817,10.0,60.0,180.0,
//           2,,1.2,1.5,1.0,,8,4,,35
//
// Parse fields:
//   [0] run status (1=on)
//   [1] fix status (1=valid)
//   [2] UTC datetime
//   [3] latitude (decimal degrees)
//   [4] longitude (decimal degrees)
//   [5] altitude (meters)
//   [6] speed (km/h, over ground)
//   [7] course (degrees, 0-360)
//   [14] GPS satellites in view
//   [15] GLONASS satellites in view
```

### GNSS Timing Strategy
```c
// Cold start: ~60s -> accept sending data without GPS
// Warm start: ~15s (GNSS was recently active)
// Hot start:  ~1s  (wakeup from light sleep)
//
// Strategy:
// 1. Power on GNSS
// 2. Poll AT+CGNSINF every 2s
// 3. If fix_valid after 60s timeout -> send data with lat=0, lon=0
// 4. Save last known position in RTC memory for comparison
```

## Dependencies
- ✅ Phase 1A done (pin_map.h, util.h)
- ✅ Phase 2B recommended (power_mgr for modem_power_on/off)
- ⚠️ Independent from Phase 2A (BLE OBD2)
- ➡️ Phase 3A (MQTT) needs LTE connected + PPP for TCP/IP
- ➡️ Phase 3A (Data Formatter) needs `gnss_data_t`

## Verification
- [ ] `idf.py build` — compiles without errors
- [ ] AT engine: `AT` -> `OK` response received via UART
- [ ] SIM detected: `AT+CPIN?` -> `+CPIN: READY`
- [ ] Network registered: `AT+CREG?` -> `+CREG: 0,1`
- [ ] PDP activated: `AT+CGACT=1,1` -> IP address assigned
- [ ] GNSS fix: `AT+CGNSINF` returns valid lat/lon after <60s
- [ ] PPP mode: `esp_modem` provides TCP/IP stack
- [ ] Sleep/wakeup cycle: modem enters/exits low-power correctly

## Full Spec Reference
- [00-firmware-architecture.md](../../00-firmware-architecture.md) — Section 4 (GPIO Pin Map)
- [firmware-development-plan.md](../../../../design-reports/firmware-development-plan.md) — Phase 3
