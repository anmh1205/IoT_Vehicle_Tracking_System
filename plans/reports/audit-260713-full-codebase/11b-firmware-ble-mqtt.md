# Audit 11b — Firmware BLE OBD + MQTT SIM7600 + GNSS/SD/RTC (READ-ONLY, line-level)

Base dir: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware`
Phạm vi: nhóm file chưa verify ở audit 11 (không đọc lại modem_at/modem_lte/imu/power/adc/nvs).
Phương pháp: đọc IN FULL từng file (file lớn đọc theo chunk 500 dòng). Mọi finding = `path:line` + severity + trạng thái verify.

## Bảng coverage per-file

| # | File | Dòng | Trạng thái đọc |
|---|------|------|----------------|
| 1 | components/adapter-ble-obd-nimble/src/ble_mgr.c | 1003 | FULL (1-1003) |
| 2 | components/adapter-ble-obd-nimble/src/ble_obd.c | 912 | FULL (1-912) |
| 3 | components/adapter-ble-obd-nimble/src/ble_init.c | ~ (9.9KB) | FULL (context trước) |
| 4 | components/adapter-ble-obd-nimble/src/ble_util.c | ~ (2.5KB) | FULL (context trước) |
| 5 | components/adapter-ble-obd-nimble/include/ble_mgr.h | ~ (6.9KB) | FULL |
| 6 | components/adapter-ble-obd-nimble/include/ble_obd.h | ~ (5.4KB) | FULL |
| 7 | components/adapter-mqtt-sim7600-at/src/mqtt_client.c | 283 | FULL |
| 8 | components/adapter-mqtt-sim7600-at/src/mqtt_publish.c | 246 | FULL (1-246) |
| 9 | components/adapter-mqtt-sim7600-at/src/mqtt_session.c | 1477 | FULL (1-1477, 3 chunk) |
| 10 | components/adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c | 1110 | FULL (1-1110, 3 chunk) |
| 11 | components/adapter-mqtt-sim7600-at/src/mqtt_topics.c | 137 | FULL |
| 12 | components/adapter-mqtt-sim7600-at/include/mqtt_internal.h | 219 | FULL |
| 13 | components/adapter-mqtt-sim7600-at/include/mqtt_client.h | 151 | FULL |
| 14 | components/adapter-modem-sim7600-at/src/modem_gnss.c | 929 | FULL (1-929, 2 chunk) |
| 15 | components/adapter-modem-sim7600-at/include/modem_gnss.h | ~ (1.6KB) | FULL |
| 16 | components/adapter-rtc-ds3231m/src/rtc_ds3231m.c | 411 | FULL (1-411) |
| 17 | components/adapter-rtc-ds3231m/include/rtc_ds3231m.h | 67 | FULL |
| 18 | components/adapter-storage-sdmmc-fatfs/src/sd_log_store.c | 964 | FULL (1-964, 2 chunk) |
| 19 | components/adapter-storage-sdmmc-fatfs/include/sd_log_store.h | 175 | FULL |

Tổng: 19 file, ~8.900 dòng đọc line-level.

---

## FINDINGS theo severity

### CRITICAL

**C-1 — Use-after-free: notify callback tham chiếu `ctx` đã free sau disconnect** (verified)
`ble_obd.c:701` `ble_obd_disconnect()` gọi `free(ctx)` nhưng KHÔNG gỡ đăng ký notify callback. Callback đã được gắn ở `ble_obd.c:658` (`s_obd_chars[1].notify_cb = ble_obd_notify_cb`) và biến này là **static/global**, vẫn trỏ tới hàm với `usr_ctx = ctx`. `ble_mgr_disconnect()` (`ble_mgr.c:970`) chỉ chờ tối đa `BLE_DISCONNECT_WAIT_MS=1200ms` (`ble_mgr.c:990-1001`) rồi bỏ qua (break) nếu link chưa tear-down. Nếu một `BLE_GAP_EVENT_NOTIFY_RX` tới trên NimBLE host task SAU khi `free(ctx)` chạy, `ble_mgr_gap_notification_cb` (`ble_mgr.c:379`) gọi `notify_cb(..., mgr_ctx->usr_ctx)` → `ble_obd_notify_cb` deref con trỏ `ctx` đã giải phóng (`ble_obd.c:509` ghi `ctx->rx_data.buf`) → heap corruption. `mgr_ctx->usr_ctx` cũng không được clear khi disconnect.
→ Đề xuất verify: cần clear `s_obd_chars[i].notify_cb`/`mgr_ctx->usr_ctx` và chờ tear-down chắc chắn trước khi free.

### HIGH

**H-1 — Data race: state singleton BLE bị NimBLE host task ghi KHÔNG giữ `lock_mtx`** (verified)
`ble_mgr.c:78-79` khai báo `lock_mtx` "serializes public API calls". API (`ble_mgr_send:923`, `ble_mgr_connect_service:864`) lấy mutex khi đọc/ghi `is_connected`, `conn_handle`. Nhưng các callback GAP/GATT chạy trên NimBLE host task ghi trực tiếp các field này **không giữ mutex**: `ble_mgr_gap_event_cb` `BLE_GAP_EVENT_DISCONNECT` set `conn_handle=NONE; is_connected=false` (`ble_mgr.c:700-703`); `ble_mgr_connect_complete` set `is_connected/conn_handle` (`ble_mgr.c:258-264`); `ble_mgr_gap_connected_cb` set `conn_handle=conn_handle` (`ble_mgr.c:569`). Đồng thời `ble_mgr_send:927-932` đọc `is_connected` rồi dùng `conn_handle` cho `ble_gattc_write_flat` không đồng bộ với writer → có thể gửi trên handle vừa bị vô hiệu (TOCTOU). Các field không `volatile`, không atomic. HIGH.

**H-2 — Publish timeout mismatch: AT wait (30s) < modem publish op timeout (120s) → báo fail sai, nguy cơ trùng/mất message** (verified)
`mqtt_publish.c:137-142` build `AT+CMQTTPUB=idx,qos,120,0,0` khai báo timeout publish = `MQTT_DEFAULT_PUBLISH_TIMEOUT_S=120s`. Nhưng `mqtt_publish.c:147` gửi lệnh với `MQTT_CONNECT_TIMEOUT_MS=30000` (30s), và nếu không parse được inline result thì `tracker_mqtt_wait_publish_result` (`mqtt_urc_parser.c:520-537`) chỉ chờ thêm `MQTT_CONNECT_TIMEOUT_MS=30s`. Tổng ~30–60s < 120s modem thực sự có thể bận (`optimeout=120s`, `mqtt_session.c:768`). Khi mạng chậm, firmware trả `-1` (fail) trong khi modem VẪN publish thành công sau đó → tầng trên re-enqueue: QoS1 gây message trùng, và với QoS0 (rawdata) cũng đếm sai/gửi lại. Đây đúng vùng "bug publish timeout" cần soi. HIGH.

**H-3 — TLS không verify server cert theo mặc định (MITM)** (verified)
`mqtt_session.c:56-58` mặc định `CONFIG_TRACKER_TLS_VERIFY_SERVER=0`. `tracker_mqtt_configure_tls` set `AT+CSSLCFG="authmode",ctx,0` (`mqtt_session.c:659-663`) → modem KHÔNG kiểm tra chứng chỉ broker. Host `TRACKER_MQTT_TLS_HOST="mqtt.thingdock.dev"` bị ép implicit TLS cổng 8883 (mqtt_internal.h) nhưng kết nối "TLS mà không xác thực" ⇒ dễ bị man-in-the-middle, lộ credential/telemetry. `configure_tls_certificate` chỉ upload CA khi verify bật (`mqtt_session.c:571-599`). HIGH (security). Cần bật verify + provision CA cho field build.

### MEDIUM

**M-1 — Credential (username/password) có thể lọt vào log lifecycle** (verified, điều kiện)
`mqtt_session.c:864-871` build `AT+CMQTTCONNECT=...,"user","pass"` bằng snprintf. `tracker_mqtt_send_lifecycle_cmd` khi thất bại log nguyên `cmd=\"%s\"` (`mqtt_session.c:528`, `:540`). Nếu đường connect được định tuyến qua `send_lifecycle_cmd` (hoặc bất kỳ path nào log `cmd`), mật khẩu broker in ra log. Cần xác nhận `tracker_mqtt_connect_once` (dòng 1001+) có dùng path log-cmd không. MEDIUM (rủi ro lộ secret trong log).

