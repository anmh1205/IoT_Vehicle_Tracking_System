# Firmware Comment Audit - Implementation Plan

**Date**: 2026-05-01 17:34
**Branch**: feat/audit-20260501
**Goal**: Improve firmware comment coverage from 68% → 85%+

---

## Summary

| Status | Files | Coverage |
|--------|-------|----------|
| Critical | 1 (main.c) | 0% |
| Poor | 12 (app-core/*.c) | 8% |
| Fair | 4 (nvs_store_keys, etc.) | 10-68% |
| Good | 40 | 70-95% |

**Total Source Files**: 57 C/H files in `iot-vehicle-tracking-system-firmware/`

---

## Implementation Phases

### Phase 1: Critical Priority - main/main.c (0%)
**Task**: Document the application entry point completely
- [ ] Add Doxygen file header block (/** */)
- [ ] Add @file, @author, @brief description
- [ ] Add @brief, @param, @return for `app_main()`
- [ ] Add section comments for initialization phases

### Phase 2: High Priority - app-core/src/*.c (8%)
**Task**: Add block comments to 12 source files
- [ ] state_machine.c
- [ ] state_runtime_context.c
- [ ] state_publish_pipeline.c
- [ ] state_obd_runtime.c
- [ ] state_ota_runtime.c
- [ ] state_wake_prelude.c
- [ ] state_sleep_controller.c
- [ ] state_machine_core.c
- [ ] tracker-app-bootstrap.c

### Phase 3: Medium Priority - nvs_store_keys (10%)
**Task**: Document key-value store definitions
- [ ] nvs_store_keys.h - Add Doxygen @brief for each key
- [ ] nvs_store_keys.c - Add block comments

### Phase 4: Enhancement - Improve existing files (65-88%)
**Task**: Polish partially documented files
- [ ] adapter-mqtt-sim7600-at/src/mqtt_publish.c
- [ ] adapter-mqtt-sim7600-at/src/mqtt_session.c
- [ ] shared-kernel/src/kv_store.c

---

## Comment Standards

| Type | Format | Usage |
|------|--------|-------|
| File header | `/** @file @brief @author @date */` | Every .c/.h |
| Function | `/** @brief @param @return */` | All public APIs |
| Block | `/* section comment */` | Logical code blocks |
| Line | `// comment` | Complex logic, tricky parts |
| Variable | `/** brief */ type var;` | Important globals |

---

## Related Files

- **Audit Report**: `plans/reports/firmware-comment-audit-260501-1734.md`
- **Checklist**: `plans/260501-1734-firmware-comment-audit/CHECKLIST.md`

---

## Success Criteria

- [ ] Comment coverage ≥ 85%
- [ ] All public functions have Doxygen `@brief`
- [ ] All `#include` blocks have purpose comments
- [ ] No code changes (comments only)
- [ ] Build still passes after comment additions
