# Claims Requiring Attention

## Purpose
This file lists claims that are either inference-heavy, under-sourced, or likely to drift if the firmware or board changes. It is meant to prevent documentation from sounding more certain than the evidence allows.

## High-priority claims

| Claim | Where it appears | Why it needs attention | What to do next |
|---|---|---|---|
| U7 is a DS3231M RTC on I2C0 | `02_hardware_mapping/netlist_parsed_summary.md`, `02_hardware_mapping/hardware_pin_mapping.md`, `07_rtc/*` | Strong netlist evidence exists, but the firmware driver is absent and the exact board routing still needs bench confirmation | Verify the schematic/netlist and confirm the device address on the live board |
| DS3231M is part of the runtime clock path | `07_rtc/ds3231m_programming_guide.md`, `07_rtc/rtc_driver_design_notes.md` | This is a design intent, not current behavior | Mark as planned until a driver and boot policy exist |
| Alarm or wake routing is available for U7 | `07_rtc/*` | No source evidence yet shows an MCU wake pin for the RTC | Check continuity from U7 alarm output to the ESP32-S3 GPIO |
| Internal RTC memory and DS3231M solve the same problem | several RTC-adjacent notes | They do not: one is retained state, the other is external timekeeping | Keep the distinction explicit in every RTC doc |
| Modem `RESET`, `STATUS`, `NETLIGHT`, `DTR` are intentionally unmapped | `02_hardware_mapping/*`, `04_modem_gnss/*` | Netlist shows hardware for those signals, while firmware marks them `GPIO_NUM_NC` | Confirm board variant intent before changing pin map |
| SIM7600 AT timing and parser assumptions are universal | `04_modem_gnss/*` | These are current-project observations, not guarantees across all module firmware versions | Capture real boot logs and compare with the actual modem firmware revision |
| LIS3DSH interrupt polarity is known | `05_imu/*` | The docs flag it as field-test required, so it is not fully proven | Scope the line during wake tests and record polarity |
| LIS3DSH threshold and vibration-score tuning are stable | `05_imu/*` | These are runtime-tuned values, not calibrated across every vehicle | Run vehicle-class field tests before treating them as fixed |
| `esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1)` is always safe | `03_esp32s3_esp_idf/*`, `05_imu/*` | It depends on the actual interrupt polarity and board wiring | Re-validate after any IMU wiring or sensor change |
| The board uses only one authoritative time source | `03_esp32s3_esp_idf/*`, `07_rtc/*` | Current docs imply multiple time concepts: internal RTC memory, network time, and external RTC | Define a single boot policy before implementation |

## Medium-priority claims

| Claim | Why it is weaker | Suggested evidence |
|---|---|---|
| `AT+CGNSINF` field layout is stable for all SIM7600CE firmware | Parser behavior may vary by firmware revision | Raw serial capture from the actual modem |
| NVS self-healing is enough without schema migration | Works now, but may not scale | Versioned config key or migration plan |
| The current power control path is fully resolved | Some exact board-level routes are still inferred | Continuity check and scope trace |
| I2C pull-ups are adequate for every added peripheral | Bus loading may change after RTC integration | Measure bus rise time after DS3231M is added |

## Claims that should stay explicitly labeled as inference
- The RTC driver will likely need shared-bus serialization with the IMU.
- RTC alarm support should remain optional until the wake pin is proven.
- Boot-time time reconciliation will probably happen in the state machine.
- U7 may be authoritative or may be fallback-only depending on product policy.

## Sources

### [Project Evidence]
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/01_project_analysis/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/03_esp32s3_esp_idf/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/04_modem_gnss/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/05_imu/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/07_rtc/*.md`

### [Validation Needed]
- DS3231M datasheet and board routing confirmation
- Modem boot log capture and UART trace
- IMU wake polarity scope capture
- Vehicle field test data for threshold tuning