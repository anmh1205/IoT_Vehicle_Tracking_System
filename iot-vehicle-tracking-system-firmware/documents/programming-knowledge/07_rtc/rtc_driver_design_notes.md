# RTC Driver Design Notes

## Purpose
These notes define the intended shape of a future DS3231M RTC driver for U7. The current firmware has no DS3231M driver yet, so this document describes boundaries and validation points rather than implementation details.

## Design goals
- Keep the RTC driver small and explicit.
- Use the same shared I2C bus model as the IMU.
- Make boot-time time sync easy to reason about.
- Keep alarm handling optional until the board routing is proven.
- Preserve current firmware simplicity; do not pull RTC logic into unrelated modules.

## Confirmed project context
- U7 is present on the shared I2C0 bus according to the netlist summary.
- Existing firmware already uses internal RTC memory for retained state.
- No DS3231M driver exists in the current source tree.

## Suggested responsibilities
A future RTC driver should own:
- probe and identity check for U7
- read/write current time
- status/oscillator-health checks
- optional alarm configuration
- optional time drift or diagnostics support

A future RTC driver should **not** own:
- MQTT or telemetry formatting
- deep-sleep policy
- modem time sync logic
- UI-facing date formatting
- board power sequencing outside U7 supply health

## Recommended integration model

### Boot flow
1. Initialize I2C0.
2. Probe U7.
3. Read status and decide whether time is trustworthy.
4. If time is invalid, ask the higher-level state machine to reconcile from network or default policy.
5. If alarm/wake is wired, configure it only after the board validates the path.

### Shared-bus policy
Because the IMU already uses the same bus, the RTC driver should follow the same bus-serialization rules:
- one transaction owner at a time
- bounded retries
- clear error returns
- no busy loops inside control code

## Evidence levels

### Vendor
- DS3231M register semantics, oscillator handling, and alarm behavior must come from the datasheet.

### Project inference
- The RTC should be treated as a local clock authority or fallback depending on boot policy.
- The driver likely needs a health flag so the state machine can tell valid time from stale time.
- Alarm support should remain optional until the U7 wake pin is confirmed.

### Needs bench validation
- U7 address, status behavior, and alarm output wiring.
- Whether backup power is present and stable during full board power loss.
- Whether the board needs one-time sync at boot or periodic re-sync.

## Risks
- Confusing internal RTC memory with the external DS3231M.
- Adding alarm logic before the board exposes a usable wake route.
- Creating a generic time abstraction that hides the source of truth.
- Overcomplicating the first version with calibration or temperature features.

## Recommended file split for implementation later
- `main/inc/ds3231m.h` or `main/inc/rtc_ds3231m.h`
- `main/src/ds3231m.c` or `main/src/rtc_ds3231m.c`
- small integration hook in `state_machine.c`

## Success criteria for the future implementation
- Driver can probe U7 reliably on I2C0.
- Time read/write works across reboot.
- Status handling clearly distinguishes valid and invalid clock state.
- Any alarm/wake path is validated on hardware before being used by runtime policy.

## Sources

### Project evidence
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/netlist_parsed_summary.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/hardware_pin_mapping.md`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/main/inc/app_state.h`
- `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`

### Validation needed
- DS3231M datasheet
- Board schematic / continuity test for U7 wake/alarm pin
- Power-rail confirmation for RTC backup behavior