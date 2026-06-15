# Mock Session Data Research: TRACKER_002 (Phenikaa → Bách Khoa HN)

## Mục tiêu

Sinh mock data phiên hoàn chỉnh cho `TRACKER_002` **y hệt firmware thật**, tuyến ĐH Phenikaa → ĐH Bách Khoa Hà Nội (~18km, ~35 phút nội thành).

---

## 1. Firmware Behavior Summary

### Config mặc định (từ `app_config_defaults.c`)

| Param | Value | Ý nghĩa |
|---|---|---|
| `tracking_interval_s` | **1** | Publish rawdata mỗi 1 giây khi DRIVING |
| `heartbeat_interval_s` | 120 | Heartbeat khi PARKED/SLEEP |
| `alarm_interval_s` | 3 | Publish mỗi 3s trong ALARM mode |
| `ignition_off_hold_ms` | 15000 | Chờ 15s sau IGN OFF mới chuyển PARKED |
| `ignition_adc_threshold_mv` | 13000 | ADC ≥ 13V → ignition ON |

### FSM States (từ `state_machine_core.c`)

```
INIT → CHECK_IGN → DRIVING → PARKED → SLEEP
                             ↓
                          ALARM (IMU wake)
```

### Session Lifecycle (từ `session_mgr.c`)

1. `session_mgr_on_ignition_sample(true, now_ms)` — debounce
2. Sau `CONFIG_TRACKER_IGNITION_DEBOUNCE_MS` → `pending_start = true`
3. FSM gọi `session_mgr_mark_started()` → `local_session_key` tăng monotonic
4. Publish STATUS `running` + `boundary_event: "started"`
5. Bắt đầu publish rawdata mỗi 1s
6. IGN OFF → debounce → FSM chờ `ignition_off_hold_ms` (15s)
7. Publish STATUS `stopped` + `boundary_event: "ended"`

---

## 2. Payload Contract (từ `data_formatter.c`)

### 2.1 Status Payload — Session Start

Topic: `v1/TRACKER_002/status` | QoS: 1 | Retain: true

```json
{
  "device_id": "TRACKER_002",
  "auth_token": "<64-char-hash>",
  "status": "running",
  "timestamp": 1749116400000,
  "timestamp_trusted": true,
  "session_id": 1,
  "local_session_key": 1,
  "canonical_session_id": "0",
  "boot_id": "fw-TRACKER_002-abc12345",
  "boundary_event": "started",
  "state": {
    "ignition_state": "ON",
    "motion_state": "STATIONARY",
    "vehicle_state": "IDLING_ON",
    "device_state": "ACTIVE",
    "sleep_mode": "NONE"
  },
  "device_alerts": [],
  "ecu_alerts": [],
  "metadata": {
    "schema_version": "v2.0.0",
    "message_id": "uuid-v4",
    "sent_at": 1749116400000,
    "seq_no": 1,
    "boot_id": "fw-TRACKER_002-abc12345"
  }
}
```

### 2.2 Rawdata Payload — Telemetry (mỗi 1s khi driving)

Topic: `v1/TRACKER_002/rawdata` | QoS: 0

```json
{
  "device_id": "TRACKER_002",
  "auth_token": "<64-char-hash>",
  "timestamp": 1749116405000,
  "timestamp_trusted": true,
  "uptime": 85000,
  "local_session_key": 1,
  "canonical_session_id": "0",
  "boot_id": "fw-TRACKER_002-abc12345",
  "data": {
    "imu_accel_delta_mps2": 0.45,
    "vehicle_battery": 13.82,
    "device_battery": 4.05,
    "latitude": 20.9614,
    "longitude": 105.7882,
    "speed": 32.5,
    "course": 45.2,
    "satellites": 12,
    "ignition": true,
    "error_code": 0
  },
  "diagnostics": {
    "channel": {
      "ble_obd_connected": true,
      "elm_ready": true,
      "ecu_state": "normal",
      "poll_interval_ms": 1200,
      "connect_fail_count_5m": 0
    },
    "signals": {
      "rpm": 1850,
      "obd_speed_kph": 33.1,
      "coolant_c": 88,
      "fuel_level_pct": 62,
      "engine_load_pct": 38
    },
    "quality": {
      "sample_age_ms": 450,
      "missing_signals": []
    },
    "events": [],
    "gnss": {
      "query_mode": "cgnsinf",
      "fix_valid": true,
      "satellites_reported": 12
    }
  },
  "state": {
    "ignition_state": "ON",
    "motion_state": "MOVING",
    "vehicle_state": "MOVING_ON",
    "device_state": "ACTIVE",
    "sleep_mode": "NONE"
  },
  "device_alerts": [],
  "ecu_alerts": [],
  "metadata": {
    "schema_version": "v2.0.0",
    "message_id": "uuid-v4",
    "sent_at": 1749116405000,
    "seq_no": 6,
    "boot_id": "fw-TRACKER_002-abc12345"
  }
}
```

