# NỘI DUNG SLIDE BẢO VỆ ĐỒ ÁN TỐT NGHIỆP

**Đề tài:** Thiết kế hệ thống IoT cho ứng dụng quản lý phương tiện giao thông trong lĩnh vực cho thuê xe tự lái  
**Sinh viên:** Lê Trọng An – 21010389 – K15  
**GVHD:** TS. Nguyễn Đức Nam  
**Trường:** Đại học Phenikaa – Khoa Cơ khí – Cơ điện tử  
**Thời lượng:** ~15 phút  

---

## Slide 1 – Trang bìa

- Logo Đại học Phenikaa
- **ĐỒ ÁN TỐT NGHIỆP**
- THIẾT KẾ HỆ THỐNG IoT CHO ỨNG DỤNG QUẢN LÝ PHƯƠNG TIỆN GIAO THÔNG TRONG LĨNH VỰC CHO THUÊ XE TỰ LÁI
- *Design of an IoT System for Vehicle Management in Car Rental Service*
- Sinh viên: Lê Trọng An – MSV: 21010389 – K15
- Ngành: Kỹ thuật Cơ điện tử
- GVHD: TS. Nguyễn Đức Nam
- Hà Nội – 05/2026

---

## Slide 2 – Nội dung trình bày

1. Tổng quan vấn đề
2. Khảo sát thị trường & Xác định mục tiêu
3. Phân tích kỹ thuật & Giải pháp thiết kế
4. Triển khai thực tế
5. Sản phẩm & Kết quả đo kiểm
6. Đánh giá & Đề xuất

---

## PHẦN 1: TỔNG QUAN VẤN ĐỀ

### Slide 3 – Bối cảnh & Đặt vấn đề

- Dịch vụ cho thuê xe tự lái phát triển nhanh → nhu cầu số hóa quản lý đội xe
- Người quản lý cần biết:
  - Xe đang ở đâu? Đang chạy hay đỗ?
  - Có bất thường gì không? (rung, dịch chuyển, vượt vùng)
  - Sau chuyến đi: quãng đường, thời gian, chi phí?
- Thiết bị GPS hiện có → chỉ giải quyết lớp vị trí
- Thiếu: trạng thái vận hành, cảnh báo bất thường, dữ liệu đối chiếu khai thác
- **Bài toán:** Liên kết dữ liệu hành trình + vận hành + cảnh báo trong cùng một hệ thống

---

## PHẦN 2: KHẢO SÁT THỊ TRƯỜNG & XÁC ĐỊNH MỤC TIÊU

### Slide 4 – Khảo sát thiết bị trên thị trường

| Thiết bị | Đặc điểm | Hạn chế với bài toán |
|----------|-----------|---------------------|
| Teltonika FMC920 | 4G LTE Cat 1, nhỏ gọn, theo dõi hành trình | Chưa khai thác dữ liệu OBD-II |
| OBD Vcar Viettel | Cắm OBD-II, định vị, Wi-Fi, ~2 triệu VND | Phụ thuộc nền tảng nhà cung cấp, khó tùy biến |
| Queclink GV305CEU | LTE, GNSS, BLE, nhiều I/O, mở rộng tốt | Chi phí cao, phức tạp vượt nhu cầu nguyên mẫu |

---

### Slide 5 – So sánh các hướng triển khai

| Hướng triển khai | Dữ liệu | Ưu điểm | Hạn chế |
|------------------|---------|---------|---------|
| Định vị cơ bản | Vị trí, tốc độ | Lắp nhanh, chi phí thấp | Thiếu dữ liệu vận hành, không nhận biết bất thường |
| Định vị + OBD-II | Vị trí + trạng thái xe | Thêm dữ liệu khai thác | Quản lý tập trung hạn chế, khó tùy biến |
| Nền tảng thương mại | Đầy đủ | Hoàn chỉnh, triển khai nhanh | Chi phí cao, phụ thuộc nhà cung cấp |
| **Tích hợp theo yêu cầu** | **Tùy chỉnh** | **Linh hoạt, tự chủ, mở rộng được** | **Phải tự giải quyết toàn tuyến** |

→ Chọn hướng **tích hợp theo yêu cầu** để đáp ứng đúng bài toán

---

### Slide 6 – Mục tiêu & Chỉ tiêu thiết kế

