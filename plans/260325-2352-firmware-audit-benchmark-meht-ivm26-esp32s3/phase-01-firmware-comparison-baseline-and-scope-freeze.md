# Context links
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/research/researcher-01-external-benchmark-report.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/research/researcher-02-local-firmware-baseline-report.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/README.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md`

# Overview
- Priority: P1
- Status: pending
- Mục tiêu: chốt baseline so sánh local firmware vs benchmark, đóng băng scope audit để tránh trượt phạm vi.

# Key Insights
- Benchmark là industrial vibration monitor, không phải vehicle tracker/O​​BD2-first.
- Local baseline mạnh ở BLE OBD2 wrapper + queue/mutex/semaphore nhưng thiếu bằng chứng rõ cho SD/modem/GNSS trong tập đã đọc.
- Nếu không tách “benchmark reusable pattern” vs “domain-specific mismatch”, audit sẽ nhiễu.

# Requirements
- Tạo ma trận so sánh theo tiêu chí: architecture, telemetry, storage SD, reliability, security, observability.
- Đánh dấu mỗi gap theo loại: `missing`, `partial`, `unknown`, `not-applicable`.
- Freeze scope vòng 1: ESP32 runtime path, telemetry pipeline, SD-card persistence, OTA/control surface.
- Định nghĩa nguồn evidence bắt buộc cho từng tiêu chí.
- Benchmark policy: chỉ tham khảo pattern/định lượng maturity, không dùng làm chuẩn chức năng OBD2 feature parity.
<!-- Updated: Validation Session 1 - benchmark reference-only policy -->

# Architecture
- So sánh theo 3 lớp:
  1. Runtime/control plane (FSM/task model, reconnect/reset).
  2. Data plane (telemetry schema/QoS/retry/buffer/flush).
  3. Trust plane (OTA authenticity, config exposure, storage integrity).
- Mapping matrix dùng chuẩn cột cố định để reuse cho phase sau.

# Related code files
- Files to modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/plan.md`
- Files to create:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/reports/planner-260325-2357-firmware-comparison-matrix-and-scope-freeze.md`
- Files to delete:
  - none

# Implementation Steps
1. Chuẩn hóa bộ tiêu chí matrix (12-16 criteria, ưu tiên telemetry + SD).
2. Trích evidence local/benchmark vào từng criterion, không suy đoán ngoài nguồn.
3. Chấm maturity sơ bộ (0-3) + confidence (`high/medium/low`).
4. Tách rõ mục `not-applicable` do khác domain để giảm false gap.
5. Khóa scope audit vòng 1 + list out-of-scope bằng văn bản.

# Todo list
- [ ] Hoàn thành comparison matrix local vs benchmark.
- [ ] Đánh dấu unknown areas cần truy vết thêm từ repo local production firmware.
- [ ] Chốt scope freeze có sign-off tiêu chí audit vòng 1.

# Success Criteria
- Matrix có đầy đủ evidence pointer cho từng hàng.
- Có ít nhất 1 trang scope freeze ngắn, rõ in/out.
- Không còn ambiguity về “benchmark dùng để học pattern gì, không dùng cho gì”.

# Risk Assessment
- Risk cao: dùng benchmark khác domain làm chuẩn chức năng => quyết định sai.
- Risk trung bình: local firmware production path chưa rõ => nhiều mục `unknown`.
- Mitigation: bắt buộc confidence score + `unknown` quarantine list.

# Security Considerations
- Không coi TLS-only là bằng chứng OTA authenticity đầy đủ.
- Kiểm tra bề mặt config (AP/captive portal/remote command) tách khỏi transport security.
- Đánh dấu requirement về checksum/signature cho storage replay nếu có.

# Next steps
- Đầu ra phase này là đầu vào bắt buộc cho phase 02.
- Sau khi freeze scope, thiết kế audit framework + bằng chứng pass/fail.
- Unresolved questions:
  - Local production firmware path chính xác ở đâu ngoài thư mục example?
  - Có module SD-card thực tế hay chưa?
  - Contract telemetry versioning hiện tồn tại ở đâu?