# Context links
- Overview plan: `./plan.md`
- Research: `./research/researcher-02-led-engine-design.md`
- Runtime constants: `iot-vehicle-tracking-system-firmware/components/app-core/include/state_runtime_context.h`
- Core loop: `iot-vehicle-tracking-system-firmware/components/app-core/src/state_machine_core.c`

# Overview
- Priority: P2
- Current status: pending
- Brief description: define LED service contract, pattern ids, arbitration order, and non-blocking sampler semantics.

# Key Insights
- One LED needs consistency more than expressiveness.
- Table-driven patterns beat hardcoded if/else timing.
- Separate policy from GPIO. Keep driver thin.
- TTL-based override is enough. No stack, queue, or scripting engine.
- <!-- Updated: Validation Session 1 - init repeats, sleep-blocked generic, OTA success flash, generic fault --> V1 keeps one generic repeated-fault pattern, one generic `sleep blocked` pattern, repeats `INIT` until first stable state, and adds one post-confirm OTA success flash.

# Requirements
- Functional:
  - Support 8+ distinguishable states/events.
  - Base pattern reflects lifecycle.
  - Higher priority overrides temporarily replace base.
  - Auto-return to base when override clears or TTL ends.
- Non-functional:
  - O(1) work per tick.
  - Pure functions for pattern sampling and policy resolve where possible.
  - Easy to unit-test with fake `now_ms`.

# Architecture
- Proposed modules:
  - `user_led_service`: public API `init`, `tick`, `notify_override`, optional `force_off`.
  - `user_led_policy`: `resolve(snapshot, now_ms)` returns winning intent.
  - `user_led_patterns`: pattern table and `sample(pattern, elapsed_ms)`.
- Proposed core types:
  - `user_led_pattern_id_t`
  - `user_led_priority_t`
  - `user_led_runtime_snapshot_t`
  - `user_led_intent_t { pattern_id, priority, ttl_ms }`
- Arbitration model:
  - Evaluate fault/alarm/ota/sleep-blocked first.
  - Else resolve base from lifecycle + connectivity detail.
  - Winner replaces current only when pattern or priority changed.

# Related Code Files
- Files to modify:
  - `iot-vehicle-tracking-system-firmware/components/app-core/include/state_runtime_context.h`
- Files to create:
  - `iot-vehicle-tracking-system-firmware/components/app-core/include/user-led-service.h`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/user-led-service.c`
  - `iot-vehicle-tracking-system-firmware/components/app-core/include/user-led-policy.h`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/user-led-policy.c`
  - `iot-vehicle-tracking-system-firmware/components/app-core/include/user-led-patterns.h`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/user-led-patterns.c`
- Files to delete:
  - None.

# Implementation Steps
1. Define pattern enum with small primitive vocabulary.
2. Define priority enum and rule ordering.
3. Define snapshot struct from existing runtime fields.
4. Create pattern table with durations and repeat semantics.
5. Implement sampler spec for solid/blink/double/triple/long-pulse/error burst.
6. Document exact state-to-pattern mapping before any code wiring.

# Todo List
- [ ] Freeze enum names and public API
- [ ] Freeze priority order
- [ ] Freeze pattern table timing
- [ ] Freeze state/event mapping table

# Success Criteria
- Contract is implementable without reopening architecture.
- Pattern map covers 8+ cases and stays human-readable.
- No module owns duplicate business truth.

# Risk Assessment
- Risk: too many unique patterns confuse field operators.
  - Mitigation: reuse primitive family and group related meanings.
- Risk: active-low handling leaks across modules.
  - Mitigation: keep active-level inversion only in service/driver layer.

# Security Considerations
- Avoid a pattern that lets observers infer sensitive operational details beyond coarse mode/fault.
- OTA patterns may reveal maintenance window; acceptable if kept generic.

# Next Steps
- Implement Phase 03 integration using this contract only; no ad hoc LED logic in core files.

# Pattern + priority map
| Priority | Trigger | Pattern | Notes |
|---|---|---|---|
| 90 | fatal/repeated fault | error-burst-3 | highest, sticky while condition true |
| 80 | alarm active | fast-blink | temporary override |
| 70 | OTA in progress | triple-pulse | override with TTL refresh |
| 65 | OTA pending confirm | double-blink-fast | override until confirm clears |
| 64 | OTA confirm success flash | single-long-pulse | one-shot after confirm, then drop to base |
| 60 | sleep blocked | pulse-short-gap-long | one generic busy/awake reason |
| 20 | INIT | triple-pulse-slow | repeat until first stable state |
| 18 | CHECK_IGN | fast-blink | deciding ignition/runtime settle |
| 16 | DRIVING + MQTT online | solid-on | healthy active |
| 15 | DRIVING + MQTT offline/retry | slow-blink | degraded active |
| 14 | PARKED | long-pulse | low-duty visible idle |
| 13 | HEARTBEAT | double-blink | timed wake publish window |
| 10 | SLEEP | off | lowest power |

# Pseudocode
```c
void user_led_tick(uint64_t now_ms, const user_led_runtime_snapshot_t *snap) {
    user_led_intent_t next = user_led_policy_resolve(snap, now_ms);
    if (next.pattern_id != current.pattern_id || next.priority != current.priority || current.expiry_ms <= now_ms) {
        current = next;
        entered_ms = now_ms;
    }

    const user_led_pattern_t *pat = user_led_patterns_get(current.pattern_id);
    uint64_t elapsed = now_ms - entered_ms;
    bool logical_on = user_led_patterns_sample(pat, elapsed);
    gpio_write_user_led(logical_on);
}
```

# Unresolved questions
- None after Validation Session 1.
