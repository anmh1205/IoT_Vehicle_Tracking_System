# Audit tầng Adapter + Platform — Firmware ESP-IDF (ESP32-S3 + SIM7600 + LIS3DSH + OBD2 BLE)

Trạng thái: READ-ONLY, không sửa code. Ngôn ngữ C/ESP-IDF.
Ngày: 2026-07-14.

> **LƯU Ý COVERAGE:** Agent audit ban đầu hết iteration trước khi verify line-level nhóm **BLE + MQTT (session/urc_parser) + modem_gnss/sd_log_store/rtc_ds3231m**. Phần verified line-level (modem_at, modem_lte, imu, power, adc, nvs, hal) nằm dưới. Nhóm còn thiếu được quét bổ sung ở report **11b-firmware-ble-mqtt.md**.

## Coverage per-file (đã đọc)

| Component | File | Dòng | Mức đọc |
|---|---|---|---|
| adapter-ble-obd-nimble | ble_mgr.c, ble_obd.c, ble_util.c, ble_init.c + 4 header | ~44KB+38KB+... | đọc, **verify line-level ở 11b** |
| adapter-modem-sim7600-at | modem_at.c | 1130 | full (verified) |
| | modem_lte.c | 326 | full (verified) |
| | modem_lte_fsm.c | ~640 | full |
| | modem_lte_steps.c / recovery.c / uart_profile.c | 8.5K/7.7K/9.8K | full |
| | modem_gnss.c | ~920 | đọc, **verify ở 11b** |
| | modem_at.h, modem_lte.h, modem_lte_internal.h, modem_gnss.h | — | full |
| adapter-mqtt-sim7600-at | mqtt_client.c, mqtt_publish.c, mqtt_session.c (~1477), mqtt_urc_parser.c (~1100), mqtt_topics.c +2 header | — | đọc, **verify ở 11b** |
| adapter-kv-nvs | config_store_nvs.c (258), ota_context_store_nvs.c (148), nvs_config.c (227) + 4 header | — | full (verified) |
| adapter-rtc-ds3231m | rtc_ds3231m.c (~640) + header | — | đọc, **verify ở 11b** |
| adapter-storage-sdmmc-fatfs | sd_log_store.c (~970) + header | — | đọc, **verify ở 11b** |
| platform-board-esp32s3 | power_mgr.c (332), imu_lis3dsh.c (674), adc_reader.c (241) + 4 header + CMake | — | full (verified) |
| platform-hal-esp-idf | tracker-runtime-ports.c (83) + header | — | full (verified) |

## Findings theo severity

### HIGH
- **modem_at.c:263-283 `modem_at_response_done`** — verified. Phát hiện hoàn tất bằng `ends_with_ok` (2 ký tự cuối == "OK") và `ends_with_error` (5 ký tự "ERROR") sau khi trim. Payload/URC/dữ liệu nhị phân kết thúc tình cờ bằng "OK"/"ERROR" (hoặc data chứa những token này) có thể bị nhận nhầm là kết thúc lệnh → cắt response sớm, đặc biệt với response dài đa dòng của GNSS/HTTP. Nên chỉ tin marker CRLF-wrapped `\r\nOK\r\n`. Race/parse robustness.

### MEDIUM
- **modem_at.c:49-52 (doc) vs runtime** — verified. Comment header khẳng định "URC callbacks execute in ISR context (must be fast)"; thực tế URC được **polled trong task** (`modem_at_poll_urc`, drain trong `modem_at_send`). Doc sai gây rủi ro dev tương lai viết callback theo ràng buộc ISR (hoặc ngược lại gọi API blocking tưởng an toàn). Cần sửa doc.
- **modem_at.c:52+ response buffer** — "Response buffer not protected (single consumer assumed)". `s_dispatch_line_buf`, `s_uart_diag`, `s_urc_entries` là static toàn cục; được dùng cả trong `modem_at_send` (giữ mutex) và `modem_at_poll_urc` (giữ mutex 0-timeout). Đường đi có mutex nên OK, nhưng `modem_at_get_uart_diag`/`reset_uart_diag` (dòng 1007, 1023) gọi `modem_at_drain_uart_events()` **không giữ `s_at_lock`** → đọc/ghi `s_uart_diag` và drain queue đồng thời với task AT khác. Race trên counter + double-drain event queue.
- **imu_lis3dsh.c:560-638 `imu_get_peak_accel_delta_mps2`** — verified. Toàn bộ state baseline (`s_prev_x/y/z_mg`, `s_prev_sample_valid`, `s_accel_delta_window_peak_mps2`, `s_read_fail_streak`, backoff) là static không mutex. Nếu sampling task và publish task (`imu_reset_accel_delta_window`) chạy khác core/task → race đọc-sửa peak, có thể mất/đọc sai peak. Cần xác nhận chỉ 1 task truy cập.
- **modem_at.c:61 vs comment:57** — verified. `MODEM_RX_BUFFER_SIZE 1024` (1KB) + TX buffer=0 + `UART_HW_FLOWCTRL_DISABLE`, trong khi doc ghi "2KB RX/TX, RTS/CTS hardware". RX 1KB không flow-control: burst URC lớn (GNSS NMEA, MQTT payload dài) có thể FIFO overflow (đã có counter `fifo_overflow_count` + flush → mất byte giữa response). Rủi ro mất message/parse lỗi.

