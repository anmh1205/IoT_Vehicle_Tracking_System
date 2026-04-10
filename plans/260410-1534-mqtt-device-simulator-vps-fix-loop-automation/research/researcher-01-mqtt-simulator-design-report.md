# Research Report: MQTT Device Simulator Design

**Scope:** đề xuất thiết kế script giả lập device publish MQTT cho IoT Vehicle Tracking, ưu tiên độ tin cậy dữ liệu và mô phỏng lỗi nâng cao.

## 1) MQTT contract hiện tại trong repo
Nguồn chính: `README.md`, `Tracking_MqttBridge` handlers, validator.

### Topics
- `v1/{device_id}/rawdata` — device -> server, QoS 0, telemetry chịu mất mát.
- `v1/{device_id}/status` — device -> server, QoS 1, heartbeat/session.
- `v1/{device_id}/events` — device -> server, QoS 1, warning/error/info.
- `v1/{device_id}/firmware` — device -> server, QoS 1, OTA progress/result.
- `v1/{device_id}/commands` — server -> device, QoS 1, remote config/OTA.

### Payload fields nên có cho simulator
Theo schema bridge hiện tại:
- Common metadata: `schema_version`, `message_id` (UUID), `sent_at`, `seq_no?`, `boot_id?`.
- `rawdata`:
  - required: `device_id`, `auth_token`, `timestamp`, `data`
  - optional: `uptime`
  - `data`: `vibration`, `battery_top`, `battery_bot`, `latitude`, `longitude`, `speed`, `course`, `satellites`, `ignition`, `error_code`
- `status`:
  - `status`: `running | stopped`
  - optional: `session_id`
- `events`:
  - `event_type`: `error | warning | info`
  - optional: `code`, `message`
- `firmware`:
  - `jobId`, `status`, `progress`, `targetVersion`, `currentVersion`, `partition`, `error`

### Nhận xét quan trọng
- Bridge đang validate metadata chặt: `schema_version` format `vX.Y.Z`, `message_id` UUID.
- `device_id` trong topic phải khớp payload, sai là drop.
- Có auth token per device.
- Backend ingestion API nội bộ đang dùng camelCase (`deviceId`, `authToken`, `lat/lon/spd...`), nên simulator MQTT phải bám contract bridge, không bám API backend.

## 2) Chiến lược sinh dữ liệu
Mục tiêu: vừa realistic vừa đủ “xấu” để test resilience.

### Base profile
- Tạo tuyến đường/telemetry theo timeline cố định: lat/lon di chuyển mượt, speed thay đổi theo chặng, ignition on/off, battery giảm dần, satellites dao động.
- Tạo `seq_no` tăng đơn điệu per boot.
- `boot_id` mới mỗi lần reconnect/boot.

### Lỗi/biến thể cần mô phỏng
- **Jitter:** random delay nhỏ giữa publish (ví dụ 50–500 ms quanh interval chuẩn).
- **Duplicate:** gửi lại cùng `message_id` / cùng payload sau timeout ngắn.
- **Out-of-order:** phát `seq_no` thấp hơn gói trước hoặc đảo thứ tự 2 gói gần nhau.
- **Spike:**
  - vibration vượt ngưỡng > 500 để tạo alert.
  - speed spike bất thường, battery tụt nhanh, tọa độ nhảy lớn.
- **Reconnect:** ngắt kết nối MQTT, reconnect với clean session thay đổi theo scenario.
- **Payload lỗi:**
  - JSON hỏng
  - thiếu field bắt buộc
  - sai kiểu dữ liệu
  - sai `device_id`
  - sai `schema_version`
  - latitude/longitude out of range
  - `message_id` không phải UUID

### Tỷ lệ khuyến nghị
- Normal: 70–85%
- Jitter nhẹ: 10–20%
- Error injection: 5–10% (tăng theo test case)
- Replay/duplicate/out-of-order: chỉ bật theo scenario để dễ xác nhận

## 3) Thiết kế deterministic/replayable scenarios
Khuyến nghị dùng mô hình scenario-seed + event script.

### Cấu trúc deterministic
- Input cố định:
  - `seed`
  - `device_id`
  - `start_time`
  - `scenario_id`
  - `publish_interval_ms`
- Mỗi event được sinh từ seed + index => tái tạo được 100%.
- Lưu “event plan” ra file JSON/NDJSON để replay y hệt.

### Cách replay
- Chạy ở 2 mode:
  1. **Generate mode:** sinh plan + publish live.
  2. **Replay mode:** đọc plan đã snapshot, phát lại timing/payload chính xác.
