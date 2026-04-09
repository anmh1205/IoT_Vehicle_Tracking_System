# Research Report: FSM recovery/backoff cho modem LTE

Timestamp: 2026-04-09 03:15 Asia/Saigon

## Current FSM behavior
- FSM nằm trong `modem_lte.c` với chuỗi chính: `POWER_ON_PULSE -> WAIT_BOOT -> AT_SYNC -> ATE0 -> CPIN_CHECK -> SET_NET_MODE -> SET_PDP -> CEREG_WAIT -> PDP_ACTIVATE -> PDP_IP_CHECK -> CONNECTED`.
- `WAIT_BOOT` chỉ đợi `MODEM_LTE_POWER_RAIL_SETTLE_MS`, rồi init UART và chuyển sang `AT_SYNC`.
- `AT_SYNC` probe `AT\r` với timeout ngắn; nếu fail thì tăng `s_at_sync_fail_count`.
- Khi `s_at_sync_fail_count >= 3`, code hiện có fallback theo thứ tự: `RESET pulse` một lần, rồi `PWRKEY pulse` một lần, sau đó set `s_force_power_cycle_recover = true` và đi `RECOVER_RESET`.
- `RECOVER_RESET` hiện chỉ làm 1 reset pulse; nếu cờ force bật thì bỏ qua reset và power-cycle lại bằng `modem_power_on()`.
- Các lỗi ở `ATE0`, `CPIN_CHECK`, `SET_NET_MODE`, `SET_PDP`, `CEREG_WAIT`, `PDP_ACTIVATE`, `PDP_IP_CHECK` đều đi qua `modem_lte_enter_recover_or_backoff()`.
- `modem_lte_enter_recover_or_backoff()` đã có giới hạn `MODEM_LTE_MAX_RECOVER_ATTEMPTS = 2`, sau đó vào backoff exponential qua `retry_manager`.
- Hết connect success thì reset nhiều state flags: backoff, recover attempts, sync fail count, diag timers, force-power-cycle flags.

## Failure window
- Rủi ro chính: modem chưa thật sự boot xong nhưng FSM liên tục gặp `AT_SYNC` fail, rồi ngay lập tức bắn `RESET`/`PWRKEY`/`RECOVER_RESET` lặp lại.
- Storm dễ xảy ra khi:
  - UART mapping/inversion sai tạm thời;
  - modem đang ngủ / chưa sẵn sàng phản hồi;
  - đường nguồn/PWRKEY/RESET có latency khác kỳ vọng;
  - `AT_SYNC` fail do noise nhưng recovery action lại quá nhanh.
- Hiện tại backoff chỉ rõ ràng ở nhánh error sau `ATE0+`; riêng fallback startup trong `AT_SYNC` vẫn có nguy cơ reset liên tiếp theo vòng tick nếu điều kiện fail vẫn giữ nguyên.

## Minimal-change design options

### Option A: Thêm cooldown gate cho action reset/power-cycle
- Thêm 1 timestamp/guard tối thiểu cho lần `RESET`/`PWRKEY` gần nhất.
- Trong `AT_SYNC` và `RECOVER_RESET`, trước khi phát fallback action, kiểm tra cooldown; nếu chưa đủ thời gian thì chỉ quay lại `WAIT_BOOT`/`AT_SYNC` hoặc vào backoff ngắn.
- Dùng luôn `retry_state` hiện có cho các nhánh backoff; không tạo policy mới.
- Pros: chặn reset storm rõ ràng, ít đụng FSM, dễ đọc.
- Cons: thêm 1 guard nữa; cần chọn cooldown hợp lý.

### Option B: Chỉ tăng backoff cho recovery path hiện tại
- Giữ FSM gần như cũ, nhưng mọi nhánh fallback/reset đều đi qua backoff exponential đã có.
- Có thể gộp `RESET` và `PWRKEY` vào một đường recover chung, không cho bắn liên tiếp trong cùng một chu kỳ tick.
- Pros: thay đổi ít field hơn.
- Cons: storm vẫn có thể xảy ra nếu fallback action được gọi nhiều lần trước khi backoff khóa đủ mạnh; khó phân biệt startup fallback vs recover fallback.

## Recommended option + trade-offs
- Chọn **Option A**.
- Lý do: YAGNI/KISS. Một guard cooldown nhỏ + tận dụng `retry_manager` hiện có là đủ để chặn reset storm mà không phải redesign FSM.
- Trade-off: thêm 1 state guard, nhưng đổi lại hành vi recovery ổn định hơn và log dễ hiểu hơn.
- Khuyến nghị policy:
  - `AT_SYNC` fail 3 lần mới cho phép 1 action hardware recovery.
  - Sau `RESET` hoặc `PWRKEY`, áp cooldown ngắn trước khi cho phép action tiếp theo.
  - Nếu vẫn fail sau 1 vòng recover, chuyển sang backoff exponential, không reset liên tục.

## Minimal fields/flags cần thêm/bớt
- Nên thêm tối thiểu:
  - `uint64_t s_last_recover_action_ms` hoặc `s_last_hw_recovery_ms`.
  - `bool s_recovery_action_in_flight` nếu cần khóa 1 lần action/tick.
- Có thể giữ lại:
  - `s_at_sync_fail_count`
  - `s_recover_attempts`
  - `s_initial_reset_pulse_attempted`
  - `s_initial_power_pulse_attempted`
  - `s_force_power_cycle_recover`
- Nên cân nhắc bớt/không mở rộng thêm flag mới nếu cooldown đủ.

## Affected files list
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/modem_lte.h` nếu cần expose helper/contract mới
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/modem_at.h` chỉ nếu cần thêm diagnostic hook, nhưng hiện tại chưa thấy bắt buộc

## Unresolved questions
- Cooldown tối thiểu bao nhiêu ms là hợp lý cho SIM7600CE-T trên board hiện tại?
- `modem_reset_pulse()` và `modem_power_on()` có bảo đảm idempotent nếu gọi sát nhau không?
- Có cần log riêng “cooldown skip” để phân biệt fail thật với fail bị gate?
- `retry_manager` hiện đã được dùng ở nơi khác chưa, để tránh lệch policy giữa các recovery path?
