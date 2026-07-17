# Brainstorm sâu: viết mới hoàn toàn một IoT platform generic, chỉ học kiến trúc từ repo vehicle-tracking (2026-04-18)

## 1) Bài toán thật sự là gì

Mục tiêu không phải:
- generic hóa app vehicle tracking hiện tại
- rename `vehicle` thành `asset`
- giữ app cũ rồi bọc ngoài bằng vài abstraction

Mục tiêu thật sự:
- thiết kế một **IoT platform thuần generic**
- platform này nhận được **nhiều loại bản tin JSON khác nhau**
- phục vụ **nhiều kiểu ứng dụng khác nhau**
- không mang assumption business của fleet, OBD, trip, geofence, maintenance

Nói ngắn:
- repo hiện tại là **reference architecture**
- hệ mới là **greenfield product**

Đây là phân biệt quan trọng nhất của toàn brainstorm. Nếu nhầm chỗ này, mọi quyết định sau sẽ lệch.

## 2) Kết luận chiến lược chốt ngay từ đầu

### Chọn một hướng duy nhất
- **Viết mới hoàn toàn**
- Chỉ học từ repo hiện tại về:
  - topology runtime
  - ingest flow
  - observability flow
  - admin/query flow
- Không giữ lại app/business cũ như một phần của sản phẩm mới

### Vì sao phải chốt mạnh như vậy
Nếu vẫn giữ app cũ trong cùng tư duy thiết kế:
- tên có thể đổi
- bảng có thể đổi
- route có thể đổi
- nhưng assumption business cũ sẽ vẫn chảy vào schema, API, UI, metric naming, alert model

Hậu quả:
- platform mới nhìn ngoài generic
- bên trong vẫn là fleet app trá hình

Đây là lỗi rất hay gặp khi “port sang platform”.

## 3) Repo hiện tại đáng học ở đâu, không đáng học ở đâu

### 3.1 Cái đáng học

#### A. Topology dịch vụ
Repo hiện tại đã tách service khá hợp lý:
- EMQX làm ingress broker
- MQTT bridge làm nơi xử lý message đầu tiên
- PostgreSQL cho dữ liệu quan hệ/projection/config
- VictoriaMetrics cho time-series numeric
- VictoriaLogs cho log/search
- Backend cho API/realtime
- Frontend cho operation/admin console

Cái đáng học ở đây không phải domain, mà là **đường đi của dữ liệu**.

#### B. Ingest pattern
`Tracking_MqttBridge` đang có pattern đúng:
1. nhận message
2. parse
3. validate
4. auth source
5. normalize
6. persist theo từng loại storage
7. phát internal event cho downstream

Đây là xương sống rất đáng reuse về ý tưởng.

#### C. Observability wiring
Repo hiện tại đã chứng minh cách nối:
- service -> VictoriaMetrics
- service -> VictoriaLogs
- backend/frontend -> query lại dữ liệu observability

Đây là phần hiếm khi cần “sáng tạo”. Có pattern tốt thì nên học thẳng.

#### D. Admin query shell
`system-admin` bên backend/frontend cho thấy một console vận hành có thể gom:
- DB explorer
- metrics explorer
- logs viewer

Nó chưa đủ generic, nhưng direction là đúng.

### 3.2 Cái không đáng học vào core mới
- `vehicles`
- `trips`
- `geofences`
- `maintenance`
- `fuel analytics`
- `OBD-specific rules`
- `fleet dashboards`
- mọi relation kiểu `vehicle_id`, `trip_id`, `driver`, `route`

Không phải vì chúng “xấu”.

Lý do thật:
- chúng là **business vertical**
- còn platform generic cần **business-neutral core**

## 4) Thiết kế nguyên tắc cho platform mới

### 4.1 Platform phải phân biệt rõ 4 khái niệm

#### `message`
- đơn vị dữ liệu gốc đi vào hệ thống
- ví dụ: một JSON từ device/gateway/service
- có thể nested, đa dạng, không nhất thiết numeric

#### `signal`
- phần dữ liệu có thể đo theo trục thời gian
- thường là numeric hoặc boolean đơn giản
- ví dụ: `temperature_c`, `humidity_pct`, `battery_v`, `online`

#### `event`
- điều gì đó có ý nghĩa vận hành hoặc nghiệp vụ
- ví dụ: threshold hit, source offline, schema invalid, state change

#### `state`
- snapshot mới nhất đã được hợp nhất
- ví dụ: trạng thái nguồn hiện tại, battery mới nhất, last heartbeat, firmware version

Nếu platform trộn cả 4 thứ này thành một khối, hệ thống sẽ nhanh rối:
- DB không rõ lưu gì
- metrics không rõ metric hóa gì
- UI không rõ hiển thị message hay state hay log

### 4.2 Platform phải business-neutral
- core không biết “vehicle”
- core không biết “trip”
- core không biết “geofence”
- core cũng không biết “nhiệt độ có xấu không” nếu chưa có rule/domain layer phía trên

Core chỉ nên biết:
- source là ai
- message thuộc loại nào
- schema nào áp dụng
- signal nào được trích ra
- state nào cần cập nhật
- event nào cần phát

### 4.3 Platform phải schema-aware, nhưng không over-engineered
Không nên:
- cho mọi payload JSON đi tự do mà không có metadata

Cũng không nên:
- xây enterprise schema registry quá nặng từ ngày đầu

Cách hợp lý:
- có schema metadata đủ dùng
- có version
- có extractor map
- có validator

Thế là đủ cho phase đầu.

## 5) Vì sao greenfield là đúng, còn các hướng khác là sai

### 5.1 Vì sao không chọn “rename app cũ thành generic”
Đây là hướng nguy hiểm nhất vì nó tạo ảo giác tiến bộ.

Ví dụ bề ngoài:
- `vehicle_id` -> `asset_id`
- `vehicle_latitude` -> `asset_latitude`
- `device telemetry` -> `source telemetry`

Nhưng bên trong:
- logic session vẫn theo tracking assumptions
- UI vẫn xoay quanh behavior của tracker
- alert model vẫn phản chiếu use case cũ
- schema vẫn được sinh ra từ domain cũ

Kết quả:
- đổi tên rất nhiều
- nhưng không tạo ra platform generic thật

### 5.2 Vì sao không chọn “platform core + app cũ cùng sống trong cùng sản phẩm”
Hướng này có vẻ thực dụng, nhưng với yêu cầu hiện tại thì không đúng.

Lý do:
- user đã chốt hệ mới không liên quan vehicle
- nếu app cũ vẫn tồn tại như một phần của cùng sản phẩm, team sẽ luôn bị kéo về naming và ưu tiên cũ
- mọi quyết định generic sau đó sẽ bị mặc định phục vụ backward compatibility nội bộ

Điều này giết sạch sự “sạch” của greenfield.

### 5.3 Vì sao greenfield hợp lý nhất
Greenfield cho phép:
- chốt lại ngôn ngữ hệ thống ngay từ đầu
- schema sạch
- metric naming sạch
- API contract sạch
- UI flow sạch

Nó tốn bootstrap hơn, nhưng đổi lại:
- ít technical debt hơn nhiều
- ít conflict tư duy hơn nhiều
- đúng mục tiêu sản phẩm hơn nhiều

## 6) Platform mới nên xoay quanh thực thể nào

### Chọn thực thể trung tâm: `source`

Thay vì:
- vehicle
- device theo nghĩa phần cứng hẹp
- asset
- producer quá trừu tượng

`source` là từ cân bằng nhất cho phase đầu:
- có thể là device
- có thể là gateway
- có thể là edge service
- có thể là external connector

Sau này nếu cần hẹp hơn:
- thêm `source_type`

Ví dụ:
- `edge-device`
- `gateway`
- `connector`
- `service-agent`

### Vì sao không chọn `asset`
`asset` thường ngụ ý một thực thể business mà source đang gắn vào.

Ví dụ:
- máy móc
- xe
- sensor installation
- tủ điện

Nhưng platform generic không bắt buộc phải có asset. Có source chỉ đơn giản là một producer.

### Vì sao không chọn `producer`
`producer` generic quá, đúng về mặt lý thuyết nhưng hơi xa ngữ cảnh IoT vận hành thường ngày.

`source` vừa đủ generic, vừa dễ hiểu.

## 7) Core concepts của platform mới

### 7.1 `tenant`
- đơn vị cô lập logic và dữ liệu
- có thể bật ngay hoặc phase sau
- nhưng schema nên chừa chỗ từ đầu

### 7.2 `source`
- nơi phát sinh message
- có identity, credential, metadata, capabilities

### 7.3 `message_type`
- định danh logic của message
- ví dụ:
  - `sensor.snapshot`
  - `gateway.heartbeat`
  - `camera.event`
  - `modbus.poll.result`

