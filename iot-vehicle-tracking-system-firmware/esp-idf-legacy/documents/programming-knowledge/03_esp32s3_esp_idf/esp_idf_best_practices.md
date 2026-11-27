# ESP-IDF Best Practices

Tài liệu này chốt các thực hành tốt nhất phù hợp với firmware hiện tại. Mục tiêu là giữ code đơn giản, đúng runtime, và dễ debug trên ESP32-S3.

## 1) Khởi tạo theo thứ tự phụ thuộc
### Nên làm
- Init NVS trước mọi thứ vì config và OTA state phụ thuộc vào nó. [Project source]
- Init power/IMU/modem trước khi vào state loop. [Project source]
- Ghi rõ startup logs về wakeup cause, boot count, partition label để hỗ trợ hiện trường. [Project source]

### Trong source hiện tại
- `app_main()` đã làm đúng thứ tự này. [Project source]
- `state_machine_init()` là nơi tập trung bring-up toàn hệ thống. [Project source]

## 2) Dùng timeout/retry rõ ràng, đừng để treo vô hạn
### Hiện trạng phù hợp
- AT command đều có timeout cụ thể. [Project source]
- LTE registration có poll loop hữu hạn. [Project source]
- BLE connect retry hữu hạn. [Project source]
- I2C ops có timeout ngắn. [Project source]

### Khuyến nghị giữ nguyên
- Đổi mọi “wait until ready” thành bounded wait như current code.
- Với side effects nguy hiểm (OTA, modem power, sleep entry), luôn return error code hoặc log rõ. [Project source]

## 3) Dùng recovery kiểu “self-healing” khi dữ liệu có thể hỏng
### Hiện trạng tốt
- NVS config load sẽ restore defaults khi key/namespace missing hoặc data invalid. [Project source]
- OTA verify SHA-256 trước khi set boot partition. [Project source]
- OTA confirm/rollback state được giữ trong RTC context để chống reboot giữa chừng. [Project source]

### Best practice cho project này
- Ưu tiên restore defaults hơn là crash nếu config không hợp lệ.
- Chỉ `ESP_ERROR_CHECK` ở chỗ boot-strapping bắt buộc; còn runtime state machine nên trả lỗi hoặc log warning. [Project source]

## 4) Giữ pin mapping và netlist mapping nhất quán
### Quan sát hiện tại
- `pin_map.h` là nguồn truth cho firmware pins. [Project source]
- Netlist cho thấy board có routing cho modem reset, power-key, status, net-light, SIM-DTR, I2C0, SD interface. [Netlist inference]

### Best practice
- Nếu pin là `GPIO_NUM_NC`, code phải guard `ESP_ERR_NOT_SUPPORTED` như hiện tại.
- Chỉ bật tính năng khi pin thật sự map trên hardware; đừng giả định peripheral có sẵn nếu firmware chưa dùng. [Project source]

## 5) Sleep/wake: chọn wake source tối thiểu cần thiết
### Hiện trạng hiện có
- Deep sleep là main low-power path.
- EXT0 wake cho motion interrupt.
- Timer wake cho heartbeat. [Project source][Official ESP-IDF docs]

### Best practice
- Giữ wake source ít và rõ ràng để giảm false wake.
- Snapshot RTC context trước khi sleep để khôi phục session. [Project source]
- Nếu thêm wake source mới, update docs và test cả timer wake lẫn motion wake. [Project source]

## 6) OTA phải có rollback safety
### Hiện trạng tốt
- Dùng OTA slots `ota_0` và `ota_1` kèm `factory`. [Project source]
- Image chỉ được confirm sau boot thành công. [Project source]
- SHA-256 mismatch sẽ abort. [Project source]

### Best practice
- Không set boot partition nếu hash mismatch, HTTP lỗi, hoặc `esp_ota_end()` fail.
- Luôn publish firmware status để backend biết trạng thái thực tế.
- Dùng RTC retained fields cho job ID/version/partition để resume sau reboot. [Project source]

## 7) Tách trách nhiệm, nhưng không over-engineer
### Đánh giá hiện tại
- Code đã có tách module hợp lý ở mức vừa đủ: NVS, util, BLE init, modem, IMU, power, FSM. [Project source]
- Chưa có lý do rõ để introduce thêm abstraction layer mới chỉ vì “clean architecture”. [Project source]

