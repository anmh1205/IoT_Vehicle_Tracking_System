# Phase 02 — Catalog datasheets and source-of-truth

## Context Links
- Expected root (from requirement): `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/docs/hardware-datasheets/`
- Current docs to cross-check:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/iot-vehicle-tracking-report/02-hardware/`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/iot-vehicle-tracking-report/03-firmware/`

## Overview
- Priority: P1
- Status: completed
- Output: datasheet index with citation map.

## Key Insights
- Datasheet directory not found in current tree; must resolve canonical location first.
- Avoid speculative values; citation-first only.

## Requirements
- Functional: each critical parameter maps to a datasheet section/page.
- Non-functional: reproducible links and filenames.

## Architecture
- Manifest components -> datasheet lookup -> citation index table.

## Related Code Files
- Modify (likely):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/13-tai-lieu-trich-dan.md`
- Create (likely):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/docs/hardware-datasheets/INDEX.md` (only if folder confirmed/approved)
- Delete: none

## Implementation Steps
1. Confirm true datasheet folder path and ownership.
2. Register datasheets for SIM7600CE-T, LIS3DH, battery 18650 1S, power ICs.
3. Build citation map: parameter -> document -> section/page.
4. Flag missing authoritative docs as blockers.

## Todo List
- [ ] Datasheet location confirmed.
- [ ] Citation index completed.
- [ ] Gate G2 passed.

## Success Criteria
- No critical parameter in plan/docs without citation pointer.

## Risk Assessment
- Risk: missing official SIM7600CE-T document.
- Mitigation: block downstream edits until canonical source locked.

## Security Considerations
- Verify external files are trusted vendor docs.

## Next Steps
- Use citation index for pin/power verification (Phase 03).
