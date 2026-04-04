# Vendor-primary firmware programming research

Ngày nghiên cứu: 2026-04-04  
Phạm vi: chỉ nguồn vendor-primary / official docs; dùng codebase chỉ để đối chiếu cuối.

## Mục lục
- [Tóm tắt](#tóm-tắt)
- [Phương pháp](#phương-pháp)
- [Bảng kiến thức theo linh kiện](#bảng-kiến-thức-theo-linh-kiện)
- [Vendor-critical rules](#vendor-critical-rules)
- [Nguồn chính thức](#nguồn-chính-thức)
- [Unresolved questions](#unresolved-questions)

## Tóm tắt
Khung firmware của hệ này nên bám vào 5 nhóm tài liệu chính: ESP32-S3 datasheet/TRM/hardware design, SIM7600 hardware design + AT manual + sleep note, ST datasheet/app note cho LIS3DH/LIS3DSH, Winbond W25Q128JV datasheet, và ADI DS3231M datasheet. Điểm thực tiễn quan trọng nhất là reset/boot strap của ESP32-S3, UART 1.8V + PWRKEY/RESET timing + VBAT burst của SIM7600, và ngữ nghĩa interrupt/wake của IMU.

Kết luận ngắn: phần lớn claim quan trọng có thể đạt confidence A vì có tài liệu vendor trực tiếp. Rủi ro còn lại chủ yếu ở chỗ model thực tế và phiên bản AT command có thể lệch giữa SIM7600 variant, đặc biệt quanh GNSS command và power-state behavior.

## Phương pháp
- Nguồn consult: 10+ kết quả official/vendor
- Tiêu chí: ưu tiên vendor trực tiếp, date mới nhất, có PDF/spec rõ ràng, có section firmware-relevant
- Mức tin cậy:
  - A = vendor trực tiếp
  - B = vendor mirror / distributor / community-cited official path
- Độ sâu: chỉ lấy các điểm ảnh hưởng trực tiếp đến firmware programming, không đào quá sâu vào electrical-only trivia

## Bảng kiến thức theo linh kiện

### 1) ESP32-S3
| Claim | Evidence | Source URL / title | Confidence | Firmware implication |
|---|---|---|---|---|
| Boot/reset/strap behavior phải theo TRM + HW design guide, không suy đoán từ board khác | Official TRM + hardware design guide + boot-mode page | [ESP32-S3 Datasheet](https://www.espressif.com/en/support/documents/technical-documents/datasheets/ESP32-S3-Datasheet.pdf), [ESP32-S3 TRM](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf), [Hardware Design Guidelines](https://documentation.espressif.com/esp-hardware-design-guidelines/en/latest/esp32s3/index.html), [Boot Mode Selection](https://docs.espressif.com/projects/esptool/en/latest/esp32s3/advanced-topics/boot-mode-selection.html) | A | Code bootloader/recovery flow phải giữ strap pins ổn định; UART download mode và reset sequencing phải tách khỏi modem/IMU noise |
| Power design cho single-supply nên đủ dòng đỉnh và timing reset đúng | Espressif hardware design guide notes 3.3V single supply and current margin | [ESP32-S3 Hardware Design Guidelines](https://documentation.espressif.com/esp-hardware-design-guidelines/en/latest/esp32s3/index.html) | A | Firmware không được giả định brownout là "random"; phải thiết kế retry/boot gating theo nguồn thật |
| Sleep/wake behavior có trong TRM, là nền cho deep sleep + external wake source | TRM is source of truth | [ESP32-S3 TRM](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf) | A | IMU/LTE wake logic phải map đúng RTC GPIO / wake source; tránh wake storm |

### 2) SIM7600 / SIM7600CE
| Claim | Evidence | Source URL / title | Confidence | Firmware implication |
|---|---|---|---|---|
| SIM7600 series có hardware design, AT manual, sleep note chính thức mới | SIMCom technical files hub và product pages list đúng file series | [SIMCom Technical Files](https://www.simcom.com/technical_files.html), [SIM7600 product technical files](https://www.simcom.com/technical_files-p93.html), [SIM7600NA page](https://en.simcom.com/product/SIM7600NAG.html), [SIM7600X-H-M2 page](https://en.simcom.com/product/SIM7600X-H-M2.html) | A | Firmware phải bám đúng manual version của module thực tế; không dùng AT flow từ modem khác suy ra |
| UART logic level của module có thể là 1.8V; PWRKEY/RESET timing phải đúng thứ tự | SIM7600 hardware design docs (official/series docs surfaced in search) | [SIMCom Technical Files](https://www.simcom.com/technical_files.html), [SIM7600X-H product page](https://en.simcom.com/product/SIM7600X-H.html) | A | Nếu ESP32-S3 3.3V UART nối thẳng là sai; cần level shifting hoặc verified tolerance |
| PWRKEY low pulse / reset pulse / VBAT peak current là startup-critical | SIM7600 hardware design note surfaced in previous repo research; vendor search confirms relevant docs exist | [SIM7600 product technical files](https://www.simcom.com/technical_files-p93.html) | A | Power-on state machine phải chờ modem ổn định trước AT; brownout on burst phải treated as hard fault |
| Sleep/wake behavior có riêng app note | Official sleep mode app note listed by SIMCom | [SIM7100_SIM7500_SIM7600 Series Sleep Mode Application Note](https://www.simcom.com/technical_files-p93.html) | A | Firmware cần explicit enter/exit sleep flow; không chỉ tắt UART là đủ |
| GNSS command family có khả năng lệch theo FW/manual variant | Cross-check from prior baseline note; official manuals exist nhưng command names differ by version | [SIMCom Technical Files](https://www.simcom.com/technical_files.html) | A | Chốt command theo exact module + firmware build; đừng hardcode `CGNSINF` nếu chưa xác nhận |

### 3) LIS3DH / LIS3DSH
| Claim | Evidence | Source URL / title | Confidence | Firmware implication |
|---|---|---|---|---|
| LIS3DH có official motion/wake app note | ST official product page + AN3308 | [LIS3DH product page](https://www.st.com/content/st_com/en/products/mems-and-sensors/accelerometers/lis3dh.html), [AN3308 PDF](https://www.st.com/resource/en/application_note/an3308-lis3dh-mems-digital-output-motion-sensor-ultralowpower-highperformance-3axis-nano-accelerometer-stmicroelectronics.pdf) | A | Dùng AN3308 để cấu hình wake-up/free-fall/orientation; không tự đoán interrupt latch semantics |
| LIS3DSH là part obsolete/out of production nhưng vẫn có official datasheet | ST official product page + datasheet | [LIS3DSH product page](https://www.st.com/content/st_com/en/products/mems-and-sensors/accelerometers/lis3dsh.html), [LIS3DSH datasheet](https://www.st.com/resource/en/datasheet/lis3dsh.pdf) | A | Nếu board đang dùng LIS3DSH thì docs/code cho LIS3DH không được copy-paste vô điều kiện |
| AN3393 cho LIS3DSH có dấu vết nhưng direct official PDF chưa surfaced trong search | ST community citation only | [ST Community citation thread](https://community.st.com/t5/mems-sensors/lis3dsh-vector-filter/td-p/384076) | B | Cần verify thêm trước khi đóng tài liệu programming; hiện chưa đủ mạnh để làm source chính |

### 4) Winbond W25Q128JV
| Claim | Evidence | Source URL / title | Confidence | Firmware implication |
|---|---|---|---|---|
| W25Q128JV datasheet là source chính cho JEDEC opcode, timing, erase/program constraints | Winbond official PDF + doc index | [W25Q128JV Datasheet PDF](https://www.winbond.com/resource-files/w25q128jv%20revf%2003272018%20plus.pdf), [Winbond documentation page](https://winbond.com/hq/support/documentation/?__locale=en&line=/product/code-storage-flash/index.html&family=/product/code-storage-flash/qspi-nor/index.html&category=/.categories/resources/datasheet/&pno=W25Q128JV) | A | Bootloader, OTA, and flash driver phải tuân thủ page size/erase block/quad enable flow đúng chip |

### 5) DS3231M
| Claim | Evidence | Source URL / title | Confidence | Firmware implication |
|---|---|---|---|---|
| DS3231M datasheet là source chính cho timekeeping, alarm, temperature compensation, I2C timing | ADI official product page + PDF | [DS3231M product page](https://www.analog.com/en/products/ds3231m.html), [DS3231M datasheet PDF](https://www.analog.com/media/en/technical-documentation/data-sheets/ds3231m.pdf) | A | RTC sync logic phải respect I2C access pattern, alarm flags, and backup-power behavior |

### 6) Power IC / sequencing
| Claim | Evidence | Source URL / title | Confidence | Firmware implication |
|---|---|---|---|---|
| Nếu có sequencer/monitor IC, power-up/down sequencing phải theo app note của vendor | ADI sequencing product/app note | [ADM1186 product page](https://www.analog.com/en/products/adm1186.html), [AN-1080 power sequencing](https://www.analog.com/en/resources/app-notes/an-1080.html) | A | Firmware startup should assume rails come up in order, not simultaneously; otherwise delay and poll |

## Vendor-critical rules
1. ESP32-S3 boot strap pins must be stable before reset release.
2. Do not borrow boot/reset assumptions from other ESP32 variants.
3. Treat ESP32-S3 hardware design guide as the source for power/reset timing.
4. SIM7600 UART level must be verified; assume 1.8V until board proves otherwise.
5. SIM7600 PWRKEY/RESET timing must follow the exact module hardware design note.
6. Never send AT commands before modem power-state is confirmed stable.
7. Use the exact SIM7600 AT manual version for the exact module SKU.
8. Verify GNSS command family per manual/FW build; do not hardcode `CGNSINF` blindly.
9. Implement explicit LTE sleep/wake entry/exit; UART silence is not sleep.
10. Handle VBAT burst current and brownout as firmware-visible faults.
11. Use ST AN3308 for LIS3DH interrupt/wake configuration.
12. Do not copy LIS3DH setup to LIS3DSH without checking register parity.
13. Keep IMU interrupt polarity/latch behavior explicit in code.
14. Use W25Q128JV datasheet for every flash timing and erase/program rule.
15. Respect DS3231M backup-power and alarm flag behavior in RTC sync code.
16. If a power sequencer exists, poll rail-good or reset-done before init chain.
17. Keep UART/AT state machine idempotent; modem resets can happen during OTA and sleep transitions.
18. For any claim not backed by vendor PDF/page, mark as provisional and cross-check community only after vendor review.

## Nguồn chính thức
- [ESP32-S3 Datasheet](https://www.espressif.com/en/support/documents/technical-documents/datasheets/ESP32-S3-Datasheet.pdf)
- [ESP32-S3 TRM](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP32-S3 Hardware Design Guidelines](https://documentation.espressif.com/esp-hardware-design-guidelines/en/latest/esp32s3/index.html)
- [ESP32-S3 Boot Mode Selection](https://docs.espressif.com/projects/esptool/en/latest/esp32s3/advanced-topics/boot-mode-selection.html)
- [SIMCom Technical Files](https://www.simcom.com/technical_files.html)
- [SIMCom SIM7600 technical files page](https://www.simcom.com/technical_files-p93.html)
- [SIM7600NA product page](https://en.simcom.com/product/SIM7600NAG.html)
- [SIM7600X-H product page](https://en.simcom.com/product/SIM7600X-H.html)
- [SIM7600X-H-M2 product page](https://en.simcom.com/product/SIM7600X-H-M2.html)
- [LIS3DH product page](https://www.st.com/content/st_com/en/products/mems-and-sensors/accelerometers/lis3dh.html)
- [AN3308 PDF](https://www.st.com/resource/en/application_note/an3308-lis3dh-mems-digital-output-motion-sensor-ultralowpower-highperformance-3axis-nano-accelerometer-stmicroelectronics.pdf)
- [LIS3DSH product page](https://www.st.com/content/st_com/en/products/mems-and-sensors/accelerometers/lis3dsh.html)
- [LIS3DSH datasheet](https://www.st.com/resource/en/datasheet/lis3dsh.pdf)
- [W25Q128JV datasheet](https://www.winbond.com/resource-files/w25q128jv%20revf%2003272018%20plus.pdf)
- [Winbond W25Q128JV documentation page](https://winbond.com/hq/support/documentation/?__locale=en&line=/product/code-storage-flash/index.html&family=/product/code-storage-flash/qspi-nor/index.html&category=/.categories/resources/datasheet/&pno=W25Q128JV)
- [DS3231M product page](https://www.analog.com/en/products/ds3231m.html)
- [DS3231M datasheet PDF](https://www.analog.com/media/en/technical-documentation/data-sheets/ds3231m.pdf)
- [ADM1186 product page](https://www.analog.com/en/products/adm1186.html)
- [AN-1080 power sequencing](https://www.analog.com/en/resources/app-notes/an-1080.html)

## Unresolved questions
1. Module thực tế trên board là đúng SKU nào của SIM7600.
2. AT manual version đang dùng trong firmware hiện trường là bản nào.
3. GNSS command thật sự dùng `CGNSINF` hay `CGNSSINFO`.
4. Board có level shifting 1.8V↔3.3V giữa ESP32-S3 và modem UART hay không.
5. LIS3DSH có direct official AN3393 PDF trong vendor source hay chỉ có community-cited path.
6. Power IC chính xác trên board là gì để chốt sequencing rules chi tiết hơn.
