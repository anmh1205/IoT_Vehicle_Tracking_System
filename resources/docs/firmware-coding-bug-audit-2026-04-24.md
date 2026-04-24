# Firmware Coding Bug Audit (Focused)

Date: 2026-04-24  
Scope: `iot-vehicle-tracking-system-firmware/main`  
Method: static code review (không build/run được vì thiếu `idf.py` trong môi trường hiện tại)

## Kết luận nhanh
- Có lỗi coding thực tế cần sửa.
- Ưu tiên sửa ngay: MQTT prompt detection + GNSS timestamp parsing.

## Findings (coding bugs only)

### 1) [High] Nhận diện prompt MQTT quá rộng, dễ false-positive
- File: `main/src/mqtt_client.c`
- Line: 451-459
- Chi tiết:
  - `tracker_mqtt_response_has_prompt()` trả `true` cho mọi chuỗi có `">"` vì điều kiện cuối `strstr(response, ">") != NULL`.
  - Trong `tracker_mqtt_input_data()` line 472-497, false-positive này có thể làm flow coi như đã có prompt và tiếp tục gửi payload sai thời điểm.
- Impact:
  - Lệch state AT transaction, lỗi publish/subscribe ngẫu nhiên, khó reproduce.
- Hướng sửa:
  - Bỏ matcher `strstr(response, ">")`.
  - Chỉ chấp nhận prompt theo mẫu line-boundary rõ ràng (`\r\n>\r\n`, hoặc `\n>\r\n` tùy modem thực tế).

### 2) [High] Parse UTC GNSS bằng `mktime()` (local-time API)
- File: `main/src/modem_gnss.c`
- Line: 74-103, 180-212
- Chi tiết:
  - `modem_gnss_parse_timestamp()` và `modem_gnss_parse_cgpsinfo_timestamp()` parse dữ liệu UTC nhưng convert bằng `mktime()` (theo local timezone).
- Impact:
  - Nếu timezone runtime khác UTC: lệch timestamp, sai `timestamp_trusted`, sai ordering event, sai OTA deadline logic dựa trên thời gian.
- Hướng sửa:
  - Dùng conversion UTC cố định (helper tự convert epoch UTC, hoặc `timegm` nếu platform đảm bảo).

### 3) [Medium] Không kiểm tra kết quả `sscanf` khi parse timestamp GNSS
- File: `main/src/modem_gnss.c`
- Line: 83-91
- Chi tiết:
  - `sscanf(...)` không kiểm tra số field parse thành công.
  - Input malformed nhưng đủ dài vẫn có thể đi tiếp vào `mktime()`, sinh timestamp sai thay vì fallback.
- Impact:
  - Sai timestamp ngầm (silent data corruption), khó detect ở production log.
- Hướng sửa:
  - Check `sscanf(...) == 7` trước khi dùng dữ liệu.
  - Validate range từng field (month/day/hour/min/sec) trước convert.

### 4) [Medium] Logic GNSS loại bỏ tọa độ hợp lệ trên xích đạo/kinh tuyến gốc
- File: `main/src/modem_gnss.c`
- Line: 686-687
- File: `main/src/data_formatter.c`
- Line: 465-467
- Chi tiết:
  - Điều kiện coi fix hợp lệ yêu cầu `latitude != 0.0 && longitude != 0.0`.
  - Trường hợp hợp lệ ở lat=0 hoặc lon=0 bị đánh sai thành no-fix.
- Impact:
  - Mất dữ liệu vị trí hợp lệ ở vùng biên tọa độ, sai analytics và state.
- Hướng sửa:
  - Dựa vào `fix_valid` + `satellites` + quality fields, không hard reject theo giá trị `0.0` đơn lẻ.

### 5) [Low] Leak resource ở error-path
- File: `main/src/nvs_config.c`
- Line: 343-359
- Chi tiết:
  - Sau `nvs_open()`, nhánh `ESP_RETURN_ON_FALSE(err == ESP_OK, ...)` tại line 358 có thể return mà chưa `nvs_close(handle)`.
- File: `main/src/modem_at.c`
- Line: 250-263
- Chi tiết:
  - Nếu `xSemaphoreCreateMutex()` fail sau khi UART driver đã install/config xong, function return luôn, không rollback `uart_driver_delete`.
- Impact:
  - Leak handle/resource khi gặp lỗi hiếm (OOM / lỗi NVS runtime), làm lần init sau khó ổn định.
- Hướng sửa:
  - Chuyển sang pattern `goto cleanup` cho các nhánh lỗi sau khi đã acquire resource.

## Đề xuất ưu tiên sửa
1. Sửa Finding #1 (MQTT prompt false-positive).
2. Sửa Finding #2 + #3 (timestamp GNSS parse/convert).
3. Sửa Finding #4 (điều kiện valid GNSS).
4. Dọn #5 (error-path cleanup) để tăng độ bền hệ thống.

## Unresolved questions
- Với modem SIM7600 đang dùng bản firmware nào, prompt chính xác trong thực tế trả về pattern nào (`\r\n>\r\n` hay biến thể khác)?
- Runtime có set timezone khác UTC ở bất kỳ điểm nào không (IDF/newlib env `TZ`)?
