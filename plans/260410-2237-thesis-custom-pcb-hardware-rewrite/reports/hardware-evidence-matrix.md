# Hardware Evidence Matrix

| thesis-claim | current-text-location | hardware-proof | status |
|---|---|---|---|
| Thiết bị là PCB custom tích hợp, không ghép dev module rời | `99-bao-cao-thesis-hoan-chinh-latex.tex:L526-L537`, `L582-L595` | Altium project tồn tại: `iot-vehicle-tracking-system-main.PrjPcb`; netlist board-level export trust A | done |
| Thành phần lõi tích hợp trên PCB: ESP32-S3, SIM7600CE, LIS3DSH, DS3231M, W25Q128 | `...latex.tex:L526-L537` | Netlist: `U6 ESP32-S3 (L753)`, `U9 SIM7600CE (L832)`, `U10 LIS3DSH (L921)`, `U7 DS3231M (L812)`, `U8 W25Q128 (L822)` | done |
| Khối nguồn chính gồm MP2482, TPS54231, AP2112, SX1308, TP4056 | `...latex.tex:L526-L537`, `L6008-L6050`, `L6077-L6110`, `L6149-L6163` | Netlist: `U1 MP2482 (L707)`, `U5 TPS54231 (L743)`, `U3 AP2112 (L726)`, `U2 SX1308 (L718)`, `U4 TP4056 (L732)` | done |
| Claim Buck 3.3V trong Chương 3/4 và BOM đã đồng bộ AP2112-3.3 | `...latex.tex:L2906-L2907`, `L6038`, `L3154`, `L6331` | Netlist: `U3 AP2112K-3.3TRG1 (L726)`; không còn XL1509 trong thesis tex | done |
| Claim diode OR trong BOM/phụ lục dùng nhóm Schottky thực tế (SS54/SS34) | `...latex.tex:L3163`, `L6340`, `L12077` | Netlist có diode `D1 SS54 (L252)`, `D2 SS54 (L256)`, `D7 SS34 (L276)` | done |
| Claim LVD trong narrative/BOM dùng “khối LVD phần cứng” thay vì part-name cứng | `...latex.tex:L3024`, `L3813-L3818`, `L6179`, `L6747`, `L3161`, `L6338`, `L12079` | Netlist xác nhận net-level power/control, firmware dùng `LVD_STATUS`; không còn LM393 literal trong thesis tex | done |
| OBD2 vgate iCar Pro là ngoại vi BLE ngoài PCB | `...latex.tex:L533-L537`, `L588-L590` | Không có part vgate trong netlist; netlist chỉ có mạch chính + connector/sim/anten | done |
| GNSS đi cùng modem SIM7600CE-T trên cùng kênh UART firmware | `...latex.tex:L530-L533`, `L586-L587`, `L5794-L5801` | Netlist thể hiện `U9 SIM7600CE`; phần GNSS-ANT/MAIN-ANT/AUX-ANT nối modem (L891, L911, L914) | done |
| Thuật ngữ hardware dùng “khối phần cứng/khối chức năng” | `...latex.tex:L2328-L2331`, `L2672`, `L2801`, `L5671-L5677` | Sweep từ khóa đã xóa các cụm gây hiểu sai “module phần cứng/mô-đun hardware” | done |

## Notes
- Evidence trust-level theo `hardware-specs-index.md`: board/netlist trust A.
- Các cụm “module” còn giữ ở phần firmware/software là hợp lệ theo glossary.

## Unresolved questions
- Cần chốt có thay toàn bộ từ “module” ở các chương không thuộc hardware hay giữ nguyên ngữ cảnh software.