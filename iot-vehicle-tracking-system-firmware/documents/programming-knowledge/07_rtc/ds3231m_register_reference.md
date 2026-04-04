# DS3231M Register Reference

## Scope
This is a source-aligned register reference for the planned DS3231M integration on U7. It is intentionally conservative: where the current project lacks a driver or bench evidence, the entry is marked as validation-needed.

## Legend
- **Vendor**: should match the DS3231M datasheet exactly after verification
- **Project**: inferred from board context or current firmware structure
- **Validation needed**: must be checked on hardware before coding against it

## Core register groups

| Group | Range | Purpose | Confidence | Notes |
|---|---:|---|---|---|
| Timekeeping | `0x00`-`0x06` | Seconds, minutes, hours, day, date, month, year | Vendor / validation needed | Standard RTC time set/read path; verify DS3231M BCD layout before implementation. |
| Alarm 1 | `0x07`-`0x0A` | Alarm 1 compare fields | Vendor / validation needed | Only use if board needs scheduled wake or periodic alarm. |
| Alarm 2 | `0x0B`-`0x0D` | Alarm 2 compare fields | Vendor / validation needed | Same caveat as Alarm 1. |
| Control | `0x0E` | Oscillator, alarm, square-wave control | Vendor / validation needed | Must be read before writing wake policy. |
| Status | `0x0F` | Oscillator/flag status | Vendor / validation needed | Important for boot trust and fault detection. |
| Aging offset | `0x10` | Frequency trim / calibration | Vendor / validation needed | Usually not required until measured drift matters. |
| Temperature | `0x11`-`0x12` | Internal temperature sample | Vendor / validation needed | Useful for diagnostics only if the board needs it. |

## Expected read/write rules

### Time read
1. Read `0x00`-`0x06` in one burst if the bus timing permits.
2. Decode BCD values before using them as integer time fields.
3. Re-read if the status register indicates oscillator or validity issues.

### Time write
1. Stop or gate time updates if the boot policy requires a clean set sequence.
2. Write seconds through year fields in one transaction or a tightly controlled sequence.
3. Clear any status flags that would make the next boot distrust time.

### Alarm use
- Use alarms only if the board exposes a wake or interrupt path.
- Keep alarm programming separate from normal time synchronization.
- If wake is not wired, treat alarm registers as optional and avoid relying on them.

## Behavior the firmware should not assume
- Do not assume the external RTC is already valid after first power-up.
- Do not assume the oscillator is running if the battery rail was absent.
- Do not assume the alarm output is connected to an ESP32 wake pin.
- Do not assume the DS3231M and internal RTC memory solve the same problem.

## Minimal driver contract

A future DS3231M driver should expose only a few operations:

| API intent | Example responsibility | Validation status |
|---|---|---|
| `init` | Probe U7 and verify status | Needed |
| `get_time` | Read current timestamp | Needed |
| `set_time` | Write boot-synced time | Needed |
| `read_status` | Check oscillator/flags | Needed |
| `configure_alarm` | Enable scheduled wake or diagnostics | Optional |
| `clear_alarm_flags` | Acknowledge wake/alarm events | Optional |

## Current project gap
There is no DS3231M source implementation in the firmware tree today. That means the register reference is a planning artifact, not proof of runtime behavior.

Implication:
- the first code version should focus on probe/read/status before write-heavy features
- alarm support should wait until the board wake path is confirmed
- any temperature or aging-offset use should stay deferred until a measurable need exists

## Validation checklist
- [ ] Confirm U7 address on I2C0
- [ ] Confirm the exact register map against the DS3231M datasheet
- [ ] Confirm BCD conversion and time-field ordering
- [ ] Confirm whether alarm output is routed to an ESP32 GPIO
- [ ] Confirm battery-backup behavior after full power removal

## Sources

### Project evidence
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/netlist_parsed_summary.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/hardware_pin_mapping.md`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/main/inc/app_state.h`

### Validation needed
- DS3231M datasheet
- Board schematic / continuity test for U7 pins
- Bench capture for I2C address and alarm/flag behavior