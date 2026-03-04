# Research Report: Thesis hardware comparison specs

**Date:** 2026-03-02 23:03 ICT
**Scope:** Official-vendor specs for MCU and LTE/GNSS comparison tables used in Vietnamese thesis.
**Priority:** Espressif, ST, Nordic, SIMCom, Quectel, u-blox.

## MCU

### ESP32-S3
- BLE: Bluetooth 5 LE. Source: official datasheet/product docs. Confidence: High.
- UART: 3 UART controllers. Source: official datasheet / ESP-IDF chip comparison. Confidence: High.
- CPU: dual-core Xtensa LX7, up to 240 MHz. Source: official datasheet. Confidence: High.
- RAM/Flash: 512 KB SRAM on-chip; external flash supported, not fixed on bare SoC. Source: official datasheet / chip comparison. Confidence: High.
- Low power: deep-sleep typ. about 7-8 µA depending RTC config. Source: official datasheet. Confidence: Medium-High.
- Toolchain note: ESP-IDF official SDK/ecosystem. Source-backed by Espressif docs. Confidence: High.

Sources:
- https://www.espressif.com/en/support/documents/technical-documents/datasheets/ESP32-S3-Datasheet.pdf
- https://documentation.espressif.com/esp32-s3_datasheet_en.html
- https://docs.espressif.com/projects/esp-idf/en/release-v5.0/esp32/hw-reference/chip-series-comparison.html

### STM32L4 (STM32L476 family)
- BLE: no integrated BLE in MCU itself. External radio needed. Source: official product page/datasheet feature list. Confidence: High.
- UART: ST lists 3 USART + 2 UART + 1 LPUART; same page also phrases it as 5 USART + 1 LPUART. Functional takeaway: 6 serial instances total. Confidence: Medium due wording conflict.
- CPU: Arm Cortex-M4 up to 80 MHz. Confidence: High.
- RAM/Flash: up to 128 KB SRAM; up to 1 MB Flash in family. STM32L476RE specifically 512 KB Flash. Confidence: High.
- Low power: 30 nA shutdown, 120 nA standby, 420 nA standby with RTC, 1.1 µA Stop 2, 1.4 µA Stop 2 with RTC. Confidence: High.
- Toolchain note: STM32Cube ecosystem officially supported. Confidence: High.

Sources:
- https://www.st.com/en/microcontrollers-microprocessors/stm32l476re.html
- https://www.st.com/resource/en/datasheet/stm32l476re.pdf

### nRF52840
- BLE: Bluetooth 5 / Bluetooth LE, plus multiprotocol 2.4 GHz support. Confidence: High.
- UART: UART/UARTE supported; common summary is 2 UART/UARTE instances. Confidence: Medium-High.
- CPU: 64 MHz Arm Cortex-M4F. Confidence: High.
- RAM/Flash: 256 KB RAM, 1 MB Flash. Confidence: High.
- Low power: System OFF typically below 1 µA per Nordic guidance; exact current depends RAM retention/GPIO leakage. Confidence: Medium.
- Toolchain note: Nordic SDK / nRF Connect SDK ecosystem official. Confidence: High.

Sources:
- https://docs.nordicsemi.com/bundle/nRF52-Series-PS/resource/nRF52840_PS_v1.2.pdf
- https://docs.nordicsemi.com/category/nrf52840-category
- https://www.nordicsemi.com/Products/nRF52840/Modules

## LTE/GNSS

### A7670C
- LTE category: Cat 1, 10 Mbps DL / 5 Mbps UL. Confidence: High.
- GNSS integrated: No on A7670C SKU. Confidence: Medium-High because some family docs/manual mirrors blur A7670 variants.
- UART: at least main UART exposed; family docs indicate 2 UART-class interfaces used in practice. Confidence: Medium.
- Supply voltage: 3.4-4.2 V, typ. 3.8 V. Confidence: High.
- Protocol support: UART, USB, I2C/GPIO depending family docs; MQTT/HTTP/SSL AT support exists in family AT manuals, but thesis table should avoid over-claiming unless tied to exact A7670C manual. Confidence: Medium.
- Low-power: PSM support, eDRX support. Current figures vary by document/condition; use only if exact official A7670C PDF is available. Confidence: Medium.

