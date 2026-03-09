# Research note: xác thực datasheet baseline (A7600/SIM7600, ESP32-S3, LIS3DH, 18650 1S)

Ngày: 2026-03-07
Phạm vi: chỉ nghiên cứu, không sửa code.

## 1) Xác thực model modem (A7600CE-T vs SIM7600CE-T)

| Mục | Kết quả | Bằng chứng | Độ tin cậy |
|---|---|---|---|
| `A7600CE-T` có phải model official? | **Không thấy model official dạng này** trên trang sản phẩm SIMCom | Trang official có **A7600C**, **A7600E**; không có page `A7600CE-T` | Cao |
| `SIM7600CE-T` có tồn tại? | **Có dấu vết official** (product/news/download naming) | Trang product `SIM7600CE` và mục tải có token `SIM7600CE-T_Ali_Certification` | Trung bình-Cao |
| Repo hiện tại đang tham chiếu gì? | Repo đang bám **SIM7600CE-T** | `part-03-modem-simcom.md` ghi runtime duy nhất SIM7600CE-T, dùng `AT+CGNSINF` | Cao |

Kết luận ngắn: baseline hiện tại hợp lý hơn nếu chuẩn hóa theo **SIM7600CE(-T)**. Tên `A7600CE-T` nhiều khả năng là nhầm giữa line A7600 và SIM7600.

## 2) URL datasheet ưu tiên official

| Thành phần | URL ưu tiên | Loại | Ghi chú |
|---|---|---|---|
| SIM7600CE | https://cn.simcom.com/product/SIM7600CE.html | Official vendor page | Có document download HW design/AT docs theo series |
| A7600C | https://cn.simcom.com/product/A7600C.html | Official vendor page | Dùng để xác nhận line A7600 là line khác |
| A7600E | https://www.simcom.com/product/A7600E.html | Official vendor page | Tương tự trên |
| ESP32-S3 | https://documentation.espressif.com/api/resource/doc/file/rz94aWY3/FILE/esp32-s3_datasheet_en.pdf | Official PDF | Nguồn Espressif trực tiếp |
| LIS3DH | https://www.st.com/resource/en/datasheet/lis3dh.pdf | Official PDF | Nguồn ST trực tiếp |
| 18650 1S | Không có “một” datasheet universal. Phải khóa theo cell cụ thể (Samsung/Panasonic/LG/Molicel) | N/A | Mirror có thể dùng tạm, phải cảnh báo |

## 3) Tham số interface cần đối chiếu firmware/docs

| Hạng mục | Giá trị thực tế cần baseline | Nguồn | Độ tin cậy |
|---|---|---|---|
| Modem UART IO level | **SIM7600CE UART = 1.8V** (không phải 3.3V trực tiếp) | Trích local `tmp-SIM7600CE_Hardware_Design_V1.04.txt` | Cao (nhưng là mirror/local copy) |
| PWRKEY ON timing | Kéo thấp **100–500 ms** để power on | Trích local Table 8 | Cao |
| PWRKEY OFF timing | Kéo thấp **>= 2.5 s** để power off | Trích local Table 9 | Cao |
| RESET timing | Xung thấp **50–500 ms** | Trích local Table 10 | Cao |
| VBAT range + peak | Cần giữ VBAT không tụt dưới **3.4V** khi burst; peak lên **~2A**; vùng hoạt động thường 1-cell Li-ion | Trích local HW design | Cao |
| ESP32-S3 IO/UART domain | ESP32-S3 IO domain 3.3V; ngưỡng logic theo tỉ lệ VDD (VIH/VIL), UART0 mặc định GPIO43/44 | Datasheet Espressif | Cao |
| LIS3DH Vdd/Vdd_IO | **Vdd 1.71–3.6V**, I2C addr 7-bit **0x18/0x19** (SA0) | Datasheet ST | Cao |
| 18650 1S charge/discharge giới hạn | Phụ thuộc cell. Pattern phổ biến NMC/NCA: charge CV **4.20V**, cutoff xả thường **2.5–2.75V**; phải theo đúng datasheet cell + BMS | Mirror Samsung/Panasonic + thực hành ngành | Trung bình |

### Trích đoạn chứng cứ local (repo)

File: `E:/anmh1205/IoT_Vehicle_Tracking_System/tmp-SIM7600CE_Hardware_Design_V1.04.txt`

```text
The SIM7600CE UART is 1.8V voltage interface.
...
Ton (PWRKEY low to power on): 100 500 ms
Toff (PWRKEY low to power off): 2.5 s
Treset (RESET low pulse): 50 100 500 ms
...
current up to 2A ... Make sure voltage on VBAT pins will never drop below 3.4V
```

## 4) Tương thích AT commands hiện tại

Giả định firmware hiện dùng: `CNMP / CGDCONT / CEREG / CGACT / CGNSINF`.

| Command | SIM7600 series | A7600 series | Nhận định |
|---|---|---|---|
| `AT+CNMP` | Có trong manual SIM7600 | Có trong manual A7600 | OK cho cả hai line |
| `AT+CGDCONT` | Có | Có (line LTE chuẩn) | OK |
| `AT+CEREG` | Có | Có | OK |
| `AT+CGACT` | Có | Có | OK |
| `AT+CGNSINF` | Tài liệu mới SIM7600/A7600 thường thấy `AT+CGNSSINFO` hơn | Có thể khác tên theo FW/manual version | **Rủi ro mismatch cao nhất** |

Kết luận ngắn:
- Nếu chốt model là **SIM7600CE(-T)**: bộ lệnh PDP/network gần như tương thích tốt.
- Điểm cần khóa cứng ngay: **GNSS info command variant** (`CGNSINF` vs `CGNSSINFO`) theo đúng manual/firmware build của module thực tế.

## Kết luận độ tin cậy tổng

| Chủ đề | Mức tin cậy |
|---|---|
| Định danh model `A7600CE-T` không official rõ ràng | **Cao** |
| Baseline nên dùng `SIM7600CE(-T)` | **Trung bình-Cao** |
| Tham số điện/timing modem (UART 1.8V, PWRKEY/RESET, VBAT/peak) | **Cao** |
| LIS3DH + ESP32-S3 thông số interface | **Cao** |
| Giới hạn pin 18650 1S “chung cho mọi cell” | **Thấp-Trung bình** (phải khóa model cell cụ thể) |
| Tương thích `CGNSINF` hiện trạng | **Trung bình** (phụ thuộc version AT/FW) |

## Unresolved questions

1. Bo thực tế đang hàn **module nào chính xác** (tem trên shield): `SIM7600CE-T` hay SKU khác?
2. Firmware modem hiện trường trả lời command nào: `AT+CGNSINF?` hay `AT+CGNSSINFO?`
3. Cell pin 18650 cụ thể là model nào (Samsung 30Q/29E, Panasonic NCR..., LG...)?
4. Có level shifter 1.8V↔3.3V giữa ESP32-S3 và modem UART chưa?
