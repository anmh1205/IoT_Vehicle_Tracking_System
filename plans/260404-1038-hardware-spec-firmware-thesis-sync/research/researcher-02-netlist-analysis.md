# Netlist Analysis — researcher-02

## Findings
- MCU is **U6 = ESP32-S3**.
- Cellular/GNSS module is **U9 = SIM7600E**.
- Motion sensor is **U10 = LIS3DSH** (not LIS3DH).
- Main debug/programming header is **P2**, exposing `ESP-RESET`, `V-MCU`, `U0TX`, `U0RX`, `BOOT-IO0`, `BATTERY-`.
- SIM card socket is **J8**, with ESD protection **D11** and series resistors **R41/R42/R43** on USIM lines.
- Power tree is split: battery → charger/boost/buck rails → `+5V`, `V-MCU`, `+3.3V-MCU`, `V-SIM`, `V-SIM-62-63`.
- SIM7600 control pins of interest: `PWR-KEY`, `RESET`, `STATUS`, `NET-LIGHT`, `SIM-RTS`, `SIM-RX`, `SIM-TX`, `SIM-DTR`.
- SIM7600 antenna nets are explicit: `MAIN-ANT`, `AUX-ANT`, `GNSS-ANT` via J5/J6/J7 and matching 0R links.
- ESP32-S3 boot/reset nets are explicit: `ESP-RESET`, `BOOT-IO0`, `U0TX`, `U0RX`.
- Motion sensor is on I2C: `I2C0-SCL`, `I2C0-SDA` with pullups **R18/R19** to `V-MCU`.

### Key net groups
| Domain | Nets | Notes |
|---|---|---|
| MCU debug | `ESP-RESET`, `BOOT-IO0`, `U0TX`, `U0RX`, `V-MCU` | P2 + resistive support around reset/boot |
| MCU↔SIM control | `NetR56_1`, `NetR57_1`, `NetQ4_1`, `NetQ5_1`, `RESET`, `PWR-KEY` | MCU drives transistors Q4/Q5 to pulse modem lines |
| MCU↔SIM UART/handshake | `NetQ1_3`, `NetQ2_3`, `NetC54_1`, `SIM-DTR`, `SIM-RX`, `SIM-TX` | Appears transistor-isolated; mapping to firmware GPIOs needs verification |
| SIM power | `V-SIM`, `V-SIM-62-63`, `USIM-VDD` | Rail conditioning through L3/L9, bulk caps C12/C13/C48-C53 |
| SIM card I/O | `USIM-DATA`, `USIM-RST`, `USIM-CLK`, `USIM-VDD` | Routed through J8 + ESD D11 + 51R series resistors |
| IMU | `I2C0-SCL`, `I2C0-SDA` | U10 on I2C, with pullups |
| Status GPIO | `STATUS`, `NET-LIGHT`, `USER-LED`, `USER-BUTTON-1`, `USER-BUTTON-2` | Useful for runtime state, modem state, and user interaction |

### Important reference designators
- **U6** ESP32-S3: firmware core.
- **U9** SIM7600E: LTE/GNSS modem.
- **U10** LIS3DSH: motion sensor.
- **U4** TP4056: battery charging.
- **U3** AP2112K-3.3TRG1: 3.3V rail for MCU.
- **U2** SX1308: boost rail generation.
- **P2** debug/programming header.
- **J2/J5/J6/J7** antenna connectors.
- **J8** micro SIM socket.
- **Q4/Q5** modem reset and power-key transistor drivers.
- **Q1/Q2/Q3** modem serial/control level-shift stage.
- **R22** series resistor on `U0TX`; **R33** pullup on `ESP-RESET`; **R18/R19** I2C pullups.

## Firmware impact
- If firmware assumes **LIS3DH**, update constants/docs to **LIS3DSH** or validate register compatibility before shipping.
- Debug/boot flow should use **P2** nets exactly: `ESP-RESET`, `BOOT-IO0`, `U0TX`, `U0RX`.
- Modem control likely needs **GPIO pulse logic** for `PWR-KEY` and `RESET` via Q4/Q5, not direct drive.
- SIM7600 UART/control appears **not direct-to-ESP32 pins**; confirm GPIO mapping in code against transistor network.
- `STATUS` and `NET-LIGHT` look like safe candidates for network/connection state handling and LED indication.
- Power-aware init should respect `V-SIM` rail sequencing and modem power-on timing.

## Thesis impact
- Update schematic labels and captions to match **actual part names and net names**.
- Use a figure for the **power tree** showing battery → charger/boost/buck → `+5V` / `V-MCU` / `+3.3V-MCU` / `V-SIM`.
- Add a modem interface figure highlighting **PWR-KEY, RESET, STATUS, NET-LIGHT, SIM UART, USIM lines**.
- Add an IMU figure with **U10 LIS3DSH** and I2C pullups.
- Verify all callouts for **P2 debug header** and **J8 SIM socket** pin labels.
- Annotate antenna connectors with the correct roles: **MAIN, AUX, GNSS**.

## Risks
- Firmware may still contain **LIS3DH assumptions** while hardware is **LIS3DSH**.
- UART pin mapping for SIM7600 may be documented incorrectly in code or thesis if inferred from function names only.
- `PWR-KEY`/`RESET` are transistor-driven; incorrect drive polarity/timing can break modem boot.
- `STATUS` and `NET-LIGHT` behavior may depend on modem firmware mode; do not hardcode semantics without confirmation.
- Antenna connector population is partly optional via 0R links; thesis figures should distinguish fitted vs. NP parts.

## Open questions
- Which ESP32-S3 GPIOs map to modem control/serial nets behind **Q1/Q2/Q3/Q4/Q5**?
- Is firmware currently configured for **LIS3DH** registers, or already compatible with **LIS3DSH**?
- Are `STATUS` and `NET-LIGHT` both read by firmware, or only used for LEDs/diagnostics?
- Does the thesis need a pin-by-pin legend for **P2** and **J8**, or only block-level captions?

### Unresolved questions
- Confirm exact ESP32-S3 GPIO ↔ SIM7600 signal mapping from schematic or firmware pin config.
- Confirm whether any register-level code must change for LIS3DSH-specific behavior.
- Confirm whether modem sleep/wake uses `SIM-DTR` / `SIM-RTS` in production firmware.