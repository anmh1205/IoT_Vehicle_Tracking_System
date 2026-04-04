# Open Questions and Validation Needed

## Purpose
This file tracks the remaining unknowns after the RTC docs and source audit. Anything listed here should stay open until a datasheet check, schematic trace, or bench test closes it.

## Open questions

| Question | Why it matters | Current evidence | Validation method | Priority |
|---|---|---|---|---|
| Does U7 definitely map to DS3231M? | The RTC docs depend on exact device identity | Netlist summary and hardware mapping strongly suggest it, but the driver is absent | Verify the schematic/netlist and board silkscreen / BOM | High |
| What is the exact I2C address for U7? | Needed before any driver can probe the part | Not yet confirmed in the firmware source | Bus scan on the live board | High |
| Is there an RTC alarm or interrupt pin routed to the ESP32-S3? | Determines whether U7 can wake the MCU or only provide timekeeping | No source evidence yet | Continuity probe and wake test | High |
| Is U7 battery-backed through VBAT or another backup rail? | Determines time retention across power loss | Not proven by current docs | Power-cycle test and schematic trace | High |
| Should external RTC be authoritative or only a fallback? | Impacts boot policy and time sync logic | Not yet decided in source | Product decision + boot integration test | High |
| Should the firmware sync U7 from network time at boot? | Affects state machine and retry behavior | Only implied in the RTC design notes | Define boot policy, then test against offline/online boots | Medium |
| Are the I2C0 pull-ups still adequate after adding U7? | Extra bus loading could hurt timing margin | Current docs mention pull-ups but do not quantify margins | Measure rise time and verify stable bus traffic | Medium |
| Are modem `RESET`, `STATUS`, `NETLIGHT`, and `DTR` really meant to stay unmapped? | Prevents stale pin-map drift | Netlist shows hardware while firmware marks `GPIO_NUM_NC` | Continuity probe and board-variant review | High |
| Is `PIN_LIS3DSH_INT` polarity stable across real boards? | Deep-sleep wake depends on it | Current docs mark it field-test required | Scope capture during motion interrupt and sleep entry | Medium |
| Are LIS3DSH threshold/duration values reusable across vehicle types? | Affects false wake / missed wake rates | Current docs treat them as tuning values | Field test with multiple mounting/orientation cases | Medium |
| Does `AT+CGNSINF` parse identically on the actual SIM7600 firmware revision? | GNSS docs rely on parser shape | Current docs infer from source and common SIMCom behavior | Capture raw AT responses and compare | Medium |
| Is NVS self-healing sufficient without migration logic? | Future config changes may need versioning | Existing docs note no schema migration layer | Introduce versioned config check if needed | Low |

## Validation backlog
- [ ] Confirm DS3231M identity and I2C address.
- [ ] Confirm RTC backup retention across full power removal.
- [ ] Confirm wake/alarm pin routing if any.
- [ ] Confirm modem side-band pin behavior on the actual board.
- [ ] Confirm IMU interrupt polarity with a scope.
- [ ] Capture real SIM7600 AT/GNSS boot logs.
- [ ] Measure I2C bus margins after RTC integration.

## Notes
- Keep these questions visible rather than burying them inside narrative text.
- Do not convert any item above into a hard claim until the validation method has been completed.
- If future source changes resolve one of these items, move it out of this file and update the matching doc family.

## Sources

### Project evidence
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/01_project_analysis/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/03_esp32s3_esp_idf/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/04_modem_gnss/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/05_imu/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/07_rtc/*.md`

### Validation needed
- DS3231M datasheet and board continuity tests
- Modem boot trace and UART capture
- IMU wake polarity and threshold field tests