### 7.4 `channel`
- nhóm đường đi cấp cao của message
- ví dụ:
  - `telemetry`
  - `state`
  - `event`
  - `lifecycle`
  - `command-ack`
  - `log`

### 7.5 `schema`
- định nghĩa shape hoặc rule validate của một loại message
- gắn với `message_type + version`

### 7.6 `signal catalog`
- map field nào từ payload được xem là signal
- signal nào metric hóa
- unit gì
- labels gì
- extractor nào

### 7.7 `state projection`
- trạng thái mới nhất đã được hợp nhất từ nhiều message
- dùng cho dashboard/API đọc nhanh

### 7.8 `command`
- nếu phase đầu có support command
- phải có history, ack, status
- không nên nhúng lẫn vào inbound messages table/log

## 8) Canonical contract: phần quan trọng nhất

Nếu hỏi “tim của platform là gì”, câu trả lời là:
- **canonical message contract**

Không có nó:
- mỗi source là một exception
- mỗi service parse một kiểu
- UI không thể generic
- storage routing không thể nhất quán

### 8.1 Dạng topic đề xuất
```text
v1/{source_id}/{channel}
```

Ví dụ:
- `v1/dev-001/telemetry`
- `v1/gw-001/lifecycle`
- `v1/connector-a/event`

### 8.2 Vì sao tách `channel` khỏi `message_type`
Vì hai thứ này khác nhau:

- `channel` trả lời: loại luồng dữ liệu này để làm gì
- `message_type` trả lời: bản tin cụ thể này là bản tin gì

Ví dụ:
- channel: `telemetry`
- message_type: `sensor.snapshot`

Nếu trộn hai thứ này, routing sẽ cứng và khó generic.

### 8.3 Canonical envelope đề xuất
```json
{
  "envelope": {
    "tenant_id": "default",
    "source_id": "dev-001",
    "source_type": "edge-device",
    "channel": "telemetry",
    "message_type": "sensor.snapshot",
    "schema_version": "v1.0.0",
    "occurred_at": 1712730000000,
    "received_at": 1712730000234,
    "message_id": "8d5f1f48-7e57-4f79-bf52-4a3cb8a7f131",
    "seq_no": 1204,
    "boot_id": "boot-3f8a",
    "trace_id": "corr-001"
  },
  "attributes": {
    "firmware_version": "1.4.2",
    "site": "lab-a",
    "tags": ["prod", "sensor"]
  },
  "payload": {
    "temperature_c": 28.4,
    "humidity_pct": 61.2,
    "status": "ok",
    "nested": {
      "battery_v": 3.78
    }
  },
  "signals": [
    {
      "name": "temperature_c",
      "metric_key": "temperature_c",
      "value": 28.4,
      "value_type": "number",
      "unit": "C"
    },
    {
      "name": "humidity_pct",
      "metric_key": "humidity_pct",
      "value": 61.2,
      "value_type": "number",
      "unit": "%"
    }
  ],
  "events": [
    {
      "type": "threshold.warning",
      "severity": "low",
      "code": "temp-high",
      "message": "Temperature near threshold"
    }
  ]
}
```

### 8.4 Giải thích từng phần

#### `envelope`
Là metadata nền để platform hiểu message mà không cần đọc business payload.

Nó trả lời:
- ai gửi
- gửi loại gì
- vào kênh nào
- khi nào xảy ra
- version nào
- có trace nào để correlate

#### `attributes`
Metadata mở rộng, thường là context ổn định hơn payload.

Ví dụ:
- firmware version
- site
- line
- zone
- source labels

Không nên nhét những thứ đổi rất nhanh vào đây.

#### `payload`
Đây mới là domain-specific data thật.

Nguyên tắc:
- platform **không** áp meaning cứng cho payload
- payload có thể nested
- payload có thể khác nhau hoàn toàn giữa các source/app

#### `signals`
Phần này làm cầu nối giữa JSON bất kỳ và TSDB/query analytics.

Nó giúp platform biết:
- field nào đáng metric hóa
- field nào có unit
- field nào là numeric

Nếu không có `signals`, platform sẽ phải tự đoán từ `payload`, rất dễ sai.

#### `events`
Phần này làm cầu nối giữa message raw và vận hành/realtime/alerting.

Một message có thể:
- không có event nào
- có một event
- có nhiều event

### 8.5 Có bắt source phải gửi đủ `signals/events` không
Không nhất thiết.

Có 2 mode:

#### Mode A: source self-described
Source gửi cả `payload + signals + events`.

Ưu:
- bridge nhẹ hơn

Nhược:
- source thông minh hơn
- contract producer phức tạp hơn

#### Mode B: platform-extracted
Source chỉ gửi `payload`, bridge/extractor tạo `signals/events`.

Ưu:
- producer đơn giản

Nhược:
- bridge phức tạp hơn

Khuyến nghị phase đầu:
- hỗ trợ cả hai
- nhưng canonical internal form luôn giống nhau

## 9) Ingestion architecture nên vận hành thế nào

### 9.1 Pipeline chuẩn
1. Receive
2. Parse
3. Authenticate
4. Validate envelope tối thiểu
5. Resolve schema/extractor
6. Normalize thành canonical message
7. Route tới storages
8. Emit internal event
9. Ack hoặc record failure

### 9.2 Giải thích từng bước

#### Bước 1: Receive
Bridge nhận message từ broker.

Quan trọng:
- đừng để business logic chạy ngay trong on-message callback mà không có pipeline rõ

#### Bước 2: Parse
- parse JSON
- reject payload malformed
- log vào VictoriaLogs theo dạng validation failure

#### Bước 3: Authenticate
Xác định source có quyền publish topic/channel đó không.

Không nên:
- chỉ tin `source_id` nằm trong payload

Nên:
- map topic + credential + source registry

#### Bước 4: Validate envelope tối thiểu
Validate các trường bắt buộc:
- source_id
- channel
- message_type
- occurred_at
- message_id hoặc rule dedupe khác

#### Bước 5: Resolve schema/extractor
Bridge tra:
- schema nào áp dụng
- extractor nào áp dụng
- signal mapping nào áp dụng

#### Bước 6: Normalize
Từ raw message, bridge tạo `CanonicalMessage`.

Đây là bước biến thế giới hỗn loạn bên ngoài thành thế giới có cấu trúc bên trong.

#### Bước 7: Route
Không phải mọi dữ liệu đi cùng một chỗ.

Ví dụ:
- raw message -> VictoriaLogs
- signals -> VictoriaMetrics
- latest state -> PostgreSQL
- invalid parse -> VictoriaLogs + quarantine table optional

#### Bước 8: Emit internal event
Sau khi normalize/persist xong, bridge có thể phát event nội bộ cho backend/realtime.

#### Bước 9: Failure handling
Nếu lỗi:
- phải biết lỗi ở bước nào
- phải truy ra bằng `trace_id/message_id/source_id`
- phải có khả năng search lại nhanh

### 9.3 Có cần dead-letter queue không
Không cần overbuild ngay.

Phase đầu có thể đủ với:
- VictoriaLogs cho failed ingestion
- optional PostgreSQL table `platform_ingest_failures`

Chỉ khi volume cao hoặc retry semantics phức tạp mới cần queue/dlq riêng.

## 10) Storage strategy: rõ vai ngay từ đầu

Đây là phần quyết định platform có giữ được sự sạch hay không.

### 10.1 VictoriaLogs dùng để làm gì

Dùng cho:
- raw inbound messages
- raw outbound commands
- validation failures
- pipeline decision logs
- service runtime logs

Lý do:
- raw message có tính log/event hơn là relation
- cần search theo time/source/message_type/trace
- VictoriaLogs hợp dạng append + search hơn Postgres table scan

Không nên dùng VictoriaLogs cho:
- latest state chính
- config chính
- relational query chính

### 10.2 PostgreSQL dùng để làm gì

Dùng cho:
- tenant/source registry
- credentials/capabilities
- schema metadata
- signal catalog
- routing config
- latest state projection
- command history
- admin metadata index
- hot archive chọn lọc nếu thật sự cần

Lý do:
- đây là relational control plane + queryable state

Không nên dùng PostgreSQL cho:
- toàn bộ high-frequency time-series
- toàn bộ raw messages vô hạn

### 10.3 VictoriaMetrics dùng để làm gì

Dùng cho:
- numeric signals
- throughput
- latency
- health/runtime metrics

Lý do:
- TSDB phù hợp cho trend/range/aggregation

Không nên:
- metric hóa mọi field
- nhét payload JSON vào labels
- tạo metric name từ field raw vô tội vạ

### 10.4 Quy tắc metric hóa

Chỉ metric hóa field nếu:
- có ý nghĩa time-series
- có unit rõ
- được signal catalog whitelist
- query thực sự có ích