**M-2 — CCCD subscribe ghi cứng `val_handle + 1`, không discover descriptor** (verified)
`ble_mgr.c:474-479` ghi CCCD tại `chr->val_handle + 1` giả định descriptor CCCD nằm ngay sau value attribute. Không thực hiện descriptor discovery. Với adapter OBD có layout khác (ví dụ có thêm descriptor xen giữa) → ghi sai handle → notify không bao giờ bật, transaction luôn timeout. Comment tự thừa nhận là quy ước. MEDIUM (fragile theo thiết bị).

**M-3 — Race URC state giữa RX task và publish/connect wait task** (cần verify runtime)
`tracker_mqtt_on_urc_line` (`mqtt_urc_parser.c:1063`) ghi `s_connected`, `s_publish_result_ready/err`, `s_connect_result_*`, `s_rx_ctx`. Các wait-loop (`:492`, `:520`) tự gọi `modem_at_poll_urc` trên chính task của mình (mô hình 1 task). Nhưng `tracker_mqtt_register_urc_handler` (`:1103-1109`) hook handler vào modem_at — nếu modem_at gọi handler này từ một RX task riêng, các cờ chia sẻ không atomic/không mutex → race (mất/nhân đôi result, đọc `s_rx_ctx` nửa vời). MEDIUM. Cần xác nhận modem_at invoke URC handler trên task nào.

