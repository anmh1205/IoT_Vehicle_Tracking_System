# NỘI DUNG THUẦN CHO SLIDE BÁO CÁO TIẾN ĐỘ

Tài liệu này chỉ chứa nội dung trình bày để đưa vào slide báo cáo tiến độ. Nội dung bám theo trạng thái hiện tại của dự án:

- phần cứng đã hoàn thành ở mức `kiến trúc + schematic`
- `PCB` vẫn đang trong quá trình thực hiện
- `firmware`, `cloud`, `backend`, `frontend` đã được triển khai và tích hợp

---

## Slide 1. Bìa

### Tiêu đề

`BÁO CÁO TIẾN ĐỘ ĐỒ ÁN TỐT NGHIỆP`

### Nội dung

- Đề tài: `Hệ thống giám sát và theo dõi phương tiện sử dụng công nghệ IoT`
- Sinh viên thực hiện: `Nguyễn An Minh Hiếu`
- MSSV: `21127169`
- Giảng viên hướng dẫn: `TS. Phạm Đăng Khoa`
- Đơn vị: `Khoa Công nghệ Thông tin, Trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM`

### Hình ảnh

- có thể dùng nền tối giản
- không cần ảnh kỹ thuật ở slide này

---

## Slide 2. Bối cảnh và lý do thực hiện

### Tiêu đề

`Bối cảnh và lý do thực hiện đề tài`

### Nội dung

- Nhu cầu giám sát phương tiện theo thời gian thực ngày càng tăng trong quản lý đội xe, theo dõi hành trình và phát hiện bất thường.
- Nhiều giải pháp thương mại hiện có có chi phí tương đối cao, khả năng tùy biến thấp và khó can thiệp sâu vào kiến trúc kỹ thuật.
- Đề tài hướng đến xây dựng một hệ thống có khả năng theo dõi vị trí, đọc dữ liệu OBD2, cảnh báo bất thường và hiển thị trực tuyến trên dashboard.
- Ngoài bài toán ứng dụng, đề tài còn là cơ hội tích hợp nhiều lớp kỹ thuật: phần cứng nhúng, firmware, cloud, backend và frontend.

### Thông điệp chốt

- Mục tiêu của đề tài không chỉ là định vị GPS, mà là xây dựng một hệ thống giám sát phương tiện có kiến trúc hoàn chỉnh và có khả năng mở rộng.

### Hình ảnh

- `Hình 1.3 - Kiến trúc tổng thể hệ thống IoT Vehicle Tracking`
- file: `resources/reports/thesis-chapters/assets/figures/01-chuong-1-gioi-thieu-hinh-1-3.svg`

---

## Slide 3. Mục tiêu và phạm vi

### Tiêu đề

`Mục tiêu và phạm vi thực hiện`

### Nội dung

- Thiết kế thiết bị tracker tích hợp `ESP32-S3`, `LTE + GNSS`, `OBD2 BLE`, `IMU`, khối nguồn đa rail và pin dự phòng.
- Xây dựng firmware có khả năng giao tiếp với OBD2, modem, IMU, truyền dữ liệu qua `MQTT` và hỗ trợ quản lý trạng thái vận hành.
- Xây dựng hạ tầng cloud và backend để tiếp nhận, xử lý, lưu trữ và phân phối dữ liệu thời gian thực.
- Xây dựng dashboard web để giám sát vị trí, cảnh báo, geofence và dữ liệu telemetry.
- Phạm vi báo cáo tiến độ hiện tại: phần mềm và hạ tầng đã triển khai; phần cứng đang hoàn thành đến mức schematic và tiếp tục sang PCB.

### Hình ảnh

- `Hình 1.4 - Sơ đồ chuyển đổi giữa các chế độ năng lượng`
- file: `resources/reports/thesis-chapters/assets/figures/01-chuong-1-gioi-thieu-hinh-1-4.svg`

---

## Slide 4. Kiến trúc tổng thể hệ thống

### Tiêu đề

`Kiến trúc tổng thể hệ thống`

