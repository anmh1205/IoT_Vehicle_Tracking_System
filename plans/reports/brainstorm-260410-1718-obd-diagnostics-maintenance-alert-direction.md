# Brainstorm chi tiÃ¡ÂºÂ¿t: OBD diagnostics cho cÃ¡ÂºÂ£nh bÃƒÂ¡o bÃ¡ÂºÂ£o trÃƒÂ¬ (2026-04-10)

## 1) MÃ¡Â»Â¥c tiÃƒÂªu sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m Ã„â€˜ÃƒÂ£ chÃ¡Â»â€˜t
- XÃƒÂ¢y dÃ¡Â»Â±ng tÃƒÂ­nh nÃ„Æ’ng **cÃ¡ÂºÂ£nh bÃƒÂ¡o bÃ¡ÂºÂ£o trÃƒÂ¬** dÃ¡Â»Â±a trÃƒÂªn OBD.
- Ã†Â¯u tiÃƒÂªn giai Ã„â€˜oÃ¡ÂºÂ¡n Ã„â€˜Ã¡ÂºÂ§u cho **xe con OBD-II**.
- TÃ¡ÂºÂ­p trung vÃƒÂ o **Ã„â€˜Ã¡Â»â„¢ tin cÃ¡ÂºÂ­y cÃ¡ÂºÂ£nh bÃƒÂ¡o cao** (giÃ¡ÂºÂ£m false-positive).
- KhÃƒÂ´ng lÃƒÂ m module lÃ¡ÂºÂ­p lÃ¡Â»â€¹ch bÃ¡ÂºÂ£o trÃƒÂ¬ phÃ¡Â»Â©c tÃ¡ÂºÂ¡p Ã¡Â»Å¸ MVP.

## 2) CÃƒÂ¡c quyÃ¡ÂºÂ¿t Ã„â€˜Ã¡Â»â€¹nh Ã„â€˜ÃƒÂ£ chÃ¡Â»â€˜t trong phiÃƒÂªn chat
1. **PhÃ¡ÂºÂ¡m vi xe:** xe con OBD-II trÃ†Â°Ã¡Â»â€ºc.
2. **MÃ¡Â»Â©c tÃ¡Â»Â± Ã„â€˜Ã¡Â»â„¢ng:** cÃ¡ÂºÂ£nh bÃƒÂ¡o bÃ¡ÂºÂ£o trÃƒÂ¬, chÃ†Â°a lÃƒÂ m scheduling phÃ¡Â»Â©c tÃ¡ÂºÂ¡p.
3. **ChiÃ¡ÂºÂ¿n lÃ†Â°Ã¡Â»Â£c dÃ¡Â»Â¯ liÃ¡Â»â€¡u:** chuÃ¡ÂºÂ©n OBD-II trÃ†Â°Ã¡Â»â€ºc, OEM-specific sau.
4. **KPI Ã†Â°u tiÃƒÂªn:** ÃƒÂ­t cÃ¡ÂºÂ£nh bÃƒÂ¡o sai (precision cao).
5. **ThiÃ¡ÂºÂ¿t bÃ¡Â»â€¹/thu thÃ¡ÂºÂ­p:** read-only, khÃƒÂ´ng can thiÃ¡Â»â€¡p ECU.
6. **DÃ¡Â»Â¯ liÃ¡Â»â€¡u Ã†Â°u tiÃƒÂªn:** PID trÃ¡ÂºÂ¡ng thÃƒÂ¡i hoÃ¡ÂºÂ¡t Ã„â€˜Ã¡Â»â„¢ng + DTC generic thÃ†Â°Ã¡Â»Âng gÃ¡ÂºÂ·p.
7. **Quan sÃƒÂ¡t vÃ¡ÂºÂ­n hÃƒÂ nh:** cÃ¡ÂºÂ§n cÃƒÂ³ UI phÃƒÂ­a server/FE Ã„â€˜Ã¡Â»Æ’ xem raw message theo dÃ¡ÂºÂ¡ng bÃ¡ÂºÂ£ng.

---

## 3) Profile thu thÃ¡ÂºÂ­p OBD read-only chi tiÃ¡ÂºÂ¿t

### 3.1 Guardrail bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c (Ã„â€˜Ã¡Â»Æ’ chÃ¡Â»â€° Ã„â€˜Ã¡Â»Âc)
- Ã¢Å“â€¦ DÃƒÂ¹ng mode: `01`, `02`, `03`, `06`, `07`, `09`, `0A`
- Ã¢ÂÅ’ KhÃƒÂ´ng dÃƒÂ¹ng mode: `04` (clear DTC/reset monitor)

### 3.2 Pha A Ã¢â‚¬â€ KhÃ¡Â»Å¸i tÃ¡ÂºÂ¡o adapter (1 lÃ¡ÂºÂ§n mÃ¡Â»â€”i phiÃƒÂªn)
| BÃ†Â°Ã¡Â»â€ºc | LÃ¡Â»â€¡nh |
|---|---|
| Reset | `ATZ` |
| TÃ¡ÂºÂ¯t echo | `ATE0` |
| TÃ¡ÂºÂ¯t linefeed | `ATL0` |
| TÃ¡ÂºÂ¯t spaces | `ATS0` |
| TÃ¡ÂºÂ¯t header (nÃ¡ÂºÂ¿u parser Ã„â€˜Ã†Â¡n giÃ¡ÂºÂ£n) | `ATH0` |
| Auto protocol | `ATSP0` |
| KiÃ¡Â»Æ’m tra protocol | `ATDP` |

### 3.3 Pha B Ã¢â‚¬â€ Discovery capability (1 lÃ¡ÂºÂ§n khi kÃ¡ÂºÂ¿t nÃ¡Â»â€˜i)
| MÃ¡Â»Â¥c tiÃƒÂªu | LÃ¡Â»â€¡nh |
|---|---|
| VIN | `0902` |
| PID support block 1 | `0100` |
| PID support block 2 | `0120` |
| PID support block 3 | `0140` |
| PID support block 4 | `0160` |
| Monitor/MIL base | `0101` |

Ghi chÃƒÂº:
- NÃ¡ÂºÂ¿u xe support block cao hÃ†Â¡n thÃƒÂ¬ query tiÃ¡ÂºÂ¿p: `0180`, `01A0`, ...
- Cache capability theo `vin + ecu profile` Ã„â€˜Ã¡Â»Æ’ giÃ¡ÂºÂ£m thÃ¡Â»Âi gian discovery cÃƒÂ¡c phiÃƒÂªn sau.

### 3.4 Pha C Ã¢â‚¬â€ Polling phÃƒÂ¢n tÃ¡ÂºÂ§ng (runtime)

#### Fast loop (1s, chÃ¡Â»â€° PID cÃ¡Â»â€˜t lÃƒÂµi)
| LÃ¡Â»â€¡nh | ÃƒÂ nghÃ„Â©a |
|---|---|
| `010C` | RPM |
| `010D` | Speed |
| `0105` | Coolant Temp |
| `0104` | Engine Load |
| `0111` | Throttle Position |
| `0106` | STFT B1 |
| `0107` | LTFT B1 |
| `0108` | STFT B2 (nÃ¡ÂºÂ¿u support) |
| `0109` | LTFT B2 (nÃ¡ÂºÂ¿u support) |
| `0110` hoÃ¡ÂºÂ·c `010B` | MAF hoÃ¡ÂºÂ·c MAP |
| `0142` | Module Voltage |

#### Slow loop (10Ã¢â‚¬â€œ30s)
| LÃ¡Â»â€¡nh | ÃƒÂ nghÃ„Â©a |
|---|---|
| `0101` | MIL + readiness |
| `0103` | Fuel system status |
| `010F` | Intake Air Temp |
| `011F` | Runtime since start |
| `0121` | Distance with MIL on |
| `0131` | Distance since DTC cleared |
| `012F` | Fuel level |

### 3.5 Pha D Ã¢â‚¬â€ Event snapshot (khi cÃƒÂ³ dÃ¡ÂºÂ¥u hiÃ¡Â»â€¡u lÃ¡Â»â€”i)
KÃƒÂ­ch hoÃ¡ÂºÂ¡t khi: `MIL on`, pending DTC mÃ¡Â»â€ºi, fuel trim lÃ¡Â»â€¡ch kÃƒÂ©o dÃƒÂ i, nhiÃ¡Â»â€¡t Ã„â€˜Ã¡Â»â„¢ bÃ¡ÂºÂ¥t thÃ†Â°Ã¡Â»Âng, rung/misfire pattern.

