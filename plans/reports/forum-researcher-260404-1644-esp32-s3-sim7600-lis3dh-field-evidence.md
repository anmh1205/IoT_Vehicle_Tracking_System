# Research Report: ESP32-S3 / SIM7600 / LIS3DH field evidence

**Timestamp:** 2026-04-04 16:37 Asia/Saigon

## Executive Summary

Mình rà forum/QA cộng đồng cho các lỗi thực chiến quanh ESP32-S3, SIM7600 và LIS3DH. Kết luận ngắn: nhóm lỗi lặp lại nhiều nhất là **power integrity/brownout**, **deep-sleep wake miss**, và **UART/AT path không ổn định**. Phần lớn case SIM7600 “không trả AT” không phải do parser AT mà do **nguồn, level shifting, flow control, hoặc sequencing sleep/wake**.

Bằng chứng mạnh nhất mình tìm được là các thread riêng lẻ nhưng độc lập từ Espressif forum, Arduino forum và Stack Overflow. Có khá nhiều dấu hiệu lặp lại, nhưng số lượng thread trực tiếp cho từng symptom vẫn chưa đủ để gọi là “hard confirmed” ở mức vendor doc. Vì vậy report này tách rõ: **confirmed-by-multiple-sources** cho pattern chung, và **anecdotal** cho cách fix rất cụ thể theo từng thread.

## Research Methodology

- Sources consulted: 10 URL hits từ forum/QA cộng đồng + vendor/product pages
- Date range of materials: chủ yếu các thread hiện hành, không có bài quá cũ trong kết quả tìm kiếm
- Key search terms used:
  - `ESP32-S3 UART framing`
  - `SIM7600 AT command deadlock`
  - `ESP32-S3 brownout reset loop`
  - `deep sleep wake interrupt`
  - `LIS3DH wake interrupt`
  - `SIMCom UART hardware design`

## Key Findings

### 1. Technology Overview

- ESP32-S3: lỗi cộng đồng thường xoay quanh **power rail noise**, **sleep domain**, và **UART timing** khi làm việc với modem.
- SIM7600: case phổ biến là **AT no response**, **PPP/socket drop**, và **cold-start GNSS chậm**; nhiều thread quy về **nguồn + serial electrical integrity** hơn là firmware logic.
- LIS3DH: wake/interruption thường phụ thuộc **edge polarity**, **INT latch**, **pull-up/pull-down**, và **power domain** khi ESP32 vào deep sleep.

### 2. Current State & Trends

- Pattern lặp lại nhất trong cộng đồng: modem/ESP32 ổn lúc idle, fail khi **load current tăng**, **sleep/wake transition**, hoặc **UART line không sạch**.
- Không thấy dấu hiệu một bug firmware duy nhất; thay vào đó là cụm vấn đề hệ thống: nguồn, nối đất, flow control, và wake routing.

### 3. Best Practices

- Đừng debug AT trước khi đo nguồn. Nếu SIM7600 “chết AT”, ưu tiên kiểm tra VBAT dip, peak current, và ground return.
- Với ESP32-S3 deep sleep, xác nhận đúng **wake source**, đúng **edge**, và đúng **RTC-capable pin**.
- Nếu dùng SIM7600 UART, ưu tiên **hardware flow control** nếu board support; nếu không thì giảm baud và kiểm tra framing/collision.
- Với LIS3DH, test riêng **interrupt pin polarity + latch mode** trước khi ghép vào full sleep flow.

### 4. Security Considerations

- Không có security finding trực tiếp từ nguồn tìm được.
- Nhưng tránh “fix” bằng cách tắt brownout hoặc bỏ flow control: đó là workaround che lỗi, có thể tạo reset loop khó đoán và data loss.

### 5. Performance Insights

- GNSS cold start trên SIM7600 thường bị nhìn nhầm là firmware treo; thực tế là **time-to-first-fix** dài nếu không có almanac/ephemeris hợp lệ.
- UART loss/garbling thường tăng mạnh khi modem phát current burst, nên performance vấn đề là **power + signal integrity**, không chỉ baud rate.

## Comparative Analysis

### Confirmed by multiple sources

