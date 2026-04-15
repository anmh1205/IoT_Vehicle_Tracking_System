# Phase 02 - Security and TLS foundation

## Context links
- `../plan.md`
- `./phase-01-discovery-and-audit.md`
- `../research/researcher-01-firmware-security-mqtts-report.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-09
- Description: Chuẩn hóa TLS/auth/secrets end-to-end cho `mqtts://mqtt.thingdock.dev`.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- CA chain verification là baseline vận hành tốt nhất; pinning chỉ dùng khi có ràng buộc mạnh.
- TLS verify phụ thuộc clock hợp lệ; không cho phép skip verify khi production.
- Per-device credential giảm blast radius rõ rệt so với shared credential.

## Requirements
<!-- Updated: Validation Session 1 - credential model rollout -->
- Bắt buộc broker cert validation + SNI host match.
- Chính sách secrets lifecycle: provision, rotate, revoke, audit.
- Phase đầu cho phép tenant-level credential tạm thời, nhưng phải có mốc chuyển bắt buộc sang per-device.
- Cấm hardcode secret trong source, build artifact, log.

## Architecture
<!-- Updated: Validation Session 1 - trust + credential transition -->
- Trust model:
  - Default: CA chain/bundle verify.
  - Optional: cert-chain/SPKI pinning qua feature flag.
- Secret model:
  - Phase đầu: tenant-level credential với 2-slot rotation (`active`, `next`) + grace window.
  - Phase chuyển tiếp: migrate sang per-device credential theo shard để giảm blast radius.
  - Cloud: secret manager/env injection, không commit file chứa secret.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
  - `iot-vehicle-tracking-system-firmware/main/inc/modem_at.h`
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/config/env.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/config/env.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_EMQX/**`
- Create:
  - Không tạo file mới ngoài phần plan
- Delete:
  - Không

## Implementation Steps
1. Chốt decision log TLS: CA-chain default, pinning optional có runbook rotate.
2. Thiết kế provisioning flow cho username/password theo device.
3. Thiết kế rotation flow 2-slot và revoke flow cho credential leak.
4. Thiết kế redaction rules cho toàn bộ log line có secret.

## Todo list
- [ ] Chốt trust model cuối cùng (default + fallback).
- [ ] Chốt credential naming convention (`tenant/device`).
- [ ] Chốt chính sách rotate/revoke với timeline áp dụng.
- [ ] Chốt danh sách biến môi trường secret theo env local/UAT/prod.

## Success Criteria
- Tất cả component dùng TLS verify đúng hostname.
- Có playbook rotation credential và cert không downtime.
- Không còn secret plaintext trong repo/log tiêu chuẩn.

## Risk Assessment
- Risk: rotate cert hoặc password gây mất kết nối diện rộng.
- Mitigation: rollout shard + grace window + canary validation trước global rollout.

## Security Considerations
- Firmware: ưu tiên secure storage cho creds/cert, lock debug ở bản prod.
- Cloud: phân quyền đọc secret tối thiểu, audit trail bắt buộc.
- Broker: ACL theo `v1/{device_id}/...`, cấm publish vượt scope.

## Next steps
- Input trực tiếp cho phase 04 (firmware connect/publish) và phase 05 (broker/bridge policy).
