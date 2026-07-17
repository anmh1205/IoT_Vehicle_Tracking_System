---
title: "Geofence allowed-zone rebuild"
description: "Rebuild geofence around one active circle allowed zone per vehicle with shared setup UX and extensible low-spam alerts."
status: pending
priority: P1
effort: 34h
branch: feat/all-feat
tags: [geofence, allowed-zone, backend, frontend, alerts, ux]
created: 2026-04-21
---

# Geofence allowed-zone rebuild plan

## Goal
Replace generic reusable geofence/policy management with an operational flow where each vehicle has exactly 1 active allowed movement zone, defined as a circle, configurable from map and device detail modal.

## Current mismatch
- Backend runtime truth is many-to-many `vehicle_policies` + generic geofence entities.
- Frontend flow is create geofence then bind vehicles, not configure one vehicle directly.
- Map flow only partially supports center picking; device modal lacks the same setup path.
- Alert handling is policy-centric and can spam if reused naively for this feature.

## Target architecture
- New runtime source of truth: `vehicle_allowed_zones` table/service, one active record per vehicle.
- Shape: `vehicle_id`, `zone_type=circle`, `center_lat`, `center_lon`, `radius_m`, `center_source`, `status`, transition/alert state, audit fields.
- Shared backend upsert/read APIs used by both entry points.
- Shared frontend allowed-zone setup sheet reused by operations/map and device detail modal.
- Alerting separated into decision state + notification dispatch, defaulting to transition-based deduped alerts.

## Phases
1. [Phase 01](./phase-01-align-domain-and-migration.md) — lock domain model, contracts, legacy cutover.
2. [Phase 02](./phase-02-backend-runtime-and-api.md) — add persistence, services, API, migration path.
3. [Phase 03](./phase-03-realtime-and-alert-behavior.md) — wire evaluation, dedupe, realtime payloads.
4. [Phase 04](./phase-04-frontend-shared-setup-flow.md) — build shared compact setup UX.
5. [Phase 05](./phase-05-validation-and-rollout.md) — validation, tests, rollout, cleanup.
6. [Phase 06](./phase-06-documentation-updates.md) — docs and operational guidance.

## Key dependencies
- Existing telemetry location quality for “use current vehicle position”.
- Vehicle ownership/authorization checks already present in backend auth stack.
- Frontend shared map/device state hooks for selected vehicle context.

## Migration strategy summary
- Add new allowed-zone model in parallel; do not force-fit legacy many-to-many model.
- Backfill compatible active radius policies into allowed-zone rows.
- Freeze legacy UI entry for this feature once new UX ships.
- Keep legacy policy tables readable for history/compatibility until cleanup phase.

## Done when
- Operators can set/replace one circle zone per vehicle from map or device modal.
- Telemetry evaluation uses new model as runtime truth.
- Default alerts are deduped and non-spammy.
- Legacy generic geofence workflow is removed or clearly marked out of scope for this feature.
- Docs and tests cover migration and operational behavior.

## Risks
- Conflicting legacy active policies per vehicle.
- Missing/old telemetry when picking current position.
- UI drift if modal and map use separate implementations.
- Alert spam if transition state is not persisted.

## Unresolved questions
- None blocking for planning.

## Validation Log

### Session 1 — 2026-04-21
**Trigger:** Initial validation after first full geofence rebuild plan draft.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Khi thay thế vùng giám sát đang active của xe, mình muốn lưu lịch sử theo cách nào?
   - Options: Append-only (Recommended) | Overwrite tại chỗ | Tùy ngữ cảnh
   - **Answer:** Overwrite tại chỗ
   - **Rationale:** Quyết định này đổi semantics persistence và migration/audit strategy ở backend; implementation phải ưu tiên một active row bị cập nhật tại chỗ thay vì insert row lịch sử mới.

2. **[Risk]** Nếu người dùng chọn tâm từ vị trí hiện tại của xe nhưng telemetry quá cũ hoặc không có, hệ thống nên xử lý thế nào?
   - Options: Chặn lưu, đổi sang map (Recommended) | Cho lưu kèm cảnh báo | Tự fallback sang map center
   - **Answer:** Cho lưu kèm cảnh báo
   - **Rationale:** Ảnh hưởng trực tiếp tới UX flow, validation rules, và backend metadata; v1 không được block thao tác vận hành chỉ vì snapshot cũ, nhưng phải cảnh báo rõ.

3. **[Scope]** Sau khi làm lại, trang `/operations/geofences` nên giữ vai trò gì?
   - Options: Bỏ write, chỉ dùng map + modal | Trang danh sách nhẹ (Recommended) | Giữ full page riêng
   - **Answer:** Trang danh sách nhẹ (Recommended)
   - **Rationale:** Chốt lại information architecture ở frontend: vẫn giữ entry tổng quan riêng, nhưng không duy trì generic CRUD/binder logic song song với map flow.

4. **[Tradeoffs]** Cảnh báo khi xe quay trở lại bên trong vùng nên mặc định thế nào ở v1?
   - Options: Tắt mặc định (Recommended) | Bật mặc định | Bật theo cấu hình xe
   - **Answer:** Tắt mặc định (Recommended)
   - **Rationale:** Chốt anti-spam default cho phase alert/realtime, tránh mở rộng scope cấu hình sớm nhưng vẫn giữ API đủ mở cho tương lai.

#### Confirmed Decisions
- Replace semantics: overwrite active zone in place — giảm phức tạp persistence, vẫn yêu cầu audit metadata.
- Stale telemetry handling: allow save with warning — ưu tiên thao tác vận hành liên tục.
- Operations geofences page: keep lightweight summary page — không giữ generic binder CRUD như luồng chính.
- Recovery alert default: off in v1 — giảm spam.

#### Action Items
- [ ] Update phase 01 to remove append-only replacement assumption.
- [ ] Update phase 02 data model and API notes for stale telemetry warning path.
- [ ] Update phase 03 anti-spam defaults for recovery-off behavior.
- [ ] Update phase 04 UX scope for lightweight `/operations/geofences` page.
- [ ] Update phase 05 validation matrix to include stale telemetry warning coverage.

#### Impact on Phases
- Phase 01: replacement semantics changed from append-only history row to overwrite-in-place with audit metadata.
- Phase 02: allowed-zone model and save flow must support stale telemetry warning instead of blocking current-position save.
- Phase 03: recovery alert remains disabled by default in v1.
- Phase 04: `/operations/geofences` becomes lightweight summary/list launcher, not full CRUD workspace.
- Phase 05: tests/UAT must include stale telemetry warning behavior.
