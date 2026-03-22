# Phase 06 — Create final pinout connection matrix and sign-off

## Context Links
- Schematic assets: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/schematic/`
- Firmware pin map: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-firmware/main/inc/pin_map.h`
- Doc tables: hardware/firmware files from phases 03-04.

## Overview
- Priority: P1
- Status: completed
- Output: one final connection matrix accepted by hardware+firmware docs.

## Key Insights
- This matrix is contract; any future change must touch matrix first.

## Requirements
- Functional: include signal, direction, voltage domain, polarity, owner file.
- Non-functional: human-readable and grep-friendly.

## Architecture
- Matrix columns: `Signal | ESP32 pin | Modem/Power pin | Active level | Source`.

## Related Code Files
- Modify (likely):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/iot-vehicle-tracking-report/03-firmware/part-04-power-management-gpio.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/iot-vehicle-tracking-report/02-hardware/03-system-diagram.md`
- Create: none (prefer in-place updates).
- Delete: none.

## Implementation Steps
1. Generate matrix from resolved Phase 03/05 state.
2. Insert matrix into doc anchor sections.
3. Record any exception note (legacy only).
4. Get sign-off checklist completed.

## Todo List
- [ ] Final matrix inserted.
- [ ] All references point to same values.
- [ ] Gate G6 passed.

## Success Criteria
- Any pin question answerable from one table.

## Risk Assessment
- Risk: dual tables diverge later.
- Mitigation: single canonical table, cross-link only.

## Security Considerations
- None specific.

## Next Steps
- Run final verification and review close (Phase 07).
