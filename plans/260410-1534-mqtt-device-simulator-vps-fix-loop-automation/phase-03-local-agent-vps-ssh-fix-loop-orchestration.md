# Context links
- Plan overview: `./plan.md`
- Research B: `./research/researcher-02-vps-automation-fixloop-report.md`
- README troubleshooting/observability: `../../README.md`
- Code standards (MQTT/reliability): `../../docs/code-standards.md`

# Overview
- Priority: P1
- Status: completed
- Mục tiêu: thiết kế vòng local agent orchestration publish -> VPS check -> diagnose/fix -> retest với guardrail chặt.

# Key Insights
- Loop phải stateful, bounded, auditable; không để SSH agent tự do.
- Verify chain phải theo thứ tự health -> logs -> deeper evidence để tránh chẩn đoán sai.
- Fix strategy nên one-surface-change mỗi iteration để giữ root cause clarity.

# Requirements
- Functional:
  - Orchestrate phases: trigger, verify, collect, classify, patch, retest, exit.
  - Hỗ trợ command allowlist + phase timeout + retry budget.
  - Tạo report bundle cho mỗi loop iteration.
- Non-functional:
  - Tối đa hóa an toàn VPS (không destructive ops tự động).
  - Replay/trace được bằng run_id.
  - Dễ operator override thủ công khi blocked.

# Architecture
- State machine:
  - `INIT -> PUBLISH -> VERIFY_VPS -> CLASSIFY -> FIX_MINIMAL -> RETEST -> DECIDE_EXIT`
  - Terminal states: `PASS`, `FAIL_STOP_CONDITION`, `BLOCKED_HUMAN_APPROVAL`.
  - Trong `FIX_MINIMAL`, cho phép auto restart đúng **1 service mục tiêu** (bridge/backend) nếu nằm trong allowlist; cấm restart diện rộng.
  <!-- Updated: Validation Session 1 - Allow targeted single-service auto restart -->
- Verify ladder (fixed order):
  1) service health endpoints/container states
  2) MQTT broker connectivity/subscription evidence
  3) ingest/log evidence
  4) DB/metrics consistency snapshot
- Classifier taxonomy:
  - network | auth | acl/topic | bridge-parse | backend-runtime | db-persistence | consistency/replay

# Related code files
- Modify:
  - `.claude/skills/vps-control/*` (nếu cần mapping command template)
  - `resources/mock-data/scripts/backend-simulator-service.ts` (nếu tái dùng orchestration utility)
- Create:
  - `resources/mock-data/scripts/local-vps-fix-loop-agent.ts`
  - `resources/mock-data/simulator-specs/vps-checkpoints-policy.json`
  - `resources/mock-data/simulator-specs/fix-loop-stop-conditions.json`
- Delete:
  - none

# Implementation Steps
1. Định nghĩa state machine và transition conditions tối thiểu.
2. Định nghĩa command allowlist theo namespace (docker, curl-health, logs-tail, metrics-query).
3. Thiết kế evidence collector chuẩn hóa output (json + text excerpt).
4. Thiết kế classifier rule-based v1 (YAGNI, không ML scoring).
5. Thiết kế minimal patch executor với human gate cho actions nhạy cảm.
6. Thiết kế retest logic dùng lại scenario/input trước đó.
7. Thiết kế decision engine: pass/fail/retry/escalate.

# Todo list
- [x] Chốt state machine + transition table.
- [x] Chốt allowlist command và denylist cứng.
- [x] Chốt taxonomy classifier + mapping evidence tối thiểu.
- [x] Chốt human-approval points và escalation flow.
- [x] Chốt loop artifact bundle format theo run_id/iteration.

# Success Criteria
- Mỗi iteration có đầy đủ artifact: input snapshot, command transcript, health snapshot, logs excerpt, classifier output, action summary, retest result.
- 100% command thực thi nằm trong allowlist; ngoài allowlist phải blocked + yêu cầu approval.
- Loop dừng đúng khi hit stop condition (không infinite loop).
- Sau fix thành công: health all-green + ingest evidence hợp lệ + không tăng lỗi regressions trọng yếu.

# Risk Assessment
- Risk: classifier rule quá cứng, bỏ sót root cause.
  - Mitigation: fallback `unknown` + escalate human.
- Risk: patch tự động gây side-effect lớn.
  - Mitigation: one-surface change + mandatory snapshot trước fix.
- Risk: log/metrics chưa sẵn sàng gây false fail.
  - Mitigation: readiness grace window có giới hạn.

# Security Considerations
- SSH dùng least-privilege account.
- Cấm thao tác phá hủy dữ liệu/hạ tầng bởi default policy.
- Redact secrets trong transcript/artifacts.
- Bật audit trail immutable cho command execution history (append-only log).

# Next steps
- Chuyển phase 04 để formalize test matrix/checkpoints và ngưỡng pass-fail định lượng.
- Unresolved questions:
  1. Minimal patch scope có cho phép restart 1 service container tự động không?
  2. Có cần gate approval cho mọi lệnh write-config hay chỉ cho nhóm high-impact?
