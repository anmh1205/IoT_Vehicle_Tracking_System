# Audit READ-ONLY — ECU Simulator (PlatformIO / Arduino AVR)

Base: `iot-vehicle-tracking-system-ecu-simulator/ecu-simulator`
Ngày: 2026-07-13 · Phạm vi: toàn bộ `src/*.cpp`, `src/*.h`, `platformio.ini`
Phương pháp: đọc từng file IN FULL (không sampling). Chỉ đọc, không sửa/tạo/xoá code.

---

## 1. Coverage per-file

| File | Dòng đã đọc | Ghi chú |
|------|-------------|---------|
| `platformio.ini` | 19/19 | env:uno, atmelavr, 3 lib_deps. 2 dep không dùng, thiếu monitor_speed. |
| `src/simulation-state.h` | 118/118 | Chỉ khai báo enum/struct. Không logic. Cấu trúc sạch, đủ trường. |
| `src/main.cpp` | 117/117 | setup/loop, parser lệnh Serial, khởi tạo MCP2515. Loop non-blocking OK. |
| `src/ecu-model.h` | 58/58 | Khai báo `ecu_snapshot_t` + API. Không logic. |
| `src/ecu-model.cpp` | 172/172 | Điều phối tick, ignition cycle, counters (distance/runtime/fuel). |
| `src/obd-can.h` | 7/7 | 2 prototype. |
| `src/obd-can.cpp` | 161/161 | Encode PID mode 01, DTC mode 03/07/0A, bitmap supported-PID. Trọng tâm bug. |
| `src/obd-snapshot-builder.h` | 8/8 | 1 prototype. |
| `src/obd-snapshot-builder.cpp` | 147/147 | Chuyển powertrain/diagnostic → snapshot OBD; clamp helpers. |
| `src/powertrain-state-model.h` | 13/13 | 3 prototype. |
| `src/powertrain-state-model.cpp` | 212/212 | Config mặc định + mô phỏng speed/rpm/gear/temp/converter-slip. |
| `src/diagnostic-state-model.h` | 9/9 | 3 prototype. |
| `src/diagnostic-state-model.cpp` | 76/76 | Fault profiles, state machine pending→stored→permanent, readiness bytes. |
| `src/driver-input-profile.h` | 7/7 | 1 prototype. |
| `src/driver-input-profile.cpp` | 58/58 | Kịch bản lái lặp chu kỳ 220s. |

Tổng: 15 file, 1182 dòng, đọc 100%. Grep TODO/FIXME/HACK/stub/placeholder → 0 kết quả.

---

## 2. Findings theo severity

### CRITICAL
Không có.

### HIGH

**H1 — `encode_percent()` overflow khi giá trị > 100%** · `obd-can.cpp:14` (verified)
```cpp
uint8_t encode_percent(uint8_t pct) { return static_cast<uint8_t>((static_cast<uint16_t>(pct) * 255U) / 100U); }
```
Công thức đúng cho input 0..100. Nhưng nguồn cấp có thể > 100:
- `engine_load_pct` (`obd-snapshot-builder.cpp:40`): `throttle*0.72 + rpm_factor*26 + 5` → tối đa ~103 khi full-throttle. `clamp_u8` chỉ chặn ở 255, KHÔNG chặn 100.
- `abs_throttle_b_pct` (`obd-snapshot-builder.cpp:121`): `throttle_actual + 3` → tối đa 103.

Với pct = 103: `(103*255)/100 = 262` → `static_cast<uint8_t>(262) = 6`. PID `0x04` (engine load) và `0x47` (throttle B) trả **6%** thay vì ~100% mỗi khi tăng ga mạnh — sai nghiêm trọng dữ liệu OBD. Verified qua source. Root cause nằm ở builder không clamp về 100 trước khi encode.

### MEDIUM

**M1 — Không xử lý Mode 09 (VIN / calibration ID)** · `obd-can.cpp:146-160` (verified)
`obd_can_poll` chỉ nhánh mode `0x01`, `0x03`, `0x07`, `0x0A`. Mode `0x09` (được nêu trong scope OBD-II mode 01/09) hoàn toàn bị bỏ; scan tool hỏi VIN sẽ không nhận response. Feature gap.

**M2 — Response DTC thiếu byte "số lượng DTC" (định dạng CAN)** · `obd-can.cpp:109-121` (verified)
```cpp
uint8_t payload[7] = {static_cast<uint8_t>(mode + 0x40), 0, ...};
uint8_t out = 1;
for (...) { payload[out++] = code>>8; payload[out++] = code; }
```
Payload dạng `[0x43][DTC_hi][DTC_lo]...`. Theo ISO 15765-2 / SAE J1979 trên CAN 11-bit, byte ngay sau `0x43` phải là **số lượng DTC**, rồi mới đến các cặp mã. Nhiều tester parse theo count-byte sẽ đọc sai. Áp dụng cho cả 0x43/0x47/0x4A.

