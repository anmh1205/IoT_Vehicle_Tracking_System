# RTC DS3231M

**Scope:** đồng hồ thời gian thực DS3231M, trusted time fallback, chia sẻ I2C với IMU  
**Files chính:** `rtc_ds3231m.c`, `state_wake_prelude.c`, `pin_map.h`  
**Last updated:** 2026-05-05

## 1. Module Này Dùng Để Làm Gì
RTC không phải clock chính của hệ thống. Trong firmware này, nó có ba vai trò rõ:

1. làm nguồn thời gian đáng tin hơn `uptime` khi GNSS chưa sẵn
2. giữ mốc thời gian hợp lệ cho telemetry / status / OTA confirm
3. bootstrap lại sau ngủ sâu hoặc sau reboot khi cloud timestamp chưa quay lại

## 2. Bus Và Pin
Theo `pin_map.h`:

- `PIN_DS3231_SDA = GPIO2`
- `PIN_DS3231_SCL = GPIO1`
- cùng bus với IMU (`I2C_NUM_0`)

Điều này giải thích vì sao driver không assume “tự tạo bus là của riêng mình”. Nó luôn có nhánh reuse bus handle.

## 3. Khái Niệm Nền Cần Biết
| Khái niệm | Ý nghĩa trong code |
|---|---|
| `BCD` | DS3231M lưu time field dưới dạng binary-coded decimal |
| `OSF bit` | oscillator stop flag, dùng để biết time có đáng tin không |
| `time_valid` | cờ runtime của driver, không chỉ là “đọc được I2C” |
| `trusted time window` | source tự giới hạn mốc hợp lệ từ `2024-01-01` đến `2100-01-01` |

## 4. Cấu Trúc Context
Driver giữ `s_ctx`:

- `initialized`
- `available`
- `time_valid`
- `owns_bus`
- `bus_handle`
- `dev_handle`

Mental model đúng:

- `available=true` nghĩa là probe I2C thành công
- `time_valid=true` nghĩa là mốc thời gian vừa đọc/set đang plausible

## 5. Init Flow
Code neo:

```c
esp_err_t rtc_ds3231m_init(void) {
    err = i2c_new_master_bus(...);
    if (err == ESP_ERR_INVALID_STATE) {
        err = i2c_master_get_bus_handle(RTC_DS3231M_I2C_PORT, &s_ctx.bus_handle);
    }
    err = i2c_master_bus_add_device(..., &s_ctx.dev_handle);
    err = rtc_read_regs(RTC_REG_STATUS, &status, 1);
    s_ctx.time_valid = (status & RTC_STATUS_OSF_BIT) == 0;
}
```

Giải thích từng bước:

1. thử tạo `I2C_NUM_0`
2. nếu bus đã tồn tại thì reuse handle
3. add device địa chỉ `0x68`
4. đọc `STATUS`
5. dùng `OSF` để quyết định time có đáng tin hay không

## 6. Read Time Flow
Code neo:

```c
esp_err_t rtc_ds3231m_get_time_ms(uint64_t *out_time_ms) {
    rtc_read_regs(RTC_REG_SECONDS, regs, sizeof(regs));
    tm_value.tm_sec = rtc_bcd_to_dec(regs[0] & 0x7F);
    ...
    rtc_tm_to_epoch_ms_utc(&tm_value, &epoch_ms);
    s_ctx.time_valid = rtc_ds3231m_is_time_valid_ms(epoch_ms);
}
```

### Điều đang xảy ra thật sự
1. đọc 7 register thời gian liên tiếp
2. tách giây, phút, giờ, ngày, tháng, năm
3. hỗ trợ cả 12h mode và 24h mode
4. convert `struct tm` sang epoch ms bằng hàm tự viết, không phụ thuộc timezone libc
5. reject nếu ngoài khoảng hợp lệ

### Vì sao tự convert epoch
Source có comment rất rõ: tránh phụ thuộc timezone/localtime của libc. Đây là lựa chọn đúng cho firmware.

## 7. Write Time Flow
Code neo:

```c
esp_err_t rtc_ds3231m_set_time_ms(uint64_t time_ms) {
    gmtime_r(&epoch_s, &tm_value);
    uint8_t regs[8] = { RTC_REG_SECONDS, ... };
    i2c_master_transmit(s_ctx.dev_handle, regs, sizeof(regs), ...);
    rtc_write_reg(RTC_REG_STATUS, status & ~RTC_STATUS_OSF_BIT);
}
```

Ý nghĩa:

1. epoch ms được đổi sang UTC calendar
2. từng field được encode về BCD
3. write burst vào DS3231M
4. clear `OSF` vì sau khi set time thành công, time có thể được tin lại

## 8. Quan Hệ Với Wake Prelude
Trong `state_wake_prelude.c`, RTC được bootstrap như sau:

1. nếu đọc RTC và time hợp lệ -> dùng luôn
2. nếu RTC chưa valid nhưng GNSS đang có timestamp valid -> set RTC theo GNSS
3. nếu cả hai đều chưa có -> driver retry với backoff

Đây là lý do log kiểu:

```text
RTC bootstrap OK set=... read=...
retry step=rtc_bootstrap err=... next_delay_ms=...
```

## 9. Những Điểm Dễ Đọc Sai
1. RTC không phải source duy nhất của timestamp; nó là fallback/trust bootstrap.
2. `available` và `time_valid` là hai chuyện khác nhau.
3. Lỗi I2C read không đồng nghĩa board mất RTC; có thể chỉ là bus đang nhiễu hoặc driver khác giữ bus.
4. Time đọc được nhưng out-of-range vẫn bị coi là invalid.

## 10. Checklist Debug
| Triệu chứng | Đọc gì |
|---|---|
| `RTC unavailable` | `rtc_ds3231m_init()` có add device được không |
| `time_valid=0` | xem `OSF` hoặc mốc epoch có bị out-of-range không |
| RTC có nhưng publish vẫn dùng uptime | xem bootstrap path trong `state_wake_prelude.c` |
| IMU và RTC chập chờn luân phiên | nghi bus I2C chia sẻ đang có vấn đề |

## 11. Nguồn Nền Để Đối Chiếu
- ESP-IDF I2C bus-device model: <https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/i2c.html>
- DS3231M product/datasheet entry: <https://www.analog.com/en/products/ds3231m.html>

## Unresolved Questions
1. Cần xác nhận trên board thật pull-up I2C ngoài đã đúng chưa, vì RTC và IMU đang cùng bus 400 kHz/100 kHz fallback.
