# SIM7600 GNSS Guide

## Mục tiêu
Hướng dẫn đọc đúng phần GNSS của SIM7600CE trong project hiện tại: bật GNSS, lấy fix, parse `+CGNSINF`, hiểu timeout, và biết khi nào cần xác minh trên hardware thật.

## GNSS flow trong project
### Bật GNSS
```text
modem_gnss_power_on() -> AT+CGNSPWR=1 -> GNSS powered flag = true
```

### Lấy sample
```text
modem_gnss_get_location()
  -> requires GNSS powered
  -> AT+CGNSINF
  -> parse CSV payload
  -> fill gnss_data_t
```

### Tắt GNSS
```text
modem_gnss_power_off() -> AT+CGNSPWR=0 -> powered flag = false
```

## Dữ liệu project đang lấy
Từ `+CGNSINF`, code hiện trích:
- fix valid
- latitude
- longitude
- speed_kmh
- course_deg
- satellites
- timestamp_ms

## Mapping field hiện tại
| Field | Source position in parser | Meaning | Classification | Confidence |
|---|---|---|---|---|
| `fix_valid` | field[1] | 1 = valid fix | Project inference / common SIMCom GNSS output | High |
| `latitude` | field[3] | Latitude | Project inference | High |
| `longitude` | field[4] | Longitude | Project inference | High |
| `speed_kmh` | field[6] | Speed | Project inference | Medium |
| `course_deg` | field[7] | Course/bearing | Project inference | Medium |
| `satellites` | field[14] + field[15] | GPS + GLONASS count | Project inference | Medium |
| `timestamp_ms` | field[2] | GNSS UTC timestamp converted to ms | Project inference | Medium |

## Parse behavior
### Timestamp parser
- Nhận chuỗi kiểu `YYYYMMDDhhmmss.xxx`
- Dùng `mktime()` để chuyển sang epoch-like value
- Nếu parse fail thì fallback về uptime

### Stale data guard
Nếu fix không valid:
- latitude = 0
- longitude = 0
- satellites = 0

Điều này giúp tránh publish tọa độ cũ.

## GNSS command architecture
| Command | Mục đích | Current status | Classification |
|---|---|---|---|
| `AT+CGNSPWR=1` | Bật GNSS engine | Implemented | Vendor-family behavior, verify with SIMCom manual |
| `AT+CGNSPWR=0` | Tắt GNSS engine | Implemented | Vendor-family behavior, verify with SIMCom manual |
| `AT+CGNSINF` | Đọc trạng thái / fix / tọa độ | Implemented | Vendor-family behavior |

## SIM7600 vs SIM7600CE cho GNSS
### Giống nhau
- Cả hai được project xử lý như modem LTE + GNSS tích hợp
- Cùng mô hình query GNSS bằng AT command
- Cùng cần bật nguồn GNSS trước khi đọc sample

### Khác nhau / cần kiểm chứng
| Điểm | Khả năng khác biệt | Confidence | Hardware test |
|---|---|---|---|
| Có hỗ trợ same GNSS command set hay không | Có thể gần như giống, nhưng phải đối chiếu đúng manual SKU | Medium | Gửi `AT+CGNSPWR?` / `AT+CGNSINF` trên board thật |
| GNSS fix latency | Phụ thuộc anten / layout / RF path | Low | Đo TTFF ở open sky |
| Satellite field layout trong `+CGNSINF` | Có thể khác tùy firmware modem | Low/Medium | Log raw response và compare với parser |

## Timeout / retry / recovery
| Scenario | Current behavior | Risk | Test xác minh trên hardware thật |
|---|---|---|---|
| GNSS off | `ESP_ERR_INVALID_STATE` | Caller phải bật trước | Call `modem_gnss_get_location()` trước `CGNSPWR=1` |
| `AT+CGNSINF` timeout | Return `ESP_FAIL` | Mất sample cycle | Measure response time across cold and warm start |
| No fix | Clear coordinates and satellites | Good stale-data guard | Compare response when antenna bị che vs clear sky |
| Bad timestamp | Fallback uptime | May lose wall-clock alignment | Compare parsed time with known GNSS time source |

## Current project implementation cross-check
| Area | Current implementation | Assessment |
|---|---|---|
| GNSS power control | Có | Tốt |
| GNSS fix flag | Có | Tốt |
| Raw response parser | Có | Đủ cho telemetry cơ bản |
| Cold/warm start policy | Chưa có | Nên bổ sung tài liệu/test |
| Antenna health diagnostics | Chưa có | Nên bổ sung bench test |
| UTC sanity validation | Chưa có | Nên thêm log khi time parse fail |

## Bench verification checklist
- [ ] Xác nhận `AT+CGNSPWR=1` trả OK rồi mới query sample
- [ ] Đo TTFF ở lần cold start và warm start
- [ ] So sánh fix/no-fix response có sạch tọa độ cũ không
- [ ] Kiểm tra field order của `+CGNSINF` trên firmware modem thực tế
- [ ] Đo satellites count trong open sky
- [ ] Xác minh timestamp parse bằng log raw response

## Đề xuất cải tiến tài liệu / test
- Mẫu log raw `+CGNSINF` từ board thật
- Bảng mapping field theo modem firmware version
- TTFF benchmark template
- Antenna placement note và expected failure signature
- Checklist phân biệt GNSS fail do RF, do SIM, hay do AT transport

## Nguồn tham khảo
### Project files
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/modem_gnss.h`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`

### Official / vendor references
- [SIM76XX Series AT Command Manual listing](https://en.simcom.com/technical_files.html)
- [SIM7500/SIM7600 GNSS Application Note](https://en.simcom.com/product/SIM7600X-H-M2.html)
- [SIM7600 family AT command manual listing](https://en.simcom.com/product/SIM7600NAG.html)
- [SIM7600X-PCIE product page with GNSS note](https://www.simcom.com/product/SIM7600X-PCIE.html)
- [ESP-IDF UART documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/uart.html)