| MÃ¡Â»Â¥c tiÃƒÂªu | LÃ¡Â»â€¡nh |
|---|---|
| Stored DTC | `03` |
| Pending DTC | `07` |
| Permanent DTC | `0A` |
| Freeze frame PID cÃ¡ÂºÂ§n thiÃ¡ÂºÂ¿t | `0205`, `020C`, `020D`, `0211`, ... |
| Monitor test details | `06` (nÃ¡ÂºÂ¿u parser hÃ¡Â»â€” trÃ¡Â»Â£) |

### 3.6 Chu kÃ¡Â»Â³ gÃ¡Â»Â­i server (khuyÃ¡ÂºÂ¿n nghÃ¡Â»â€¹)
- Fast loop: gom batch gÃ¡Â»Â­i mÃ¡Â»â€”i `3Ã¢â‚¬â€œ5 giÃƒÂ¢y`
- Slow loop: gÃ¡Â»Â­i mÃ¡Â»â€”i `30Ã¢â‚¬â€œ60 giÃƒÂ¢y`
- Event snapshot: gÃ¡Â»Â­i ngay lÃ¡ÂºÂ­p tÃ¡Â»Â©c

LuÃƒÂ´n gÃ¡Â»Â­i kÃƒÂ¨m:
- `vin`, `device_id`, `trip_id`, `timestamp_utc`
- `mode`, `pid_or_dtc`, `raw_hex`, `decoded_value`, `unit`, `supported`

### 3.7 Danh mÃ¡Â»Â¥c DTC generic Ã†Â°u tiÃƒÂªn decode (Ã„â€˜Ã¡Â»Æ’ bÃ¡ÂºÂ£o trÃƒÂ¬)
NhÃƒÂ³m Ã†Â°u tiÃƒÂªn triÃ¡Â»Æ’n khai ngay:
- Fuel/Air: `P0100-P0103`, `P0171`, `P0172`, `P0174`
- Misfire: `P0300-P0304`
- Cooling: `P0128`
- O2/Catalyst: `P0130`, `P0133`, `P0141`, `P0420`, `P0430`
- EVAP: `P0440`, `P0442`, `P0455`, `P0456`
- Voltage: `P0560`, `P0562`, `P0563`
- Transmission generic thÃ†Â°Ã¡Â»Âng gÃ¡ÂºÂ·p: `P0700`, `P0715`, `P0720`, `P0730`, `P0740`

---

## 4) A) JSON schema Ã„â€˜Ã¡Â»Â xuÃ¡ÂºÂ¥t (raw + normalized)

### A.1 Payload tÃ¡Â»Â« device -> MqttBridge (mÃ¡Â»Å¸ rÃ¡Â»â„¢ng tÃ¡Â»Â« hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i)
HiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i bridge Ã„â€˜ang nhÃ¡ÂºÂ­n tÃ¡ÂºÂ¡i `payload.types.ts` vÃƒÂ  validate Ã¡Â»Å¸ `payload.validator.ts`.

Ã„ÂÃ¡Â»Â xuÃ¡ÂºÂ¥t thÃƒÂªm `diagnostics` (optional):

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

### A.2 Normalized event trong backend (Ã„â€˜Ã¡Â»Æ’ rule/alert)

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

## 5) B) Mapping DTC -> severity/action (v1 gÃ¡Â»Â£i ÃƒÂ½)

| DTC | Severity mÃ¡ÂºÂ·c Ã„â€˜Ã¡Â»â€¹nh | Action gÃ¡Â»Â£i ÃƒÂ½ |
|---|---|---|
| `P0300-P0304` | high/critical | KiÃ¡Â»Æ’m tra misfire (bugi/cuÃ¡Â»â„¢n/kim phun), hÃ¡ÂºÂ¡n chÃ¡ÂºÂ¿ tÃ¡ÂºÂ£i cao |
| `P0171/P0174` | high | KiÃ¡Â»Æ’m tra rÃƒÂ² khÃƒÂ­ nÃ¡ÂºÂ¡p, MAF, ÃƒÂ¡p suÃ¡ÂºÂ¥t nhiÃƒÂªn liÃ¡Â»â€¡u |
| `P0172` | medium/high | KiÃ¡Â»Æ’m tra rich condition, injector, cÃ¡ÂºÂ£m biÃ¡ÂºÂ¿n |
| `P0128` | medium | KiÃ¡Â»Æ’m tra thermostat/hÃ¡Â»â€¡ lÃƒÂ m mÃƒÂ¡t |
| `P0420/P0430` | medium | KiÃ¡Â»Æ’m tra catalyst/O2, theo dÃƒÂµi trend trÃ†Â°Ã¡Â»â€ºc khi thay |
| `P0130/P0133/P0141` | medium | KiÃ¡Â»Æ’m tra O2 sensor/heater/wiring |
| `P0562` | high | KiÃ¡Â»Æ’m tra Ã¡ÂºÂ¯c-quy/sÃ¡ÂºÂ¡c/alternator |
| `P0563` | high | KiÃ¡Â»Æ’m tra regulator quÃƒÂ¡ ÃƒÂ¡p |
| `P0442/P0455/P0456` | low/medium | KiÃ¡Â»Æ’m tra nÃ¡ÂºÂ¯p bÃƒÂ¬nh, rÃƒÂ² EVAP |
| `P0700` | medium | Ã„ÂÃ¡Â»Âc thÃƒÂªm lÃ¡Â»â€”i hÃ¡Â»â„¢p sÃ¡Â»â€˜ chi tiÃ¡ÂºÂ¿t (TCM nÃ¡ÂºÂ¿u cÃƒÂ³) |

Rule nÃƒÂ¢ng/giÃ¡ÂºÂ£m severity:
- `+1` mÃ¡Â»Â©c nÃ¡ÂºÂ¿u `mil_on=true` + lÃ¡ÂºÂ·p nhiÃ¡Â»Âu trip.
- `-1` mÃ¡Â»Â©c nÃ¡ÂºÂ¿u chÃ¡Â»â€° pending 1 lÃ¡ÂºÂ§n, chÃ†Â°a lÃ¡ÂºÂ·p.
- KhÃƒÂ´ng phÃƒÂ¡t alert nÃ¡ÂºÂ¿u thiÃ¡ÂºÂ¿u dÃ¡Â»Â¯ liÃ¡Â»â€¡u tÃ¡Â»â€˜i thiÃ¡Â»Æ’u (quality gate fail).

---

## 6) C) CÃƒÂ¡ch xÃ¡Â»Â­ lÃƒÂ½ phÃƒÂ­a server (fit vÃ¡Â»â€ºi codebase hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i)

### C.1 MqttBridge (ingest)
Ã„ÂiÃ¡Â»Æ’m can thiÃ¡Â»â€¡p logic lÃƒÂ  `rawdata.handler.ts`.

HiÃ¡Â»â€¡n Ã„â€˜ÃƒÂ£ parse + validate + write metrics/log + publish internal event.

Ã„ÂÃ¡Â»Â xuÃ¡ÂºÂ¥t pipeline:
1. Validate `diagnostics` optional.
2. Ghi raw diagnostics vÃƒÂ o raw channel Ã„â€˜Ã¡Â»Æ’ trace/audit (VictoriaLogs hoÃ¡ÂºÂ·c PostgreSQL JSONB).
3. TrÃƒÂ­ch/flatten signal numeric -> write metrics (RPM/temp/trim/voltage...) vÃƒÂ o VictoriaMetrics.
4. Publish internal event `alert` khi rule thÃƒÂ´ pass (vÃƒÂ­ dÃ¡Â»Â¥ critical immediate).
5. Ã„ÂÃ¡ÂºÂ©y normalized diagnostic snapshot cho backend consumer.

> Ghi chÃƒÂº thÃ¡Â»Â±c thi: trÃƒÂ¡nh nhÃƒÂ©t raw JSON trÃ¡Â»Â±c tiÃ¡ÂºÂ¿p vÃƒÂ o metric label/value cÃ¡Â»Â§a VM (cardinality vÃƒÂ  query khÃƒÂ´ng phÃƒÂ¹ hÃ¡Â»Â£p TSDB).

### C.2 Backend
BÃ¡ÂºÂ¡n Ã„â€˜ÃƒÂ£ cÃƒÂ³ module alert Ã„â€˜Ã¡ÂºÂ§y Ã„â€˜Ã¡Â»Â§:
- type: `alert.types.ts`
- repo: `alert.repository.ts`
- controller/routes: `alert.controller.ts`, `alert.routes.ts`

