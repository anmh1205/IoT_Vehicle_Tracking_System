# Researcher 02 — Led engine design cho user LED non-blocking

## Scope
- Target: `iot-vehicle-tracking-system-firmware/components/app-core/src/state_machine_core.c`
- Shared runtime context: `iot-vehicle-tracking-system-firmware/components/app-core/include/state_runtime_context.h`
- Goal: đề xuất kiến trúc user LED 1 pin, non-blocking, clean, tái dùng state machine hiện có.
- Không implement.

## Hiện trạng ngắn
- `state_machine_core.c` đang tự config GPIO + tự blink trong `state_machine_update_user_led()`.
- LED logic bị trộn vào core loop, nên khó mở rộng khi thêm OTA / fault / sleep override.
- `state_runtime_context.h` đã có đúng chỗ để chứa shared timing, retry, session, OTA, alarm, sleep flags.

## Đề xuất module boundary
1. `user_led_policy.c/h`
   - Input: app state, OTA flag, alarm flag, network/mqtt state, sleep intent, fault flags.
   - Output: `user_led_pattern_id_t` + priority + duration/expiry.
   - Thuần policy, không đụng GPIO.
2. `user_led_pattern.c/h`
   - Định nghĩa pattern primitives, ví dụ: `steady`, `blink`, `burst`, `pulse`, `double-blink`.
   - Chuyển pattern id -> frame schedule.
3. `user_led_driver.c/h`
   - Chỉ nhận `pattern frame` và update GPIO theo `now_ms`.
   - Không biết business state.
4. Hook tối thiểu trong `state_machine_core.c`
   - Gọi `user_led_tick(now_ms, runtime_snapshot)` mỗi vòng FSM.
   - Không gọi `gpio_config`/`gpio_set_level` trực tiếp trong core nữa.

## Priority model
- Dùng single-winner arbitration, không stack phức tạp.
- Priority đề xuất:
  1. `FAULT / HARD_ERROR`
  2. `OTA_OVERRIDE`
  3. `ALARM_OVERRIDE`
  4. `BOOT / INIT`
  5. `NETWORK_RECOVERY`
  6. `DRIVING / ACTIVE`
  7. `PARKED / HEARTBEAT`
  8. `SLEEP / IDLE`
- Luật: pattern ưu tiên cao chiếm LED cho tới khi hết TTL hoặc clear condition.
- Override nên có TTL ngắn + refresh khi condition còn true.

## Pattern representation tối giản
```c
typedef enum {
  LED_PAT_OFF, LED_PAT_SOLID, LED_PAT_SLOW_BLINK,
  LED_PAT_FAST_BLINK, LED_PAT_DOUBLE_BLINK,
  LED_PAT_TRIPLE_PULSE, LED_PAT_LONG_PULSE,
  LED_PAT_ERROR_CODE, LED_PAT_TAIL_OVERRIDE
} user_led_pattern_id_t;

typedef struct {
  user_led_pattern_id_t id;
  uint8_t priority;
  uint32_t on_ms;
  uint32_t off_ms;
  uint32_t ttl_ms;
  bool repeat;
  bool active_low;
} user_led_pattern_spec_t;
```
- Với 1 LED đơn, nên ưu tiên frame schedule hơn là animation engine tổng quát.
- `ttl_ms` giúp override tạm thời tự rơi về base pattern.

## Tick/update pseudocode
```c
void user_led_tick(uint64_t now_ms, const runtime_snapshot_t *rt) {
  candidate = user_led_policy_resolve(rt, now_ms);
  if (candidate.id != current.id || candidate.expired) {
    current = candidate;
    state_enter_ms = now_ms;
    phase_ms = 0;
  }

  spec = user_led_pattern_get(current.id);
  elapsed = now_ms - state_enter_ms;
  if (spec.ttl_ms > 0 && elapsed >= spec.ttl_ms) {
    current = user_led_policy_resolve_base(rt, now_ms);
    state_enter_ms = now_ms;
    elapsed = 0;
  }

  level = user_led_pattern_sample(spec, elapsed);
  gpio_write_user_led(level ^ spec.active_low);
}
```
- Không `delay`, không task riêng bắt buộc.
- Tick có thể chạy từ FSM loop hoặc timer 100–200ms nếu muốn mượt hơn.

## Mapping chiến lược cho 8+ pattern
1. `APP_STATE_INIT` -> `LED_PAT_TRIPLE_PULSE`
   - Boot visible, ngắn, xong chuyển base.
2. `APP_STATE_CHECK_IGN` -> `LED_PAT_FAST_BLINK`
   - Đang chờ ổn định ignition/sensor.
3. `APP_STATE_DRIVING` + `tracker_mqtt_is_connected()` -> `LED_PAT_SOLID`
   - Trạng thái active ổn định.
4. `APP_STATE_DRIVING` + mất MQTT / retry mạng -> `LED_PAT_SLOW_BLINK`
   - Cho biết active nhưng link chưa tốt.
5. `APP_STATE_PARKED` -> `LED_PAT_LONG_PULSE`
   - Base tiết kiệm điện, dễ nhận biết hơn solid OFF.
6. `APP_STATE_HEARTBEAT` -> `LED_PAT_DOUBLE_BLINK`
   - Phân biệt parked heartbeat với parked thường.
7. `APP_STATE_SLEEP` -> `LED_PAT_OFF`
   - Base lowest power.
8. `APP_STATE_ALARM` -> `LED_PAT_FAST_BLINK` hoặc `LED_PAT_ERROR_CODE`
   - Override cao hơn mọi base state.
9. `s_ota_in_progress == true` -> `LED_PAT_TAIL_OVERRIDE`
   - Ví dụ pulse nhịp ngắn trong TTL 2–5s, rồi quay lại base.
10. `fault / bootstrap fail / modem fail / obd fail streak` -> `LED_PAT_ERROR_CODE`
   - Mã hoá bằng số pulse ngắn + gap dài.

## Gợi ý override rule
- `FAULT` luôn thắng.
- `OTA` thắng base state nhưng thua fault/alarm.
- `ALARM` thắng mọi base state.
- `BOOT` chỉ áp dụng khi chưa có state ổn định.
- `SLEEP` chỉ là base, không được che bởi boot/alarm/ota.

## Trade-off chính
- Ưu: tách policy khỏi GPIO, dễ thêm pattern, dễ test, không block loop.
- Ưu: tái dùng state/runtime flags hiện có, ít thay đổi core.
- Nhược: thêm 2–3 module mới, tăng số điểm hook.
- Nhược: nếu pattern quá nhiều, cần giữ spec nhỏ để tránh over-engineering.

## Kết luận ngắn
- Hướng tốt nhất: giữ `state_machine_core.c` làm orchestrator, đẩy LED sang policy + pattern + driver.
- Đừng build animation engine tổng quát; với 1 LED thì table-driven pattern + priority resolver là đủ.
