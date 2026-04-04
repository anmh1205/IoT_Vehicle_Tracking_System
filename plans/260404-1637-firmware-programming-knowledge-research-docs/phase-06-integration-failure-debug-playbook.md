# Phase 06 — Integration patterns và failure/debug playbook

## Context links
- `./phase-05-component-programming-guides-authoring.md`
- `./research/researcher-02-community-forum-report.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260404-1637-firmware-programming-knowledge-research-docs/scout/scout-01-firmware-programming-scope.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-04
- Description: xây plan cho tài liệu tích hợp liên linh kiện + playbook xử lý lỗi thực địa.
- Priority: P2
- Implementation status: pending
- Review status: not-started

## Key Insights
- Nút thắt tích hợp nằm ở power sequencing, sleep/wake coordination, UART flow control.
- Nhiều lỗi phải debug theo thứ tự đo nguồn -> tín hiệu -> command sequence.
- Playbook tốt cần symptom-first, không theory-first.

## Requirements
- Tạo design cho `07-integration-patterns.md` và `08-failure-and-debug-playbook.md`.
- Integration patterns bắt buộc cover:
  - ESP32-S3 <-> SIM7600 UART + flow control
  - modem + GNSS sequencing
  - IMU wake + deep sleep interaction
  - flash/RTC/power interaction points
- Playbook phải có decision tree theo symptom.
- Checklist debug mức production: bắt buộc có instrument checks (nguồn/logic/UART) + tiêu chí pass/fail rõ cho từng bước chính.
<!-- Updated: Validation Session 1 - production-grade debug checklist requirement -->

## Architecture
- Pattern format:
  - Preconditions
  - Sequence
  - Expected observables
  - Failure signatures
  - Recovery steps
- Debug playbook matrix:
  - Symptom
  - Probable causes (ranked)
  - Checks (instrument + command)
  - Fix path
  - Confidence

## Related code files
- Files to modify: none.
- Files to create (future docs target):
  - `iot-vehicle-tracking-system-firmware/hardware-specs/programming/07-integration-patterns.md`
  - `iot-vehicle-tracking-system-firmware/hardware-specs/programming/08-failure-and-debug-playbook.md`
- Files to delete: none.

## Implementation Steps
1. Chọn integration flows ưu tiên theo impact.
2. Thiết kế template pattern nhất quán.
3. Lập symptom catalog từ evidence community + vendor constraints.
4. Thiết kế decision tree debug từ nhanh -> sâu.
5. Cross-link về component guides và citation index.

## Todo list
- [ ] Finalize integration flow list.
- [ ] Finalize debug symptom catalog.
- [ ] Finalize decision tree structure.
- [ ] Finalize cross-link strategy.

## Success Criteria
- Có luồng debug dùng được cho lỗi phổ biến brownout/AT timeout/wake fail.
- Mọi step debug đều trace được tới evidence.
- Không có hướng dẫn mâu thuẫn giữa pattern và component guides.

## Risk Assessment
- Risk: playbook quá generic, khó áp dụng thực tế.
- Risk: bỏ sót lỗi do hardware variant mismatch.
- Mitigation: thêm checkpoint “xác minh variant trước debug sâu”.

## Security Considerations
- Debug steps không chứa thông tin nhạy cảm (credentials, private endpoint).
- Khuyến nghị thao tác phần cứng có cảnh báo an toàn nguồn/điện áp.

## Next steps
- Sang P07 để chạy quality gates, audit traceability, và chốt readiness.