# Context links
- Plan overview: `./plan.md`
- Research A/B: `./research/*`
- README quality/observability: `../../README.md`
- Code standards: `../../docs/code-standards.md`

# Overview
- Priority: P1
- Status: completed
- Mục tiêu: định nghĩa test matrix và checkpoint telemetry đo được cho toàn bộ loop.

# Key Insights
- Pass/fail phải định lượng, tránh đánh giá cảm tính.
- Fault scope nâng cao cần matrix theo fault x topic x expected behavior.
- Checkpoint cần cả pre-fix và post-fix để chứng minh patch có hiệu quả, không regress.

# Requirements
- Functional:
  - Test matrix bao phủ baseline + 6 fault classes.
  - Metrics/checkpoint cho publish, ingest, runtime health, persistence.
  - Gate rõ cho pass/retry/fail/escalate.
  - Gate UAT dùng **1 tầng fail cứng** (không dùng warning tier) để quyết định stop/retest.
  <!-- Updated: Validation Session 1 - Single hard-fail gate policy -->
- Non-functional:
  - Test run ngắn cho smoke, dài hơn cho stress vừa phải.
  - Dữ liệu kết quả dễ đối chiếu giữa các run_id.

# Architecture
- Matrix dimensions:
  - Topic: rawdata, status, events, firmware.
  - Fault: none, jitter, duplicate, out-of-order, spike, reconnect, invalid payload.
  - Env mode: local stack, VPS UAT.
- Core checkpoints:
  1) broker accept rate
  2) bridge parse/drop counters
  3) backend health/ws-health
  4) DB write count delta
  5) latency p50/p95 publish->ingest
  6) error-rate by class
  7) replay consistency hash

# Related code files
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/metrics/*` (chỉ khi cần bổ sung metric tag nhẹ)
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/*` (chỉ khi cần counter rõ hơn)
- Create:
  - `resources/mock-data/simulator-specs/test-matrix-mqtt-vps-fix-loop.md`
  - `resources/mock-data/simulator-specs/checkpoint-thresholds-uat.json`
  - `resources/mock-data/simulator-specs/retest-gate-rules.json`
- Delete:
  - none

# Implementation Steps
1. Lập bảng test cases tối thiểu (smoke) và mở rộng (stress).
2. Định nghĩa expected behavior từng fault class.
3. Định nghĩa ngưỡng pass/fail theo metric quan trọng.
4. Định nghĩa gate logic:
   - pass ngay
   - retry có điều kiện
   - fail + fix-loop
   - escalate human
5. Định nghĩa output report format để so sánh run trước/sau fix.

# Todo list
- [x] Chốt matrix smoke (<=15 phút) và stress (<=60 phút).
- [x] Chốt ngưỡng delivery ratio/latency/error-rate cho UAT.
- [x] Chốt expected drop rules cho invalid payload cases.
- [x] Chốt replay consistency check (hash + sequence).
- [x] Chốt gate rule pass/retry/fail/escalate.

# Success Criteria
- Matrix cover đủ: 4 topics x 7 fault modes (ít nhất 1 test/cell quan trọng).
- Có baseline control run để so sánh fault runs.
- Gate rules cho kết luận nhất quán giữa 2 người vận hành độc lập.
- Mọi fail phải map được vào classifier taxonomy phase 03.

# Risk Assessment
- Risk: ngưỡng quá chặt gây fail giả.
  - Mitigation: dùng 2 mức threshold (warning vs fail).
- Risk: thiếu metric tại bridge/backend.
  - Mitigation: bổ sung counter tối thiểu, tránh thêm metric cardinality cao.
- Risk: stress test làm ảnh hưởng môi trường UAT dùng chung.
  - Mitigation: giới hạn load window, off-peak slot, stop switch.

# Security Considerations
- Không đưa payload chứa secret vào dashboard/report công khai.
- Tách telemetry test data khỏi device production data bằng device_id namespace riêng.
- Giới hạn quyền truy cập metric/log endpoints cho runner account.

# Next steps
- Chuyển phase 05 để đóng gói rollback + stop conditions + rollout runbook.
- Unresolved questions:
  1. KPI latency chính thức là theo p95 hay p99 cho quyết định fail?
  2. UAT có chấp nhận stress run 60 phút trong giờ làm việc không?
