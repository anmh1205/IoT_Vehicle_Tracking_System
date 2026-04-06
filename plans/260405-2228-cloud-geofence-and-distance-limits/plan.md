---
title: "Cloud geofence và distance limits cho xe tự lái"
description: "Kế hoạch MVP nhiều phase cho 3 policy giới hạn vận hành xe trên cloud backend."
status: in-progress
priority: P2
effort: "11d"
branch: feature/cicd
tags: [cloud, geofence, distance-quota, backend, postgresql, telemetry]
created: 2026-04-05
---

# Plan overview
- Mục tiêu: thêm 3 policy cloud-side cho mỗi xe/nhóm xe
  1) ranh giới hành chính tỉnh/thành (polygon admin)
  2) bán kính X km từ tâm (radius)
  3) tổng quãng đường cho phép X km theo chu kỳ (quota)
- Nguyên tắc: server-side evaluator là source of truth; không đổi firmware contract.
- Định hướng MVP: rollout theo phase, giảm false-positive bằng hysteresis + dwell + grace.
- Trạng thái tracking hiện tại: in-progress; contract/scope đã khóa, backend review xong, còn các mục race-condition/contract alignment cần xử lý trước khi đóng plan.

## Phases
- [x] Phase 01 — Policy contract + phạm vi nghiệp vụ  
  File: `./phase-01-policy-contract-and-scope.md`
- [ ] Phase 02 — Data model + migration + seed boundary  
  File: `./phase-02-data-model-and-migrations.md`
- [ ] Phase 03 — Telemetry evaluator + state machine vi phạm  
  File: `./phase-03-telemetry-evaluator-and-state-machine.md`
- [ ] Phase 04 — API/admin flow + query/reporting surface  
  File: `./phase-04-api-and-admin-flow.md`
- [ ] Phase 05 — Observability + rollout + vận hành  
  File: `./phase-05-observability-and-rollout.md`
- [ ] Phase 06 — Test strategy + hardening + acceptance gate  
  File: `./phase-06-test-strategy-and-acceptance.md`

## MVP architecture decisions
- Dùng Postgres + PostGIS làm engine geospatial (KISS, tránh tự code point-in-polygon ở Node).
- Tách `policy config` và `policy runtime state` để hỗ trợ event-driven evaluation idempotent.
- Evaluator chạy theo telemetry ingest event; không batch phức tạp ở MVP.
- Distance quota cộng theo segment hợp lệ liên tiếp, không nội suy mù khi mất GPS; cycle reset theo `Asia/Saigon` cho MVP.
- Boundary semantics mặc định: điểm nằm trên biên được xem là `OUTSIDE` (strict), có buffer/hysteresis để giảm rung biên.
- Enforcement dùng ma trận theo policy type trong MVP (không one-size-fits-all).

## Dependencies
- Dataset ranh giới tỉnh/thành từ nguồn chính thức VN, có license rõ và quy trình cập nhật vận hành được.
- PostGIS extension khả dụng trong môi trường hiện tại.
- Telemetry có lat/lon/timestamp đủ ổn định cho evaluator.

## Milestones
- M1: Radius + distance quota chạy read-only (emit warning/log, chưa block cứng).
- M2: Admin-boundary policy chạy production với dwell+grace (strict boundary semantics theo quyết định validation).
- M3: Dashboard metric + audit + runbook hoàn chỉnh + enforcement matrix theo policy type.

## Non-goals (MVP)
- Không làm geofence client-side.
- Không làm geo-hierarchy ADM2/ADM3 ngay.
- Không làm auto-remediation command xuống thiết bị ở phase đầu.

## Exit criteria
- 3 policy hoạt động ổn định, idempotent, có observability, có rollback nhanh.
- Không phá API envelope `{ data, requestId, meta? }` và event naming conventions.

## Validation Log

### Session 1 — 2026-04-05
**Trigger:** Initial plan creation validation before implementation.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Cho MVP, bạn muốn chốt nguồn dữ liệu ranh giới hành chính nào làm source of truth?
   - Options: geoBoundaries trước (Recommended) | Nguồn chính thức VN trước | Song song 2 nguồn
   - **Answer:** Nguồn chính thức VN trước
   - **Rationale:** Quyết định trực tiếp ingestion strategy, legal posture, và effort cho Phase 02.

2. **[Assumptions]** Semantics điểm nằm đúng trên biên polygon nên xử lý thế nào?
   - Options: Coi là inside (Recommended) | Coi là outside | Inside theo buffer
   - **Answer:** Coi là outside
   - **Rationale:** Thay đổi logic evaluator ở Phase 03 và bộ test boundary edge cases ở Phase 06.

3. **[Architecture]** Chu kỳ reset quota distance nên lấy timezone nào cho MVP?
   - Options: Asia/Saigon (Recommended) | UTC | Theo timezone mỗi fleet
   - **Answer:** Asia/Saigon (Recommended)
   - **Rationale:** Ảnh hưởng công thức cycle window, cron/reset logic và báo cáo thống kê theo chu kỳ.

4. **[Scope]** Khi vi phạm policy trong MVP, hệ thống nên phản ứng mức nào?
   - Options: Alert-only trước (Recommended) | Chặn cứng ngay | Theo từng policy
   - **Answer:** Theo từng policy
   - **Rationale:** Cần enforcement matrix theo policy type, tác động rollout strategy và risk controls.

#### Confirmed Decisions
- Boundary data source: Official VN source-first — ưu tiên tính chính thống và legal correctness.
- Boundary semantics: On-boundary = OUTSIDE — dùng strict interpretation cho rule engine.
- Quota reset timezone: Asia/Saigon — đồng nhất vận hành hiện tại tại VN.
- Enforcement mode: Per-policy matrix — phản ứng khác nhau theo loại policy.

#### Action Items
- [ ] Cập nhật Phase 02 với chiến lược ingest nguồn chính thức VN + fallback policy.
- [ ] Cập nhật Phase 03 để chốt strict boundary handling (`on-boundary => OUTSIDE`).
- [ ] Cập nhật Phase 03/06 để chốt cycle reset theo Asia/Saigon.
- [ ] Cập nhật Phase 05 để định nghĩa enforcement matrix theo policy type.

#### Impact on Phases
- Phase 02: Ưu tiên pipeline ingest boundary từ nguồn chính thức VN; bổ sung fallback rõ ràng nếu endpoint/format không ổn định.
- Phase 03: Đổi semantics boundary từ inclusive sang strict OUTSIDE tại biên; giữ hysteresis/dwell để giảm false positives.
- Phase 03: Chốt cycle reset quota theo timezone Asia/Saigon.
- Phase 05: Bổ sung rollout/enforcement matrix theo policy type thay vì alert-only toàn cục.
- Phase 06: Mở rộng test cases cho on-boundary OUTSIDE và reset cycle theo Asia/Saigon.