### Nội dung

- Lớp thiết bị tracker gồm `ESP32-S3`, `SIM7600CE-T`, `LIS3DH`, `vgate iCar Pro BLE` và khối nguồn.
- Thiết bị gửi dữ liệu lên `EMQX` bằng `MQTT 5.0`.
- `MQTT Bridge` tiếp nhận dữ liệu và thực hiện phân luồng đến các lớp lưu trữ.
- `PostgreSQL` lưu dữ liệu quan hệ; `VictoriaMetrics` lưu telemetry chuỗi thời gian; `VictoriaLogs` lưu log sự kiện.
- `Backend API` cung cấp REST API và realtime qua `Socket.IO`.
- `Frontend Dashboard` hiển thị bản đồ, biểu đồ, trạng thái thiết bị và cảnh báo.

### Thông điệp chốt

- Kiến trúc được tổ chức theo lớp rõ ràng, giúp tách biệt ingest dữ liệu, xử lý nghiệp vụ, lưu trữ và hiển thị.

### Hình ảnh

- `Hình 1.3 - Kiến trúc tổng thể hệ thống IoT Vehicle Tracking`
- file: `resources/reports/thesis-chapters/assets/figures/01-chuong-1-gioi-thieu-hinh-1-3.svg`
- `Hình 4.1 - Sơ đồ khối tổng thể hệ thống tracker IoT`
- file: `resources/reports/thesis-chapters/assets/figures/07-chuong-4-trien-khai-hardware-hinh-4-1.svg`

---

## Slide 5. Tiến độ tổng thể của dự án

### Tiêu đề

`Tiến độ tổng thể của dự án`

### Nội dung

| Hạng mục | Trạng thái hiện tại | Ghi chú |
| --- | --- | --- |
| Phân tích yêu cầu và kiến trúc | Hoàn thành | Đã chốt bài toán, mục tiêu, kiến trúc nhiều lớp |
| Phần cứng | Đang thực hiện | Đã hoàn thành schematic, đang triển khai PCB |
| Firmware | Hoàn thành ở mức triển khai | Đã có BLE OBD2, modem, IMU, MQTT, state machine, OTA cơ bản |
| Cloud và broker | Hoàn thành | Đã triển khai EMQX, VictoriaMetrics, VictoriaLogs, PostgreSQL bằng Docker |
| Backend API | Hoàn thành | Đã có domain chính và realtime WebSocket |
| Frontend Dashboard | Hoàn thành | Đã có dashboard, bản đồ, cảnh báo, geofence, biểu đồ |

### Thông điệp chốt

- Trọng tâm phần việc còn lại nằm ở hoàn thiện bo mạch PCB và bước bring-up phần cứng thực tế.

### Hình ảnh

- có thể dùng timeline hoặc progress chart tự dựng

---

## Slide 6. Lựa chọn giải pháp phần cứng

### Tiêu đề

`Lựa chọn giải pháp phần cứng`

### Nội dung

#### 1. So sánh vi điều khiển

| Tiêu chí | ESP32-S3 | STM32L4 | nRF52840 |
| --- | --- | --- | --- |
| Kiến trúc | Xtensa LX7 dual-core, 240 MHz | ARM Cortex-M4, 80 MHz | ARM Cortex-M4F, 64 MHz |
| BLE tích hợp | Có | Không | Có |
| Wi-Fi tích hợp | Có | Không | Không phải lợi thế chính |
| Deep sleep mức MCU | 10–15 µA | 1–2 µA | Dưới µA tùy cấu hình |
| Độ phù hợp cho tracker hiện tại | Cao | Trung bình | Trung bình |

Kết luận:

- `ESP32-S3` được chọn vì có `BLE` tích hợp, đủ tài nguyên cho `OBD2 BLE + modem + IMU + MQTT`, hệ sinh thái `ESP-IDF` mạnh và chi phí phù hợp.

#### 2. So sánh phương án LTE + GNSS