### 2.3 Status Payload — Session End

```json
{
  "device_id": "TRACKER_002",
  "auth_token": "<64-char-hash>",
  "status": "stopped",
  "timestamp": 1749118500000,
  "timestamp_trusted": true,
  "local_session_key": 1,
  "canonical_session_id": "<server-assigned>",
  "boot_id": "fw-TRACKER_002-abc12345",
  "boundary_event": "ended",
  "state": {
    "ignition_state": "OFF",
    "motion_state": "STATIONARY",
    "vehicle_state": "PARKED_OFF",
    "device_state": "ACTIVE",
    "sleep_mode": "NONE"
  },
  "device_alerts": [],
  "ecu_alerts": [],
  "metadata": {
    "schema_version": "v2.0.0",
    "message_id": "uuid-v4",
    "sent_at": 1749118500000,
    "seq_no": 2105,
    "boot_id": "fw-TRACKER_002-abc12345"
  }
}
```

---

## 3. Quy tắc vật lý firmware-accurate

### 3.1 GNSS ↔ Speed ↔ Course

| Quy tắc | Nguồn |
|---|---|
| `speed` = GNSS speed_kmh (từ modem CGNSINF) | `gnss_model.h` |
| `course` = course over ground (degrees, 0-360) | `gnss_model.h` |
| Lat/Lon chỉ emit khi `fix_valid && lat!=0 && lon!=0` | `data_formatter.c:601-608` |
| Satellites = GNSS reported count (uint8) | `gnss_model.h` |

**Tính toạ độ mới:**
```
distance_m = speed_kmh / 3.6 * interval_s
delta_lat = distance_m * cos(course_rad) / 111320
delta_lon = distance_m * sin(course_rad) / (111320 * cos(lat_rad))
```

### 3.2 Vehicle Battery ↔ Ignition

| Trạng thái | vehicle_battery (V) | Giải thích |
|---|---|---|
| IGN ON, engine running | 13.5 – 14.4 | Alternator đang sạc |
| IGN ON, engine idle | 13.2 – 13.8 | Alternator idle |
| IGN OFF | 12.4 – 12.8 | Ắc quy standalone |

- `ignition_adc_threshold_mv = 13000` → ≥13V = IGN ON

### 3.3 Device Battery

- Backup LiPo: 3.3 – 4.2V
- Khi xe chạy (charging): 4.05 – 4.18V (đang sạc)
- Khi xe tắt (discharge): giảm dần từ 4.1 → 3.7V/h tuỳ load

### 3.4 IMU Accel Delta (m/s²)

- Bình thường đường tốt: 0.1 – 1.5
- Đường xấu/gồ ghề: 1.5 – 3.0
- Phanh gấp/va chạm: 3.5 – 8.0+ (trigger alert ≥ 3.5)
- Xe đứng yên: 0.0 – 0.3

### 3.5 OBD Signals ↔ Speed

| Speed (km/h) | RPM | Engine Load (%) | Coolant (°C) |
|---|---|---|---|
| 0 (idle) | 700 – 850 | 15 – 25 | 80 – 92 |
| 20 – 40 | 1200 – 2000 | 25 – 45 | 85 – 95 |
| 40 – 60 | 1800 – 2800 | 35 – 55 | 88 – 98 |
| 60 – 80 | 2200 – 3500 | 45 – 65 | 90 – 102 |
| Tăng tốc mạnh | +500-1000 RPM | +10-20% | Giữ/tăng nhẹ |
| Giảm tốc (engine brake) | Giảm dần | 10 – 20 | Giữ |

`obd_speed_kph` ≈ `gnss speed` ± 1-3 km/h (sai số OBD vs GPS).

### 3.6 Fuel Level

