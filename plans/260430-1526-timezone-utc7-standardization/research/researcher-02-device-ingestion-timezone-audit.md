# Timezone audit: firmware/device/MQTT ingestion/ops

Date: 2026-04-30 15:26 Asia/Saigon
Scope: repo-wide quick audit, focus ESP32 time setup + ingestion + ops timezone surfaces.
Method: 3 targeted greps (NTP/SNTP/TZ, timestamp fields, MQTT/ops files). Max-call constrained.

## 1) Files/surfaces found

### Firmware / device time surfaces
- `resources/docs/firmware-coding-bug-audit-2026-04-24.md`
  - Notes GNSS UTC parse path uses `mktime()` (local-time sensitive), potential UTC drift.
- `resources/references/example/esp32-obd2-meter/sdkconfig`
  - SNTP section present (reference/example project, not guaranteed runtime path).
- `resources/docs/hardware-datasheets/extracted-text/sim7600-mqtt-section-pages-300-335.txt`
  - SIM7600 `+CNTP: <host>,<timezone>` documented, timezone range `-96..96`, default `0`.

### MQTT ingestion / consumer / payload-adjacent code files (matched by filename/content)
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/rawdata.handler.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/components/device-detail-modal/raw-data-tab.tsx`
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/zone/services/vehicle-zone.service.ts`

### Ops/runtime TZ surfaces
- `resources/reports/system-design/iot-vehicle-tracking-report/04-server/part-08-docker-deployment.md`
  - Multiple `TZ: ${TZ:-Asia/Ho_Chi_Minh}` and `.env` sample `TZ=Asia/Ho_Chi_Minh`.
- `.claude/hooks/session-init.cjs`, `.claude/hooks/lib/project-detector.cjs`, `.claude/hooks/lib/context-builder.cjs`
  - Capture/display host timezone; mostly tooling metadata.

## 2) Current timezone assumptions (observed)

1. **Device-side risk = UTC input + local conversion ambiguity**
   - Existing audit doc already flags UTC GNSS parse via `mktime()` risk.
   - If `TZ` ever non-UTC on device/newlib env, epoch can shift.

2. **Ops/container docs lean Asia/Ho_Chi_Minh default**
   - Deployment docs already prefer `TZ=Asia/Ho_Chi_Minh` for containers.
   - This affects log presentation and any local-time-based cron/process code.

3. **Payload ecosystem likely mixed epoch/ISO/local rendering**
   - Timestamp-field grep indicates broad timestamp usage; ingestion + frontend raw tabs are key hotspots.
   - Without strict contract, consumers may mix:
     - UTC epoch (safe)
     - ISO string with `Z` (safe)
     - naive local string (unsafe)

## 3) Likely breakpoints when moving to Asia/Ho_Chi_Minh (UTC+7)

1. **Firmware timestamp conversion paths**
   - Any UTC struct -> `mktime()` path can shift +7h/-7h depending runtime TZ.
   - Side effects: event ordering, stale/fresh checks, deadline comparisons, telemetry trust flags.

2. **MQTT parser/bridge normalization**
   - If parser assumes sender local time but backend stores UTC (or reverse), duplicated/late/out-of-order events.

3. **Backend domain logic using wall-clock comparisons**
   - Zone/service time-window logic can drift if mixing `Date.now()` UTC with localized parsed payload time.

4. **Frontend raw/diagnostic tabs**
   - Double-conversion risk: backend already localized + frontend localizes again.

5. **Ops metrics/logs/cron**
   - Dashboard/log correlation breaks if app logs UTC but infra/log-agent interprets local TZ (or reverse).

## 4) Recommended migration sequencing (KISS/YAGNI)

1. **Freeze canonical contract first (must-do)**
   - Canonical event time in pipeline = **UTC epoch ms**.
   - Optional display field = ISO8601 with `Z` only.
   - Ban naive local datetime strings in MQTT payload.

2. **Firmware hardening second**
   - Audit/replace UTC parse paths to timezone-agnostic conversion (`timegm`-style) where needed.
   - Keep device internal logic on UTC epoch; apply UTC+7 only for UI/debug prints.

3. **Ingestion normalization gate third**
   - At MQTT bridge/listener boundary: validate timestamp format, normalize once, reject/mark ambiguous payloads.

4. **Backend/domain consistency fourth**
   - Use UTC for persistence/comparison.
   - Local timezone applied only at API presentation edges.

5. **Frontend and ops last-mile**
   - Frontend: render with explicit zone label; avoid double-convert.
   - Ops: set container/app/log stack TZ policy explicitly (either all UTC or explicit UTC+7 presentation layer), then align dashboards/alerts.

6. **Rollout safety**
   - Add temporary dual-field observability (`event_time_raw`, `event_time_normalized`) during migration window.
   - Run short overlap check for skew/out-of-order anomalies before removing compatibility path.

## Unresolved questions

1. In live firmware source (not docs), exact files/functions currently doing GNSS/NTP -> epoch conversion?
2. MQTT payload schema in production: authoritative timestamp field(s), type (ms/s/ISO), and producer(s)?
3. DB column types for event times (`TIMESTAMP` vs `TIMESTAMPTZ` or bigint epoch) across backend services?
4. Current cron/alert jobs depend on local wall time or UTC?
5. Should platform standardize on **UTC internally + UTC+7 display**, or full local-time runtime everywhere?