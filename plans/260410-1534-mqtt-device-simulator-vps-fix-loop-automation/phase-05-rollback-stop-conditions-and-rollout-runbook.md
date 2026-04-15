# Context links
- Plan overview: `./plan.md`
- Phase 03 orchestration: `./phase-03-local-agent-vps-ssh-fix-loop-orchestration.md`
- Phase 04 gates: `./phase-04-test-matrix-telemetry-checkpoints-and-gates.md`
- README operations/troubleshooting: `../../README.md`

# Overview
- Priority: P1
- Status: completed
- Mục tiêu: chuẩn hóa rollback, stop conditions, và runbook rollout an toàn cho local->VPS loop.

# Key Insights
- Không có rollback + stop conditions thì automation dễ thành rủi ro vận hành.
- Exit criteria phải rõ để loop dừng đúng lúc, tránh over-fix.
- Runbook cần ngắn, thực dụng, operator làm theo được ngay.

# Requirements
- Functional:
  - Định nghĩa rollback levels (L1 config revert, L2 service restart targeted, L3 manual handover).
  - Định nghĩa stop conditions bắt buộc.
  - Định nghĩa runbook từng bước cho operator.
- Non-functional:
  - Recovery time bounded.
  - Audit trail đầy đủ cho postmortem.
  - Quyền override hard-stop thuộc **Platform lead only**.
  <!-- Updated: Validation Session 1 - Hard-stop override authority -->

# Architecture
- Stop conditions (hard stop):
  1. Cùng classifier lỗi lặp lại >= 3 iterations.
  2. Critical health endpoint down > 5 phút sau fix.
  3. Error rate tăng > 2x baseline sau patch.
  4. Loop runtime vượt 20 phút/run hoặc 60 phút/campaign.
  5. Phát hiện potential secret leak trong logs/artifacts.
- Rollback ladder:
  - L1: revert config/env change từ snapshot.
  - L2: rollback service image/tag hoặc compose override gần nhất.
  - L3: stop automation, handover human with evidence pack.

# Related code files
- Modify:
  - `.github/workflows/*` (chỉ nếu cần bổ sung manual trigger/runbook link, không bắt buộc phase đầu)
  - `resources/mock-data/scripts/local-vps-fix-loop-agent.ts` (thêm stop/rollback hooks)
- Create:
  - `resources/mock-data/simulator-specs/rollback-runbook-mqtt-vps-fix-loop.md`
  - `resources/mock-data/simulator-specs/automation-stop-conditions-policy.json`
  - `resources/mock-data/simulator-specs/operator-handover-checklist.md`
- Delete:
  - none

# Implementation Steps
1. Chốt hard stop conditions định lượng, không mơ hồ.
2. Chốt rollback ladder theo impact tăng dần.
3. Chốt runbook template: pre-check, run, monitor, stop, rollback, handover.
4. Chốt handover evidence checklist để giảm mất ngữ cảnh.
5. Chạy tabletop review với 1-2 fault scenarios để validate runbook.

# Todo list
- [x] Chốt hard stop conditions và escalation contacts.
- [x] Chốt rollback ladder và pre-rollback snapshot checklist.
- [x] Chốt operator runbook 1 trang, thao tác được ngay.
- [x] Chốt handover checklist cho ca blocked.
- [x] Chốt định nghĩa “campaign done” và “safe to close”.

# Success Criteria
- Có policy stop conditions dạng machine-readable + human-readable.
- Rollback thực hiện được trong <= 10 phút cho L1/L2 paths.
- Handover package đủ để người khác tiếp tục trong <= 15 phút onboarding.
- Sau rollback, hệ thống quay lại trạng thái health baseline.

# Risk Assessment
- Risk: rollback không đồng bộ nhiều service.
  - Mitigation: snapshot dependency map + rollback order rõ.
- Risk: operator bỏ qua stop condition do áp lực fix nhanh.
  - Mitigation: hard-enforced stop trong tool + cần manual override có lý do.
- Risk: handover thiếu bằng chứng.
  - Mitigation: checklist bắt buộc trước khi close iteration.

# Security Considerations
- Rollback không được expose secrets trong diff/log.
- Handover artifact phải phân quyền truy cập tối thiểu.
- Khi nghi ngờ lộ secret: rotate credential + stop campaign ngay.

# Next steps
- Hoàn tất plan sign-off, sau đó mới chuyển qua implementation agent.
- Unresolved questions:
  1. Có cần tích hợp runbook link vào dashboard nội bộ hay chỉ lưu file repo?
  2. Ai có quyền override hard stop trong môi trường UAT?
