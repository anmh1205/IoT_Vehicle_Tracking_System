# LIS3DSH Register Walkthrough

## Scope
This note walks through the registers touched by the current firmware runtime. It is not a full datasheet replacement; it is a source-aligned guide for the registers actually used in the project.

## Register map used by the firmware

| Register | Addr | Role in current firmware | Source confidence | Notes |
|---|---:|---|---|---|
| `WHO_AM_I` | `0x0F` | Detect sensor identity | Vendor-confirmed + project-confirmed | Runtime expects `0x3F`.
| `OUT_X_L` | `0x28` | First byte of burst accel read | Project-confirmed | Firmware reads 6 bytes with auto-increment.
| `CTRL_REG1` | `0x20` | Enable axes and data-rate setup | Project-confirmed | Current value `0x27`.
| `CTRL_REG2` | `0x21` | Interrupt-related configuration | Project-confirmed | Written as `0x01` in motion init.
| `CTRL_REG3` | `0x22` | Interrupt routing / mode control | Project-confirmed | Written as `0x40` in motion init.
| `CTRL_REG4` | `0x23` | High-resolution / full-scale config | Project-confirmed | Current value `0x88`.
| `CTRL_REG5` | `0x24` | Interrupt / latch-related control | Project-confirmed | Written as `0x08` in motion init.
| `INT1_CFG` | `0x30` | Motion interrupt condition | Project-confirmed | Current firmware writes `0x2A`.
| `INT1_THS` | `0x32` | Motion threshold | Project-confirmed | Threshold derived from mg input.
| `INT1_DURATION` | `0x33` | Motion duration | Project-confirmed | Duration derived from ms input.

## Read path

### Identity check
1. Read register `0x0F`.
2. Expect `0x3F` for LIS3DSH in the current runtime.
3. If the value differs, retry on alternate I2C address `0x19` after the initial `0x18` attempt.

### Acceleration read
1. Start at `OUT_X_L = 0x28`.
2. Set auto-increment bit for multi-byte transfer.
3. Read 6 bytes.
4. Assemble little-endian signed 16-bit values:
   - X from bytes 0-1
   - Y from bytes 2-3
   - Z from bytes 4-5

## Write path

### Basic runtime config
- `CTRL_REG1 = 0x27`
- `CTRL_REG4 = 0x88`

These values are current project runtime choices, not a universal LIS3DSH default.

### Motion interrupt config
The current driver writes the following sequence:
1. `CTRL_REG2 = 0x01`
2. `CTRL_REG3 = 0x40`
3. `CTRL_REG5 = 0x08`
4. `INT1_CFG = 0x2A`
5. `INT1_THS = threshold`
6. `INT1_DURATION = duration`

Where:
- `threshold` is derived from the API input in mg.
- `duration` is derived from the API input in ms.

## What is inferred, not vendor-confirmed

### Project inference
- The driver assumes the board routes one motion interrupt line to GPIO21.
- The driver assumes deep-sleep wake is active-high on that line.
- The driver assumes the board supports the current threshold and duration scaling well enough for vehicle wake detection.

### What still needs bench validation
- Actual interrupt pulse width and polarity.
- Whether the chosen threshold produces the intended wake sensitivity on the mounted board.
- Whether vibration score normalization matches real-world vehicle vibration levels.

## LIS3DH copy-risk note
LIS3DH and LIS3DSH share similar-looking register names, so it is easy to copy a register example that compiles but behaves wrong.

High-risk mistakes:
- Copying a LIS3DH register value into LIS3DSH `CTRL_REG4` without checking semantics.
- Reusing a LIS3DH interrupt setup sequence and assuming the same latch behavior.
- Keeping a LIS3DH `WHO_AM_I` expectation in a LIS3DSH runtime.
- Assuming the same sensitivity units for threshold conversion.

## Quick validation checks
- Read `WHO_AM_I` and confirm `0x3F`.
- Write `CTRL_REG1` and confirm the device responds to a burst read.
- Trigger motion and verify `INT1` rises.
- Confirm the sleep wake path using the actual board, not only the simulator.

## Sources

### Vendor
- ST LIS3DSH datasheet: https://www.st.com/resource/en/datasheet/lis3dsh.pdf
- ST LIS3DH datasheet: https://www.st.com/resource/en/datasheet/lis3dh.pdf

### Project evidence
- `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`
- `iot-vehicle-tracking-system-firmware/main/inc/imu_lis3dsh.h`
- `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