Ví dụ nên metric hóa:
- temperature
- pressure
- battery
- packet latency
- online/offline as gauge/counter

Ví dụ không nên metric hóa bừa:
- raw error text
- nested JSON blob
- ids/cardinality cao
- free-form tags không kiểm soát

### 10.5 Vấn đề cardinality
Đây là rủi ro lớn nhất khi generic IoT gặp TSDB.

Sai lầm phổ biến:
- source custom field nào cũng thành metric
- message_type nào cũng thành label
- mọi tag business đều thành label

Cách tránh:
- metric names theo catalog
- labels cố định, low-cardinality
- dimension business nhiều biến động thì giữ ở logs/DB, không đẩy vào metric labels

## 11) Core data model nên có

Không cần enterprise monster schema. Chỉ cần đủ để platform vận hành.

### 11.1 `platform_tenants`
Chứa:
- tenant identity
- status
- quotas/config nền

### 11.2 `platform_sources`
Chứa:
- source_id
- source_type
- tenant_id
- status
- metadata
- capabilities
- last_seen_at

### 11.3 `platform_source_credentials`
Chứa:
- auth strategy
- secret hash/reference
- rotation metadata

### 11.4 `platform_message_schemas`
Chứa:
- message_type
- schema_version
- validator config
- extractor reference
- status

### 11.5 `platform_signal_catalog`
Chứa:
- signal key
- source_type/message_type applicability
- value_type
- unit
- metric enabled hay không
- extractor path

### 11.6 `platform_state_projection`
Chứa:
- source_id
- projection_name
- state_json
- updated_at

Đây là nơi backend/API/UI đọc “latest known state”.

### 11.7 `platform_command_log`
Chứa:
- command id
- source_id
- payload
- status
- ack data
- timestamps

### 11.8 `platform_message_index`
Chứa:
- message_id
- source_id
- channel
- message_type
- occurred_at
- trace_id
- ingest_status
- pointer/reference nếu cần tới raw archive

### 11.9 `platform_ingest_failures`
Optional nhưng rất hữu ích.

Chứa:
- raw snippet
- source/topic
- failure stage
- failure reason
- trace_id
- created_at

## 12) Tổ chức package/lib cho hệ mới

### 12.1 `packages/platform-contracts`
Nơi định nghĩa ngôn ngữ hệ thống:
- canonical envelope schemas
- channel enums
- message_type rules
- parser helpers
- validation helpers

Đây phải là package được tin cậy nhất. Nếu package này mơ hồ, cả hệ mơ hồ.

### 12.2 `packages/platform-observability`
Nơi gom toàn bộ logic metrics/log.

API nên ngắn kiểu:
```ts
await writeMetricBatch({...});
await writeMessageLog({...});
await writeIngestDecision({...});
```

Service không nên tự build:
- Prometheus line protocol
- log JSON structure
- label sanitation

Nếu mỗi service tự làm, platform sẽ nhanh drift.

### 12.3 `packages/platform-ingest`
Chứa pipeline:
- authenticate
- validate
- normalize
- extract signals
- route
- failure handling

### 12.4 `packages/platform-admin-query`
Chứa query contracts chung cho:
- backend admin APIs
- frontend admin console

Nó phải định nghĩa rõ:
- metrics instant query
- metrics range query
- log search
- message search
- table explorer query

Repo hiện tại đang có dấu hiệu FE/BE lệch contract. Hệ mới không nên lặp lỗi này.

## 13) Backend admin APIs nên được thiết kế thế nào

### 13.1 `Messages API`
Dùng để xem message-level data.

Filter nên có:
- tenant
- source
- channel
- message_type
- schema_version
- trace_id
- from/to

Phân biệt rõ với `Logs API`:
- message là ingress/outbound artifact
- log là runtime/service artifact

### 13.2 `Logs API`
Dùng để xem:
- service logs
- ingest decision logs
- validation failures
- runtime errors

Filter nên có:
- stream
- level
- source
- message_type
- trace_id
- from/to

### 13.3 `Metrics API`
Phải tách:
- instant query
- range query

Vì UI chart mà chỉ có instant query thì contract sai từ gốc.

### 13.4 `DB Explorer API`
Cho admin console xem relational state.

Phải support thật:
- pagination
- sort
- filter
- date range
- search

Không được để frontend gửi params mà backend không xử lý.

## 14) Frontend console nên được nghĩ như thế nào

Không nên nghĩ nó là “dashboard business”.
Nó nên là **operations console**.

### 14.1 Tab `Messages`
Mục tiêu:
- xem raw messages như platform artifacts

Phải có 3 mode:
- `JSON tree`
- `flattened table`
- `raw`

Vì payload generic không thể chỉ đọc bằng một table phẳng.

### 14.2 Tab `DB`
Mục tiêu:
- xem control plane và latest state

Phù hợp cho:
- sources
- schemas
- signal catalog
- state projections
- command log

### 14.3 Tab `Metrics`
Mục tiêu:
- xem trend của signals/runtime metrics

Phải support:
- time range
- multi-series compare
- chart + table
- copy query

### 14.4 Tab `Logs`
Mục tiêu:
- debug runtime và ingest issues

Phải support:
- structured columns
- level badges
- detail drawer
- trace-based navigation

### 14.5 Điều rất quan trọng: cross-navigation
User click từ một message phải đi được tới:
- log liên quan
- metrics range gần thời điểm đó
- state projection hiện tại

Nếu 4 tab tách rời hoàn toàn, console sẽ khó dùng dù đủ chức năng.

## 15) Vì sao phải tách `Messages` và `Logs`

Đây là chỗ nhiều hệ thống làm sai.

### `Messages`
Là:
- dữ liệu nghiệp vụ/raw ingress/outbound
- do source tạo ra
- dùng để audit luồng dữ liệu

### `Logs`
Là:
- dữ liệu vận hành/runtime
- do service tạo ra
- dùng để debug hệ thống

Nếu trộn 2 thứ này:
- volume lớn
- search khó
- operator không biết đang xem “input dữ liệu” hay “service kể về input dữ liệu”

Với platform generic, tab `Messages` là bắt buộc. Chỉ `Logs` thôi là thiếu.

## 16) Bảo mật và kiểm soát truy cập nên được nghĩ sớm

### 16.1 Source auth
Ít nhất phải có:
- source registry
- credential mapping
- topic/channel authorization

Không nên tin:
- `source_id` trong payload

### 16.2 Admin auth
Console phải có role rõ:
- read-only operator
- admin
- schema/config manager

### 16.3 Tenant isolation
Dù phase đầu chưa bật multi-tenant đầy đủ, schema nên chừa trường `tenant_id` từ đầu.

Nếu không, sau này retrofit rất đau.

## 17) Schema evolution nên làm thế nào

Generic platform mà không nghĩ versioning từ đầu sẽ rất nhanh vỡ.

### Nguyên tắc
- message type có version
- extractor map có version
- state projection có version nếu cần

### Không cần làm
- schema registry enterprise-level
- compatibility matrix quá nặng

### Cần làm
- biết source/message nào đang dùng version nào
- biết validator nào áp dụng
- biết extractor nào sinh signals/events nào

## 18) Observability của chính platform

Ngoài observability cho dữ liệu của user, platform còn cần observability cho chính nó.

Ít nhất nên có metrics:
- ingest messages total
- ingest failures total theo stage
- normalize latency
- routing latency
- metrics write failures
- logs write failures
- admin query latency

Vì sao cần:
- nếu platform ingest có vấn đề mà chỉ nhìn raw data user thì không đủ

## 19) Repo structure gợi ý cho hệ mới

Nếu làm greenfield, nên có structure sạch từ đầu.

Ví dụ:
```text
platform-iot/
├── apps/
│   ├── broker-bridge/
│   ├── admin-api/
│   └── admin-console/
├── packages/
│   ├── platform-contracts/
│   ├── platform-observability/
│   ├── platform-ingest/
│   ├── platform-storage/
│   └── platform-admin-query/
├── infra/
│   ├── emqx/
│   ├── postgres/
│   ├── victoriametrics/
│   ├── victorialogs/
│   └── grafana/
└── plans/
```

Điểm chính:
- apps là executable services
- packages là logic dùng chung
- infra là runtime wiring

## 20) Build plan thực dụng cho hướng greenfield

### Phase 1: chốt ngôn ngữ hệ thống
- chốt `source`, `channel`, `message_type`, `signal`, `event`, `state`
- chốt canonical contract
- chốt metric naming

Nếu phase này làm mơ hồ, các phase sau sẽ trả giá gấp nhiều lần.

### Phase 2: dựng ingest skeleton
- MQTT connection
- auth source
- parse + validate
- normalize
- failure path

