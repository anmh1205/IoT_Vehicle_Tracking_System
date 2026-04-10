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
