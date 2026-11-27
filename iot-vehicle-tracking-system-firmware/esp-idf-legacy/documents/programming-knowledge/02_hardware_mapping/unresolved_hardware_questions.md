# Unresolved Hardware Questions

## Open questions that still need physical confirmation

| Question | Why it matters | Current evidence | Confidence | Suggested test |
|---|---|---|---|---|
| Which exact MCU GPIO drives modem `RESET`? | Firmware currently treats reset as unmapped | Netlist shows `U9` pin 4 `RESET` and a discrete driver stage | Low | Continuity probe from modem reset pin back to ESP32 pad / testpoint |
| Which exact MCU GPIO drives modem `STATUS`? | Needed for modem power-state awareness | Netlist shows `U9` pin 49 `STATUS` | Low | Probe with modem powered on/off and observe GPIO state |
| Which exact MCU GPIO drives modem `NET-LIGHT`? | Useful for signal / registration indication | Netlist shows `U9` pin 51 `NET-LIGHT` | Low | Toggle modem registration state and watch the line |
| Is `SIM-DTR` connected to an active ESP32 GPIO or only buffered logic? | Impacts sleep / wake sequencing | Netlist shows `U9` pin 72 `SIM-DTR` via discrete components | Low | Trace transistor base to MCU pad and verify logic level behavior |
| Are modem `SIM-RX` / `SIM-TX` the firmware AT UART path, or is another UART routed through level shifters? | Required to confirm `PIN_MODEM_TX` / `PIN_MODEM_RX` | Netlist shows serial nets, firmware uses UART1 on GPIO16/17 | Medium | Capture boot AT traffic and compare with MCU UART pin activity |
| What is the intended polarity of `PWR-KEY` driver? | Wrong polarity would prevent modem boot | Netlist shows transistor stage and `PIN_MODEM_PWRKEY` in firmware | Medium | Scope the line during power-on pulse |
| Is `IGN_IN` directly tied to vehicle ignition or via conditioning circuitry? | Affects sleep / wake logic reliability | Firmware uses `PIN_IGN_IN` | Medium | Measure voltage and continuity from ignition source to MCU pad |
| Are `STATUS` and `NET-LIGHT` intentionally omitted from firmware, or just pending implementation? | Determines whether pin_map is stale | Firmware marks them `GPIO_NUM_NC` | Low | Check design intent against schematic notes / board bring-up log |
| Are SDMMC pins intended for production firmware use? | Matters for storage feature planning | Netlist clearly exposes `J4` SD socket | High that hardware exists, low for firmware intent | Validate software support requirement before adding code |
| Is the I2C bus shared exactly as shown in the netlist, with both IMU and DS3231 present on the same bus? | Affects bus-speed and pull-up assumptions | Netlist shows both on `I2C0-SDA/SCL` | High | Scan bus and confirm both addresses in hardware |

## Ambiguity notes

- The netlist is strong on connectivity, but weak on MCU-side pin naming for some modem signals.
- The firmware pin map is strong on intent, but currently incomplete for modem side-band signals.
- Do not promote any modem-control mapping above `Medium` confidence without a continuity or scope test.

## Recommended physical validation checklist

- [ ] Continuity check modem control lines against ESP32 pads
- [ ] UART loop / AT command sniff on modem boot
- [ ] Measure modem `PWR-KEY` pulse width and polarity
- [ ] Confirm deep-sleep wake on LIS3DSH interrupt
- [ ] Confirm `STATUS` and `NET-LIGHT` behavior under no-network / registered states
- [ ] Confirm SD socket pinout if storage support is planned

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

### Vendor / Official references to resolve open questions
- SIM7600CE hardware design + AT manuals in `documents/hardware-specs/components/modem/`
- ESP32-S3 datasheet/TRM in `documents/hardware-specs/components/mcu/`
- LIS3DSH datasheet in `documents/hardware-specs/components/imu/`
- DS3231M datasheet in `documents/hardware-specs/components/rtc/`
- ESP-IDF sleep and SDMMC docs for wake/pull-up edge cases: https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/sleep_modes.html
