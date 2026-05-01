# Context links
- Overview plan: `./plan.md`
- Core loop: `iot-vehicle-tracking-system-firmware/components/app-core/src/state_machine_core.c`
- OTA flow: `iot-vehicle-tracking-system-firmware/components/app-core/src/state_ota_runtime.c`
- Sleep flow: `iot-vehicle-tracking-system-firmware/components/app-core/src/state_sleep_controller.c`

# Overview
- Priority: P2
- Current status: pending
- Brief description: define build-time and runtime validation for LED correctness, timing stability, and no-regression behavior.

# Key Insights
- LED is firmware UX. Build pass alone is not enough.
- Most failures will be timing/priority bugs, not compile bugs.
- Validation should stay cheap: compile, targeted logs, manual observation, optional bench video.
- <!-- Updated: Validation Session 1 - validate init repeat and OTA success flash --> Bench validation must explicitly cover `INIT` repeating until first stable state and one-shot OTA success flash after confirm.

# Requirements
- Functional:
  - Verify each mapped state/event reaches expected pattern.
  - Verify override preemption and fallback.
  - Verify sleep path still enters correct mode.
- Non-functional:
  - No added task, no watchdog risk, no measurable loop stall.
  - Build stays clean.

# Architecture
- Validation layers:
  - compile/build: headers, includes, dead constant cleanup
  - deterministic sampling checks: host-side or firmware unit tests if test harness exists
  - runtime bench checks: boot, driving, parked, heartbeat, alarm, ota, sleep-blocked, sleep
  - observability: log pattern id/priority on change only, not every tick

# Related Code Files
- Files to modify:
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/user-led-service.c`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/user-led-policy.c`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/user-led-patterns.c`
  - any existing firmware test/build scripts touched by implementation
- Files to create:
  - Optional: targeted LED unit test files only if firmware test harness already supports them
- Files to delete:
  - None required.

# Implementation Steps
1. Run firmware build after each code change set.
2. Add change-only logs: pattern id, priority, source reason.
3. Validate state map in bench order: init -> check_ign -> driving -> parked -> heartbeat -> sleep.
4. Validate overrides: alarm, ota in progress, ota pending confirm, sleep blocked.
5. Validate regression: no new blocking delays, sleep still enters, OTA still confirms, MQTT loop unaffected.
6. Remove or lower any noisy debug logs before merge.

# Todo List
- [ ] Define build command(s) for firmware target
- [ ] Define change-only LED debug logs
- [ ] Define manual bench scenario checklist
- [ ] Define pass/fail criteria per pattern and priority case

# Success Criteria
- Firmware builds cleanly.
- All target states/events show intended pattern.
- Override priority matches spec.
- No regression in FSM progression, OTA lifecycle, or sleep entry.

# Risk Assessment
- Risk: manual visual checks are subjective.
  - Mitigation: use duration table, log timestamps, optional phone video at 60 fps.
- Risk: low-frequency states like heartbeat or OTA confirm are expensive to reproduce.
  - Mitigation: use temporary config shortening on dev hardware only, then restore defaults.

# Security Considerations
- Validation logs should avoid sensitive payload data.
- Any temporary test config must not ship to production defaults.

# Next Steps
- After implementation, run compile + bench validation, then code review before docs updates.

# Test and validation strategy
- Build:
  - firmware clean build for ESP32-S3 target
  - ensure no warnings/errors from new LED modules and removed old helpers
- Static/runtime logic checks:
  - policy resolver test vectors for each snapshot case
  - pattern sampler boundary checks at `0`, `on_ms`, cycle edges, TTL expiry
- Bench scenarios:
  - cold boot visible init signature repeating until first stable state
  - unstable ignition/check_ign pattern
  - driving with MQTT online vs degraded offline/retry
  - parked long pulse
  - heartbeat double blink during timer wake window
  - alarm fast blink on IMU wake
  - ota in progress and ota pending confirm overrides
  - ota confirm success one-shot flash, then fallback to base state
  - sleep blocked visible busy pulse, then off on accepted sleep
- Acceptance:
  - LED change latency bounded by next core loop iteration
  - no `vTaskDelay` added to LED path
  - no new FreeRTOS task/thread for LED

# YAGNI / KISS / DRY guardrails
- Do not add RGB-style abstraction for one LED.
- Do not add pattern scripting language.
- Do not duplicate runtime truth already in FSM globals.
- Reuse one sampler for all blink-family patterns.
- Reuse one arbitration resolver for all overrides.

# Unresolved questions
- What exact firmware build command should implementation use in this repo: `idf.py build`, wrapper script, or CI-aligned task?
- Does existing test harness support small pure-C unit tests for sampler/policy without extra infra?
