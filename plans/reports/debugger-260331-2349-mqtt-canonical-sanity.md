# MQTT canonical simplification sanity sweep

## Executive summary
- Scope: post-rebuild runtime sanity for `tracking-backend` and `tracking-mqtt-bridge`.
- Result: no startup/runtime error detected in inspected window.
- Severity: **Low** (no immediate incident signal).

## Container health
- `tracking-backend`: running, healthy, restarts=0.
- `tracking-mqtt-bridge`: running, healthy, restarts=0.

Evidence:
- `/tracking-backend|running|healthy|started=2026-03-31T17:30:24.430048909Z|restarts=0`
- `/tracking-mqtt-bridge|running|healthy|started=2026-03-31T17:15:16.710354357Z|restarts=0`
- `tracking-backend             Up 3 minutes (healthy)`
- `tracking-mqtt-bridge         Up 18 minutes (healthy)`

## Targeted error sweep

### 1) Token auth
- No `error/exception/unauthorized/token/jwt/auth failed` signal in recent backend + bridge logs.
- Severity: **Low**.

Evidence:
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/.debug-tracking-backend.log`: no matches for `(ERROR|Exception|unauthorized|token|jwt|auth)`.
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/.debug-tracking-mqtt-bridge.log`: no matches for `(ERROR|Exception|unauthorized|token|jwt|auth)`.

### 2) MQTT listener / bridge startup
- Backend listener connected + subscribed normally.
- Bridge connected + subscribed all canonical topics normally.
- Severity: **Low**.

Exact evidence lines:
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/.debug-tracking-backend.log:3`
  `Connected to EMQX at mqtts://tracking-emqx:8883 for internal events`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/.debug-tracking-backend.log:4`
  `Subscribed to internal/events/#`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/.debug-tracking-mqtt-bridge.log:4`
  `MQTT connected successfully`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/.debug-tracking-mqtt-bridge.log:5`
  `Subscribed to topic` topic=`v1/+/rawdata`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/.debug-tracking-mqtt-bridge.log:6`
  `Subscribed to topic` topic=`v1/+/status`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/.debug-tracking-mqtt-bridge.log:7`
  `Subscribed to topic` topic=`v1/+/events`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/.debug-tracking-mqtt-bridge.log:8`
  `Subscribed to topic` topic=`v1/+/firmware`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/.debug-tracking-mqtt-bridge.log:9`
  `MQTT Bridge service started successfully`

### 3) Simulator / event contract mapping
- No explicit simulator processing or contract-mapping failure lines in inspected tail.
- No WARN/ERROR patterns (`invalid/reject/timeout/drop/failed`) found.
- Severity: **Low now**, confidence **medium** (log window may not include active simulator traffic).

Evidence:
- Both logs: no matches for warning/error patterns `(WARN|invalid|reject|timeout|drop|failed)`.

## Recommendation
- Keep current deployment as-is.
- Run a short active probe (publish one simulator payload + one event payload) then re-check logs to raise confidence from medium -> high.

## Unresolved questions
1. During this log window, was simulator traffic actually sent after rebuild?
2. Do we need a forced end-to-end publish/consume validation (not only startup health) for canonical event mapping?