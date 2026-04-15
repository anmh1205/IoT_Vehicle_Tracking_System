# Brainstorm chi tiết: OBD diagnostics cho cảnh báo bảo trì (2026-04-10)

## 1) Mục tiêu sản phẩm đã chốt
- Xây dựng tính năng **cảnh báo bảo trì** dựa trên OBD.
- Ưu tiên giai đoạn đầu cho **xe con OBD-II**.
- Tập trung vào **độ tin cậy cảnh báo cao** (giảm false-positive).
- Không làm module lập lịch bảo trì phức tạp ở MVP.

## 2) Các quyết định đã chốt trong phiên chat
1. **Phạm vi xe:** xe con OBD-II trước.
2. **Mức tự động:** cảnh báo bảo trì, chưa làm scheduling phức tạp.
3. **Chiến lược dữ liệu:** chuẩn OBD-II trước, OEM-specific sau.
4. **KPI ưu tiên:** ít cảnh báo sai (precision cao).
5. **Thiết bị/thu thập:** read-only, không can thiệp ECU.
6. **Dữ liệu ưu tiên:** PID trạng thái hoạt động + DTC generic thường gặp.
7. **Quan sát vận hành:** cần có UI phía server/FE để xem raw message theo dạng bảng.

---

## 3) Profile thu thập OBD read-only chi tiết

### 3.1 Guardrail bắt buộc (để chỉ đọc)
- ✅ Dùng mode: `01`, `02`, `03`, `06`, `07`, `09`, `0A`
- ❌ Không dùng mode: `04` (clear DTC/reset monitor)

### 3.2 Pha A — Khởi tạo adapter (1 lần mỗi phiên)
| Bước | Lệnh |
|---|---|
| Reset | `ATZ` |
| Tắt echo | `ATE0` |
| Tắt linefeed | `ATL0` |
| Tắt spaces | `ATS0` |
| Tắt header (nếu parser đơn giản) | `ATH0` |
| Auto protocol | `ATSP0` |
| Kiểm tra protocol | `ATDP` |

### 3.3 Pha B — Discovery capability (1 lần khi kết nối)
| Mục tiêu | Lệnh |
|---|---|
| VIN | `0902` |
| PID support block 1 | `0100` |
| PID support block 2 | `0120` |
| PID support block 3 | `0140` |
| PID support block 4 | `0160` |
| Monitor/MIL base | `0101` |

Ghi chú:
- Nếu xe support block cao hơn thì query tiếp: `0180`, `01A0`, ...
- Cache capability theo `vin + ecu profile` để giảm thời gian discovery các phiên sau.

### 3.4 Pha C — Polling phân tầng (runtime)

#### Fast loop (1s, chỉ PID cốt lõi)
| Lệnh | Ý nghĩa |
|---|---|
| `010C` | RPM |
| `010D` | Speed |
| `0105` | Coolant Temp |
| `0104` | Engine Load |
| `0111` | Throttle Position |
| `0106` | STFT B1 |
| `0107` | LTFT B1 |
| `0108` | STFT B2 (nếu support) |
| `0109` | LTFT B2 (nếu support) |
| `0110` hoặc `010B` | MAF hoặc MAP |
| `0142` | Module Voltage |

#### Slow loop (10–30s)
| Lệnh | Ý nghĩa |
|---|---|
| `0101` | MIL + readiness |
| `0103` | Fuel system status |
| `010F` | Intake Air Temp |
| `011F` | Runtime since start |
| `0121` | Distance with MIL on |
| `0131` | Distance since DTC cleared |
| `012F` | Fuel level |

### 3.5 Pha D — Event snapshot (khi có dấu hiệu lỗi)
Kích hoạt khi: `MIL on`, pending DTC mới, fuel trim lệch kéo dài, nhiệt độ bất thường, rung/misfire pattern.

