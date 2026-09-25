---
phase: "06"
title: "Boilerplate Comment Removal"
status: pending
priority: P2
effort: 3h
dependencies: []
---

# Phase 06: Boilerplate Comment Removal

## Overview
Remove ~1,105 lines of boilerplate comments that restate the obvious. These follow a predictable template: `// <verb> <what> here so <why>.`

## Requirements
- Zero boilerplate comments as identified in audit
- Keep meaningful comments (why, non-obvious side effects, timing relationships)

## Related Code Files
- Modify: ALL 47 .c files across 16 components

## Implementation Steps

### 6.1 Bulk regex removals

**Patterns to remove (regex-matchable, safe to bulk-remove):**

```
// Keep this public facade thin and forward the real work to the focused implementation below.
// Keep this helper boundary explicit so its local policy and side effects stay predictable.
// Keep the branchy handle .* flow centralized here so side effects remain easy to audit.
// Advance one cooperative step here using the current state, time gates, and retry policy.
// Initialize module-local state and dependencies before later runtime paths rely on them.
// Reset counters reset here so stale data does not leak into the next cycle.
// Build the formatter .* representation here so every caller emits the same contract.
// Decode raw .* into the normalized form the rest of the module expects.
// Read .* without widening the mutation surface of this module.
// Persist .* here so later boots, retries, or recovery paths can resume cleanly.
// Rehydrate .* here so later logic reads one coherent snapshot after reset or sleep.
// Drive the transport or session toward a connected state while keeping retries explicit.
// Emit a focused .* diagnostic here so field logs explain the current stage.
// Copy the caller-provided .* into module-local state after lightweight guards.
// Translate app name into a readable label so logs and diagnostics stay easy to follow.
// Update the transition reason path here so later asynchronous work sees the latest intent.
// Log .* here so (later traces|field diagnostics) .*
// Refresh the always-on .* first so every later branch works from one coherent baseline.
// Accept the debounced start edge before the rest of the runtime sees a new session.
// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.
```

### 6.2 File-by-file cleanup (by boilerplate density)

**Priority order (highest density first):**

1. **telemetry_counters.c** (27% boilerplate) — remove all 22 comments
2. **mqtt_session.c** (~22% boilerplate) — 320 lines to clean
3. **config_store_nvs.c** (~14%) — 35 lines
4. **sd_log_store.c** (~12%) — 120 lines
5. **state_wake_prelude.c** (~10%) — 76 lines
6. **state_sleep_controller.c** (~10%) — 60 lines
7. **command_handler.c** (~10%) — 116 lines
8. **modem_gnss.c** (~8%) — 70 lines
9. **state_machine_core.c** (~7%) — 85 lines
10. **modem_at.c** (~7%) — 80 lines
11. **state_obd_runtime.c** (~6%) — 50 lines
12. **imu_lis3dsh.c** (~6%) — 40 lines
13. Remaining files

### 6.3 Add meaningful comments where missing

After removing boilerplate, add comments for:
- Magic number explanations (e.g., why 60000ms? why 1735689600000ULL?)
- Timing relationship documentation
- Non-obvious state machine transitions
- Cross-module contracts (what guarantees does this function provide?)

## Success Criteria
- [ ] ~1,105 boilerplate lines removed
- [ ] No `// Keep this` pattern remains
- [ ] Meaningful comments preserved/added
- [ ] Build pass
