# Phase 04 — Verification and acceptance

## 1) Context links
- All phase deps: `./phase-01-rdy-event-and-startup-gate.md`, `./phase-02-recovery-backoff-and-storm-protection.md`, `./phase-03-debug-cleanup-and-observability.md`
- Existing logs: `iot-vehicle-tracking-system-firmware/documents/test-logs/`

## 2) Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-09
- Description: Xác minh compile + runtime monitor sequence + tiêu chí pass/fail rõ ràng.
- Priority: P1
- Implementation status: pending
- Review status: not started

## 3) Key Insights
- Bug này chỉ đóng khi monitor sequence đúng và không còn reset storm.
- `+CME ERROR: SIM not inserted` có thể xảy ra hợp lệ ở CPIN stage; cần tiêu chí rõ để không false-fail.

## 4) Requirements
- Functional:
  - Verify flow chuẩn sau power/recover luôn có `wait RDY` trước AT.
  - Verify `RDY` gate được mở từ UART token của modem.
  - Verify CPIN `+CME ERROR: SIM not inserted` đi theo soft-retry bounded trước khi recover.
  - Verify recover quay lại flow chuẩn thay vì reset liên hoàn.
- Non-functional:
  - Checklist reproducible, ngắn, không phụ thuộc workaround thủ công.
<!-- Updated: Validation Session 1 - added UART RDY and CPIN soft-retry acceptance -->

## 5) Architecture
- Verification split 2 lớp:
  - Build gate: compile sạch firmware.
  - Runtime gate: log/monitor sequence assertions.
- Kết quả lưu vào test-logs hiện có, không tạo nhánh lưu trữ mới.

## 6) Related code files
- Modify expected during implement: none (phase này là verify plan)
- Verify focus files: `main/src/modem_lte.c`, `main/src/modem_at.c`, `main/inc/modem_at.h`, `main/inc/modem_lte.h` (if touched)
- Create: none
- Delete: none

## 7) Implementation Steps
1. Compile firmware với config mục tiêu (ESP32-S3 + SIM7600 path).
2. Chạy board test cold boot + repeated boot/recover scenario.
3. Thu monitor log và đối chiếu sequence.
4. Đánh giá pass/fail theo checklist bên dưới.
5. Nếu fail, map về phase tương ứng (gate/recovery/log cleanup) để fix.

## 8) Todo list
- [ ] Compile success, không lỗi syntax/link
- [ ] Capture monitor log cho ít nhất 3 chu kỳ thử nghiệm
- [ ] Validate sequence assertions
- [ ] Record pass/fail + root-cause note khi fail

## 9) Success Criteria
- Compile: PASS khi build hoàn tất không lỗi.
- Expected monitor sequence (PASS):
  1. `POWER_ON`/`WAIT_BOOT`
  2. `WAIT_RDY` (hoặc equivalent gate state)
  3. RDY seen/token accepted
  4. `AT` -> `OK`
  5. `ATE0` -> `OK`
  6. `CPIN` check (kể cả case chưa ready/SIM absent vẫn ở đúng stage logic)
- Recovery PASS criteria:
  - Nếu recover xảy ra: re-enter flow chuẩn và chờ RDY trước AT.
  - CPIN path phải thể hiện soft-retry bounded trước khi escalate recover.
  - Không có reset/pwrkey loop dày đặc (reset storm).
<!-- Updated: Validation Session 1 - CPIN retry-before-recover pass criterion -->
- FAIL criteria:
  - Bất kỳ `AT` gửi trước RDY gate mở.
  - >N recover hardware liên tiếp trong cửa sổ ngắn (định nghĩa khi implement constants).

## 10) Risk Assessment
- Risk: test coverage chưa chạm đúng race timing.
- Mitigation: chạy nhiều lần cold/warm boot, có timestamp log.

## 11) Security Considerations
- Giữ log test nội bộ, không đẩy thông tin nhận dạng SIM/network nhạy cảm.

## 12) Next steps
- Sau khi pass: cập nhật changelog/roadmap theo quy trình project-manager.
