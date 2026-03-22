# Phase 01 — Freeze component manifest and schematic baseline

## Context Links
- `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/schematic/block-diagram.png`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/schematic/power.png`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/schematic/esp32.png`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/schematic/simcom.png`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/schematic/CacCachTinhChonLinhKien.md`

## Overview
- Priority: P1
- Status: completed
- Output: frozen manifest + baseline assumptions.

## Key Insights
- Existing markdown contains old 2S architecture text; must isolate as legacy.
- New baseline must be explicit: SIM7600CE-T, LIS3DH, 18650 1S.

## Requirements
- Functional: produce a signed-off component manifest.
- Non-functional: unambiguous names, one source-of-truth list.

## Architecture
- Input assets -> normalize component naming -> emit manifest table.

## Related Code Files
- Modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/schematic/CacCachTinhChonLinhKien.md`
- Create: none
- Delete: none

## Implementation Steps
1. Extract all active components from 4 schematic images + markdown.
2. Mark each component as `active` or `legacy-historical`.
3. Freeze canonical list with explicit locked constraints.
4. Record mismatch candidates for Phase 03.

## Todo List
- [ ] Canonical manifest generated.
- [ ] Legacy items labeled, not mixed into active baseline.
- [ ] Gate G1 passed.

## Success Criteria
- Manifest references only target runtime architecture for active path.

## Risk Assessment
- Risk: hidden legacy term remains in active section.
- Mitigation: strict active-vs-legacy label review.

## Security Considerations
- No secrets involved.

## Next Steps
- Feed manifest to datasheet catalog (Phase 02).