| Tiêu chí | A7670C + NEO-M8N | EC200U-CN + NEO-M8N | SIM7600CE-T |
| --- | --- | --- | --- |
| Số module | 2 | 2 | 1 |
| LTE category | Cat-1 | Cat-1 | Cat-4 |
| GNSS tích hợp | Không | Tùy biến thể | Có |
| Mức độ gọn của kiến trúc | Trung bình | Trung bình | Cao |
| Phù hợp với firmware hiện tại | Trung bình | Trung bình | Cao |

Kết luận:

- `SIM7600CE-T` được chọn vì tích hợp `LTE + GNSS`, giảm phần cứng rời, đi dây gọn hơn và phù hợp với pin mapping hiện tại.

#### 3. So sánh phương án kết nối OBD2

| Tiêu chí | OBD2 có dây | OBD2 BLE |
| --- | --- | --- |
| Kết nối vật lý | Cần dây nối giữa tracker và cổng OBD2 | Không cần dây |
| Tài nguyên MCU | Chiếm thêm UART | Tận dụng BLE của ESP32-S3 |
| Tính linh hoạt lắp đặt | Thấp hơn | Cao hơn |
| Phù hợp với kiến trúc hiện tại | Trung bình | Cao |

Kết luận:

- Chọn `vgate iCar Pro BLE` để giảm đi dây và giữ UART cho modem và debug.

#### 4. Các khối phần cứng đã chốt

- `ESP32-S3` làm MCU trung tâm
- `SIM7600CE-T` cho `LTE + GNSS`
- `vgate iCar Pro BLE` cho OBD2
- `LIS3DH` cho phát hiện rung động
- khối nguồn đa rail, pin dự phòng 21700 1S và `LVD`

### Hình ảnh

- `Hình 4.1 - Sơ đồ khối tổng thể hệ thống tracker IoT`
- file: `resources/reports/thesis-chapters/assets/figures/07-chuong-4-trien-khai-hardware-hinh-4-1.svg`
- `Hình 3.2 - Sơ đồ kết nối BLE giữa ESP32-S3 và vgate iCar Pro`
- file: `resources/reports/thesis-chapters/assets/figures/03-chuong-3-giai-phap-phan-cung-hinh-3-2.svg`

---

## Slide 7. Tiến độ phần cứng hiện tại

### Tiêu đề

`Tiến độ phần cứng: hoàn thành schematic, đang thực hiện PCB`

### Nội dung

#### Đã hoàn thành

- sơ đồ khối tổng thể của tracker
- sơ đồ kết nối `ESP32-S3`, `SIM7600CE-T`, `LIS3DH`, khối đo điện áp và quản lý nguồn
- kiến trúc kết nối `ESP32-S3 ↔ vgate iCar Pro BLE`
- schematic tổng thể của bo mạch

#### Đang thực hiện

- hoàn thiện footprint còn thiếu
- bố trí linh kiện theo từng miền chức năng
- đi dây PCB
- kiểm tra `ERC/DRC`
- chuẩn bị file sản xuất

#### Chưa trình bày như kết quả đã đạt

- đo tiêu thụ điện trên bo thật
- đo ổn định GNSS / 4G trên bo PCB cuối
- kết quả nhiệt độ, rung, EMI/EMC
- kết quả thử nghiệm dài hạn trên xe

### Thông điệp chốt

- Phần cứng hiện mới hoàn tất đến mức schematic; `PCB` và `prototype phần cứng` vẫn đang trong quá trình thực hiện.

### Hình ảnh

- ảnh schematic hiện tại
- ảnh PCB layout hiện tại nếu đã có
- hoặc:
  - `Hình 4.1 - Sơ đồ khối tổng thể hệ thống tracker IoT`
  - file: `resources/reports/thesis-chapters/assets/figures/07-chuong-4-trien-khai-hardware-hinh-4-1.svg`

---

## Slide 8. Lựa chọn firmware và kết quả triển khai

### Tiêu đề

`Lựa chọn nền tảng firmware và kết quả triển khai`

### Nội dung