### Best practice theo KISS/YAGNI
- Chỉ tách thêm module khi module hiện tại vượt ngưỡng rõ ràng.
- Không tạo wrapper mới cho APIs ESP-IDF nếu code hiện tại đang dùng trực tiếp và dễ đọc.
- Không thêm SDMMC/FATFS hoặc watchdog orchestration nếu chưa có requirement runtime cụ thể. [Project source]

## 8) Logging thực dụng
### Hiện trạng hiện có
- Log level mặc định INFO.
- Warning được dùng cho recovery path: NVS erase, modem line read unsupported, OTA confirm fail, BLE stop timeout. [Project source]

### Best practice
- Log enough context: partition, state, wakeup, command/result.
- Đừng spam log trong fast loop state transitions.
- Include `esp_err_to_name(err)` khi error path có thể debug về sau. [Project source]

## 9) Per-module best practices theo source hiện tại
| Module | Best practice đang áp dụng | Ghi chú |
|---|---|---|
| `nvs_config.c` | Default-then-validate-then-repair | Mẫu tốt cho config persistence | [Project source] |
| `modem_lte.c` | Reset-recover once, bounded wait, DTR control | Phù hợp modem AT runtime | [Project source] |
| `modem_gnss.c` | Cached fix + parse guard | Tránh publish location stale | [Project source] |
| `imu_lis3dsh.c` | Fallback I2C addr + WHO_AM_I check | Giảm phụ thuộc board variant | [Project source] |
| `ble_init.c` | Idempotent init/deinit | Giảm double-start bugs | [Project source] |
| `util.c` | OTA hash verify trước boot partition | Bảo vệ integrity | [Project source] |

## 10) Những thứ nên tránh trong project này
- Hardcode infinite loops chờ modem/network. [Project source]
- Dùng file system cục bộ để chứa state nếu chưa có SDMMC/FATFS path. [Project source][Official ESP-IDF docs]
- Tạo task watchdog/worker task mới nếu chưa có nhu cầu rõ ràng; hiện FSM loop đã đủ đơn giản. [Project source][Official ESP-IDF docs]
- Bỏ qua guard cho `GPIO_NUM_NC`. [Project source]
- Ghi OTA partition boot trước khi verify xong hash. [Project source]

## Đối chiếu với source hiện tại
| Best practice | Có đang dùng? | Evidence |
|---|---|---|
| NVS self-heal | Có | `nvs_flash_erase()` + defaults restore | [Project source] |
| Bounded retry | Có | BLE/LTE/I2C timeout loops | [Project source] |
| Sleep snapshot | Có | `g_rtc_context` before deep sleep | [Project source] |
| Rollback-safe OTA | Có | hash verify + confirm image | [Project source] |
| Task WDT | Chưa thấy | Không có explicit `esp_task_wdt_*` | [Project source][Official ESP-IDF docs] |
| SDMMC/FATFS | Chưa thấy | Không có file storage flow | [Project source][Official ESP-IDF docs] |
| Light sleep | Chưa thấy | Deep sleep only | [Project source][Official ESP-IDF docs] |

## Nguồn tham khảo chi tiết
### Source project
- `iot-vehicle-tracking-system-firmware/main/main.c`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c`
- `iot-vehicle-tracking-system-firmware/main/src/nvs_config.c`
- `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`
- `iot-vehicle-tracking-system-firmware/main/src/ble_init.c`
- `iot-vehicle-tracking-system-firmware/main/src/util.c`
- `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `iot-vehicle-tracking-system-firmware/sdkconfig`
- `iot-vehicle-tracking-system-firmware/partitions.csv`

### Hardware / netlist
- `iot-vehicle-tracking-system-firmware/documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`
- `iot-vehicle-tracking-system-firmware/documents/hardware-specs/components/mcu/esp32-s3-datasheet-en.pdf`
- `iot-vehicle-tracking-system-firmware/documents/hardware-specs/components/mcu/esp32-s3-technical-reference-manual-en.pdf`

### Official ESP-IDF docs
- [Sleep Modes](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/system/sleep_modes.html)
- [UART](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/uart.html)
- [I2C](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/i2c.html)
- [SDMMC Host Driver](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/sdmmc_host.html)
- [FAT Filesystem Support](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/storage/fatfs.html)
- [NVS / Non-Volatile Storage](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/storage/nvs_flash.html)
- [ESP HTTPS OTA](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/system/esp_https_ota.html)
- [Watchdogs](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/system/wdts.html)

### Vendor docs
- [ESP32-S3 Series Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP32-S3 Technical Reference Manual](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