### Phase 3: dựng storage routing
- raw messages -> VictoriaLogs
- signals -> VictoriaMetrics
- state/control plane -> PostgreSQL

### Phase 4: dựng admin APIs
- messages
- logs
- metrics instant
- metrics range
- db explorer

### Phase 5: dựng admin console
- Messages
- DB
- Metrics
- Logs
- cross-navigation theo trace/source/time

### Phase 6: hardening
- retention policies
- auth/roles
- quotas/rate limits
- schema version handling

## 21) Những thứ tuyệt đối không nên làm ở phase đầu

- Không copy nguyên business module từ repo hiện tại
- Không rename fleet domain rồi gọi là generic
- Không làm schema registry khổng lồ
- Không đẩy mọi field thành metric
- Không để UI chỉ có một table phẳng cho payload generic
- Không để FE đoán contract từ backend responses
- Không trộn Messages với Logs

## 22) Success criteria cho brainstorm này

Brainstorm chỉ có giá trị nếu sau khi đọc xong, team có thể trả lời rõ:

### Về chiến lược
- Hệ mới có phải greenfield không
- Có giữ app cũ không
- Reuse cái gì, bỏ cái gì

### Về kiến trúc
- raw message đi đâu
- signal đi đâu
- state đi đâu
- event đi đâu

### Về contract
- core entity là gì
- canonical envelope gồm gì
- messages khác logs thế nào

### Về sản phẩm vận hành
- admin console cần những tab nào
- tại sao Messages là bắt buộc
- tại sao Metrics phải có range query

## 23) Kết luận ngắn gọn

Hướng đúng cho bài toán này là:
- **viết mới hoàn toàn**
- repo hiện tại chỉ là nơi học kiến trúc
- platform mới xoay quanh `source -> message -> signal/event/state`
- storage phải tách vai rõ:
  - VictoriaLogs cho raw messages và runtime logs
  - VictoriaMetrics cho numeric signals
  - PostgreSQL cho control plane và latest state
- admin console phải có ít nhất:
  - `Messages`
  - `DB`
  - `Metrics`
  - `Logs`

Nếu giữ kỷ luật này, hệ mới sẽ là platform generic thật.
Nếu phá kỷ luật này, hệ mới sẽ rất nhanh quay về một app business trá hình.

## 24) Câu hỏi mở
- Có chốt `source` là thực thể trung tâm không, hay muốn generic thêm thành `producer`?
- Multi-tenant có bật ngay phase đầu không, hay chỉ chừa schema sẵn?
- Có cần command/config path ngay phase đầu không, hay phase đầu chỉ tập trung ingest + query + admin console?
- Retention raw messages mong muốn là bao lâu để chốt policy cho VictoriaLogs và optional archive?

## 25) Nghiên cứu repo và nội dung open source tham chiếu

Phần này không nhằm “chọn một platform để dùng”.

Mục tiêu:
- học cách họ tổ chức hệ thống
- học ngôn ngữ kiến trúc của họ
- học ranh giới giữa ingest, state, event, rules, storage, admin
- học các anti-pattern bằng cách nhìn xem họ tối ưu cái gì và đánh đổi cái gì

Tôi ưu tiên đọc:
- repo chính thức
- docs kiến trúc chính thức
- README/release/docs của dự án

### 25.1 ThingsBoard

Nguồn chính:
- https://github.com/thingsboard/thingsboard
- https://thingsboard.io/docs/reference/architecture/
- https://thingsboard.io/docs/user-guide/rule-engine-2-5/queues/

Điểm nổi bật học được:
- họ tổ chức platform quanh:
  - devices
  - rule chains / rule nodes
  - tenants / customers
  - dashboards / widgets
  - alarms / events
- kiến trúc xử lý message của họ nhấn mạnh 3 ý:
  - **rule engine là first-class subsystem**
  - **queue là first-class subsystem**
  - **message ordering/isolation theo originator** là một quyết định quan trọng
- docs kiến trúc của họ mô tả actor model rõ:
  - tenant actor
  - device actor
  - rule chain actor
- consistent hashing theo `device id` để gom xử lý của cùng một thiết bị về một node giúp:
  - tăng cache hit
  - giảm race condition
  - dễ target RPC
- queue subsystem của họ không chỉ là “có queue” mà có chính sách rõ:
  - sequential by originator
  - sequential by tenant
  - burst
  - batch
  - retry failed / retry timeout / retry all / skip failures

Ý tưởng đáng học:
- **message processing policy phải configurable**
  - không phải mọi loại message đều cần cùng semantics
- **retry strategy là product feature, không phải chỉ là code-level detail**
- **critical processing path** có thể cần queue/topic riêng thay vì dùng một luồng duy nhất
- **rule engine nếu có** phải được nhìn như pipeline có thể quan sát được, không phải vài callback tự phát

Điểm không nên copy nguyên:
- ThingsBoard đi khá sâu vào “all-in-one application platform”:
  - dashboards
  - widget ecosystem
  - tenant/customer app model
  - alarming/business behavior
- nếu copy quá nhiều tinh thần này, platform mới sẽ nhanh bị phình thành application suite thay vì giữ core generic sạch

Kết luận học được cho hệ mới:
- học **processing semantics** của họ
- không học nguyên **business/application surface** của họ

### 25.2 Mainflux

Nguồn chính:
- https://github.com/MainfluxLabs/mainflux
- https://mainfluxlabs.github.io/docs/architecture/

Điểm nổi bật học được:
- Mainflux rất rõ ở chỗ họ coi platform là tập hợp microservices có trách nhiệm hẹp:
  - auth
  - users
  - things
  - certs
  - protocol adapters
  - rules
  - alarms
  - webhooks
  - downlinks
  - notifiers
  - storage writers/readers
- họ mô tả domain model khá rõ:
  - users
  - organizations
  - groups
  - profiles
  - things
- điểm đặc biệt đáng chú ý là `profile`:
  - không chỉ là metadata
  - mà định nghĩa message format và processing rules cho các things cùng loại
- phần messaging của họ dùng một messaging backbone riêng và coi platform như một hệ trao đổi message trước, rồi mới tới các chức năng khác
- docs của họ cũng nhấn mạnh khả năng chạy cùng mô hình ở gateway và cloud

Ý tưởng đáng học:
- **tách adapters, writers, readers, rules, notifiers thành service/module riêng**
- **có “contract/profile layer” giữa source và processing**
- **storage reader/writer là pluggable boundary**
  - thay vì hardcode một đường đọc/ghi duy nhất
- **cùng một mental model từ edge tới cloud** giúp giảm cognitive load cho team

Điểm không nên copy nguyên:
- domain model của Mainflux vẫn khá opinionated với `org/group/profile/thing`
- nếu copy y nguyên, platform mới sẽ bị ép theo một identity model có thể không cần thiết cho phase đầu
- việc gắn chuẩn message normalization vào một format cụ thể cũng có thể quá hẹp nếu platform của mình muốn chấp nhận nhiều contract khác nhau

Kết luận học được cho hệ mới:
- học **sự mô-đun hóa mạnh**
- học **profile/schema layer**
- không copy nguyên **domain language** của họ

### 25.3 OpenRemote

Nguồn chính:
- https://github.com/openremote/openremote
- https://docs.openremote.io/docs/architecture/overall-architecture/

Điểm nổi bật học được:
- OpenRemote mô tả mình gần như một **context broker**
- trung tâm của họ là:
  - `Asset`
  - `AssetDescriptor`
  - `AttributeEvent`
- cách nghĩ này rất khác ThingsBoard/Mainflux:
  - không bắt đầu từ “device messages”
  - mà bắt đầu từ “asset context + attribute changes”
- họ nói rõ:
  - assets có schema
  - schema định nghĩa attributes và metadata
  - live value được cập nhật qua `AttributeEvent`
- họ cũng mô tả event ingress đa kênh:
  - MQTT
  - REST
  - WebSocket
- nội bộ dùng event-driven processing chain và Camel để route event

Ý tưởng đáng học:
- **typed entity + typed attributes** là một cách rất mạnh để xây generic platform
- thay vì cố hiểu mọi JSON raw, có thể đưa mọi thứ về mô hình:
  - entity
  - attribute
  - event
- cách họ phân biệt:
  - current live value
  - outdated event
  - history storage
  là một pattern rất đáng suy nghĩ
- processing chain có bước:
  - enrich
  - validate
  - intercept
  - update current value
  - publish subscribers
  khá sạch

Điểm không nên copy nguyên:
- `asset` là abstraction rất mạnh, nhưng cũng khá opinionated
- với platform greenfield hiện tại, nếu đi thẳng theo OpenRemote style, có nguy cơ core sẽ nghiêng sang “digital twin/context broker platform” hơn là “generic message platform”