Sources:
- https://cn.simcom.com/product/A7670X.html (official product page)
- https://www.simcom.com/product/A7670C.html (official product page cited in prior report)
- https://cdn.simcom.com/documents/A7670_Series_Hardware_Design_V1.04.pdf (official hardware design, cited in prior report)

### EC200U-CN
- LTE category: Cat 1, 10 Mbps DL / 5 Mbps UL. Confidence: High.
- GNSS integrated: optional GNSS depending variant/configuration, not guaranteed baseline. Confidence: High.
- UART: 3 x UART. Confidence: High.
- Supply voltage: 3.3-4.3 V, typ. 3.8 V. Confidence: High.
- Protocol/interfaces officially listed: USB 2.0, SPI, I2C, SD card, ADC; GNSS optional with GPS/BDS/Galileo/GLONASS/QZSS. Confidence: High.
- UART I/O domain: 1.8 V logic per hardware design guide. Confidence: High.

Sources:
- https://www.quectel.com/product/lte-ec200u-series
- https://developer.quectel.com/en/wp-content/uploads/sites/2/2024/11/Quectel_EC200U_Series_LTE_Standard_Specification_V1.4.pdf
- https://developer.quectel.com/en/wp-content/uploads/sites/2/2024/11/Quectel_EC200U_Series_QuecOpen_Hardware_Design_V1.0.pdf

### SIM7600CE-T
- LTE category: Cat 1 in thesis context should be verified from exact official SIM7600CE-T page/manual before final table lock.
- GNSS integrated: yes on SIM7600 family variants with GNSS; exact CE-T SKU should be verified from official SIMCom page/manual used in thesis.
- UART / voltage / protocol support: need exact official SIM7600CE-T hardware design or product page for row-level citation.
- Recommendation: use existing thesis vendor PDF already referenced in project docs, not generic SIM7600 family mirrors.

Candidate source already referenced in repo:
- https://simcom.com/product/A7600CE-T.html

### NEO-M8N
- LTE category: N/A. GNSS receiver only. Confidence: High.
- GNSS integrated: yes, dedicated GNSS receiver. Supports GPS, GLONASS, Galileo, BeiDou, QZSS, SBAS; up to 3 concurrent GNSS. Confidence: High.
- UART: 1 UART; also USB, SPI, DDC/I2C available. Confidence: High.
- Supply voltage: NEO-M8N 2.7-3.6 V on common datasheet summary; broader NEO-M8 family VCC may appear lower in family docs, so use exact NEO-M8N row. Confidence: Medium-High.
- Protocol support: NMEA and UBX official. Confidence: High.
- Start time: cold start 26 s, hot start 1 s; depends constellation and conditions. Confidence: High.

Sources:
- https://www.u-blox.com/en/product/neo-m8-series
- https://www.u-blox.com/sites/default/files/NEO-M8-FW3_DataSheet_UBX-15031086.pdf

## Conflicts to flag
1. **STM32L476 UART count wording conflict**: ST page says both "3 USART + 2 UART + 1 LPUART" and "5 USART + 1 LPUART". Likely naming inconsistency, not hardware difference.
2. **A7670C GNSS ambiguity**: family-level A7670 docs and mirrors may mention optional GNSS or GNSS antenna interface. Exact A7670C SKU product positioning says LTE-only. Thesis should mark A7670C as **no integrated GNSS**, with note that some A7670 family variants do include GNSS.
3. **nRF52840 sleep current**: product/spec guidance vs forum guidance differ because GPIO leakage and RAM retention change measured current. Use official typical System OFF number from product spec if extracting final numeric row.
4. **NEO-M8N supply voltage**: family docs may show broader family range; exact NEO-M8N row should be used for final thesis table.

## Unresolved questions
1. Need exact official SIM7600CE-T datasheet/manual URL for final row-level citations.
2. Need exact official A7670C hardware design/manual URL confirmation if thesis table wants UART count and sleep current as hard numbers.
3. If thesis compares a generic "STM32L4" instead of STM32L476, row values must be normalized to one exact SKU or marked "family max".