- Giảm rất chậm: ~5-8L/100km → ~0.0013%/s ở 40km/h
- Dừng đỗ idle: vẫn giảm nhưng chậm hơn (~0.7L/h)

### 3.7 GNSS Diagnostics (firmware contract)

```json
"gnss": {
  "query_mode": "cgnsinf",    // hoặc "cgpsinfo_fallback"
  "fix_valid": true,
  "satellites_reported": 12
}
```

- `cgnsinf`: đường chính, full satellite count
- Fix valid: outdoor luôn true (trừ khi mới boot ~30s đầu)

---

## 4. Tuyến đường: ĐH Phenikaa → ĐH Bách Khoa Hà Nội

### Waypoints thực tế (~18km, qua Lê Trọng Tấn → Tố Hữu → Nguyễn Trãi → Trường Chinh → Đại Cồ Việt)

| # | Lat | Lon | Tên đoạn | Speed profile |
|---|---|---|---|---|
| 1 | 20.9614 | 105.7882 | ĐH Phenikaa (xuất phát) | 0 → 5 (idle → ra bãi) |
| 2 | 20.9608 | 105.7895 | Ra cổng Phenikaa | 10-15 |
| 3 | 20.9590 | 105.7920 | Lê Trọng Tấn / cua phải | 15-25 |
| 4 | 20.9560 | 105.7950 | Lê Trọng Tấn | 30-40 |
| 5 | 20.9530 | 105.7980 | Lê Trọng Tấn | 35-45 |
| 6 | 20.9510 | 105.8010 | Ngã ba → Tố Hữu | 20-30 (đèn đỏ) |
| 7 | 20.9480 | 105.8050 | Tố Hữu | 40-50 |
| 8 | 20.9450 | 105.8090 | Tố Hữu | 45-55 |
| 9 | 20.9430 | 105.8120 | Tố Hữu / Hầm Kim Liên | 30-40 |
| 10 | 20.9420 | 105.8150 | Nguyễn Trãi (Hà Đông) | 25-35 |
| 11 | 20.9450 | 105.8180 | Nguyễn Trãi | 30-40 |
| 12 | 20.9490 | 105.8210 | Nguyễn Trãi / Royal City | 20-30 |
| 13 | 20.9540 | 105.8250 | Nguyễn Trãi → Trường Chinh | 25-35 |
| 14 | 20.9580 | 105.8300 | Trường Chinh | 35-45 |
| 15 | 20.9620 | 105.8350 | Trường Chinh / Ngã Tư Sở | 15-25 (đèn đỏ) |
| 16 | 20.9660 | 105.8390 | Trường Chinh → Phạm Ngọc Thạch | 30-40 |
| 17 | 20.9720 | 105.8430 | Phạm Ngọc Thạch | 30-35 |
| 18 | 20.9790 | 105.8460 | Đại Cồ Việt | 25-35 |
| 19 | 20.9812 | 105.8472 | Cổng ĐH Bách Khoa (đến) | 10 → 0 |

### Kịch bản đèn đỏ (dừng 30-90s)

- Waypoint 6: Ngã ba Tố Hữu — dừng ~45s
- Waypoint 12: Royal City — dừng ~60s
- Waypoint 15: Ngã Tư Sở — dừng ~75s

---

## 5. Timeline phiên hoàn chỉnh

```
T=0s      STATUS: running, boundary=started, IDLING_ON
T=0-5s    RAWDATA: speed=0, idle warm-up, satellites locking (8→12)
T=5-15s   RAWDATA: speed=5-15, ra khỏi bãi đỗ, MOVING_ON
T=15-120s RAWDATA: Lê Trọng Tấn, speed=25-45, course ~45°E
T=120s    RAWDATA: speed=0, dừng đèn đỏ waypoint 6, IDLING_ON
T=165s    RAWDATA: speed tăng lại 10→40, MOVING_ON
T=165-500s RAWDATA: Tố Hữu, speed=40-55, course ~30-50°
T=500s    RAWDATA: speed=0, đèn đỏ Royal City, IDLING_ON
T=560s    RAWDATA: tăng tốc lại
T=560-1200s RAWDATA: Nguyễn Trãi → Trường Chinh, speed=25-45
T=1200s   RAWDATA: speed=0, Ngã Tư Sở, IDLING_ON
T=1275s   RAWDATA: tăng tốc
T=1275-1900s RAWDATA: Phạm Ngọc Thạch → Đại Cồ Việt, speed=25-40
T=1900-2050s RAWDATA: vào khuôn viên Bách Khoa, speed giảm 10→0
T=2050s   RAWDATA: speed=0, IDLING_ON (tắt máy)
T=2050s   Ignition OFF detected, bắt đầu hold 15s
T=2065s   STATUS: stopped, boundary=ended, PARKED_OFF
```

