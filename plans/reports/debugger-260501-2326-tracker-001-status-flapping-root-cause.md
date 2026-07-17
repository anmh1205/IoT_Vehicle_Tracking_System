# Executive summary
- Flapping `running/stopped/heartbeat` của `TRACKER_001` xuất phát chính từ firmware publish path, không phải từ bridge restart/cache loss.
- Exact bug: firmware phát `stopped` ngay khi thấy `ignition_active=false` lần đầu, trước khi hết `ignition_off_hold_ms`; bridge lại coi `stopped`/`heartbeat` là terminal và đóng session ngay.
- `heartbeat` cũng bị dùng như một parked keepalive nhưng bridge normalize thành `stopped`, nên mỗi heartbeat tiếp tục tạo downstream status churn.
- Cloud-side có phần khuếch đại: bridge/session model đang buộc session theo status topic thay vì edge IGN thực.

# VPS evidence
## MQTT bridge did not restart
- `tracking-mqtt-bridge` inspect: `StartedAt=2026-04-30T20:49:57Z`, `RestartCount=0`.
- Kết luận: không có bằng chứng flapping do container restart/cache reset của bridge.

## Real flapping in live logs
`tracking-mqtt-bridge` logs:
- `2026-05-01 15:04:37+07` `Device TRACKER_001: stopped -> running (session=611)`
- `2026-05-01 15:04:43+07` `Device TRACKER_001: heartbeat keepalive handled as stopped (session=611 ended)`
- `2026-05-01 15:08:21+07` `Device TRACKER_001: stopped -> running (session=612)`
- `2026-05-01 15:08:27+07` `Device TRACKER_001: heartbeat keepalive handled as stopped (session=612 ended)`
- `2026-05-01 18:03:44+07` `Device TRACKER_001: online -> stopped (session=616 ended)`
- `2026-05-01 18:03:44+07` `Device TRACKER_001: stopped -> running (session=617)`
- `2026-05-01 18:03:46+07` `Device TRACKER_001: running -> stopped (session=617 ended)`
- `2026-05-01 18:26:41+07` `Device TRACKER_001: online -> stopped (session=618 ended)`
- `2026-05-01 18:26:42+07` `Device TRACKER_001: stopped -> running (session=619)`
- `2026-05-01 18:26:44+07` `Device TRACKER_001: running -> stopped (session=619 ended)`

## DB confirms micro-sessions
`device_sessions` for `TRACKER_001` on 2026-05-01:
- `611`: `uptime=6s`, `data_points_count=2`
- `612`: `uptime=6s`, `data_points_count=2`
- `617`: `uptime=2s`, `data_points_count=0`
- `619`: `uptime=2s`, `data_points_count=0`
- Tổng hôm nay: `20` sessions, trong đó `5` session `<=120s`.

# Code-path analysis
## 1) Firmware is the primary source of status oscillation
### Ignition is derived from unstable composite signals
`E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-firmware\components\app-core\src\state_wake_prelude.c:307-313`
- `adc_ignition = vehicle_battery >= threshold`
- `obd_live_ignition = obd_connected && ecu_state == "live" && sample_age fresh`
- `rpm_ignition = obd_live_ignition && obd_rpm > 0`
- `ignition_next = rpm_ignition || adc_ignition || obd_live_ignition`

Implication:
- IGN không lấy từ một edge cứng duy nhất; nó phụ thuộc battery threshold + OBD live freshness + rpm.
- Nếu điện áp quanh ngưỡng hoặc OBD sample/ECU state chập chờn, `ignition_next` có thể ON/OFF ngắn hạn.

### Firmware publishes `stopped` too early
`...\state_machine_core.c:523-539`
- `ignition_active = debounced_ignition_on && tracking_enabled`
- Ngay khi `!ignition_active && s_ignition_off_started_ms == 0`, firmware gọi `state_machine_publish_status("stopped")` tại `:528`.
- Nhưng session local chỉ thật sự stop sau khi hết hold window tại `:534-539`.

This is the exact bad conditional:
- publish `stopped` on first OFF detection
- delay actual local session stop until hold expires
- result: transient OFF already leaks to cloud as terminal stop

### Parked flow publishes `heartbeat`, not just rawdata
`...\state_machine_core.c:614-621`
- heartbeat state publishes `state_machine_publish_status("heartbeat")`.

### PARKED entry also publishes `stopped`
`...\state_machine_core.c:747-757`
- entering parked emits `state_machine_publish_status("stopped")` before heartbeat cycle.

