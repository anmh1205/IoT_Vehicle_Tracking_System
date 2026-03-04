# Thesis Comparison Specs: OBD2 BLE and Power Path

- Conducted: 2026-03-02 23:03 ICT
- Scope: authoritative specs + safe thesis wording for comparison tables
- Preference order: official vendor page/datasheet first; mirrors/resellers only when vendor source not found

## OBD2 BLE

### Vgate iCar Pro (Bluetooth 4.0 BLE)

| Spec row | Value | Source URL | Source type | Confidence | Notes / safe wording |
|---|---|---|---|---|---|
| BLE version | Bluetooth 4.0 (BLE) | https://vgatemall.com/products-detail/i-9/ | Official vendor product page | High | Safe wording: "Vgate iCar Pro BLE variant is marketed as Bluetooth 4.0 (BLE)." |
| Standby current | Not found on official product page reviewed | https://vgatemall.com/products-detail/i-9/ | Official vendor product page | Low | Do not claim mA value unless another official manual/datasheet is found. Safe wording: "Vendor page reviewed does not publish standby current." |
| Active current | Not found on official product page reviewed | https://vgatemall.com/products-detail/i-9/ | Official vendor product page | Low | Do not claim mA value. Safe wording: "Vendor page reviewed does not publish operating current." |
| Auto sleep | Sleeps about 30 minutes after engine stop | https://vgatemall.com/products-detail/i-9/ | Official vendor product page | High | Page states device "goes to sleep" after engine stopped for 30 minutes. |
| Auto wake / reconnect context | Vendor says it "automatically start[s]" when car is ignited | https://vgatemall.com/products-detail/i-9/ | Official vendor product page | Medium | Safe wording: "Vendor advertises automatic wake on ignition." Avoid stronger reconnect claims unless app-level test or manual confirms. |
| Limitation on wake behavior | For some pure EV/hybrid cases, forum admin says auto wake after sleep may not work; re-plug may be needed | https://forum.vgatemall.com/showthread.php?pid=7008&tid=5 | Official vendor forum/support post | Medium | Good thesis note if discussing edge cases. Safe wording: "Vendor support notes wake behavior may depend on vehicle power characteristics." |
| iOS BLE connection behavior | Connect in app, not via iOS Bluetooth Settings | https://forum.vgatemall.com/showthread.php?pid=10389&tid=9218 | Official vendor forum/support post | Medium | Useful only if thesis compares UX/connection flow. |
| Protocol support | SAE J1850 PWM; SAE J1850 VPW; ISO9141-2; ISO14230-4 KWP (5-baud/fast init); ISO15765-4 CAN (11/29-bit, 250/500 kbps); SAE J1939 CAN; USER1 CAN; USER2 CAN | https://vgatemall.com/products-detail/i-9/ | Official vendor product page | High | Safe wording: "Vendor lists broad OBD-II protocol support including legacy J1850, ISO9141/KWP, and CAN-based modes." |

### OBD2 BLE delta notes

- Strongly supported by official source: BLE version, sleep behavior, protocol list.
- Weak/unclear from official source: active current, standby current, exact reconnect semantics.
- Thesis-safe summary:
  - "The reviewed Vgate iCar Pro BLE product page confirms Bluetooth 4.0 BLE connectivity, automatic sleep after about 30 minutes, ignition-based wake/start behavior, and support for major OBD-II protocol families. However, the vendor page reviewed does not publish standby or operating current values, so power-consumption comparison should mark these as not publicly specified."

## Power Path

### Comparison rows

