---
title: "UTC+7 timezone standardization implementation plan"
description: "Repo-wide rollout plan to standardize business time semantics around Asia/Ho_Chi_Minh while preserving data correctness."
status: pending
priority: P1
effort: 41h
branch: uat
tags: [timezone, utc7, backend, frontend, firmware, mqtt, database, analytics]
created: 2026-04-30
---

# Overview
Blunt recommendation: **Do NOT run full local-time semantics everywhere**. Least-bad model: **UTC canonical for storage/transport/device epoch + UTC+7 (Asia/Ho_Chi_Minh) for business boundaries, scheduler intent, API presentation, UI/reporting**. Full UTC+7 runtime everywhere is unsafe (double-convert, cross-service drift, hard rollback).

## Phases
1. [Phase 01 - Repo-wide timezone surface audit freeze](./phase-01-repo-wide-timezone-surface-audit-freeze.md) — pending
2. [Phase 02 - Canonical contract and guardrails](./phase-02-canonical-contract-and-guardrails.md) — pending
3. [Phase 03 - Database and query boundary standardization](./phase-03-database-and-query-boundary-standardization.md) — pending
4. [Phase 04 - Backend and scheduler timezone hardening](./phase-04-backend-and-scheduler-timezone-hardening.md) — pending
5. [Phase 05 - MQTT ingestion and payload normalization](./phase-05-mqtt-ingestion-and-payload-normalization.md) — pending
6. [Phase 06 - Firmware/device timestamp hardening](./phase-06-firmware-device-timestamp-hardening.md) — pending
7. [Phase 07 - Frontend, reports, export, analytics alignment](./phase-07-frontend-reports-export-analytics-alignment.md) — pending
8. [Phase 08 - Standalone migration scripts local and VPS](./phase-08-standalone-migration-scripts-local-and-vps.md) — pending
9. [Phase 09 - Validation, rollout, rollback](./phase-09-validation-rollout-rollback.md) — pending

## Key dependencies
- P01 blocks all phases.
- P02 blocks P03–P08.
- P03 + P04 + P05 block P07.
- P06 + P08 must complete before P09 production cutover.

## Rollout policy
- Fast coordinated rollout accepted: execute by vertical slices with short freeze window.
- Safety gates: dry-run migration scripts, backup-first, idempotent reruns, preflight rehearsal before one-shot cutover.

## Success definition
- No ambiguous timestamp inputs.
- Day-boundary KPIs/reports consistent across DB/API/UI.
- Cron jobs fire at intended Asia/Ho_Chi_Minh wall-clock.
- All historical DB timestamps + metrics + logs converted to UTC+7.
- Rollback tested and documented.

## Validation Log

### Session 1 — 2026-04-30
**Trigger:** initial plan creation validation before implementation
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Với dữ liệu lịch sử trong PostgreSQL dùng TIMESTAMPTZ, anh muốn xử lý theo hướng nào?
   - Options: Giữ absolute time, đổi query/render | Shift toàn bộ stored timestamps | Chỉ migrate bảng chọn lọc
   - **Answer:** Shift toàn bộ stored timestamps
   - **Rationale:** Đổi chiến lược Phase 03 và 08 từ semantic/query migration sang physical data conversion; rollback và verification khó hơn đáng kể.

2. **[Architecture]** Metrics và logs nên chuẩn hóa theo mô hình nào?
   - Options: Giữ UTC lưu trữ, UTC+7 dashboard | Convert dữ liệu metrics/logs sang UTC+7 | Chỉ áp dụng cho dữ liệu mới
   - **Answer:** Convert dữ liệu metrics/logs sang UTC+7
   - **Rationale:** Mở rộng blast radius khỏi app+DB sang observability data stores; yêu cầu verify/rollback riêng cho metrics/log pipelines.

3. **[Contract]** Contract timestamp canonical cho MQTT/device/backend nên là gì?
   - Options: Epoch ms UTC | ISO8601 +07:00 | Hỗ trợ cả 2 trong migration window
   - **Answer:** ISO8601 +07:00
   - **Rationale:** Đổi transport canonical, ảnh hưởng firmware + MQTT parser + backend normalization + compatibility policy + test fixtures.

4. **[Rollout]** Khi đổi scheduler sang Asia/Ho_Chi_Minh explicit, anh muốn cutover thế nào?
   - Options: Freeze + canary trước | Đổi đồng loạt một lần | Đổi từng nhóm job
   - **Answer:** Đổi đồng loạt một lần
   - **Rationale:** Loại bỏ chiến lược canary rollout; Phase 09 phải tăng preflight rehearsal + rollback readiness thay thế.

#### Confirmed Decisions
- PostgreSQL history: shift toàn bộ stored timestamps — physical conversion, không chỉ đổi semantics.
- Metrics/logs history: convert dữ liệu lịch sử sang UTC+7 — observability nằm trong cutover scope.
- MQTT canonical timestamp: ISO8601 với offset +07:00 — contract local-time explicit ở transport layer.
- Scheduler cutover: đổi đồng loạt một lần — ưu tiên tốc độ rollout.

#### Action Items
- [x] Cập nhật Phase 03: physical TIMESTAMPTZ conversion thay vì chỉ query-boundary standardization.
- [x] Cập nhật Phase 05: canonical MQTT payload là ISO8601 +07:00.
- [x] Cập nhật Phase 08: migration/backup/verify/rollback cho metrics và logs, không chỉ DB/app config.
- [x] Cập nhật Phase 09: thay canary rollout bằng one-shot cutover controls + stronger rollback gates.

#### Impact on Phases
- Phase 03: đổi từ UTC-canonical storage assumption sang full historical stored-timestamp shift; tăng verification và rollback scope.
- Phase 05: accepted timestamp contract phải ưu tiên ISO8601 +07:00, không mặc định UTC epoch.
- Phase 08: migration script suite phải cover DB + metrics + logs historical conversion cho local và VPS.
- Phase 09: bỏ UAT canary mặc định; thay bằng preflight rehearsal bắt buộc và full cutover gate/rollback tree.