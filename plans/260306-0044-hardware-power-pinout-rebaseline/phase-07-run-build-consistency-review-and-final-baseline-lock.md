# Phase 07 — Run build, consistency checks, and final baseline lock

## Context Links
- Firmware project root: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-firmware/`
- Plan folder: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260306-0044-hardware-power-pinout-rebaseline/`

## Overview
- Priority: P1
- Status: in_progress (blocked: ESP-IDF tooling unavailable in current environment)
- Output: final baseline locked with objective evidence.

## Key Insights
- Final gate must verify docs and firmware together, not separately.

## Requirements
- Functional: compile pass + text consistency checks + review sign-off.
- Non-functional: reproducible commands and evidence paths.

## Architecture
- Validation pipeline: build -> grep consistency -> review checklist -> close.

## Related Code Files
- Modify (if fix needed): only files touched by Phases 04-06.
- Create (likely):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/planner-260306-0044-hardware-power-pinout-rebaseline.md`

## Implementation Steps
1. Run firmware compile gate (idf build in active firmware tree).
2. Run mismatch grep checks for terms: 21700/2S/A7670 active sections.
3. Re-validate modem UART/PWRKEY/LVD statements across docs and code.
4. Delegate/perform review close and record approval.

## Todo List
- [ ] Compile succeeded. (blocked: `idf.py` not available in current shell)
- [x] Consistency grep clean.
- [x] Review close completed.
- [ ] Gate G7 passed. (pending compile evidence once ESP-IDF env is available)

## Success Criteria
- Baseline marked stable for next implementation cycle.

## Risk Assessment
- Risk: hidden stale copy in mirrored firmware folder.
- Mitigation: explicitly document active firmware root in close report.

## Security Considerations
- Do not include credentials/log secrets in build artifacts.

## Next Steps
- Start implementation tasks against locked baseline only.