| Mục tiêu | Lệnh |
|---|---|
| Stored DTC | `03` |
| Pending DTC | `07` |
| Permanent DTC | `0A` |
| Freeze frame PID cần thiết | `0205`, `020C`, `020D`, `0211`, ... |
| Monitor test details | `06` (nếu parser hỗ trợ) |

### 3.6 Chu kỳ gửi server (khuyến nghị)
- Fast loop: gom batch gửi mỗi `3–5 giây`
- Slow loop: gửi mỗi `30–60 giây`
- Event snapshot: gửi ngay lập tức

Luôn gửi kèm:
- `vin`, `device_id`, `trip_id`, `timestamp_utc`
- `mode`, `pid_or_dtc`, `raw_hex`, `decoded_value`, `unit`, `supported`

### 3.7 Danh mục DTC generic ưu tiên decode (để bảo trì)
Nhóm ưu tiên triển khai ngay:
- Fuel/Air: `P0100-P0103`, `P0171`, `P0172`, `P0174`
- Misfire: `P0300-P0304`
- Cooling: `P0128`
- O2/Catalyst: `P0130`, `P0133`, `P0141`, `P0420`, `P0430`
- EVAP: `P0440`, `P0442`, `P0455`, `P0456`
- Voltage: `P0560`, `P0562`, `P0563`
- Transmission generic thường gặp: `P0700`, `P0715`, `P0720`, `P0730`, `P0740`

---

## 4) A) JSON schema đề xuất (raw + normalized)

### A.1 Payload từ device -> MqttBridge (mở rộng từ hiện tại)
Hiện tại bridge đang nhận tại `payload.types.ts` và validate ở `payload.validator.ts`.

Đề xuất thêm `diagnostics` (optional):

```json
{
  "device_id": "dev-001",
  "auth_token": "xxx",
  "timestamp": 1712730000000,
  "data": {
    "vibration": 120,
    "battery_top": 13.8,
    "battery_bot": 4.0,
    "latitude": 10.77,
    "longitude": 106.69,
    "speed": 42,
    "course": 135,
    "satellites": 12,
    "ignition": true,
    "error_code": 0
  },
  "diagnostics": {
    "obd_mode": "01",
    "mil_on": false,
    "readiness": {
      "misfire": "complete",
      "fuel_system": "complete",
      "catalyst": "incomplete"
    },
    "pids": [
      { "pid": "0C", "name": "rpm", "value": 1800, "unit": "rpm", "raw_hex": "1AF8" },
      { "pid": "05", "name": "coolant_temp", "value": 92, "unit": "C", "raw_hex": "84" },
      { "pid": "42", "name": "module_voltage", "value": 13.8, "unit": "V", "raw_hex": "35E8" }
    ],
    "dtc": {
      "stored": ["P0171"],
      "pending": ["P0301"],
      "permanent": []
    },
    "freeze_frame": {
      "rpm": 2450,
      "speed_kph": 63,
      "coolant_c": 90,
      "throttle_pct": 28
    },
    "mode06": [
      { "tid": "21", "cid": "01", "value": 0.72, "limit": 0.80, "status": "near_fail" }
    ]
  },
  "metadata": {
    "schema_version": "v1.1.0",
    "message_id": "8d5f1f48-7e57-4f79-bf52-4a3cb8a7f131",
    "sent_at": 1712730000234,
    "seq_no": 1204,
    "boot_id": "boot-3f8a"
  }
}
```

### A.2 Normalized event trong backend (để rule/alert)

```json
{
  "event_type": "obd_diagnostic_snapshot",
  "device_id": "dev-001",
  "vehicle_id": "veh-123",
  "timestamp": 1712730000000,
  "signals": {
    "rpm": 1800,
    "speed_kph": 42,
    "coolant_c": 92,
    "engine_load_pct": 41,
    "stft_b1_pct": 8.2,
    "ltft_b1_pct": 12.5,
    "maf_gps": 7.8,
    "module_voltage_v": 13.8
  },
  "diagnostic_state": {
    "mil_on": false,
    "dtc_stored": ["P0171"],
    "dtc_pending": ["P0301"],
    "dtc_permanent": [],
    "readiness": { "catalyst": "incomplete" }
  },
  "quality": {
    "supported_pid_bitmap": ["0100", "0120"],
    "missing_required_signals": [],
    "sample_freshness_ms": 350
  }
}
```

