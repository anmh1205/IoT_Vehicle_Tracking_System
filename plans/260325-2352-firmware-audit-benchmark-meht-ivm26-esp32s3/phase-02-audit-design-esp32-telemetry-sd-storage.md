# Context links
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/phase-01-firmware-comparison-baseline-and-scope-freeze.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/research/researcher-01-external-benchmark-report.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/research/researcher-02-local-firmware-baseline-report.md`

# Overview
- Priority: P1
- Status: pending
- Mục tiêu: thiết kế khung audit firmware thực thi được, ưu tiên ESP32 telemetry + SD-card storage.

# Key Insights
- Local BLE path có primitive đồng bộ, phù hợp để audit race/deadlock/timeouts.
- Benchmark có FSM/offline-flush patterns hữu ích cho resilience, dù khác domain.
- Gốc rủi ro nằm ở “unknown contracts”: telemetry schema, retry budget, storage integrity semantics.

# Requirements
- Thiết kế checklist audit theo 4 miền: runtime, telemetry, storage, security.
- Mỗi control phải có: objective, evidence source, test method, pass/fail rule.
- Ưu tiên controls cho QoS policy, buffering/flush, corruption handling SD.
- Bổ sung control bắt buộc cho store-forward-delete: mất mạng lưu full payload + current timestamp vào SD; có mạng replay; chỉ xóa sau khi gửi thành công theo tiêu chí audit định nghĩa.
- Trong vòng audit đầu, định nghĩa “gửi thành công” = nhận MQTT PUBACK trước khi delete bản SD.
- Scope guarantee của vòng audit đầu là broker-level delivery; chưa bắt buộc end-to-end ingest ACK.
<!-- Updated: Validation Session 2 - success criterion set to MQTT PUBACK -->
<!-- Updated: Validation Session 3 - broker-level guarantee accepted -->
- Có rubric chấm risk: Impact(1-5) x Likelihood(1-5) x Detectability(1-3 inverse).
- Pass/fail cho telemetry + SD bắt buộc có combined evidence: static trace + runtime artifacts.
<!-- Updated: Validation Session 1 - combined runtime+static evidence requirement -->

# Architecture
- Audit architecture 3 tầng:
  1. **Control catalog**: danh mục kiểm soát + điều kiện đạt.
  2. **Evidence pipeline**: static code read + config trace + runtime log artifact.
  3. **Scoring engine**: risk score + confidence + remediation class.
- Artifact chuẩn:
  - `control-id`, `owner-role`, `evidence-link`, `status`, `risk-score`, `note`.

# Related code files
- Files to modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/plan.md`
- Files to create:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260325-2352-firmware-audit-benchmark-meht-ivm26-esp32s3/reports/planner-260325-2357-audit-control-catalog-esp32-telemetry-sd.md`
- Files to delete:
  - none

# Implementation Steps
1. Xây control catalog bản đầu (~25 controls; telemetry+SD chiếm >=60%).
2. Gán phương pháp kiểm chứng: static inspection, behavior trace, fault injection nhẹ.
3. Thiết kế evidence schema dùng chung cho mọi control.
4. Thiết kế scoring quy đổi thành mức ưu tiên P0/P1/P2.
5. Review chéo matrix phase 01 để tránh control trùng/không cần (YAGNI).

# Todo list
- [ ] Hoàn thiện control catalog + pass/fail rules.
- [ ] Chốt risk scoring model và threshold P0/P1/P2.
- [ ] Chuẩn hóa template evidence record.

# Success Criteria
- Mỗi control có testable pass/fail, không mô tả mơ hồ.
- Có mapping 1-1 giữa high-risk gaps và control tương ứng.
- Catalog đủ chi tiết để người mới có thể chạy audit theo checklist.

# Risk Assessment
- Risk cao: checklist quá rộng, không khả thi trong sprint audit đầu.
- Risk trung bình: thiếu runtime artifacts => score lệch.
- Mitigation: giới hạn control theo risk-first và confidence gate.

# Security Considerations
- Control riêng cho OTA authenticity (không chỉ HTTPS transport).
- Control riêng cho config/control surface authn/authz.
- Control integrity cho SD data trước khi flush/uplink.

# Next steps
- Dùng control catalog để tạo execution backlog ở phase 03.
- Chuẩn hóa owner role theo nhóm: firmware, QA embedded, security reviewer.
- Unresolved questions:
  - Có watchdog/reset policy tài liệu hóa chưa?
  - Có key management/secure element cho OTA verify không?
  - Có định danh schema version trong payload telemetry không?