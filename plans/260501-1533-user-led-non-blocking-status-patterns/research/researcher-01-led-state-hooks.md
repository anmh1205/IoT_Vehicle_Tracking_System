# Research Report: User LED non-blocking status hook points

**Timestamp:** 2026-05-01
**Scope:** firmware app-core only; find state machine, runtime hints, lifecycle signals, and best LED-intent hook points. No implementation.

## Findings

1. **FSM states are explicit and small.** `app_state_t` has 7 states: `INIT`, `CHECK_IGN`, `DRIVING`, `PARKED`, `ALARM`, `HEARTBEAT`, `SLEEP` (`components/shared-kernel/include/fsm_types.h:11-26`). This is the authoritative state list for any LED policy.

2. **Runtime state hint already exists.** `s_runtime_state_hint` is exposed in runtime context and used for health snapshot/logging (`components/app-core/include/state_runtime_context.h:164-167`, `components/app-core/src/state_machine_core.c:244-247`). It is the best current “single source of truth” for LED intent mapping.

3. **State transitions already converge in one core loop.** `state_machine_core_run()` sets LED state first, then evaluates `current_state`, then logs transition and health snapshot (`components/app-core/src/state_machine_core.c:627-674`). This is the cleanest non-blocking publish hook: emit LED intent after the switch resolves `next_state`, before returning.

4. **Each major lifecycle branch already stamps the runtime hint.** `CHECK_IGN`, `DRIVING`, `ALARM`, `HEARTBEAT`, and `SLEEP` handlers set `s_runtime_state_hint` directly (`components/app-core/src/state_machine_core.c:377-379`, `394-397`, `441-447`, `473-482`, `523-529`). This means LED intent can be derived without new state plumbing.

5. **Device-state mapping is already normalized.** `state_machine_resolve_device_state()` maps FSM states to device lifecycle buckets: `BOOTING`, `WAKING`, `ACTIVE`, `SLEEP_PREPARE`, `ALARM`, `SLEEPING` (`components/app-core/src/state_machine_core.c:140-156`). Good place to define coarse LED semantics if you want less state explosion.

6. **OTA has dedicated lifecycle hooks.** OTA restore/confirm/process flows are isolated in `state_ota_runtime.c`, including pending-confirm restore, confirm timeout, success/failure publish, and rollback handling (`components/app-core/src/state_ota_runtime.c:49-88`, `117-179`, `183-212`). LED intent should listen to these events, not poll OTA state elsewhere.

7. **Sleep entry is guarded by explicit blockers.** Sleep rejection reasons are already named: policy disabled, OTA in progress, OTA pending confirm, ignition on (`components/app-core/src/state_sleep_controller.c:84-111`). These blockers are strong LED intent triggers for “keep awake / busy / blocked” status.

8. **Sleep shutdown is the lifecycle boundary for connectivity.** Before sleep, code stops OBD, BLE, GNSS, MQTT, LTE, modem, and DTR (`components/app-core/src/state_sleep_controller.c:128-183`). That is the final safe point to publish a “going to sleep” LED intent before hardware quiescence.

## Best hook points for non-blocking LED intent

- **Primary hook:** `state_machine_core_run()` after `next_state` is resolved and before return (`components/app-core/src/state_machine_core.c:627-674`). This keeps LED intent driven by the final FSM decision.
- **Secondary hook:** `state_machine_sync_runtime_axes()` when telemetry/device-state axes are refreshed (`components/app-core/src/state_machine_core.c:160-168`). Useful if LED intent should follow normalized runtime axes rather than raw state.
- **Event hooks:** OTA confirm/rollback/status paths (`components/app-core/src/state_ota_runtime.c:117-179`, `183-212`) and sleep blockers/entry (`components/app-core/src/state_sleep_controller.c:84-111`, `128-183`). These are the high-signal lifecycle events.

## Practical recommendation

Use `s_runtime_state_hint` + `next_state` as the LED intent source, and publish intent only from the core loop and special lifecycle events. Do **not** block inside LED code; keep it as a fire-and-forget status updater.

## Unresolved questions

- Should LED intent be coarse (`boot/active/alarm/sleep/ota`) or exact per FSM state?
- Do you want LED intent to include MQTT/BLE connectivity detail, or stay lifecycle-only?
