---
title: "Firmware Log Monitor Governance"
description: "Quy hoạch log monitoring firmware ESP32-S3 để đủ quan sát luồng chính, giảm nhiễu, giữ chi phí runtime thấp."
status: pending
priority: P2
effort: 14h
branch: uat
tags: [firmware, esp32, logging, observability, tech-debt]
created: 2026-05-01
---

# Firmware Log Monitor Governance

## Overview

Plan-only. Mục tiêu: chuẩn hóa logging/monitoring toàn firmware ESP32-S3 theo module, có budget, rate-limit/dedup tối thiểu, health snapshot, và áp dụng trước vào hotspot nhưng kiểm tra chuẩn trên toàn firmware mà không spam UART/CPU.

## Phases

| # | Phase | Status | Progress | Effort | Link |
|---|-------|--------|----------|--------|------|
| 1 | Log policy, tags, budget | Pending | 0% | 3h | [phase-01-log-policy-tag-taxonomy-and-budget.md](./phase-01-log-policy-tag-taxonomy-and-budget.md) |
| 2 | Local gates + counters/snapshots | Pending | 0% | 4h | [phase-02-minimal-log-helper-rate-limit-and-health-snapshot.md](./phase-02-minimal-log-helper-rate-limit-and-health-snapshot.md) |
| 3 | Apply governance to high-value modules | Pending | 0% | 5h | [phase-03-apply-governance-to-firmware-hotspots.md](./phase-03-apply-governance-to-firmware-hotspots.md) |
| 4 | Validation and docs handoff | Pending | 0% | 2h | [phase-04-validation-and-documentation-handoff.md](./phase-04-validation-and-documentation-handoff.md) |

## Key dependencies

- Research: [researcher-01-firmware-logging-best-practices.md](./research/researcher-01-firmware-logging-best-practices.md)
- Audit: [scout-01-firmware-log-audit.md](./scout/scout-01-firmware-log-audit.md)
- Firmware root: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware`
- Branch: `uat`

## Design stance

- KISS: source-side gating, not a logging framework.
- YAGNI: no remote log collector in this phase.
- DRY: prefer local per-module gates for now; do not add shared helper in first implementation pass.
- Security: no tokens/raw payloads/full coordinates/IMEI/IMSI/URLs; stable IDs may stay visible for traceability.

## Validation commands to plan, not run

- `cd E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware && idf.py build`
- `cd E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware && idf.py size`
- Optional: `cd E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware && idf.py reconfigure`

## Validation Log

### Session 1 — 2026-05-01
**Trigger:** Initial plan creation validation before implementation.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Mặc định log UART production nên theo mức nào để cân bằng quan sát và chống nhiễu?
   - Options: Mixed INFO/WARN | Mostly WARN | Broader INFO
   - **Answer:** Broader INFO
   - **Rationale:** Sets default verbosity. Implementation should keep more lifecycle/success context visible, but still avoid loop/payload spam.

2. **[Architecture]** Cơ chế rate-limit/dedup cho log lặp nên triển khai theo hướng nào?
   - Options: Tiny helper nếu 3+ | Local per module | Không thêm gate
   - **Answer:** Local per module
   - **Rationale:** Avoids new shared abstraction now. Each hotspot should gate repeated logs locally with simple state.

3. **[Performance]** Health snapshot nên emit theo cadence nào?
   - Options: 5-15m + boundary | Boundary only | 1-5m diag
   - **Answer:** 1-5m diag
   - **Rationale:** Prioritizes lab/field diagnosis with denser health visibility. Must be tied to diagnostic profile or explicit config to avoid production spam.

4. **[Security]** Chính sách redaction production cho log firmware nên nghiêm đến mức nào?
   - Options: Strict default | Allow stable IDs | Diag flag mở rộng
   - **Answer:** Allow stable IDs
   - **Rationale:** Allows full stable trace IDs such as boot/message/job IDs while keeping sensitive fields blocked.

#### Confirmed Decisions
- Production verbosity: Broader INFO — more lifecycle/success context allowed, no per-loop spam.
- Rate limiting: Local per module — no shared helper in first pass.
- Health snapshot: 1-5m diagnostic cadence — dense visibility, keep controlled by diag/profile/config.
- Redaction: Stable IDs allowed — still block secrets, raw payloads, coordinates, IMEI/IMSI, URLs.

#### Action Items
- [x] Update Phase 01 log level/budget to Broader INFO with explicit anti-spam limits.
- [x] Update Phase 02 to remove shared helper recommendation and use local gates.
- [x] Update Phase 02/03 snapshot cadence to 1-5m diagnostic/profile-gated.
- [x] Update security wording to allow stable IDs while forbidding sensitive fields.

#### Impact on Phases
- Phase 01: Requirements/Implementation Steps must reflect Broader INFO and stable ID policy.
- Phase 02: Architecture/Implementation Steps must prefer local per-module gates, not shared helper.
- Phase 03: Implementation Steps must keep more INFO success/lifecycle logs where useful but rate-gated; snapshot cadence 1-5m diagnostic.
- Phase 04: Static review must allow stable IDs and verify sensitive fields remain blocked.

### Session 2 — 2026-05-01
**Trigger:** Additional user answers after validation summary.
**Questions asked:** 3

#### Questions & Answers

1. **[Scope]** Phạm vi ưu tiên của đợt quy hoạch log monitor này là gì?
   - Options: Toàn firmware (Recommended) | Chỉ hotspot | Chỉ chuẩn policy
   - **Answer:** Toàn firmware (Recommended)
   - **Rationale:** Implementation should audit/apply the standard across all firmware components, while still prioritizing hotspot edits first.

2. **[Objective]** Mục tiêu đầu ra của log monitor nên nghiêng về hướng nào nhất?
   - Options: Debug chi tiết | Vận hành/monitor | Cân bằng cả hai
   - **Answer:** Cân bằng cả hai
   - **Rationale:** Logs must support both field debugging and operator monitoring, so plan needs lifecycle detail plus aggregate health without spam.

3. **[Deliverable]** Bạn muốn plan dừng ở mức thiết kế/roadmap, hay nên kèm luôn đề xuất chuẩn log cụ thể?
   - Options: Chỉ roadmap | Kèm chuẩn log cụ thể (Recommended) | Chờ implementation
   - **Answer:** Kèm chuẩn log cụ thể (Recommended)
   - **Rationale:** Plan must include concrete tag/level/field/event/budget guidance so implementation agents do not invent standards ad hoc.

#### Confirmed Decisions
- Scope: toàn firmware — audit all firmware logs, implement first where highest value.
- Objective: cân bằng debug + monitor — keep useful INFO context and health counters/snapshots.
- Deliverable: include concrete log standard — tag taxonomy, levels, field format, forbidden fields, budgets.

#### Action Items
- [x] Update overview to say toàn firmware with hotspot-first implementation.
- [x] Update Phase 01 to include concrete log standard table/pattern.
- [x] Update Phase 03 to add all-firmware audit pass after hotspot edits.

#### Impact on Phases
- Phase 01: Requirements/Implementation Steps include concrete standard, not only planning guideline.
- Phase 03: Scope includes whole-firmware audit, with hotspot-first changes.
- Phase 04: Validation includes whole-firmware static log scan, not only touched files.

## Unresolved questions

- Exact log budget during LTE recovery/offline replay under Broader INFO?
- Which config/profile should enable 1-5m diagnostic health snapshot?
