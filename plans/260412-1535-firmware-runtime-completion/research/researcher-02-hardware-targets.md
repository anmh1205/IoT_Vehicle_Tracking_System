# Hardware target + reality constraints for firmware completion

- Time: 2026-04-12 15:35 ICT
- Scope: target runtime behaviors vs hardware reality for ESP32-S3 + SIM7600CE-T + LIS3DSH + vgate iCar Pro BLE + 1S battery/power path.
- Bias: prefer repo docs/thesis claims that affect completion scope, not idealized future design.

## Target behaviors to lock in

1. Parked mode must use deep sleep, periodic heartbeat every 10-30 min, and immediate motion wake path via IMU interrupt. Refs: `resources/reports/thesis/final/thesis-final-report.tex:1162`, `:1372-1378`, `:2023-2025`, `:2470-2471`.
2. Whole-device parked current target is `< 500 uA`; wake from deep sleep target `< 3 s`. Refs: `resources/reports/thesis/final/thesis-final-report.tex:1129`, `:1131`, `:1700-1701`.
3. IMU scope is motion/vibration detection only, not crash detection. Refs: `resources/reports/thesis/final/thesis-final-report.tex:1064`, `:1015`, `:1498`.
4. BLE OBD is external-peripheral only; tracker must tolerate adapter absence and still infer IGN from ADC fallback when BLE OBD unavailable. Refs: `resources/reports/thesis/final/thesis-final-report.tex:694-695`, `:2041-2042`.
5. BLE OBD connect target is `< 10 s`; firmware should keep diagnostics/health counters for field triage. Refs: `resources/reports/thesis/final/thesis-final-report.tex:1163`, `docs/project-changelog.md:30-32`, `docs/system-architecture.md:51`.
6. GNSS target is `< 5 m` in open sky, but runtime must treat GNSS as streak/failure managed, not always-available. Refs: `resources/reports/thesis/final/thesis-final-report.tex:1164`, `docs/system-architecture.md:52-54`, `docs/code-standards.md:58-62`.
7. Canonical modem is SIM7600CE-T with integrated LTE+GNSS, default APN `internet`, GNSS via modem AT path. Refs: `docs/codebase-summary.md:18`, `resources/reports/thesis/final/thesis-final-report.tex:687-695`, `:1008-1010`, `:2475-2479`.
8. Power design assumption is multi-rail with 1S 18650 backup and AP2112-3.3 rail for ESP32-S3. Refs: `resources/reports/thesis/final/thesis-final-report.tex:688`, `:1473-1474`, `:80`, `:200`.

## Hardware ambiguities / drift to treat as real constraints

1. Deep-sleep numbers in thesis mix MCU-level and whole-device-level claims. ESP32-S3 can do uA-class sleep, but thesis itself says modem, GNSS, wake cycles, and auxiliaries dominate actual budget. Do not plan against MCU-only current. Refs: `resources/reports/thesis/final/thesis-final-report.tex:1877`, `:1908`, `:2581-2584`, `:2621-2623`.
2. SIM7600 integrated GNSS simplifies BOM, but LTE and GNSS share modem lifecycle; modem reset usually interrupts GNSS. This directly constrains sleep/wake sequencing and recovery policy. Refs: `resources/reports/thesis/final/thesis-final-report.tex:2714`, `:2728-2734`; runtime evidence: `docs/system-architecture.md:53-54`.
3. Thesis says IMU wakes ESP32 immediately via interrupt, but repo docs only show LIS3DSH naming migration and boot-reset fix; no cited proof yet that final interrupt route + threshold tuning were field-validated on target board. Refs: `resources/reports/thesis/final/thesis-final-report.tex:1378`, `:2023-2025`; `docs/project-changelog.md:42-48`.
4. BLE OBD depends on external vgate iCar Pro and vehicle compatibility; system target is not self-contained. Adapter pairing latency, advertising behavior, and PID support drift by vehicle. Refs: `resources/reports/thesis/final/thesis-final-report.tex:1012`, `:2011`, `:301-305`, `:392`, `docs/project-changelog.md:30-32`.
5. IGN inference has architectural drift: thesis includes ADC fallback when BLE OBD absent, but current repo summaries emphasize BLE diagnostics and GNSS recovery, not validated IGN fallback behavior. Refs: `resources/reports/thesis/final/thesis-final-report.tex:2041-2042`, `docs/codebase-summary.md:17-18`.
6. Power-path description is present, but hard data for battery switchover, charger behavior, brownout margins, modem TX burst sag, and quiescent current by rail is not surfaced in docs/thesis snippets gathered here. Refs only establish architecture, not margins: `resources/reports/thesis/final/thesis-final-report.tex:646`, `:688`, `:1473-1474`.

