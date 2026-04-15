# Phase 08 - Test rollout and rollback

## Context links
- `../plan.md`
- `./phase-06-reliability-and-offline-buffering.md`
- `./phase-07-observability-and-sli-slo.md`
- `../research/researcher-02-cloud-migration-mqtts-report.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-09
- Description: Chốt test matrix production-grade + runbook rollout local/UAT/prod + điều kiện rollback.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- Chỉ pass unit/integration là chưa đủ; bắt buộc soak + network-fault cho hệ IoT LTE thực tế.
- Rollout phải progressive theo shard, không đẩy all-device một lần.
- Rollback cần trigger rõ theo SLI/SLO, không rollback theo cảm giác.

## Requirements
<!-- Updated: Validation Session 1 - credential transition gate -->
- Test strategy đầy đủ: unit, integration, soak, network-fault, acceptance.
- Acceptance criteria đo được, map trực tiếp vào SLO phase 07.
- Runbook rollout có từng bước local -> UAT -> prod.
- Bổ sung gate bắt buộc để chuyển tenant-level credential sang per-device theo KPI chốt.
- Rollback conditions/action/owner rõ.

## Architecture
- Test matrix:
  - Unit: parser/schema/version routing/idempotency key generator.
  - Integration: EMQX -> bridge -> backend -> storage, verify ingest exactly-one logical effect.
  - Soak: tải cao nhiều giờ, có reconnect ngắt quãng, theo dõi memory/backlog.
  - Network-fault: broker restart, TLS fail, packet loss, duplicate burst.
  - Acceptance: canary + parity so sánh payload cũ/mới trong compatibility window.
- Acceptance criteria (minimum):
  - Unit/integration pass 100% case bắt buộc.
  - Soak >=24h không leak memory/reconnect storm không kiểm soát.
  - E2E latency p95 không vượt 2x baseline UAT.
  - Schema reject dưới ngưỡng đã chốt và có phân loại root cause.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-firmware/main/**` (test hooks/config cần thiết)
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/**`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/**`
  - `.github/workflows/**` (nếu cần pipeline gate)
- Create:
  - Không tạo file markdown ngoài plan dir
- Delete:
  - Test scaffolding tạm sau khi merge vào suite chính

## Implementation Steps
<!-- Updated: Validation Session 1 - credential migration gating -->
1. Chốt test data set thực (không fake cheat) và replay scripts.
2. Thiết kế CI gates: schema validation, integration smoke, fault injection subset.
3. Chạy local gate, sau đó UAT canary 5-10% fleet.
4. Theo dõi parity/SLI trong compatibility window.
5. Chạy gate quyết định chuyển tenant-level credential -> per-device theo KPI và risk budget.
6. Rollout prod theo shard + freeze schema trong cutover.
7. Tắt dual publish/legacy parser đúng cutoff.

## Todo list
- [ ] Freeze acceptance criteria với owner sign-off.
- [ ] Freeze local/UAT/prod runbook theo checklist executable.
- [ ] Freeze rollback playbook và quyền kích hoạt rollback.
- [ ] Freeze migration exit criteria để gỡ compatibility layer.

## Success Criteria
- Rollout hoàn tất không vi phạm SLO critical.
- Có thể rollback trong thời gian mục tiêu, không mất dữ liệu critical.
- Kết thúc migration: payload mới là chuẩn duy nhất, legacy path tắt an toàn.

## Risk Assessment
- Risk: rollout đồng loạt gây sự cố diện rộng nếu bug parser.
- Mitigation: canary theo shard + gate bắt buộc trước mỗi bước mở rộng.

## Security Considerations
- Kiểm thử xác thực/ACL âm tính: device không được publish ngoài scope.
- Kiểm thử rotate/revoke credential trong lúc rollout.
- Kiểm thử TLS expiry/hostname mismatch bắt buộc fail-closed.

## Next steps
- Sau ổn định prod, lập kế hoạch cleanup parser legacy, giảm debt vận hành, cập nhật docs roadmap/changelog.

## Unresolved questions
- Tỷ lệ canary shard ban đầu chốt 5% hay 10% theo inventory thực tế?
- Cửa sổ compatibility có cần vượt 90 ngày cho nhóm thiết bị offline dài ngày?
- Mốc cắt hẳn dual publish phụ thuộc KPI nào ngoài parity count?
- SLA rollback tối đa bao nhiêu phút để đáp ứng vận hành hiện tại?
