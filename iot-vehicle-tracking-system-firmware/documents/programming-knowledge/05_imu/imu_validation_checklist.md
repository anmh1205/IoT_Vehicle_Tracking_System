# IMU Validation Checklist

## Purpose
Use this checklist to validate the LIS3DSH path during boot and after deep-sleep wake. This is the fastest way to catch LIS3DH/LIS3DSH copy mistakes and board-wiring drift.

## Validation legend
- [V] Vendor-confirmed expectation
- [P] Project-confirmed expectation
- [F] Field-test required

## Boot-time validation

### Power-on and identity
- [ ] [P] Confirm the firmware logs `LIS3DSH initialized`.
- [ ] [P] Verify `WHO_AM_I` is read from register `0x0F`.
- [ ] [V] Confirm the value matches LIS3DSH identity expectation `0x3F`.
- [ ] [P] Confirm the driver can fall back from I2C address `0x18` to `0x19` if needed.
- [ ] [F] Confirm the fallback is actually necessary on the target board only if the primary address fails.

### Register programming
- [ ] [P] Confirm `CTRL_REG1` is written.
- [ ] [P] Confirm `CTRL_REG4` is written.
- [ ] [P] Confirm interrupt-related registers are programmed without I2C errors.
- [ ] [F] Confirm the chosen threshold value feels correct for the real vehicle vibration profile.

### GPIO and wiring
- [ ] [P] Confirm `PIN_LIS3DSH_INT` is configured as input.
- [ ] [P] Confirm SDA uses GPIO47 and SCL uses GPIO48.
- [ ] [P] Confirm the interrupt line is on GPIO21.
- [ ] [F] Confirm the interrupt is active-high on the live board.
- [ ] [F] Confirm there is no accidental copy of old LIS3DH GPIO mapping.

## Motion-trigger validation

### Manual bench test
- [ ] [P] Tap or shake the board and observe `imu_motion_detected()` become true.
- [ ] [P] Confirm the motion interrupt is routed to the wake path.
- [ ] [F] Confirm the current threshold/duration pair still rejects noise but catches real vibration.
- [ ] [F] Confirm X/Y/Z raw reads vary as expected when the board orientation changes.

### Telemetry sanity
- [ ] [P] Confirm `imu_get_vibration_composite()` returns a bounded score in `0..1000`.
- [ ] [P] Confirm a stationary board trends toward a low vibration score.
- [ ] [F] Confirm moving the vehicle produces a materially higher score than idle.

## Deep-sleep wake validation

### Before sleep
- [ ] [P] Confirm `state_machine_prepare_sleep()` arms `ext0` wake on `PIN_LIS3DSH_INT`.
- [ ] [P] Confirm timer wake is also armed.
- [ ] [P] Confirm modem and BLE shutdown paths do not interfere with IMU wake.

### Wake event
- [ ] [P] Wake the device by motion.
- [ ] [P] Confirm boot reason indicates wake rather than cold start.
- [ ] [P] Confirm `APP_STATE_ALARM` or the active wake branch runs after resume.
- [ ] [F] Confirm the interrupt line resets cleanly after wake and does not latch false-high.
- [ ] [F] Confirm multiple sleep/wake cycles do not degrade reliability.

## LIS3DH vs LIS3DSH copy-check
- [ ] [P] Confirm all current runtime docs say LIS3DSH, not LIS3DH.
- [ ] [P] Confirm `WHO_AM_I` expectation is `0x3F`, not the LIS3DH value.
- [ ] [P] Confirm the current pin map uses GPIO47/48/21 for the IMU, not the older GPIO21/22/23 note.
- [ ] [F] Confirm no copied LIS3DH example remains in any new IMU doc or code comment.

## Pass / fail rule
Pass only if all project-confirmed items succeed and the field-test items are documented with actual hardware results.

## Sources

### Vendor
- ST LIS3DSH datasheet: https://www.st.com/resource/en/datasheet/lis3dsh.pdf
- ST LIS3DH datasheet: https://www.st.com/resource/en/datasheet/lis3dh.pdf

### Project evidence
- `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`
- `iot-vehicle-tracking-system-firmware/main/inc/imu_lis3dsh.h`
- `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/hardware_pin_mapping.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/netlist_parsed_summary.md`
