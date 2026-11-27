# SIM7600 Debugging and Failures

## Mục tiêu
Tài liệu này liệt kê các failure modes thường gặp của SIM7600CE trong project hiện tại, cách phân loại claim, và cách test xác minh trên hardware thật.

## Failure taxonomy
| Failure group | Symptom | Likely layer | Classification |
|---|---|---|---|
| No UART response | `AT` timeout | Transport / power | Project inference |
| SIM not ready | `+CPIN` not ready | SIM / power | Vendor-family behavior |
| No registration | `CEREG` never attaches | RF / antenna / carrier | Community experience + project inference |
| PDP activation fail | `CGACT` fails | APN / auth / network | Vendor-family behavior |
| GNSS no fix | `fix_valid = false` | Antenna / sky view / GNSS state | Community experience |
| Sleep current too high | modem never truly sleeps | DTR / power wiring | Project inference |
| Modem “alive” but no service | `STATUS` on, no attach | RF / network / SIM | Project inference |

## Debug flow
### 1) Check power first
- verify PWR-KEY pulse
- verify modem rail settle time
- verify current draw changes on power on/off
- inspect `STATUS` and `NET-LIGHT` if board variant exposes them

### 2) Check AT transport
- verify UART pins and baud rate
- send `AT`
- send `ATE0`
- capture response length and timing
- check for URC noise mixed into response

### 3) Check SIM state
- run `AT+CPIN?`
- inspect SIM seating and power rail
- test with another SIM if allowed

### 4) Check network attach
- poll `AT+CEREG?`
- compare registered vs roaming vs searching states
- validate antenna connection and carrier band coverage

### 5) Check PDP / IP
- run `AT+CGACT=1,1`
- run `AT+CGPADDR=1`
- inspect APN and operator provisioning

### 6) Check GNSS separately
- run `AT+CGNSPWR=1`
- run `AT+CGNSINF`
- compare open-sky vs blocked-sky behavior

## Current project implementation cross-check
| Area | Current code behavior | Debug note |
|---|---|---|
| AT transport | Mutex + flush + timeout | Good starting point, but concatenated URCs still need stress test |
| LTE init | One reset recovery attempt | Good, but only if reset pin is actually mapped |
| LTE registration | 20 x 1 s polling | Simple and readable; may need more logging in failure cases |
| GNSS | Requires power flag before sample | Good guard, but no explicit no-fix reason classification |
| Sleep path | Powers modem off in FSM | Good, but harder to debug if modem was already in bad state |

## Failure mode matrix
| Failure | Project clue | Likely root cause | How to test on hardware |
|---|---|---|---|
| `AT` times out | no response from `modem_at_send` | wrong UART pins, modem off, baud mismatch | Sniff UART and confirm power rail / boot pulse |
| `AT` returns `ERROR` | response contains `ERROR` | invalid state or bad command | Compare same command on known-good modem |
| `+CPIN: NOT READY` | SIM not ready | SIM absent / boot lag | Re-seat SIM and repeat after delay |
| `CEREG` never registers | attach loop times out | antenna / RF / carrier / band | Test with strong signal and known carrier |
| `CGACT` fails | PDP activation error | wrong APN / no registration | Validate APN in live network |
| GNSS no fix | `fix_valid = false` | antenna, sky view, first-fix delay | Compare open sky and blocked sky |
| Sleep no current reduction | current unchanged | DTR missing or ignored | Measure current with DTR high/low |
| Status line stale | line does not change | pin not mapped | continuity and live voltage measurement |

## Recovery playbook
### Soft recovery
- retry AT once or a few times
- re-run `AT+CPIN?`
- wait and re-run registration poll
- power on GNSS again after LTE is stable

### Hard recovery
- reset modem if pin is verified
- if reset fails, full PWR-KEY power cycle
- re-run AT probe and SIM check

### Escalation policy
If modem still fails after hard recovery:
1. record diagnostic payload
2. keep LTE disconnected
3. avoid repeated power cycling
4. surface failure to state machine / telemetry

## State machine failure handling suggestions
Current FSM handles modem primarily in the happy path. That is acceptable for a first pass, but a modem-specific error state would help.

### Suggested modem recovery substate
```text
ONLINE -> MODEM_DEGRADED -> MODEM_RECOVERING -> ONLINE
                     \-> SLEEP_PREPARE -> SLEEP
```

### Why
- avoids hiding modem faults inside generic `ESP_FAIL`
- allows controlled retry window
- gives better logs for bench debugging

## Ambiguous claims and how to verify
| Ambiguous claim | Current confidence | Hardware test |
|---|---|---|
| `RESET` line really exists and is active | Medium hardware / low firmware | Continuity test from U9 RESET to MCU pad + scope pulse |
| `STATUS` semantics match power state | Medium hardware / low firmware | Measure line during modem off/boot/registered |
| `NET-LIGHT` indicates network registration | Medium hardware / low firmware | Observe line in searching vs attached states |
| `SIM-DTR` can control sleep properly | Low/Medium | Toggle and measure current + wake response |
| `AT+CGNSINF` field layout is stable | Low/Medium | Compare raw response across firmware versions |

## Bench checklist
- [ ] Power-on current signature captured
- [ ] PWR-KEY pulse observed on scope
- [ ] AT echo confirmed on the correct UART pins
- [ ] SIM ready state verified with a live card
- [ ] Registration attach time measured
- [ ] PDP/IP acquisition measured
- [ ] GNSS fix/no-fix behavior logged
- [ ] DTR sleep current measured
- [ ] Reset path verified if hardware route exists

## Suggested log format for debug runs
```text
[mode] boot|attach|pdp|gnss|sleep
[cmd] AT+....
[resp_time_ms] 123
[result] ok|error|timeout
[status] status=1 netlight=0 cpin=READY cereg=1 fix=0
[current_ma] 42.1
```

## Current project implementation gaps to document next
- exact modem control pin mapping on board variant
- board-level bench results for sleep current
- raw `+CGNSINF` examples from real hardware
- attach-time and TTFF metrics across signal conditions
- recovery decision policy when `RESET` pin is unavailable

## Nguồn tham khảo
### Project files
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`

### Netlist evidence
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`

### Official references
- [SIM7600CE product page](https://cn.simcom.com/product/SIM7600CE.html)
- [SIM76XX Series AT Command Manual listing](https://en.simcom.com/technical_files.html)
- [ESP-IDF UART documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/uart.html)
- [ESP-IDF Sleep Modes for ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/sleep_modes.html)