- Mỗi event có:
  - `event_index`
  - `scheduled_at`
  - `topic`
  - `payload`
  - `inject_fault_type`
  - `expected_server_effect`

### Gợi ý scenario set
- `baseline_drive`
- `gps_noise_jitter`
- `duplicate_burst`
- `out_of_order_window`
- `vibration_alert_spike`
- `network_flap_reconnect`
- `invalid_payload_storm`
- `mixed_fault_campaign`

## 4) QoS, retain, session, reconnect/backoff, keys
### QoS
- `rawdata`: QoS 0 đúng contract; phù hợp telemetry tần suất cao.
- `status/events/firmware`: QoS 1.
- `commands`: QoS 1.

### Retain
- Không retain cho `rawdata`, `events`, `firmware`.
- `status` chỉ retain nếu muốn “last known state” cho consumer mới; nếu dùng retain thì chỉ retain bản trạng thái cuối rất chọn lọc.
- Khuyến nghị mặc định simulator **không retain** để tránh che mất lỗi ingest.

### Session / reconnect / backoff
- Dùng keepalive ngắn và backoff tăng dần có jitter (ví dụ 1s, 2s, 4s, 8s, cap 30s).
- Khi reconnect:
  - đổi `boot_id`
  - reset `seq_no` hoặc tăng theo boot policy đã chọn
  - publish `status=running` trước telemetry nếu scenario cần session start.

### Idempotency / correlation
- `message_id`: UUID per message, dùng làm idempotency key tốt nhất.
- `seq_no`: per-boot sequence để detect reorder/duplicate.
- `boot_id`: phân biệt lifecycle reboot/reconnect.
- Nếu cần cross-topic trace, thêm `correlation_id` tùy chọn; nhưng hiện bridge đã dùng metadata có thể đủ nếu giữ `message_id + boot_id + seq_no`.

## 5) Tiêu chí pass/fail đo được
### Ở mức publish
Pass khi:
- 100% payload hợp lệ trong baseline được broker nhận.
- Scenario lỗi tạo đúng loại lỗi mong đợi với tỷ lệ đã cấu hình.
- Reconnect/backoff không làm treo script.
- Khi replay cùng `seed`, output giống nhau về payload và thứ tự sự kiện.

Fail khi:
- Payload baseline bị sai schema.
- `device_id`/`message_id`/`schema_version` không đúng contract.
- Scenario deterministic nhưng lần chạy lại cho output khác.
- Script rò rỉ credentials hoặc log auth token đầy đủ.

### Ở mức ingest
Pass khi quan sát server/bridge:
- Rawdata hợp lệ được xử lý và tạo session/status/metrics/log tương ứng.
- Duplicate/out-of-order không làm tạo state sai hoặc crash.
- Invalid JSON / invalid schema bị drop và log warning.
- High vibration tạo alert.
- Reconnect tạo session behavior đúng, không nhân bản session bất thường.

Fail khi:
- Bridge/ingest crash, memory leak rõ ràng, hoặc session/state bị sai sau duplicate/replay.
- Alert không phát khi vibration vượt ngưỡng.
- Mismatch device_id hoặc token sai mà vẫn ingest.

## 6) Guardrail bảo mật cho script
- Không hardcode `auth_token` trong source; đọc từ env/secret file ngoài repo.
- Hạn chế log payload raw nếu chứa token; mask `auth_token` khi debug.
- Cho phép mode `dry-run` chỉ tạo plan, không publish.
- Tách file cấu hình device creds khỏi file scenario.
- Validate broker host/port trước publish để tránh bắn nhầm môi trường.
- Nếu chạy trên VPS/CI, dùng secret injection và quyền tối thiểu.
- Không lưu snapshot có token rõ ràng vào `plans/` trừ khi đã redact.

## Kết luận ngắn
Thiết kế tốt nhất là simulator dạng **deterministic event runner**: seed cố định, replayable plan, fault injection có kiểm soát, bám chặt contract bridge hiện tại. Ưu tiên `message_id + seq_no + boot_id` để kiểm tra idempotency/reorder, và dùng QoS/retain đúng theo từng topic để không che lỗi thật.

## Unresolved questions
1. `status` topic có nên retain last state trong môi trường UAT hay giữ non-retained để sát thực tế ingest?
2. Có cần bổ sung field `correlation_id` vào contract chính thức hay chỉ dùng metadata hiện tại là đủ?
3. Tỷ lệ lỗi chuẩn cho CI smoke vs test tải dài hạn nên khác nhau như thế nào?
4. Simulator sẽ publish trực tiếp vào EMQX hay qua bridge/proxy trung gian trong môi trường VPS?