Ã„ÂÃ¡Â»Â xuÃ¡ÂºÂ¥t thÃƒÂªm 2 khÃ¡Â»â€˜i:
1. **Diagnostic evaluator service**
   - Input: normalized snapshot
   - Output: alert candidate + confidence + evidence
2. **Alert dedup service**
   - Key: `vehicle_id + alert_type + root_cause + window`
   - MÃ¡Â»Â¥c tiÃƒÂªu: trÃƒÂ¡nh spam 1 lÃ¡Â»â€”i lÃ¡ÂºÂ·p

KhÃƒÂ´ng cÃ¡ÂºÂ§n lÃƒÂ m module mÃ¡Â»â€ºi lÃ¡Â»â€ºn, chÃ¡Â»â€° mÃ¡Â»Å¸ rÃ¡Â»â„¢ng `alert_type/title/message/threshold_value/actual_value` Ã„â€˜ang cÃƒÂ³.

### C.3 Frontend hiÃ¡Â»Æ’n thÃ¡Â»â€¹
Ã„ÂÃ¡Â»Â xuÃ¡ÂºÂ¥t 3 nÃ†Â¡i:
1. Trang Alerts (Ã†Â°u tiÃƒÂªn): thÃƒÂªm filter `source=obd`, `dtc`, `confidence`.
2. Vehicle detail: card Ã¢â‚¬Å“OBD HealthÃ¢â‚¬Â
   - DTC stored/pending/permanent
   - MIL status
   - top 3 insight
3. Maintenance page: chÃ¡Â»â€° hiÃ¡Â»Æ’n thÃ¡Â»â€¹ Ã¢â‚¬Å“recommended maintenance alertsÃ¢â‚¬Â (khÃƒÂ´ng auto schedule phÃ¡Â»Â©c tÃ¡ÂºÂ¡p).

### C.4 FE xem bÃ¡ÂºÂ£n tin raw (dÃ¡ÂºÂ¡ng bÃ¡ÂºÂ£ng)
- Trang Ã„â€˜Ã¡Â»Â xuÃ¡ÂºÂ¥t: `Diagnostics Raw`.
- CÃ¡Â»â„¢t chÃƒÂ­nh:
  - `received_at`, `device_id`, `topic`, `message_id`, `schema_version`, `mode`, `pid_count`, `dtc_count`, `ingest_latency_ms`.
- TÃƒÂ­nh nÃ„Æ’ng:
  - filter theo device/time/mode/has_dtc,
  - phÃƒÂ¢n trang + sort theo thÃ¡Â»Âi gian,
  - expand row xem JSON pretty,
  - mask trÃ†Â°Ã¡Â»Âng nhÃ¡ÂºÂ¡y cÃ¡ÂºÂ£m (auth_token).

---

## 7) D) LÃ¡Â»â„¢ trÃƒÂ¬nh triÃ¡Â»Æ’n khai nhanh (khÃƒÂ´ng phÃƒÂ¡ hÃ¡Â»â€¡ thÃ¡Â»â€˜ng)

### Phase 1
- Extend payload + validator + type.
- LÃ†Â°u raw diagnostics vÃƒÂ o raw channel.
- ViÃ¡ÂºÂ¿t full numeric metrics vÃƒÂ o VM.
- TÃ¡ÂºÂ¡o alerts cÃ†Â¡ bÃ¡ÂºÂ£n theo DTC severity map.
- FE bÃ¡ÂºÂ£n Ã„â€˜Ã¡ÂºÂ§u cho bÃ¡ÂºÂ£ng raw message.

### Phase 2
- ThÃƒÂªm correlation rule (DTC + PID trend + readiness).
- Dedup/cooldown/hysteresis.
- Confidence score.
- API timeline hÃ¡Â»Â£p nhÃ¡ÂºÂ¥t metric + raw cho FE.

### Phase 3
- UI enrich (vehicle health + explainability).
- Metrics Ã„â€˜ÃƒÂ¡nh giÃƒÂ¡ false-positive.
- Shadow mode tuning.

---

## 8) API timeline hÃ¡Â»Â£p nhÃ¡ÂºÂ¥t (Ã„â€˜Ã¡Â»Æ’ FE trace 1 luÃ¡Â»â€œng)

### 8.1 Endpoint Ã„â€˜Ã¡Â»Â xuÃ¡ÂºÂ¥t
`GET /api/v1/diagnostics/timeline`

### 8.2 Query params
- `deviceId` (required)
- `from` (epoch ms, required)
- `to` (epoch ms, required)
- `limit` (default 200)
- `cursor` (optional)
- `includeRaw` (default false)
- `dtcOnly` (default false)

### 8.3 Response mÃ¡ÂºÂ«u
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

### 8.4 Quy tÃ¡ÂºÂ¯c API
- `includeRaw=false`: trÃ¡ÂºÂ£ metrics + diagnostics normalized (nhÃ¡ÂºÂ¹).
- `includeRaw=true`: thÃƒÂªm raw payload Ã„â€˜ÃƒÂ£ mask field nhÃ¡ÂºÂ¡y cÃ¡ÂºÂ£m.
- `dtcOnly=true`: chÃ¡Â»â€° trÃ¡ÂºÂ£ records cÃƒÂ³ DTC.

---

## 9) RÃ¡Â»Â§i ro vÃƒÂ  kiÃ¡Â»Æ’m soÃƒÂ¡t
- RÃ¡Â»Â§i ro cardinality trong VM nÃ¡ÂºÂ¿u lÃ¡ÂºÂ¡m dÃ¡Â»Â¥ng label Ã„â€˜Ã¡Â»â„¢ng (`message_id`, raw_hex dÃƒÂ i, dtc list string).
- RÃ¡Â»Â§i ro payload raw chÃ¡Â»Â©a dÃ¡Â»Â¯ liÃ¡Â»â€¡u nhÃ¡ÂºÂ¡y cÃ¡ÂºÂ£m.
- KiÃ¡Â»Æ’m soÃƒÂ¡t:
  - mask token trÃ†Â°Ã¡Â»â€ºc khi expose,
  - chuÃ¡ÂºÂ©n hÃƒÂ³a label set cÃ¡Â»â€˜ Ã„â€˜Ã¡Â»â€¹nh,
  - retention policy rÃƒÂµ cho raw.

---

## 10) Unresolved questions
1. ChÃ¡Â»Ân kÃƒÂªnh raw chÃƒÂ­nh: VictoriaLogs hay PostgreSQL JSONB (hoÃ¡ÂºÂ·c dual-write)?
2. Retention raw: 7/30/90 ngÃƒÂ y?
3. MÃ¡Â»Â©c chi tiÃ¡ÂºÂ¿t raw trÃ¡ÂºÂ£ vÃ¡Â»Â mÃ¡ÂºÂ·c Ã„â€˜Ã¡Â»â€¹nh cho FE (full hay masked-lite)?
4. NgÃ†Â°Ã¡Â»Â¡ng confidence ban Ã„â€˜Ã¡ÂºÂ§u dÃƒÂ¹ng 3 mÃ¡Â»Â©c hay score 0-100?

---

## 11) Gap kÃ¡Â»Â¹ thuÃ¡ÂºÂ­t so vÃ¡Â»â€ºi codebase hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i (2026-04-15)

### 11.1 Firmware Ã„â€˜ÃƒÂ£ cÃƒÂ³ OBD polling cÃ†Â¡ bÃ¡ÂºÂ£n, nhÃ†Â°ng chÃ†Â°a Ã„â€˜Ã¡ÂºÂ©y diagnostics contract
- Ã„ÂÃƒÂ£ cÃƒÂ³ poll PID trong `state_machine.c`: `0x0C`, `0x0D`, `0x05`, `0x2F`, `0x04`.
- Ã„ÂÃƒÂ£ cÃƒÂ³ retry + cÃ¡ÂºÂ£nh bÃƒÂ¡o sÃ¡Â»Â± cÃ¡Â»â€˜ OBD (`obd_connect_failed`, `obd_elm327_init_failed`) qua topic events.
- ChÃ†Â°a cÃƒÂ³ DTC flow (`03`, `07`, `0A`), chÃ†Â°a cÃƒÂ³ readiness/MIL (`0101`) trong payload publish cloud.
- `data_format_rawdata` mÃ¡Â»â€ºi gÃ¡Â»Â­i `data` (vibration, battery, gps...), chÃ†Â°a cÃƒÂ³ object `diagnostics`.

