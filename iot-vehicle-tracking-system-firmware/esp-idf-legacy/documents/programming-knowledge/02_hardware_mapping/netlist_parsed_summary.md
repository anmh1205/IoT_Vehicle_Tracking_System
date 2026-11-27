# Netlist Parsed Summary

## Scope
This note summarizes the hardware signals observable in `iot-vehicle-tracking-system-main-netlist.NET` and cross-checks them against the current firmware pin map in `main/inc/pin_map.h` and usage in `main/src/*`.

## Executive summary
The netlist is consistent with an ESP32-S3 based tracker board that integrates:

- SIM7600CE LTE/GNSS modem
- LIS3DSH/LIS3DSH-class motion sensor on I2C
- DS3231 RTC on the same I2C bus
- W25Q128 external SPI flash
- microSD socket on SDMMC-style signals
- discrete power-control circuitry for charger / mux / modem control

The strongest matches between netlist and firmware are:

- I2C0 pins for the IMU and RTC
- LIS3DSH interrupt wake line
- modem power-key control
- modem serial transport concept
- SD card and flash bus topology

The main uncertainty is that the netlist shows modem-side functional signals, but it does not expose the MCU-side GPIO numbers for every modem control line. That means some `pin_map.h` entries are provable at the signal level, but not at the exact GPIO-number level.

## High-level extraction

### UART
- **ESP32 console/programming UART0**: visible on connector `P2` via `U0TX` / `U0RX`.
- **Modem AT UART path**: firmware uses `UART_NUM_1` with `PIN_MODEM_TX` / `PIN_MODEM_RX`; the netlist shows SIM7600 serial pins `SIM-TX` / `SIM-RX` with transistor/level-shift support, which is consistent at function level.

### I2C
- `I2C0-SDA` / `I2C0-SCL` connect to:
  - `U10` LIS3DSH / LIS3DSH-derived IMU
  - `U7` DS3231M RTC
- Pull-ups are present (`R18`, `R19`).

### SPI
- `FL-*` signals connect `U6` ESP32-S3 to `U8` W25Q128 external flash.
- This is a direct flash bus, not an application-level peripheral exposed in firmware pin map.

### SDMMC
- `SD-DAT0..3`, `SD-CLK`, `SD-CMD`, `SD-CD` connect `U6` to `J4` microSD connector.
- Pull-ups are present on the data/control lines (`R26`-`R32`).

### GPIO / control
- `IGN_IN`, `CHARGER_EN`, `POWER_MUX_SEL`, `LVD_STATUS`, `USER-LED`, `USER-BUTTON-1`, `USER-BUTTON-2`, `ESP-RESET` are board-level GPIO/control nets.
- Modem-related control nets present in netlist: `PWR-KEY`, `RESET`, `SIM-DTR`, `STATUS`, `NET-LIGHT`.

### Interrupts
- `LIS3DSH_INT` is wired to the IMU interrupt output and used as a wake source in firmware.

## Best-confidence matches

| Area | Netlist evidence | Firmware evidence | Confidence |
|---|---|---|---|
| IMU I2C bus | `U6` pins 6/7 to `I2C0-SCL` / `I2C0-SDA`, `U10` I2C pins 4/6 | `PIN_LIS3DSH_SCL`, `PIN_LIS3DSH_SDA`, `imu_init()` | High |
| IMU interrupt | `U10` interrupt net to `PIN_LIS3DSH_INT` path, `esp_sleep_enable_ext0_wakeup()` | `PIN_LIS3DSH_INT`, motion wake logic | High |
| RTC on I2C | `U7` DS3231M on same I2C bus | I2C shared bus in codebase | High |
| SDMMC socket | `U6` SD signals to `J4` | No direct pin map entries; board feature only | High |
| External flash | `U6` `FL-*` pins to `U8` W25Q128 | No direct pin map entries; board feature only | High |
| Modem PWR-KEY | `U9` pin 3 `PWR-KEY`, discrete driver stage | `PIN_MODEM_PWRKEY`, `modem_power_on/off()` | High |

## Medium-confidence matches

| Area | Netlist evidence | Firmware evidence | Confidence |
|---|---|---|---|
| Modem AT serial | `U9` `SIM-TX` / `SIM-RX` through discrete transistor network | `MODEM_UART_NUM`, `PIN_MODEM_TX`, `PIN_MODEM_RX` | Medium |
| Modem RESET | `U9` pin 4 `RESET` exists and is routed through driver stage | `PIN_MODEM_RESET` currently `GPIO_NUM_NC` | Medium for hardware presence, low for firmware mapping |
| Modem STATUS | `U9` pin 49 `STATUS` exists | `PIN_MODEM_STATUS` currently `GPIO_NUM_NC` | Medium for hardware presence, low for firmware mapping |
| Modem NET-LIGHT | `U9` pin 51 `NET-LIGHT` exists | `PIN_MODEM_NETLIGHT` currently `GPIO_NUM_NC` | Medium for hardware presence, low for firmware mapping |
| Power control | charger/mux/power circuitry clearly exists around `U1/U2/U3/U4/U5` | `power_mgr.c` uses `PIN_CHARGER_EN`, `PIN_POWER_MUX_SEL`, `PIN_LVD_STATUS` | Medium |

## Primary mismatch notes

1. The firmware explicitly leaves modem `RESET`, `STATUS`, `NETLIGHT`, and `DTR` as `GPIO_NUM_NC`, but the netlist shows those modem pins as physically present on the SIM7600 side.
2. The netlist does not reveal the MCU GPIO number behind every modem control net, so exact pin-number confirmation needs bench validation or schematic symbol tracing.
3. The firmware and netlist align on I2C and sensor wakeup, so the main uncertainty is modem-side control mapping, not sensor mapping.

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
- SIM7600CE hardware design: `documents/hardware-specs/components/modem/sim7600ce-hardware-design-v1.04.pdf` + SIMCom portal: https://www.simcom.com/technical_files.html
- SIM7600 AT command manual: `documents/hardware-specs/components/modem/sim7600-series-at-command-manual-v2.00.pdf`
- LIS3DSH datasheet: `documents/hardware-specs/components/imu/lis3dsh-datasheet.pdf` (ST link: https://www.st.com/resource/en/datasheet/lis3dsh.pdf)
- ESP32-S3 datasheet/TRM: `documents/hardware-specs/components/mcu/esp32-s3-datasheet-en.pdf`, `documents/hardware-specs/components/mcu/esp32-s3-technical-reference-manual-en.pdf`
- ESP-IDF peripheral docs (UART/I2C/SDMMC): https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/
