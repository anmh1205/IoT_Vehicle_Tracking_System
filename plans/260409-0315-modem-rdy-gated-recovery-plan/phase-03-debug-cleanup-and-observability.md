# Phase 03 — Debug cleanup and observability hygiene

## 1) Context links
- Phase dependency: `./phase-01-rdy-event-and-startup-gate.md`, `./phase-02-recovery-backoff-and-storm-protection.md`
- Code standards: `../../docs/code-standards.md`

## 2) Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-09
- Description: Dọn nhánh debug fallback thừa, giữ log đủ chẩn đoán theo flow mới.
- Priority: P2
- Implementation status: pending
- Review status: not started

## 3) Key Insights
- `modem_lte.c` đang có nhiều log/probe debug làm nhiễu đọc sequence.
- Cần log nhất quán theo state transition + gate decision, không spam.

## 4) Requirements
- Functional:
  - Loại bỏ hoặc hạ cấp debug path không còn dùng sau RDY-gated recovery.
  - Giữ log vận hành tối thiểu bắt buộc: state enter/exit, RDY seen, recover reason, backoff delay.
- Non-functional:
  - KISS: log concise, không duplicate.
  - DRY: dùng helper log chung cho reason/counter/timing.
<!-- Updated: Validation Session 1 - minimal operational logs confirmed -->

## 5) Architecture
- Chuẩn hóa schema log 1 dòng/event:
  - `state`, `reason`, `rdy_seen`, `recover_attempt`, `next_delay_ms`.
- Tách debug sâu (hex preview raw) thành conditional compile hoặc rate-limit.

## 6) Related code files
- Modify: `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- Optional modify: `iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
- Optional modify: `iot-vehicle-tracking-system-firmware/main/inc/modem_at.h`
- Create: none
- Delete: none

## 7) Implementation Steps
1. Inventory log line theo path startup/recover hiện tại.
2. Xóa/giảm log dư không hỗ trợ quyết định vận hành.
3. Chuẩn hóa log prefix/tag cho gate + recovery.
4. Giữ các counter cần verify acceptance, bỏ counter không dùng.

## 8) Todo list
- [ ] Define minimal log contract for modem FSM
- [ ] Remove obsolete fallback debug branches
- [ ] Add rate-limit for noisy diagnostics
- [ ] Recheck readability on monitor stream

## 9) Success Criteria
- Monitor log đọc được trình tự chuẩn mà không nhiễu.
- Kỹ sư vận hành có thể xác định nhanh: gate block, recover, backoff.

## 10) Risk Assessment
- Risk: xóa quá tay làm mất dữ liệu chẩn đoán.
- Mitigation: giữ diagnostics cốt lõi + bật debug có điều kiện khi cần.

## 11) Security Considerations
- Không log IMSI/ICCID hoặc dữ liệu nhạy cảm SIM nếu không cần.

## 12) Next steps
- Bàn giao Phase 04 để compile + verify sequence + pass/fail.
