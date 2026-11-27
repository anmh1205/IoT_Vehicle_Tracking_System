# Hardware / Firmware Cross-check

## Goal
Check whether the board netlist and firmware pin map tell the same story. This document focuses on mismatches and what still needs physical validation.

## Cross-check matrix

| Area | Netlist says | Firmware says | Verdict | Confidence | Action |
|---|---|---|---|---|---|
| ESP32-S3 I2C sensor bus | `U6` pins 6/7 feed `I2C0-SCL` / `I2C0-SDA`; `U10` IMU and `U7` RTC share the bus | `PIN_LIS3DSH_SCL`, `PIN_LIS3DSH_SDA`; `imu_init()` uses I2C0 | Match | High | No change needed unless bus speed or address changes. |
| Motion interrupt wake | IMU interrupt routed to `PIN_LIS3DSH_INT` | `imu_configure_motion_interrupt()` and `esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1)` | Match | High | Validate interrupt polarity on the bench once. |
| External flash | `U8` W25Q128 on `FL-*` lines | No application-level pin map, expected for ESP32-S3 flash bus | Match | High | No action. |
| microSD | `J4` wired to `SDMMC` signals | No application-level pin map | Match | High | No action unless SD card support is added in firmware. |
| Modem AT serial | `U9` serial pins exist (`SIM-TX`, `SIM-RX`) and are level shifted / transistor buffered | `MODEM_UART_NUM = UART_NUM_1`, `PIN_MODEM_TX GPIO16`, `PIN_MODEM_RX GPIO17` | Partial match | Medium | Verify the MCU-side GPIO numbers against PCB or bench probing. |
| Modem power-key | `U9` pin 3 `PWR-KEY` is driven by discrete stage | `PIN_MODEM_PWRKEY GPIO_NUM_26`, `modem_power_on/off()` pulses it | Match at function level | High | Confirm pulse width and active polarity on hardware. |
| Modem reset | `U9` pin 4 `RESET` exists on the board | `PIN_MODEM_RESET GPIO_NUM_NC` | Mismatch / incomplete firmware mapping | High hardware / Low firmware | If reset is intended, expose the GPIO in `pin_map.h` and verify polarity. |
| Modem status | `U9` pin 49 `STATUS` exists on the board | `PIN_MODEM_STATUS GPIO_NUM_NC` | Mismatch / incomplete firmware mapping | High hardware / Low firmware | Add firmware support only after confirming intended semantics. |
| Modem netlight | `U9` pin 51 `NET-LIGHT` exists on the board | `PIN_MODEM_NETLIGHT GPIO_NUM_NC` | Mismatch / incomplete firmware mapping | High hardware / Low firmware | Good candidate for diagnostics, but must be validated before use. |
| Modem DTR | `U9` pin 72 `SIM-DTR` appears in the netlist | `PIN_MODEM_DTR GPIO_NUM_NC` | Mismatch / incomplete firmware mapping | Medium hardware / Low firmware | Validate whether the discrete stage is really tied to an ESP32 GPIO. |
| Power mux / charger control | Board has power subsystem with charger LEDs and switching elements | `PIN_POWER_MUX_SEL`, `PIN_CHARGER_EN`, `PIN_LVD_STATUS` are actively used in `power_mgr.c` | Match at subsystem level | Medium | Probe actual GPIO routing during hardware bring-up. |
| Ignition input | Net named `IGN_IN` exists in firmware path | `PIN_IGN_IN GPIO_NUM_2`, sampled in power manager | Likely match | Medium | Confirm with continuity test from ignition source to MCU pad. |

## Key mismatch findings

### 1) Modem control pins are only partially committed in firmware
The netlist shows hardware for:
- `RESET`
- `STATUS`
- `NET-LIGHT`
- `SIM-DTR`

But the firmware marks all of them as `GPIO_NUM_NC` except `PWR-KEY`.

Implication:
- The board likely has a richer modem-control path than the current firmware pin map.
- The firmware may be intentionally conservative, or the pin map may be stale / board-variant-specific.

### 2) Exact MCU GPIO assignment is not fully recoverable from the netlist text alone
The netlist captures connectivity and component topology, but not always the human-readable MCU GPIO number that backs each modem control line.

Implication:
- Do not promote any modem-side GPIO claim to “confirmed” without bench probing or schematic symbol tracing.
- Keep modem control entries labeled `Medium` or `Low` confidence until validated.

### 3) Sensor-side mapping is clean
The sensor bus and wake interrupt are the most solid parts of the mapping.

Implication:
- If hardware bring-up has issues, look first at modem routing and power control, not at the IMU I2C bus.

## Suggested validation order

1. Continuity test `PWR-KEY`, `RESET`, `STATUS`, `NET-LIGHT`, `SIM-DTR` from modem to MCU pads.
2. Probe modem power-key polarity and pulse width.
3. Confirm modem UART wiring with serial traffic on boot.
4. Verify IMU interrupt wakes the ESP32 from deep sleep.
5. Confirm I2C addresses for IMU and RTC on the live board.

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
- SIM7600CE startup/pin polarity: `documents/hardware-specs/components/modem/sim7600ce-hardware-design-v1.04.pdf` + SIM7600 series hardware design PDF in `documents/hardware-specs/components/modem/`
- ESP32-S3 UART/SDMMC/pin matrix references: `documents/hardware-specs/components/mcu/esp32-s3-datasheet-en.pdf`, TRM, plus ESP-IDF UART/SDMMC docs
- LIS3DSH interrupt/wake behavior: `documents/hardware-specs/components/imu/lis3dsh-datasheet.pdf`
- DS3231M bus-sharing constraints on I2C0: `documents/hardware-specs/components/rtc/ds3231m-datasheet.pdf`