---

## 5) B) Mapping DTC -> severity/action (v1 gợi ý)

| DTC | Severity mặc định | Action gợi ý |
|---|---|---|
| `P0300-P0304` | high/critical | Kiểm tra misfire (bugi/cuộn/kim phun), hạn chế tải cao |
| `P0171/P0174` | high | Kiểm tra rò khí nạp, MAF, áp suất nhiên liệu |
| `P0172` | medium/high | Kiểm tra rich condition, injector, cảm biến |
| `P0128` | medium | Kiểm tra thermostat/hệ làm mát |
| `P0420/P0430` | medium | Kiểm tra catalyst/O2, theo dõi trend trước khi thay |
| `P0130/P0133/P0141` | medium | Kiểm tra O2 sensor/heater/wiring |
| `P0562` | high | Kiểm tra ắc-quy/sạc/alternator |
| `P0563` | high | Kiểm tra regulator quá áp |
| `P0442/P0455/P0456` | low/medium | Kiểm tra nắp bình, rò EVAP |
| `P0700` | medium | Đọc thêm lỗi hộp số chi tiết (TCM nếu có) |

Rule nâng/giảm severity:
- `+1` mức nếu `mil_on=true` + lặp nhiều trip.
- `-1` mức nếu chỉ pending 1 lần, chưa lặp.
- Không phát alert nếu thiếu dữ liệu tối thiểu (quality gate fail).

---

## 6) C) Cách xử lý phía server (fit với codebase hiện tại)

### C.1 MqttBridge (ingest)
Điểm can thiệp logic là `rawdata.handler.ts`.

Hiện đã parse + validate + write metrics/log + publish internal event.

Đề xuất pipeline:
1. Validate `diagnostics` optional.
2. Ghi raw diagnostics vào raw channel để trace/audit (VictoriaLogs hoặc PostgreSQL JSONB).
3. Trích/flatten signal numeric -> write metrics (RPM/temp/trim/voltage...) vào VictoriaMetrics.
4. Publish internal event `alert` khi rule thô pass (ví dụ critical immediate).
5. Đẩy normalized diagnostic snapshot cho backend consumer.

> Ghi chú thực thi: tránh nhét raw JSON trực tiếp vào metric label/value của VM (cardinality và query không phù hợp TSDB).

### C.2 Backend
Bạn đã có module alert đầy đủ:
- type: `alert.types.ts`
- repo: `alert.repository.ts`
- controller/routes: `alert.controller.ts`, `alert.routes.ts`

Đề xuất thêm 2 khối:
1. **Diagnostic evaluator service**
   - Input: normalized snapshot
   - Output: alert candidate + confidence + evidence
2. **Alert dedup service**
   - Key: `vehicle_id + alert_type + root_cause + window`
   - Mục tiêu: tránh spam 1 lỗi lặp

Không cần làm module mới lớn, chỉ mở rộng `alert_type/title/message/threshold_value/actual_value` đang có.

### C.3 Frontend hiển thị
Đề xuất 3 nơi:
1. Trang Alerts (ưu tiên): thêm filter `source=obd`, `dtc`, `confidence`.
2. Vehicle detail: card “OBD Health”
   - DTC stored/pending/permanent
   - MIL status
   - top 3 insight
3. Maintenance page: chỉ hiển thị “recommended maintenance alerts” (không auto schedule phức tạp).