**M3 — Crystal MCP2515 hardcode `MCP_8MHZ`** · `main.cpp:107` (verified)
```cpp
s_can_controller.setBitrate(CAN_500KBPS, MCP_8MHZ);
```
Rất nhiều module MCP2515 phổ biến dùng thạch anh 16MHz. Nếu phần cứng là 16MHz, bitrate thực tế sai (một nửa) → toàn bộ CAN không bắt tay được. Magic constant phần cứng, không cấu hình qua build flag.

**M4 — `lib_deps` thừa 2 thư viện không dùng** · `platformio.ini:16-17` (verified)
```
marcoschwartz/LiquidCrystal_I2C@^1.1.4
adafruit/Adafruit BusIO@^1.17.4
```
Grep toàn `src/` cho `LiquidCrystal`/`Wire.h`/`lcd`/`Adafruit` → 0 kết quả. Hai dep này (LCD I2C) không được include/dùng ở đâu, chỉ làm phình thời gian build và có thể kéo Wire vào firmware. Chỉ `mcp2515` được dùng thực sự.

**M5 — `monitor_speed` không set, lệch baud** · `platformio.ini` (verified)
`Serial.begin(115200)` (`main.cpp:104`) nhưng `platformio.ini` không khai báo `monitor_speed = 115200`. `pio device monitor` mặc định 9600 → log rác nếu chưa truyền `-b`. Ảnh hưởng vận hành/test (thư mục `test-logs/` cho thấy monitor được dùng thường xuyên).

### LOW

**L1 — So sánh deadline theo giây không wrap-safe** · `ecu-model.cpp:46, 164` (verified)
`now_s < s_ignition.forced_cycle_deadline_s` và `now_s >= ...deadline_s`. `now_s = millis()/1000` wrap ~49 ngày; các phép `<`/`>=` (khác với trừ unsigned) sẽ sai quanh điểm wrap. Biên hiếm gặp cho sim, nhưng khác với `now_ms - s_last_tick_ms` (đã wrap-safe đúng ở `ecu-model.cpp:105`).

**L2 — `fuel_level_pct` đóng băng ở sàn 8%, không nạp lại** · `ecu-model.cpp:84-85` (verified)
```cpp
if (s_powertrain.fuel_level_pct > 8.0f && s_powertrain.engine_running) { ... -= ... 0.0009f; }
```
Nhiên liệu chỉ giảm khi > 8%, nên tiệm cận và kẹt vĩnh viễn ở ~8%, không bao giờ về 0 hay refill. Hành vi mô phỏng thiếu tự nhiên; PID `0x2F` sẽ luôn báo 8% sau thời gian dài.

**L3 — Round-trip clamp nhiệt độ int8 có thể wrap ở giá trị cao** · `obd-snapshot-builder.cpp:110, 120` (verified)
```cpp
snapshot.intake_air_c = static_cast<int8_t>(clamp_u8(static_cast<int>(powertrain.intake_air_c + 40.0f)) - 40);
```
Nếu nhiệt độ > 87°C thì `clamp_u8(...+40) - 40` > 127 → `int8_t` tràn âm. Với dải hiện tại (intake ≈ ambient+~10) an toàn, nhưng công thức mong manh.

**L4 — `time_since_clear_min` dùng `total_elapsed_s` sai ngữ nghĩa** · `obd-snapshot-builder.cpp:124` (verified)
PID `0x4E` (time since codes cleared) lại lấy từ `total_elapsed_s/60` (tổng uptime), không liên quan tới lần clear DTC. Không nhất quán với `distance_since_clear_km` (dùng `distance_m`).

**L5 — PID 0x0C phụ thuộc int 16-bit** · `obd-can.cpp:70` (verified)
```cpp
data[0] = static_cast<uint8_t>((snap.rpm * 4U) >> 8);
```
Trên AVR `4U` là `unsigned int` 16-bit; `rpm*4` chỉ an toàn vì rpm bị clamp ≤ redline 6200 (24800 < 65535). Nếu bỏ clamp/đổi redline > 16383, tràn 16-bit im lặng.

**L6 — Mode 03 khi không có DTC vẫn gửi cặp `0x00 0x00`** · `obd-can.cpp:116-119` (verified)
Gửi `[0x43][0x00][0x00]` có thể bị hiểu là DTC P0000 thay vì "không có mã". Kết hợp M2 (thiếu count byte) làm response 0-DTC dễ bị parse sai.

**L7 — Hằng số magic rải rác, không đặt tên** · nhiều nơi (verified)
Ví dụ: `readiness_bytes[2] = 0xE5` (`diagnostic-state-model.cpp:43`), `ethanol_pct = 10` (`obd-snapshot-builder.cpp:125`), `obd_standard = 0x01`, ngưỡng fault 6000/18000/32000/52000 ms (`diagnostic-state-model.cpp:65-68`), `control_module_mv = 13720` (`powertrain-state-model.cpp:160`). Chấp nhận được với sim nhưng khó bảo trì; nên gom thành named constants.

