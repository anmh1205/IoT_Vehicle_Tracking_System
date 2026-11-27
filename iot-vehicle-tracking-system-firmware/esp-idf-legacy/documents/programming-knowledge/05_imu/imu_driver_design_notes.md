# IMU Driver Design Notes

## Purpose
These notes explain how the current IMU driver fits into the runtime state machine and why the design is intentionally small.

## Design goals
- Keep the driver focused on sensor I/O and motion wake configuration.
- Avoid mixing sensor math with network or power orchestration.
- Make deep-sleep wake behavior obvious and testable.
- Keep the IMU path easy to compare with the older LIS3DH documentation set.

## Current driver responsibilities
The LIS3DSH driver currently does four things:
1. Initialize the I2C bus and the IMU device.
2. Configure the motion interrupt path.
3. Read raw X/Y/Z acceleration samples.
4. Produce a compact vibration score for telemetry.

## Where the driver is used

### `state_machine.c`
- `state_machine_init()` calls `imu_init()` and then `imu_configure_motion_interrupt(120, 200)`.
- `state_machine_refresh_telemetry()` consumes `imu_get_vibration_composite()`.
- `state_machine_prepare_sleep()` enables deep-sleep wake on `PIN_LIS3DSH_INT`.
- `APP_STATE_ALARM` checks `imu_motion_detected()` to decide whether to stay awake.

### `pin_map.h`
- `PIN_LIS3DSH_INT` = GPIO21
- `PIN_LIS3DSH_SDA` = GPIO47
- `PIN_LIS3DSH_SCL` = GPIO48

## Flow diagram in words
1. Boot starts.
2. The state machine initializes IMU before the transport stack.
3. Motion interrupt is configured.
4. Telemetry sampling uses the IMU only when needed.
5. Deep sleep is armed with the IMU interrupt line as a wake source.
6. Motion wake returns the system to active processing.

## Design boundaries

### In scope for the IMU driver
- Register reads and writes.
- Device identity check.
- Motion interrupt configuration.
- Raw acceleration readout.
- Derived vibration scoring.

### Out of scope for the IMU driver
- MQTT publish logic.
- GNSS or LTE control.
- Deep-sleep policy decisions.
- OBD aggregation.
- Board-level power routing.

## Evidence levels

### Vendor
- The IMU identity and register layout must follow the matching ST datasheet.
- `WHO_AM_I` is the first hard gate for device identity.

### Project inference
- The runtime uses a single motion interrupt line, not a multi-sensor IMU subsystem.
- The current threshold and duration values are chosen for a vehicle tracker use case, not as a generic sensor baseline.
- The vibration score is a compact product metric, not a calibrated scientific measurement.

### Field-test required
- Threshold tuning for vehicle classes and mounting orientation.
- Wake reliability after repeated deep-sleep cycles.
- False wake rate on road vibration, engine idle, and door slam events.
- Behavior if the IMU is hot-plugged or partially powered during boot.

## Risks to watch
- Copying old LIS3DH register examples into LIS3DSH code.
- Changing interrupt routing without updating sleep wake logic.
- Making the vibration score look precise when it is only a normalized runtime indicator.
- Leaving historical docs in a half-migrated state so the code and docs disagree.

## Recommended maintenance rule
When IMU behavior changes, update these three places together:
1. `imu_lis3dsh.c`
2. `pin_map.h`
3. The `05_imu` documentation set

## Sources

### Vendor
- ST LIS3DSH datasheet: https://www.st.com/resource/en/datasheet/lis3dsh.pdf
- ST LIS3DH datasheet: https://www.st.com/resource/en/datasheet/lis3dh.pdf

### [Project Evidence]
- `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`
- `iot-vehicle-tracking-system-firmware/main/inc/imu_lis3dsh.h`
- `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/hardware_pin_mapping.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/netlist_parsed_summary.md`