**Mục tiêu:** Xây dựng hệ thống IoT hoàn chỉnh 3 phần:
- Thiết bị gắn trên xe → thu dữ liệu
- Máy chủ → xử lý, lưu trữ, cảnh báo
- Giao diện web → khai thác cho người vận hành

**Chỉ tiêu:**

| Hạng mục | Yêu cầu |
|----------|---------|
| Nguồn cấp | 12–24 VDC |
| MCU | ESP32-S3 |
| Giao tiếp xe | OBD-II |
| Dữ liệu | GPS, tốc độ, vận hành cơ bản |
| Cảnh báo | Vượt tốc, đỗ lâu, ra khỏi vùng |
| Chi phí | < 20.000.000 VND |
| Gia công | PCB chuyên dụng, vỏ in 3D |
| Tiêu chuẩn | IPC-2221, IEC 60664-1 |

---

## PHẦN 3: PHÂN TÍCH KỸ THUẬT & GIẢI PHÁP THIẾT KẾ

### Slide 7 – Nguyên lý hoạt động & Ràng buộc kỹ thuật

**Nguyên lý 5 bước:**
1. Ghi nhận trạng thái xe (vị trí, vận hành, chuyển động)
2. Thu nhận & xử lý tại thiết bị (GNSS + OBD-II + IMU → bản tin)
3. Gửi bản tin về máy chủ (4G/LTE, MQTT TLS)
4. Xử lý tại máy chủ (chuẩn hóa, lưu trữ, cảnh báo)
5. Biểu diễn thông tin quản lý (bản đồ, trạng thái, lịch sử)

**4 ràng buộc chi phối:**

| Ràng buộc | Yêu cầu |
|-----------|---------|
| Thiết bị | Gọn, ít dây, dễ tháo lắp, không can thiệp ECU |
| Năng lượng | Không hao điện quá mức khi đỗ, vẫn phát hiện rung/dịch chuyển |
| Tuyến truyền | Chấp nhận mất sóng, có đệm, phục hồi được |
| Khai thác | Giao diện gọn, chỉ hiển thị tín hiệu cần cho quản lý |

*(Hình 3.1)*

---

### Slide 8 – Lựa chọn phương án phần cứng

**Đánh giá bằng ma trận có trọng số → chọn phương án tối ưu:**

| Vấn đề | Phương án chọn | Điểm | Lý do |
|--------|---------------|------|-------|
| Thu dữ liệu OBD-II | vgate iCar Pro (BLE) | 4,85 | Không dây, ít xâm lấn, dễ tháo lắp, tương thích nhiều xe |
| Giám sát khi xe đỗ | LIS3DSH + nhánh đánh thức riêng | 4,75 | Dòng cực thấp, cô lập modem khỏi nhánh luôn cấp |
| Truyền dữ liệu + định vị | SIM7600CE-T (LTE+GNSS) | 4,75 | Tích hợp 1 khối, giảm phức tạp nguồn/ăng ten |
| MCU trung tâm | ESP32-S3 | 4,55 | Đủ giao tiếp, BLE tích hợp, ngủ sâu, không cần chip phụ |

*(Hình 3.2, 3.3, 3.4, 3.5)*

---

### Slide 9 – Lựa chọn phương án phần mềm & truyền thông

**Phần mềm nhúng:**
- ESP-IDF + FreeRTOS (5,00 điểm) → điều phối đa tác vụ, kiểm soát tài nguyên tốt

**Giao thức truyền bản tin:**
- MQTT qua TLS (4,80 điểm) → nhẹ, phân tách theo chủ đề, hỗ trợ gửi bù sau mất sóng

**Tổ chức máy chủ:**
- MQTT Broker + Lớp trung gian + Lưu trữ tách vai trò (4,80 điểm)
  - Tách tuyến nhận bản tin khỏi nghiệp vụ
  - Hấp thụ được bản tin gửi dồn
  - Dễ mở rộng, dễ khoanh vùng lỗi

---

### Slide 10 – Kiến trúc tổng thể được chọn

**3 khối chính:**

| Khối | Thành phần | Vai trò |
|------|-----------|---------|
| Thiết bị trên xe | ESP32-S3 + SIM7600CE-T + vgate + LIS3DSH + Pin 18650 | Thu dữ liệu, tạo bản tin, gửi về máy chủ |
| Máy chủ | EMQX → MQTT Bridge → Backend → PostgreSQL/InfluxDB/Loki | Tiếp nhận, xử lý, lưu trữ, cảnh báo |
| Giao diện | Web (Next.js) | Bản đồ, trạng thái, cảnh báo, lịch sử |

