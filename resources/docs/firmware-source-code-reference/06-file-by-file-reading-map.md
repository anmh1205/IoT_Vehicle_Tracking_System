# File By File Reading Map

**Last updated:** 2026-04-13  
**Status:** source-backed

## 1. Cách dùng trang này
Nếu bạn không biết mở file nào trước, dùng bảng này để đi từ câu hỏi -> file.

## 2. Header files trong `main/inc`
| File | Đọc khi nào | Vai trò |
|---|---|---|
| `app_config.h` | cần biết config/OTA model | định nghĩa `config_t`, `firmware_status_t`, `ota_command_t` |
| `app_state.h` | cần hiểu FSM + RTC context | định nghĩa state, telemetry, `g_rtc_context` |
| `pin_map.h` | đụng GPIO/hardware | source of truth cho pin map |
| `command_handler.h` | sửa cloud command | action enum + parser API |
| `modem_at.h` | sửa AT transport | UART AT abstraction |
| `modem_lte.h` | sửa LTE attach/PDP | LTE state machine API |
| `modem_gnss.h` | sửa GNSS | query + parse GNSS API |
| `mqtt_client.h` | sửa MQTT contract | topics, publish, subscribe, callbacks |
| `ble_obd.h` | sửa OBD over BLE | BLE OBD session API |
| `offline_queue.h` | sửa queue/replay | queue-first flow |
| `sd_log_store.h` | sửa durable storage | record/meta/stats types |
| `session_mgr.h` | sửa session boundary | ignition debounce/session lifecycle |
| `retry_manager.h` | sửa retry/backoff | shared retry policy/state |
| `telemetry_counters.h` | sửa diagnostics | lightweight counters |
| `rtc_ds3231m.h` | sửa RTC | RTC time + health API |
| `data_formatter.h` | sửa payload schema | JSON builders |
| `util.h` | sửa OTA/helper | OTA apply/rollback + helpers |

## 3. Source files trong `main/src`
| File | Đọc khi nào | Vai trò |
|---|---|---|
| `state_machine.c` | gần như mọi bug runtime | orchestrator trung tâm |
| `nvs_config.c` | config load/save/migrate lỗi | NVS config source of truth |
| `power_mgr.c` | power rail, modem pulse, LVD | power abstraction |
| `adc_reader.c` | voltage đọc sai | ADC oneshot + calibration |
| `imu_lis3dsh.c` | motion wake/vibration bug | IMU driver + interrupt |
| `rtc_ds3231m.c` | time/trust issue | RTC read/write/health |
| `modem_at.c` | AT command treo | UART transport + URC |
| `modem_lte.c` | attach/PDP lỗi | LTE sub-FSM |
| `modem_gnss.c` | fix/no-fix, GNSS fail | GNSS query + self-heal |
| `mqtt_client.c` | publish/subscribe fail | SIM7600 AT MQTT wrapper |
| `data_formatter.c` | payload format drift | JSON serializer |
| `command_handler.c` | command parse sai | command whitelist + OTA parse |
| `ble_init.c` | NimBLE lifecycle lỗi | stack init/deinit |
| `ble_mgr.c` | scan/connect/discovery lỗi | generic BLE central manager |
| `ble_obd.c` | OBD PID/ELM327 lỗi | OBD session layer |
| `sd_log_store.c` | SD log corrupt/recover | append-only store + GC |
| `offline_queue.c` | replay/ACK lỗi | enqueue + replay policy |
| `session_mgr.c` | session start/stop lỗi | ignition debounce |
| `retry_manager.c` | retry chạy lạ | retry math/state |
| `telemetry_counters.c` | diagnostic counters thiếu | local counters |
| `util.c` | OTA bug hoặc helper bug | OTA apply + rollback + misc helpers |

## 4. Nếu bạn muốn sửa theo mục tiêu
### Muốn đổi cadence/policy runtime
Đọc theo thứ tự:
1. `app_config.h`
2. `nvs_config.c`
3. `command_handler.c`
4. `state_machine.c`

### Muốn sửa LTE/GNSS
Đọc theo thứ tự:
1. `modem_at.c`
2. `modem_lte.c`
3. `modem_gnss.c`
4. `state_machine.c`

### Muốn sửa command/OTA
Đọc theo thứ tự:
1. `command_handler.c`
2. `state_machine.c`
3. `util.c`
4. `partitions.csv`

### Muốn sửa BLE OBD
Đọc theo thứ tự:
1. `ble_init.c`
2. `ble_mgr.c`
3. `ble_obd.c`
4. `state_machine.c`

### Muốn sửa persistence/replay
Đọc theo thứ tự:
1. `sd_log_store.c`
2. `offline_queue.c`
3. `telemetry_counters.c`
4. `mqtt_client.c`
5. `state_machine.c`

### Muốn sửa wake/sleep
Đọc theo thứ tự:
1. `main.c`
2. `app_state.h`
3. `imu_lis3dsh.c`
4. `power_mgr.c`
5. `state_machine.c`

## 5. File nào đáng đọc đầu tiên
Nếu chỉ chọn 5 file:
1. [`main/main.c`](../../../iot-vehicle-tracking-system-firmware/main/main.c)
2. [`main/src/state_machine.c`](../../../iot-vehicle-tracking-system-firmware/main/src/state_machine.c)
3. [`main/src/modem_lte.c`](../../../iot-vehicle-tracking-system-firmware/main/src/modem_lte.c)
4. [`main/src/mqtt_client.c`](../../../iot-vehicle-tracking-system-firmware/main/src/mqtt_client.c)
5. [`main/src/offline_queue.c`](../../../iot-vehicle-tracking-system-firmware/main/src/offline_queue.c)

## 6. File nào dễ gây hiểu nhầm nhất
| File | Vì sao |
|---|---|
| `main.c` | tưởng chỉ là boot, nhưng thực ra đang override runtime policy |
| `mqtt_client.c` | tên giống wrapper đơn giản, nhưng thực chất là AT MQTT implementation đầy đủ |
| `session_mgr.c` | nhìn nhỏ, nhưng ảnh hưởng start/stop session semantics |
| `rtc_ds3231m.c` | docs cũ có thể khiến người đọc tưởng chưa tích hợp |
| `offline_queue.c` | ACK semantics không phải broker-confirmed theo nghĩa chặt |

## 7. Kết luận ngắn
- Nếu chưa rõ bug ở đâu, mở `state_machine.c` trước.
- Nếu thấy hành vi runtime khác docs cũ, tin source hiện tại trước.

## Unresolved questions
1. Có nên tạo thêm generated call graph tự động cho toàn bộ `main/src` ở bước sau.
