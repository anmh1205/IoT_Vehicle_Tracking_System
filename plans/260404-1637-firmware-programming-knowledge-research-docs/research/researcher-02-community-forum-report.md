# Research Report: Community/forum evidence cho firmware programming

**Timestamp:** 2026-04-04 16:37 (Asia/Saigon)

## Mục lục
- [Tóm tắt](#tóm-tắt)
- [Phương pháp](#phương-pháp)
- [1. Practice patterns](#1-practice-patterns)
- [2. Lỗi thực chiến](#2-lỗi-thực-chiến)
- [3. Anti-patterns cần cảnh báo](#3-anti-patterns-cần-cảnh-báo)
- [4. Unresolved questions](#4-unresolved-questions)
- [Nguồn](#nguồn)

## Tóm tắt
Nguồn community/forum cho thấy 4 điểm lặp lại mạnh nhất cho ESP32-S3 + SIM7600 + GNSS + sleep/wake + IMU là: **nguồn cấp phải đủ đỉnh dòng**, **UART nên có RTS/CTS nếu traffic dài**, **sleep của SIM7600 không chỉ là "gửi lệnh rồi chờ" mà còn phụ thuộc DTR/CSCLK và sequencing**, và **wake-source của ESP32 phải khớp mode sleep + chân hỗ trợ wake**.

Điểm rủi ro cao nhất là lỗi bị hiểu sai là "firmware bug" nhưng thực chất là **power integrity / serial flow control / wake-pin mismatch**. Với GNSS, community hay báo hiện tượng xung đột tài nguyên hoặc ảnh hưởng kết nối khi bật GNSS cùng lúc với network task; nên tài liệu cần hướng dẫn sequencing rõ, tránh bật mọi thứ cùng lúc.

## Phương pháp
- Nguồn: 7 thread community/repo/QA
- Loại nguồn: GitHub issue, Stack Overflow, Arduino Forum
- Tiêu chí: chỉ giữ pattern có thể lặp lại, tách rõ confirmed vs anecdotal
- Từ khóa: ESP32-S3, SIM7600, CSCLK, DTR, GNSS, sleep mode, wake pin, RTS/CTS, brownout, IMU interrupt

## 1. Practice patterns

| Pattern | Evidence links | Risk nếu bỏ qua | Khi nào áp dụng | Độ tin cậy |
|---|---|---|---|---|
| Dùng RTS/CTS cho UART dài / HTTPS / payload lớn | [SO: long HTTPS requests](https://stackoverflow.com/questions/78990228/sim7600-and-esp32-s3-cant-get-long-https-requests) | Mất byte, treo AT parser, request fail ngẫu nhiên | Khi modem trả dữ liệu dài, TLS, MQTT payload lớn | Cao |
| Thiết kế sleep của SIM7600 với DTR + `AT+CSCLK=1`, không chỉ gửi 1 lệnh | [GitHub #13](https://github.com/Xinyuan-LilyGO/T-SIM7600X/issues/13), [GitHub #57](https://github.com/Xinyuan-LilyGO/T-SIM7600X/issues/57) | Current vẫn cao, modem không vào sleep thật | Khi cần hạ tiêu thụ pin ở idle | Cao |
| Kiểm tra nguồn cấp/rail ổn định trước khi debug firmware | [GitHub #57](https://github.com/Xinyuan-LilyGO/T-SIM7600X/issues/57), [Arduino Forum](https://forum.arduino.cc/t/simcom-7600g-sleep-mode-handling-guidance/1293135) | Reset lặp, AT timeout, sleep/wake sai triệu chứng | Khi có brownout, reboot, modem bốc dòng | Cao |
| Tách GNSS sequencing khỏi network task | [SO: GNSS vs MQTT](https://stackoverflow.com/questions/77272593/sim7600-mqtt-connection-loss-gnss-enables) | Mất kết nối, task contention, bug khó tái hiện | Khi bật GNSS cùng LTE/MQTT | Trung bình-cao |
| Chỉ dùng wake pin phù hợp mode sleep của ESP32-S3 | [Arduino wake rising](https://forum.arduino.cc/t/esp32-wake-up-from-sleep-on-rising/1217625), [ESP32-S3 deep sleep issue](https://github.com/espressif/arduino-esp32/issues/7431) | IMU interrupt không đánh thức được, wake chập chờn | Khi IMU làm nguồn wake từ sleep | Trung bình |

### Ghi chú thực dụng
- **Confirmed:** RTS/CTS, nguồn cấp, DTR/CSCLK, sequencing GNSS/network lặp lại ở nhiều thread.
- **Anecdotal:** chi tiết pin/wake cụ thể cho IMU trên ESP32-S3 phụ thuộc board; cần xác minh theo schematic.

## 2. Lỗi thực chiến

| Symptom | Root-cause khả dĩ | Fix cộng đồng hay dùng | Evidence | Confidence |
|---|---|---|---|---|
| SIM7600 vẫn ăn dòng cao dù đã gọi sleep | DTR/CSCLK chưa đúng, modem chưa vào sleep thật, hoặc rail không ổn định | Set đúng sequence sleep, kiểm tra DTR, đo current thực tế | [GitHub #13](https://github.com/Xinyuan-LilyGO/T-SIM7600X/issues/13) | Cao |
| Current/voltage dao động khi modem sleep | Nguồn yếu, layout/power path chưa đủ | Tăng khả năng cấp dòng, kiểm tra tụ bulk, đo sụt áp | [GitHub #57](https://github.com/Xinyuan-LilyGO/T-SIM7600X/issues/57) | Cao |
| HTTPS / long response bị cụt trên ESP32-S3 + SIM7600 | UART overrun / thiếu flow control | Bật RTS/CTS, giảm burst, tăng buffer hợp lý | [Stack Overflow](https://stackoverflow.com/questions/78990228/sim7600-and-esp32-s3-cant-get-long-https-requests) | Cao |
| MQTT / network rớt khi bật GNSS | GNSS và network share tài nguyên/sequence không hợp lý | Bật GNSS theo phase, không khởi động cùng lúc với task mạng | [Stack Overflow](https://stackoverflow.com/questions/77272593/sim7600-mqtt-connection-loss-gnss-enables) | Trung bình-cao |
| ESP32 không wake đúng từ sleep | Chân wake không đúng loại, edge/pull không khớp, mode sleep mismatch | Chọn đúng pin wake, test riêng từng mode, xác nhận polarity | [Arduino Forum](https://forum.arduino.cc/t/esp32-wake-up-from-sleep-on-rising/1217625), [ESP32-S3 issue](https://github.com/espressif/arduino-esp32/issues/7431) | Trung bình |
| SIM7600 sleep handling không ổn định | Sequence AT sai hoặc thiếu chuẩn bị đường nguồn | Theo guidance community, kiểm tra sequence và supply trước | [Arduino Forum](https://forum.arduino.cc/t/simcom-7600g-sleep-mode-handling-guidance/1293135) | Trung bình |

## 3. Anti-patterns cần cảnh báo

1. **Tin rằng gửi `AT+CSCLK=1` là đủ để sleep.** Thực tế phải kiểm DTR, state modem, và rail.
2. **Debug firmware trước khi đo nguồn.** Nhiều lỗi nhìn giống logic bug nhưng gốc là sụt áp.
3. **Bỏ RTS/CTS khi modem trả dữ liệu dài.** Với SIM7600 + ESP32-S3, đây là nguồn lỗi rất thực.
4. **Bật GNSS, LTE, MQTT, logging cùng lúc ngay từ boot.** Nên tách phase khởi động.
5. **Dùng bất kỳ GPIO nào làm wake source.** Wake pin phải khớp capability của sleep mode + board wiring.
6. **Gộp IMU interrupt và modem wake vào một giả định chung.** Hai đường wake có thể khác polarity, debounce, và power domain.

## 4. Unresolved questions

- Board mục tiêu dùng chân nào cho RTS/CTS, và đã route full hardware flow control chưa?
- SIM7600 trên board này hỗ trợ sleep mode nào thực tế: CSCLK, PSM, hay chỉ suspend logic?
- IMU interrupt là active-high hay active-low, open-drain hay push-pull?
- Chân IMU interrupt có nằm trên RTC-capable pin của ESP32-S3 không?
- Nguồn cấp modem có đủ peak current khi GNSS + LTE cùng hoạt động không?
- Tài liệu cần khuyến nghị workflow đo current/logic analyzer ở mức nào để người đọc tái hiện lỗi?

## Nguồn
- [GitHub issue #13: Power consumption of SIM7600 in sleep mode](https://github.com/Xinyuan-LilyGO/T-SIM7600X/issues/13)
- [GitHub issue #57: Power change of sim7600 in sleep mode!](https://github.com/Xinyuan-LilyGO/T-SIM7600X/issues/57)
- [Stack Overflow: SIM7600 and ESP32-S3 can't get long HTTPS requests](https://stackoverflow.com/questions/78990228/sim7600-and-esp32-s3-cant-get-long-https-requests)
- [Stack Overflow: sim7600 MQTT connection loss GNSS enables](https://stackoverflow.com/questions/77272593/sim7600-mqtt-connection-loss-gnss-enables)
- [Arduino Forum: SIMCOM 7600G Sleep mode handling guidance](https://forum.arduino.cc/t/simcom-7600g-sleep-mode-handling-guidance/1293135)
- [Arduino Forum: ESP32 Wake up from sleep on rising](https://forum.arduino.cc/t/esp32-wake-up-from-sleep-on-rising/1217625)
- [GitHub issue #7431: ESP32-S3 touch wake up from deep sleep problem](https://github.com/espressif/arduino-esp32/issues/7431)