### Status payload carries state, but bridge still keys on legacy status
`...\contracts-device-cloud\src\data_formatter.c:509-545`
- payload includes `status` plus `state.{ignition_state,motion_state,vehicle_state,device_state,sleep_mode}`.
- So firmware already sends richer ignition/runtime context.

## 2) Cloud/bridge amplifies the firmware noise
### Bridge closes session on `stopped` and on `heartbeat`
`E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_MqttBridge\src\handlers\status.handler.ts:67-68`
- `heartbeat` is normalized to `stopped`.

`...\status.handler.ts:92-145`
- `running` => `ensureDeviceSession()` and `updateDeviceStatus(...,'running',...)`

`...\status.handler.ts:137-149`
- normalized `stopped` => `completeDeviceSession(...)`, `clearSession(...)`, `setStatus(...,'stopped',...)`, `updateDeviceStatus(...,'stopped',...)`

`...\status.handler.ts:181-186`
- log explicitly says heartbeat handled as stopped.

Implication:
- any transient firmware `stopped`
- any parked `heartbeat`
=> immediately becomes a cloud-side session end.

### Rawdata path is not the root cause
`...\rawdata.handler.ts:778-790`
- rawdata only attaches to session when prior/runtime DB status is already active.

`...\rawdata.handler.ts:940-966`
- rawdata may set cache to `online`/`stopped`, but it does not emit the `stopped -> running` log lines seen above.
- those `stopped -> running` lines come from `status.handler.ts`, so the source message is real status traffic from device.

# Secondary signal: boot/replay noise exists, but not the main flapping cause
- `firmware_update_log` has `145` rows today with `job_id LIKE 'boot-1-%'` for `TRACKER_001`.
- All 145 rows have `last_seq_no=1`.
- Code comment in `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-firmware\components\domain-storage\src\offline_queue.c:329-366` says old boot/replay firmware-success records can be stale replay noise.
- Current filter only catches `jobId` = `replay`, `""`, or `boot`; it does not catch `boot-1-*` variants.

Interpretation:
- Có thêm firmware boot/replay noise trên topic firmware.
- Nó giải thích log `Firmware success ... boot-1-*` spam.
- Nhưng nó không trực tiếp tạo `running/stopped/heartbeat` transitions; status flapping vẫn đến từ status publisher path ở FSM.

# Root-cause conclusion
## Primary cause
Firmware-side.
- `TRACKER_001` đang publish `running/stopped/heartbeat` trực tiếp từ FSM dựa trên composite ignition signal dễ dao động.
- Exact trigger là `state_machine_handle_driving_state()` publish `stopped` ngay khi thấy OFF lần đầu (`state_machine_core.c:526-529`), trước khi hold window xác nhận OFF thật.
- Sau đó parked flow lại publish `heartbeat` (`:614`), tiếp tục bị cloud hiểu như `stopped`.

## Cloud-side contribution
Also yes, but secondary/amplifier.
- Bridge model trong `status.handler.ts` coi cả `stopped` lẫn `heartbeat` là session end ngay lập tức.
- Vì business rule đúng phải là 1 session span từ IGN ON đến IGN OFF thực, model hiện tại làm mọi transient OFF/heartbeat biến thành churn visible ở frontend/backend.

## Not supported as primary cause
- MQTT topic design: payload đã có `state.*`; vấn đề không phải thiếu field mà là bridge vẫn quyết định lifecycle theo `status` string.
- Bridge cache loss/restart: không có evidence; container restart count = 0.
- Another server-side mechanism: không thấy cơ chế nào khác tự sinh `running`/`stopped`; live logs chỉ ra source path là status messages từ device.

# Relevant paths
- Firmware FSM: `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-firmware\components\app-core\src\state_machine_core.c`
- Firmware ignition derivation: `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-firmware\components\app-core\src\state_wake_prelude.c`
- Firmware status formatter: `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-firmware\components\contracts-device-cloud\src\data_formatter.c`
- Bridge status handler: `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_MqttBridge\src\handlers\status.handler.ts`
- Bridge rawdata handler: `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_MqttBridge\src\handlers\rawdata.handler.ts`
- Bridge session DB logic: `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\Tracking_MqttBridge\src\infrastructure\database.ts`

# Unresolved questions
- `adc_ignition` hay `obd_live_ignition` đang dao động nhiều hơn trên thiết bị thật? Cần device-side logs/telemetry raw payload để tách bạch.
- `boot-1-*` firmware spam là replay từ offline queue hay boot thật lặp lại? Evidence hiện tại nghiêng về replay noise, nhưng chưa đủ để kết luận dứt điểm.