### 11.2 MqttBridge chÃ†Â°a nhÃ¡ÂºÂ­n vÃƒÂ  xÃ¡Â»Â­ lÃƒÂ½ diagnostics object
- `payload.types.ts` vÃƒÂ  `payload.validator.ts` chÃ†Â°a cÃƒÂ³ schema `diagnostics`.
- `rawdata.handler.ts` mÃ¡Â»â€ºi write metrics nÃ¡Â»Ân (vibration, battery, gps...), chÃ†Â°a flatten OBD signals.
- ChÃ†Â°a publish internal event loÃ¡ÂºÂ¡i `data` dÃƒÂ¹ topic `internal/events/device/data` Ã„â€˜ÃƒÂ£ khai bÃƒÂ¡o.

### 11.3 Backend realtime cÃƒÂ³ nhÃ¡ÂºÂ­n alert event, nhÃ†Â°ng chÃ†Â°a persist alert tÃ¡Â»Â« MQTT bridge
- `mqtt-event-listener.ts` hiÃ¡Â»â€¡n map `event_type=alert` -> `publishEvent('alert:new', ...)` chÃ¡Â»â€° Ã„â€˜Ã¡Â»Æ’ socket realtime.
- ChÃ†Â°a gÃ¡Â»Âi `alertRepo.create` hoÃ¡ÂºÂ·c `alertCrudService.createAlert` trong luÃ¡Â»â€œng internal MQTT event.
- HÃ¡Â»â€¡ quÃ¡ÂºÂ£: alert OBD tÃ¡Â»Â« firmware/MqttBridge cÃƒÂ³ thÃ¡Â»Æ’ khÃƒÂ´ng xuÃ¡ÂºÂ¥t hiÃ¡Â»â€¡n Ã¡Â»â€¢n Ã„â€˜Ã¡Â»â€¹nh trong bÃ¡ÂºÂ£ng alerts (DB-backed list).

### 11.4 Schema DB hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i chÃ†Â°a thuÃ¡ÂºÂ­n cho OBD alert type riÃƒÂªng
- Enum `alert_type` hiÃ¡Â»â€¡n chÃ†Â°a cÃƒÂ³ nhÃƒÂ³m OBD-specific (Ã„â€˜ang cÃƒÂ³ `maintenance_due`, `device_offline`, ...).
- CÃƒÂ³ thÃ¡Â»Æ’ tÃ¡ÂºÂ­n dÃ¡Â»Â¥ng `maintenance_due` cho MVP Ã„â€˜Ã¡Â»Æ’ trÃƒÂ¡nh migration sÃ¡Â»â€ºm.
- NÃ¡ÂºÂ¿u muÃ¡Â»â€˜n tÃƒÂ¡ch semantic rÃƒÂµ (`obd_dtc`, `obd_channel_unstable`), cÃ¡ÂºÂ§n migration enum.

### 11.5 FE Ã„â€˜ÃƒÂ£ cÃƒÂ³ nÃ¡Â»Ân Ã„â€˜Ã¡Â»Æ’ triÃ¡Â»Æ’n khai nhanh
- CÃƒÂ³ trang Alerts + filter severity/status.
- CÃƒÂ³ trang Maintenance vÃ¡Â»â€ºi CRUD Ã„â€˜Ã¡ÂºÂ§y Ã„â€˜Ã¡Â»Â§.
- CÃƒÂ³ Device Detail modal + chart hooks cÃƒÂ³ thÃ¡Â»Æ’ tÃƒÂ¡i dÃƒÂ¹ng Ã„â€˜Ã¡Â»Æ’ thÃƒÂªm OBD Health card.
- CÃƒÂ³ System Admin table query cho `event_logs`, cÃƒÂ³ thÃ¡Â»Æ’ tÃ¡ÂºÂ­n dÃ¡Â»Â¥ng lÃƒÂ m raw diagnostics viewer bÃ¡ÂºÂ£n Ã„â€˜Ã¡ÂºÂ§u.

---

## 12) HÃ†Â°Ã¡Â»â€ºng phÃƒÂ¡t triÃ¡Â»Æ’n tiÃ¡ÂºÂ¿p (chÃ¡Â»â€˜t Ã„â€˜Ã¡Â»Â xuÃ¡ÂºÂ¥t)

### 12.1 ChÃ¡Â»Ân chiÃ¡ÂºÂ¿n lÃ†Â°Ã¡Â»Â£c Ã¢â‚¬Å“Signal-first, DTC-laterÃ¢â‚¬Â cho MVP
- KhÃƒÂ´ng nhÃ¡ÂºÂ£y ngay vÃƒÂ o full DTC + freeze frame.
- Ã†Â¯u tiÃƒÂªn pipeline Ã¡Â»â€¢n Ã„â€˜Ã¡Â»â€¹nh dÃ¡Â»Â±a trÃƒÂªn tÃƒÂ­n hiÃ¡Â»â€¡u Ã„â€˜ÃƒÂ£ cÃƒÂ³ sÃ¡ÂºÂµn: RPM/speed/coolant/fuel/load + OBD connect-fail events.
- Sau khi kiÃ¡Â»Æ’m soÃƒÂ¡t false-positive vÃƒÂ  channel quality mÃ¡Â»â€ºi mÃ¡Â»Å¸ rÃ¡Â»â„¢ng DTC.

### 12.2 LÃƒÂ½ do chÃ¡Â»Ân hÃ†Â°Ã¡Â»â€ºng nÃƒÂ y
- Fit trÃ¡Â»Â±c tiÃ¡ÂºÂ¿p vÃ¡Â»â€ºi firmware hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i, ÃƒÂ­t rÃ¡Â»Â§i ro.
- GiÃ¡ÂºÂ£m khÃ¡Â»â€˜i lÃ†Â°Ã¡Â»Â£ng parser/contract thay Ã„â€˜Ã¡Â»â€¢i trong mÃ¡Â»â„¢t lÃ¡ÂºÂ§n.
- TÃ¡ÂºÂ¡o giÃƒÂ¡ trÃ¡Â»â€¹ vÃ¡ÂºÂ­n hÃƒÂ nh sÃ¡Â»â€ºm (maintenance recommendations, health alerts) trÃ†Â°Ã¡Â»â€ºc khi Ã¢â‚¬Å“Ã„â€˜ÃƒÂ o sÃƒÂ¢u chÃ¡ÂºÂ©n Ã„â€˜oÃƒÂ¡nÃ¢â‚¬Â.

---

## 13) LÃ¡Â»â„¢ trÃƒÂ¬nh triÃ¡Â»Æ’n khai v2 (thÃ¡Â»Â±c dÃ¡Â»Â¥ng, khÃƒÂ´ng phÃƒÂ¡ hÃ¡Â»â€¡ thÃ¡Â»â€˜ng)

### Phase G0 Ã¢â‚¬â€ Gate Ã„â€˜Ã¡Â»â„¢ Ã¡Â»â€¢n Ã„â€˜Ã¡Â»â€¹nh OBD channel (2-3 ngÃƒÂ y)
1. ThÃƒÂªm metric quan sÃƒÂ¡t BLE/OBD session quality tÃ¡Â»Â« firmware event stream.
2. ChuÃ¡ÂºÂ©n hÃƒÂ³a dashboard theo dÃƒÂµi:
   - `obd_connect_success_rate`
   - `obd_poll_timeout_rate`
   - `obd_reconnect_attempts_per_hour`
3. Gate trÃ†Â°Ã¡Â»â€ºc khi mÃ¡Â»Å¸ feature alert bÃ¡ÂºÂ£o trÃƒÂ¬:
   - Success rate >= 90% trÃƒÂªn thiÃ¡ÂºÂ¿t bÃ¡Â»â€¹ pilot.
   - Timeout rate <= 10%.

### Phase G1 Ã¢â‚¬â€ Contract diagnostics tÃ¡Â»â€˜i thiÃ¡Â»Æ’u (1 tuÃ¡ÂºÂ§n)
1. MÃ¡Â»Å¸ rÃ¡Â»â„¢ng payload firmware: thÃƒÂªm `diagnostics` object (khÃƒÂ´ng breaking, optional).
2. MqttBridge:
   - Update `payload.types.ts`, `payload.validator.ts`.
   - Flatten metrics OBD hiÃ¡Â»â€¡n cÃƒÂ³ sang VictoriaMetrics.
   - Write raw diagnostics vÃƒÂ o VictoriaLogs (`event_type=obd_diagnostic_raw`).
3. Publish internal `data` event Ã„â€˜Ã¡Â»Æ’ backend/FE realtime cÃƒÂ³ thÃ¡Â»Æ’ subscribe thÃ¡Â»â€˜ng nhÃ¡ÂºÂ¥t.

