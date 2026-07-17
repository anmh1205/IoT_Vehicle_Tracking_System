---
title: "Realistic automatic-transmission ECU simulator plan"
description: "Implementation-ready plan to replace scripted phase outputs with a coherent generic 4AT powertrain simulator."
status: pending
priority: P2
effort: 11h
branch: feat/audit-20260501
tags: [ecu-simulator, automatic-transmission, obd, firmware]
created: 2026-05-03
---

# Overview
Goal: make `iot-vehicle-tracking-system-ecu-simulator/ecu-simulator` behave like a believable generic small/mid gasoline sedan AT, prioritizing internal consistency over high-fidelity physics.

## Scope principles
- Keep Uno-safe: table/rule based, no heavy physics.
- Canonical state first, OBD snapshot second.
- One authoritative tick in `main.cpp`; `obd_can` transport-only.
- Default to generic 4AT baseline; leave 6AT as future config, not now.

## Phases
1. [Phase 01 - gap analysis and target architecture](./phase-01-gap-analysis-and-target-architecture.md)
   - Define current gaps, target state model, and module boundaries.
   - Effort: 2h
2. [Phase 02 - generic 4AT profile and behavior rules](./phase-02-generic-4at-profile-and-driving-behavior.md)
   - Define configurable ratios, slip, drag, warm-up, selector, and scenario rules.
   - Effort: 3h
3. [Phase 03 - authoritative simulation and OBD snapshot refactor](./phase-03-authoritative-simulation-and-obd-snapshot-refactor.md)
   - Plan file-level refactor for tick ownership, internal state, snapshot derivation, PID consistency.
   - Effort: 4h
4. [Phase 04 - validation, stability, and rollout guardrails](./phase-04-validation-stability-and-rollout-guardrails.md)
   - Define compile/test scenarios, heavy polling checks, and risk controls.
   - Effort: 2h

## Key dependencies
- Phase 02 depends on Phase 01 canonical architecture.
- Phase 03 depends on Phase 01-02 state/behavior decisions.
- Phase 04 validates Phase 03 outputs against Phase 02 behavior rules.

## Recommended baseline
- Transmission: 4AT
- Ratios: `[2.85, 1.55, 1.00, 0.70]`
- Final drive surrogate: `4.10`
- Tire circumference: `~2.0 m`
- Idle: `1150 cold / 750 hot`
- Rev limit: `6200 rpm`
- Creep: `~7 kph`
- Shift inhibit: `~800 ms`

## Expected code impact
- `src/ecu-model.cpp` should be split to stay within file-size guidance.
- `src/ecu-model.h` keeps outward snapshot contract, but may add internal structs/APIs.
- `src/obd-can.cpp` must stop advancing simulation.
- `src/main.cpp` remains authoritative loop owner.

## Out of scope
- Cloud/backend/frontend changes.
- Vehicle-specific calibration.
- Full torque map, hydraulic AT, or exact torque-converter physics.
- Rich state-driven DTC/readiness realism beyond consistency-preserving minimums.

## Done when
- Speed, RPM, and gear are causally linked.
- Launch, creep, shift, cruise, kickdown, decel, and stop look believable.
- High-priority PIDs no longer contradict each other.
- Heavy OBD polling does not distort simulation time.

## Validation Log

### Session 1 — 2026-05-03
**Trigger:** Initial plan creation validation before implementation.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Ở bản implement đầu tiên, bạn muốn xử lý selector số như thế nào?
   - Options: P/N/D nội bộ (Recommended) | Chỉ D-mode | PRND đầy đủ
   - **Answer:** PRND đầy đủ
   - **Rationale:** Quyết định này mở rộng canonical internal state, scenario rules, và validation matrix ngay từ pass đầu.

2. **[Scope]** Khi `ign off` trong simulator, hành vi mục tiêu nên là gì?
   - Options: Về parked nhanh (Recommended) | Coast ngắn rồi dừng | Giữ theo kịch bản riêng
   - **Answer:** Về parked nhanh (Recommended)
   - **Rationale:** Chốt biên scope để tránh phải mô phỏng engine-off coasting và giảm độ phức tạp ở phase dynamics.

3. **[Architecture]** Nguồn chân lý chính cho `speed` ở pass đầu nên là gì?
   - Options: Simulator tự sinh (Recommended) | Profile ngoài điều khiển | Hybrid
   - **Answer:** Simulator tự sinh (Recommended)
   - **Rationale:** Quyết định này khóa causal chain driver demand -> speed -> gear -> RPM thay vì dựa vào profile ngoài.

4. **[Tradeoffs]** Ở pass đầu, bạn muốn DTC/readiness đi theo hướng nào?
   - Options: Giữ scripted nhưng coherent (Recommended) | Một phần state-driven | State-driven nhiều hơn
   - **Answer:** State-driven nhiều hơn
   - **Rationale:** Quyết định này tăng scope cho diagnostics model và buộc phase architecture/snapshot/validation bao phủ readiness và DTC logic thực hơn.

#### Confirmed Decisions
- Selector scope: PRND đầy đủ — cần đưa vào state model và scenario coverage ngay từ pass đầu.
- Ignition-off behavior: về parked nhanh — không mô phỏng engine-off coasting ở v1.
- Speed ownership: simulator tự sinh — canonical motion nằm trong simulator.
- DTC/readiness: state-driven nhiều hơn — không giữ nguyên profile scripted như baseline cũ.

#### Action Items
- [ ] Cập nhật Phase 02 để scope selector là PRND đầy đủ thay vì D-first.
- [ ] Cập nhật Phase 02/03 để speed là simulator-owned canonical state.
- [ ] Cập nhật Phase 01/03 để diagnostics model và snapshot builder hỗ trợ DTC/readiness state-driven nhiều hơn.
- [ ] Cập nhật Phase 04 để validation matrix bao phủ selector PRND và diagnostics behavior mới.

#### Impact on Phases
- Phase 01: mở rộng canonical architecture cho selector PRND đầy đủ và diagnostics/readiness state-driven hơn.
- Phase 02: đổi behavior scope từ D-first sang PRND đầy đủ; khóa `ign off -> parked nhanh`; giữ speed do simulator tự sinh.
- Phase 03: snapshot/refactor phải coi speed là canonical simulator-owned state và mở rộng diagnostics model thay vì giữ DTC/readiness chủ yếu scripted.
- Phase 04: thêm validation cho selector behavior và readiness/DTC state-driven logic.
