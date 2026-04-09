# Phase 02 — Recovery/backoff and storm protection

## 1) Context links
- Research: `./research/researcher-02-fsm-recovery-and-backoff.md`
- Phase dependency: `./phase-01-rdy-event-and-startup-gate.md`
- Code focus: `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`

## 2) Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-09
- Description: Chặn reset storm bằng cooldown + bounded recover + exponential backoff.
- Priority: P1
- Implementation status: pending
- Review status: not started

## 3) Key Insights
- Pattern hiện tại: timeout AT -> reset/pwrkey nhanh -> lặp.
- Recovery phải chỉ xảy ra sau khi đã qua RDY gate nhưng vẫn lỗi.
- Không cần redesign FSM; chỉ policy guard nhỏ là đủ.

## 4) Requirements
- Functional:
  - Nếu chưa RDY: không reset/pwrkey fallback.
  - Nếu đã RDY nhưng AT/ATE0 fail: recover theo tầng (reset hoặc pwrkey) có cooldown.
  - Nếu CPIN trả `+CME ERROR: SIM not inserted`: áp bounded soft-retry trước khi cho recover phần cứng.
  - Sau recover luôn quay lại flow chuẩn và chờ RDY lại.
- Non-functional:
  - Chống reset storm theo chiến lược conservative.
  - Giữ logic dễ đọc, ít flag mới.
<!-- Updated: Validation Session 1 - CPIN soft-retry and conservative anti-storm confirmed -->

## 5) Architecture
- Bổ sung `last_hw_recover_ms` + `recover_cooldown_ms`.
- Gate quyết định recover:
  - `allow_hw_recover = rdy_seen && cooldown_elapsed`.
- CPIN error path đi qua soft-retry counter riêng, chỉ nâng lên hardware recover khi vượt ngưỡng.
- Khi vượt ngưỡng recover attempt: vào `retry_manager` exponential backoff hiện có.
- Backoff reset khi connect thành công.
<!-- Updated: Validation Session 1 - explicit CPIN retry gate before hardware recovery -->

## 6) Related code files
- Modify: `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- Optional modify: `iot-vehicle-tracking-system-firmware/main/inc/modem_lte.h` (nếu expose diag)
- Create: none
- Delete: none

## 7) Implementation Steps
1. Chuẩn hóa recovery entrypoint để mọi fallback đi qua một policy chung.
2. Thêm cooldown guard trước reset/pwrkey.
3. Ràng buộc recover chỉ khi RDY gate từng mở ở cycle hiện tại.
4. Giới hạn số recover attempt trước backoff.
5. Bảo đảm recover path re-enter `WAIT_RDY` thay vì nhảy thẳng `AT_SYNC`.

## 8) Todo list
- [ ] Add cooldown timestamp and constants
- [ ] Unify fallback policy in AT timeout path
- [ ] Bind recover eligibility to RDY-seen flag
- [ ] Validate backoff transitions and counters reset

## 9) Success Criteria
- Không còn chuỗi reset/pwrkey liên tục mỗi vài giây.
- Có log `cooldown skip`/`enter backoff` rõ ràng.
- Sau recover: phải thấy lại `RDY` trước `AT`.

## 10) Risk Assessment
- Risk: cooldown quá dài gây tăng time-to-connect.
- Mitigation: đặt giá trị vừa đủ, validate bằng monitor logs thực tế.

## 11) Security Considerations
- Không mở bề mặt tấn công mới.
- Tránh overflow counter/timestamp khi cộng dồn thời gian.

## 12) Next steps
- Bàn giao Phase 03 để dọn debug cũ và giữ log tối giản, hữu dụng.