| Component | Key spec row | Value | Source URL | Source type | Confidence | Notes / safe wording |
|---|---|---|---|---|---|---|
| TPS2115A | Input voltage range | 2.8 V to 5.5 V | https://www.ti.com/product/TPS2115A | Official manufacturer product page | High | Direct TI catalog spec. |
| TPS2115A | Max current | Up to 2 A depending on package; catalog also surfaces 1.25 A per path figures | https://www.ti.com/product/TPS2115A | Official manufacturer product page | Medium | Be careful. Safe wording: "TPS2115A supports roughly 1.25-2 A class power multiplexing depending on package/conditions." If table needs one number, cite exactly as TI page states: "up to 2 A, depending on package." |
| TPS2115A | Switchover behavior | Manual and automatic switching modes | https://www.ti.com/product/TPS2115A | Official manufacturer product page | High | Good wording: "integrated power mux with automatic/manual source selection." |
| TPS2115A | RON / drop indicator | 84 mΩ typ per input path (IN1, IN2) | https://www.ti.com/product/TPS2115A | Official manufacturer product page | High | Use as low-loss indicator versus relay. |
| TPS2115A | Voltage-drop related behavior | Controlled output-voltage transition limits inrush current; includes power-good signal | https://www.ti.com/product/TPS2115A | Official manufacturer product page | Medium | Safe wording: "low RON and controlled switchover help reduce drop/transients relative to relay approaches." |
| Songle SRD-05VDC-SL-C relay basis | Coil power | About 0.36 W | https://www.alldatasheet.com/html-pdf/1132639/SONGLERELAY/SRD-05VDC-SL-C/1713/2/SRD-05VDC-SL-C.html | Datasheet mirror | Medium | Mirror, not original manufacturer host. |
| Songle SRD-05VDC-SL-C relay basis | Coil current | About 72 mA at 5 V (derived from 0.36 W / 5 V) | https://www.alldatasheet.com/html-pdf/1132639/SONGLERELAY/SRD-05VDC-SL-C/1713/2/SRD-05VDC-SL-C.html | Datasheet mirror + simple derivation | Medium | Mark as derived, not directly stated in cited snippet. |
| Songle SRD-05VDC-SL-C relay basis | Contact rating | 10 A at 250 VAC / 30 VDC | https://www.alldatasheet.com/html-pdf/1132639/SONGLERELAY/SRD-05VDC-SL-C/1713/2/SRD-05VDC-SL-C.html | Datasheet mirror | Medium | Commonly repeated rating. |
| Songle SRD-05VDC-SL-C relay basis | Switching nature | Electromechanical contact switching; galvanic isolation between coil and contacts | https://hobbycomponents.com/relays/1117-srd-05vdc-sl-c-5v-10a-dip-5pin-songle-relay | Reseller/product page | Medium-Low | Use only as descriptive context, not precision electrical spec. Safe wording: "relay-based power path is electromechanical and physically switches contacts." |
| Representative P-MOSFET: IRLML6402 | Drain-source voltage | -20 V | https://www.infineon.com/part/IRLML6402 | Official manufacturer product page | High | Representative discrete P-channel device. |
| Representative P-MOSFET: IRLML6402 | Continuous drain current | -3.7 A at 25°C | https://www.infineon.com/part/IRLML6402 | Official manufacturer product page | High | Enough for a representative table row. |
| Representative P-MOSFET: IRLML6402 | RDS(on) | 65 mΩ max at VGS = -4.5 V | https://www.infineon.com/part/IRLML6402 | Official manufacturer product page | High | Good concrete comparison against integrated mux / relay. |
| Representative P-MOSFET: IRLML6402 | Availability caveat | Product page currently marks device EOL | https://www.infineon.com/part/IRLML6402 | Official manufacturer product page | High | Safe wording: "representative P-MOSFET electrical example only; exact BOM part can vary." |

### Power-path delta notes

- TPS2115A: purpose-built power multiplexer; low RON; automatic/manual handover; better suited when seamless source selection and lower voltage drop matter.
- Relay module basis: electromechanical, higher coil power overhead, physical switching delay/contact wear, but simple and easy to understand.
- Discrete P-MOSFET row: useful only as a representative semiconductor switch reference; avoids vague claims like "MOSFETs are always lower loss" without at least one cited device.

### Thesis-safe wording

- TPS2115A: "Compared with relay-based source switching, TPS2115A provides integrated automatic/manual power-path selection with about 84 mΩ typical on-resistance per path, reducing switching loss and avoiding continuous relay-coil drive."
- Relay module basis: "A typical 5 V Songle-class relay uses about 0.36 W coil power (about 72 mA at 5 V, derived), offers high contact ratings such as 10 A at 250 VAC / 30 VDC, but remains an electromechanical switch with non-zero actuation delay and contact wear."
- Representative P-MOSFET: "A representative small P-channel MOSFET such as IRLML6402 shows that discrete semiconductor switching can achieve tens-of-milliohms on-resistance, though real design suitability depends on gate-drive method, reverse-current handling, and exact BOM selection."

## Unresolved questions

1. Vgate iCar Pro BLE official standby/active current values were not found in the reviewed official sources.
2. If thesis requires a single hard current number for TPS2115A, use exact TI wording from the chosen datasheet/table; current capability is package/condition sensitive.
3. Songle relay source is a datasheet mirror, not the manufacturer host. If thesis requires stricter citation quality, replace with original PDF if later found.