### Phase G2 Ã¢â‚¬â€ Persist alert + dedup (1 tuÃ¡ÂºÂ§n)
1. Backend thÃƒÂªm `diagnostic evaluator service` tiÃƒÂªu thÃ¡Â»Â¥ internal events.
2. Persist alert vÃƒÂ o bÃ¡ÂºÂ£ng `alerts` (khÃƒÂ´ng chÃ¡Â»â€° socket event).
3. DÃƒÂ¹ng dedup key theo cÃ¡Â»Â­a sÃ¡Â»â€¢ thÃ¡Â»Âi gian:
   - `vehicle_id + rule_id + root_cause + 15m window`.
4. MVP dÃƒÂ¹ng `alert_type='maintenance_due'` Ã„â€˜Ã¡Â»Æ’ trÃƒÂ¡nh enum migration sÃ¡Â»â€ºm.

### Phase G3 Ã¢â‚¬â€ FE hiÃ¡Â»Æ’n thÃ¡Â»â€¹ theo workflow vÃ¡ÂºÂ­n hÃƒÂ nh (1 tuÃ¡ÂºÂ§n)
1. Alerts page:
   - ThÃƒÂªm filter logic theo `source=obd` (derive tÃ¡Â»Â« message/metadata).
   - HiÃ¡Â»Æ’n thÃ¡Â»â€¹ confidence + evidence ngÃ¡ÂºÂ¯n.
2. Device detail:
   - Card `OBD Health` (connected state, last PID sample age, top issues).
3. Raw diagnostics table:
   - BÃ¡ÂºÂ£n Ã„â€˜Ã¡ÂºÂ§u dÃƒÂ¹ng `system-admin` query `event_logs` + preset filter `event_type=obd_diagnostic_raw`.

### Phase G4 Ã¢â‚¬â€ MÃ¡Â»Å¸ rÃ¡Â»â„¢ng DTC/recommendation engine (sau khi G0-G3 Ã¡Â»â€¢n Ã„â€˜Ã¡Â»â€¹nh)
1. Firmware thÃƒÂªm query `0101`, `03`, `07`, `0A`.
2. MqttBridge/backend bÃ¡Â»â€¢ sung parser DTC list + rule nÃƒÂ¢ng confidence.
3. LÃƒÂºc nÃƒÂ y mÃ¡Â»â€ºi cÃƒÂ¢n nhÃ¡ÂºÂ¯c migration enum `alert_type` cho OBD semantic riÃƒÂªng.

---

## 14) Data contract v1.2 Ã„â€˜Ã¡Â»Â xuÃ¡ÂºÂ¥t (MVP)

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

Ghi chÃƒÂº:
- MVP chÃ†Â°a bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c DTC array.
- `diagnostics` optional Ã„â€˜Ã¡Â»Æ’ rollout tÃ¡Â»Â«ng device.
- `schema_version` bump lÃƒÂªn `v1.2.0`.

---

## 15) Rule alert bÃ¡ÂºÂ£o trÃƒÂ¬ khÃ¡ÂºÂ£ thi ngay (khÃƒÂ´ng cÃ¡ÂºÂ§n DTC)

### R1: OBD channel unstable
- Ã„ÂiÃ¡Â»Âu kiÃ¡Â»â€¡n:
  - `obd_connect_failed` lÃ¡ÂºÂ·p >= 3 lÃ¡ÂºÂ§n trong 15 phÃƒÂºt.
- Alert:
  - severity = `medium`
  - title = `OBD channel unstable`
  - action = kiÃ¡Â»Æ’m tra adapter BLE, nguÃ¡Â»â€œn OBD port, vÃ¡Â»â€¹ trÃƒÂ­ thiÃ¡ÂºÂ¿t bÃ¡Â»â€¹.

### R2: Coolant risk pattern
- Ã„ÂiÃ¡Â»Âu kiÃ¡Â»â€¡n:
  - `coolant_c >= 105` trong >= 3 mÃ¡ÂºÂ«u liÃƒÂªn tiÃ¡ÂºÂ¿p
  - vÃƒÂ  `engine_load_pct >= 60`.
- Alert:
  - severity = `high`
  - action = kiÃ¡Â»Æ’m tra hÃ¡Â»â€¡ lÃƒÂ m mÃƒÂ¡t, quÃ¡ÂºÂ¡t, nÃ†Â°Ã¡Â»â€ºc lÃƒÂ m mÃƒÂ¡t.

### R3: Idle-load anomaly
- Ã„ÂiÃ¡Â»Âu kiÃ¡Â»â€¡n:
  - `rpm > 900` kÃƒÂ©o dÃƒÂ i khi `obd_speed_kph <= 3` trong >= 10 phÃƒÂºt.
- Alert:
  - severity = `medium`
  - action = kiÃ¡Â»Æ’m tra chÃ¡ÂºÂ¿ Ã„â€˜Ã¡Â»â„¢ khÃƒÂ´ng tÃ¡ÂºÂ£i, vÃ¡Â»â€¡ sinh bÃ†Â°Ã¡Â»â€ºm ga, Ã„â€˜ÃƒÂ¡nh giÃƒÂ¡ thÃƒÂ³i quen vÃ¡ÂºÂ­n hÃƒÂ nh.

### R4: Voltage risk phÃ¡Â»â€˜i hÃ¡Â»Â£p
- Ã„ÂiÃ¡Â»Âu kiÃ¡Â»â€¡n:
  - `battery_top < 12.0` vÃƒÂ  `engine_load_pct > 50` trong >= 5 phÃƒÂºt.
- Alert:
  - severity = `high`
  - action = kiÃ¡Â»Æ’m tra Ã¡ÂºÂ¯c quy/alternator.

---

## 16) Mapping thay Ã„â€˜Ã¡Â»â€¢i theo file/module (impact map)

### Firmware
- `main/src/state_machine.c`:
  - BÃ¡Â»â€¢ sung publish fields cho `diagnostics.channel/signals/quality`.
  - GiÃ¡Â»Â¯ nguyÃƒÂªn cadence poll hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i Ã„â€˜Ã¡Â»Æ’ trÃƒÂ¡nh regression.
- `main/src/data_formatter.c` vÃƒÂ  `main/inc/data_formatter.h`:
  - Extend JSON formatter cho `diagnostics`.
- `main/inc/app_state.h`:
  - NÃ¡ÂºÂ¿u cÃ¡ÂºÂ§n, thÃƒÂªm runtime fields phÃ¡Â»Â¥c vÃ¡Â»Â¥ quality snapshot.

### MqttBridge
- `src/types/payload.types.ts`:
  - ThÃƒÂªm type `diagnostics`.
- `src/validators/payload.validator.ts`:
  - Validate `diagnostics` optional.
- `src/handlers/rawdata.handler.ts`:
  - Flatten OBD metrics.
  - Write raw diagnostics log.
  - Publish internal `data` event.
- `src/publishers/internal-event.publisher.ts`:
  - Duy trÃƒÂ¬ envelope chuÃ¡ÂºÂ©n, mÃ¡Â»Å¸ rÃ¡Â»â„¢ng payload keys.

### Backend
- `src/infrastructure/realtime/mqtt-event-listener.ts`:
  - KhÃƒÂ´ng chÃ¡Â»â€° broadcast realtime, cÃ¡ÂºÂ§n route sang evaluator/persistence.
- `src/domain/alert/*`:
  - Reuse createAlert flow, thÃƒÂªm dedup guard.
- `src/api/validators/alert.validator.ts`:
  - NÃ¡ÂºÂ¿u cÃ¡ÂºÂ§n thÃƒÂªm filter `source/confidence`, cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t schema query.

### Frontend
- `src/app/dashboard/alerts/page.tsx`
- `src/features/alerts/components/alert-filters.tsx`
- `src/features/alerts/components/alert-columns.tsx`
- `src/features/devices/components/device-detail-modal/overview-tab.tsx`
- `src/lib/api/alerts.ts`

---

## 17) KPI + Definition of Done cho release Ã„â€˜Ã¡ÂºÂ§u

### KPI kÃ¡Â»Â¹ thuÃ¡ÂºÂ­t
- Alert ingest latency (device -> alert row DB) p95 <= 5s.
- OBD sample parse success rate >= 95% trÃƒÂªn thiÃ¡ÂºÂ¿t bÃ¡Â»â€¹ pilot.
- Duplicate alert rate <= 5% (sau dedup window).