**M-4 — GNSS timestamp fallback = uptime_ms bị coi như epoch** (verified)
`modem_gnss.c:97,111,144,258,270` khi parse UTC lỗi trả `util_uptime_ms()` gán vào `timestamp_ms` (epoch). Uptime (vài giây/phút) ⇒ timestamp ~1970 → record mang thời gian sai lệch. Có `time_trusted` xử lý ở tầng trên nhưng giá trị epoch vẫn gây nhầm lẫn diagnostics/sắp xếp. MEDIUM.

**M-5 — Không nhất quán đơn vị speed giữa CGNSINF và CGPSINFO** (verified, cần đối chiếu spec)
`modem_gnss.c:526` CGNSINF: `speed_kmh = atof(fields[6])` (coi field 6 là km/h, không nhân hệ số). `modem_gnss.c:443` CGPSINFO: `speed_kmh = atof(fields[7]) * 1.852` (coi knot → km/h). Theo SIMCom, CGNSINF speed (field 7 zero-based / cột "Speed Over Ground") thực ra là km/h, còn CGPSINFO là knot — nên có thể đúng, nhưng index CGNSINF `fields[6]` (0-based thứ 7) cần đối chiếu chính xác contract SIM7600 (một số firmware trả knot). MEDIUM — verify với datasheet lô modem đang dùng.

**M-6 — SD log tăng không giới hạn khi broker không ACK critical** (verified)
`sd_log_store.c:847-941` `gc_if_needed` chỉ compact khi vượt hard quota, và chỉ drop record `critical==0 && seq<=ack_seq_critical` (`:893`). Nếu toàn bộ record là critical (hoặc broker không bao giờ nâng `ack_seq_critical`), GC không giải phóng được gì → file `queue.log` phình qua quota → đầy thẻ → `append` fail (`:677-681`) → degraded. Không có cơ chế drop critical cũ nhất / cap tuyệt đối. MEDIUM.

**M-7 — BLE disconnect wait dựa trên field không volatile, poll busy** (verified)
`ble_mgr.c:990` vòng chờ đọc `mgr_ctx->conn_handle/is_connected/is_connecting` do callback (task khác) cập nhật, không `volatile`/barrier. Compiler có thể cache → vòng chờ có thể không thấy thay đổi và luôn chạy đủ `BLE_DISCONNECT_WAIT_MS` rồi break. MEDIUM (kết hợp H-1).

### LOW