Kết luận học được cho hệ mới:
- học **event-driven state update**
- học **schema-attached entity attributes**
- nhưng phase đầu vẫn nên giữ `source/message/signal/state` đơn giản hơn, chưa nhảy thẳng sang asset-centric model

### 25.4 EdgeX Foundry

Nguồn chính:
- https://docs.edgexfoundry.org/3.1/
- https://docs.edgexfoundry.org/4.1/general/EdgeX_CN/
- https://docs.edgexfoundry.org/2.1/design/

Điểm nổi bật học được:
- EdgeX không đơn giản là cloud IoT platform; nó là một **edge-native framework**
- điều rất đáng học là cách họ chia ranh giới:
  - Core Data
  - Core Metadata
  - Core Command
  - Supporting services
  - Device Services
  - Application Services
  - Rules Engine
- họ nhấn mạnh:
  - microservices giúp pick-and-choose
  - API ổn định giúp thay thế service dễ hơn
  - hybrid deployment là thực tế
  - edge có constraint khác cloud
- tài liệu “Is EdgeX Foundry Cloud Native?” cực đáng học vì nó rất thành thật:
  - cloud native patterns tốt
  - nhưng edge không phải cloud
  - không thể bê nguyên cloud assumptions xuống edge
- phần ADR của EdgeX cũng là bài học hay:
  - quyết định kiến trúc được lưu chính thức trong repo

Ý tưởng đáng học:
- **southbound integration và application/export layer phải tách**
- **metadata / data / command / notification / scheduler** nên là các boundary rõ
- **không áp cloud-native giáo điều vào edge**
- **ADR in-repo** là thứ hệ mới nên làm từ đầu

Điểm không nên copy nguyên:
- EdgeX có rất nhiều service và vocabulary cho edge middleware
- nếu platform mới không nhắm sâu vào industrial edge, copy nguyên structure này sẽ quá nặng

Kết luận học được cho hệ mới:
- học **service boundary discipline**
- học **edge-vs-cloud reality**
- học **ADR governance**

### 25.5 Fledge

Nguồn chính:
- https://github.com/fledge-iot/fledge

Điểm nổi bật học được:
- Fledge tập trung mạnh vào industrial/edge gateway
- kiến trúc họ chia khá gọn:
  - Core
  - South service
  - Storage service
  - optional services
- plugin model của họ rõ ràng:
  - South plugins cho thiết bị/bus mới
  - North plugins cho historian/cloud/enterprise sinks
  - Datastore plugins cho storage backend
- một ý cực hay:
  - họ coi **buffering/store-and-forward** là chức năng lõi
  - vì edge có thể mất mạng, đứt kết nối, hoặc cần giữ dữ liệu tạm nhiều ngày

Ý tưởng đáng học:
- **ingress adapters** và **egress adapters** nên là plugin boundary rõ
- **buffering** không phải feature phụ, mà là phần lõi nếu target môi trường IoT thật
- **scheduler** và background jobs nên được nhìn như subsystem chứ không chỉ cron lẻ

Điểm không nên copy nguyên:
- Fledge nghiêng nhiều về industrial telemetry gateway pattern
- nếu platform mới target rộng hơn, không nên để tư duy “gateway before all” chi phối mọi thứ

Kết luận học được cho hệ mới:
- học **south/north plugin architecture**
- học **buffer first, forward later** cho môi trường mạng không ổn định

### 25.6 Eclipse Kapua

Nguồn chính:
- https://github.com/eclipse-kapua/kapua

Điểm nổi bật học được:
- Kapua trình bày rất rõ lớp dịch vụ chính:
  - Messaging Service
  - RESTful API
  - Web Administration Console
  - Event Bus
  - SQL database
  - NoSQL datastore
- họ cũng rất rõ về multi-tenant:
  - tenant được gọi là account
- quan hệ với Kura cho thấy một pattern đáng học:
  - edge runtime riêng
  - cloud command/control riêng

Ý tưởng đáng học:
- **control plane** và **data plane** cần nghĩ tách nhau
- **admin console / API / messaging / event bus / storage** là các lớp rõ, không nên trộn
- multi-tenant phải được xem là capability nền, không nên vá sau

Điểm không nên copy nguyên:
- Kapua gắn khá chặt với gateway/edge management worldview
- nếu copy y nguyên language của họ, platform mới sẽ nghiêng sang device-fleet management hơn là generic message platform

Kết luận học được cho hệ mới:
- học **layering rõ ràng**
- học **control plane separation**

## 26) Mẫu số chung rút ra từ các platform OSS

Sau khi nhìn nhiều dự án khác nhau, có vài pattern lặp lại rất rõ:

### 26.1 Có một mô hình lõi rất rõ
- ThingsBoard: device + rule chain
- Mainflux: thing/profile/org
- OpenRemote: asset + attribute event
- EdgeX: device service + core data/metadata/app services
- Fledge: core + south + north + storage
- Kapua: messaging + api + console + data tier

Bài học:
- platform mới cũng phải có **một mô hình lõi rất rõ**
- với brainstorm này, mô hình lõi đang hợp lý nhất là:
  - `source`
  - `message`
  - `signal`
  - `event`
  - `state`

### 26.2 Ingest không bao giờ chỉ là “parse rồi save”
Các platform mature đều có nhiều bước giữa input và persistence:
- auth
- validate
- enrich
- route
- transform
- retry
- publish
- alert/rule path

Bài học:
- bridge mới không được chỉ là parser + writer
- nó phải là **ingest pipeline**

### 26.3 State và history luôn bị tách
Dù tên gọi khác nhau, họ đều tách:
- current state / live value
- historical data
- logs/events

Bài học:
- platform mới phải giữ separation này ngay từ đầu

### 26.4 Rule/processing semantics là first-class concern
ThingsBoard rõ nhất ở chỗ này, nhưng các hệ khác cũng có biến thể tương tự.

Bài học:
- nếu sau này có rules, rules phải gắn với:
  - queue semantics
  - retry semantics
  - observability
  - isolation strategy

### 26.5 Console vận hành luôn là phần lõi, không phải đồ phụ
Các OSS mature đều có admin/control surface khá mạnh:
- ThingsBoard dashboards/admin
- OpenRemote Manager UI
- Kapua console
- EdgeX UI/tutorials/supporting tools

Bài học:
- `Messages / DB / Metrics / Logs` không phải nice-to-have
- nó là điều kiện để platform generic dùng được trong thực tế

## 27) Điều chỉnh trực tiếp vào hướng platform của file này

Sau khi nhìn các OSS trên, tôi chốt thêm vài điều cho hướng greenfield:

### 27.1 Giữ `source` làm core entity phase đầu
- Mainflux/OpenRemote cho thấy entity model rất quan trọng
- nhưng để tránh bị over-opinionated quá sớm, `source` vẫn là điểm cân bằng tốt hơn `asset`

### 27.2 Thêm khái niệm `profile` hoặc `schema profile`
Mainflux làm khá hay ở chỗ `profile` gom:
- message format
- processing rules
- routing behavior

Đề xuất cho platform mới:
- thêm `schema profile` hoặc `ingest profile`
- profile map:
  - source_type
  - message_type
  - validator
  - signal extractors
  - state projector
  - routing policies

### 27.3 Tách rõ `ingest adapters`, `processors`, `writers`
Học từ Fledge + Mainflux + EdgeX:
- adapter nhận dữ liệu
- processor chuẩn hóa và quyết định
- writer ghi từng storage/backend

Không để một module khổng lồ làm tất cả.

### 27.4 Cho phép processing policy theo message class
Học từ ThingsBoard:
- không phải mọi message đều cùng retry/order semantics

Đề xuất:
- ít nhất nên có 3 class:
  - `best_effort`
  - `durable`
  - `critical`

Mỗi class có:
- queue policy
- retry policy
- timeout policy

### 27.5 Tạo `Messages` như artifact chính trong console
Học từ việc các platform mature đều có control/admin surface rõ.

Đề xuất:
- `Messages` là tab riêng
- không nhét message raw vào `Logs`

### 27.6 Viết ADR từ đầu
Học từ EdgeX:
- mỗi quyết định lớn nên có ADR ngắn

Tối thiểu cần ADR cho:
- core entity là `source`
- canonical envelope
- storage split
- metrics naming
- message vs logs separation
- retry policy classes

## 28) Kết luận bổ sung sau nghiên cứu OSS

Nghiên cứu các platform OSS không làm thay đổi kết luận lớn của brainstorm này.

Ngược lại, nó củng cố mạnh hơn rằng:
- hướng đúng là **greenfield**
- repo hiện tại chỉ nên dùng để học **pattern**
- platform mới cần:
  - canonical contract rõ
  - ingest pipeline thật
  - storage split rõ
  - admin console đủ mạnh
  - processing semantics có chủ đích