**Mối liên hệ ràng buộc ↔ lựa chọn:**
- Ít xâm lấn → OBD-II BLE + SIM7600CE-T tích hợp
- Tiết kiệm điện → LIS3DSH + nhánh riêng + FreeRTOS ngủ/thức
- Ổn định truyền → MQTT TLS + lưu đệm SD + broker phân lớp
- Giao diện gọn → Web ưu tiên bản đồ + trạng thái + cảnh báo

*(Hình 3.6, 3.7)*

---

## PHẦN 4: TRIỂN KHAI THỰC TẾ

### Slide 11 – Triển khai phần cứng: Sơ đồ khối & Nguồn

**Sơ đồ khối thiết bị:**
- ESP32-S3 điều phối trung tâm
  - ↔ SIM7600CE-T (UART): truyền 4G + GNSS
  - ↔ vgate iCar Pro (BLE): đọc OBD-II
  - ↔ LIS3DSH (SPI): phát hiện chuyển động
  - ↔ DS3231M (I2C): thời gian thực
  - ↔ MicroSD (SPI): lưu đệm cục bộ

**Cấu trúc nguồn chia nhánh:**
- Xe 12–24V → MP2482 → Bus 5V
- Bus 5V → AP2112 → 3.3V (logic + cảm biến)
- Bus 5V → TPS54231 → ~4V (SIM7600CE-T riêng, chịu xung dòng)
- Bus 5V → TP5100 → sạc pin 18650
- Pin 18650 → SX1308 → 5V dự phòng (khi mất nguồn xe)

*(Hình 4.1, 4.2, 4.3, 4.4)*

---

### Slide 12 – Triển khai phần cứng: PCB & Nguyên mẫu

- Thiết kế PCB 2 lớp (Altium Designer)
- Chia cụm: xử lý / truyền thông / nguồn / cảm biến-lưu trữ
- Tuân thủ IPC-2221 + IEC 60664-1
- Vỏ ABS, kích thước 100×100×45 mm
- **Hình ảnh:**
  - Layout PCB mặt trước (Hình 4.5)
  - Bo mạch sau hàn lắp (Hình 4.6)
  - Lắp trong vỏ (Hình 4.7)
  - Thiết bị đóng vỏ hoàn chỉnh (Hình 4.8)
- Lắp trên xe: vgate cắm OBD-II, thiết bị đặt dưới táp-lô

---

### Slide 13 – Triển khai firmware

**Nền tảng:** ESP-IDF v5.2 + FreeRTOS

**Tổ chức pha vận hành:**
- Khởi động → nạp cấu hình, xác định trạng thái xe
- Xe chạy → thu OBD+GNSS+IMU, gửi bản tin 1s/lần
- Xe đỗ → ngủ sâu 120s, thức 10s kiểm tra, đánh thức bởi IMU
- Mất kết nối → lưu SD, gửi bù khi phục hồi

**Chức năng chính:**

| Chức năng | Nội dung |
|-----------|----------|
| Thu dữ liệu | Ghép OBD-II + GNSS + IMU + nguồn → 1 bản tin |
| Gửi bản tin | MQTT TLS, đến 1 giây/lần |
| Lưu đệm | SD card, ~2 triệu bản tin (~24 ngày) |
| Ngủ/thức | Thức 10s / ngủ 120s → công suất TB 0,082 W |
| OTA | Dual partition, quay lui khi lỗi, ~18–20s nạp |

*(Hình 4.9, 4.10, 4.11)*

---

### Slide 14 – Triển khai máy chủ

**Kiến trúc phân lớp:**
- EMQX (MQTT Broker TLS) → tiếp nhận bản tin
- MQTT Bridge → kiểm tra cấu trúc, phân luồng, chuẩn hóa
- Backend (Node.js) → xử lý nghiệp vụ, API REST + WebSocket
- Lưu trữ tách vai trò:
  - PostgreSQL → dữ liệu nghiệp vụ (thiết bị, xe, cảnh báo)
  - InfluxDB → dữ liệu chuỗi thời gian (telemetry)
  - Loki → nhật ký vận hành

