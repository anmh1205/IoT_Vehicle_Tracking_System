# Research Report: SD logging offline/online queue + ignition session + observability

**Timestamp:** 2026-04-04 17:38 Asia/Saigon

## Executive Summary
- Thiết kế phù hợp nhất: **SDMMC 4-bit + FATFS + `fsync` mỗi record + queue replay FIFO + MQTT QoS1 cho publish critical**.
- Session nên **ignition-only**: chỉ mở session khi ignition ON; tắt publish/flush khi ignition OFF, nhưng vẫn cho phép **drain ngắn** nếu còn online và backlog nhỏ.
- Observability tối thiểu phải đủ để biết: **mất dữ liệu, kẹt queue, replay chậm, SD lỗi, và trạng thái online/offline**.

## Proposed Flows

### 1) Có internet / có GPS
1. GPS fix ok → tạo record.
2. Append record vào SD, `fsync` ngay.
3. Nếu online: enqueue publish theo thứ tự FIFO.
4. MQTT PUBACK → advance ack pointer.
5. Nếu publish fail: giữ record, retry/backoff.

### 2) Mất internet / có GPS
1. GPS fix ok → vẫn append SD.
2. Không publish; chỉ tăng backlog.
3. Khi mạng hồi phục → replay từ ack pointer.

### 3) Có internet / mất GPS
1. Vẫn tạo record “GPS invalid / no-fix”.
2. Ghi status code + timestamp + last-known-position.
3. Publish nếu policy cho phép; nếu không, chỉ log local.

### 4) Mất internet / mất GPS
1. Chỉ ghi record trạng thái tối thiểu.
2. Không block pipeline; không chờ fix vô hạn.
3. Khi recovery, replay theo thứ tự thời gian.

## Queue Replay Design
- **Ordering:** strict FIFO theo record seq tăng dần.
- **Ack pointer:** 1 pointer commit tới record đã PUBACK/xác nhận thành công.
- **Retry/backoff:** exponential backoff + jitter; reset khi reconnect ổn định.
- **Backpressure:** nếu quota gần đầy, giảm tần suất publish/replay; ưu tiên record mới nhất theo policy FIFO GC.
- **Publish contract:** dùng QoS1 cho record cần đảm bảo; QoS0 chỉ cho telemetry chấp nhận mất.

## Session Rules: Ignition-only
- **Start:** ignition ON → mở session, bật GPS/MQTT/queue replay.
- **Stop:** ignition OFF → ngừng tạo session mới, flush trạng thái, đóng session sau grace period ngắn.
- **Reboot during ON:** nếu cờ ignition còn ON, resume session và replay từ ack pointer.
- **Deep sleep:** chỉ vào sleep sau khi commit xong record + update checkpoint; wake theo ignition/RTC rule.
- **Edge case:** ignition bounce cần debounce; không start/stop lặp.

## Observability tối thiểu
Counters/events nên có:
- `sd_write_ok`, `sd_write_fail`, `sd_fsync_fail`
- `queue_depth`, `queue_bytes_used`, `queue_bytes_quota`
- `replay_success`, `replay_retry`, `replay_drop`
- `mqtt_connected`, `mqtt_disconnected`, `puback_lag_ms`
- `gps_fix_ok`, `gps_no_fix`, `gps_age_s`
- Events: `session_start`, `session_stop`, `queue_full`, `quota_hit`, `gc_run`, `sd_corrupt_detected`

## Security / Privacy
- SD là **data-at-rest** rủi ro cao; ESP-IDF docs không cho thấy SD card encryption native sẵn như flash encryption.
- Khuyến nghị tối thiểu: **flash encryption + secure boot + topic ACL + không lưu secret lên SD**.
- Nếu SD chứa dữ liệu nhạy cảm: cân nhắc **mã hóa record ở ứng dụng** trước khi ghi SD.
- Dữ liệu phải có redaction policy cho identifier, token, và payload nhạy cảm.

## Trade-offs
- `fsync` mỗi record: tăng an toàn, giảm throughput và tăng mòn thẻ SD.
- QoS1: đáng tin hơn, nhưng tăng latency và memory pressure.
- Ignition-only: giảm log spam và power draw, nhưng có thể mất vài giây cuối nếu tắt nguồn đột ngột.
- App-level encryption: an toàn hơn, nhưng tăng CPU và phức tạp key management.

## Recommendation
- Chọn **FIFO local journal + ack pointer + QoS1 cho critical + ignition-only session**.
- Dùng **graceful drain ngắn** khi ignition OFF nếu còn online.
- Giữ observability thật nhỏ nhưng đủ để debug backlog, SD health, và replay latency.

## References
- [FATFS / immediate fsync](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/fatfs.html)
- [SDMMC driver](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/storage/sdmmc.html)
- [ESP-MQTT](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/protocols/mqtt.html)
- [ESP-MQTT v5.4 details](https://docs.espressif.com/projects/esp-idf/en/v5.4/esp32/api-reference/protocols/mqtt.html)
- [ESP FAQ MQTT](https://docs.espressif.com/projects/esp-faq/en/latest/software-framework/protocols/mqtt.html)
- [ESP event loop](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/esp_event.html)
- [ESP Wi-Fi driver](https://docs.espressif.com/projects/esp-idf/en/latest/api-guides/wifi.html)
- [ESP32-S3 sleep modes](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/sleep_modes.html)
- [ESP32-S3 security](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/security/security.html)
- [Flash encryption](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/security/flash-encryption.html)
- [NVS encryption](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/nvs_encryption.html)
- [Storage security](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/storage-security.html)

## Unresolved Questions
- Có cần **record-level encryption** hay chỉ flash encryption + ACL là đủ?
- Backlog quota nên tính theo **bytes**, **records**, hay cả hai?
- Khi quota đầy, ưu tiên **drop old sensor noise** hay **preserve last-known-good + critical events**?
- Có cần separate queue cho **critical events** và **best-effort telemetry** không?
