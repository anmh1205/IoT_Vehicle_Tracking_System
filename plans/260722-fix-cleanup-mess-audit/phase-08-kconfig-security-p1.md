---
phase: "08"
title: "Kconfig & Build Security"
status: pending
priority: P1
effort: 2h
dependencies: []
---

# Phase 08: Kconfig & Build Security

## Overview
Fix 4 Kconfig security issues: weak defaults, duplicate entries, TLS verify off by default, no length validation.

## Requirements
- Safe defaults for all security-sensitive configs
- TLS verify ON by default
- Input length validation for string configs
- No duplicate entries

## Related Code Files
- Modify: `components/platform-board-esp32s3/Kconfig.projbuild` (or wherever Kconfig is defined)
- Modify: `components/domain-connectivity/src/command_handler.c` (validation)

## Implementation Steps

### 8.1 Change insecure defaults

| Config | Current Default | New Default | Rationale |
|--------|----------------|-------------|-----------|
| Device ID | `"TRACKER_001"` | `""` (empty) | Force explicit config. Firmware should refuse to start with empty device ID. |
| Auth token | `"auth-token"` | `""` (empty) | Same — must be provisioned before connect |
| TLS verify server | `n` (no) | `y` (yes) | Must verify server cert in production |

### 8.2 Add validation in bootstrap

In `tracker-app-bootstrap.c`, after config load:
```c
static bool validate_security_config(const tracker_config_t *cfg) {
    if (cfg->device_id[0] == '\0' || strlen(cfg->device_id) < 3) {
        ESP_LOGE(TAG, "event=invalid_device_id id='%s'", cfg->device_id);
        return false;
    }
    if (cfg->auth_token[0] == '\0' || strlen(cfg->auth_token) < 8) {
        ESP_LOGE(TAG, "event=invalid_auth_token length=%zu", strlen(cfg->auth_token));
        return false;
    }
    return true;
}
```

### 8.3 Remove duplicate MQTT host entries

Find and merge duplicate definitions:
- `TRACKER_FIELD_VALIDATION_MQTT_HOST` == `TRACKER_DEFAULT_MQTT_HOST` → keep one
- Same for any other duplicate config keys

### 8.4 Add length validation for string configs

In Kconfig, add `range` or `length` constraints where possible:
```
config TRACKER_DEVICE_ID_MAX_LEN
    int "Maximum device ID length"
    default 64
    range 1 128

config TRACKER_AUTH_TOKEN_MAX_LEN
    int "Maximum auth token length"
    default 128
    range 8 256
```

In `command_handler.c`, validate string lengths before applying config updates:
```c
if (strlen(new_device_id) > CONFIG_TRACKER_DEVICE_ID_MAX_LEN) {
    ESP_LOGE(TAG, "device_id too long: %zu > %d", strlen(new_device_id), CONFIG_TRACKER_DEVICE_ID_MAX_LEN);
    return COMMAND_RESULT_INVALID;
}
```

## Success Criteria
- [ ] TLS verify ON by default
- [ ] Device ID default is empty
- [ ] Auth token default is empty
- [ ] Bootstrap validates security config
- [ ] No duplicate config entries
- [ ] String length validation in config updates
- [ ] Build pass
