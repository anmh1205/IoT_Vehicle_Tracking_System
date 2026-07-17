---
title: "MQTT device simulator + VPS fix-loop automation"
description: "Plan triển khai simulator MQTT deterministic và vòng lặp local agent -> VPS SSH check -> diagnose/fix -> retest an toàn."
status: completed
priority: P1
effort: 26h
branch: feature/cicd
tags: [mqtt, simulator, vps-ssh, automation, observability, reliability]
created: 2026-04-10
---

# Implementation Overview

## Scope
- Xây script giả lập device publish MQTT theo contract canonical hiện tại.
- Xây quy trình local agent tự động: publish -> verify VPS qua SSH -> triage -> fix tối thiểu -> retest.
- Bao phủ fault nâng cao: jitter, duplicate, out-of-order, spike, reconnect, payload lỗi.
- Không mở rộng sang feature product ngoài simulator/ops loop.

## Phase roadmap
| Phase | File | Status | Progress |
|---|---|---|---|
| 01. Baseline contract + safety guardrail | [phase-01-baseline-contract-and-safety-guardrails.md](./phase-01-baseline-contract-and-safety-guardrails.md) | completed | 100% |
| 02. Simulator deterministic + fault scenarios | [phase-02-mqtt-simulator-deterministic-fault-scenarios.md](./phase-02-mqtt-simulator-deterministic-fault-scenarios.md) | completed | 100% |
| 03. Local agent orchestration + VPS SSH fix-loop | [phase-03-local-agent-vps-ssh-fix-loop-orchestration.md](./phase-03-local-agent-vps-ssh-fix-loop-orchestration.md) | completed | 100% |
| 04. Test matrix + telemetry checkpoints + pass/fail | [phase-04-test-matrix-telemetry-checkpoints-and-gates.md](./phase-04-test-matrix-telemetry-checkpoints-and-gates.md) | completed | 100% |
| 05. Rollback, stop conditions, rollout runbook | [phase-05-rollback-stop-conditions-and-rollout-runbook.md](./phase-05-rollback-stop-conditions-and-rollout-runbook.md) | completed | 100% |

## Dependencies
1. MQTT contract hiện có trong README + MqttBridge validator.
2. VPS SSH access và allowlist lệnh chẩn đoán đã thống nhất.
3. UAT env secrets sẵn có (không hardcode, không lưu trong repo).
4. Health endpoints + observability stack (Backend, EMQX, Victoria, Grafana) hoạt động.

## Deliverables
- Plan chi tiết theo phase (5 file).
- Synthesis report hợp nhất 2 research report + docs constraints.
- Bộ tiêu chí đo được: delivery ratio, latency budget, error-rate budget, replay consistency.
- Guardrail ops: allowlist, timeout, bounded retries, rollback, stop conditions.

## Acceptance gates (plan-level)
- Có test matrix rõ theo từng fault mode và từng topic.
- Có checkpoint telemetry trước/sau fix.
- Có fix-loop strategy dạng state machine, không loop vô hạn.
- Có rollback path và điều kiện dừng bắt buộc.
- Tuân thủ YAGNI/KISS/DRY, không sinh kiến trúc mới dư thừa.

## Unresolved questions
1. Ngưỡng delivery ratio/latency/error-rate chính thức cho UAT là bao nhiêu?
2. `status` topic có retain trong UAT hay giữ non-retained tuyệt đối?
3. Loop automation chạy local-only hay cần hook thêm GitHub Actions về sau?

## Validation Log

### Session 1 — 2026-04-10
**Trigger:** Initial plan creation validation trước khi implement.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Trong môi trường UAT, topic `v1/{device_id}/status` nên dùng retain theo hướng nào?
   - Options: Non-retain (Recommended) | Retain last status | Config theo scenario
   - **Answer:** Non-retain (Recommended)
   - **Rationale:** Giữ ingest behavior realtime sạch trạng thái, tránh retained message cũ làm sai kết quả diagnose/fix-loop.

2. **[Tradeoffs]** Bạn muốn profile ngưỡng pass/fail cho vòng loop UAT theo hướng nào?
   - Options: 2 tầng warn/fail (Recommended) | 1 tầng fail cứng | Tùy theo campaign
   - **Answer:** 1 tầng fail cứng
   - **Rationale:** Quy tắc quyết định đơn giản hơn, giảm ambiguity khi automation cần stop/retest nhanh.

3. **[Scope]** Trong fix-loop tự động, có cho phép agent tự restart 1 service mục tiêu (bridge/backend) không?
   - Options: Cho phép restart mục tiêu (Recommended) | Không cho phép restart tự động | Chỉ restart bridge
   - **Answer:** Cho phép restart mục tiêu (Recommended)
   - **Rationale:** Cho phép remediation tối thiểu có hiệu lực mà vẫn giới hạn blast radius trong allowlist.

4. **[Risk]** Ai được quyền override hard-stop trong UAT khi automation bị chặn?
   - Options: Platform lead only (Recommended) | On-call SRE + Platform lead | Bất kỳ maintainer
   - **Answer:** Platform lead only (Recommended)
   - **Rationale:** Giảm rủi ro vận hành, giữ một đầu mối chịu trách nhiệm khi can thiệp ngoài policy.

#### Confirmed Decisions
- MQTT status retain policy: Non-retain mặc định trong UAT — giữ luồng ingest realtime rõ ràng.
- Pass/fail policy: Một tầng fail cứng — tối ưu tính quyết đoán của loop.
- Auto-fix scope: Cho phép restart đúng 1 service mục tiêu trong allowlist.
- Hard-stop override authority: Chỉ Platform lead.

#### Action Items
- [x] Cập nhật Phase 01 để chốt non-retain mặc định cho status topic.
- [x] Cập nhật Phase 03 để chốt targeted restart policy + giới hạn allowlist.
- [x] Cập nhật Phase 04 để chuyển gate từ 2 tầng sang 1 tầng fail cứng.
- [x] Cập nhật Phase 05 để chốt quyền override hard-stop thuộc Platform lead only.

#### Impact on Phases
- Phase 01: Cập nhật Requirements/Architecture để khóa `status` non-retain mặc định; retain chỉ khi test case explicit.
- Phase 03: Cập nhật Architecture/Security Considerations cho phép auto restart đúng 1 service mục tiêu trong allowlist.
- Phase 04: Cập nhật gate logic trong Requirements/Implementation Steps thành một tầng fail cứng.
- Phase 05: Cập nhật stop/override policy, chỉ Platform lead được quyền override hard-stop.