**Triển khai:**
- Docker + Docker Compose (đóng gói từng dịch vụ)
- CI/CD: GitHub Actions → Docker Hub → VPS tự động
- Domain: thingdock.dev / api.thingdock.dev / mqtt.thingdock.dev

*(Hình 4.12, 4.13)*

---

### Slide 15 – Triển khai giao diện quản lý

**4 màn hình chính:**

1. **Danh sách thiết bị** (Hình 4.14)
   - Thẻ tổng hợp: online / chậm nhịp / mất kết nối
   - Bảng tra cứu + bộ lọc

2. **Bản đồ theo dõi** (Hình 4.15)
   - Vị trí xe real-time trên Leaflet
   - Panel trái: rà nhanh toàn đội
   - Panel phải: thông tin xe đang chọn

3. **Chi tiết thiết bị** (Hình 4.16)
   - Telemetry, OBD data, trạng thái kết nối
   - Kiểm tra sâu 1 xe cụ thể

4. **Hàng đợi cảnh báo** (Hình 4.17)
   - Lọc mức độ, nguồn, trạng thái
   - Xác nhận / đánh dấu đã xử lý
   - Tách riêng khỏi trang theo dõi

---

## PHẦN 5: SẢN PHẨM & KẾT QUẢ ĐO KIỂM

### Slide 16 – Kết quả kiểm thử phần cứng: Năng lượng

**Số đo tiêu thụ:**

| Chế độ | Kết quả |
|--------|---------|
| Hoạt động đầy đủ | ~1 W |
| Ngủ sâu | 0,5 mA @ 12V = 0,006 W |
| vgate iCar Pro | ~1,2 W (tự tắt sau 30 phút) |

**Thời gian duy trì khi xe đỗ (thức 10s, ngủ 120s):**

| Nguồn | Năng lượng | Thời gian |
|-------|-----------|-----------|
| Chỉ pin 18650 | 11,01 Wh | **5,6 ngày** |
| Pin + 20% ắc quy 45Ah | 102,81 Wh | **52 ngày** |
| Pin + toàn bộ ắc quy | 470,01 Wh | **237,5 ngày** |

→ Không gây hao điện đáng kể cho ắc quy xe

*(Hình 4.18)*

---

### Slide 17 – Kết quả kiểm thử firmware

**Mốc thời gian:**

| Kịch bản | Thời gian |
|----------|-----------|
| Khởi động lần đầu → sẵn sàng truyền | 12–18 s |
| Khởi động → bản tin định vị đầu tiên | 20–25 s |
| Đánh thức định kỳ (xe vẫn đỗ) | 2–4 s |
| Chuyển đỗ → chạy lại → có định vị | 6–10 s |

**OTA từ xa:** 817 KB, nạp 18–20s, hỗ trợ quay lui ✓  
**Lưu đệm offline:** ~2 triệu bản tin ≈ 24,3 ngày @ 1 bản tin/giây

---

### Slide 18 – Kết quả kiểm thử hệ thống

| Hạng mục | Kết quả |
|----------|---------|
| Độ trễ mạng di động | 120–180 ms |
| Phản hồi máy chủ | 95–200 ms |
| Cập nhật bản đồ | 1–2 s |
| Cảnh báo vượt vùng | 2–3 s |
| Tải đồng thời đã kiểm tra | **50 thiết bị** (~20–25% tải hệ thống) |

→ Phù hợp theo dõi hành trình và cảnh báo gần thời gian thực  
→ Còn khả năng mở rộng rất lớn

---

### Slide 19 – Đối chiếu toàn bộ mục tiêu

| Nhóm chỉ tiêu | Kết quả | Đánh giá |
|----------------|---------|----------|
| Nguồn 12–24 VDC, lắp trên xe | Ổn định, có dự phòng, PCB+vỏ hoàn chỉnh | ✅ Đạt |
| Thu dữ liệu OBD-II + GPS | Đọc qua BLE, nối lại ~4s | ✅ Đạt |
| Tiết kiệm năng lượng | Ngủ sâu 0,5 mA, duy trì 5,6 ngày bằng pin | ✅ Đạt |
| Truyền dữ liệu đủ sớm | Trễ 120–180 ms | ✅ Đạt |
| Cảnh báo | Vượt vùng 2–3s | ✅ Đạt |
| Chức năng khai thác | Quãng đường, thời gian, chi phí, cảnh báo | ✅ Đạt |
| Ổn định toàn tuyến | 50 thiết bị, tải <25% | ✅ Đạt |
| Chi phí < 20 triệu | **2.882.000 VND** | ✅ Đạt |

