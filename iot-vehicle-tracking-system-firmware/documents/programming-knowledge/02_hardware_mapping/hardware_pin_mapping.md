# Hardware Pin Mapping

## Purpose
This file records the best supported mapping between the board netlist and the current firmware pin map. Each row includes confidence so ambiguous areas stay visible.

## Mapping table

| Subsystem | Netlist signal / component evidence | Firmware symbol / usage | Status | Confidence | Notes |
|---|---|---|---|---|---|
| UART0 console / programming | `U6` pins 49/50 -> `U0TX` / `U0RX`, routed through `R22`, `R23`, `R24` and connector `P2` | No explicit symbol in `pin_map.h`; used as standard ESP32-S3 console/programming path | Aligned at board level | High | This is the on-board debug/programming UART, not the modem AT UART. |
| Modem UART | `U9` pins 68/71 -> `SIM-RX` / `SIM-TX`, with discrete interface stage around `Q2`, `Q3`, `R45`-`R49` | `MODEM_UART_NUM`, `PIN_MODEM_TX`, `PIN_MODEM_RX` | Partially aligned | Medium | Netlist confirms modem serial path exists; exact MCU GPIO number behind the path is not explicit in the netlist. |
| I2C bus | `U6` pins 6/7 -> `I2C0-SCL` / `I2C0-SDA`; shared by `U10` and `U7`; pull-ups `R18`, `R19` | `PIN_LIS3DSH_SCL`, `PIN_LIS3DSH_SDA` | Aligned | High | Same bus serves IMU and RTC. |
| IMU interrupt | `U10` motion interrupt net to `PIN_LIS3DSH_INT`; wake source in power-down path | `PIN_LIS3DSH_INT`, `esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1)` | Aligned | High | Strong evidence for motion wake use. |
| SPI flash | `U6` pins 30-35 -> `FL-HD`, `FL-WP`, `FL-CS`, `FL-CLK`, `FL-DO`, `FL-DI` to `U8` W25Q128 | Not exposed in `pin_map.h` | Aligned at board level | High | Internal flash bus for ESP32-S3 / external flash package. |
| SDMMC | `U6` pins 12-18 -> `SD-DAT2`, `SD-DAT3`, `SD-CMD`, `SD-CLK`, `SD-DAT0`, `SD-DAT1`, `SD-CD` to `J4` | Not exposed in `pin_map.h` | Aligned at board level | High | Netlist shows a full microSD interface. |
| Ignition input | `PIN_IGN_IN` named net in firmware; pulled to MCU input in `power_mgr_init()` | `PIN_IGN_IN GPIO_NUM_2` | Aligned | Medium | Netlist evidence for exact external source is limited in the provided capture. |
| Charger enable | Power-management circuitry around `U4`, `U5`, `U3` and `CHRG/STDBY` indicators | `PIN_CHARGER_EN GPIO_NUM_5` | Aligned at function level | Medium | Board power path is present, but exact charger-enable transistor path is not fully resolved from the captured netlist text alone. |
| Power mux select | Power-domain path around `U1`, `U2`, `U3`, `U5` | `PIN_POWER_MUX_SEL GPIO_NUM_18` | Aligned at function level | Medium | Netlist names support a muxed power architecture, but exact GPIO route is not fully explicit. |
| Low-voltage status | External detector net `LVD_STATUS` in firmware, sampled in `power_mgr.c` | `PIN_LVD_STATUS GPIO_NUM_19` | Aligned at function level | Medium | Netlist capture does not expose the full detector circuit in a single obvious label. |
| Modem PWR-KEY | `U9` pin 3 `PWR-KEY`; driven by transistor stage `Q5` and bias resistors | `PIN_MODEM_PWRKEY GPIO_NUM_26` | Aligned | High | This is the clearest modem-control match in the capture. |
| Modem RESET | `U9` pin 4 `RESET`; transistor stage `Q4` and bias resistors exist | `PIN_MODEM_RESET GPIO_NUM_NC` | Hardware present, firmware not mapped | High hardware / Low firmware | Firmware currently treats reset as unavailable even though the board appears to route it. |
| Modem STATUS | `U9` pin 49 `STATUS` | `PIN_MODEM_STATUS GPIO_NUM_NC` | Hardware present, firmware not mapped | High hardware / Low firmware | Candidate for future firmware integration or board variant correction. |
| Modem NET-LIGHT | `U9` pin 51 `NET-LIGHT` | `PIN_MODEM_NETLIGHT GPIO_NUM_NC` | Hardware present, firmware not mapped | High hardware / Low firmware | Candidate for link/activity indication. |
| Modem DTR | `U9` pin 72 `SIM-DTR`; discrete stage around `Q1` / `R45` / `R47` | `PIN_MODEM_DTR GPIO_NUM_NC` | Hardware present, firmware not mapped | Medium hardware / Low firmware | Useful for low-power sleep handshake if board route is verified. |

## Functional mapping by category

### UART
- **Board console UART0**: `U0TX` / `U0RX` via `P2`
- **Modem AT UART**: modem serial path to `SIM-TX` / `SIM-RX`

### I2C
- `I2C0-SCL`, `I2C0-SDA`
- Shared by IMU and RTC

### SPI
- `FL-CS`, `FL-CLK`, `FL-DO`, `FL-DI`, `FL-WP`, `FL-HD`

### SDMMC
- `SD-DAT0..3`, `SD-CLK`, `SD-CMD`, `SD-CD`

### GPIO / control
- `IGN_IN`, `CHARGER_EN`, `POWER_MUX_SEL`, `LVD_STATUS`, `USER-LED`, `USER-BUTTON-1`, `USER-BUTTON-2`, `ESP-RESET`

### INT
- `LIS3DSH_INT` for motion wake

### RESET / POWER_EN / STATUS / NETLIGHT
- Modem `RESET` and `PWR-KEY` are visible on the modem side
- `STATUS` and `NET-LIGHT` are visible on the modem side
- Firmware currently only hard-maps `PWR-KEY`; the others remain `GPIO_NUM_NC`

## Mismatch summary

- **Strong mismatch**: firmware says modem `RESET`, `STATUS`, `NETLIGHT`, `DTR` are not mapped; the netlist shows those modem pins routed on the board.
- **Not a mismatch**: SDMMC and flash appear in the netlist but are not required in `pin_map.h` because they are board-internal buses.
- **Needs bench validation**: exact MCU GPIO assignment for modem-side control nets.

## Sources

### Project Evidence
- `main/inc/pin_map.h`
- `main/src/power_mgr.c`
- `main/src/modem_lte.c`
- `main/src/state_machine.c`
- `main/src/imu_lis3dsh.c`
- `main/src/modem_at.c`

### Netlist Inference
- `iot-vehicle-tracking-system-main-netlist.NET`

### Vendor / Official references
- SIM7600CE pin behavior (`PWR-KEY`, `RESET`, `STATUS`, `NET-LIGHT`, `SIM-DTR`): `documents/hardware-specs/components/modem/sim7600ce-hardware-design-v1.04.pdf`
- ESP32-S3 package/pin assignment: `documents/hardware-specs/components/mcu/esp32-s3-datasheet-en.pdf`, TRM: `documents/hardware-specs/components/mcu/esp32-s3-technical-reference-manual-en.pdf`
- LIS3DSH interrupt + I2C notes: `documents/hardware-specs/components/imu/lis3dsh-datasheet.pdf`
- DS3231M I2C electrical limits: `documents/hardware-specs/components/rtc/ds3231m-datasheet.pdf`
- ESP-IDF SD pull-up/SDMMC docs: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/sd_pullup_requirements.html
