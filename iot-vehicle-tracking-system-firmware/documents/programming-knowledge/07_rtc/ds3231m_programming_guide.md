# DS3231M Programming Guide

## Scope
This guide documents the planned RTC path for the tracker firmware around **U7 DS3231M** on the shared **I2C0** bus. The current firmware source does **not** contain a DS3231M driver yet, so this document separates confirmed board evidence from implementation inference.

## What is confirmed

### Vendor-confirmed facts
- DS3231M is an external RTC/timekeeping device class with battery-backed time retention.
- Register-level behavior, alarm semantics, oscillator status, and backup-power behavior must be verified against the DS3231M datasheet before implementation.

### Project-confirmed facts
- Netlist summary places **U7** on the same I2C bus as the IMU.
- Hardware mapping documents show `I2C0-SDA` / `I2C0-SCL` shared by the IMU and RTC.
- Current firmware source does **not** include a DS3231M driver file under `main/src/` or `main/inc/`.
- The firmware already uses `RTC_DATA_ATTR` for retained runtime state, but that is **internal RTC memory**, not the external DS3231M.

### Validation-required facts
- Whether U7 alarm/interrupt output is routed to an MCU GPIO or only polled over I2C.
- Whether the board uses VBAT backup for U7 and how that rail is powered.
- Whether the DS3231M time source should be authoritative or only a fallback to network time.

## Safe programming model

### Recommended runtime sequence
1. Bring up `I2C_NUM_0`.
2. Scan or address-probe U7 on the shared bus.
3. Read status/oscillator state before trusting time.
4. Set or reconcile time only once the boot policy decides the source of truth.
5. Configure alarm or square-wave behavior only if the board routes a usable pin.
6. Keep the RTC driver independent from cloud, modem, and telemetry code.

### Driver boundaries
The RTC driver should own:
- I2C transactions for U7
- time read/write operations
- alarm configuration
- status/health checks
- battery-backup awareness

The RTC driver should **not** own:
- timezone policy
- MQTT publish logic
- deep-sleep orchestration
- state-machine decisions outside RTC health

## Current source gap
The present firmware has time-related retention through `g_rtc_context`, but that is not a replacement for an external RTC.

Implication:
- if boot time must survive long power loss, DS3231M integration is still needed
- if network time is the only source of truth, DS3231M becomes a fallback and audit clock
- if the board uses DS3231M alarm output for wake, the wake path must be validated in hardware before depending on it

## Evidence levels

### Strong
- U7 exists on the shared I2C0 bus from netlist + hardware mapping docs.
- Firmware currently lacks a DS3231M driver.

### Inference
- DS3231M should likely be initialized through the same I2C bus abstraction used by the IMU.
- A shared-bus lock or serialized transaction model will be needed if the RTC driver is added to `state_machine.c`.
- Time reconciliation will probably happen at boot or during connectivity recovery.

### Needs bench validation
- U7 address, alarm behavior, and interrupt/wake routing.
- Backup-power retention across power-cycle and sleep paths.
- Whether the board needs periodic time correction or only boot-time sync.

## Recommended integration points

### Likely modules to touch later
- `main/inc/pin_map.h` for any U7 interrupt/wake GPIO mapping
- `main/src/state_machine.c` for boot-time time sync policy
- `main/src/power_mgr.c` if RTC backup power is gated by a board rail
- a future `rtc_*` source pair under `main/src/` and `main/inc/`

### Design rules
- Keep timekeeping APIs small and explicit.
- Return `esp_err_t` from every hardware-facing entry point.
- Do not hide RTC failures behind generic boot success.
- Log enough context to distinguish I2C failure from oscillator/state failure.

## Sources

### [Project Evidence]
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/netlist_parsed_summary.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/hardware_pin_mapping.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/hardware_firmware_crosscheck.md`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/main/inc/app_state.h`
- `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`

### [Validation Needed]
- DS3231M datasheet and register map
- Board schematic / continuity check for any RTC alarm or wake pin
- Power rail notes for U7 VBAT / VCC behavior
