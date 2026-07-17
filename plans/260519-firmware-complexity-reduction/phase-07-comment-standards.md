---
phase: "07"
title: "Comment Standardization Pass"
status: pending
priority: P2
effort: 2h
---

# Phase 07: Comment Standardization

## Context
- Audit report: `resources/docs/firmware-complexity-audit-2026-05-18.md`
- Plan: `plans/260519-firmware-complexity-reduction/plan.md`
- Depends on: Phase 01-06

## Overview
Chuẩn hóa comment toàn bộ codebase: đủ ý, không thừa, không thiếu. Tạo coding standards document.

## Tasks

### 1. Comment conventions

**Quy tắc**:

| Loại | Khi nào dùng | Ví dụ |
|---|---|---|
| File header | Mọi .c file | Mô tả mục đích, state flow, thread safety |
| Function comment | Hàm >20 lines hoặc có side effects | @brief, @param, @return |
| Inline WHY comment | Logic không hiển nhiên | Giải thích tại sao, không phải làm gì |
| Section comment | Phân chia logical sections | `/* === FSM Transitions === */` |
| TODO/FIXME | Work in progress | `// TODO: Handle edge case X` |

**KHÔNG dùng**:
- Comment mô tả WHAT hiển nhiên: `// Set the value to 0` → `value = 0;`
- Boilerplate template: `// Keep this public facade thin...`
- Comment trùng với tên hàm: `void reset_counters(void) { // Reset counters }`

### 2. File header template

```c
/**
 * @file <filename>.c
 * @brief <One-line purpose description>.
 *
 * <Optional: State flow, architecture notes, thread safety info.>
 *
 * Key responsibilities:
 *   - <Responsibility 1>
 *   - <Responsibility 2>
 *
 * Thread safety:
 *   - <Notes on concurrency, locks, ISR safety>
 *
 * Dependencies:
 *   - <Key components this module depends on>
 */
```

### 3. Function comment template

**Cho hàm phức tạp** (>20 lines hoặc có side effects):
```c
/**
 * @brief <One-line summary of WHAT the function does>.
 *
 * <Optional: Details about HOW, WHY, edge cases, side effects.>
 *
 * @param name <Description of parameter.>
 * @return <Description of return value.>
 *
 * @note <Important caveats or usage notes.>
 */
```

**Cho hàm đơn giản** (wrapper, getter, setter):
```c
/* Không cần comment nếu tên hàm đã tự giải thích */
void telemetry_counters_inc_sd_write_ok(void) {
    telemetry_counters_inc_field(&s_counters.sd_write_ok);
}
```

### 4. Inline comment guidelines

**SAI** (mô tả WHAT):
```c
// Increment the counter
counters.publish_attempts++;

// Set the state to DRIVING
s_runtime_state_hint = APP_STATE_DRIVING;
```

**ĐÚNG** (giải thích WHY):
```c
// Track all attempts to detect publish degradation over time
counters.publish_attempts++;

// Transition to driving only after ignition-on confirmed for 3s
// to avoid false positives from brief ignition spikes
s_runtime_state_hint = APP_STATE_DRIVING;
```

### 5. Audit và cập nhật files

Thứ tự ưu tiên (files nhiều vấn đề nhất trước):
1. `state_machine_core.c` - Sau khi refactor phase 03
2. `modem_gnss.c` - Sau khi refactor phase 04
3. `data_formatter.c` - Sau khi refactor phase 05
4. `command_handler.c` - Sau khi fix validation phase 02
5. `telemetry_counters.c` - Sau khi refactor phase 06
6. Các files còn lại

### 6. Tạo coding standards document

**TẠO MỚI**: `iot-vehicle-tracking-system-firmware/docs/coding-standards.md`

```markdown
# Firmware Coding Standards

## Comment Conventions
- File header: Required for every .c file
- Function comment: Required for functions >20 lines or with side effects
- Inline comments: Only explain WHY, not WHAT
- Section comments: Use for logical divisions within files

## Function Guidelines
- Max 50 lines per function (prefer early returns)
- Single responsibility per function
- Use ESP_RETURN_ON_* macros for error handling
- Avoid ESP_ERROR_CHECK in runtime paths

## Include Ordering
1. System headers (<string.h>, <stdint.h>)
2. Framework headers (freertos/, driver/, esp_*)
3. Component headers (same component)
4. Local headers ("./xxx.h")

## Naming Conventions
- Files: snake_case.c/h
- Functions: snake_case with module prefix (modem_gnss_init)
- Constants: UPPER_SNAKE_CASE
- Types: snake_case_t
- Globals: s_ prefix for static, g_ prefix for extern

## Error Handling
- Use ESP_RETURN_ON_NULL, ESP_RETURN_ON_ERROR for validation
- Use goto cleanup for multi-resource cleanup
- Log errors with ESP_LOGE/W before returning

## Global State
- Prefer context struct over scattered globals
- Document thread safety requirements
- Use mutex for shared state across tasks

## Memory Management
- Use heap_caps_malloc with MALLOC_CAP_DMA for DMA buffers
- Always check malloc return for NULL
- Set pointer to NULL after free
```

## Success Criteria
- [ ] coding-standards.md tồn tại
- [ ] Không còn boilerplate comments (đã xóa ở Phase 01)
- [ ] File headers đầy đủ cho mọi .c file
- [ ] Function comments cho hàm phức tạp (>20 lines)
- [ ] Inline comments chỉ giải thích WHY

## Risk Assessment
- No risk: Chỉ thay đổi comments, không thay đổi code
- Mitigation: Build pass là đủ
