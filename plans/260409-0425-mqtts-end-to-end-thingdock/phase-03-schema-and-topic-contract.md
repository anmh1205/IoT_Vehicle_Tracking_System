# Phase 03 - Schema and topic contract

## Context links
- `../plan.md`
- `./phase-01-discovery-and-audit.md`
- `../research/researcher-02-cloud-migration-mqtts-report.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-09
- Description: Chốt contract topic + JSON schema versioned + policy migration cũ/mới.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- Không version trong topic, version nằm trong envelope để giảm nổ topic matrix.
- Duplicates là bình thường với QoS1, phải xử lý bằng idempotency + dedup store.
- Retained dùng cực hạn chế; rawdata retained gây rủi ro replay sai semantics.

## Requirements
- Envelope chuẩn: `schema_version`, `message_id`, `device_id`, `sent_at`, `payload`.
- Contract topic theo prefix `v1/{device_id}/...`.
- Chốt compatibility window: tối thiểu 90 ngày hoặc 2 release train.
- Chốt migration mode ưu tiên: bridge transform; dual publish chỉ fallback tạm.

## Architecture
- Decision log bắt buộc:
  - QoS theo loại dữ liệu.
  - Retained policy.
  - Idempotency key format.
  - Dedup store window.
  - Ordering guarantee.
- Compatibility model:
  - Bridge parser nhận payload cũ, emit payload mới.
  - Backend giữ backward parser trong compatibility window.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/validators/*`
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/*`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/**/dto/*`
  - `iot-vehicle-tracking-system-firmware/main/src/*mqtt*`
- Create:
  - Không tạo code mới ngoài phạm vi cần thiết khi implement
- Delete:
  - Legacy parser/path sau khi hết compatibility window

## Implementation Steps
1. Thiết kế JSON schema v1.0.0 cho từng class dữ liệu: rawdata/status/events/firmware/commands.
2. Định nghĩa rules evolution (major/minor/patch) và backward compatibility.
3. Định nghĩa migration policy: transform-first, dual-publish fallback.
4. Định nghĩa acceptance gate reject payload sai schema.

## Todo list
- [ ] Freeze topic namespace và ownership.
- [ ] Freeze envelope fields bắt buộc/tùy chọn.
- [ ] Freeze schema evolution rules.
- [ ] Freeze migration cutoff date + deprecation date payload cũ.

## Success Criteria
- Có 1 contract tài liệu duy nhất cho firmware/bridge/backend.
- Payload cũ vẫn chạy trong compatibility window không phá dữ liệu.
- Có cutoff rõ để gỡ parser cũ sau migration.

## Risk Assessment
- Risk: dual publish kéo dài gây drift số liệu.
- Mitigation: đặt deadline cứng để tắt dual publish; so sánh parity theo dashboard kiểm chứng.

## Security Considerations
- Payload schema không chứa secret nhạy cảm.
- Validate strict type/range để chặn injection/payload abuse.

## Next steps
- Dùng contract đã freeze để build firmware pipeline (phase 04) và ingest mapping (phase 05).