#### So sánh nền tảng firmware

| Tiêu chí | Arduino + Superloop | ESP-IDF + FreeRTOS | Zephyr RTOS |
| --- | --- | --- | --- |
| Độ dễ bắt đầu | Cao | Trung bình | Trung bình đến khó |
| Driver cho ESP32-S3 | Có | Chính thức và đầy đủ | Có nhưng kém thực chiến hơn cho bài toán này |
| Đa nhiệm và đồng bộ tài nguyên | Hạn chế | Tốt | Tốt |
| Phù hợp với BLE OBD2 + modem + IMU | Trung bình | Cao | Trung bình |
| Độ phù hợp với dự án | Trung bình | Cao nhất | Trung bình |

Kết luận:

- Chọn `ESP-IDF + FreeRTOS`.

#### Kết quả đã triển khai

- giao tiếp BLE với OBD2 adapter
- điều khiển modem `SIM7600CE-T` qua UART và AT command
- đọc dữ liệu GNSS
- đọc dữ liệu `LIS3DH`
- quản lý trạng thái vận hành
- truyền dữ liệu lên broker qua `MQTT`
- state machine
- reconnect `MQTT`
- luồng `OTA` cơ bản

### Thông điệp chốt

- Phần firmware đã được xây dựng trên nền tảng phù hợp với `ESP32-S3` và đã hỗ trợ các chức năng cốt lõi của thiết bị.

### Hình ảnh

- `Hình 3.5 - Sơ đồ kiến trúc phân lớp của firmware`
- file: `resources/reports/thesis-chapters/assets/figures/04-chuong-3-giai-phap-firmware-hinh-3-5.svg`

---

## Slide 9. Lựa chọn cloud/backend và kết quả triển khai

### Tiêu đề

`Lựa chọn kiến trúc cloud/backend và kết quả triển khai`

### Nội dung

#### 1. So sánh giao thức truyền thông

| Tiêu chí | MQTT | HTTP/REST | CoAP |
| --- | --- | --- | --- |
| Mô hình | Publish/Subscribe | Request/Response | Request/Response |
| Tầng giao vận | TCP | TCP | UDP |
| Overhead | Thấp | Cao | Thấp |
| QoS | Có 3 mức | Không native | Có 2 mức |
| Hỗ trợ hai chiều | Tốt | Cần bổ sung WebSocket | Có |
| Phù hợp cho IoT | Rất tốt | Trung bình | Tốt |

Kết luận:

- Chọn `MQTT` vì nhẹ, có `QoS`, phù hợp ingest dữ liệu liên tục và hỗ trợ tốt với `EMQX`.

#### 2. So sánh MQTT Broker

| Tiêu chí | Mosquitto | EMQX | HiveMQ | VerneMQ |
| --- | --- | --- | --- | --- |
| Kết nối đồng thời | ~1.000 | ~100.000.000 | ~200.000.000 | ~10.000.000 |
| Thông lượng | 40K msg/s | 100K msg/s | 200K msg/s | 50K msg/s |
| Dashboard | Hạn chế | Có | Có | Có |
| Clustering | Không | Có | Có | Có |
| Chi phí | Miễn phí | Miễn phí / trả phí | Thường trả phí | Miễn phí / trả phí |

Kết luận:

- Chọn `EMQX Single Node` cho giai đoạn hiện tại vì hiệu năng cao, có dashboard và có thể mở rộng về sau.

#### 3. So sánh lưu trữ dữ liệu

| Tiêu chí | PostgreSQL only | TSDB only | PostgreSQL + VictoriaMetrics |
| --- | --- | --- | --- |
| Dữ liệu quan hệ | Tốt | Yếu | Rất tốt |
| Dữ liệu telemetry | Trung bình | Rất tốt | Rất tốt |
| Nén dữ liệu | Trung bình | Tốt | `VictoriaMetrics` khoảng `10–70x` |
| Phân tách trách nhiệm | Thấp | Thấp | Cao |

Kết luận:

