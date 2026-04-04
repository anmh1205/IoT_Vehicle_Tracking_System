# LIS3DSH vs LIS3DH Comparison

## Purpose
This comparison is here to prevent copy mistakes. The tracker runtime is **LIS3DSH**, while a lot of historical project text still says **LIS3DH**.

## Comparison table

| Topic | LIS3DSH | LIS3DH | What the project should do |
|---|---|---|---|
| `WHO_AM_I` | `0x3F` in current runtime expectation | `0x33` | Never share the same identity check across parts.
| Register map | Similar-looking control and interrupt registers, but do not assume behavior is identical | Similar-looking control and interrupt registers, but not the same device | Use the device-specific datasheet for all init values.
| Interrupt model | Project uses one motion interrupt line to GPIO21 and deep-sleep wake on `ext0` high | Older docs describe LIS3DH motion wake patterns and I2C/INT wiring | Keep only the wiring and behavior that are confirmed by current code/netlist.
| Init sequence | Current code uses `CTRL_REG1=0x27`, `CTRL_REG4=0x88`, then motion config | Historical LIS3DH docs in this repo show older examples and placeholders | Do not reuse the old example init without re-validation.
| Bus mapping | `GPIO47/48` for I2C and `GPIO21` for INT in the current firmware | Older documents in this repo mention `GPIO21/22/23` as a LIS3DH mapping | Treat the old mapping as stale until bench-confirmed.

## What is vendor-confirmed
- ST publishes separate datasheets for LIS3DSH and LIS3DH.
- `WHO_AM_I` differs, so the devices are not drop-in identical in runtime identity checks.
- Both families have interrupt and threshold concepts, but the exact configuration must follow the matching datasheet.

## What is project-confirmed
- Current firmware file name and runtime identity: `imu_lis3dsh.c` / `imu_lis3dsh.h`.
- Current motion wake path: GPIO21 interrupt and deep-sleep wake in `state_machine.c`.
- Current board mapping in `pin_map.h`: `GPIO47` SDA, `GPIO48` SCL, `GPIO21` INT.
- Current hardware cross-check documents already identify the IMU slot as `U10`.

## What is only an inference
- The board likely reused parts of the older LIS3DH documentation set during migration.
- Some historical prose may have been copied forward from a LIS3DH baseline even after the code switched to LIS3DSH naming.
- The current firmware may still be conservative in interrupt timing and threshold values until field-tested.

## High-risk copy mistakes
1. Keeping the word `LIS3DH` in docs while the runtime code is `LIS3DSH`.
2. Using the wrong `WHO_AM_I` constant.
3. Copying the old `GPIO21/22/23` note into current pin maps.
4. Reusing old motion threshold numbers without checking the new part’s unit behavior.
5. Assuming the same interrupt latch/polarity rules without testing the actual board.

## Decision rule for new work
- If you are editing firmware code, follow `imu_lis3dsh.c` and the LIS3DSH datasheet.
- If you are editing history/docs, explicitly mark LIS3DH text as legacy or stale.
- If a claim is not in the current code or board evidence, label it as field-test required.

## Sources

### Vendor
- ST LIS3DSH datasheet: https://www.st.com/resource/en/datasheet/lis3dsh.pdf
- ST LIS3DH datasheet: https://www.st.com/resource/en/datasheet/lis3dh.pdf
- ST LIS3DH product page: https://www.st.com/content/st_com/en/products/mems-and-sensors/accelerometers/lis3dh.html

### Project evidence
- `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`
- `iot-vehicle-tracking-system-firmware/main/inc/imu_lis3dsh.h`
- `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/hardware_pin_mapping.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/netlist_parsed_summary.md`
- `resources/docs/hardware-datasheets/manifest.md`