### C.4 FE xem bản tin raw (dạng bảng)
- Trang đề xuất: `Diagnostics Raw`.
- Cột chính:
  - `received_at`, `device_id`, `topic`, `message_id`, `schema_version`, `mode`, `pid_count`, `dtc_count`, `ingest_latency_ms`.
- Tính năng:
  - filter theo device/time/mode/has_dtc,
  - phân trang + sort theo thời gian,
  - expand row xem JSON pretty,
  - mask trường nhạy cảm (auth_token).

---

## 7) D) Lộ trình triển khai nhanh (không phá hệ thống)

### Phase 1
- Extend payload + validator + type.
- Lưu raw diagnostics vào raw channel.
- Viết full numeric metrics vào VM.
- Tạo alerts cơ bản theo DTC severity map.
- FE bản đầu cho bảng raw message.

### Phase 2
- Thêm correlation rule (DTC + PID trend + readiness).
- Dedup/cooldown/hysteresis.
- Confidence score.
- API timeline hợp nhất metric + raw cho FE.

### Phase 3
- UI enrich (vehicle health + explainability).
- Metrics đánh giá false-positive.
- Shadow mode tuning.

---

## 8) API timeline hợp nhất (để FE trace 1 luồng)

### 8.1 Endpoint đề xuất
`GET /api/v1/diagnostics/timeline`

### 8.2 Query params
- `deviceId` (required)
- `from` (epoch ms, required)
- `to` (epoch ms, required)
- `limit` (default 200)
- `cursor` (optional)
- `includeRaw` (default false)
- `dtcOnly` (default false)

### 8.3 Response mẫu
```json
{
  "data": [
    {
      "ts": 1712730000000,
      "deviceId": "dev-001",
      "tripId": "trip-1712729900",
      "metrics": {
        "rpm": 1800,
        "speedKph": 42,
        "coolantC": 92,
        "engineLoadPct": 41,
        "stftB1Pct": 8.2,
        "ltftB1Pct": 12.5,
        "moduleVoltageV": 13.8
      },
      "diagnostics": {
        "milOn": false,
        "dtcStored": ["P0171"],
        "dtcPending": ["P0301"],
        "dtcPermanent": [],
        "readiness": {
          "misfire": "complete",
          "fuelSystem": "complete",
          "catalyst": "incomplete"
        }
      },
      "raw": {
        "topic": "v1/dev-001/rawdata",
        "messageId": "8d5f1f48-7e57-4f79-bf52-4a3cb8a7f131",
        "schemaVersion": "v1.1.0",
        "payload": {
          "...": "included only when includeRaw=true"
        }
      }
    }
  ],
  "paging": {
    "nextCursor": "1712730000000:8d5f1f48-7e57-4f79-bf52-4a3cb8a7f131",
    "hasMore": true
  }
}
```

### 8.4 Quy tắc API
- `includeRaw=false`: trả metrics + diagnostics normalized (nhẹ).
- `includeRaw=true`: thêm raw payload đã mask field nhạy cảm.
- `dtcOnly=true`: chỉ trả records có DTC.

---

## 9) Rủi ro và kiểm soát
- Rủi ro cardinality trong VM nếu lạm dụng label động (`message_id`, raw_hex dài, dtc list string).
- Rủi ro payload raw chứa dữ liệu nhạy cảm.
- Kiểm soát:
  - mask token trước khi expose,
  - chuẩn hóa label set cố định,
  - retention policy rõ cho raw.

---

## 10) Unresolved questions
1. Chọn kênh raw chính: VictoriaLogs hay PostgreSQL JSONB (hoặc dual-write)?
2. Retention raw: 7/30/90 ngày?
3. Mức chi tiết raw trả về mặc định cho FE (full hay masked-lite)?
4. Ngưỡng confidence ban đầu dùng 3 mức hay score 0-100?

---

## 11) Gap kỹ thuật so với codebase hiện tại (2026-04-15)