Điều quan trọng nhất rút ra từ OSS:
- những platform sống lâu không generic bằng cách đổi tên
- họ generic bằng cách **chốt một model lõi rất rõ**, rồi build mọi thứ xung quanh model đó

## 29) Nghiên cứu sâu hơn: cách họ làm schema và tổ chức bản tin

Đây là phần rất quan trọng vì “generic IoT platform” thường thất bại không phải ở broker hay DB, mà ở chỗ:
- không định nghĩa rõ bản tin là gì
- không định nghĩa rõ schema nằm ở đâu
- không định nghĩa rõ đâu là measurement, đâu là state, đâu là command, đâu là log

Khi phần này mơ hồ:
- bridge sẽ đầy `if/else`
- UI sẽ không biết render gì
- metrics sẽ bị cardinality cao
- state projection sẽ bị đạp lên nhau

### 29.1 Cách đọc phần này
Phần dưới đây sẽ không tách glossary riêng.
Mỗi thuật ngữ sẽ được giải thích ngay tại chỗ nó xuất hiện để người đọc không phải nhảy lên xuống.

### 29.2 ThingsBoard: schema và message organization

Nguồn chính:
- https://thingsboard.io/docs/user-guide/device-profiles/
- https://thingsboard.io/docs/user-guide/attributes/
- https://thingsboard.io/docs/user-guide/telemetry/
- https://thingsboard.io/docs/user-guide/rule-engine-2-0/overview/

#### Cách họ chia loại dữ liệu
ThingsBoard chia rất rõ:
- telemetry
- attributes
- RPC/downlink

Giải thích ngay tại chỗ:
- `telemetry` là dữ liệu đo đạc theo thời gian, thường là numeric, có timestamp, và thường cần lịch sử + biểu đồ
- `attributes` là key-value mang tính mô tả, cấu hình, hoặc trạng thái tham chiếu; chúng không nhất thiết là time-series chính
- `RPC/downlink` là chiều từ platform xuống thiết bị/source để yêu cầu hành động, ví dụ reboot hoặc đổi cấu hình sampling

Đây là một chia tách đáng học vì nó buộc người thiết kế nghĩ rõ từng loại bản tin dùng để làm gì, thay vì ném mọi thứ vào một JSON bucket duy nhất.

#### Telemetry trong ThingsBoard là gì
Telemetry trong ThingsBoard đúng nghĩa là time-series data: dữ liệu đo đạc liên tục theo thời gian.

Ví dụ:
- nhiệt độ
- độ ẩm
- GPS
- rung động

Điểm hay:
- telemetry được xem là dữ liệu lịch sử hóa, query theo thời gian, aggregate, chart
- docs của họ nói rõ latest values và historical values là hai lớp query khác nhau

Điều này giúp tránh lẫn:
- current value
- historical series

#### Attributes trong ThingsBoard là gì
ThingsBoard tách attributes thành 3 loại:
- server-side attributes
- shared attributes
- client-side attributes

Giải thích:

`server-side attributes`
- chỉ server nhìn thấy/ghi được
- thích hợp cho metadata và config nội bộ

`shared attributes`
- server quản lý
- device có thể đọc
- hay dùng cho config mà platform muốn đẩy xuống

`client-side attributes`
- device gửi lên
- hay dùng cho metadata do thiết bị tự biết

Ý tưởng đáng học:
- không phải mọi “key-value” đều giống nhau
- access rule là một phần của schema/data model

#### Device profile trong ThingsBoard làm gì
Device profile của họ gom:
- transport settings
- topic filters
- payload format
- queue selection
- rule chain binding
- protobuf schema cho telemetry/attributes/RPC

Ở đây `device profile` không phải chỉ là “nhãn loại thiết bị”. Nó gần như là hợp đồng giữa platform và cả một lớp thiết bị, bao gồm:
- device nói bằng format nào
- nói trên topic nào
- queue nào xử lý
- rule chain nào nhận
- schema nào áp dụng

Điểm rất đáng học:
- profile không chỉ mô tả “loại device”
- profile còn điều khiển **processing behavior**

Đây là chỗ quan trọng cho platform mới:
- profile nên là “ingest contract + routing policy”
- chứ không chỉ là metadata catalogue

#### Payload format của ThingsBoard
Họ support:
- JSON
- Protobuf
- custom/topic mapping theo transport type

Điểm hay:
- họ cho phép cùng loại device đổi format dần từ JSON sang Protobuf
- có compatibility mode để bridge hai thế hệ firmware

Bài học:
- schema evolution là chuyện thực tế
- platform mới phải nghĩ version + migration từ đầu

#### Cách họ tổ chức message trong rule engine
ThingsBoard rule engine dùng khái niệm:
- originator
- metadata
- data
- message type

Giải thích:
- `originator` là thực thể gốc sinh ra message, hiểu ngắn là “ai là nguồn của bản tin này”
- `metadata` là context đi kèm nhưng không phải payload business chính
- `data` là phần dữ liệu chính cần xử lý
- `message type` là loại bản tin logic để pipeline biết phải xử lý theo nhánh nào

Tức là khi vào pipeline, bản tin không còn chỉ là raw payload.
Nó trở thành một object xử lý có:
- dữ liệu chính
- metadata
- nguồn gốc
- loại message

Ý tưởng này rất đáng học cho canonical envelope của hệ mới.

#### Cái không nên copy nguyên
- taxonomy `telemetry/attributes/RPC` rất tốt, nhưng nếu copy cả rule-chain/business model của ThingsBoard thì platform sẽ trở thành app suite rất nặng
- ThingsBoard cũng gắn khá mạnh với dashboard/alarm/application layer

#### Kết luận rút ra
Từ ThingsBoard, nên học:
- phân loại dữ liệu rõ
- profile điều khiển processing
- envelope nội bộ có originator + metadata + data + type
- queue/retry semantics là feature lớn, không phải chi tiết nhỏ

### 29.3 Mainflux: schema và message organization

Nguồn chính:
- https://mainfluxlabs.github.io/docs/architecture/
- https://mainfluxlabs.github.io/docs/messaging/
- https://mainfluxlabs.github.io/docs/storage/

#### Cách họ nghĩ về model
Mainflux xoay quanh:
- thing
- profile
- messages
- channels/subjects

Trong docs kiến trúc:
- `Thing` là source/device/application kết nối vào platform
- `Profile` là cấu hình dùng chung cho một nhóm things; nó quyết định format message, topic/subject nào được consume, và processing hints liên quan

Điểm đáng chú ý:
- profile ở đây vừa là identity grouping, vừa là message contract hint

#### Cách họ tổ chức message
Mainflux nói khá rõ:
- nội dung message không bị ràng buộc tuyệt đối
- nhưng nếu muốn post-process và normalize tốt thì nên dùng SenML

Đây là một lựa chọn rất thực dụng:
- về lý thuyết platform generic
- nhưng trên thực tế họ khuyến khích một format có cấu trúc chuẩn

#### SenML là gì trong ngữ cảnh này
`SenML` là một chuẩn biểu diễn measurement payload cho sensor data. Thay vì gửi JSON tự do, payload đi theo format chuẩn với các field như:
- `bn`: base name
- `bt`: base time
- `bu`: base unit
- `n`: tên measurement
- `v`: giá trị

Điểm mạnh:
- tốt cho sensor data lặp
- compact
- semantics đo đạc rõ

Điểm yếu:
- không tự nhiên cho message nghiệp vụ nested, command ack phức tạp, hay cấu trúc JSON đa dạng

#### `profile.config` trong Mainflux
Docs messaging của Mainflux nói khi tạo profile có thể định nghĩa `config` với các field như:
- `content_type`
- `write`
- `webhook`
- `transformer`
- `smtp_id`

Giải thích:

`content_type`
- payload format là gì
- ví dụ SenML JSON, SenML CBOR, JSON

`write`
- có persist message vào storage không

`transformer`
- cho phép map/parse time hoặc transform nội dung message

Ý tưởng rất đáng học:
- schema/profile không chỉ là validate
- còn nên mang quyết định về persist/transform behavior

#### Topic organization
Mainflux dùng:
- `/messages`
- và có thể có `/messages/subtopic`

Ở đây `subtopic` hiểu đơn giản là lớp phân loại bổ sung dưới topic chính. Nó giúp tách context logic mà không phải đổi toàn bộ transport contract.

Điều này cho thấy:
- một lớp taxonomy message tối giản nhưng thực dụng
- subtopic là cách thêm phân loại mà không làm vỡ transport contract

#### Writers/readers trong storage
Mainflux mô tả message writers là service tiêu thụ message rồi:
- transform
- store vào datastore mong muốn