**L8 — Indentation lẫn tab/space trong platformio.ini** · `platformio.ini:16-18` (verified)
Dòng 16-17 thụt bằng tab, dòng 18 thụt bằng space. Vô hại về build, chỉ lệch style.

---

## 3. Đã kiểm tra — KHÔNG có vấn đề (verified no-issue)

- **Race / interrupt**: không dùng ISR nào; CAN và Serial đều polling trong `loop()` (`main.cpp:113-117`). Không có biến chia sẻ giữa ISR và loop → không có race.
- **Blocking / timing**: không có `delay()` chặn. `ecu-model.cpp:106` clamp `delta_ms ≤ 250` nên một lần treo dài không làm nổ tích phân vật lý. `now_ms - s_last_tick_ms` wrap-safe đúng.
- **Đơn vị quãng đường**: `ecu-model.cpp:67` `speed_kph * delta_ms * 1000 / 3600` = `speed_kph * delta_ms / 3.6` mm — đúng thứ nguyên (km/h → mm/ms).
- **Bitmap supported-PID**: `obd-can.cpp:20-29` đặt bit `1 << (31 - (pid-base-1))`, PID+1 → bit A7, PID+0x20 → bit0; chuỗi 0x00/0x20/0x40/0x60 nối bank đúng. Verified.
- **`response_id_for`**: `obd-can.cpp:18` 0x7E0..0x7E7 → +8 (0x7E8..0x7EF), còn lại (gồm 0x7DF functional) → 0x7E8. Đúng chuẩn.
- **Công thức RPM/Speed/MAF/FuelRate**: PID 0x0C (rpm×4), 0x0D (speed=A), 0x10 (maf centigram), 0x5E (÷5 để ra ×20 L/h), 0x0A (kpa÷3) — tất cả khớp SAE J1979.
- **Bounds mảng gear**: mọi truy cập `gear_ratios[]`, `upshift_kph[]`, `downshift_kph[]`, `closed_throttle_drag_by_gear[]` đều được guard bởi `gear` range 0..4 và các điều kiện `gear<4`/`gear>1` (`powertrain-state-model.cpp:85,93,98,127`). Không OOB. Verified.
- **Serial command buffer**: `main.cpp:95` guard `s_command_length + 1U < sizeof(...)` chặn tràn `s_command_buffer[32]`; lọc ký tự non-printable. An toàn.
- **State machine diagnostic**: `diagnostic-state-model.cpp:58-73` — active_ms tích/giảm, khi `stored` thì ngừng decay (`!state.stored` ở dòng 60), reset đúng khi begin ignition ON. Không deadlock/kẹt bất thường; permanent chốt lại là hành vi mong muốn của DTC permanent.
- **Modulo profile index**: `diagnostic-state-model.cpp:54` `profile_index % count` + `random(0, count)` (exclusive) → luôn trong [0,2]. An toàn.

---

## 4. Câu hỏi mở

1. **Phần cứng MCP2515 thực tế là 8MHz hay 16MHz?** Quyết định M3 có phải bug thật hay chỉ là giả định phần cứng.
2. **Tester tiêu thụ dữ liệu có yêu cầu count-byte ở mode 03/07/0A không?** Nếu firmware bên nhận (gateway/telematics) tự viết và parse theo định dạng hiện tại thì M2 chỉ là lệch chuẩn nội bộ; nếu dùng scan tool chuẩn thì là lỗi tương thích.
3. **Mode 09 (VIN) có nằm trong yêu cầu sản phẩm không?** Scope nhắc "mode 01/09" nhưng code chỉ có 01 — cố ý cắt hay thiếu (M1)?
4. **`engine_load` > 100% là chủ ý (turbo/over-100 load) hay cần clamp về 100 trước encode?** Ảnh hưởng cách sửa H1 (clamp ở builder vs sửa `encode_percent`).
5. **Ngưỡng nhiên liệu 8% và không refill** (L2) có phải để mô phỏng cảnh báo "low fuel" liên tục, hay chỉ là logic dở dang?
6. **SRAM budget trên Uno (2KB)**: snapshot + powertrain + diagnostic + config nhiều float/struct static; chưa đo footprint. Có cần kiểm tra map firmware để chắc không sát giới hạn?

---

## 5. Summary

- **File đọc**: 15/15 (100%, 1182 dòng).
- **Findings**: CRITICAL 0 · HIGH 1 · MEDIUM 5 · LOW 8.
- Điểm nóng: `obd-can.cpp` (encode overflow H1, mode 09 thiếu M1, DTC count byte M2) và `platformio.ini` (dep thừa M4, monitor_speed M5).
- Logic vật lý powertrain, đơn vị quãng đường, bounds mảng, timing non-blocking, state machine diagnostic đều verified sạch.