### 11.1 Firmware đã có OBD polling cơ bản, nhưng chưa đẩy diagnostics contract
- Đã có poll PID trong `state_machine.c`: `0x0C`, `0x0D`, `0x05`, `0x2F`, `0x04`.
- Đã có retry + cảnh báo sự cố OBD (`obd_connect_failed`, `obd_elm327_init_failed`) qua topic events.
- Chưa có DTC flow (`03`, `07`, `0A`), chưa có readiness/MIL (`0101`) trong payload publish cloud.
- `data_format_rawdata` mới gửi `data` (vibration, battery, gps...), chưa có object `diagnostics`.

### 11.2 MqttBridge chưa nhận và xử lý diagnostics object
- `payload.types.ts` và `payload.validator.ts` chưa có schema `diagnostics`.
- `rawdata.handler.ts` mới write metrics nền (vibration, battery, gps...), chưa flatten OBD signals.
- Chưa publish internal event loại `data` dù topic `internal/events/device/data` đã khai báo.

### 11.3 Backend realtime có nhận alert event, nhưng chưa persist alert từ MQTT bridge
- `mqtt-event-listener.ts` hiện map `event_type=alert` -> `publishEvent('alert:new', ...)` chỉ để socket realtime.
- Chưa gọi `alertRepo.create` hoặc `alertCrudService.createAlert` trong luồng internal MQTT event.
- Hệ quả: alert OBD từ firmware/MqttBridge có thể không xuất hiện ổn định trong bảng alerts (DB-backed list).

### 11.4 Schema DB hiện tại chưa thuận cho OBD alert type riêng
- Enum `alert_type` hiện chưa có nhóm OBD-specific (đang có `maintenance_due`, `device_offline`, ...).
- Có thể tận dụng `maintenance_due` cho MVP để tránh migration sớm.
- Nếu muốn tách semantic rõ (`obd_dtc`, `obd_channel_unstable`), cần migration enum.

### 11.5 FE đã có nền để triển khai nhanh
- Có trang Alerts + filter severity/status.
- Có trang Maintenance với CRUD đầy đủ.
- Có Device Detail modal + chart hooks có thể tái dùng để thêm OBD Health card.
- Có System Admin table query cho `event_logs`, có thể tận dụng làm raw diagnostics viewer bản đầu.

---

## 12) Hướng phát triển tiếp (chốt đề xuất)

### 12.1 Chọn chiến lược “Signal-first, DTC-later” cho MVP
- Không nhảy ngay vào full DTC + freeze frame.
- Ưu tiên pipeline ổn định dựa trên tín hiệu đã có sẵn: RPM/speed/coolant/fuel/load + OBD connect-fail events.
- Sau khi kiểm soát false-positive và channel quality mới mở rộng DTC.

### 12.2 Lý do chọn hướng này
- Fit trực tiếp với firmware hiện tại, ít rủi ro.
- Giảm khối lượng parser/contract thay đổi trong một lần.
- Tạo giá trị vận hành sớm (maintenance recommendations, health alerts) trước khi “đào sâu chẩn đoán”.

---

## 13) Lộ trình triển khai v2 (thực dụng, không phá hệ thống)

### Phase G0 — Gate độ ổn định OBD channel (2-3 ngày)
1. Thêm metric quan sát BLE/OBD session quality từ firmware event stream.
2. Chuẩn hóa dashboard theo dõi:
   - `obd_connect_success_rate`
   - `obd_poll_timeout_rate`
   - `obd_reconnect_attempts_per_hour`
3. Gate trước khi mở feature alert bảo trì:
   - Success rate >= 90% trên thiết bị pilot.
   - Timeout rate <= 10%.

### Phase G1 — Contract diagnostics tối thiểu (1 tuần)
1. Mở rộng payload firmware: thêm `diagnostics` object (không breaking, optional).
2. MqttBridge:
   - Update `payload.types.ts`, `payload.validator.ts`.
   - Flatten metrics OBD hiện có sang VictoriaMetrics.
   - Write raw diagnostics vào VictoriaLogs (`event_type=obd_diagnostic_raw`).
