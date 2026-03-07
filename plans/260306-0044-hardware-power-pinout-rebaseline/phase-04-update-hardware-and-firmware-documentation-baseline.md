# Phase 04 — Update hardware and firmware documentation baseline

## Context Links
- Hardware report files likely impacted:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/iot-vehicle-tracking-report/02-hardware/03-system-diagram.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/iot-vehicle-tracking-report/02-hardware/part-01-components/05-lte-modem-a7670c.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/iot-vehicle-tracking-report/02-hardware/part-01-components/06-backup-battery-21700.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/iot-vehicle-tracking-report/02-hardware/part-02-power-management/05-low-voltage-disconnect.md`
- Firmware report file likely impacted:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/iot-vehicle-tracking-report/03-firmware/part-04-power-management-gpio.md`

## Overview
- Priority: P1
- Status: completed
- Output: docs reflect new baseline and isolate legacy baseline.

## Key Insights
- Filename may still contain old component names; content must clearly mark active vs historical.
- Do not create parallel “enhanced” docs; update in place.

## Requirements
- Functional: remove active contradictions (SIM model, battery type, pin mapping, LVD meaning).
- Non-functional: concise, consistent terms.

## Architecture
- Resolved matrix -> propagate to all narrative tables/diagrams.

## Related Code Files
- Modify: all files listed in Context Links.
- Create: none (unless explicit approval for index file in Phase 02).
- Delete: none.

## Implementation Steps
1. Rewrite active sections to SIM7600CE-T + LIS3DH + 18650 1S.
2. Move old 21700/2S/A7670 content into labeled historical notes.
3. Align LVD text with verified polarity from Phase 03.
4. Cross-link to datasheet citations.

## Todo List
- [ ] No active contradiction in docs.
- [ ] Legacy baseline appears only as historical context.
- [ ] Gate G4 passed.

## Success Criteria
- Grep check for active sections returns no wrong baseline term.

## Risk Assessment
- Risk: old filenames mislead readers.
- Mitigation: explicit heading note “historical filename, active content updated”.

## Security Considerations
- Ensure links do not expose private/internal-only docs.

## Next Steps
- Apply only proven firmware deltas (Phase 05).