## Field-validation priorities

1. Measure real parked current on assembled hardware in at least 3 parked states: MCU deep sleep only, IMU armed, modem/GNSS fully off vs retained. Need rail-by-rail attribution, not single headline number.
2. Validate wake chain end-to-end: IMU interrupt -> ESP32 wake -> state restore -> heartbeat/alarm publish timing. Compare against `< 3 s` and `~100 ms wake trigger` claims. Refs: `resources/reports/thesis/final/thesis-final-report.tex:1131`, `:2025`.
3. Validate modem/GNSS sequencing after LTE loss and after GNSS fail streaks. Need proof that self-heal cooldown avoids modem thrash and does not starve heartbeats. Refs: `docs/system-architecture.md:52-54`, `docs/code-standards.md:58-62`.
4. Validate OBD field matrix: at least multiple vehicle/adapter sessions for connect time, PID success rate, timeout rate, disconnect recovery, and IGN fallback when adapter absent. Refs: `resources/reports/thesis/final/thesis-final-report.tex:1163`, `:2041-2042`, `:301-305`; `docs/project-changelog.md:30-32`.
5. Validate GNSS cold/warm reacquisition under parked->move transitions, especially after modem reset and under partial sky view. Refs: `resources/reports/thesis/final/thesis-final-report.tex:1164`, `docs/system-architecture.md:53-54`.
6. Validate battery/power path under worst modem burst: vehicle supply removed, battery low, wake + LTE attach + GNSS active. Need brownout/reset evidence.

## Risks that must appear in the plan

1. Sleep budget risk: `< 500 uA` may be impossible without explicit modem/GNSS/power-rail shutdown policy and measured board leakage.
2. Wake reliability risk: IMU interrupt path may be electrically valid but too noisy / too insensitive without threshold + debounce tuning, causing false wakes or missed tamper events.
3. Shared-modem risk: GNSS recovery and LTE recovery are coupled on SIM7600CE-T; aggressive self-heal can break both telemetry and fix acquisition.
4. External-peripheral risk: BLE OBD behavior depends on vgate iCar Pro + vehicle support; firmware completion cannot assume stable adapter availability or uniform PID support.
5. Power-path risk: 1S backup + regulator chain may not hold modem inrush / TX peaks, producing brownouts that look like firmware bugs.
6. Validation-gap risk: thesis target behaviors are stronger than currently evidenced repo docs for field-tested wake, current draw, and IGN fallback.
7. Scope risk: adding crash detection, advanced OBD diagnostics, or idealized low-power redesign violates stated scope; current target is motion/vibration, heartbeat, GNSS, BLE OBD basics. Refs: `resources/reports/thesis/final/thesis-final-report.tex:1062-1064`.

## Practical planning implications

- Firmware completion should target deterministic state transitions and measurement hooks first, not feature expansion.
- Plan must separate `spec target`, `board-proven behavior`, and `unknown until measured`.
- Add acceptance gates for: parked-current measurement, IMU wake proof, GNSS recovery proof, OBD fallback proof, power-loss/battery proof.
- Keep SIM7600 as canonical; do not reopen modem architecture unless hardware evidence disproves it. Refs: `docs/development-roadmap.md:81-90`, `docs/codebase-summary.md:18`.

## Unresolved questions

1. What exact board-level signal wakes ESP32 from LIS3DSH interrupt, and is it RTC-capable for deep sleep wake on current PCB revision?
2. Does firmware actually power down SIM7600 GNSS/LTE rails in parked mode, or only idle them logically?
3. What is the measured whole-device current in parked mode on real hardware, with battery attached?
4. Is ADC-based IGN fallback implemented and validated, or only specified in thesis?
5. What are battery chemistry, charger IC, and switchover topology details for the 1S backup path?
6. What vehicle/adaptor matrix has been field-tested for BLE OBD compatibility and reconnect behavior?