| Symptom | Likely root cause | Fix | Evidence links | Confidence | Notes |
|---|---|---|---|---|---|
| ESP32-S3 brownout / reset loop khi modem hoạt động | VBAT sụt áp, inrush/current burst, ground return kém, board supply yếu | Dùng nguồn đủ peak current, thêm bulk cap gần modem, kiểm tra ground, đo sụt áp lúc TX/RF burst | [ESP32-S3 Devkit brownout and need USB to reset](https://forum.arduino.cc/t/esp32-s3-devkit-brownout-and-need-usb-to-reset/1247185), [VBAT Supply for ESP32-S3](https://forum.arduino.cc/t/vbat-supply-for-esp32-s3/1357045), [SIM7600X-H hardware/product](https://www.simcom.com/product/SIM7600X-H.html) | High | Đây là pattern lặp lại rõ nhất |
| Deep sleep wake miss / không dậy đúng lúc | Sai edge/polarity, pin không phải RTC-capable, interrupt latch/config chưa đúng | Xác nhận RTC wake pin, test rising/falling edge, dùng latch nếu cần, kiểm tra pull-up/pull-down | [ESP32 Wake up from sleep on rising](https://forum.arduino.cc/t/esp32-wake-up-from-sleep-on-rising/1217625), [How to create a wakeup from deep sleep for multiple pins without delay?](https://forum.arduino.cc/t/how-to-create-a-wakeup-from-deep-sleep-for-multiple-pins-without-delay/1325142), [ULP RISC-V Interrupts/Timers](https://esp32.com/viewtopic.php?t=42445) | High | Áp dụng tốt cho LIS3DH wake chain |
| SIM7600 AT “không phản hồi” / UART deadlock | UART electrical issue, level shifter kém, flow control thiếu, sequencing sleep/wake sai, baud/ framing mismatch | Kiểm tra TX/RX level, thêm flow control, giảm baud, test bằng UART loopback/logic analyzer, xác minh power stability | [SIM7600E not responding to any AT commands](https://stackoverflow.com/questions/70212092/embedded-sim7600e-not-responding-to-any-at-commands), [ESP32 Serial2 No Response SIM7600](https://forum.arduino.cc/t/esp32-serial2-no-response-sim7600/1087544), [SIM7600 Module: Connect socket failed after several HTTP requests](https://stackoverflow.com/questions/77300048/sim7600-module-connect-socket-failed-error-after-several-successful-http-requ) | Medium | Thường là hardware-path issue, not AT parser |

### Anecdotal / single-thread evidence

| Symptom | Likely root cause | Fix | Evidence links | Confidence | Notes |
|---|---|---|---|---|---|
| GNSS cold start quá lâu hoặc “treo” | Mất almanac/ephemeris, antenna/sky view kém, power sequencing | Đợi đủ TTFF, kiểm tra antenna, không reboot module liên tục | [SIM7600X Module 4G Wireless Solutions](https://cn.simcom.com/product/SIM7600X.html) | Medium-Low | Cần thêm vendor doc/field logs để chốt |
| ESP32-S3 + modem + sensor EMI/noise gây lỗi ngẫu nhiên | EMC/grounding/layout noise coupling | Tách nguồn analog/digital, thêm decoupling, route UART ngắn | [ESP32 Serial2 No Response SIM7600](https://forum.arduino.cc/t/esp32-serial2-no-response-sim7600/1087544), [ESP32-S3 unit of noise_floor and rssi?](https://esp32.com/viewtopic.php?t=31902) | Low | Có dấu hiệu đúng nhưng chưa đủ thread cùng symptom |
| LIS3DH interrupt miss khi sleep | INT polarity/latch mismatch, wake pin config sai | Test interrupt polarity/latch, confirm pin mapping | [ESP32 Wake up from sleep on rising](https://forum.arduino.cc/t/esp32-wake-up-from-sleep-on-rising/1217625) | Low | Chưa thấy thread LIS3DH trực tiếp trong search |

## Implementation Recommendations

### Quick Start Guide

1. Đo VBAT tại SIM7600 lúc TX/RF burst.
2. Xác nhận ESP32-S3 brownout threshold và log reset reason.
3. Test AT bằng baud thấp + flow control bật nếu có.
4. Test deep sleep wake với 1 interrupt source duy nhất trước.
5. Chỉ sau đó mới ghép LIS3DH wake chain vào full firmware flow.

### Common Pitfalls

- Tưởng AT deadlock nhưng thực tế là modem chưa đủ nguồn.
- Dùng level shifter yếu cho UART tốc độ cao.
- Dùng pin không hỗ trợ RTC wake.
- Bật deep sleep rồi vẫn kỳ vọng interrupt GPIO thường hoạt động như lúc chạy bình thường.
- Reboot SIM7600 liên tục khi GNSS chưa có fix, làm dài TTFF và gây hiểu nhầm.

## Resources & References

### Community Resources

- Espressif forum: [Is it normal that not all AT commands work?](https://esp32.com/viewtopic.php?t=30183)
- Espressif forum: [ESP32-S3 : Unit of the noise_floor and rssi ?](https://esp32.com/viewtopic.php?t=31902)
- Espressif forum: [ULP RISC-V Interrupts/Timers](https://esp32.com/viewtopic.php?t=42445)
- Arduino forum: [ESP32 Serial2 No Response SIM7600](https://forum.arduino.cc/t/esp32-serial2-no-response-sim7600/1087544)
- Arduino forum: [ESP32-S3 Devkit brownout and need USB to reset](https://forum.arduino.cc/t/esp32-s3-devkit-brownout-and-need-usb-to-reset/1247185)
- Arduino forum: [VBAT Supply for ESP32-S3](https://forum.arduino.cc/t/vbat-supply-for-esp32-s3/1357045)
- Arduino forum: [ESP32 Wake up from sleep on rising](https://forum.arduino.cc/t/esp32-wake-up-from-sleep-on-rising/1217625)
- Arduino forum: [How to create a wakeup from deep sleep for multiple pins without delay?](https://forum.arduino.cc/t/how-to-create-a-wakeup-from-deep-sleep-for-multiple-pins-without-delay/1325142)
- Stack Overflow: [SIM7600E not responding to any AT commands](https://stackoverflow.com/questions/70212092/embedded-sim7600e-not-responding-to-any-at-commands)
- Stack Overflow: [Not receiving data in LCP(PPPoS) phase over UART(ESP-32 -> Sim7600)](https://stackoverflow.com/questions/69193573/not-receiving-data-in-lcppppos-phase-over-uartesp-32-sim7600)
- SIMCom product pages: [SIM7600X-H](https://www.simcom.com/product/SIM7600X-H.html), [SIM7600X-H-M2](https://en.simcom.com/product/SIM7600X-H-M2.html), [SIM7600X](https://cn.simcom.com/product/SIM7600X.html), [SIM7600NA-H](https://www.simcom.com/product/SIM7600NA-H.html)
- SIMCom hardware doc surfaced via search: [SIM7600 Series Hardware Design PDF](https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/4998/SIM7600_Series_Hardware_Design.pdf)
- EmbeddedRelated: [ESP32-WROVER-S3 Modbus project page](https://www.embeddedrelated.com/parts/advisor/projects/i-want-to-build-a-esp32-wrover-s3-to-log-modbus-data-and-stream-it-to-the-cloud-it-should-buffer-data-for-a-few-weeks-if-there-is-no-cloud-connection)

## Appendices

### A. Glossary

- **Brownout**: reset do tụt áp nguồn.
- **TTFF**: Time To First Fix, thời gian GNSS có fix đầu tiên.
- **RTC-capable pin**: pin giữ được wake logic trong deep sleep.
- **Flow control**: RTS/CTS để tránh mất byte UART khi modem bận.

### B. Checklist debug thực địa

- [ ] Đo VBAT ngay chân modem khi TX/GNSS active.
- [ ] Xác minh current peak của SIM7600 với nguồn thực tế.
- [ ] Kiểm tra reset reason của ESP32-S3 sau mỗi loop.
- [ ] Tắt bớt module, test từng nhánh: nguồn → UART → sleep/wake → GNSS.
- [ ] Dùng logic analyzer capture UART trong lúc modem vừa wake vừa gửi AT.
- [ ] Bật/tắt flow control để so sánh loss rate.
- [ ] Xác nhận pin wake của LIS3DH là RTC-capable và edge đúng polarity.
- [ ] Kiểm tra pull-up/pull-down external trên INT line.
- [ ] Đánh giá layout/ground/decoupling nếu lỗi chỉ xuất hiện khi modem phát.
- [ ] Không kết luận “firmware bug” trước khi loại trừ nguồn và EMI.

## Unresolved Questions

- Chưa có thread trực tiếp đủ mạnh cho **LIS3DH-specific wake miss**; cần thêm nguồn vendor/community riêng.
- Chưa đủ bằng chứng công khai để chốt **GNSS cold start** là issue firmware hay antenna/power ở dự án này.
- Chưa xác nhận board SIM7600 cụ thể của dự án có hỗ trợ **hardware flow control** đầy đủ hay không.
