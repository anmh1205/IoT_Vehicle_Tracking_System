# ESP-IDF Common Pitfalls

Tài liệu này liệt kê các lỗi hay gặp hoặc điểm dễ sai khi làm việc với firmware ESP32-S3 hiện tại. Mỗi mục đều được đối chiếu với source và phần cứng đang có.

## 1) Không phân biệt rõ boot path và runtime path
### Pitfall
- Đặt logic quá nặng trong `app_main()` thay vì đưa vào state machine.
- Bỏ qua wakeup cause dẫn đến state khởi động sai.

### Source hiện tại
- Firmware đã tách đúng: `app_main()` chỉ init và chọn state ban đầu, runtime nằm trong `state_machine.c`. [Project source]
- Wakeup cause được phân nhánh timer/EXT0/other. [Project source]

## 2) Treo chờ modem hoặc mạng vô thời hạn
### Pitfall
- Chờ CEREG hoặc AT response không có timeout.
- Không có recovery nếu modem không phản hồi sau power-on.

### Source hiện tại
- LTE registration có retry giới hạn 20 vòng, mỗi vòng 1 giây. [Project source]
- Nếu AT probe fail, code có reset recovery một lần rồi mới fail. [Project source]

### Điều nên nhớ
- Nếu thêm command mới cho modem, phải giữ timeout bounded như hiện tại.
- Khi `modem_reset_pulse()` không supported, code đang trả `ESP_FAIL` cho recovery path. [Project source]

## 3) Bỏ qua `GPIO_NUM_NC`
### Pitfall
- Gọi `gpio_set_level()` hay đọc line trên pin chưa map.

### Source hiện tại
- `power_mgr.c` guard các chân modem optional và trả `ESP_ERR_NOT_SUPPORTED` cho reset/DTR/status/netlight khi pin là `GPIO_NUM_NC`. [Project source]

### Ghi chú netlist
- Netlist có tín hiệu modem vật lý, nhưng firmware mới chỉ map phần hiện hữu trong `pin_map.h`; những chân NC hiện là “chưa triển khai”, không phải bug. [Netlist inference][Project source]

## 4) Dùng NVS mà không có schema recovery
### Pitfall
- Lưu config blob nhưng không validate khi đọc lại.
- Không xử lý no-free-pages/new-version found.

### Source hiện tại
- `nvs_config.c` đã tự repair defaults khi missing/invalid. [Project source]
- `nvs_flash_init()` error recovery đã có erase-and-reinit. [Project source][Official ESP-IDF docs]

### Cảnh báo
- Nếu đổi `config_t`, phải nhớ backward compatibility vì blob lưu nguyên struct. [Project source]

## 5) OTA không verify đủ
### Pitfall
- Set boot partition trước khi kiểm hash.
- Không giữ confirm state qua reboot.
- Không chọn partition slot đúng.

### Source hiện tại
- `util_ota_apply_update()` verify SHA-256 trước khi `esp_ota_set_boot_partition()`. [Project source]
- `g_rtc_context` giữ `ota_pending_confirm`, `ota_job_id`, `ota_target_version`, `ota_previous_version`, `ota_partition`. [Project source]
- Partition table có `factory`, `ota_0`, `ota_1`. [Project source]

### Điều cần tránh
- Đừng thêm file cache OTA cục bộ nếu chưa có requirement rõ. [Project source]
- Nếu truyền `cmd->sha256` sai format, update sẽ fail sớm. [Project source]

## 6) Quên confirm image sau reboot OTA
### Pitfall
- Image boot được nhưng không confirm, dẫn tới rollback tự động.

### Source hiện tại
- `state_machine_try_confirm_running_firmware()` gọi `esp_ota_mark_app_valid_cancel_rollback()` khi `ota_pending_confirm` còn true. [Project source]

### Điều cần nhớ
- Nếu thêm flow reboot khác, phải preserve RTC OTA state hoặc risk rollback sai. [Project source]

## 7) Sleep không snapshot context trước khi tắt radio/stack
### Pitfall
- Tắt modem/BLE trước khi lưu thông tin session.
- Không config wake source phù hợp.

### Source hiện tại
- `state_machine_prepare_sleep()` snapshot vào RTC trước, sau đó mới disconnect BLE, GNSS, LTE, power off modem, disable charger, select backup power. [Project source]
- Wake sources: EXT0 motion, timer heartbeat. [Project source][Official ESP-IDF docs]