### LOW
- **modem_lte.c:27-84** — verified. Loạt biến trạng thái FSM (`s_lte_initialized`, `s_lte_connected`, `s_state`, `s_active_apn`...) khai báo **non-static** (linkage ngoài), chia sẻ giữa các module modem_lte_* qua `modem_lte_internal.h`. Không mutex — an toàn nếu FSM chạy đúng 1 task, nhưng leak symbol ra global namespace (nguy cơ trùng tên/ghi đè). Nên `static` hoặc gom struct.
- **modem_lte.c:84** — `s_active_apn` default = `CONFIG_TRACKER_MODEM_APN` (compile-time). Không phải secret nhưng APN cấu hình cứng qua Kconfig; log dùng `configured=1` (không rò giá trị) — tốt.
- **imu_lis3dsh.c:31 `IMU_I2C_PORT I2C_NUM_0`** — IMU và DS3231 RTC dùng chung bus I2C (pin_map.h: SDA=GPIO2, SCL=GPIO1). Cần xác nhận rtc_ds3231m.c cũng reuse bus (tránh `i2c_new_master_bus` trùng port → INVALID_STATE). imu_init có xử lý reuse (dòng 309-324); cần kiểm tra phía RTC làm tương tự.
- **modem_lte.c:284 `sscanf(marker,"+CSQ: %d")`** — parse CSQ ổn, có chặn sentinel 99. Nhưng không kiểm tra rssi>31 (ngoài dải 3GPP) → có thể trả dBm phi lý. Correctness minor.
- **power_mgr.c:42-52 `modem_pwrkey_drive`** — cả 2 nhánh if/else của inverted-stage đều gán `raw_level = asserted ? 1 : 0` giống hệt (dòng 44 và 47); nhánh non-inverted mới đảo. Logic đúng nhưng dòng 44 (khởi tạo) dư thừa/gây nhầm — dead-ish code.

### Tích cực (không phải lỗi)
- NVS store (config/ota/session): xử lý size-mismatch → erase, NUL-terminate phòng thủ, commit sau set_blob, luôn `nvs_close` kể cả lỗi. Migration v1 có clamp bound. Rất chắc.
- `tracker-runtime-ports.c`: validate fail-fast toàn bộ port + callback bắt buộc trước khi wiring → chống NULL-call crash. Tốt.
- adc_reader.c: oversample, bỏ mẫu lỗi, fallback công thức khi không calib, chia 0 được chặn. Tốt.
- modem_at TX: `modem_at_write_all_bytes` loop tới hết + `uart_wait_tx_done`. Tốt.

## Câu hỏi mở
1. `imu_get_peak_accel_delta_mps2` và `imu_reset_accel_delta_window` có được gọi từ **cùng một task** không? Nếu khác task → cần mutex (MEDIUM thành HIGH).
2. IMU (I2C_NUM_0) và DS3231 dùng chung bus — rtc_ds3231m.c có reuse `i2c_master_get_bus_handle` giống IMU không? (verify ở 11b).
3. `modem_at_response_done` false-positive "OK/ERROR" trong payload GNSS/HTTP đã từng gây bug cắt response chưa? Có test coverage cho response đa dòng dài không?
4. RX buffer 1KB + no flow control: burst NMEA GNSS đầy đủ trong 1 chu kỳ có vượt 1KB gây `fifo_overflow` → mất fix không?
5. Bug "publish timeout" từng đề cập: cần đối chiếu `mqtt_publish.c`/`mqtt_session.c` — xem report **11b**.

## Lưu ý về mức verify
Các finding gắn **verified** ở trên là từ source đọc trực tiếp: modem_at.c, modem_lte.c, imu_lis3dsh.c, adc_reader.c, power_mgr.c, config_store_nvs.c, nvs_config.c, ota_context_store_nvs.c, tracker-runtime-ports.c, toàn bộ header. Nhóm **BLE (ble_mgr/ble_obd/ble_util/ble_init), MQTT (mqtt_client/publish/session/urc_parser/topics), modem_gnss, sd_log_store, rtc_ds3231m** được quét bổ sung ở **11b-firmware-ble-mqtt.md** (đặc biệt BLE GATT callback race, OBD PID parse, MQTT publish timeout/QoS).
