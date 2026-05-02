# Executive summary
- Frontend modal nhiều session vì `device_sessions` của `TRACKER_001` đang bị phân mảnh mạnh: 619 session tổng, 441 session có `data_points_count <= 1`, 386 session có `0` điểm.
- Message `Phiên đang chọn chưa có dữ liệu tọa độ hợp lệ...` xuất hiện chủ yếu vì đa số session gần đây không có bất kỳ rawdata nào chứa `latitude/longitude` trong chính time window của session. Trong 20 session mới nhất, 18 session có `coord_events_in_window = 0`.
- Root cause khả dĩ nhất của “nhiều tiny session”: device/bridge đang nhận chuỗi `stopped -> running -> stopped` rất ngắn; code chỉ discard micro-session khi `completionSource='heartbeat'`, còn `stopped` thì vẫn giữ session 0-1 điểm.
- Root cause của “không có tọa độ hợp lệ”: rawdata gần đây của device chủ yếu là OBD/runtime snapshots không mang GNSS fields; từ session `610` trở đi gần như toàn bộ session có `coord_events=0`.

# Runtime stack located on VPS
- Host: `anmh1205`
- Containers/services chính:
  - `tracking-mqtt-bridge`
  - `tracking-backend`
  - `tracking-frontend`
  - `tracking-postgres`
  - `tracking-emqx`
- Compose files:
  - `/opt/tracking/Tracking_MqttBridge/docker-compose.uat.yml`
  - `/opt/tracking/Tracking_Backend/docker-compose.uat.yml`
  - `/opt/tracking/Tracking_PostgreSQL/docker-compose.yml`

# Concrete DB evidence
## Device row
- `devices.id=3`, `device_id=TRACKER_001`, `current_status=running`
- Last seen: `2026-05-01 16:16:50.997+00`
- Last position still exists on device row: `20.96047052, 105.74533622`

## Session totals
Query result:
- `total_sessions = 619`
- `sessions_dp_le_1 = 441`
- `sessions_dp_0 = 386`
- `sessions_dp_1 = 55`
- `sessions_missing_last_coords = 411`

## Recent 20 sessions vs coordinate availability in their own time windows
Recent sessions query showed:
- `627` running, `329` events in window, `0` coordinate events
- `626` completed, `57` events, `0` coordinate events
- `625` completed, `10` events, `0` coordinate events
- `624` completed, `134` events, `0` coordinate events
- `623` completed, `23` events, `0` coordinate events
- `622` completed, `33` events, `0` coordinate events
- `621` completed, `19` events, `0` coordinate events
- `620` completed, `56` events, `0` coordinate events
- `619` completed, `0` events, `0` coordinate events
- `618` completed, `116` events, `0` coordinate events
- `617` completed, `0` events, `0` coordinate events
- `616` completed, `292` events, `0` coordinate events
- `615` completed, `348` events, `0` coordinate events
- `614` completed, `236` events, `0` coordinate events
- `613` completed, `31` events, `0` coordinate events
- `612` completed, `2` events, `0` coordinate events
- `611` completed, `2` events, `0` coordinate events
- `610` completed, `17` events, `0` coordinate events
- `609` completed, `3` events, `1` coordinate event
- `608` completed, `8` events, `8` coordinate events

Interpretation:
- Modal mặc định sẽ liệt kê các session mới nhất; gần như toàn bộ session mới nhất đều không có GPS point hợp lệ trong chính khoảng session.
- Vì vậy khi chọn session gần đây, replay rất thường rơi vào empty state.

## GNSS/rawdata pattern by day
Last 5-day summary from `event_logs`:
- `2026-05-01`: `1880` rawdata events, `104` coord events, `104` events có `satellites > 0`
- `2026-04-30`: `1985` rawdata events, `217` coord events, `0` events có `satellites > 0`

Interpretation:
- Hầu hết rawdata không mang lat/lng.
- Trên `2026-05-01`, chỉ 104/1880 event có tọa độ; các event có tọa độ cũng chính là các event có satellite > 0.
- Sample rawdata mới nhất trong session `627` có `satellites: 0`, có OBD signals/speed nhưng không có `latitude/longitude` trong payload persisted context.

## Micro-session evidence from logs
`tracking-mqtt-bridge` logs around `2026-05-01 11:03Z` and `11:26Z`:
- `11:03:44.011` `Device TRACKER_001: online -> stopped (session=616 ended)`
- `11:03:44.903` `Device TRACKER_001: stopped -> running (session=617)`
- `11:03:46.637` `Device TRACKER_001: running -> stopped (session=617 ended)`
- `11:05:24.610` `Device TRACKER_001: stopped -> running (session=618)`
- `11:26:41.764` `Device TRACKER_001: online -> stopped (session=618 ended)`
- `11:26:42.681` `Device TRACKER_001: stopped -> running (session=619)`
- `11:26:44.411` `Device TRACKER_001: running -> stopped (session=619 ended)`

Matching DB rows:
- Session `617`: `uptime=2`, `data_points_count=0`
- Session `619`: `uptime=2`, `data_points_count=0`

Interpretation:
- Đây không phải chỉ heartbeat bị discard; đây là start/stop thật theo logic hiện tại, nên micro-session vẫn được lưu lại.