### KPI sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m
- TÃ¡Â»Â· lÃ¡Â»â€¡ alert bÃ¡Â»â€¹ dismiss trong 7 ngÃƒÂ y Ã„â€˜Ã¡ÂºÂ§u <= 30%.
- TÃ¡Â»Â· lÃ¡Â»â€¡ alert Ã„â€˜Ã†Â°Ã¡Â»Â£c xÃƒÂ¡c nhÃ¡ÂºÂ­n hoÃ¡ÂºÂ·c resolve >= 60% (proxy cho hÃ¡Â»Â¯u ÃƒÂ­ch vÃ¡ÂºÂ­n hÃƒÂ nh).

### DoD
1. CÃƒÂ³ payload `diagnostics` tÃ¡Â»Â« ÃƒÂ­t nhÃ¡ÂºÂ¥t 3 thiÃ¡ÂºÂ¿t bÃ¡Â»â€¹ pilot.
2. Alerts OBD xuÃ¡ÂºÂ¥t hiÃ¡Â»â€¡n Ã„â€˜Ã†Â°Ã¡Â»Â£c cÃ¡ÂºÂ£ realtime vÃƒÂ  list DB.
3. CÃƒÂ³ filter xem riÃƒÂªng alerts nguÃ¡Â»â€œn OBD.
4. CÃƒÂ³ dashboard theo dÃƒÂµi false-positive vÃƒÂ  channel quality.

---

## 18) QuyÃ¡ÂºÂ¿t Ã„â€˜Ã¡Â»â€¹nh tÃ¡ÂºÂ¡m thÃ¡Â»Âi Ã„â€˜Ã¡Â»Æ’ giÃ¡ÂºÂ£m rÃ¡Â»Â§i ro

1. DÃƒÂ¹ng `VictoriaLogs` lÃƒÂ m kÃƒÂªnh raw chÃƒÂ­nh cho diagnostics trong G1-G3.
2. ChÃ†Â°a dual-write PostgreSQL JSONB Ã¡Â»Å¸ MVP.
3. DÃƒÂ¹ng `alert_type='maintenance_due'` tÃ¡ÂºÂ¡m thÃ¡Â»Âi cho OBD maintenance alerts.
4. ChÃ†Â°a bÃ¡ÂºÂ­t DTC parser trong firmware cho Ã„â€˜Ã¡ÂºÂ¿n khi qua gate G0.

---

## 19) Unresolved questions (updated)
1. ChÃ¡Â»â€˜t rollout pilot bao nhiÃƒÂªu thiÃ¡ÂºÂ¿t bÃ¡Â»â€¹: 3 hay 10?
2. ChÃ¡Â»Ân window dedup mÃ¡ÂºÂ·c Ã„â€˜Ã¡Â»â€¹nh: 15 phÃƒÂºt hay 30 phÃƒÂºt?
3. CÃƒÂ³ chÃ¡ÂºÂ¥p nhÃ¡ÂºÂ­n dÃƒÂ¹ng tÃ¡ÂºÂ¡m `alert_type='maintenance_due'` cho OBD Ã¡Â»Å¸ MVP khÃƒÂ´ng?
4. CÃƒÂ³ cÃ¡ÂºÂ§n migration enum ngay Ã„â€˜Ã¡Â»Æ’ tÃƒÂ¡ch `obd_channel_unstable` tÃ¡Â»Â« Ã„â€˜Ã¡ÂºÂ§u khÃƒÂ´ng?
5. Retention cho `obd_diagnostic_raw` Ã¡Â»Å¸ VictoriaLogs: 30 hay 90 ngÃƒÂ y?
6. NgÃ†Â°Ã¡Â»Â¡ng R2 coolant risk cÃƒÂ³ giÃ¡Â»Â¯ `>=105C` hay hÃ¡ÂºÂ¡ xuÃ¡Â»â€˜ng `>=100C` cho xe tÃ¡ÂºÂ£i?
7. Khi nÃƒÂ o cho phÃƒÂ©p bÃ¡ÂºÂ­t DTC phase: sau 2 tuÃ¡ÂºÂ§n pilot Ã¡Â»â€¢n Ã„â€˜Ã¡Â»â€¹nh hay theo KPI gate?

## 20) Execution addendum 2026-04-16 (firmware-first + modal-centered UI/UX)

### 20.1 Scope chÃ¡Â»â€˜t cho vÃƒÂ²ng triÃ¡Â»Æ’n khai nÃƒÂ y
- Trung tÃƒÂ¢m UI/UX: **Device Detail Modal** (Ã†Â°u tiÃƒÂªn cao nhÃ¡ÂºÂ¥t).
- VÃ¡ÂºÂ«n tÃƒÂ­ch hÃ¡Â»Â£p thÃƒÂªm phÃ¡ÂºÂ§n liÃƒÂªn quan:
  - Alerts page: lÃ¡Â»Âc nhanh cÃ¡ÂºÂ£nh bÃƒÂ¡o nguÃ¡Â»â€œn OBD.
  - Maintenance page: hiÃ¡Â»Æ’n thÃ¡Â»â€¹ khuyÃ¡ÂºÂ¿n nghÃ¡Â»â€¹ bÃ¡ÂºÂ£o trÃƒÂ¬ sinh tÃ¡Â»Â« OBD alerts.
- ThiÃ¡ÂºÂ¿t bÃ¡Â»â€¹ thÃ¡ÂºÂ­t chÃ†Â°a sÃ¡ÂºÂµn: triÃ¡Â»Æ’n khai firmware + bridge + backend Ã„â€˜Ã¡ÂºÂ§y Ã„â€˜Ã¡Â»Â§ contract, dÃƒÂ¹ng mock data Ã„â€˜Ã¡Â»Æ’ test UI/UX.

### 20.2 Contract rollout mÃ¡Â»Â¥c tiÃƒÂªu (v1.3.0, backward compatible)
- Firmware publish `rawdata` giÃ¡Â»Â¯ nguyÃƒÂªn trÃ†Â°Ã¡Â»Âng cÃ…Â© vÃƒÂ  thÃƒÂªm `diagnostics` optional:
  - `channel`: `ble_obd_connected`, `elm_ready`, `poll_interval_ms`, `connect_fail_count_5m`.
  - `signals`: `rpm`, `obd_speed_kph`, `coolant_c`, `fuel_level_pct`, `engine_load_pct`.
  - `quality`: `sample_age_ms`, `missing_signals`.
  - `events`: danh sÃƒÂ¡ch event OBD ngÃ¡ÂºÂ¯n gÃ¡Â»Ân cho rule engine.
- MqttBridge chÃ¡ÂºÂ¥p nhÃ¡ÂºÂ­n cÃ¡ÂºÂ£ payload cÃ…Â© (khÃƒÂ´ng cÃƒÂ³ diagnostics) vÃƒÂ  payload mÃ¡Â»â€ºi.

### 20.3 UI/UX design spec (modal device lÃƒÂ  main entry)
- Overview tab:
  - ThÃƒÂªm khÃ¡Â»â€˜i `OBD Health` Ã¡Â»Å¸ nÃ¡Â»Â­a phÃ¡ÂºÂ£i, nÃ¡Â»â€¢i bÃ¡ÂºÂ­t bÃ¡ÂºÂ±ng badge trÃ¡ÂºÂ¡ng thÃƒÂ¡i.
  - 3 mÃ¡Â»Â©c hiÃ¡Â»Æ’n thÃ¡Â»â€¹: `Ã¡Â»â€n Ã„â€˜Ã¡Â»â€¹nh` / `CÃ¡ÂºÂ£nh bÃƒÂ¡o` / `MÃ¡ÂºÂ¥t kÃ¡ÂºÂ¿t nÃ¡Â»â€˜i`.
  - HiÃ¡Â»Æ’n thÃ¡Â»â€¹ readability-first:
    - status channel + Ã„â€˜Ã¡Â»â„¢ tÃ†Â°Ã†Â¡i mÃ¡ÂºÂ«u (`sample_age_ms`),
    - signal chÃƒÂ­nh (rpm/speed/coolant/load/fuel),
    - top recommendations (max 3) vÃ¡Â»â€ºi hÃƒÂ nh Ã„â€˜Ã¡Â»â„¢ng ngÃ¡ÂºÂ¯n.
- Raw Data tab:
  - TÃƒÂ¡ch nhÃƒÂ³m bÃ¡ÂºÂ£n ghi OBD rÃƒÂµ rÃƒÂ ng, dÃ¡Â»â€¦ quÃƒÂ©t.
  - BÃ¡Â»â€¢ sung summary parser cho `diagnostics` Ã„â€˜Ã¡Â»Æ’ trÃƒÂ¡nh JSON quÃƒÂ¡ dÃƒÂ i khÃƒÂ³ Ã„â€˜Ã¡Â»Âc.
