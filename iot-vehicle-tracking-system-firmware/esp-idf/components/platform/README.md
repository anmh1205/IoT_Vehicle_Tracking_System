# Platform

Use `include/platform/platform.h` for shared ESP-IDF services. `platform.c` provides monotonic uptime in milliseconds, restart with a reason and SDK error translation. `platform_rtos.c` supplies task delays, millisecond-to-tick conversion and task-context mutexes.

The RTOS implementation preserves native rounding and the established indefinite waits. The public mutex type is opaque. Firmware adapters own the lifetime of their mutexes and keep file, UART and event delivery outside bounded snapshot-copy sections.

## Console UART log

`include/platform/log.h` defines the one log format used by every component. Use `IVTS_LOGE/W/I/D(tag, "subject key=value ...", ...)`; raw `ESP_LOG*` calls and `esp_log.h` includes are rejected by `tests/test_layers.py`.

```text
I (5321) board: boot reset=POWERON wake=timer rtc=ok imu=ok led=ok sample=1000ms
I (5330) board: rtc probe chip=DS3231M addr=0x68 result=ok speed=400000Hz
I (6012) app: firmware version=2.1.0 partition=ota_0 pending_verify=no
I (8123) modem: lte REG -> PDP took=2.1s fails=0
I (8150) modem: lte signal rssi=-71dBm csq=21 ber=99
W (9050) modem: at fail cmd="AT+CGACT=1,1" result=timeout resp="" took=5000ms
I (12000) app: state PARKED -> DRIVING ign=ON motion=MOVING link=BROKER_UP
I (20000) app: status fsm=DRIVING dev=ACTIVE ign=ON motion=MOVING vehicle=MOVING_ON link=BROKER_UP queue=0 up=00:00:20
I (20000) app: status net link=BROKER_UP publishing=no control_pending=no queue=0 unflushed=no ota=no tracking=yes
I (20000) app: status time utc=2026-11-27T08:01:12Z rtc=trusted
I (20000) app: status power vehicle=13.52V device=4.05V imu_peak=120mmps2
I (20000) app: status gnss fix=yes sats=9 pos=21.0285123,105.8542000 speed=36.0km/h course=182.5
I (20000) app: status obd ble=up elm=ready ecu=LIVE rpm=1500 coolant=89C age=800ms
I (20000) app: status sys heap=142kB heap_min=118kB event_drops=0 cmd_drops=0
D (20450) app: publish ok kind=raw_live tx=12 size=214B rtt=350ms
D (20500) at: > AT+CEREG?  < +CEREG: 0,1 OK 85ms
```

| Tag | Covers |
|---|---|
| `board` | reset/wake cause, RTC, IMU, ADC samples, I2C, sleep entry |
| `modem` | LTE link steps and retries, signal, AT failures, MQTT connection loss and dropped commands, GNSS power, HTTPS |
| `at` | every AT command and URC (DEBUG) |
| `storage` | NVS, SD card mount, offline queue overflow and recovery |
| `obd` | BLE power and discovery, ELM327 commands (DEBUG), ECU link state |
| `ota` | download/verify/install progress and failures |
| `app` | firmware/device banner, ignition, motion, FSM state, link, sessions, commands, publish/ACK, records, sleep, OTA confirmation and periodic `status` lines |
| `sys` | restart reason and optional stack/heap diagnostics |

Levels: E = data lost or function disabled; W = degraded, retried or recovered; I = milestones, transitions and `status`; D = per-message and per-sample detail. `CONFIG_IVTS_LOG_STATUS_PERIOD_S` (default 30 s, 0 disables) sets the status period. `CONFIG_IVTS_LOG_DEBUG` raises every tag to DEBUG at boot; at run time a single tag can be raised with `esp_log_level_set("at", ESP_LOG_DEBUG)`. `sdkconfig.defaults` compiles DEBUG in (`CONFIG_LOG_MAXIMUM_LEVEL_DEBUG`) and enables colours. Credentials and signed URLs are never printed: AT commands marked `redact` appear as `<redacted>`. The `gnss` status line prints the position, so treat captured UART logs as location data.