# Why mixed GNSS + non-GNSS can or cannot replay
## Can replay
Có, nếu trong time window của session còn ít nhất 1 row có cả `latitude` và `longitude` hợp lệ.
- `selectLatestContiguousRouteRows()` trước hết filter chỉ còn rows có tọa độ hợp lệ.
- Nếu chỉ còn 1 row, function vẫn trả về row đó.
- `buildRouteReplayPoints()` sẽ tạo 1 replay point, nên map không rơi vào empty state.
- Example thực tế: session `609` có `3` rawdata events nhưng chỉ `1` coordinate event; session này vẫn có thể render 1 điểm.

## Fails pattern
Replay fail khi session window không có row nào thỏa:
- có cả `latitude` và `longitude`
- finite, trong range hợp lệ
- không phải `(0,0)`

Đó chính là pattern của đa số session mới nhất (`610-627`, trừ `609`).

# Code paths that explain the behavior
## Frontend empty state + route selection
- `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_Frontend\src\features\devices\components\device-detail-modal\route-tab.tsx:76-100`
  - Filter telemetry rows by `serverSessionStart/serverSessionEnd`.
- `...\route-tab.tsx:158-163`
  - `selectLatestContiguousRouteRows(filterRowsBySession(...))` then `buildRouteReplayPoints(...)`.
- `...\route-tab.tsx:449-454`
  - If `replayPoints.length === 0`, show message `Phiên đang chọn chưa có dữ liệu tọa độ hợp lệ trong dải thời gian hiện tại.`
- `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_Frontend\src\features\devices\components\device-detail-modal\telemetry-insights.ts:20-45`
  - Valid coordinate requires both lat/lng finite, in bounds, not `(0,0)`.
- `...\telemetry-insights.ts:66-100`
  - Route builder keeps only coordinate rows; splits by gap >30m or >25km; returns latest segment with length >1, else active segment.

## Frontend session list counts telemetry by time window, not by coordinate validity
- `...\route-tab.tsx:136-142`
  - `telemetryCountBySession` counts all telemetry rows in session window.
- So session card may show many `điểm` even when zero GPS points.

## Backend telemetry source
- `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_Backend\src\domain\device\services\device-telemetry.service.ts:26-65`
  - Metric SQL reads per field from `event_logs.context/metadata`.
- `...\device-telemetry.service.ts:102-130`
  - `/devices/:id/telemetry` returns only rows where requested metric exists; latitude/longitude are pulled independently from `event_logs`.

## Session creation/retention logic
- `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_MqttBridge\src\infrastructure\database.ts:46-47`
  - Heartbeat transient discard thresholds: `runtime <= 120s`, `data_points_count <= 1`.
- `...\database.ts:169-215`
  - `ensureDeviceSession()` reuses running session else inserts new one.
- `...\database.ts:224-369`
  - `touchDeviceSession()` increments `data_points_count` and only updates last lat/lng when provided.
- `...\database.ts:371-493`
  - `completeDeviceSession()` discards only when `completionSource === 'heartbeat'` and under thresholds; `stopped` micro-sessions are kept.
- `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_MqttBridge\src\handlers\status.handler.ts:67-68, 92-144, 181-186`
  - `heartbeat` normalized to `stopped`; running creates session; stopped/heartbeat completes session.
- `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_MqttBridge\src\handlers\rawdata.handler.ts:778-790, 907-919`
  - Telemetry is attached to session only when device is already in active runtime state; then `touchDeviceSession()` updates counts/coords.

# Most likely root causes
1. Session fragmentation:
   - Device is oscillating through `running/stopped` transitions, sometimes only 1-2 seconds apart.
   - Bridge persists those short `stopped` sessions because discard guard only covers heartbeat completions, not explicit stopped completions.
   - Result: modal shows many tiny sessions, including 0-point sessions like `617` and `619`.
2. No-valid-coordinate message:
   - Recent rawdata is dominated by OBD/runtime data without GNSS fields.
   - Top 18 recent sessions have zero coordinate events in their own windows.
   - Frontend session cards count generic telemetry rows, but replay requires coordinate-valid rows, so user sees many sessions with points yet no route to replay.

# Relevant paths
- Report: `E:\anmh1205\IoT_Vehicle_Tracking_System\plans\reports\debugger-260501-2314-tracker-001-session-replay-investigation.md`
- Frontend replay logic: `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_Frontend\src\features\devices\components\device-detail-modal\route-tab.tsx`
- Frontend telemetry filtering: `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_Frontend\src\features\devices\components\device-detail-modal\telemetry-insights.ts`
- Backend telemetry query: `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_Backend\src\domain\device\services\device-telemetry.service.ts`
- MQTT Bridge session lifecycle: `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_MqttBridge\src\infrastructure\database.ts`
- MQTT Bridge handlers: `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_MqttBridge\src\handlers\status.handler.ts`, `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_MqttBridge\src\handlers\rawdata.handler.ts`

# Unresolved questions
- Why firmware/device is emitting so many explicit `running -> stopped` transitions instead of staying in one active session.
- Why GNSS fields disappear for long stretches while OBD/rawdata continues; likely device-side GNSS acquisition/publish issue, but this investigation stayed read-only and server-side.