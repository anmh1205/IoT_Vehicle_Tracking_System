# Planner Synthesis Report

## Context
- Work context: `e:/anmh1205/IoT_Vehicle_Tracking_System`
- Plan dir: `e:/anmh1205/IoT_Vehicle_Tracking_System/plans/260410-1534-mqtt-device-simulator-vps-fix-loop-automation`
- Inputs tổng hợp:
  - Research A (MQTT simulator design)
  - Research B (VPS SSH fix-loop automation)
  - README + docs constraints (codebase-summary, code-standards, system-architecture, project-overview-pdr)

## Synthesis ngắn
1. MQTT là canonical ingest. Simulator phải bám contract bridge/runtime hiện tại, không bám API envelope backend.
2. Thiết kế đúng hướng là deterministic event runner (seed + replay), không random mù.
3. Fault scope nâng cao đã rõ: jitter, duplicate, out-of-order, spike, reconnect, invalid payload.
4. Local agent loop phải stateful + bounded + auditable: publish -> verify VPS -> classify -> minimal fix -> retest -> exit.
5. Guardrail VPS là bắt buộc: command allowlist, deny destructive ops, timeout cứng, bounded retries, stop conditions, rollback ladder.
6. Pass/fail phải đo được qua checkpoint telemetry, không kết luận cảm tính.

## Quyết định thiết kế (YAGNI/KISS/DRY)
- Rule-based classifier v1 (không ML).
- One-surface change mỗi fix iteration để giữ root cause clarity.
- 1 nguồn truth cho contract/threshold/policy (artifact specs), tránh trùng lặp.
- Không mở thêm pipeline ingest/runtime mới.

## Plan output đã tạo
- `plan.md` (overview + phase map + dependencies + acceptance gates)
- `phase-01-baseline-contract-and-safety-guardrails.md`
- `phase-02-mqtt-simulator-deterministic-fault-scenarios.md`
- `phase-03-local-agent-vps-ssh-fix-loop-orchestration.md`
- `phase-04-test-matrix-telemetry-checkpoints-and-gates.md`
- `phase-05-rollback-stop-conditions-and-rollout-runbook.md`

## Test + telemetry checkpoints (chốt ở mức plan)
- Delivery ratio theo topic
- Latency publish->ingest (p50/p95)
- Error-rate by class (parse/auth/db/runtime)
- Replay consistency (hash + sequence)
- Service readiness chain (EMQX -> Bridge -> Backend -> DB -> observability)

## Fix-loop strategy (chốt ở mức plan)
- State machine có terminal states rõ: PASS / FAIL_STOP_CONDITION / BLOCKED_HUMAN_APPROVAL.
- Iteration artifact bắt buộc: input snapshot, commands transcript, health/log/metrics evidence, classifier output, action summary, retest result.
- Dừng ngay khi vi phạm stop condition cứng.

## Rollback + stop conditions (chốt ở mức plan)
- Rollback ladder L1/L2/L3 theo impact tăng dần.
- Hard stop khi lặp cùng lỗi >=3, critical health down kéo dài, error rate tăng mạnh, quá runtime budget, hoặc nghi ngờ lộ secret.

## Kết luận
Plan đủ để triển khai an toàn simulator MQTT + local-to-VPS fix-loop automation theo scope đã chốt, không over-engineering, có tiêu chí đo được, có guardrail rõ.

## Unresolved questions
1. Ngưỡng chính thức UAT cho delivery ratio / latency / error-rate là bao nhiêu?
2. `status` topic trong UAT có retain hay non-retain mặc định?
3. Quyền override hard stop thuộc vai trò nào?
4. Phase đầu có cần multi-device hay chốt 1-device deterministic trước?