- Interaction:
  - Khi cÃƒÂ³ alert OBD active, hiÃ¡Â»Æ’n thÃ¡Â»â€¹ callout trong modal kÃƒÂ¨m CTA Ã„â€˜i tÃ¡Â»â€ºi maintenance.
  - Mobile: giÃ¡Â»Â¯ card xÃ¡ÂºÂ¿p dÃ¡Â»Âc, trÃƒÂ¡nh bÃ¡ÂºÂ£ng quÃƒÂ¡ rÃ¡Â»â„¢ng, text tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 13px Ã„â€˜Ã¡Â»Æ’ Ã„â€˜Ã¡Â»Âc nhanh.

### 20.4 Rule cÃ¡ÂºÂ£nh bÃƒÂ¡o bÃ¡ÂºÂ£o trÃƒÂ¬ OBD (MVP)
- R1 `obd_channel_unstable` -> map `alert_type=maintenance_due`, severity `medium`.
- R2 `coolant_risk_pattern` -> map `alert_type=maintenance_due`, severity `high`.
- R3 `idle_load_anomaly` -> map `alert_type=maintenance_due`, severity `medium`.
- R4 `voltage_risk_combined` -> map `alert_type=maintenance_due`, severity `high`.
- Cooldown mÃ¡ÂºÂ·c Ã„â€˜Ã¡Â»â€¹nh mÃ¡Â»â€”i rule/device: 15 phÃƒÂºt.

### 20.5 Implementation steps chi tiÃ¡ÂºÂ¿t
1. Firmware
- Extend formatter Ã„â€˜Ã¡Â»Æ’ emit `diagnostics` object.
- Fill channel/signals/quality tÃ¡Â»Â« telemetry hiÃ¡Â»â€¡n cÃƒÂ³.
- Bump metadata schema_version lÃƒÂªn `v1.3.0` cho rawdata.

2. MqttBridge
- Update payload types + zod validator cho diagnostics optional.
- Raw handler:
  - flatten OBD signals -> VictoriaMetrics,
  - write raw diagnostics event -> VictoriaLogs (`event_type=obd_diagnostic_raw`),
  - evaluate maintenance rules + publish internal alert events,
  - publish internal data event giÃƒÂ u context Ã„â€˜Ã¡Â»Æ’ backend/FE realtime dÃƒÂ¹ng Ã„â€˜Ã†Â°Ã¡Â»Â£c.

3. Backend
- MQTT internal listener:
  - nhÃ¡ÂºÂ­n alert tÃ¡Â»Â« bridge,
  - map sang alert contract hÃ¡Â»Â£p lÃ¡Â»â€¡ DB,
  - persist vÃƒÂ o bÃ¡ÂºÂ£ng `alerts` (khÃƒÂ´ng chÃ¡Â»â€° broadcast socket),
  - giÃ¡Â»Â¯ realtime publish cho client.

4. Frontend
- Device Detail Modal:
  - thÃƒÂªm OBD Health panel + recommendation callout,
  - cÃ¡ÂºÂ£i thiÃ¡Â»â€¡n raw tab Ã„â€˜Ã¡Â»Æ’ Ã„â€˜Ã¡Â»Âc diagnostics nhanh.
- Alerts page:
  - thÃƒÂªm bÃ¡Â»â„¢ lÃ¡Â»Âc nhanh nhÃƒÂ³m OBD maintenance.
- Maintenance page:
  - thÃƒÂªm section `KhuyÃ¡ÂºÂ¿n nghÃ¡Â»â€¹ tÃ¡Â»Â« OBD` lÃ¡ÂºÂ¥y tÃ¡Â»Â« alerts active.

5. Mock & validation
- TÃ¡ÂºÂ¡o mock diagnostics payload script Ã„â€˜Ã¡Â»Æ’ test UI khi chÃ†Â°a cÃƒÂ³ thiÃ¡ÂºÂ¿t bÃ¡Â»â€¹ thÃ¡ÂºÂ­t.
- ChÃ¡ÂºÂ¡y lint/typecheck/build cho backend/frontend/mqtt bridge.
- ChÃ¡ÂºÂ¡y local deploy bÃ¡ÂºÂ±ng docker compose cho services bÃ¡Â»â€¹ Ã¡ÂºÂ£nh hÃ†Â°Ã¡Â»Å¸ng.
- ChÃ¡Â»Â¥p screenshot audit:
  - modal overview cÃƒÂ³ OBD panel,
  - modal raw tab cÃƒÂ³ diagnostics summary,
  - alerts filter OBD,
  - maintenance section OBD recommendations.

### 20.6 Definition of done cho vÃƒÂ²ng nÃƒÂ y
- CÃƒÂ³ payload diagnostics tÃ¡Â»Â« firmware formatter.
- MqttBridge parse + ghi metric/log + phÃƒÂ¡t alert rules.
- Backend persist Ã„â€˜Ã†Â°Ã¡Â»Â£c OBD maintenance alerts vÃƒÂ o DB.
- Modal device hiÃ¡Â»Æ’n thÃ¡Â»â€¹ OBD health rÃƒÂµ rÃƒÂ ng, Ã„â€˜Ã¡Â»Âc Ã„â€˜Ã†Â°Ã¡Â»Â£c trÃƒÂªn desktop + mobile.
- CÃƒÂ³ mock data + screenshot audit + build pass.

### 20.7 Unresolved questions
1. CÃƒÂ³ cÃ¡ÂºÂ§n tÃƒÂ¡ch enum `alert_type` riÃƒÂªng cho OBD Ã¡Â»Å¸ vÃƒÂ²ng sau hay tiÃ¡ÂºÂ¿p tÃ¡Â»Â¥c dÃƒÂ¹ng `maintenance_due`?
2. Khi pilot xe tÃ¡ÂºÂ£i, ngÃ†Â°Ã¡Â»Â¡ng coolant cÃƒÂ³ cÃ¡ÂºÂ§n profile theo loÃ¡ÂºÂ¡i xe ngay Ã¡Â»Å¸ backend khÃƒÂ´ng?

## 21) Execution log 2026-04-16 (docker local test + UI audit)

### 21.1 Local docker bootstrap (done)
1. Created local `.env` for:
- `Tracking_PostgreSQL`
- `Tracking_EMQX`
- `Tracking_MqttBridge`
- `Tracking_Backend`
- `Tracking_Frontend`
2. Created data volume dirs under `iot-vehicle-tracking-system-cloud/Tracking_Data/*`.
3. Started infra stack:
- PostgreSQL
- EMQX
- VictoriaMetrics
- VictoriaLogs
4. Started app stack with rebuild:
- MqttBridge
- Backend
- Frontend

### 21.2 Critical fixes during deploy-test
- PostgreSQL init failed because `postgis` extension was required but image was `postgres:16-alpine`.
- Updated compose image to `postgis/postgis:16-3.4` and re-initialized local data.
- Local EMQX auth chain was too strict for quick mock run; runtime auth was disabled for this local test session.
- Schema mismatch between `Tracking_MqttBridge` queries and fresh SQL init was patched for local run:
  - Added missing local columns in `devices` / `device_sessions` needed by bridge runtime paths.
- Fixed `touchDeviceSession` SQL typing issue in bridge by explicit numeric cast.
- Fixed bridge batch writer status write (`online` -> `running`) to match enum `device_status_enum`.

### 21.3 Mock test flow (firmware unavailable)
- Seeded test device: `SIM-OBD-001` (firmware `v1.3.0`).
- Published mock MQTT payloads to topic:
- `v1/SIM-OBD-001/rawdata`
- Payload included full diagnostics block: channel/signals/quality/events.
- Verified pipeline:
- MqttBridge accepted diagnostics and emitted internal events.
- Backend persisted OBD maintenance alerts into `alerts`.
- Backend persisted realtime telemetry context into `event_logs` (`mqtt_bridge_rawdata`).

### 21.4 Validation evidence
- Backend logs confirmed alert creation:
- `OBD: Voltage risk under load`
- `OBD: Channel unstable`
- `OBD: Coolant risk pattern`
- `OBD: Idle-load anomaly`
- DB checks passed:
- `alerts` table contains `maintenance_due` rows from OBD source logic.
- `event_logs` contains `mqtt_bridge_rawdata` entries with diagnostics context.

### 21.5 UI/UX audit screenshots (saved)
Folder:
- `resources/reports/obd-uiux-audit/2026-04-16`

Captured files:
- `01c-device-modal-overview-obd-health-scrolled.png` (modal overview with OBD Health block)
- `02-device-modal-raw-tab-obd.png` (modal raw tab with OBD rows + readable summaries)
- `03-alerts-page-source-obd-filter.png` (alerts page with source filter = OBD maintenance)
- `04-maintenance-page-obd-recommendations.png` (maintenance page with OBD recommendations cards)