---

### Slide 20 – Đánh giá kinh tế

| Nhóm | Chi phí |
|------|---------|
| Điện tử & truyền thông | 1.760.000 |
| Nguồn & bảo vệ | 204.000 |
| PCB, vỏ & phụ kiện | 150.000 |
| **Chế tạo thiết bị** | **2.114.000 VND** |
| VPS 6 tháng | 720.000 |
| SIM dữ liệu 6 tháng | 48.000 |
| **Tổng cộng** | **2.882.000 VND** |

- Thấp hơn rất nhiều so với mục tiêu 20 triệu VND
- Mở rộng: chủ yếu thiết bị + SIM; VPS dùng chung nhiều xe
- Phù hợp đội xe nhỏ và vừa

---

## PHẦN 6: ĐÁNH GIÁ & ĐỀ XUẤT

### Slide 21 – Rủi ro & Biện pháp đã áp dụng

| Rủi ro | Biện pháp |
|--------|-----------|
| Mạng di động biến động | MQTT + lưu đệm SD + gửi bù tự động |
| Hao ắc quy khi xe đỗ lâu | Ngủ sâu + chia nhánh nguồn + chu kỳ thức ngắn |
| Cảnh báo giả khi xe dừng | Kết hợp trạng thái đỗ + IMU + mốc thời gian |
| Khác biệt OBD-II giữa dòng xe | Giữ nhóm tham số cơ bản, mở rộng cần kiểm tra |

---

### Slide 22 – Đề xuất hướng phát triển

1. **Kiểm chứng dài hạn trên xe thật** – xác nhận độ ổn định nguồn, OBD-II, GNSS trong vận hành liên tục
2. **Hoàn thiện lớp đối soát & báo cáo khai thác** – báo cáo theo chuyến, theo ngày, theo xe
3. **Mở rộng phạm vi tương thích** – kiểm tra trên nhiều dòng xe, đánh giá tập dữ liệu OBD-II khả dụng
4. **Tăng mức hoàn thiện triển khai** – bảo mật đường truyền, quản lý cấu hình từ xa, tối ưu năng lượng thêm

---

### Slide 23 – Kết luận

**Đã đạt được:**
- ✅ Nguyên mẫu hoàn chỉnh 3 phần: thiết bị + máy chủ + giao diện
- ✅ Lắp thử trên xe thật, đo kiểm phòng thí nghiệm + thực địa
- ✅ Tất cả chỉ tiêu thiết kế đều đạt
- ✅ Chi phí 2.882.000 VND (< 20 triệu mục tiêu)
- ✅ 50 thiết bị đồng thời, hệ thống còn dư khả năng mở rộng

**Giới hạn:**
- Mức nguyên mẫu – cần kiểm chứng dài hạn
- Phạm vi tương thích nhiều dòng xe cần mở rộng

**Ý nghĩa:**
- Nền tảng để tiếp tục hoàn thiện cho quản lý đội xe cho thuê quy mô nhỏ và vừa

---

### Slide 24 – Cảm ơn

**CẢM ƠN QUÝ THẦY CÔ VÀ HỘI ĐỒNG ĐÃ LẮNG NGHE!**

- Sinh viên: Lê Trọng An
- GVHD: TS. Nguyễn Đức Nam
- Source code: github.com/anmh1205/IoT_Vehicle_Tracking_System
- Demo: thingdock.dev (admin / Admin@2026)

---

## SLIDE DỰ PHÒNG (cho phần hỏi đáp)

### Slide B1 – Chi tiết ma trận đánh giá (khi hội đồng hỏi sâu)

**OBD-II:**

| Tiêu chí (trọng số) | ELM327 có dây | vgate iCar Pro |
|---------------------|---------------|----------------|
| Hạn chế can thiệp hệ điện (35%) | 3 | 5 |
| Tương thích nhiều dòng xe (30%) | 3 | 5 |
| Thuận tiện tháo lắp (20%) | 2 | 5 |
| Đáp ứng tham số quản lý (15%) | 4 | 4 |
| **Tổng** | **3,00** | **4,85** |

**Giám sát đỗ:**