### Cảnh báo
- Nếu thêm sensor wake khác, cần check level polarity và RTC compatibility.

## 8) I2C sensor init không kiểm identity / fallback address
### Pitfall
- Giả định sensor address luôn cố định.
- Không kiểm WHO_AM_I.

### Source hiện tại
- `imu_lis3dsh.c` thử 0x18 trước, fallback 0x19 nếu WHO_AM_I không khớp. [Project source]
- Timeout giao dịch ngắn giúp tránh treo bus quá lâu. [Project source]

### Điều nên nhớ
- Nếu đổi sensor variant thì cập nhật docs + pin map + netlist inference.

## 9) Bỏ qua task lifecycle của NimBLE
### Pitfall
- Start/stop host task nhiều lần nhưng không cleanup semaphore/task handle.

### Source hiện tại
- `ble_init.c` có init/deinit idempotent, semaphore stop, rollback khi task create fail. [Project source]

### Cảnh báo
- Nếu spawn thêm BLE-related task, phải có shutdown path rõ ràng.

## 10) Không phân biệt “chưa dùng” với “không hỗ trợ”
### Pitfall
- Cho rằng vì chip support nên firmware cũng đã dùng.

### Source hiện tại
- `sdkconfig` báo chip support `SDMMC`, `I2C`, `UART`, `WDT`, `deep sleep`, `light sleep`. [Project source]
- Nhưng source runtime hiện **chưa** có SDMMC/FATFS flow, chưa có explicit task WDT, chưa có light-sleep flow. [Project source][Official ESP-IDF docs]

### Best practice
- Khi viết docs, luôn nói rõ “chip hỗ trợ” vs “project đang dùng”.

## 11) Dùng log quá ít ở chỗ recovery
### Pitfall
- Khi lỗi xảy ra, chỉ return code mà không có ngữ cảnh.

### Source hiện tại
- Code đã log các điểm quan trọng như NVS recovery, BLE stop timeout, modem line read, OTA confirm fail. [Project source]

### Gợi ý
- Nếu thêm module mới, luôn log `esp_err_to_name(err)` và input context tối thiểu.

## 12) Đọc nhầm netlist thành feature đã triển khai
### Pitfall
- Thấy pin/connector trong schematic rồi kết luận firmware đã support.

### Source hiện tại
- Netlist có SD interface và modem control nets, nhưng source firmware mới chỉ dùng subset pins cho hiện tại. [Netlist inference][Project source]

### Ghi chú thực dụng
- Netlist là evidence về phần cứng có khả năng, không phải evidence rằng firmware đã sử dụng.

## Đối chiếu với source hiện tại
| Pitfall | Có xuất hiện trong source? | Kết luận |
|---|---|---|
| Boot/runtime lẫn nhau | Không | Tách tốt | [Project source] |
| Infinite modem wait | Không | Có bounded timeout | [Project source] |
| NVS không recovery | Không | Có self-healing | [Project source] |
| OTA thiếu verify | Không | Có hash verify + confirm | [Project source] |
| SDMMC/FATFS bị hiểu nhầm | Có thể | Chưa dùng trong source | [Project source][Official ESP-IDF docs] |
| Task WDT không thấy | Có thể | Chưa có explicit watchdog task | [Project source][Official ESP-IDF docs] |

## Nguồn tham khảo chi tiết
### Source project
- `iot-vehicle-tracking-system-firmware/main/main.c`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c`
- `iot-vehicle-tracking-system-firmware/main/src/nvs_config.c`
- `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`
- `iot-vehicle-tracking-system-firmware/main/src/ble_init.c`
- `iot-vehicle-tracking-system-firmware/main/src/util.c`
- `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `iot-vehicle-tracking-system-firmware/partitions.csv`
- `iot-vehicle-tracking-system-firmware/sdkconfig`

### Hardware / netlist
- `iot-vehicle-tracking-system-firmware/documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`
- `iot-vehicle-tracking-system-firmware/documents/hardware-specs/components/mcu/esp32-s3-datasheet-en.pdf`
- `iot-vehicle-tracking-system-firmware/documents/hardware-specs/components/mcu/esp32-s3-technical-reference-manual-en.pdf`

### Official ESP-IDF docs
- [ESP-IDF Programming Guide — ESP32-S3 API Reference](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/index.html)
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