- Chọn `PostgreSQL + VictoriaMetrics` vì vừa đáp ứng nghiệp vụ quan hệ, vừa tối ưu cho telemetry thời gian thực.

#### 4. Kết quả đã triển khai

- triển khai `EMQX`, `PostgreSQL`, `VictoriaMetrics`, `VictoriaLogs` bằng Docker
- triển khai `MQTT Bridge` để xác thực payload và `dual-write`
- triển khai `Backend API` theo hướng domain rõ ràng: `vehicles`, `devices`, `telemetry`, `alerts`, `geofences`
- có xác thực phiên, `MQTT ACL per device`, `Socket.IO realtime`

### Hình ảnh

- `Hình 3.12 - Sơ đồ kiến trúc tổng quan hệ thống Cloud`
- file: `resources/reports/thesis-chapters/assets/figures/05-chuong-3-giai-phap-backend-hinh-3-12.svg`
- `Hình 3.13 - Sơ đồ chiến lược lưu trữ kép`
- file: `resources/reports/thesis-chapters/assets/figures/05-chuong-3-giai-phap-backend-hinh-3-13.svg`
- có thể thay bằng:
  - `Hình 4.20 - Luồng xử lý dữ liệu của MQTT Bridge`
  - file: `resources/reports/thesis-chapters/assets/figures/09-chuong-4-trien-khai-cloud-hinh-4-17.svg`

---

## Slide 10. Lựa chọn frontend và kết quả triển khai

### Tiêu đề

`Lựa chọn công nghệ frontend và kết quả triển khai dashboard`

### Nội dung

#### 1. So sánh framework frontend

| Tiêu chí | Next.js 15 + React 19 | Nuxt 3 | Vite + React |
| --- | --- | --- | --- |
| SSR / hybrid rendering | Mạnh | Mạnh | Cần tự lắp ghép thêm |
| Tổ chức app lớn | Tốt | Tốt | Linh hoạt nhưng ít opinionated hơn |
| Hệ sinh thái dashboard | Rất mạnh | Tốt | Mạnh |
| Phù hợp với hệ thống hiện tại | Cao nhất | Trung bình | Trung bình |

Kết luận:

- Chọn `Next.js 15 + React 19`.

#### 2. So sánh thư viện bản đồ

| Tiêu chí | Leaflet | Mapbox GL JS | Google Maps JS API |
| --- | --- | --- | --- |
| Giấy phép | Mã nguồn mở | Thương mại / usage-based | Thương mại / usage-based |
| Dễ tích hợp | Rất dễ | Trung bình | Dễ |
| Tùy biến marker / layer / geofence | Tốt | Rất mạnh | Tốt |
| Áp lực chi phí cho đồ án | Thấp nhất | Có | Có |

Kết luận:

- Chọn `Leaflet` vì đủ cho tracking 2D thời gian thực, dễ tích hợp và không tạo áp lực chi phí thư viện.

#### 3. Kết quả đã triển khai

- `Next.js 15`, `React 19`, `TypeScript`, `Tailwind CSS`
- `Leaflet` cho bản đồ
- `ECharts` cho biểu đồ
- `Socket.IO Client` cho realtime
- dashboard tổng quan
- bản đồ thời gian thực
- quản lý cảnh báo
- geofence
- trang quản lý xe, thiết bị, khách hàng, chuyến đi

### Hình ảnh

- `Hình 3.20 - Giao diện trang bản đồ thời gian thực với các marker xe`
- file: `resources/reports/thesis-chapters/assets/figures/06-chuong-3-giai-phap-frontend-hinh-3-20.svg`
- `Hình 4.23 - Giao diện trang Dashboard tổng quan`
- file: `resources/reports/thesis-chapters/assets/figures/09-chuong-4-trien-khai-cloud-hinh-4-20.svg`
- `Hình 4.26 - Giao diện trang quản lý cảnh báo`
- file: `resources/reports/thesis-chapters/assets/figures/09-chuong-4-trien-khai-cloud-hinh-4-23.svg`

---