3. Publish internal `data` event để backend/FE realtime có thể subscribe thống nhất.

### Phase G2 — Persist alert + dedup (1 tuần)
1. Backend thêm `diagnostic evaluator service` tiêu thụ internal events.
2. Persist alert vào bảng `alerts` (không chỉ socket event).
3. Dùng dedup key theo cửa sổ thời gian:
   - `vehicle_id + rule_id + root_cause + 15m window`.
4. MVP dùng `alert_type='maintenance_due'` để tránh enum migration sớm.

### Phase G3 — FE hiển thị theo workflow vận hành (1 tuần)
1. Alerts page:
   - Thêm filter logic theo `source=obd` (derive từ message/metadata).
   - Hiển thị confidence + evidence ngắn.
2. Device detail:
   - Card `OBD Health` (connected state, last PID sample age, top issues).
3. Raw diagnostics table:
   - Bản đầu dùng `system-admin` query `event_logs` + preset filter `event_type=obd_diagnostic_raw`.

### Phase G4 — Mở rộng DTC/recommendation engine (sau khi G0-G3 ổn định)
1. Firmware thêm query `0101`, `03`, `07`, `0A`.
2. MqttBridge/backend bổ sung parser DTC list + rule nâng confidence.
3. Lúc này mới cân nhắc migration enum `alert_type` cho OBD semantic riêng.

---

## 14) Data contract v1.2 đề xuất (MVP)

```json
{
  "device_id": "dev-001",
  "auth_token": "xxx",
  "timestamp": 1712730000000,
  "data": {
    "vibration": 120,
    "battery_top": 13.8,
    "battery_bot": 4.0,
    "latitude": 10.77,
    "longitude": 106.69,
    "speed": 42,
    "course": 135,
    "satellites": 12,
    "ignition": true,
    "error_code": 0
  },
  "diagnostics": {
    "channel": {
      "ble_obd_connected": true,
      "elm_ready": true,
      "poll_interval_ms": 1200
    },
    "signals": {
      "rpm": 1800,
      "obd_speed_kph": 42,
      "coolant_c": 92,
      "fuel_level_pct": 58,
      "engine_load_pct": 41
    },
    "quality": {
      "sample_age_ms": 800,
      "missing_signals": []
    },
    "events": [
      {
        "code": "obd_connect_failed",
        "count_5m": 0
      }
    ]
  },
  "metadata": {
    "schema_version": "v1.2.0",
    "message_id": "8d5f1f48-7e57-4f79-bf52-4a3cb8a7f131",
    "sent_at": 1712730000234,
    "seq_no": 1204,
    "boot_id": "boot-3f8a"
  }
}
```

Ghi chú:
- MVP chưa bắt buộc DTC array.
- `diagnostics` optional để rollout từng device.
- `schema_version` bump lên `v1.2.0`.

---

## 15) Rule alert bảo trì khả thi ngay (không cần DTC)

### R1: OBD channel unstable
- Điều kiện:
  - `obd_connect_failed` lặp >= 3 lần trong 15 phút.
- Alert:
  - severity = `medium`
  - title = `OBD channel unstable`
  - action = kiểm tra adapter BLE, nguồn OBD port, vị trí thiết bị.

### R2: Coolant risk pattern
- Điều kiện:
  - `coolant_c >= 105` trong >= 3 mẫu liên tiếp
  - và `engine_load_pct >= 60`.
- Alert:
  - severity = `high`
  - action = kiểm tra hệ làm mát, quạt, nước làm mát.

### R3: Idle-load anomaly
- Điều kiện:
  - `rpm > 900` kéo dài khi `obd_speed_kph <= 3` trong >= 10 phút.
- Alert:
  - severity = `medium`
  - action = kiểm tra chế độ không tải, vệ sinh bướm ga, đánh giá thói quen vận hành.

