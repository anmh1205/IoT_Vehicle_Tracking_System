# Research Report: Vendor-primary firmware programming knowledge

Ngày nghiên cứu: 2026-04-04 16:37 (Asia/Saigon)

## Tóm tắt
Mục tiêu là chốt các ràng buộc firmware chỉ từ vendor-primary / official docs cho ESP32-S3, SIM7600/SIM7600CE, LIS3DSH/LIS3DH, W25Q128JV, DS3231M, và power IC. Kết luận chính: phần cứng này không nên viết tài liệu programming theo “generic module knowledge”; phải khóa theo đúng SKU, đúng manual version, đúng voltage domain, và đúng sequencing.

Rủi ro lớn nhất không nằm ở code logic mà ở variant drift: SIM7600 model / AT manual lệch nhau, LIS3DH vs LIS3DSH không tương đương register-wise, và power IC chưa xác định nên sequencing chỉ có thể mô tả ở mức nguyên tắc.

## Phương pháp
- Nguồn: vendor docs / official product pages / official datasheet / official app note
- Ưu tiên: tài liệu trực tiếp từ hãng, có giá trị firmware-relevant
- Mức tin cậy: A = vendor trực tiếp; B = vendor path chưa đủ chi tiết hoặc cần đối chiếu thêm

## Bảng claim / evidence / source / confidence / firmware implication
| Claim | Evidence | Source | Confidence | Firmware implication |
|---|---|---|---|---|
| ESP32-S3 boot/strap/reset phải theo TRM + hardware design guide | Datasheet, TRM, hardware design guide, boot mode selection docs | Espressif official docs | A | Bootloader, recovery, reset sequencing phải giữ strap pins ổn định; không suy từ ESP32 khác |
| ESP32-S3 nguồn 3.3V phải có margin dòng đỉnh và brownout handling | Hardware design guide | Espressif official docs | A | Startup / retry / brownout flow phải coi reset nguồn là lỗi thật, không phải “random glitch” |
| SIM7600 series có technical files chính thức riêng theo dòng | Technical files hub + product pages | SIMCom official docs | A | Firmware phải bám đúng module SKU và đúng manual version |
| SIM7600 UART level có thể là 1.8V; PWRKEY/RESET timing là startup-critical | Hardware design / product docs | SIMCom official docs | A | Không nối UART 3.3V trực tiếp nếu chưa xác nhận level shifting; state machine power-on phải chờ modem ổn định |
| SIM7600 sleep/wake có quy trình riêng, không chỉ tắt UART | Sleep mode application note | SIMCom official docs | A | Cần explicit enter/exit sleep flow; tránh giả định “UART silent = sleep” |
| GNSS command family có thể lệch theo firmware / variant | Manual versions khác nhau theo SKU | SIMCom official docs | A | Không hardcode command nếu chưa xác nhận exact manual/firmware build |
| LIS3DH có app note motion/wake chính thức | AN3308 + product page | ST official docs | A | Interrupt/wake config nên theo AN3308, không đoán semantics latch/polarity |
| LIS3DSH là part riêng, obsolete, datasheet khác LIS3DH | Product page + datasheet | ST official docs | A | Không copy cấu hình LIS3DH sang LIS3DSH без check register parity |
| W25Q128JV datasheet là source chính cho opcode/timing/erase-program | Datasheet + documentation page | Winbond official docs | A | Flash driver/bootloader/OTA phải tuân đúng page size, erase block, QE flow |
| DS3231M datasheet là source chính cho RTC/alarm/temp compensation/I2C | Product page + datasheet | Analog Devices official docs | A | Sync RTC phải respect alarm flags, backup power behavior, I2C access pattern |
| Power sequencing phải theo IC/vendor app note nếu có sequencer/monitor IC | Power sequencing app note | Analog Devices official docs | A | Firmware nên poll rail-good/reset-done trước khi init chain nếu phần cứng hỗ trợ |

## Vendor-critical programming constraints
1. ESP32-S3 strap pins phải ổn định trước khi nhả reset.
2. Không dùng boot/reset assumption từ ESP32 variant khác.
3. SIM7600 phải xác minh đúng SKU và đúng AT manual.
4. Mặc định coi UART modem là 1.8V cho tới khi board chứng minh ngược lại.
5. Không gửi AT trước khi modem thật sự power-stable.
6. PWRKEY/RESET phải đúng timing của module cụ thể.
7. GNSS command phải chốt theo manual build đang dùng.
8. Sleep/wake LTE phải có entry/exit rõ ràng.
9. VBAT burst/brownout phải xử lý như lỗi firmware-visible.
10. Dùng AN3308 cho LIS3DH; không suy diễn từ datasheet generic.
11. LIS3DH và LIS3DSH không interchangeable.
12. W25Q128JV driver phải theo đúng erase/program/timing rules.
13. DS3231M RTC sync phải xử lý backup power và alarm flags.
14. Nếu có power sequencer, poll rail-good/reset-done trước init.
15. Bất kỳ claim nào không có vendor PDF/page phải gắn provisional.

## Đề xuất cấu trúc chương tài liệu theo góc vendor facts
- Chương 1: Platform overview + danh sách exact SKU/variant
- Chương 2: ESP32-S3 boot, reset, power, sleep
- Chương 3: SIM7600 hardware design, AT manual, power state, GNSS, sleep
- Chương 4: Sensor programming — LIS3DH vs LIS3DSH tách riêng
- Chương 5: Flash storage — W25Q128JV timing, erase, OTA, boot flow
- Chương 6: RTC — DS3231M sync, alarm, backup power
- Chương 7: Power tree / sequencing / brownout behavior
- Chương 8: Firmware state machines and validation checklist

## Risk points do version drift / variant mismatch
- SIM7600 CE/NA/X-H family có thể lệch AT command và sleep behavior.
- UART voltage domain giữa ESP32-S3 và modem có thể khác giả định code.
- LIS3DH vs LIS3DSH khác register map; copy-paste dễ hỏng wake logic.
- Flash timing/quad enable phụ thuộc đúng W25Q128JV revision.
- RTC behavior có thể bị hiểu sai nếu bỏ qua backup-power semantics.
- Power IC chưa xác định nên sequencing docs chỉ dừng ở mức nguyên tắc.

## Unresolved questions
- Board đang dùng đúng SIM7600 SKU nào.
- AT manual version hiện trường là bản nào.
- GNSS command thật sự đang dùng là `CGNSINF` hay `CGNSSINFO`.
- Có level shifting 1.8V↔3.3V giữa ESP32-S3 và modem UART hay không.
- LIS3DSH có direct official AN3393 PDF hay chỉ có community-cited path.
- Power IC chính xác trên board là gì để chốt sequencing rules chi tiết hơn.

## Kết luận ngắn
Dữ liệu vendor đủ mạnh để lập plan tài liệu firmware, nhưng plan phải khóa theo variant-first. Ưu tiên thu hẹp SKU/part number trước khi viết chương programming chi tiết.
