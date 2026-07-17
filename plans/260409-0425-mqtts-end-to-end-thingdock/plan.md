---
title: "Kế hoạch production MQTTS end-to-end lên ThingDock"
description: "Triển khai luồng firmware -> broker -> bridge -> backend/storage/observability với MQTTS và schema JSON versioned."
status: pending
priority: P2
effort: "22-28d"
branch: feature/cicd
tags: [mqtts, emqx, firmware, cloud, migration]
created: 2026-04-09
---

# Overview
- Mục tiêu: production-ready ingest qua `mqtts://mqtt.thingdock.dev`, không PoC, không song song runtime cũ.
- Scope: firmware publish path, broker policy, bridge transform, backend mapping, storage + observability + rollout/rollback.
- Guiding principles: KISS (1 canonical path), YAGNI (không thêm service mới nếu chưa cần), DRY (1 schema contract, 1 decision log).

## Decision log (locked)
- TLS trust model: CA chain verification là mặc định; pinning theo cert chain/SPKI chỉ bật theo feature flag và có playbook rotate.
- QoS policy: `rawdata=QoS0`, `status/events/firmware/commands=QoS1`.
- Retained policy: chỉ `status` và control bootstrap; cấm retained cho `rawdata`.
- Idempotency key: bắt buộc cho non-raw payload (`message_id` UUIDv7 + `device_id` + `seq_no`).
- Dedup store + window: Redis TTL 24h cho QoS1 critical streams; backend vẫn enforce idempotent persist bằng `message_id`.
- Ordering guarantee: best-effort theo `device_id + topic`; không cam kết global ordering.

## Migration strategy (payload cũ -> mới)
- Envelope chuẩn: JSON versioned (`schema_version`, `message_id`, `device_id`, `sent_at`, `payload`).
- Compatibility window: tối thiểu 90 ngày hoặc 2 release train (cái nào dài hơn).
- Primary path: bridge transform + backend backward parser.
- Fallback ngắn hạn: dual publish chỉ dùng khi firmware chưa nâng đồng bộ; tắt ngay sau cutover.

## Phase tracker
| Phase | Trạng thái | Progress | File |
|---|---|---:|---|
| 01 Discovery & audit | pending | 0% | [phase-01](./phase-01-discovery-and-audit.md) |
| 02 Security & TLS foundation | pending | 0% | [phase-02](./phase-02-security-and-tls-foundation.md) |
| 03 Schema & topic contract | pending | 0% | [phase-03](./phase-03-schema-and-topic-contract.md) |
| 04 Firmware publish pipeline | pending | 0% | [phase-04](./phase-04-firmware-publish-pipeline.md) |
| 05 Cloud ingestion & mapping | pending | 0% | [phase-05](./phase-05-cloud-ingestion-and-mapping.md) |
| 06 Reliability & offline buffering | pending | 0% | [phase-06](./phase-06-reliability-and-offline-buffering.md) |
| 07 Observability & SLI/SLO | pending | 0% | [phase-07](./phase-07-observability-and-sli-slo.md) |
| 08 Test, rollout & rollback | pending | 0% | [phase-08](./phase-08-test-rollout-and-rollback.md) |

## Validation Log

### Session 1 — 2026-04-09
**Trigger:** Initial plan validation after creating end-to-end MQTTS implementation plan.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Bạn muốn chốt trust model TLS nào cho production với `mqtt.thingdock.dev`?
   - Options: CA verify + pinning flag (Recommended) | CA verify only | Always pinning
   - **Answer:** CA verify + pinning flag (Recommended)
   - **Rationale:** Giữ vận hành ổn định với CA chain mặc định, vẫn có đường tăng cứng bảo mật khi cần mà không khóa cứng rollout ban đầu.

2. **[Tradeoffs]** Bạn muốn chốt dedup store cho `message_id` ở cloud theo hướng nào?
   - Options: Redis TTL 24h (Recommended) | Postgres unique-window | Hybrid Redis + Postgres
   - **Answer:** Redis TTL 24h (Recommended)
   - **Rationale:** Throughput cao và latency thấp hơn cho ingest path; giảm áp lực write amplification trên Postgres.

3. **[Scope]** Mô hình MQTT credential rollout phase đầu nên chốt thế nào?
   - Options: Per-device ngay từ đầu (Recommended) | Tenant-level tạm thời | Mixed theo nhóm thiết bị
   - **Answer:** Tenant-level tạm thời
   - **Rationale:** Giảm độ phức tạp rollout phase đầu; chấp nhận blast radius lớn hơn trong ngắn hạn để tăng tốc cutover.

4. **[Architecture]** Bạn muốn migration payload cũ -> JSON versioned theo đường nào là chính?
   - Options: Bridge transform + backward parser (Recommended) | Dual publish ưu tiên | Backend transform
   - **Answer:** Bridge transform + backward parser (Recommended)
   - **Rationale:** Giữ normalize logic tập trung tại bridge, backend chỉ giữ compatibility parser tạm thời, giảm drift logic đa điểm.

#### Confirmed Decisions
- TLS trust model: CA verify + pinning flag — cân bằng vận hành và hardening.
- Dedup store: Redis TTL 24h — ưu tiên hiệu năng ingest path.
- Credential rollout phase đầu: tenant-level tạm thời — giảm phức tạp rollout ban đầu.
- Migration strategy: bridge transform + backward parser — giảm duplication logic.

#### Action Items
- [ ] Cập nhật phase 02 để mô tả explicit tenant-level credential transition plan sang per-device.
- [ ] Cập nhật phase 05 để khóa Redis TTL 24h thành mặc định dedup store.
- [ ] Cập nhật phase 08 để thêm gate xác nhận mốc chuyển tenant-level -> per-device.

#### Impact on Phases
- Phase 02: cập nhật Requirements/Architecture cho tenant-level tạm thời + lộ trình chuyển per-device.
- Phase 05: cập nhật Architecture/Implementation Steps để chốt Redis TTL 24h làm dedup store mặc định.
- Phase 08: cập nhật acceptance/runbook với điều kiện chuyển đổi credential model.

## Unresolved questions
- ThingDock cert chain dùng public CA hay private CA nội bộ?
- Inventory source of truth cho rollout shard theo device group đã sẵn chưa?
- Thời điểm cụ thể chuyển tenant-level credential sang per-device theo KPI nào?