## Slide 11. Kết quả tích hợp phần mềm và hạ tầng

### Tiêu đề

`Kết quả tích hợp phần mềm và hạ tầng`

### Nội dung

#### Pipeline tích hợp

`Device -> EMQX -> MQTT Bridge -> Database -> Backend -> Frontend`

#### Các kết quả nổi bật

- `VictoriaMetrics throughput ~12.000 điểm/giây`
- `WebSocket latency nội bộ ~35 ms`
- `First Contentful Paint của Dashboard ~1.2 giây`
- `Bản đồ cập nhật thời gian thực ~1–2 giây`
- `Backend uptime 7 ngày ~99.6%`
- hệ thống hỗ trợ `50+ phương tiện đồng thời`

### Thông điệp chốt

- Các chỉ số trên phản ánh kết quả tích hợp của `firmware + cloud + backend + frontend`, không đồng nghĩa với việc `PCB` tùy chỉnh đã hoàn tất và được kiểm thử đầy đủ.

### Hình ảnh

- `Hình 3.12a - Luồng dữ liệu chi tiết từ thiết bị đến dashboard`
- file: `resources/reports/thesis-chapters/assets/figures/thesis-99-bao-cao-thesis-hoan-chinh-04.svg`
- `Hình 4.23 - Giao diện trang Dashboard tổng quan`
- file: `resources/reports/thesis-chapters/assets/figures/09-chuong-4-trien-khai-cloud-hinh-4-20.svg`
- `Hình 4.25 - Giao diện bản đồ thời gian thực với vị trí các xe`
- file: `resources/reports/thesis-chapters/assets/figures/09-chuong-4-trien-khai-cloud-hinh-4-22.svg`

---

## Slide 12. Phần còn lại cần hoàn thiện

### Tiêu đề

`Phần việc còn lại: hoàn thiện PCB, chế tạo prototype và bring-up`

### Nội dung

#### Giai đoạn 1. Hoàn thiện PCB

- hoàn tất footprint còn thiếu
- bố trí linh kiện theo miền nguồn, RF, digital
- đi dây tín hiệu và nguồn

#### Giai đoạn 2. Kiểm tra thiết kế

- chạy `ERC/DRC`
- rà soát trace, via, clearance, return path
- rà soát đầu nối anten, SIM, nguồn, debug

#### Giai đoạn 3. Chuẩn bị sản xuất

- xuất `Gerber`
- xuất `BOM`
- xuất `Pick and Place`

#### Giai đoạn 4. Bring-up phần cứng

- kiểm tra các rail nguồn
- kiểm tra boot `ESP32-S3`
- kiểm tra UART modem, I2C IMU, ADC, BLE

#### Giai đoạn 5. Kiểm thử phần cứng thực tế

- GNSS / 4G
- tiêu thụ điện
- độ ổn định nguồn
- vận hành thực tế trên xe

### Thông điệp chốt

- Phần việc còn lại của dự án tập trung ở bước chuyển từ `schematic` sang `prototype phần cứng`.

### Hình ảnh

- ảnh PCB layout hiện tại
- ảnh schematic hiện tại

---

## Slide 13. Kết luận

### Tiêu đề

`Kết luận`

### Nội dung

- Dự án đã hoàn thiện phần lớn các thành phần `firmware`, `cloud`, `backend` và `frontend`.
- Kiến trúc hệ thống đã được xây dựng và các khối phần mềm đã tích hợp thành pipeline vận hành rõ ràng.
- Phần cứng đã hoàn thành ở mức `kiến trúc + schematic`.
- `PCB` là hạng mục đang tiếp tục triển khai.
- Giai đoạn tiếp theo tập trung vào `PCB -> prototype -> bring-up -> kiểm thử phần cứng thực tế`.

### Câu kết

- Dự án đã có nền tảng phần mềm và hạ tầng tương đối hoàn chỉnh; trọng tâm tiếp theo là hiện thực hóa bo mạch PCB và xác minh hoạt động trên thiết bị thật.
