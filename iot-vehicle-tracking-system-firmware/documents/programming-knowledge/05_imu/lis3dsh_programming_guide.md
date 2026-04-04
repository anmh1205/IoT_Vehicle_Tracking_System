# LIS3DSH Programming Guide

## Scope
This guide documents the current runtime IMU path for the tracker firmware. The active runtime uses **LIS3DSH**, not LIS3DH.

## What is confirmed

### Vendor-confirmed facts
- LIS3DSH `WHO_AM_I` register is at `0x0F`.
- The official ST datasheet is the primary source for the full register map, interrupt behavior, and electrical limits.
- LIS3DSH and LIS3DH are related parts, but they are not interchangeable by name alone.

### Project-confirmed facts
- Firmware driver file: `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`
- Header file: `iot-vehicle-tracking-system-firmware/main/inc/imu_lis3dsh.h`
- Sensor bus uses `PIN_LIS3DSH_SDA = GPIO47` and `PIN_LIS3DSH_SCL = GPIO48`.
- Motion interrupt is wired to `PIN_LIS3DSH_INT = GPIO21`.
- The state machine wakes from deep sleep with `esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1)`.
- The driver checks `WHO_AM_I == 0x3F` and falls back between I2C addresses `0x18` and `0x19`.

### Field-test required facts
- Interrupt polarity on the live board.
- Actual motion threshold scaling on the mounted sensor.
- Whether the current vibration score is stable across board orientation and vehicle vibration patterns.

## Safe programming model

### Runtime initialization order
1. Create I2C master bus on `I2C_NUM_0`.
2. Add LIS3DSH device handle at `0x18`.
3. Read `WHO_AM_I`.
4. Retry once at `0x19` if the first address fails.
5. Program `CTRL_REG1` and `CTRL_REG4`.
6. Configure the interrupt GPIO as input.
7. Configure motion interrupt registers.

### Driver behavior in current code
- `CTRL_REG1 = 0x27` enables XYZ and normal mode at the current runtime setting.
- `CTRL_REG4 = 0x88` enables the current high-resolution / full-scale configuration used by the firmware.
- Motion interrupt setup uses `CTRL_REG2`, `CTRL_REG3`, `CTRL_REG5`, `INT1_CFG`, `INT1_THS`, and `INT1_DURATION`.
- Raw acceleration reads use `OUT_X_L` plus auto-increment for a 6-byte burst read.
- Vibration score is derived from the acceleration magnitude and normalized to `0..1000`.

## Copy-error warnings

### Do not copy LIS3DH assumptions into LIS3DSH code
- Do not reuse a LIS3DH `WHO_AM_I` value. LIS3DSH currently expects `0x3F`.
- Do not reuse old LIS3DH pin names if they were wired to a different board variant.
- Do not assume LIS3DH init values are valid for LIS3DSH without checking the ST datasheet.
- Do not assume the same interrupt threshold units or duration timing behavior across parts.

### Common mistake patterns
- Reusing `LIS3DH_*` constants in new LIS3DSH code.
- Reusing old docs that describe `GPIO21/22/23` as an IMU I2C triple without matching the current board mapping.
- Copying a generic accelerometer example that does not verify `WHO_AM_I`.

## Recommended usage pattern

### Minimal reader flow
```c
esp_err_t err = imu_init();
if (err != ESP_OK) {
    // handle startup failure
}

err = imu_configure_motion_interrupt(120, 200);
if (err != ESP_OK) {
    // motion wake is optional but strongly recommended
}

int16_t x = 0, y = 0, z = 0;
if (imu_read_accel(&x, &y, &z) == ESP_OK) {
    // consume raw axes
}
```

### Deep-sleep wake flow
- Keep INT1 wired to an RTC-capable wake path.
- Ensure interrupt state is cleared before entering sleep if the board latches the line.
- Verify wake cause after resume before assuming motion is the only source.

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
