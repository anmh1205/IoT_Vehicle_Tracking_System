# Phase 01 — RDY event/token startup gate

## 1) Context links
- Research: `./research/researcher-01-root-cause-and-rdy-gating.md`
- Research: `./research/researcher-02-fsm-recovery-and-backoff.md`
- Docs: `../../docs/codebase-summary.md`, `../../docs/system-architecture.md`

## 2) Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-09
- Description: Chuyển startup từ timeout-driven sang RDY-gated trước AT sync.
- Priority: P1
- Implementation status: pending
- Review status: not started

## 3) Key Insights
- Root cause: AT timeout xảy ra trước khi modem thật sự ready.
- Log/LA cho thấy có RDY + AT/ATE0 OK ở một số lần; fallback hiện tại vào reset quá sớm.
- Cần gate bằng RDY event/token (event-driven hoặc parser token), không chỉ dựa timeout.

## 4) Requirements
- Functional:
  - Sau power on/reset: vào `WAIT_RDY` rõ ràng.
  - Chỉ cho `AT_SYNC` khi `rdy_seen == true` từ **UART RDY token canonical**.
  - Chuỗi chuẩn: `POWER_ON -> WAIT_RDY -> AT_SYNC -> ATE0 -> CPIN`.
- Non-functional:
  - Giữ FSM hiện có, thay đổi tối thiểu.
  - Log rõ state/gate reason.
<!-- Updated: Validation Session 1 - canonical RDY source switched to UART token -->

## 5) Architecture
- Thêm gate layer nhỏ giữa `WAIT_BOOT` và `AT_SYNC` trong `modem_lte.c`.
- Nguồn RDY canonical: parser token (`RDY` line) từ UART qua `modem_at` URC dispatch.
- RDY token có TTL ngắn để tránh stale event.
<!-- Updated: Validation Session 1 - removed pin-first strategy -->

## 6) Related code files
- Modify: `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- Modify: `iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
- Modify: `iot-vehicle-tracking-system-firmware/main/inc/modem_at.h`
- Optional modify: `iot-vehicle-tracking-system-firmware/main/inc/modem_lte.h`
- Create: none
- Delete: none

## 7) Implementation Steps
1. Xác định điểm inject gate ngay sau `POWER_RAIL_SETTLE`.
2. Bổ sung state/flag RDY tối thiểu (`rdy_seen`, `rdy_wait_deadline_ms`, token timestamp).
3. Wire nguồn RDY event (pin hoặc URC token callback).
4. Chặn `AT_SYNC` khi chưa có RDY; chỉ poll wait + log, chưa recover.
5. Reset/clear RDY token mỗi lần power/recover cycle mới.

## 8) Todo list
- [ ] Define RDY source strategy (pin-first, token fallback)
- [ ] Add WAIT_RDY gate in FSM path
- [ ] Add RDY token lifecycle (set/consume/clear)
- [ ] Add concise logs for gate open/blocked

## 9) Success Criteria
- Không gửi `AT` trước khi RDY gate mở.
- Monitor sequence có thứ tự: power -> RDY -> `AT OK` -> `ATE0 OK` -> `CPIN`.
- Không có reset/pwrkey fallback trong giai đoạn chưa thấy RDY.

## 10) Risk Assessment
- Risk: RDY pin không có/không ổn định.
- Mitigation: token fallback + timeout chờ hợp lý + log diagnosis.

## 11) Security Considerations
- Không tác động auth/data plane.
- Tránh log lộ thông tin nhạy cảm; chỉ log state + code + timing.

## 12) Next steps
- Bàn giao Phase 02 để gắn recovery/backoff theo RDY-gated behavior.
