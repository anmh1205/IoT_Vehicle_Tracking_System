---
title: "Simplify canonical MQTT flow for simulator and devices"
description: "Implementation plan to enforce MQTT-only ingest, remove /iot/data, and keep one status/event contract end-to-end."
status: completed
priority: P2
effort: 4.5d
branch: feature/cicd
tags: [mqtt, simplification, backend, frontend]
created: 2026-03-31
---

# Implementation Plan Overview

## Goal
Đơn giản hóa luồng ingest: MQTT là canonical path cho cả device thật + simulator; bỏ hẳn `/iot/data`; giữ status enum `online/offline/running/stopped`; không thêm service/kiến trúc mới.

## Scope
- In-scope: backend simulator publish MQTT, gỡ API ingest `/iot/data`, thống nhất event contract Bridge→Backend→Frontend, cập nhật docs liên quan.
- Out-of-scope: thêm microservice mới, thay EMQX topology, đổi auth model, đổi enum status.

## Phase status
- Phase 01 — Baseline & contract freeze: `completed` (100%) → [phase-01-baseline-and-contract-freeze.md](./phase-01-baseline-and-contract-freeze.md)
- Phase 02 — Backend canonical migration + `/iot/data` removal: `completed` (100%) → [phase-02-backend-canonical-migration-and-iot-data-removal.md](./phase-02-backend-canonical-migration-and-iot-data-removal.md)
- Phase 03 — Realtime/frontend contract alignment: `completed` (100%) → [phase-03-realtime-and-frontend-contract-alignment.md](./phase-03-realtime-and-frontend-contract-alignment.md)
- Phase 04 — Validation, rollout, docs update: `completed` (100%) → [phase-04-validation-rollout-and-documentation.md](./phase-04-validation-rollout-and-documentation.md)

## Key decisions locked
- MQTT broker path là ingress duy nhất cho telemetry/status/event của simulator + device thật.
- Xóa hoàn toàn endpoint `/iot/data` và nhánh xử lý liên quan.
- Giữ enum status hiện tại: `online`, `offline`, `running`, `stopped`.
- Không thêm service mới; chỉ refactor/reuse trong module hiện có.

## Dependencies
- Tracking_Backend: simulator, iot routes/controllers, realtime listener/socket bridge, OpenAPI.
- Tracking_MqttBridge: internal event envelope/topic mapping.
- Tracking_Frontend: simulator page/hooks + realtime listeners nếu có alias event.
- Docs: `docs/system-architecture.md`, `docs/codebase-summary.md`, `docs/project-overview-pdr.md`, `docs/project-changelog.md`, `docs/development-roadmap.md`.

## Milestones
- M1: Chốt contract và danh sách breaking changes.
- M2: Simulator chạy MQTT canonical, `/iot/data` bị gỡ ở backend.
- M3: Event contract end-to-end thống nhất, không còn alias drift.
- M4: Verify build/test/smoke pass + docs cập nhật đầy đủ.

## Exit criteria
- Không còn đường ingest nào dùng `/iot/data`.
- Simulator tạo được telemetry/status qua MQTT topic contract `v1/{device_id}/...`.
- Realtime event name/envelope nhất quán Bridge→Backend→Frontend.
- Test/build và smoke test simulator + device flow pass.

## Unresolved questions
- Có consumer ngoài frontend hiện tại đang gọi `/iot/data` không?

## Validation Log

### Session 1 — 2026-03-31
**Trigger:** Initial plan validation after plan:hard creation.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Khi chuẩn hóa event realtime, bạn muốn xử lý alias tên event cũ như thế nào?
   - Options: Giữ 1 release (Recommended) | Cắt ngay lập tức | Giữ lâu dài
   - **Answer:** Cắt ngay lập tức
   - **Rationale:** Loại alias ngay giúp giảm branching và drift contract, đúng mục tiêu đơn giản hóa mạnh.

2. **[Scope]** Việc xóa `/iot/data` bạn muốn theo nhịp nào?
   - Options: Xóa ngay trong 1 PR (Recommended) | 2 bước liên tiếp | Giữ endpoint deprecated
   - **Answer:** Xóa ngay trong 1 PR (Recommended)
   - **Rationale:** Tránh tồn tại nhánh ingest song song; giảm nhầm lẫn vận hành và giảm chi phí giữ tương thích.

3. **[Security]** Simulator publish MQTT sẽ dùng danh tính/auth thế nào?
   - Options: Dùng token thiết bị thật (Recommended) | Token simulator riêng | Bỏ auth cho simulator
   - **Answer:** Dùng token thiết bị thật (Recommended)
   - **Rationale:** Giữ cùng trust model với thiết bị thật, không mở thêm auth path mới.

4. **[Architecture]** Với enum `online/offline/running/stopped`, bạn muốn nguồn sự thật chính nằm ở đâu?
   - Options: Status topic + LWT (Recommended) | Suy ra từ telemetry | API/backend quyết định
   - **Answer:** Status topic + LWT (Recommended)
   - **Rationale:** Trạng thái kết nối cần tín hiệu broker-native rõ ràng; telemetry chỉ bổ sung ngữ cảnh hoạt động.

#### Confirmed Decisions
- Event alias policy: cắt alias ngay trong migration — giảm drift.
- `/iot/data` removal: xóa ngay trong 1 PR — không giữ deprecated.
- Simulator auth: dùng token thiết bị thật — giữ bảo mật đồng nhất.
- Status source of truth: status topic retained + LWT — telemetry không làm nguồn chính.

#### Action Items
- [x] Cập nhật phase 02 để chốt one-PR removal cho `/iot/data` và migration simulator.
- [x] Cập nhật phase 03 để loại compatibility alias hoàn toàn.
- [x] Cập nhật phase liên quan để ghi rõ status source-of-truth là status+LWT.

#### Impact on Phases
- Phase 02: Thực hiện migration simulator MQTT + xóa `/iot/data` trong cùng một PR; simulator dùng token thiết bị thật; thêm bước xác thực retained status + LWT.
- Phase 03: Loại toàn bộ compatibility alias event, giữ một canonical event set duy nhất.
- Phase 04: Bổ sung test/regression cho retained/LWT và xác nhận không còn alias compatibility.
