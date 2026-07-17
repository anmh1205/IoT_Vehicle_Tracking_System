---
title: "User LED non-blocking status system plan"
description: "Phased plan to replace the single blink LED with a priority-driven non-blocking status indicator on ESP32-S3 firmware."
status: pending
priority: P2
effort: 11h
branch: feat/audit-20260501
tags: [firmware, esp32-s3, led, state-machine]
created: 2026-05-01
---

# Overview
- Scope: user LED 1 pin, show app state + subsystem detail, non-blocking, no extra task unless forced.
- Goal: replace fixed blink in `state_machine_core.c` with small table-driven LED service aligned to existing FSM/runtime context.
- Principle: single winner priority, base pattern + temporary override, keep modules small.

# Phases
1. [Phase 01 - Audit current LED and runtime hooks](./phase-01-audit-current-led-and-runtime-hooks.md) - pending
2. [Phase 02 - Define LED contract and pattern table](./phase-02-define-led-contract-and-pattern-table.md) - pending
3. [Phase 03 - Integrate LED engine into FSM loop](./phase-03-integrate-led-engine-into-fsm-loop.md) - pending
4. [Phase 04 - Wire OTA sleep and fault overrides](./phase-04-wire-ota-sleep-and-fault-overrides.md) - pending
5. [Phase 05 - Validate firmware build and runtime behavior](./phase-05-validate-firmware-build-and-runtime-behavior.md) - pending

# Proposed architecture
- `user_led_service`: init once, build snapshot, tick sampler, write GPIO.
- `user_led_policy`: resolve base/override candidate by priority.
- `user_led_patterns`: pattern table + non-blocking sample function.
- Arbitration: single-winner ordered rules; no queue, no animation engine, no RTOS task.

# Pattern map summary
- Base: init, check-ign, driving-online, driving-degraded, parked, heartbeat, sleep.
- Overrides: alarm, ota-active, ota-confirm-pending, sleep-blocked, fatal/repeated fault.
- Target: 10-11 patterns total, but reuse small primitive set.

# Key hook points
- `components/app-core/src/state_machine_core.c` init path and `state_machine_core_run()` loop.
- `components/app-core/src/state_ota_runtime.c` OTA lifecycle flags.
- `components/app-core/src/state_sleep_controller.c` sleep blockers/entry.
- `components/app-core/include/state_runtime_context.h` shared LED/runtime snapshot data.

# Dependencies
- FSM state enum in `components/shared-kernel/include/fsm_types.h` stays source of truth.
- Existing runtime flags stay authoritative; LED layer derives, not duplicates.
- GPIO mapping stays on `PIN_USER_LED` in board pin map.

# Delivery notes
- Migrate by first landing passive LED service with same boot-safe behavior, then expand mapping.
- Keep legacy constants only until new pattern table replaces them.
- Require build validation plus runtime log/manual timing check before merge.

# Success bar
- No `delay` added to LED path.
- No new dedicated task.
- LED visibly communicates 8+ states/events.
- FSM remains readable; LED logic leaves `state_machine_core.c` mostly orchestration-only.

## Validation Log

### Session 1 — 2026-05-01
**Trigger:** Initial validation after first plan creation.
**Questions asked:** 4

#### Questions & Answers

1. **[Scope]** Ở bản v1, repeated OBD/BLE failure có nên lên LED riêng không?
   - Options: Hoãn khỏi v1 (Recommended) | Có, gộp 1 fault | Có, tách OBD/BLE
   - **Answer:** Có, gộp 1 fault
   - **Rationale:** V1 phải hiển thị được repeated runtime fault, nhưng chưa cần tách quá chi tiết theo subsystem.

2. **[Architecture]** `sleep blocked` nên hiển thị theo mức nào?
   - Options: 1 pattern chung (Recommended) | Tách 2 nhóm | Tách từng blocker
   - **Answer:** 1 pattern chung (Recommended)
   - **Rationale:** Giữ mapping dễ nhớ, tránh nổ số pattern chỉ vì nhiều sleep reject reason.

3. **[Assumptions]** Pattern `INIT` nên hoạt động thế nào?
   - Options: One-shot rồi thôi (Recommended) | Lặp tới ổn định | Bỏ INIT riêng
   - **Answer:** Lặp tới ổn định
   - **Rationale:** LED boot phải tiếp tục báo trạng thái bring-up cho tới khi FSM chạm state ổn định đầu tiên.

4. **[Architecture]** Sau reboot OTA, LED nên ưu tiên tín hiệu nào?
   - Options: Chỉ pending-confirm (Recommended) | Flash success 1 lần | Cả hai
   - **Answer:** Cả hai
   - **Rationale:** Cần vừa thấy cửa sổ pending-confirm, vừa có dấu hiệu thành công ngắn sau confirm để operator không phải đoán.

#### Confirmed Decisions
- Runtime fault visibility v1: dùng 1 fault pattern gộp cho repeated OBD/BLE failure — đủ hữu ích mà chưa cần taxonomy sâu.
- Sleep blocked: dùng 1 pattern chung — giữ KISS và giảm overload nhận thức.
- INIT behavior: lặp tới state ổn định đầu tiên — phản ánh đúng bring-up thay vì chỉ nháy boot một lần.
- OTA hậu reboot: giữ pending-confirm override và thêm success flash một lần sau confirm — tăng tính quan sát cho operator.

#### Action Items
- [ ] Cập nhật phase mapping để v1 có generic fault override cho repeated OBD/BLE failure.
- [ ] Giữ `sleep blocked` là một pattern chung trong phase pattern table và override wiring.
- [ ] Đổi INIT từ one-shot sang repeat-until-stable trong phase pattern semantics.
- [ ] Thêm OTA success flash một lần sau confirm vào phase override và validation.

#### Impact on Phases
- Phase 01: khóa snapshot/requirement theo v1 generic fault + generic sleep-blocked + INIT repeat-until-stable.
- Phase 02: cập nhật pattern semantics và pattern table cho INIT repeat, generic fault, generic sleep-blocked, OTA success flash.
- Phase 04: cập nhật override flow để hỗ trợ both pending-confirm và post-confirm success flash.
- Phase 05: bổ sung validation case cho INIT repeat-until-stable và OTA success flash.
