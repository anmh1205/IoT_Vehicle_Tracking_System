# Phase 05 - Cloud ingestion and mapping

## Context links
- `../plan.md`
- `./phase-02-security-and-tls-foundation.md`
- `./phase-03-schema-and-topic-contract.md`
- `../research/researcher-02-cloud-migration-mqtts-report.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-09
- Description: Thiết kế ingest cloud từ EMQX qua bridge vào backend/storage, đảm bảo mapping đúng contract mới.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- Bridge là điểm normalize hợp lý nhất để giảm duplication logic ở backend.
- ACL và retained policy phải áp ở broker để chặn sai ngay biên.
- Exactly-once không thực tế; idempotent ingest là bắt buộc.

## Requirements
- Enforce topic scope: `v1/{device_id}/...`.
- Enforce retained policy: chỉ status/control, cấm rawdata retained.
- Parse payload cũ + mới trong compatibility window, ưu tiên output chuẩn v1.
- Mapping rõ vào storage/metrics/logs mà không mất truy vết `message_id`.

## Architecture
<!-- Updated: Validation Session 1 - dedup store decision -->
- Ingest chain:
  1) EMQX authn/authz/ACL check
  2) Bridge validate + transform + dedup precheck
  3) Backend business validation + idempotent upsert
  4) Persist + emit observability metrics
- Idempotency:
  - key chính: `message_id`
  - fallback: `(device_id, topic, seq_no)`
- Dedup store mặc định: Redis TTL 24h cho streams QoS1 critical.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_EMQX/**`
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/*`
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/validators/*`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/**`
- Create:
  - Không tạo file markdown ngoài plan dir
- Delete:
  - Các parser/path legacy sau cutoff migration

## Implementation Steps
1. Khóa ACL template theo device-scope và quyền bridge/service account.
2. Áp retained/QoS policy trên broker và sync rules ở bridge.
3. Cài transform pipeline payload cũ -> envelope v1.
4. Cài backend parser backward-compatible và idempotent persist.
5. Cài dedup store Redis TTL 24h + cleanup TTL/eviction monitoring.

## Todo list
- [ ] Freeze ACL pattern theo device/tenant.
- [ ] Freeze transform mapping table field-by-field.
- [ ] Freeze idempotent persist strategy theo từng loại message.
- [ ] Freeze kế hoạch tắt parser legacy.

## Success Criteria
- Message hợp lệ đi xuyên pipeline và persist đúng 1 lần logic.
- Payload cũ/new cùng được ingest đúng trong compatibility window.
- Không có cross-device publish thành công khi sai ACL.

## Risk Assessment
- Risk: bridge thành bottleneck khi load tăng.
- Mitigation: benchmark trước rollout, tối ưu handler hot path, scale bridge instance theo shard.

## Security Considerations
- Service account bridge giới hạn quyền topic tối thiểu.
- Không log payload full cho luồng chứa dữ liệu nhạy cảm; log theo policy redaction.

## Next steps
- Chuyển output sang phase 06 (offline/reliability) và phase 07 (observability SLO).
