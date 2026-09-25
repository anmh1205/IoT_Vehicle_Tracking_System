---
phase: "01"
title: "Memory Safety P0 Fixes"
status: pending
priority: P0
effort: 4h
dependencies: []
---

# Phase 01: Memory Safety P0

## Overview
Fix all critical memory safety issues: buffer aliasing UB, unbounded memcpy, ignored snprintf truncation.

## Requirements
- Zero undefined behavior
- Zero buffer overflow risk
- All snprintf truncation detected/handled

## Related Code Files
- Modify: `components/adapter-mqtt-sim7600-at/src/mqtt_session.c`
- Modify: `components/adapter-ble-obd-nimble/src/ble_obd.c`
- Modify: `components/adapter-modem-sim7600-at/src/modem_at.c`
- Modify: `components/adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c`
- Modify: `components/domain-connectivity/src/command_handler.c`
- Modify: `components/contracts-device-cloud/src/data_formatter.c`
- Modify: `components/domain-ota/src/util_ota_http.c`

## Implementation Steps

### 1.1 Fix buffer aliasing UB in mqtt_session.c:95-103

**Problem:** `tracker_mqtt_parse_ipv4_literal(host, host, sizeof(host))` dùng same buffer for input AND output → memcpy overlap UB.

**Fix:** Use intermediate buffer:
```c
char host[TRACKER_HOST_MAX_LEN] = {0};
memcpy(host, host_start, host_len);
host[host_len] = '\0';
char resolved[TRACKER_HOST_MAX_LEN] = {0};
if (tracker_mqtt_parse_ipv4_literal(host, resolved, sizeof(resolved))) {
    memcpy(host, resolved, sizeof(host));
}
```

### 1.2 Add bounds check to 12 memcpy sites

**Checklist:**
- [ ] `ble_obd.c:509` — `memcpy(s_recent_pids, pids, len)` → clamp `len` to `sizeof(s_recent_pids)`
- [ ] `modem_at.c:364` — `memcpy(response, data, len)` → check `len <= sizeof(response)`
- [ ] `modem_at.c:755` — `memcpy(s_uart_rx_buf + s_uart_rx_len, data, len)` → check remaining space
- [ ] `mqtt_session.c:100` — `memcpy(s_mqtt_rx_buf + offset, data, len)` → check `offset + len <= sizeof(s_mqtt_rx_buf)`
- [ ] `mqtt_urc_parser.c:624` — `memcpy(topic, data, len)` → clamp to `sizeof(topic) - 1`
- [ ] `mqtt_urc_parser.c:667` — `memcpy(command, data, len)` → clamp to `sizeof(command) - 1`

### 1.3 Fix 42+ (void)snprintf truncation ignored

**Pattern:** Replace `(void)snprintf(buf, sizeof(buf), ...)` with:
```c
int written = snprintf(buf, sizeof(buf), "...");
if (written < 0 || (size_t)written >= sizeof(buf)) {
    ESP_LOGW(TAG, "event=truncation buf_size=%zu needed=%d", sizeof(buf), written);
    buf[sizeof(buf) - 1] = '\0';
}
```

**Worst offenders (fix all):**
- `util_ota_http.c`: 6/7 snprintf casts — fix all
- `mqtt_session.c`: L653 + any others
- `command_handler.c`: pervasive
- `data_formatter.c`: pervasive

### 1.4 Stack overflow risk assessment

**Reduce stack allocations where possible:**
- `modem_gnss.c:355,383`: `char response[512] + char line[512]` — consider heap alloc or reuse buffer
- `mqtt_urc_parser.c:565`: `char response[MQTT_AT_RESPONSE_MAX_LEN]` — verify size constant
- `mqtt_session.c:347`: `char response[MQTT_AT_RESPONSE_MAX_LEN]` — same

### 1.5 Replace unsafe atof/atoi in modem_gnss.c

**7 atof() + 2 atoi() calls:**
- Replace with `strtod()` + validation
- Add range validation for lat ∈ [-90, 90], lon ∈ [-180, 180]

## Success Criteria
- [ ] Buffer aliasing UB fixed
- [ ] 12 memcpy sites have bounds checks
- [ ] 0 (void)snprintf without truncation detection
- [ ] Stack allocations verified safe
- [ ] No unsafe atof/atoi in modem_gnss.c
- [ ] Build pass
