# Research Report: PCB PDF schematic analysis

Timestamp: 2026-04-04 10:38 Asia/Saigon
Source: `iot-vehicle-tracking-system-main.pdf`

## Findings
- Board topology: 12-24V vehicle input -> 5V buck -> 3.3V MCU rail, plus separate ~4V rail for SIM7600 and battery/charger path.
- Power chain visible:
  - `P1` input labeled `12-24V -> 5V`
  - `U5 TPS54231` buck to `+5V`
  - `U3 AP2112K-3.3TRG1` to `+3.3V-NET` / `V-MCU`
  - `U1 MP2482` to `4V - SIM7600CE` / `V-SIM`
  - `U4 TP4056` single-cell charger for `21700-1C` battery
  - protection/ORing via `SS54`, `SS34`, `SMAJ5.0`, TVS/ESD parts
- MCU: `U6 ESP32-S3` with external flash `U8 W25Q128`, 40MHz resonator `Y1`, reset/boot buttons, USB-C, microSD, RTC `DS3231M`.
- Sensor bus: `U10 LIS3DSH` on `I2C0-SCL` / `I2C0-SDA`, with `INT1` and `INT2` nets to MCU.
- GNSS/cellular: `U9 SIM7600E/SIM7600CE` exposes `RXD/TXD`, `PWRKEY`, `RESET`, `DTR`, `NETLIGHT`, `STATUS`, `GNSS_ANT`, `MAIN_ANT`, `AUX_ANT`, `USIM_*`.
- SIM path includes level shifting/transistor stage and `V-SIM` rail; external microSIM socket `J8`.
- No explicit OBD UART/CAN controller appears in extracted text; vehicle interface seems to be power-focused, not diagnostic-bus focused.

## Firmware impact
- UART assignments must match hardware: ESP32-S3 primary UART talks to SIM7600 `TXD/RXD`; firmware must keep baud/config stable and avoid pin reassignment drift.
- I2C must remain on `I2C0-SCL/SDA` for LIS3DSH and DS3231M; firmware should support bus sharing and device-address validation at boot.
- GPIO polarity/timing matters:
  - ESP32 reset/boot buttons are active-low style hardware paths.
  - SIM7600 `PWRKEY`/`RESET` likely require pulse timing, not level hold; firmware needs explicit power-on/off sequencing.
  - `DTR` is present; sleep/wake strategy should use it, not random UART silence.
- Power sequencing assumptions:
  - MCU should boot only after `V-MCU` and flash are stable.
  - SIM7600 must not be commanded before `V-SIM`/module rails are valid.
  - USIM rail/level shifting must be respected; never drive SIM IO before rail-up.
- Runtime behavior should expose battery/charger state and modem status if firmware uses telemetry/health checks.

## Thesis impact
- Hardware chapter must reflect actual rails and blocks: charger, 5V/3.3V conversion, 4V modem rail, battery input, protection parts.
- Architecture diagram should show separate domains: MCU, modem/GNSS, IMU, RTC, flash, power management, USB, SD card.
- Replace generic wording with actual components: `ESP32-S3`, `SIM7600E/CE`, `LIS3DSH`, `DS3231M`, `W25Q128`, `TP4056`.
- Update pin-map/table in thesis appendix to include:
  - ESP32-S3 UART to SIM7600
  - I2C bus shared by IMU/RTC
  - modem control pins `PWRKEY`, `RESET`, `DTR`, `NETLIGHT`, `STATUS`
  - USB-C, SD card, boot/reset buttons
- Assets to update:
  - schematic-derived block diagram
  - pin mapping table
  - power-tree figure
  - any thesis screenshots that still show placeholder/block-diagram assumptions

## Risks
- PDF extraction is text-only; exact ESP32-S3 GPIO numbers for some nets may be missing or ambiguous.
- Some net names suggest connected signals, but polarity/timing details are inferred from common module behavior, not fully annotated in schematic text.
- `SIM7600CE` vs `SIM7600E` naming varies in extracted text; thesis must use the exact BOM/module label from the final schematic/assembly file.

## Open questions
- Exact ESP32-S3 GPIO numbers for `SIMCOM-*`, `IMU-INT1/2`, and other control nets are not fully readable from extracted text.
- Is the production board using SIM7600CE, SIM7600E, or a rename across revisions?
- Is any OBD/CAN diagnostic interface present in a different sheet not visible in the text extract?
- Are `V-MCU` and `+3.3V-NET` identical nets or separate 3.3V domains in the final design?

## Unresolved questions
- None