`writer` ở đây là thành phần chuyên trách ghi dữ liệu vào storage backend. Ý nghĩa kiến trúc là:
- adapter nhận message không nên kiêm luôn semantics của storage
- việc đọc/ghi nên là boundary riêng để thay backend hoặc transform dễ hơn

Điểm học được:
- writers nên là boundary rõ
- đừng để protocol adapter kiêm luôn storage semantics

#### Cái không nên copy nguyên
- domain language `thing/profile/group/org` có thể không hợp với platform mới
- ép tất cả về SenML sẽ quá hẹp nếu platform muốn generic JSON đa loại

#### Kết luận rút ra
Từ Mainflux, nên học:
- profile như một lớp schema + processing hint
- writer/reader boundaries rõ
- subtopic/message taxonomy tối giản nhưng hữu ích
- có thể support open JSON, nhưng vẫn nên có path chuẩn hóa cho dữ liệu đo đạc

### 29.4 OpenRemote: schema và message organization

Nguồn chính:
- https://docs.openremote.io/docs/user-guide/assets-agents-and-attributes/
- https://docs.openremote.io/docs/architecture/overall-architecture/
- https://docs.openremote.io/docs/rest-api/asset-model

#### Mô hình của họ khác hẳn nhiều platform khác
OpenRemote không bắt đầu từ “device message”.
Họ bắt đầu từ:
- asset
- attribute
- attribute event
- descriptors

Giải thích:
- `asset` là đại diện số của một thực thể vật lý hoặc logic
- `attribute` là một thuộc tính của asset, ví dụ nhiệt độ hiện tại hoặc firmware version
- `attribute event` là bản cập nhật giá trị của một attribute tại một thời điểm
- `descriptor` là object mô tả schema/shape/rules của asset hoặc attribute

Đây là tư duy rất giống context broker / digital twin.

#### Asset là gì trong OpenRemote
Asset là đại diện số của một “thing” vật lý hoặc logic.

Ví dụ:
- tòa nhà
- phòng
- cảm biến
- gateway
- service

Điểm quan trọng:
- asset luôn có schema và context đi kèm

#### Attribute là gì
Mỗi asset có attributes.

Attribute:
- có value hiện tại
- có thể có historical datapoints
- có thể có predicted datapoints
- có thể có metadata điều khiển behavior

Đây là cách tổ chức rất mạnh vì:
- current value
- history
- prediction
đều gắn vào cùng một thuộc tính logic

#### Attribute descriptor và value descriptor
Đây là chỗ schema của OpenRemote mạnh nhất.

`attribute descriptor`
- mô tả attribute đó:
  - tên
  - type
  - constraints
  - format
  - units
  - default meta
  - optional hay không

`value descriptor`
- mô tả shape dữ liệu:
  - type class
  - JSON type
  - array dimensions
  - constraints
  - format
  - units

Docs của họ nói rất rõ:
- asset type info có thể coi như schema definition
- schema này phục vụ validation và UI generation

Đây là một ý cực đáng học.

#### AttributeEvent là gì
Trong docs kiến trúc của OpenRemote:
- `AttributeEvent` là event rất quan trọng
- nó đại diện cho giá trị của một attribute tại một thời điểm
- chính qua event này mà live value trong DB được cập nhật

Tức là:
- raw ingress -> AttributeEvent
- AttributeEvent -> update current state

Đây là pattern cực đáng học cho state projection.

#### Events ingress của họ
OpenRemote cho phép event vào qua:
- MQTT topics
- REST API
- WebSocket

Nhưng nội bộ cuối cùng họ quy về event model gắn với asset attributes.

Bài học:
- bên ngoài có thể đa dạng protocol
- bên trong cần một model thống nhất

#### Cái không nên copy nguyên
- nếu áp OpenRemote style quá mạnh, platform mới sẽ nghiêng sang:
  - digital twin platform
  - context broker platform
  hơn là generic message platform phase đầu

Nó không sai, nhưng là một decision lớn.

#### Kết luận rút ra
Từ OpenRemote, nên học:
- schema phải đủ giàu để phục vụ cả validation lẫn UI generation
- current value và historical datapoints nên được nghĩ cùng nhau
- message nội bộ nên biến thành typed state-update events, không chỉ raw log

### 29.5 EdgeX Foundry: schema và message organization

Nguồn chính:
- https://docs.edgexfoundry.org/4.1/microservices/core/data/details/EventsAndReadings/
- https://docs.edgexfoundry.org/2.3/microservices/core/data/Ch-CoreData/
- https://docs.edgexfoundry.org/4.1/microservices/device/services/device-rest/GettingStarted/
- https://docs.edgexfoundry.org/1.2/microservices/core/metadata/Ch-Metadata/

#### Device profile trong EdgeX là gì
EdgeX dùng `device profile` rất nghiêm túc.

Nó là file định nghĩa kiểu thiết bị, thường bằng YAML, mô tả:
- device resources
- device commands
- kiểu dữ liệu
- ràng buộc read/write

Đây không phải chỉ metadata catalog.
Đây gần như là:
- schema contract giữa platform và một class thiết bị

#### Device resource là gì
`device resource` là một điểm dữ liệu hoặc điểm điều khiển cụ thể trên thiết bị.

Ví dụ:
- nhiệt độ hiện tại
- độ ẩm hiện tại
- cooling setpoint

Hiểu dễ:
- resource là “địa chỉ logic” của một giá trị hoặc action

#### Event và Reading trong EdgeX
Docs core data nói rất rõ:
- dữ liệu cảm biến được marshal thành `Event` và `Reading`
- một `Event` là tập của một hoặc nhiều `Reading`
- `Reading` là key/value pair với metadata

Giải thích rất quan trọng:
- `Reading` là một giá trị cảm biến đơn lẻ, ví dụ `temperature=28.4`
- `Event` trong EdgeX không phải “alarm/event” theo nghĩa nghiệp vụ thông thường
- `Event` ở đây là container của một batch readings

Ví dụ:
- thiết bị motor gửi 2 readings:
  - temperature
  - vibration
- EdgeX gói chúng trong một Event

Điểm rất hay:
- họ phân biệt rõ “batch of readings” và “single reading”

#### Value types trong EdgeX
Docs cũng chỉ rõ:
- Reading có `valueType`
- có support object value
- có support binary
- có support CBOR/JSON representation

Bài học:
- generic platform không nên giả định mọi signal đều là scalar string/number
- phải có chỗ cho object/binary classes, dù không phải cái nào cũng đưa vào metrics

#### AutoEvents
EdgeX có `AutoEvents` để polling định kỳ resource từ thiết bị.

`AutoEvents` nghĩa là platform hoặc device service chủ động đọc resource theo lịch thay vì chỉ chờ source push.

Điều này đáng học vì nó nhắc rằng:
- không phải mọi message đều do source chủ động push
- có trường hợp platform/device service chủ động schedule read

#### Data retention của EdgeX
Docs migration/retention của họ khá thẳng:
- Event/Reading trong Core Data được xem là transient
- retention policy rõ ràng

Bài học:
- đừng giả định mọi raw/history đều phải giữ lâu
- raw ingest store nên có TTL/policy từ đầu

#### Cái không nên copy nguyên
- EdgeX vocabulary rất edge/OT-centric
- nếu copy nguyên:
  - device services
  - core metadata
  - core command
  - app services
  sẽ làm hệ mới phình rất nhanh

#### Kết luận rút ra
Từ EdgeX, nên học:
- profile mô tả resource/command rất rõ
- event có thể là container của nhiều readings
- payload/value type phải đủ giàu để chứa object/binary
- retention của raw sensor data phải được nghĩ sớm

### 29.6 Fledge: schema và message organization

Nguồn chính:
- https://github.com/fledge-iot/fledge
- https://fledge-iot.readthedocs.io/en/v2.0.1/plugin_developers_guide/01_01_Data.html
- https://fledge-iot.readthedocs.io/en/v2.5.0/plugins/fledge-south-mqtt-readings/
- https://fledge-iot.readthedocs.io/en/latest/plugins/fledge-south-Csv/index.html

#### Mô hình dữ liệu của Fledge đơn giản nhưng thực dụng
Fledge thường nghĩ dữ liệu theo:
- asset
- datapoint
- reading

Giải thích:
- `asset` là nguồn dữ liệu logic
- `datapoint` là field cụ thể trong asset
- `reading` là bản ghi gồm timestamp và tập các datapoint values

Trong docs “Representing Data”, reading data được lưu và truyền chủ yếu bằng JSON.

Một reading object thường có:
- asset
- timestamp
- readings

Trong đó `readings` là object map datapoint -> value.

Đây là một model rất thực chiến cho telemetry gateway.

#### Asset và datapoint trong Fledge
`asset`
- thực thể nguồn dữ liệu logic

