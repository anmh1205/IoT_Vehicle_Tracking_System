# Context links
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/phase-02-audit-design-esp32-telemetry-sd-storage.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/research/researcher-01-external-benchmark-report.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/research/researcher-02-local-firmware-baseline-report.md`

# Overview
- Priority: P1
- Status: pending
- Mục tiêu: tạo backlog audit theo risk-first, chia wave thực thi rõ ràng.

# Key Insights
- Top risk tập trung ở telemetry reliability và SD persistence integrity.
- BLE OBD2 flow local có dấu hiệu fragile tại discovery/parse path, cần audit sớm.
- Security risks dễ bị bỏ qua vì benchmark chỉ cho pattern một phần.

# Requirements
- Backlog phải có: ID, hạng ưu tiên, risk score, owner role, effort, dependency, deliverable.
- Chia wave: Wave-0 (critical discovery), Wave-1 (deep audit), Wave-2 (hardening recommendations).
- Mỗi item phải liên kết control catalog phase 02.
- Hard gate: không vào Wave-1 nếu chưa xác định production firmware path và evidence availability cho telemetry + SD.
<!-- Updated: Validation Session 1 - hard gate before Wave-1 -->

# Architecture
- Backlog model:
  - `AUD-CRIT-*` cho P0.
  - `AUD-HIGH-*` cho P1.
  - `AUD-MED-*` cho P2.
- Execution lane:
  1. Telemetry lane.
  2. SD storage lane.
  3. BLE/OBD reliability lane.
  4. Security lane.

# Related code files
- Files to modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/plan.md`
- Files to create:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/reports/planner-260325-2357-risk-prioritized-firmware-audit-backlog.md`
- Files to delete:
  - none

# Implementation Steps
1. Import controls từ phase 02 vào backlog template.
2. Chấm điểm risk từng item, xếp P0/P1/P2 bằng threshold thống nhất.
3. Xác định dependency chain và lane owner.
4. Lập wave kế hoạch 2-3 tuần (không triển khai fix, chỉ audit execution).
5. Định nghĩa deliverable từng wave: finding log, evidence pack, executive summary.

# Todo list
- [ ] Hoàn thiện backlog >=20 items, trong đó telemetry+SD >=12 items.
- [ ] Đảm bảo mọi P0 có owner role và thời hạn.
- [ ] Chốt kế hoạch wave + entry/exit criteria.

# Success Criteria
- Backlog có thứ tự rõ, không conflict dependency.
- P0 items bao phủ: telemetry loss, SD corruption/replay, OTA authenticity gap.
- P0/P1 phải có item riêng kiểm chứng store-forward-delete: lưu full message+timestamp khi offline, replay khi online, delete-after-success (không xóa sớm).
- Item kiểm chứng bắt buộc: không xóa bản SD nếu chưa nhận MQTT PUBACK.
<!-- Updated: Validation Session 2 - PUBACK-gated deletion check -->
- Có thể kickoff audit ngay mà không cần tái định nghĩa task.

# Risk Assessment
- Risk cao: thiếu dữ liệu runtime thực tế -> P0 false positive/negative.
- Risk trung bình: owner role không rõ -> backlog không thực thi.
- Mitigation: thêm readiness gate phase 04 trước khi kickoff.

# Security Considerations
- Ưu tiên cao cho kiểm chứng OTA chain-of-trust.
- Kiểm chứng command/control authorization theo device scope.
- Kiểm chứng log/data at-rest exposure trên SD dump.

# Next steps
- Chuyển backlog sang phase 04 để đặt readiness gates và handover.
- Chuẩn bị lịch audit review với firmware lead + security reviewer.
- Unresolved questions:
  - Có artifact runtime nào sẵn để xác minh telemetry drop/retry?
  - SD-card format, wear-leveling, và corruption recovery đang theo chiến lược nào?
  - Có danh sách command nguy hiểm cần auth cứng không?