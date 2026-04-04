# Scout Report

## Relevant Files

### Firmware (update candidates)
- `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dh.c`
- `iot-vehicle-tracking-system-firmware/main/inc/imu_lis3dh.h`
- `iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
- `iot-vehicle-tracking-system-firmware/main/inc/power_mgr.h`
- `iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
- `iot-vehicle-tracking-system-firmware/main/inc/modem_at.h`
- `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `iot-vehicle-tracking-system-firmware/main/inc/modem_lte.h`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`

### Hardware specs inputs
- `iot-vehicle-tracking-system-firmware/hardware-specs/iot-vehicle-tracking-system-main.pdf`
- `iot-vehicle-tracking-system-firmware/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`

### Thesis/report update candidates
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-readability-draft.md`
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`
- `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`
- `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
- `resources/reports/thesis/final/assets/mermaid-thesis-config.json`
- `resources/reports/thesis/final/assets/uml/*.mmd`
- `resources/reports/thesis/final/assets/figures/*.svg`

## Findings
- Netlist indicates modem symbol `SIM7600E` and IMU symbol `LIS3DSH`.
- Firmware currently implements LIS3DH driver naming/register assumptions (`imu_lis3dh.*`, `PIN_LIS3DH_*`).
- Firmware modem path currently relies on `PIN_MODEM_TX/RX/PWRKEY`; reset/dtr/rts/status/light lines are not clearly modeled at pin-map API level.
- Thesis draft heavily references `SIM7600CE-T` and `LIS3DH`; many hardware and firmware figures likely need synchronized naming + pin/power mapping updates.
- Figure generation pipeline is markdown-reference driven: markdown -> figure names -> `thesis-mermaid-diagrams.mjs` source lookup -> render to `assets/figures`.

## Likely Edits
- Firmware: align IMU naming/model assumptions and verify register compatibility; validate/adjust modem control pin mapping and power sequencing assumptions.
- Thesis markdown: align modem/IMU naming with actual hardware revision and update power-tree narrative.
- Assets UML: update diagrams for modem/IMU/pin-map/power-path; regenerate impacted SVG outputs.

## Dependencies
- Runtime chain: `state_machine` -> `power_mgr` + `modem_lte` + `imu_lis3dh`.
- UART modem transport: `modem_lte` -> `modem_at` -> `pin_map` UART config.
- Figure chain: markdown references + `generate-thesis-report-figures.mjs` + `thesis-mermaid-diagrams.mjs` + `assets/uml/*.mmd`.

## Unresolved Questions
- Exact GPIO mapping from ESP32-S3 to SIM control nets (`RESET`, `DTR`, `RTS`, `STATUS`, `NET-LIGHT`) in finalized board revision.
- Whether firmware should truly migrate LIS3DH driver logic to LIS3DSH registers or only re-label if board BOM still uses LIS3DH-compatible part.
- Final canonical modem naming for thesis (`SIM7600E`, `SIM7600CE`, or `SIM7600CE-T`) by hardware revision policy.