`datapoint`
- field cụ thể bên trong asset

Ví dụ:
```json
{
  "asset": "room1",
  "timestamp": "2026-04-18 10:00:00.000",
  "readings": {
    "temperature": 28.4,
    "humidity": 61.2
  }
}
```

Đây là model rất gần với:
- một batch measurements cho một nguồn

#### South plugins map payload vào asset/datapoint
Docs plugin MQTT/CSV của Fledge cho thấy:
- plugin nhận payload nguồn ngoài
- map nó thành asset + datapoints
- nhiều plugin còn cho config:
  - Asset Name
  - Datapoint Name
  - payload parse behavior

`south plugin` trong Fledge là thành phần nằm gần thiết bị/protocol thực tế nhất. Nó chịu trách nhiệm kéo hoặc nhận dữ liệu từ thế giới bên ngoài rồi chuẩn hóa vào internal model. Đối xứng với nó thường là `north plugin`, tức thành phần đẩy dữ liệu từ platform lên hệ khác như cloud, historian, enterprise sink.

Ý tưởng đáng học:
- adapter/protocol plugin nên có quyền map external payload sang internal canonical form

#### Message payload flexibility
Ví dụ MQTT south plugin của Fledge chấp nhận payload parse được thành:
- JSON object
- Integer
- Float
- String

Điều này rất practical, nhưng cũng cho thấy:
- schema discipline của Fledge không mạnh bằng OpenRemote/EdgeX
- họ ưu tiên ingest flexibility ở edge hơn là schema richness ở core

#### Filters trong Fledge
Các filter như rename/change/threshold đều làm việc trên:
- asset name
- datapoint name
- readings stream

Điểm học được:
- canonical internal model càng ổn định, filter/rule càng đơn giản

#### Cái không nên copy nguyên
- model asset/datapoint/readings của Fledge rất tốt cho telemetry gateway
- nhưng nếu platform mới còn cần event, command, lifecycle, state sync phức tạp, chỉ model này là chưa đủ

#### Kết luận rút ra
Từ Fledge, nên học:
- adapter-driven mapping
- internal model đủ đơn giản cho filters/plugins
- buffering/store-and-forward mindset

### 29.7 Eclipse Kapua: schema và message organization

Nguồn chính:
- https://github.com/eclipse-kapua/kapua

Kapua public materials dễ đọc ở phần:
- lớp dịch vụ
- deployment
- multi-tenant

Nhưng ít rõ ràng hơn các dự án trên ở phần:
- high-level payload schema strategy
- message taxonomy
- canonical internal envelope

Điều này tự nó là một bài học:
- có platform mạnh về quản lý thiết bị/messaging/layering
- nhưng không phải platform nào cũng truyền đạt rõ message model ở docs public

Vì vậy, với yêu cầu hiện tại, Kapua phù hợp để học:
- service layering
- control plane separation
- account/tenant mindset

Nhưng không phải nguồn mạnh nhất để học message schema design.

## 30) So sánh trực diện: họ tổ chức schema và message theo kiểu nào

| Platform | Core message idea | Schema strength | Tổ chức message |
|---|---|---:|---|
| ThingsBoard | Telemetry / Attributes / RPC | Trung bình-khá | Message phân loại theo loại dữ liệu, profile điều khiển transport + schema + queue |
| Mainflux | Thing/Profile/Message | Trung bình | Open content nhưng khuyến khích SenML để normalize/post-process |
| OpenRemote | Asset / Attribute / AttributeEvent | Rất mạnh | Schema-driven asset model, descriptor phục vụ validation + UI generation |
| EdgeX | Device Profile / Event / Reading | Rất mạnh | Device profile định nghĩa resources/commands, event là batch readings |
| Fledge | Asset / Datapoint / Reading | Trung bình | Internal reading model đơn giản, plugin map payload nguồn ngoài vào asset/datapoint |
| Kapua | Messaging + Control plane | Không rõ mạnh ở docs công khai | Học layering hơn là payload schema specifics |

## 31) Điều chỉnh trực tiếp vào design của platform mới sau khi nghiên cứu schema/message model

### 31.1 Nên thêm `ingest profile`
Đây là chỗ chịu ảnh hưởng rõ từ:
- ThingsBoard device profile
- Mainflux profile config
- EdgeX device profile

`ingest profile` cho hệ mới nên chứa:
- accepted channels
- accepted content types
- validator reference
- extractor reference
- signal catalog binding
- state projector binding
- queue policy class
- retry policy class
- command contract binding nếu có

Nếu không có lớp này:
- logic sẽ rơi vào code
- onboarding source mới sẽ phải sửa bridge nhiều

### 31.2 Nên tách taxonomy bản tin của hệ mới rõ hơn
Học từ ThingsBoard/OpenRemote/EdgeX:

Đề xuất taxonomy cho hệ mới:
- `telemetry`
  - measurements/time-series
- `state`
  - state sync/update
- `event`
  - discrete facts/alerts
- `command`
  - platform -> source action request
- `command-ack`
  - source -> platform response cho command
- `lifecycle`
  - boot, reconnect, provision, decommission
- `log`
  - source-side logs nếu có

Điểm quan trọng:
- không dùng một channel duy nhất cho mọi thứ

### 31.3 Nên giữ canonical envelope, nhưng cho phép 2 internal shapes
Sau khi nhìn EdgeX/Fledge/OpenRemote, có thể chốt:

#### Shape A: canonical raw message
Phù hợp cho:
- logs/messages tab
- audit
- ingest debugging

#### Shape B: canonical processed projection
Phù hợp cho:
- signals
- state updates
- events

Nói cách khác:
- đừng cố bắt một object vừa là raw archive vừa là state projection vừa là metric sample

### 31.4 Nên hỗ trợ `signal extraction` và `state projection` như hai bước riêng
OpenRemote cho thấy update current state là bước riêng.
ThingsBoard cho thấy enrichment/rule fetch là bước riêng.
EdgeX cho thấy reading batch và command/resource model là bước riêng.

Vì vậy:
- extract signals != update state
- update state != generate event

Đây phải là các stage khác nhau trong pipeline.

### 31.5 Nên coi UI generation là một consumer của schema
OpenRemote làm điểm này rất tốt:
- descriptor phục vụ cả validation lẫn UI generation

Platform mới không cần đi xa như họ ngay phase đầu.
Nhưng nên chốt một điều:
- schema metadata không chỉ phục vụ backend
- nó phải đủ để giúp frontend biết:
  - field nào numeric
  - field nào unit gì
  - field nào timestamp
  - field nào enum/boolean/object

Nếu không, UI generic sẽ nhanh thành JSON dump.

## 32) Nguồn chính cho phần schema và message organization

- ThingsBoard Device Profiles: https://thingsboard.io/docs/user-guide/device-profiles/
- ThingsBoard Attributes: https://thingsboard.io/docs/user-guide/attributes/
- ThingsBoard Telemetry: https://thingsboard.io/docs/user-guide/telemetry/
- ThingsBoard Rule Engine Overview: https://thingsboard.io/docs/user-guide/rule-engine-2-0/overview/
- Mainflux Architecture: https://mainfluxlabs.github.io/docs/architecture/
- Mainflux Messaging: https://mainfluxlabs.github.io/docs/messaging/
- Mainflux Storage: https://mainfluxlabs.github.io/docs/storage/
- OpenRemote Assets, Agents and Attributes: https://docs.openremote.io/docs/user-guide/assets-agents-and-attributes/
- OpenRemote Overall Architecture: https://docs.openremote.io/docs/architecture/overall-architecture/
- OpenRemote Asset Model API docs: https://docs.openremote.io/docs/rest-api/asset-model
- EdgeX Core Data Events and Readings: https://docs.edgexfoundry.org/4.1/microservices/core/data/details/EventsAndReadings/
- EdgeX Core Data: https://docs.edgexfoundry.org/2.3/microservices/core/data/Ch-CoreData/
- EdgeX Device REST Getting Started: https://docs.edgexfoundry.org/4.1/microservices/device/services/device-rest/GettingStarted/
- EdgeX Core Metadata: https://docs.edgexfoundry.org/1.2/microservices/core/metadata/Ch-Metadata/
- Fledge GitHub: https://github.com/fledge-iot/fledge
- Fledge Representing Data: https://fledge-iot.readthedocs.io/en/v2.0.1/plugin_developers_guide/01_01_Data.html
- Fledge MQTT South Plugin: https://fledge-iot.readthedocs.io/en/v2.5.0/plugins/fledge-south-mqtt-readings/
- Fledge CSV South Plugin: https://fledge-iot.readthedocs.io/en/latest/plugins/fledge-south-Csv/index.html
- Eclipse Kapua GitHub: https://github.com/eclipse-kapua/kapua