### R4: Voltage risk phối hợp
- Điều kiện:
  - `battery_top < 12.0` và `engine_load_pct > 50` trong >= 5 phút.
- Alert:
  - severity = `high`
  - action = kiểm tra ắc quy/alternator.

---

## 16) Mapping thay đổi theo file/module (impact map)

### Firmware
- `main/src/state_machine.c`:
  - Bổ sung publish fields cho `diagnostics.channel/signals/quality`.
  - Giữ nguyên cadence poll hiện tại để tránh regression.
- `main/src/data_formatter.c` và `main/inc/data_formatter.h`:
  - Extend JSON formatter cho `diagnostics`.
- `main/inc/app_state.h`:
  - Nếu cần, thêm runtime fields phục vụ quality snapshot.

### MqttBridge
- `src/types/payload.types.ts`:
  - Thêm type `diagnostics`.
- `src/validators/payload.validator.ts`:
  - Validate `diagnostics` optional.
- `src/handlers/rawdata.handler.ts`:
  - Flatten OBD metrics.
  - Write raw diagnostics log.
  - Publish internal `data` event.
- `src/publishers/internal-event.publisher.ts`:
  - Duy trì envelope chuẩn, mở rộng payload keys.

### Backend
- `src/infrastructure/realtime/mqtt-event-listener.ts`:
  - Không chỉ broadcast realtime, cần route sang evaluator/persistence.
- `src/domain/alert/*`:
  - Reuse createAlert flow, thêm dedup guard.
- `src/api/validators/alert.validator.ts`:
  - Nếu cần thêm filter `source/confidence`, cập nhật schema query.

### Frontend
- `src/app/dashboard/alerts/page.tsx`
- `src/features/alerts/components/alert-filters.tsx`
- `src/features/alerts/components/alert-columns.tsx`
- `src/features/devices/components/device-detail-modal/overview-tab.tsx`
- `src/lib/api/alerts.ts`

---

## 17) KPI + Definition of Done cho release đầu

### KPI kỹ thuật
- Alert ingest latency (device -> alert row DB) p95 <= 5s.
- OBD sample parse success rate >= 95% trên thiết bị pilot.
- Duplicate alert rate <= 5% (sau dedup window).

### KPI sản phẩm
- Tỷ lệ alert bị dismiss trong 7 ngày đầu <= 30%.
- Tỷ lệ alert được xác nhận hoặc resolve >= 60% (proxy cho hữu ích vận hành).

### DoD
1. Có payload `diagnostics` từ ít nhất 3 thiết bị pilot.
2. Alerts OBD xuất hiện được cả realtime và list DB.
3. Có filter xem riêng alerts nguồn OBD.
4. Có dashboard theo dõi false-positive và channel quality.

---

## 18) Quyết định tạm thời để giảm rủi ro

1. Dùng `VictoriaLogs` làm kênh raw chính cho diagnostics trong G1-G3.
2. Chưa dual-write PostgreSQL JSONB ở MVP.
3. Dùng `alert_type='maintenance_due'` tạm thời cho OBD maintenance alerts.
4. Chưa bật DTC parser trong firmware cho đến khi qua gate G0.

---

## 19) Unresolved questions (updated)
1. Chốt rollout pilot bao nhiêu thiết bị: 3 hay 10?
2. Chọn window dedup mặc định: 15 phút hay 30 phút?
3. Có chấp nhận dùng tạm `alert_type='maintenance_due'` cho OBD ở MVP không?
4. Có cần migration enum ngay để tách `obd_channel_unstable` từ đầu không?
5. Retention cho `obd_diagnostic_raw` ở VictoriaLogs: 30 hay 90 ngày?
6. Ngưỡng R2 coolant risk có giữ `>=105C` hay hạ xuống `>=100C` cho xe tải?
7. Khi nào cho phép bật DTC phase: sau 2 tuần pilot ổn định hay theo KPI gate?
