# Context links
- Research A: `./research/researcher-01-mqtt-simulator-design-report.md`
- Research B: `./research/researcher-02-vps-automation-fixloop-report.md`
- README: `../../README.md`
- Codebase summary: `../../docs/codebase-summary.md`
- Code standards: `../../docs/code-standards.md`
- System architecture: `../../docs/system-architecture.md`
- PDR: `../../docs/project-overview-pdr.md`

# Overview
- Priority: P1
- Status: completed
- Mục tiêu: chốt baseline contract MQTT + guardrail SSH/VPS trước khi viết script automation.

# Key Insights
- MQTT là ingest canonical; không mở thêm đường ingest song song.
- `rawdata` QoS0, `status/events/firmware/commands` QoS1 theo README.
- Fault scope đã chốt nâng cao, nên cần contract check + evidence schema sớm.
- SSH automation phải bounded, allowlist, timeout, stop conditions để tránh thao tác phá hủy.

# Requirements
- Functional:
  - Chốt topic/payload contract và metadata bắt buộc (`schema_version`, `message_id`, `sent_at`, `seq_no`, `boot_id`).
  - Chốt policy `v1/{device_id}/status` mặc định **non-retain** trong UAT; retain chỉ bật khi test case explicit.
  <!-- Updated: Validation Session 1 - MQTT status non-retain default in UAT -->
  - Chốt danh sách lệnh SSH allowed cho verify/diagnose/fix-loop.
  - Chốt pass/fail baseline cho publish, ingest, health.
- Non-functional:
  - Replayable, audit-friendly, không lộ secret.
  - KISS: chỉ state machine tối thiểu cho loop.
  - DRY: một nguồn truth cho contract và thresholds.

# Architecture
- Baseline artifacts:
  - `mqtt-contract-baseline.json` (topics, qos, required fields, validators summary).
  - `vps-command-allowlist.md` (read-only + safe deploy actions).
  - `loop-safety-policy.md` (timeouts, retry budget, stop/rollback).
- Gating flow:
  1) Contract gate pass -> 2) Safety gate pass -> 3) mới cho phép phase simulator + loop.

# Related code files
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/*` (đối chiếu contract)
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/validators/*` (đối chiếu schema)
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/simulator/services/simulator.service.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/simulator.controller.ts`
- Create:
  - `resources/mock-data/scripts/mqtt-device-simulator-runner.ts`
  - `resources/mock-data/scripts/local-vps-fix-loop-agent.ts`
  - `resources/mock-data/simulator-specs/mqtt-contract-baseline.json`
  - `resources/mock-data/simulator-specs/vps-command-allowlist.md`
- Delete:
  - none

# Implementation Steps
1. Trích xuất contract thực tế từ README + bridge validator thành baseline artifact duy nhất.
2. Định nghĩa allowlist SSH command theo lớp: health, logs, docker status, targeted restart.
3. Định nghĩa stop conditions cứng: repeated same error, critical service down, timeout vượt budget.
4. Định nghĩa rollback checklist: config snapshot, compose state snapshot, revert path.
5. Review chéo với docs standards để tránh lệch kiến trúc hiện tại.

# Todo list
- [x] Chốt bảng topic/QoS/payload bắt buộc cho simulator.
- [x] Chốt mapping fault loại nào expected drop, loại nào expected ingest.
- [x] Chốt allowlist SSH command + forbidden list.
- [x] Chốt timeout/retry budget toàn loop và từng phase.
- [x] Chốt rollback checkpoints trước can thiệp.

# Success Criteria
- Có 1 baseline contract file, không mâu thuẫn README/bridge validator.
- Có allowlist + forbidden ops rõ, đủ để chạy verify/triage mà không destructive.
- Có safety policy định lượng:
  - command timeout <= 30s (mặc định), long log query <= 90s
  - max retry/phase <= 3
  - max loop duration <= 20 phút/run
- Peer review xác nhận không có blind spot về secret handling.

# Risk Assessment
- Risk: contract drift giữa README và code runtime.
  - Mitigation: ưu tiên runtime validator làm source of truth, README chỉ cross-check.
- Risk: allowlist quá hẹp gây khó triage.
  - Mitigation: thêm escalation gate yêu cầu xác nhận user trước lệnh ngoài allowlist.
- Risk: threshold đặt sai gây false fail.
  - Mitigation: tách baseline smoke threshold và stress threshold.

# Security Considerations
- Không hardcode token/password trong script/spec.
- Mọi log phải mask `auth_token`, secret env, connection strings.
- Không cho phép `rm`, `docker system prune`, reset git destructive trong loop.
- SSH key chỉ read từ secure env/agent store; không ghi ra artifacts.

# Next steps
- Chuyển sang Phase 02 khi baseline contract + safety policy được sign-off.
- Unresolved questions:
  1. Có cần cho phép `status` retained trong UAT baseline hay khóa non-retain toàn bộ?
  2. Danh sách command "safe restart" có cho phép restart bridge tự động không?
