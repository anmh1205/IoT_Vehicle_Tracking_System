# Phase 03 - Ignition-only session lifecycle and power recovery

## Context links
- Research: `./research/researcher-01-report.md`
- Runtime FSM: `main/src/state_machine.c`
- Boot loop: `main/main.c`

## Overview
- Priority: P1
- Status: pending
- Goal: tích hợp queue SD vào vòng đời ignition-only, an toàn deep sleep/reboot/power cut.

## Key Insights
- FSM đã có `DRIVING/PARKED/SLEEP/HEARTBEAT/ALARM`; thuận lợi để gắn session hooks.
- Có RTC context sẵn; có thể mở rộng checkpoint nhẹ.
- Cần tránh start/stop session liên tục do ignition bounce.

## Requirements
- Functional:
  - Session start khi ignition ON ổn định.
  - Session stop khi ignition OFF + flush checkpoint.
  - Reboot/deep sleep resume đúng ack pointer và session state.
  - Power-loss recovery: scan tail, bỏ record partial, tiếp tục replay.
- Non-functional:
  - Không tăng đáng kể wake time.
  - Không tạo loop retry vô hạn lúc boot.

## Architecture
- Session FSM con:
  - `IDLE -> STARTING -> ACTIVE -> STOPPING -> IDLE`
- Hook points:
  - `CHECK_IGN`: evaluate start/stop with debounce.
  - `DRIVING`: append + replay tick.
  - `PARKED/SLEEP`: finalize checkpoint + unmount optional.
- Checkpoint file:
  - `session_id, last_seq_written, ack_seq, last_clean_shutdown_flag`.
- Power-loss recovery:
  - Boot đọc checkpoint.
  - Nếu shutdown bẩn: quét file cuối đến newline hợp lệ cuối, truncate phần rác.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `iot-vehicle-tracking-system-firmware/main/main.c`
- Create:
  - `iot-vehicle-tracking-system-firmware/main/inc/session_mgr.h`
  - `iot-vehicle-tracking-system-firmware/main/src/session_mgr.c`
- Delete: none.

## Implementation Steps
<!-- Updated: Validation Session 1 - ignition OFF drain timeout -->
1. Thêm ignition debounce logic (time-window đơn giản).
2. Tạo `session_mgr` quản lý start/stop/checkpoint.
3. Gắn queue append/replay vào state `DRIVING`.
4. Khi `PARKED`, chạy drain ngắn **cố định 3 giây**, rồi checkpoint.
5. Trước deep sleep, đảm bảo flush checkpoint + trạng thái clean/dirty.
6. Trong boot path, chạy recovery scan nếu dirty shutdown.
7. Test edge: reboot giữa append, reboot giữa replay, ignition bounce.

## Todo List
<!-- Updated: Validation Session 1 - ignition OFF drain timeout -->
- [ ] Chốt debounce window ignition.
- [x] Chốt drain timeout khi ignition OFF = 3 giây.
- [ ] Chốt dirty-shutdown marker strategy.
- [ ] Chốt recovery truncate rule cho record partial.

## Success Criteria
- Không crash khi power-cut ngẫu nhiên trong 500 vòng test.
- Sau reboot, replay tiếp từ đúng `ack_seq+1`.
- Ignition bounce không tạo nhiều session giả.

## Risk Assessment
- Nếu flush kéo dài có thể trễ vào deep sleep/power budget.
- Dirty marker sai có thể bỏ sót recover cần thiết.
- Truncate logic sai có thể làm mất nhiều record hơn cần.
- Mitigation: format record newline-delimited + sentinel đơn giản.

## Security Considerations
- Session metadata không chứa thông tin định danh nhạy cảm ngoài device_id cần thiết.
- Không ghi credential vào checkpoint.

## Next Steps
- Sau P03, bổ sung observability + security controls ở P04.

## Unresolved questions
- Có cần unmount SD ngay khi OFF hay giữ mount tới trước sleep?
- Có cần tách session cho `ALARM/HEARTBEAT` hay gom cùng ignition session?
