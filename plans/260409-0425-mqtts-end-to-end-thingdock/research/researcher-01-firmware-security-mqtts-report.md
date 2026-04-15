# Research Report: ESP32-S3 + SIM7600CE-T MQTT over TLS to ThingDock

**Timestamp:** 2026-04-09 04:25:55 Asia/Saigon

## Executive Summary
Mục tiêu production-ready cho stack ESP32-S3 + SIM7600CE-T là: dùng TLS chuẩn broker verification, credentials theo device/tenant, retry có kiểm soát, và secret handling theo hướng provisioning + rotation. Không nên đẩy mọi thứ lên SIM7600 AT layer nếu firmware ESP32 đã giữ được control tốt hơn; nên chọn 1 lớp MQTT/TLS chính, còn SIM7600 dùng như modem transport.

Khuyến nghị mặc định: trust broker bằng CA chain/bundle, chỉ pin leaf/public-key khi có ràng buộc supply-chain hoặc broker rất ổn định; bắt buộc có clock hợp lệ trước khi verify cert. Với auth user/pass, mỗi device nên có credential riêng hoặc credential theo tenant + device_id in username; rotation cần 2-slot secret và grace period. Reliability cần reconnect exponential backoff, inflight cap, offline queue có giới hạn, và idempotency key trong payload để tránh duplicate processing.

## Research Methodology
- Sources consulted: 4
- Date range: vendor docs + current docs (latest available in 2026)
- Key search terms: ESP32 MQTT TLS certificate validation, SIM7600 MQTT AT TLS username password, reconnect backoff outbox, offline queue idempotency key

## Key Findings

### 1. TLS strategy trên thiết bị
- **CA chain handling:** mặc định dùng CA chain hoặc certificate bundle để verify broker `mqtts://mqtt.thingdock.dev`.
- **Pinning decision matrix:**
  - **CA bundle/chained trust:** chọn mặc định; ít vận hành nhất, dễ rotate broker cert.
  - **Leaf pinning:** chỉ dùng khi broker cert rất ổn định và muốn chặn rogue CA; chi phí rotate cao.
  - **SPKI/public-key pinning:** cân bằng hơn leaf pinning; vẫn đòi hỏi process rotate rõ.
- **Clock/RTC dependency:** verify cert chỉ đáng tin khi thời gian đã sync. Nếu boot chưa có time, device phải:
  1) sync NTP/RTC trước
  2) hoặc tạm giữ connect cho đến khi time valid
  3) tuyệt đối không tắt verify để “cho chạy tạm”.
- **SIM7600 vs ESP32 control:** nếu firmware ESP32 đã terminate MQTT/TLS, giữ modem ở vai trò data transport; tránh chia TLS context giữa modem AT và app trừ khi bắt buộc.

### 2. Auth strategy user/pass và rotation
- **Theo device là tốt nhất:** username/password riêng cho từng device; nếu tenant-based, username nên encode tenant + device_id để audit rõ.
- **Secret rotation khả thi:**
  - lưu **2 credential slots** (active + next)
  - broker chấp nhận grace period ngắn cho credential cũ
  - firmware pull credential mới qua kênh quản trị an toàn hoặc provisioning flow
  - rotate theo batch, không đồng loạt nếu fleet lớn.
- **Fallback:** nếu dùng password tĩnh lâu dài là debt; chốt roadmap bỏ dần sang per-device secret hoặc short-lived token khi backend hỗ trợ.

### 3. Publish reliability
- **Reconnect backoff:** exponential backoff + jitter; reset backoff sau khi connect ổn định.
- **Inflight control:** giới hạn QoS1 inflight thấp và ổn định; tránh memory spike khi link chập chờn.
- **Offline queue:**
  - giữ queue bounded theo count + bytes
  - ưu tiên status/events/commands; rawdata QoS0 có thể drop khi đầy
  - persist chỉ phần cần thiết; nếu flash wear là concern, giữ RAM queue ngắn + loss-tolerant policy.
- **Idempotency key:** bắt buộc trong payload cho QoS1/status/events/commands. Key nên gồm `device_id + monotonic_seq + boot_id + timestamp_bucket`.
- **QoS policy:** rawdata QoS0 ok; status/events/firmware/commands QoS1.

### 4. Security hardening checklist cho firmware
- Không lưu plain secrets trong source, log, NVS plaintext, hoặc AT command echo.
- Provisioning an toàn: inject credential qua factory/provisioning tool, khóa debug sau sản xuất.
- Redact log: che username/password, token, IMEI nếu log public.
- Validate broker host + SNI; không cho connect IP trần nếu cert name mismatch.
- Enable secure boot / flash encryption nếu platform build hỗ trợ.
- Rate-limit reconnect để tránh storm và SIM/data drain.
- Drop unknown commands; command topic cần schema + authz server-side.
- Watchdog cho MQTT task và modem state machine.

### 5. Decision log items cần chốt với owner
1. Chọn trust model: CA bundle hay pinning?
2. Nguồn time chuẩn: NTP qua ESP32 hay modem-assisted time?
3. Credential model: per-device hay per-tenant?
4. Rotation channel: OTA config, provisioning app, hay backend push?
5. Offline queue: RAM only hay persist một phần?
6. Idempotency contract: format key, TTL dedupe ở backend?
7. QoS cuối cùng cho từng topic con.
8. Mức log redaction và mức debug cho production.

## Comparative Analysis
- **CA bundle > leaf pinning** cho vận hành fleet lớn.
- **Per-device secret > shared tenant secret** về blast radius và audit.
- **Queue bounded + idempotency > unlimited retry** về ổn định production.

## Implementation Recommendations
### Quick Start Guide
1. Sync time trước TLS connect.
2. Load broker CA bundle.
3. Connect MQTT với user/pass riêng device.
4. Enqueue QoS1 with bounded outbox.
5. Add idempotency key to all non-raw payloads.
6. Retry with exponential backoff + jitter.

### Common Pitfalls
- Bật `skip verify` để test rồi quên bật lại.
- Dùng shared password cho cả fleet.
- Không giới hạn queue/inflight.
- Không xử lý cert expiry / clock drift.
- Log lộ password hoặc topic command payload.

## Resources & References
### Official Documentation
- Espressif ESP-MQTT Programming Guide: https://docs.espressif.com/projects/esp-mqtt/en/latest/esp32/
- Espressif ESP-FAQ MQTT: https://docs.espressif.com/projects/esp-faq/en/latest/software-framework/protocols/mqtt.html
- Espressif ESP-IDF MQTT/TLS guide: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/protocols/mqtt.html
- SIMCom SIM7600 MQTT AT Command Manual: https://simcom.ee/documents/SIM7X00/SIM7500_SIM7600_SIM7800%20Series_MQTT_AT%20Command%20Manual_V1.00.pdf

### Community / Vendor Notes
- SIMCom product page: https://en.simcom.com/product/SIM7600NA.html

## Appendices
### A. Glossary
- **CA bundle:** tập hợp CA tin cậy để verify broker cert.
- **SPKI pinning:** ghim public key, linh hoạt hơn leaf pinning.
- **Idempotency key:** khóa chống xử lý lặp ở backend.

## Unresolved Questions
- ThingDock yêu cầu CA public hay private CA?
- Broker có support per-device username/password lifecycle API không?
- Backend dedupe window cho idempotency key là bao lâu?
- SIM7600 dùng làm modem thuần hay có AT MQTT path trong bản firmware cuối?
