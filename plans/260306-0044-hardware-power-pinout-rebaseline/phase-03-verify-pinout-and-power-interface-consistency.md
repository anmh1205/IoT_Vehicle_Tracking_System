# Phase 03 — Verify pinout and power interface consistency

## Context Links
- Firmware pins:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-firmware/main/inc/pin_map.h`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-firmware/main/src/power_mgr.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-firmware/main/src/modem_at.c`
- Hardware docs:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/iot-vehicle-tracking-report/02-hardware/03-system-diagram.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/iot-vehicle-tracking-report/03-firmware/part-04-power-management-gpio.md`

## Overview
- Priority: P1
- Status: completed
- Output: mismatch matrix and resolved target mapping.

## Key Insights
- Current docs show pin assignments not matching firmware macros.
- `power_is_low_voltage()` semantic likely inverted against documentation text.

## Requirements
- Functional: one agreed mapping for UART, PWRKEY, charger, MUX, LVD.
- Non-functional: explicit signal polarity notes.

## Architecture
- Compare triplet: schematic signal <-> docs table <-> firmware macro/logic.

## Related Code Files
- Modify (likely docs first):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/iot-vehicle-tracking-report/03-firmware/part-04-power-management-gpio.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/iot-vehicle-tracking-report/02-hardware/03-system-diagram.md`
- Modify (if proven mismatch):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-firmware/main/inc/pin_map.h`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-firmware/main/src/power_mgr.c`

## Implementation Steps
1. Build interface matrix with current values.
2. Validate each line against datasheet and schematic labels.
3. Decide single truth per signal (doc fix vs firmware fix).
4. Mark unresolved conflicts as blockers for Phase 05.

## Todo List
- [ ] UART/PWRKEY mapping resolved.
- [ ] LVD polarity/semantic resolved.
- [ ] Gate G3 passed.

## Success Criteria
- Zero ambiguous signal meaning remains.

## Risk Assessment
- Risk: duplicated firmware tree causes drift.
- Mitigation: define one primary firmware path before patching.

## Security Considerations
- No secrets.

## Next Steps
- Push resolved mapping into docs baseline (Phase 04).