- **L-1** `ble_obd.c:106-115` `s_obd_chars`/`s_obd_service` là global dùng chung; `ble_mgr_connect_service:877-879` reset handle trên svc_def chia sẻ. An toàn vì chỉ 1 instance OBD, nhưng không tái nhập được. (verified)
- **L-2** `rtc_ds3231m.c:328` `tm_year = 100 + bcd(regs[6])` bỏ qua century bit (regs[5] bit7); chỉ đúng 2000-2099. Bị chặn bởi range hợp lệ [2024,2100). (verified)
- **L-3** RTC/GNSS/SD context không mutex; `s_ctx.time_valid`, `s_last_gnss`, `s_ctx.meta` ghi không đồng bộ nếu truy cập đa task. Driver I2C/FS tự serialize transaction nhưng field trạng thái thì không. (verified)
- **L-4** `ble_obd.c:412` chỉ nhận token hex chẵn ký tự `>=2`; response định dạng lạ (lẻ) có thể bị bỏ. Với ATE0/ATS0 (echo & space off) thì OK. (verified)
- **L-5** `mqtt_publish.c:116` `char cmd[96]` đủ cho header CMQTTTOPIC/PAYLOAD/PUB (payload/topic stream riêng), không tràn. (verified — không phải lỗi, ghi nhận)
- **L-6** `mqtt_topics.c` build topic `v1/{device_id}/...`; device_id từ config nội bộ (không phải input mạng) nên injection thấp; có cảnh báo truncation. (verified)
- **L-7** GNSS: nhiều biến static self-heal/backoff (`modem_gnss.c:52-82`) — không phải dead code, dùng trong self-heal/no-fix recover. Không thấy TODO/FIXME/HACK trong scope. (verified)

---

## Ghi nhận điểm TỐT (để không sửa nhầm)
- SD: ordering "ghi log → fsync → update meta" ưu tiên trùng hơn mất; rotation temp/bak/live crash-safe (`sd_log_store.c:111-167`, `:232-326`). Chống truncated line (`:375-388`) và validate payload NUL/newline trước khi append (`:665-673`). Vững.
- RTC I2C bus reuse xử lý đúng `ESP_ERR_INVALID_STATE` bằng `i2c_master_get_bus_handle` (`rtc_ds3231m.c:239-247`), tránh xung đột với IMU trên I2C_NUM_0; `owns_bus` gate cleanup đúng.
- MQTT URC RX reassembly (`mqtt_urc_parser.c:606-822`) bounded buffer + truncation flag + kiểm tra khớp `topic_total_len/payload_total_len` chính xác trước khi dispatch; xử lý header tách dòng và nhiều URC nối nhau. Robust.
- GNSS phân biệt đúng CGNSINF (lat/lon decimal degrees, `atof` trực tiếp) vs CGPSINFO (ddmm.mmmm qua `parse_nmea_degrees`), range-check tọa độ (`modem_gnss.c:528-538`).
- Publish state machine xử lý cả inline result lẫn async URC (`mqtt_publish.c:156-194`) — thiết kế đúng hướng (vấn đề chỉ ở giá trị timeout, xem H-2).

---

## Câu hỏi mở
1. `modem_at` gọi URC handler (`tracker_mqtt_on_urc_line`) trên task nào? Nếu là RX task riêng thì M-3 lên HIGH (cần bảo vệ `s_connected`/`s_publish_result_*`/`s_rx_ctx`).
2. NimBLE host task và app task: có barrier/`volatile` nào ẩn (qua macro) cho `s_mgr` không? Nếu không, H-1/M-7 xác nhận là race thật.
3. Đường `tracker_mqtt_connect_once` (mqtt_session.c dòng 1001-1477 phần đuôi) có log nguyên `cmd` chứa credential không? Xác nhận M-1.
4. Publish timeout đúng ra là bao nhiêu? Nên đồng bộ AT-wait ≥ `MQTT_DEFAULT_PUBLISH_TIMEOUT_S`+margin để tránh H-2.
5. Lô SIM7600 field: CGNSINF `fields[6]` là km/h hay knot? Cần đối chiếu firmware modem thực tế (M-5).
6. Chính sách khi SD đầy toàn record critical chưa ACK: drop cũ nhất hay chặn? (M-6)
7. `ble_obd_disconnect` có được gọi từ task khác với NimBLE host không, và có đảm bảo không còn notify in-flight trước `free` không? (C-1)
