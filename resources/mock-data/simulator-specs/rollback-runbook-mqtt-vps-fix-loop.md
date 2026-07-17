# Rollback Runbook — MQTT Simulator + VPS Fix Loop

## 1. Pre-rollback Snapshot
1. Ghi nhận `run_id`, iteration hiện tại, classifier lỗi.
2. Snapshot trạng thái container: `docker ps --format '{{.Names}}|{{.Status}}'`.
3. Snapshot tail logs `tracking-backend` / `tracking-mqtt-bridge` (120 lines).
4. Lưu artifacts trace hiện tại trước khi can thiệp.

## 2. Rollback Levels

### L1 — Config Revert
- Revert env/config thay đổi trong iteration gần nhất.
- Restart đúng 1 service bị tác động nếu cần.
- Re-run checkpoint sequence.

### L2 — Targeted Service Rollback
- Rollback image/tag hoặc compose override của `tracking-mqtt-bridge` hoặc `tracking-backend`.
- Không rollback nhiều service cùng lúc trong cùng iteration.
- Re-run baseline smoke scenario.

### L3 — Manual Handover
- Stop automation.
- Chuyển giao đầy đủ evidence cho Platform lead/on-call.
- Không thực hiện thêm auto-fix sau khi vào L3.

## 3. Hard-stop Conditions
- Cùng classifier lặp lại >= 3 iterations.
- Critical health endpoint down > 5 phút.
- Error rate > 2x baseline.
- Runtime > 20 phút/run.
- Phát hiện dấu hiệu lộ secret trong logs/artifacts.

## 4. Close Criteria
- `/health` và `/ws-health` đều OK.
- Checkpoint đạt gate UAT.
- Không có lỗi mới xuất hiện sau retest.
- Artifacts đầy đủ: decision + trace + checkpoint summary.