### 21.6 Remaining technical debt observed
- Fresh SQL init still has schema drift vs bridge expectations in some columns.
- Current local test patched this drift to complete end-to-end validation; should formalize as migration/init alignment in next cycle.

### 21.7 Unresolved questions
1. Keep local EMQX auth disabled for dev convenience, or add scripted creation of MQTT users/ACL in bootstrap?
2. Should schema drift fixes be committed as SQL init migration now, or separately in infra-hardening phase?

## 22) DB sync local <- VPS + post-sync continuation (2026-04-16)

### 22.1 Sync workflow executed
1. Backed up local DB before sync:
- `resources/reports/db-sync/2026-04-16/local-pre-sync-*.sql`
2. Connected VPS via SSH key (root).
3. Dumped VPS DB from `/opt/tracking/Tracking_PostgreSQL`:
- `resources/reports/db-sync/2026-04-16/vps-sync-*.sql`
4. Stopped local write services before restore:
- `tracking-mqtt-bridge`, `tracking-backend`
5. First direct restore hit schema drift conflicts.
6. Performed clean sync strategy:
- drop/recreate local `vehicle_tracking`
- restore VPS dump into empty DB
7. Restarted local services and validated health.

### 22.2 Sync verification summary
- Local-vs-VPS table counts matched on sampled core tables:
- `users`: 2
- `devices`: 2
- `alerts`: 0
- `event_logs`: 0
- API health after restart: `http://localhost:4000/health` => `status=ok`.

### 22.3 Post-sync continue work completed
- Fixed modal a11y warning (`DialogContent requires DialogTitle`) by adding always-present sr-only title/description at `DialogContent` root.
- Rebuilt frontend container and re-tested modal open flow.
- Replayed OBD mock pipeline on synced DB using device `sim-uat-001`:
  - updated local auth token hash for deterministic mock publish,
  - published diagnostics payload to `v1/sim-uat-001/rawdata`.

### 22.4 Post-sync validation
- Backend created OBD maintenance alerts again (rules fired as expected).
- DB counters after mock:
- `maintenance_due` alerts: 4
- `mqtt_bridge_rawdata` event logs: 2
- UI modal raw tab showed OBD rows and readable summary.
- Browser console error count after modal open: 0.

### 22.5 Added screenshot (post-sync)
- `resources/reports/obd-uiux-audit/2026-04-16/05-post-sync-device-modal-raw-tab-obd.png`

### 22.6 Unresolved questions
1. Should we codify DB sync as a scripted one-command runbook (backup + clean restore + health checks) under `scripts/`?
2. Should the local dev seed be separated from synced VPS snapshot to avoid manual token override on test devices?

## 23) Post-sync continuation v2 (2026-04-16) - modal-first UI/UX hardening

### 23.1 Scope completed
- Added **active OBD maintenance callout** directly inside Device Modal > Overview tab.
- Added CTA `MÃ¡Â»Å¸ Maintenance` inside modal callout.
- Added raw tab quick mode switch `TÃ¡ÂºÂ¥t cÃ¡ÂºÂ£` / `ChÃ¡Â»â€° OBD` + highlighted OBD rows for faster scan.
- Rebuilt frontend Docker service to ensure runtime uses latest UI code.

### 23.2 Technical changes shipped
- `device-detail-modal/modal-context.tsx`
  - extended context with `obdActiveAlerts` and `obdAlertsLoading`.
- `device-detail-modal/modal-container.tsx`
  - added `device-obd-alerts` query (active `maintenance_due` alerts by `deviceId`),
  - filtered OBD-specific maintenance signatures,
  - injected alerts into modal context,
  - refresh now invalidates `device-obd-alerts` query.
- `device-detail-modal/overview-tab.tsx`
  - added OBD active callout block with severity badges + `MÃ¡Â»Å¸ Maintenance` CTA.
- `device-detail-modal/raw-data-tab.tsx`
  - added view toggle for OBD-only,
  - added OBD row highlighting and expanded payload viewport for OBD rows.

### 23.3 Verification
1. Build checks:
- Frontend `npm run build` passed.

2. Docker runtime:
- `tracking-frontend` rebuilt and healthy.

3. UI screenshots (updated audit pack):
- `resources/reports/obd-uiux-audit/2026-04-16/06-post-sync-modal-overview-obd-callout.png`
- `resources/reports/obd-uiux-audit/2026-04-16/06b-post-sync-modal-overview-obd-callout-scrolled.png`
- `resources/reports/obd-uiux-audit/2026-04-16/06c-post-sync-modal-overview-obd-callout-active-alerts.png`
- `resources/reports/obd-uiux-audit/2026-04-16/07-post-sync-modal-raw-tab-obd-filtered.png`
- `resources/reports/obd-uiux-audit/2026-04-16/08-post-sync-alerts-page-obd-updated.png`
- `resources/reports/obd-uiux-audit/2026-04-16/09-post-sync-maintenance-obd-recommendations-updated.png`

### 23.4 Observed note
- Browser audit saw one transient client error for `GET /api/v1/devices/positions` (`ERR_EMPTY_RESPONSE`) during navigation; flow recovered and subsequent UI paths worked.

## 24) UI/UX refinement v3 (2026-04-16) - Vietnamese-first OBD experience

### 24.1 User feedback addressed
- Feedback: modal UI/UX chÆ°a Ä‘á»§ tá»‘t; pháº§n maintenance cáº§n Viá»‡t hoÃ¡ sÃ¢u hÆ¡n.
- Action: chuyá»ƒn toÃ n bá»™ OBD maintenance wording hiá»ƒn thá»‹ sang tiáº¿ng Viá»‡t vÃ  lÃ m rÃµ nhÃ£n trong modal.

### 24.2 Changes implemented
1. Device modal (overview)
- Viá»‡t hoÃ¡ nhÃ£n OBD panel:
  - `OBD Health` -> `Sá»©c khá»e OBD`
  - `Sample age` -> `Äá»™ trá»… máº«u`
  - `Connect fail / 5m` -> `Lá»—i káº¿t ná»‘i / 5 phÃºt`
  - `Coolant / engine load` -> `Nhiá»‡t Ä‘á»™ nÆ°á»›c / táº£i Ä‘á»™ng cÆ¡`
- Viá»‡t hoÃ¡ callout:
  - `OBD maintenance Ä‘ang active` -> `Cáº£nh bÃ¡o báº£o trÃ¬ OBD Ä‘ang hoáº¡t Ä‘á»™ng`
  - CTA `Má»Ÿ Maintenance` -> `Má»Ÿ trang báº£o trÃ¬`
- Severity badge trong callout Ä‘á»•i sang tiáº¿ng Viá»‡t (`Tháº¥p/Trung bÃ¬nh/Cao/NghiÃªm trá»ng`).
- Hiá»ƒn thá»‹ thÃªm thá»i Ä‘iá»ƒm phÃ¡t sinh cho tá»«ng alert trong callout.

2. OBD alert localization logic (frontend)
- Added rule-based localization for OBD alert title/message in:
  - modal container OBD alerts query mapping,
  - alerts page list mapping,
  - maintenance page recommendation mapping.
- Covered main rule outputs:
  - idle-load anomaly,
  - coolant risk pattern,
  - channel unstable,
  - voltage risk under load.

3. Maintenance page
- `OBD maintenance` label -> `Báº£o trÃ¬ OBD`.
- Added Vietnamese severity chips on each OBD recommendation card.
- Description updated to Vietnamese-first wording (`cháº©n Ä‘oÃ¡n OBD`).

4. Alerts page
- OBD rows now render localized Vietnamese title/message.
- Source filter labels updated:
  - `OBD maintenance` -> `Báº£o trÃ¬ OBD`
  - `System / khÃ¡c` -> `Há»‡ thá»‘ng / khÃ¡c`.

### 24.3 Verification
- Frontend quality gates passed:
  - `npm run lint`
  - `npm run build`
- Frontend docker rebuilt and healthy.
- New audit screenshots:
  - `resources/reports/obd-uiux-audit/2026-04-16/10-modal-obd-viet-hoa-overview.png`
  - `resources/reports/obd-uiux-audit/2026-04-16/11-modal-obd-viet-hoa-active-alert-callout.png`
  - `resources/reports/obd-uiux-audit/2026-04-16/12-maintenance-viet-hoa-obd-recommendations.png`
  - `resources/reports/obd-uiux-audit/2026-04-16/13-alerts-viet-hoa-obd-titles.png`
