# Phase 05 — Patch firmware for proven modem and LVD mismatches

## Context Links
- Primary firmware tree:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-firmware/main/inc/pin_map.h`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-firmware/main/src/modem_at.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-firmware/main/src/modem_lte.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-firmware/main/src/modem_gnss.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-firmware/main/src/power_mgr.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-firmware/main/src/state_machine.c`

## Overview
- Priority: P1
- Status: completed (no proven firmware mismatch requiring code changes)
- Output: firmware aligned to validated pin/power semantics.

## Key Insights
- Only patch proven mismatches from Phase 03; no speculative refactor.
- Keep KISS: pin defines + polarity/timing fixes first.

## Requirements
- Functional: modem control and LVD behavior match schematic/doc baseline.
- Non-functional: minimal diff, compile-safe.

## Architecture
- Interface constants (`pin_map.h`) drive modem/power modules.

## Related Code Files
- Modify: files listed in Context Links (only where mismatch is proven).
- Create: none.
- Delete: none.

## Implementation Steps
1. Apply agreed UART/PWRKEY pin and pulse semantics.
2. Fix LVD boolean/polarity if currently inverted.
3. Ensure modem init sequence remains SIM7600CE-T compatible.
4. Keep comments concise to encode signal polarity.

## Todo List
- [ ] Pin macros aligned with matrix.
- [ ] LVD semantics aligned with docs.
- [ ] Gate G5 (compile + consistency) ready.

## Success Criteria
- Build passes; runtime-critical control paths unchanged except mismatch fixes.

## Risk Assessment
- Risk: silent behavior change in boot/power cycle.
- Mitigation: add focused smoke checklist in Phase 07.

## Security Considerations
- Avoid unsafe modem command injection patterns.

## Next Steps
- Publish final matrix for sign-off (Phase 06).
