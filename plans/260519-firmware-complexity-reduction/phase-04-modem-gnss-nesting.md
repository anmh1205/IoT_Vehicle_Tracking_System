---
phase: "04"
title: "modem_gnss.c Nesting Depth Reduction"
status: pending
priority: P1
effort: 2h
---

# Phase 04: modem_gnss.c Nesting Depth Reduction

## Context
- Audit report: `resources/docs/firmware-complexity-audit-2026-05-18.md`
- Plan: `plans/260519-firmware-complexity-reduction/plan.md`
- Depends on: Phase 01
- Target: Max nesting depth 7 → 4

## Overview
modem_gnss.c có nesting depth 7 - cao nhất codebase. Phase này extract nested logic thành các hàm nhỏ, dùng early returns.

## Tasks

### 1. Extract self-heal logic

**modem_gnss_self_heal_if_needed()** hiện tại có depth 7:
```c
static void modem_gnss_self_heal_if_needed(uint64_t now_ms) {
    if (now_ms - s_last_self_heal_ms >= MODEM_GNSS_SELF_HEAL_INTERVAL_MS) {
        s_last_self_heal_ms = now_ms;
        if (s_no_fix_recover_pending) {
            if (now_ms >= s_no_fix_recover_ready_ms) {
                esp_err_t err = modem_at_send_command("AT+CGNSPWR=1", ...);
                if (err == ESP_OK) {
                    if (strstr(response, "+CGNSPWR: 1") != NULL) {
                        // depth 7 here
                    }
                }
            }
        }
    }
}
```

**Refactor thành**:
```c
/* ===================== Self-Heal Predicates ===================== */

static bool modem_gnss_should_self_heal(uint64_t now_ms) {
    return (now_ms - s_last_self_heal_ms) >= MODEM_GNSS_SELF_HEAL_INTERVAL_MS;
}

static bool modem_gnss_should_attempt_no_fix_recover(uint64_t now_ms) {
    return s_no_fix_recover_pending && now_ms >= s_no_fix_recover_ready_ms;
}

/* ===================== Self-Heal Actions ===================== */

static esp_err_t modem_gnss_attempt_cgnsinf_recovery(void) {
    char response[128];
    esp_err_t err = modem_at_send_command("AT+CGNSPWR=1", response, sizeof(response), 1000);
    if (err != ESP_OK) {
        return err;
    }
    if (strstr(response, "+CGNSPWR: 1") == NULL) {
        ESP_LOGW(TAG, "CGNSINF recovery: unexpected response");
        return ESP_ERR_INVALID_RESPONSE;
    }
    return ESP_OK;
}

static void modem_gnss_handle_recovery_result(esp_err_t err, uint64_t now_ms) {
    if (err == ESP_OK) {
        s_no_fix_recover_pending = false;
        s_last_no_fix_recover_ms = now_ms;
        ESP_LOGI(TAG, "GNSS self-heal: CGNSINF recovery successful");
    } else {
        ESP_LOGW(TAG, "GNSS self-heal: CGNSINF recovery failed: %s", esp_err_to_name(err));
    }
}

/* ===================== Main Self-Heal Entry ===================== */

static void modem_gnss_self_heal_if_needed(uint64_t now_ms) {
    if (!modem_gnss_should_self_heal(now_ms)) {
        return;
    }
    s_last_self_heal_ms = now_ms;

    if (!modem_gnss_should_attempt_no_fix_recover(now_ms)) {
        return;
    }

    esp_err_t err = modem_gnss_attempt_cgnsinf_recovery();
    modem_gnss_handle_recovery_result(err, now_ms);
}
```

### 2. Extract CGNSINF parse validation

**modem_gnss_parse_cgnsinf()** hiện tại:
```c
// Tách validation và parsing thành 2 hàm:

static bool modem_gnss_is_cgnsinf_response_valid(const char *response) {
    if (response == NULL) {
        return false;
    }
    if (strstr(response, "+CGNSINF:") == NULL) {
        return false;
    }
    return true;
}

static esp_err_t modem_gnss_parse_cgnsinf_fields(
    const char *response, gnss_data_t *data) {
    // Parse logic, max depth 3
    // Split response by commas
    // Validate field count
    // Extract latitude, longitude, speed, course, satellites
    // Return ESP_OK or ESP_ERR_INVALID_ARG
}
```

### 3. Extract CGPS parse validation

Tương tự cho `modem_gnss_parse_cgps()`:
```c
static bool modem_gnss_is_cgps_response_valid(const char *response);
static esp_err_t modem_gnss_parse_cgps_fields(const char *response, gnss_data_t *data);
```

### 4. Apply early return pattern

**TRƯỚC** (nested if):
```c
if (condition_a) {
    if (condition_b) {
        if (condition_c) {
            // do something
        }
    }
}
```

**SAU** (early returns):
```c
if (!condition_a) return;
if (!condition_b) return;
if (!condition_c) return;
// do something
```

### 5. Extract query mode selection

```c
typedef enum {
    GNSS_QUERY_MODE_CGNSINF,
    GNSS_QUERY_MODE_CGPS,
} gnss_query_mode_t;

static gnss_query_mode_t modem_gnss_select_query_mode(void) {
    if (s_use_cgps_query_only) {
        return GNSS_QUERY_MODE_CGPS;
    }
    if (s_cgnsinf_backoff_until_ms > util_uptime_ms()) {
        return GNSS_QUERY_MODE_CGPS;
    }
    return GNSS_QUERY_MODE_CGNSINF;
}

static esp_err_t modem_gnss_query_by_mode(gnss_query_mode_t mode, char *response, size_t response_len);
```

## Success Criteria
- [ ] Max nesting depth <= 4
- [ ] Build pass
- [ ] GNSS parsing output không đổi
- [ ] Self-heal logic hoạt động bình thường

## Risk Assessment
- Low risk: Chỉ refactor structure, không thay đổi logic
- Mitigation: So sánh log output trước/sau refactor
