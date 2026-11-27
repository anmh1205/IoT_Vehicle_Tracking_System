# SIM7600 Driver Design for ESP-IDF

## Mục tiêu
Ghi lại cách thiết kế driver modem SIM7600CE trong ESP-IDF sao cho đơn giản, testable, và phù hợp với kiến trúc project hiện tại.

## Design goals
- Giữ AT layer thật mỏng
- Tách transport, LTE logic, GNSS logic, power control
- Tránh state mơ hồ giữa modem và state machine
- Có timeout/retry rõ ràng
- Dễ bench debug bằng UART log và status lines

## Suggested layered design
```text
hardware pins -> power_mgr -> modem_at -> modem_lte / modem_gnss -> state_machine -> mqtt publish
```

## Current implementation snapshot
| Module | Responsibility | Status | Notes |
|---|---|---|---|
| `modem_at.c` | UART transport + URC dispatch | Present | Good base layer |
| `modem_lte.c` | Bring-up, attach, PDP, RSSI, sleep | Present | Linear flow, limited recovery taxonomy |
| `modem_gnss.c` | GNSS power and sample parse | Present | Good for telemetry, light on diagnostics |
| `power_mgr.c` | PWR-KEY, reset, DTR, status, netlight, power rails | Present | Some pins unassigned in firmware |
| `state_machine.c` | Orchestration of online/offline modes | Present | Central place for recovery policy |

## Recommended driver boundaries
### 1) Transport layer
Should only know:
- UART setup
- line buffering
- timeouts
- URC callbacks
- mutex/serialization

Should not know:
- PDP context
- GNSS fix semantics
- state machine state names

### 2) LTE service layer
Should handle:
- SIM ready
- network mode
- attach/detach
- PDP activation
- signal quality
- low power entry / exit

### 3) GNSS service layer
Should handle:
- power on/off
- sample acquisition
- fix validation
- timestamp parse
- antenna / no-fix diagnostics

### 4) Power layer
Should handle:
- PWR-KEY pulse
- hard reset
- DTR control
- board status inputs
- safe boot defaults

### 5) Orchestrator
Should decide:
- when to power modem on/off
- when to connect/disconnect data session
- when to recover vs sleep
- when to publish telemetry

## Timeout / retry / recovery policy
| Class | Recommended rule | Why |
|---|---|---|
| Transport timeout | Short and bounded | Fails fast on UART issues |
| SIM ready retry | Moderate | SIM initialization may lag boot |
| Registration retry | Bounded with log reason | Network attach can take time |
| PDP retry | Small number of retries | Prevent lockup on bad APN or bad RF |
| GNSS sample retry | Separate from LTE retry | GNSS failures should not reset LTE unnecessarily |
| Hard reset | Last resort | Avoid power cycling too often |

## Recommended state model
| State | Purpose | Trigger | Exit condition |
|---|---|---|---|
| `MODEM_OFF` | Modem fully off | boot / sleep | PWR-KEY on |
| `MODEM_BOOTING` | Rail settle + AT probe | power on | AT OK |
| `MODEM_READY` | SIM and config OK | AT + SIM ready | attach request |
| `MODEM_ATTACHING` | Registration poll | network connect | CEREG registered |
| `MODEM_ONLINE` | PDP active | data session up | disconnect/sleep |
| `MODEM_GNSS_ACTIVE` | GNSS powered | tracking request | GNSS off or sleep |
| `MODEM_ERROR_RECOVERY` | Recover from failure | timeout / no response | success or full power cycle |

## Current project integration with FSM
`state_machine.c` already performs the orchestration role. That is good. The only missing piece is a formal modem error substate or recovery policy.

### Why this matters
Without explicit recovery state:
- repeated AT failures may look like generic `ESP_FAIL`
- telemetry may stop without a clear cause
- sleep entry can hide unresolved modem faults

## Implementation guidance for ESP-IDF
### UART / transport
Use ESP-IDF UART driver as the only hardware dependency in AT transport.
- install driver once
- flush stale bytes before command send
- keep response buffers bounded
- do not expose raw UART details upward

### Concurrency
The current mutex approach is appropriate for a single modem channel.
Recommended rule:
- one in-flight AT transaction at a time
- URC callback path must stay lightweight
- no blocking publish inside URC callback

### Logging
Use distinct tags for each layer:
- `MODEM_AT`
- `MODEM_LTE`
- `MODEM_GNSS`
- `POWER_MGR`
- `STATE_MACHINE`

### Error taxonomy suggestion
| Error class | Example | Recovery |
|---|---|---|
| `ERR_UART_TIMEOUT` | no AT response | retry then reset |
| `ERR_SIM_NOT_READY` | `+CPIN` not ready | wait and retry |
| `ERR_REG_TIMEOUT` | no CEREG attach | backoff or sleep and retry later |
| `ERR_PDP_FAIL` | CGACT fails | reconfigure or reset |
| `ERR_GNSS_NO_FIX` | fix_valid false | keep LTE alive, retry GNSS |
| `ERR_PIN_UNMAPPED` | `GPIO_NUM_NC` | degrade gracefully |

## Project inference vs verified behavior
| Claim | Classification | Confidence | Hardware verification |
|---|---|---|---|
| UART1 is the right AT channel in current board | Project inference | Medium | Compare with boot AT log and continuity test |
| PWR-KEY pulse is enough to toggle modem power | Community experience + project inference | Medium/High | Observe current draw and modem response to pulse |
| DTR can be used for low-power entry | Community experience | Medium | Measure idle current and wake behavior |
| `AT+CGNSINF` parser layout matches every SIM7600CE firmware | Unconfirmed | Low | Capture raw response on board and compare |

## Current project implementation cross-check
| Aspect | Current code | Gap |
|---|---|---|
| Layering | Separate AT / LTE / GNSS / power / FSM files | Good |
| Retry policy | Present but simple | Need more structured backoff and failure reason |
| Recovery | One reset attempt in LTE init | Good start, incomplete |
| Diagnostics | `STATUS` / `NET-LIGHT` read helpers exist | Not yet integrated into runtime reporting |
| Testability | Functions are mostly thin wrappers | Good for unit tests and bench scripts |

## Suggested test artifacts
- UART boot trace log
- Attach-time histogram
- GNSS TTFF benchmark log
- Sleep current measurement sheet
- Failure matrix for AT/SIM/registration/PDP/GNSS
- Board variant checklist for modem control pins

## Nguồn tham khảo
### Project files
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/modem_at.h`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`

### Official references
- [ESP-IDF UART documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/uart.html)
- [ESP-IDF Sleep Modes for ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/sleep_modes.html)
- [SIM76XX Series AT Command Manual listing](https://en.simcom.com/technical_files.html)
- [SIM7500/SIM7600 GNSS Application Note](https://en.simcom.com/product/SIM7600X-H-M2.html)