| Tiêu chí (trọng số) | SW-420 + cấp chung | MPU6050 + khóa điện | LIS3DSH + nhánh riêng |
|---------------------|--------------------|--------------------|----------------------|
| Tiêu thụ khi đỗ (35%) | 2 | 2 | 5 |
| Đánh thức khi MCU ngủ (25%) | 2 | 4 | 4 |
| Tách modem khỏi nhánh cấp (25%) | 1 | 2 | 5 |
| An toàn ắc quy (15%) | 2 | 3 | 5 |
| **Tổng** | **1,75** | **2,65** | **4,75** |

---

### Slide B2 – Chi tiết MQTT Topic & Cảnh báo vượt vùng

**Topic structure:**
```
thingdock/{device_id}/telemetry   → vị trí, tốc độ, nguồn
thingdock/{device_id}/obd         → dữ liệu OBD-II
thingdock/{device_id}/event       → cảnh báo, sự kiện
thingdock/{device_id}/status      → trạng thái thiết bị
```

**Luồng cảnh báo vượt vùng:**
1. Thiết bị gửi tọa độ mới (1s/lần khi chạy)
2. Backend kiểm tra point-in-polygon với vùng cấu hình
3. Ngoài vùng → tạo alert → push WebSocket → giao diện
4. Tổng thời gian: **2–3 giây**

---

### Slide B3 – Chi tiết OTA & Mã lỗi OBD-II

**OTA dual partition:**
- factory (1536 KB) – bản gốc ổn định
- ota_0 / ota_1 (1536 KB mỗi vùng) – luân phiên nhận cập nhật
- Lỗi → tự quay về phân vùng trước

**Mã lỗi OBD-II đã hỗ trợ:**

| Mã DTC | Nhóm lỗi |
|--------|-----------|
| P0300–P0308 | Đánh lửa / misfire |
| P0100–P0104 | Cảm biến khí nạp |
| P0171, P0172, P0174 | Hỗn hợp nhiên liệu |
| P0420, P0430 | Bộ xúc tác khí thải |
| P0440–P0456 | Hệ thống EVAP |
| P0562, P0563 | Nguồn/ắc quy |
| P0700–P0740 | Hộp số |

---

## GHI CHÚ TỔNG HỢP

### Phân bổ thời gian

| Phần | Slide | Thời gian |
|------|-------|-----------|
| 1. Tổng quan vấn đề | 3 | ~1,5 phút |
| 2. Khảo sát & Mục tiêu | 4–6 | ~2 phút |
| 3. Phân tích & Giải pháp | 7–10 | ~3,5 phút |
| 4. Triển khai | 11–15 | ~4 phút |
| 5. Sản phẩm & Kết quả | 16–20 | ~3 phút |
| 6. Đánh giá & Đề xuất | 21–24 | ~1 phút |
| **Tổng** | **24 slide** | **~15 phút** |

### Hình ảnh cần chuẩn bị

| Slide | Hình | Nội dung |
|-------|------|----------|
| 7 | 3.1 | Nguyên lý chuyển hóa dữ liệu |
| 8 | 3.2, 3.3, 3.4, 3.5 | Nguyên lý từng phương án HW |
| 10 | 3.6, 3.7 | Kiến trúc tổng thể + ràng buộc ↔ lựa chọn |
| 11 | 4.1, 4.2, 4.3, 4.4 | Sơ đồ khối + nguồn |
| 12 | 4.5, 4.6, 4.7, 4.8 | PCB + nguyên mẫu |
| 13 | 4.9, 4.10, 4.11 | Flowchart firmware |
| 14 | 4.12, 4.13 | Kiến trúc máy chủ |
| 15 | 4.14, 4.15, 4.16, 4.17 | Giao diện |
| 16 | 4.18 | Dòng tiêu thụ |

### Mẹo trình bày

- Phần 3 (phân tích & giải pháp) và Phần 4 (triển khai) là trọng tâm → dành ~7,5 phút
- Bảng ma trận: chỉ nêu kết quả + 1 câu lý do, không đọc từng ô
- Slide 12: nếu có thiết bị thật → mang theo cho hội đồng xem
- Slide 15: demo live thingdock.dev hoặc video ngắn 30s
- Slide dự phòng (B1–B3): không trình bày, chỉ dùng khi hội đồng hỏi
- Giữ nhịp đều, không dừng quá lâu ở 1 slide
