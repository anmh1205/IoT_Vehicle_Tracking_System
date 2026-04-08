# Research: chiến lược tích hợp RTC DS3231M cho ESP32-S3 tracker

## Kết luận nhanh
DS3231M nên được tích hợp như một **clock source/fallback độc lập**, không trộn vào logic modem/MQTT. Release đầu nên chỉ làm 3 việc: **probe -> đọc/ghi giờ -> xác định time valid/invalid**, rồi để state machine quyết định đồng bộ boot-time.

## Bằng chứng nội bộ
- Chưa có driver DS3231M trong source tree; tài liệu thiết kế chỉ mô tả “future driver”, không có implementation thực tế. `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/07_rtc/rtc_driver_design_notes.md:4-5,16`
- Guide cũng xác nhận firmware hiện **không có driver** và mọi hành vi register/alarm/status vẫn cần verify theo datasheet. `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/07_rtc/ds3231m_programming_guide.md:4-5,15-16`
- RTC nằm trên **shared I2C0** cùng IMU. `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/hardware_pin_mapping.md:12-13,32-35`
- State machine hiện đã dùng `RTC_DATA_ATTR` cho retained state nội bộ, nhưng đó **không phải** DS3231M. `iot-vehicle-tracking-system-firmware/main/src/state_machine.c:52-59`

## Khoảng trống hiện tại
1. **Chưa có driver thật**: chưa có module `rtc_ds3231m.*`/`ds3231m.*`, chưa có probe/read/write/status API.
2. **Chưa có boot-time sync policy rõ**: tài liệu mới nói “ask higher-level state machine to reconcile from network or default policy”, nhưng chưa chốt source of truth. `rtc_driver_design_notes.md:35-40`, `ds3231m_programming_guide.md:25-31`
3. **Chưa có quy ước degrade** khi RTC lỗi/giờ không tin cậy.
4. **Chưa xác nhận pin alarm/wake** có thật sự nối MCU hay chỉ I2C polling. `ds3231m_programming_guide.md:18-21`

## Thiết kế tối giản cho release đầu
### Module boundary
- `rtc_ds3231m.h/.c` chỉ giữ I2C transaction + health/status + time read/write.
- Không chứa timezone, MQTT, deep sleep, telemetry format.
- Trả về `esp_err_t` cho mọi entrypoint hardware-facing. `ds3231m_programming_guide.md:79-84`

### API gợi ý
- `esp_err_t rtc_ds3231m_init(const rtc_ds3231m_config_t *cfg)`
- `esp_err_t rtc_ds3231m_probe(bool *present)`
- `esp_err_t rtc_ds3231m_get_time(struct tm *out, bool *valid)`
- `esp_err_t rtc_ds3231m_set_time(const struct tm *in)`
- `esp_err_t rtc_ds3231m_get_health(rtc_health_t *health)`
- `esp_err_t rtc_ds3231m_sync_policy_apply(rtc_sync_source_t source)`

### Integration points
- `state_machine.c`: quyết định khi nào tin RTC, khi nào sync từ modem/network.
- `offline_queue`: khi enqueue timestamp, dùng RTC nếu `valid=true`; nếu không thì fallback uptime/retained timestamp và gắn cờ “untrusted”.
- `pin_map.h`: chỉ bổ sung nếu bench xác nhận có alarm/wake pin.

## Rủi ro chính + degrade an toàn
### 1) Shared I2C bus (IMU + RTC)
- Rủi ro: contention, latency, lỗi bus lan truyền.
- Giảm thiểu: 1 owner/transaction, bounded retry, timeout ngắn, không busy-loop. `rtc_driver_design_notes.md:42-48`

### 2) Thời gian không tin cậy
- Rủi ro: timestamp sai làm hỏng offline queue, log, replay order.
- Giảm thiểu: giữ `time_valid` flag; nếu false thì không đánh dấu timestamp là authoritative.
- Degrade: dùng uptime-relative timestamp + retain boot counter; khi sync được thì chỉ dùng cho các record mới, không sửa ngược dữ liệu cũ.

### 3) Alarm/wake chưa xác nhận
- Rủi ro: phụ thuộc wake path giả, gây sleep/wake lỗi.
- Giảm thiểu: alarm là optional feature; mặc định disable cho đến khi bench xác nhận. `rtc_driver_design_notes.md:40,57`

## Bench validation bắt buộc
1. Probe U7 trên I2C0 thành công, xác nhận address thật.
2. Đọc status/oscillator state, phân biệt valid/invalid sau power-cycle.
3. Ghi giờ, power-cycle, đọc lại giờ còn giữ được.
4. Test bus share với IMU: chạy song song nhiều transaction, không deadlock.
5. Kiểm tra VBAT/VCC behavior khi mất nguồn chính.
6. Xác nhận có/không alarm hoặc interrupt pin nối MCU.
7. Kiểm tra fallback khi RTC fail: firmware vẫn boot và offline queue vẫn chạy.

## Unresolved questions
- DS3231M có được coi là **source of truth** hay chỉ fallback so với network time?
- U7 alarm/wake pin có route thật lên MCU GPIO không?
- Có cần periodic resync hay chỉ boot-time sync là đủ?
- Offline queue hiện tại lưu timestamp theo kiểu nào để map với `time_valid` flag?
- VBAT của RTC có luôn hiện diện khi board tắt nguồn chính không?