**Tổng: ~2065 rawdata points (1 point/s) + 2 status messages.**

---

## 6. Metadata & Sequence Logic (firmware-accurate)

| Field | Rule |
|---|---|
| `seq_no` | Monotonic +1 mỗi payload (chung cho tất cả topic) |
| `boot_id` | Format: `fw-{device_id}-{random_hex_8}` — cố định suốt session |
| `message_id` | UUID v4, unique mỗi message |
| `sent_at` | = `timestamp` (epoch ms) |
| `schema_version` | rawdata + status: `"v2.0.0"`, event: `"v1.0.0"` |
| `timestamp` | Epoch ms (GNSS timestamp khi trusted) |
| `timestamp_trusted` | `true` khi có GNSS fix (sau ~5s boot) |
| `uptime` | ms từ lúc ESP32 boot |
| `local_session_key` | Monotonic uint32, +1 mỗi session start |
| `canonical_session_id` | `"0"` ban đầu, server assign sau message đầu |

---

## 7. State Transitions Trong Phiên

| Giai đoạn | motion_state | vehicle_state | Trigger |
|---|---|---|---|
| Idle warm-up | STATIONARY | IDLING_ON | speed=0, ignition=ON |
| Ra đường | MOVING | MOVING_ON | speed > 3 km/h |
| Dừng đèn đỏ | STATIONARY | IDLING_ON | speed=0, ignition=ON |
| Chạy lại | MOVING | MOVING_ON | speed > 3 |
| Đến nơi đỗ | STATIONARY | IDLING_ON | speed=0 |
| Tắt máy (sau 15s hold) | STATIONARY | PARKED_OFF | ignition=OFF |

**Ngưỡng:** speed > 3 km/h → MOVING (từ `device-state.types.ts` line 62)

---

## 8. Điều kiện OBD signals valid (firmware contract)

Từ `data_formatter.c:447-449`:
```c
bool obd_signals_valid = telemetry->obd_ble_connected &&
                         telemetry->obd_elm_ready &&
                         telemetry->obd_sample_age_ms <= 30000;
```

- Khi valid: emit `signals` đầy đủ, `missing_signals: []`
- Khi invalid: không emit signals, `missing_signals: ["rpm","obd_speed_kph","coolant_c","fuel_level_pct","engine_load_pct"]`

Mock data nên: OBD connect thành công sau ~8-12s boot, giữ connected suốt phiên, `sample_age_ms` = 200-1500ms (refresh mỗi ~1.2s theo `poll_interval_ms: 1200`).

---

## 9. Tóm tắt implementation plan cho mock script

1. **Tạo waypoints array** (19 điểm ở section 4)
2. **Nội suy vị trí** giữa waypoints dựa trên tốc độ × thời gian
3. **Course tính từ bearing** giữa point hiện tại → point tiếp theo
4. **Speed profile**: tăng tốc/giảm tốc realistic (±2-5 km/h/s)
5. **Dừng đèn đỏ** tại 3 waypoints, speed=0 trong 45-75s
6. **OBD signals** tương quan chặt với speed (RPM, load, coolant)
7. **IMU accel delta** tương quan với delta-speed (tăng/giảm tốc)
8. **Metadata**: seq_no monotonic, UUID message_id, cùng boot_id
9. **Publish order**: STATUS started → N × RAWDATA → STATUS ended
10. **Output format**: JSON array hoặc MQTT publish script

---

## Unresolved Questions

1. **TRACKER_002 auth_token**: Cần query DB để lấy hash hiện tại, hoặc dùng token tạm cho simulator.
2. **canonical_session_id**: Firmware gửi `"0"` ban đầu, server assign. Mock nên gửi `"0"` hay hardcode giá trị?
   → Recommend: gửi `"0"` giống firmware thật — server sẽ tự assign.
3. **Publish thế nào**: Script Node.js publish trực tiếp qua MQTT? Hay generate JSON file rồi replay?
