# PROMPT NGUỒN CỰC CHI TIẾT ĐỂ TẠO SLIDE BÁO CÁO TIẾN ĐỘ

Tài liệu này không chỉ là outline.  
Mục tiêu của file là đóng vai trò như một `prompt-spec nguồn` thật chi tiết để bạn có thể:

- đưa nguyên file này cho một AI khác
- yêu cầu AI đó tạo `slide deck`, `HTML slides`, `PowerPoint`, `Google Slides outline`, hoặc `speaker notes`
- bảo đảm AI đó không hiểu sai trạng thái hiện tại của đề tài
- bảo đảm AI đó bám đúng `nội dung chính`, `giọng điệu học thuật`, `ít màu mè`, `không pitch deck`

---

## 0. Cách dùng file này

Bạn có thể dùng file theo 3 cách:

### Cách 1. Dùng nguyên file làm context

Đưa toàn bộ file này cho AI khác rồi nói:

> Hãy đọc kỹ toàn bộ tài liệu prompt-spec này và tạo cho tôi một bộ slide báo cáo tiến độ theo đúng các ràng buộc nội dung, tone, hình ảnh và trạng thái dự án được mô tả trong file. Không tự ý suy diễn vượt quá các thông tin đã cho.

### Cách 2. Dùng riêng phần `Prompt copy-paste`

Kéo xuống mục `## 1. Prompt copy-paste hoàn chỉnh` rồi copy nguyên khối prompt đó cho AI khác.

### Cách 3. Dùng riêng phần `slide-by-slide`

Nếu AI khác đã có sẵn template slide, bạn chỉ cần đưa:

- mục `## 2. Sự thật bắt buộc phải giữ đúng`
- mục `## 3. Yêu cầu phong cách thiết kế`
- mục `## 5. Đặc tả cực chi tiết cho từng slide`
- mục `## 7. Nguồn dữ liệu so sánh và số liệu cần giữ đúng`
- mục `## 8. Mapping hình ảnh: số hình trong thesis + đường dẫn file`

---

## 1. Prompt copy-paste hoàn chỉnh

Copy nguyên khối dưới đây để đưa cho AI khác:

```text
Bạn là AI chuyên tạo slide báo cáo tiến độ đồ án tốt nghiệp.

Hãy tạo một bộ slide báo cáo tiến độ cho đề tài:
"Thiết kế hệ thống IoT cho ứng dụng quản lý phương tiện giao thông trong lĩnh vực cho thuê xe tự lái".

Yêu cầu cực kỳ quan trọng:

1. Đây là "báo cáo tiến độ", KHÔNG phải "slide bảo vệ cuối cùng", KHÔNG phải "pitch deck startup", KHÔNG phải "landing page".
2. Phải dùng tiếng Việt học thuật, nghiêm túc, ngắn gọn, chính xác kỹ thuật.
3. Tránh màu mè, tránh quá nhiều hiệu ứng, tránh ngôn ngữ quảng bá.
4. Phải bám đúng trạng thái hiện tại của dự án:
   - Phần cứng mới hoàn thành schematic.
   - PCB chưa hoàn thành.
   - Chưa được trình bày như thể đã có prototype phần cứng hoàn chỉnh.
   - Chưa được trình bày như thể đã có đầy đủ đo kiểm phần cứng thật.
   - Firmware, cloud, backend, frontend đã hoàn thành theo nội dung thesis 99.
5. Phải làm nổi bật rằng:
   - phần mềm và hạ tầng đã hoàn thành phần lớn
   - phần việc còn lại tập trung chủ yếu ở PCB phần cứng
6. Trong các slide "chọn giải pháp", bắt buộc phải có:
   - các phương án so sánh
   - thông số hoặc tiêu chí so sánh
   - ưu điểm
   - hạn chế
   - lý do chọn phương án cuối cùng
7. Không được tự bịa kết quả kiểm thử phần cứng thật nếu tài liệu không cho phép khẳng định.
8. Chỉ dùng các số liệu phần mềm/hạ tầng đã có trong thesis để minh họa cho phần đã hoàn thành.

Phong cách thiết kế mong muốn:

- học thuật
- sạch
- trang nhã
- ít màu
- không flashy
- không startup-like
- không gradient quá mạnh
- không icon hoạt hình
- không dùng ngôn ngữ cường điệu kiểu "đột phá", "revolutionary", "powerful"

Số lượng slide:
- 13 slide

Cấu trúc bắt buộc:
1. Bìa
2. Bối cảnh và lý do thực hiện
3. Mục tiêu và phạm vi
4. Kiến trúc tổng thể hệ thống
5. Tiến độ tổng thể của dự án
6. Lựa chọn giải pháp phần cứng
7. Tiến độ phần cứng hiện tại
8. Lựa chọn nền tảng firmware và kết quả triển khai
9. Lựa chọn cloud/backend và kết quả triển khai
10. Lựa chọn frontend và kết quả triển khai
11. Kết quả tích hợp phần mềm và hạ tầng
12. Phần việc còn lại / kế hoạch tiếp theo
13. Kết luận

Ràng buộc nội dung rất quan trọng:

- Slide 6 phải thể hiện rõ so sánh:
  - ESP32-S3 vs STM32L4 vs nRF52840
  - A7670C + NEO-M8N vs EC200U-CN + NEO-M8N vs SIM7600CE-T
  - OBD2 có dây UART vs OBD2 BLE (vgate iCar Pro)
- Slide 8 phải thể hiện rõ so sánh:
  - Arduino Core + Superloop
  - ESP-IDF + FreeRTOS
  - Zephyr RTOS trên ESP32
- Slide 9 phải thể hiện rõ so sánh:
  - MQTT vs HTTP/REST vs CoAP
  - Mosquitto vs EMQX vs HiveMQ vs VerneMQ
  - PostgreSQL only vs Time-series only vs Hybrid DB
- Slide 10 phải thể hiện rõ so sánh:
  - Next.js 15 vs Nuxt 3 vs Vite + React
  - Leaflet vs Mapbox GL JS vs Google Maps JS API
- Slide 11 chỉ dùng các số liệu phần mềm/hạ tầng như:
  - VictoriaMetrics throughput ~12.000 điểm/giây
  - WebSocket latency nội bộ ~35 ms
  - Dashboard FCP < 2 giây
  - Bản đồ realtime cập nhật ~1-2 giây
  - Backend uptime 7 ngày ~99.6%
- Slide 12 phải nhấn mạnh:
  - PCB layout
  - DRC/ERC
  - xuất file sản xuất
  - lắp ráp prototype
  - bring-up phần cứng
  - sau đó mới đến đo kiểm thực nghiệm

Tone ngôn ngữ:
- khách quan
- học thuật
- ngắn gọn
- kỹ thuật
- tránh từ ngữ quảng bá
- tránh viết quá văn vẻ

Tone trình bày hình ảnh:
- ưu tiên ảnh kiến trúc, sơ đồ khối, ảnh giao diện thật, ảnh sơ đồ kết nối
- không lạm dụng icon minh họa chung chung
- nếu dùng ảnh từ thesis thì ưu tiên ghi đúng số hình trong thesis và dùng đúng file SVG tương ứng

Đầu ra mong muốn:
- slide có title rõ ràng
- mỗi slide có 3-6 ý chính
- các slide so sánh phải nhìn ra ngay "phương án nào được chọn" và "vì sao chọn"
- toàn bộ bộ slide phải toát lên rằng đây là báo cáo tiến độ trung thực, không tô hồng phần phần cứng
```

---

## 2. Sự thật bắt buộc phải giữ đúng

Đây là `ground truth`.  
AI khác `không được phép` nói trái với các ý sau.

### 2.1. Trạng thái hiện tại của dự án

- `Phần cứng`
  - đã hoàn thành `lựa chọn giải pháp phần cứng`
  - đã hoàn thành `schematic`
  - đang thực hiện `PCB layout`
  - `chưa` được xem như đã có bo mạch hoàn chỉnh
  - `chưa` được xem như đã có prototype hoàn chỉnh
  - `chưa` được trình bày như thể đã đo kiểm toàn bộ thông số trên thiết bị thật

- `Firmware`
  - đã hoàn thành theo nội dung thesis 99

- `Cloud / Backend / Frontend`
  - đã hoàn thành theo nội dung thesis 99

### 2.2. Điều được phép nói

- đã chốt phương án thiết kế phần cứng
- đã hoàn thành sơ đồ nguyên lý
- đã hoàn thành các khối phần mềm và hạ tầng
- hệ thống phần mềm và hạ tầng đã có thể trình bày là đã tích hợp và vận hành theo thesis 99
- phần việc còn lại tập trung chủ yếu ở PCB và bring-up phần cứng

### 2.3. Điều không được phép nói

- không nói như thể `toàn bộ phần cứng` đã hoàn thành
- không nói như thể `PCB đã xong`
- không nói như thể `đã có full prototype tested`
- không dùng kết quả đo kiểm phần cứng thật để khẳng định các chỉ tiêu mà hiện tại chưa đủ cơ sở

### 2.4. Thông điệp trung tâm phải giữ xuyên suốt

1. `Về tổng thể`, dự án đã hoàn thành phần lớn các hạng mục ở phía firmware, cloud, backend và frontend.
2. `Điểm còn dang dở lớn nhất ở hiện tại` nằm ở phần PCB phần cứng và các bước sau PCB như lắp ráp, bring-up, đo kiểm phần cứng thật.

---

## 3. Yêu cầu phong cách thiết kế

Phong cách bắt buộc:

- học thuật
- nghiêm túc
- gọn
- sáng sủa
- tiết chế màu sắc
- ít hiệu ứng
- ưu tiên nội dung hơn trang trí

Phong cách không mong muốn:

- startup pitch deck
- landing page
- quảng bá sản phẩm
- quá nhiều gradient
- quá nhiều icon
- quá nhiều motion

Ngôn ngữ nên dùng:

- "đã hoàn thành"
- "đang triển khai"
- "được lựa chọn vì"
- "ưu điểm"
- "hạn chế"
- "phù hợp với"
- "ở giai đoạn hiện tại"

Ngôn ngữ nên tránh:

- "đột phá"
- "ấn tượng"
- "siêu tối ưu"
- "revolutionary"
- "powerful"

---

## 4. Đầu ra mong muốn từ AI khác

Đầu ra cuối cùng phải có đủ:

- `13 slide`
- tiếng Việt
- đúng giọng học thuật
- các slide so sánh có `phương án / ưu điểm / hạn chế / lý do chọn`
- các slide tiến độ có `đã xong / đang làm / chưa làm`
- có chỉ ra `phần không nên khẳng định` đối với phần cứng
- có chỉ rõ `phần mềm/hạ tầng đã hoàn thành`
- có gợi ý dùng đúng ảnh từ thesis

---

## 5. Đặc tả cực chi tiết cho từng slide

Khuyến nghị:

- `13 slide`
- `12-15 phút`
- tỷ lệ `16:9`

### Slide 1. Bìa

#### Mục tiêu của slide

- xác định đây là `báo cáo tiến độ`
- xác định đúng tên đề tài
- xác định đúng thông điệp: phần mềm/hạ tầng đã xong, phần cứng còn PCB

#### Title nên dùng

`BÁO CÁO TIẾN ĐỘ ĐỒ ÁN TỐT NGHIỆP`

#### Subtitle nên dùng

`Thiết kế hệ thống IoT cho ứng dụng quản lý phương tiện giao thông trong lĩnh vực cho thuê xe tự lái`

#### Nội dung bắt buộc

- họ tên sinh viên
- giảng viên hướng dẫn
- đơn vị / khoa / trường
- thời điểm báo cáo
- dòng tóm tắt trạng thái:
  - `Phần mềm và hạ tầng đã hoàn thành`
  - `Phần cứng đã xong schematic, đang triển khai PCB`

### Slide 2. Bối cảnh và lý do thực hiện

#### Title nên dùng

`Bối cảnh và lý do thực hiện đề tài`

#### Nội dung bắt buộc

- dịch vụ cho thuê xe tự lái cần theo dõi vị trí, trạng thái và lịch sử vận hành phương tiện theo thời gian thực
- nhu cầu không chỉ dừng ở GPS mà còn là OBD2, cảnh báo bất thường, geofence, giám sát đội xe
- giải pháp thương mại hiện có thường đắt, khó tùy biến, khó mở rộng theo nhu cầu riêng
- đề tài hướng tới một hệ thống mở, chi phí hợp lý, có thể phát triển thành nền tảng quản lý phương tiện

### Slide 3. Mục tiêu và phạm vi

#### Title nên dùng

`Mục tiêu và phạm vi thực hiện`

#### Nội dung bắt buộc

- thiết kế thiết bị tracker thu GNSS, OBD2 và dữ liệu chuyển động
- xây dựng firmware điều phối thiết bị và quản lý năng lượng
- xây dựng hạ tầng cloud tiếp nhận, lưu trữ và xử lý dữ liệu
- xây dựng backend API và dashboard web
- hỗ trợ geofence, cảnh báo bất thường, điều khiển và OTA
- dòng giới hạn:
  - `Trong giai đoạn hiện tại, phần cứng chưa hoàn tất ở mức PCB final; các phần còn lại đã được triển khai theo nội dung thesis 99.`

### Slide 4. Kiến trúc tổng thể hệ thống

#### Title nên dùng

`Kiến trúc tổng thể hệ thống`

#### Nội dung bắt buộc

- `Lớp thiết bị`: tracker thu GNSS, OBD2, trạng thái nguồn và IMU
- `Lớp truyền thông`: dữ liệu đi qua 4G/LTE bằng MQTT 5.0 lên EMQX
- `Lớp xử lý`: MQTT Bridge phân luồng sang PostgreSQL, VictoriaMetrics, VictoriaLogs và backend
- `Lớp ứng dụng`: dashboard web Next.js dùng REST API và WebSocket

#### Hình ảnh bắt buộc ưu tiên

- `Trong thesis`: `Hình 1.3 - Kiến trúc tổng thể hệ thống IoT Vehicle Tracking`
- `SVG`: `assets/figures/01-chuong-1-gioi-thieu-hinh-1-3.svg`

### Slide 5. Tiến độ tổng thể của dự án

#### Mục tiêu của slide

- đưa ra cái nhìn nhanh về trạng thái của từng lớp
- làm rõ phần nào xong, phần nào chưa

#### Title nên dùng

`Tiến độ tổng thể của dự án`

#### Nội dung bắt buộc

- `Phần cứng tracker`: đã hoàn thành lựa chọn phương án phần cứng và sơ đồ nguyên lý, đang triển khai PCB
- `Firmware`: đã phát triển các module chính trên ESP-IDF / FreeRTOS
- `Cloud infrastructure`: đã triển khai EMQX, PostgreSQL, VictoriaMetrics, VictoriaLogs, Grafana
- `Backend API`: đã xây dựng REST API, WebSocket, xác thực phiên và OTA orchestration
- `Frontend`: đã xây dựng dashboard web với bản đồ, biểu đồ và cảnh báo

#### Cách trình bày khuyến nghị

Dùng bảng hoặc 5 card trạng thái:

- `Hardware: In progress`
- `Firmware: Done`
- `Cloud: Done`
- `Backend: Done`
- `Frontend: Done`

#### Thông điệp chính

`Về tổng thể, dự án đã hoàn thành phần mềm và hạ tầng; phần cần hoàn thiện tiếp là PCB và hiện thực phần cứng.`

### Slide 6. Lựa chọn giải pháp phần cứng

#### Mục tiêu của slide

- chứng minh các lựa chọn phần cứng không phải chọn cảm tính
- thể hiện có phân tích so sánh, có tiêu chí, có lý do chọn

#### Title nên dùng

`Lựa chọn giải pháp phần cứng tracker`

#### Nội dung bắt buộc

##### Phần 1. So sánh MCU

- `ESP32-S3`
  - dual-core `240 MHz`
  - `512 KB SRAM`
  - `BLE 5.0` tích hợp
  - `3 UART`
  - chi phí tham chiếu `~100.000–200.000 VND`

- `STM32L4`
  - `80 MHz`
  - low-power rất tốt
  - `không tích hợp BLE`
  - chi phí tham chiếu `~150.000–300.000 VND`

- `nRF52840`
  - `64 MHz`
  - có `BLE 5.x`
  - thường chỉ `2 UART`
  - dư địa cho `modem + debug` hẹp hơn

##### Điểm cần nói về ưu / hạn chế

- `ESP32-S3`
  - ưu điểm: BLE tích hợp, đủ UART, đủ tài nguyên xử lý cho BLE + modem + IMU
  - hạn chế: deep-sleep cao hơn STM32L4

- `STM32L4`
  - ưu điểm: rất tốt về tiết kiệm năng lượng
  - hạn chế: phải thêm module BLE ngoài

- `nRF52840`
  - ưu điểm: BLE mạnh
  - hạn chế: ít dư địa serial cho kiến trúc hiện tại

##### Kết luận bắt buộc

`Chọn ESP32-S3 vì phù hợp nhất với ràng buộc tích hợp của tracker.`

##### Phần 2. So sánh LTE + GNSS

- `A7670C + NEO-M8N`
  - `2 module`
  - `Cat-1`
  - tốc độ tối đa `10 Mbps DL / 5 Mbps UL`
  - cần đường GNSS riêng

- `EC200U-CN + NEO-M8N`
  - `2 module`
  - `Cat-1`
  - GNSS phụ thuộc variant/cấu hình

- `SIM7600CE-T`
  - `1 module`
  - `Cat-4`
  - tốc độ tối đa `150 Mbps DL / 50 Mbps UL`
  - `GNSS tích hợp`
  - điện áp `3.4–4.2 V`

##### Ưu / hạn chế cần nói

- `SIM7600CE-T`
  - ưu điểm: giảm số module rời, giảm đi dây, gọn sơ đồ UART, đồng bộ với firmware AT command
  - hạn chế: LTE và GNSS phụ thuộc cùng một module

##### Kết luận bắt buộc

`Chọn SIM7600CE-T vì tối ưu BOM, thuận lợi cho schematic và phù hợp luồng firmware hiện có.`

##### Phần 3. So sánh phương pháp đọc OBD2

- `ELM327 UART có dây`
  - đơn giản ở mức UART
  - nhưng chiếm thêm `1 UART`
  - ràng buộc vị trí lắp đặt

- `BLE ELM327 / vgate iCar Pro`
  - dùng `BLE 4.0`
  - tận dụng BLE tích hợp của ESP32-S3
  - không cần dây nối tracker ↔ OBD2
  - hỗ trợ nhiều giao thức OBD-II

##### Kết luận bắt buộc

`Chọn vgate iCar Pro BLE vì giảm đi dây, giữ UART cho modem/debug và phù hợp kiến trúc hiện tại.`

##### Phần 4. Các khối còn lại đã chốt

- `LIS3DH`
- khối nguồn đa rail
- pin dự phòng
- LVD

#### Dòng nhấn mạnh nên có

`Slide này phải thể hiện rõ quá trình ra quyết định kỹ thuật, không chỉ liệt kê linh kiện đã chọn.`

#### Hình ảnh nên dùng

- `Hình 4.1 - Sơ đồ khối tổng thể hệ thống tracker IoT`
- `Hình 3.2 - Sơ đồ kết nối BLE giữa ESP32-S3 và vgate iCar Pro`

### Slide 7. Tiến độ phần cứng hiện tại

#### Mục tiêu của slide

- làm rõ phần cứng đã làm tới đâu
- phân biệt rõ `đã xong`, `đang làm`, `chưa nên khẳng định`

#### Title nên dùng

`Tiến độ phần cứng: schematic xong, PCB đang thực hiện`

#### Nội dung bắt buộc

##### Nhóm 1. Đã hoàn thành

- sơ đồ khối tổng thể của tracker
- sơ đồ kết nối `ESP32-S3 ↔ SIM7600CE-T`
- sơ đồ kết nối `LIS3DH` và khối đo điện áp / nguồn
- kiến trúc kết nối `ESP32-S3 ↔ vgate iCar Pro BLE`
- schematic tổng thể của bo mạch

##### Nhóm 2. Đang thực hiện

- tạo footprint còn thiếu
- bố trí linh kiện theo miền nguồn, RF, digital
- đi dây PCB
- kiểm tra `ERC/DRC`
- chuẩn bị file sản xuất

##### Nhóm 3. Chưa nên trình bày như kết quả đã đạt

- thông số đo dòng tiêu thụ trên bo thật
- độ ổn định GNSS / 4G trên bo thật
- kết quả bring-up, nhiệt độ, EMI/EMC
- độ bền cơ khí và thử nghiệm ngoài xe

#### Dòng nhấn mạnh bắt buộc

`Phần cứng hiện mới hoàn tất ở mức schematic; PCB và prototype phần cứng vẫn đang trong quá trình thực hiện.`

#### Hình ảnh nên dùng

- nếu có `ảnh schematic hiện tại`, đặt ở slide này
- nếu có `ảnh PCB layout hiện tại`, đặt ở slide này
- nếu chưa có thì dùng:
  - `Hình 4.5 - Sơ đồ đấu nối tổng thể`
  - `Hình 4.2 - Sơ đồ kết nối ESP32-S3 và SIM7600CE-T`

### Slide 8. Lựa chọn firmware và kết quả triển khai

#### Mục tiêu của slide

- chứng minh nền tảng firmware được lựa chọn có cơ sở
- đồng thời cho thấy kết quả triển khai của phần firmware

#### Title nên dùng

`Lựa chọn nền tảng firmware và kết quả triển khai`

#### Nội dung bắt buộc

##### So sánh phương án

- `Arduino Core + Superloop`
  - ưu điểm: dễ bắt đầu, ít cấu hình
  - hạn chế: khó tổ chức đa nhiệm thực sự, khó tối ưu deep sleep và retry phức tạp

- `ESP-IDF + FreeRTOS`
  - ưu điểm: driver chính thức từ Espressif, hỗ trợ power management tốt, tích hợp `NimBLE / UART / I2C / modem` ổn định
  - hạn chế: độ phức tạp cao hơn Arduino

- `Zephyr RTOS trên ESP32`
  - ưu điểm: chuẩn hóa tốt, module hóa
  - hạn chế: hệ sinh thái thực chiến cho `BLE OBD2 + modem` trên ESP32 không mạnh bằng ESP-IDF

##### Tiêu chí so sánh bắt buộc nên nêu

- khả năng đa nhiệm và đồng bộ tài nguyên
- hỗ trợ deep sleep / wakeup
- mức độ phù hợp với `ESP32-S3`
- độ sẵn sàng của driver và tài liệu

##### Kết luận bắt buộc

`Chọn ESP-IDF + FreeRTOS.`

##### Kết quả đã triển khai

- giao tiếp BLE với OBD2
- điều khiển modem SIM7600CE-T qua UART
- điều khiển GNSS qua AT command
- đọc dữ liệu IMU
- quản lý năng lượng và trạng thái vận hành
- truyền dữ liệu lên broker qua MQTT
- state machine
- reconnect MQTT
- OTA cơ bản

#### Hình ảnh nên dùng

- `Hình 3.5 - Sơ đồ kiến trúc phân lớp của firmware`

### Slide 9. Lựa chọn cloud/backend và kết quả triển khai

#### Mục tiêu của slide

- chứng minh việc chọn kiến trúc cloud/backend có cơ sở kỹ thuật rõ ràng
- thể hiện đây là một phần đã triển khai xong ở mức hệ thống phần mềm
- làm rõ luồng ingest, lưu trữ, API và realtime đã nối thành một pipeline hoàn chỉnh

#### Title nên dùng

`Lựa chọn kiến trúc cloud/backend và kết quả triển khai`

#### Nội dung bắt buộc

##### Phần 1. Luồng tổng thể phải được nói ngắn gọn nhưng rõ

- thiết bị gửi telemetry bằng `MQTT 5.0`
- `EMQX` tiếp nhận message từ thiết bị
- `MQTT Bridge` subscribe, kiểm tra payload, rồi phân luồng
- `PostgreSQL` lưu dữ liệu quan hệ và trạng thái nghiệp vụ
- `VictoriaMetrics` lưu telemetry chuỗi thời gian
- `VictoriaLogs` lưu log sự kiện
- `Backend API` cung cấp REST API và phát realtime qua `Socket.IO`
- `Frontend` nhận dữ liệu và hiển thị lên dashboard

##### Phần 2. Bảng so sánh giao thức truyền thông

- bắt buộc có bảng `MQTT vs HTTP/REST vs CoAP`
- các cột tối thiểu nên có:
  - mô hình truyền thông
  - tầng giao vận
  - overhead
  - QoS
  - hỗ trợ hai chiều
  - độ phù hợp cho IoT
  - mức độ tương thích với `EMQX`

##### Kết luận của bảng giao thức

`MQTT được chọn vì overhead thấp, mô hình publish/subscribe phù hợp bài toán nhiều subscriber, có QoS linh hoạt và được EMQX hỗ trợ native.`

##### Phần 3. Bảng so sánh mô hình triển khai cloud

- nên có so sánh `managed cloud` và `event-driven self-hosted`
- các tiêu chí nên nêu:
  - chi phí ban đầu và chi phí vận hành
  - mức độ kiểm soát hạ tầng
  - khả năng tùy biến pipeline ingest
  - độ phù hợp với môi trường đồ án
  - khả năng tái lập môi trường bằng Docker

##### Kết luận của bảng mô hình triển khai

`Chọn mô hình self-hosted, event-driven trên Docker vì chi phí thấp, dễ kiểm soát, dễ tái lập môi trường và phù hợp phạm vi nghiên cứu học thuật.`

##### Phần 4. Bảng so sánh MQTT Broker

- bắt buộc có `Mosquitto`, `EMQX`, `HiveMQ`, `VerneMQ`
- các thông tin có thể đưa lên slide:
  - kết nối đồng thời
  - thông lượng message
  - độ trễ
  - sử dụng CPU/RAM
  - clustering
  - độ phức tạp cài đặt
  - chi phí / giấy phép

##### Kết luận của bảng MQTT Broker

`Chọn EMQX Single Node cho giai đoạn hiện tại vì hiệu năng đủ cao, có dashboard, hỗ trợ clustering cho giai đoạn mở rộng và có cộng đồng lớn.`

##### Phần 5. Bảng so sánh lưu trữ

- bắt buộc có `PostgreSQL only`, `TSDB only`, `Hybrid DB`
- phần `Hybrid DB` phải được cụ thể hóa thành `PostgreSQL + VictoriaMetrics`
- các tiêu chí tối thiểu:
  - dữ liệu quan hệ
  - dữ liệu chuỗi thời gian
  - hiệu suất ghi
  - nén dữ liệu
  - tài nguyên tiêu thụ
  - truy vấn và tích hợp Grafana

##### Kết luận của bảng lưu trữ

`Chọn kiến trúc lưu trữ kép PostgreSQL + VictoriaMetrics vì tách rõ trách nhiệm, tối ưu đúng loại dữ liệu và phù hợp cho telemetry khối lượng lớn.`

##### Phần 6. Kết quả đã triển khai

- triển khai `EMQX`, `PostgreSQL`, `VictoriaMetrics`, `VictoriaLogs`, `MQTT Bridge`, `Backend API` bằng Docker
- `MQTT Bridge` đã thực hiện `dual-write`
- `Backend` đã có các domain chính: `vehicles`, `devices`, `telemetry`, `alerts`, `geofences`
- có xác thực phiên, ACL theo thiết bị, schema validation và WebSocket realtime
- kiến trúc triển khai thực tế đi theo pipeline:
  - `Device -> EMQX -> MQTT Bridge -> PostgreSQL/VictoriaMetrics/VictoriaLogs -> Backend API -> Frontend`

##### Dòng nhấn mạnh nên có

`Slide này phải cho thấy cloud/backend không chỉ được chọn trên lý thuyết, mà đã được triển khai thành pipeline xử lý dữ liệu hoạt động thực tế.`

#### Hình ảnh nên dùng

- `Hình 3.12 - Sơ đồ kiến trúc tổng quan hệ thống Cloud`
- `Hình 3.13 - Sơ đồ chiến lược lưu trữ kép`
- có thể thay một hình bằng `Hình 4.20 - Luồng xử lý dữ liệu của MQTT Bridge` nếu muốn nhấn mạnh ingest pipeline

### Slide 10. Lựa chọn frontend và kết quả triển khai

#### Mục tiêu của slide

- chứng minh phần frontend được chọn trên cơ sở hiệu năng, khả năng tổ chức code và nhu cầu realtime
- cho thấy giao diện web không còn ở mức ý tưởng mà đã triển khai thành dashboard sử dụng được

#### Title nên dùng

`Lựa chọn công nghệ frontend và kết quả triển khai dashboard`

#### Nội dung bắt buộc

##### Phần 1. Bảng so sánh framework frontend

- nên có `Next.js 15 + React 19`, `Nuxt 3`, `Vite + React`
- các tiêu chí nên nêu:
  - SSR / App Router / Server Components
  - hiệu năng tải trang
  - hệ sinh thái
  - tổ chức code cho dashboard lớn
  - mức độ phù hợp với nhóm
  - khả năng tối ưu SEO không phải trọng tâm nhưng có sẵn

##### Kết luận của bảng framework

`Chọn Next.js 15 + React 19 vì có App Router, hỗ trợ Server Components, tối ưu render tốt và phù hợp với kiến trúc dashboard hiện đại.`

##### Phần 2. Bảng so sánh thư viện bản đồ

- nên có `Leaflet`, `Mapbox GL JS`, `Google Maps JavaScript API`
- các tiêu chí nên nêu:
  - mức độ dễ tích hợp
  - khả năng tùy biến marker/layer/geofence
  - chi phí bản quyền
  - phù hợp với đồ án học thuật
  - mức độ phụ thuộc vendor

##### Kết luận của bảng bản đồ

`Chọn Leaflet vì mã nguồn mở, dễ tích hợp, đủ cho yêu cầu tracking thời gian thực và không tạo áp lực chi phí sử dụng theo lượt tải bản đồ.`

##### Lưu ý bắt buộc về chi phí bản đồ

- `Leaflet` là thư viện mã nguồn mở, miễn phí sử dụng ở tầng thư viện
- `Mapbox` và `Google Maps` có mô hình tính phí theo usage / subscription; nếu AI khác muốn đưa số tiền cụ thể lên slide thì phải kiểm tra lại pricing chính thức tại thời điểm làm slide
- không chốt số chi phí cứng trong deck nếu chưa xác minh lại

##### Phần 3. Kiến trúc frontend đã triển khai

- `Next.js 15`, `React 19`, `TypeScript`, `Tailwind CSS 4`
- `Zustand` cho state cục bộ / toàn cục
- `TanStack Query` cho server state
- `Socket.IO Client` cho realtime
- `Leaflet` cho bản đồ
- `ECharts` cho biểu đồ
- `Radix UI + shadcn/ui` cho component nền

##### Phần 4. Tính năng đã hoàn thành

- dashboard tổng quan
- bản đồ thời gian thực
- marker xe và popup trạng thái
- danh sách xe, thiết bị, khách hàng
- quản lý cảnh báo
- geofence
- lịch sử hành trình và biểu đồ telemetry

##### Phần 5. Kết quả triển khai nên nhấn mạnh

- tải trang dashboard nhanh
- cập nhật bản đồ thời gian thực bằng `Socket.IO`
- giao diện phục vụ giám sát nhiều phương tiện đồng thời
- tổ chức code theo hướng dễ mở rộng, dễ bảo trì

#### Hình ảnh nên dùng

- `Hình 3.20 - Giao diện trang bản đồ thời gian thực với các marker xe`
- `Hình 4.23 - Giao diện trang Dashboard tổng quan`
- `Hình 4.26 - Giao diện trang quản lý cảnh báo`

### Slide 11. Kết quả tích hợp phần mềm và hạ tầng

#### Mục tiêu của slide

- tổng hợp các kết quả mạnh nhất của phần mềm/hạ tầng
- giúp hội đồng thấy các khối chính đã kết nối được với nhau
- đồng thời tránh gây hiểu nhầm rằng phần cứng PCB đã hoàn tất

#### Title nên dùng

`Kết quả tích hợp phần mềm và hạ tầng`

#### Nội dung bắt buộc

##### Pipeline tích hợp phải hiện rõ

`Device -> EMQX -> MQTT Bridge -> Database -> Backend -> Frontend`

##### Chỉ sử dụng các chỉ số thuộc phần mềm / hạ tầng

- `VictoriaMetrics throughput ~12.000 điểm/giây`
- `WebSocket latency nội bộ ~35 ms`
- `Dashboard First Contentful Paint < 2 giây`
- `Bản đồ cập nhật thời gian thực ~1–2 giây`
- `Backend uptime 7 ngày ~99.6%`
- có thể bổ sung:
  - `API response trung bình 20–80 ms với truy vấn đơn giản`
  - `Hỗ trợ tối thiểu 50 phương tiện đồng thời`

##### Câu giải thích bắt buộc để tránh hiểu sai

`Các số liệu trên phản ánh kết quả của firmware, cloud, backend, frontend và pipeline phần mềm; chúng không đồng nghĩa với việc bo mạch PCB tùy chỉnh đã hoàn tất và được kiểm thử đầy đủ trên phần cứng cuối cùng.`

##### Cách trình bày nên dùng

- một sơ đồ pipeline ở nửa trên
- 4 đến 6 metric card ở nửa dưới
- không đưa GPS, tiêu thụ điện, nhiệt độ, TTFF hoặc bất kỳ số liệu thực nghiệm phần cứng nào lên slide này

#### Hình ảnh nên dùng

- `Hình 3.12a - Luồng dữ liệu chi tiết từ thiết bị đến dashboard`
- `Hình 4.23 - Giao diện trang Dashboard tổng quan`
- hoặc `Hình 4.25 - Giao diện bản đồ thời gian thực với vị trí các xe`

### Slide 12. Phần còn lại cần hoàn thiện

#### Mục tiêu của slide

- chốt rất rõ phần việc chưa xong nằm ở phần cứng vật lý
- cho thấy nhóm có kế hoạch kỹ thuật tiếp theo rõ ràng
- tránh cảm giác “mọi thứ đã xong hết”

#### Title nên dùng

`Phần việc còn lại: hoàn thiện PCB, chế tạo prototype và bring-up`

#### Nội dung bắt buộc

##### Giai đoạn 1. Hoàn thiện thiết kế PCB

- hoàn tất footprint còn thiếu
- bố trí linh kiện theo miền nguồn, RF, digital
- đi dây tín hiệu và nguồn
- tối ưu đường cấp cho modem, MCU, IMU và các khối phụ trợ

##### Giai đoạn 2. Kiểm tra và chốt file sản xuất

- chạy `ERC/DRC`
- rà soát khoảng cách, bề rộng trace, via, plane, return path
- kiểm tra các đầu nối anten, SIM, nguồn, debug
- xuất `Gerber`, `BOM`, `Pick and Place`

##### Giai đoạn 3. Chế tạo và lắp ráp prototype

- đặt PCB
- lắp ráp linh kiện
- kiểm tra sơ bộ từng rail nguồn trước khi gắn toàn bộ tải

##### Giai đoạn 4. Bring-up phần cứng

- kiểm tra `3.3V`, `5V`, `~4V` cho modem
- kiểm tra nạp và boot `ESP32-S3`
- kiểm tra UART modem, I2C IMU, ADC đo điện áp
- kiểm tra BLE với OBD2 adapter

##### Giai đoạn 5. Kiểm thử thực nghiệm trên phần cứng thật

- GNSS / 4G
- tiêu thụ điện
- độ ổn định nguồn
- rung động / nhiệt độ
- vận hành thực tế trên xe

##### Dòng nhấn mạnh bắt buộc

`Điểm còn lại của dự án không nằm ở kiến trúc phần mềm, mà tập trung ở bước hoàn thiện PCB và xác minh phần cứng thực tế.`

#### Hình ảnh nên dùng

- ảnh PCB layout hiện tại nếu có
- ảnh schematic tổng thể nếu muốn nhắc lại điểm đã hoàn thành
- không nên dùng các hình đo kiểm phần cứng như thể đã hoàn tất toàn bộ bo mạch cuối cùng

### Slide 13. Kết luận

#### Mục tiêu của slide

- khép lại báo cáo tiến độ một cách trung thực
- nhấn mạnh phần đã hoàn thành và phần còn lại

#### Title nên dùng

`Kết luận`

#### Nội dung bắt buộc

- phần `firmware`, `cloud`, `backend`, `frontend` đã được xây dựng và tích hợp
- phần `hardware` đã hoàn tất ở mức `kiến trúc + schematic`
- `PCB` vẫn đang trong quá trình thực hiện
- hướng tiếp theo là:
  - hoàn thiện PCB
  - chế tạo prototype
  - bring-up
  - đo kiểm phần cứng thực tế

##### Câu kết nên dùng

`Dự án đã hoàn thiện phần lớn các thành phần phần mềm và hạ tầng; trọng tâm của giai đoạn tiếp theo là chuyển thiết kế phần cứng từ schematic sang prototype PCB và xác minh trên thiết bị thật.`

## 6. Hướng dẫn riêng cho AI tạo slide

### 6.1. Nếu AI tạo slide dưới dạng HTML

- dùng nền sáng hoặc trung tính, ví dụ trắng ngà, xám rất nhạt, hoặc xanh than rất nhạt
- màu nhấn nên tiết chế, chỉ dùng 1 màu chủ đạo và 1 màu phụ nhẹ
- tránh làm theo kiểu landing page, startup pitch, hoặc poster marketing
- typography nên học thuật, sạch, có phân cấp rõ nhưng không khoa trương
- ưu tiên layout rõ lưới, card ít hiệu ứng, có đủ khoảng trắng
- animation nếu có thì rất nhẹ, phục vụ chuyển ý chứ không để “trình diễn”

### 6.2. Nếu AI tạo slide dưới dạng PowerPoint

- mỗi slide chỉ có 1 ý lớn và 2 đến 4 cụm ý hỗ trợ
- các slide so sánh nên dùng bảng hoặc card có cấu trúc thống nhất
- các slide kết quả nên dùng metric card + sơ đồ pipeline
- hạn chế hiệu ứng chuyển cảnh mạnh
- icon nếu dùng phải đồng bộ nét, màu và kích thước
- tránh nhồi quá nhiều ảnh trên cùng một slide

### 6.3. Nếu AI tạo speaker notes

- mỗi slide nên có mục đích phát biểu rõ ràng trong 1 câu
- nên có 2 đến 4 câu nói chính, ngắn gọn, mạch lạc
- nên có 1 câu chốt để chuyển sang slide tiếp theo
- ở những slide nhạy cảm như `phần cứng`, `kết quả tích hợp`, notes phải nhắc rõ:
  - không nói như thể `PCB đã xong`
  - không nói như thể `đã đo kiểm đầy đủ trên bo mạch cuối cùng`

## 7. Nguồn dữ liệu so sánh và số liệu cần giữ đúng

### 7.1. MQTT vs HTTP/REST vs CoAP

Nguồn gốc chính: `Bảng 2.2` trong thesis.

| Tiêu chí | MQTT | HTTP/REST | CoAP |
| --- | --- | --- | --- |
| Mô hình truyền thông | Publish/Subscribe | Request/Response | Request/Response |
| Tầng giao vận | TCP | TCP | UDP |
| Overhead header | 2 bytes tối thiểu | Hàng trăm bytes | 4 bytes |
| QoS | 3 mức: 0, 1, 2 | Không có QoS native | 2 mức: Confirmable / Non-confirmable |
| Tiêu thụ băng thông | Thấp | Cao | Thấp |
| Hỗ trợ hai chiều | Có, qua subscribe | Không tự nhiên, thường phải polling hoặc WebSocket bổ sung | Có, qua observe |
| Phù hợp cho IoT | Rất tốt | Trung bình | Tốt |
| Hỗ trợ với EMQX | Native | Có thể qua plugin / gateway | Hạn chế hơn |

Kết luận nên chốt trên slide:

`MQTT là lựa chọn phù hợp nhất cho tracker IoT vì nhẹ, có QoS, dễ fan-out đến nhiều consumer và khớp trực tiếp với EMQX.`

### 7.2. So sánh vi điều khiển

Lưu ý quan trọng:

- ở `Chương 2`, bảng tóm tắt có so sánh `ESP32-S3`, `STM32L4`, `Raspberry Pi Zero 2W`
- ở `Chương 3`, phần phân tích sâu dùng bộ ba MCU cùng lớp là `ESP32-S3`, `STM32L4`, `nRF52840`
- khi làm slide chọn giải pháp MCU, nên ưu tiên bộ ba `ESP32-S3`, `STM32L4`, `nRF52840` vì sát hơn với quyết định thiết kế phần cứng nhúng

| Tiêu chí | ESP32-S3 | STM32L4 | nRF52840 |
| --- | --- | --- | --- |
| Kiến trúc | Xtensa LX7 dual-core, tới 240 MHz | ARM Cortex-M4, tới 80 MHz | ARM Cortex-M4F, 64 MHz |
| BLE tích hợp | Có, BLE 5.0 | Không, thường cần module ngoài | Có, BLE 5.x |
| Wi-Fi tích hợp | Có | Không | Không phải thế mạnh chính |
| RAM / bộ nhớ | 512 KB SRAM, thường dùng thêm flash/PSRAM ngoài | 256 KB SRAM tùy biến thể | 256 KB RAM, 1 MB Flash |
| Deep sleep / system off | 10–15 µA mức MCU | 1–2 µA rất mạnh về low power | Dưới µA tùy cấu hình |
| UART cho kiến trúc hiện tại | Thuận lợi, đủ modem + debug | Có thể đáp ứng nhưng phải cân đối biến thể | Thường hẹp hơn cho modem + debug độc lập |
| Độ phù hợp với tracker hiện tại | Cao | Trung bình | Trung bình |

Kết luận nên chốt:

`Chọn ESP32-S3 vì có BLE tích hợp, đủ tài nguyên cho modem + IMU + BLE OBD2 + MQTT, hệ sinh thái ESP-IDF mạnh và phù hợp với ngân sách đồ án.`

### 7.3. So sánh phương án LTE + GNSS

Nguồn gốc chính: `Bảng 3.3` và `Bảng 3.4` trong thesis.

| Tiêu chí | A7670C + NEO-M8N | EC200U-CN + NEO-M8N | SIM7600CE-T |
| --- | --- | --- | --- |
| Số module phần cứng | 2 module riêng | 2 module riêng | 1 module tích hợp |
| LTE category / tốc độ | Cat-1, 10 Mbps DL / 5 Mbps UL | Cat-1, 10 Mbps DL / 5 Mbps UL | Cat-4, 150 Mbps DL / 50 Mbps UL |
| GNSS tích hợp | Không | Tùy variant / cấu hình | Có |
| Điện áp modem | 3.4–4.2 V typ 3.8 V | 3.3–4.3 V typ 3.8 V | 3.4–4.2 V typ 3.8 V |
| Đường dữ liệu vị trí | Cần UART riêng cho GNSS | Cần UART riêng cho GNSS | GNSS dùng chung modem qua AT |
| Mức độ gọn của kiến trúc | Thấp hơn | Thấp hơn | Cao nhất |
| Tác động tới firmware | Tách `modem_lte` và `gnss` | Tương tự, nhưng đổi tập lệnh | Tích hợp hơn, đồng bộ với firmware hiện tại |

Kết luận nên chốt:

`Chọn SIM7600CE-T vì tích hợp LTE + GNSS, giảm phần cứng rời, giữ nguyên pin mapping và phù hợp với firmware đang triển khai.`

### 7.4. So sánh nền tảng firmware

Nguồn gốc: thesis mô tả nền tảng thực tế là `ESP-IDF + FreeRTOS`; các phương án còn lại là lớp so sánh trình bày cho slide.

| Tiêu chí | Arduino Core + Superloop | ESP-IDF + FreeRTOS | Zephyr RTOS |
| --- | --- | --- | --- |
| Độ dễ bắt đầu | Rất dễ | Trung bình | Trung bình đến khó |
| Driver cho ESP32-S3 | Có nhưng thường trừu tượng hơn | Chính thức từ Espressif | Có nhưng không mạnh bằng ESP-IDF cho bài toán hiện tại |
| Đa nhiệm / đồng bộ tài nguyên | Hạn chế | Tốt | Tốt |
| Deep sleep / wakeup | Làm được nhưng kém linh hoạt hơn | Tốt | Tốt |
| Phù hợp với BLE OBD2 + modem + IMU | Trung bình | Cao | Trung bình |
| Độ phù hợp với firmware đã làm | Thấp | Cao nhất | Thấp |

Kết luận nên chốt:

`Chọn ESP-IDF + FreeRTOS vì phù hợp nhất với ESP32-S3 và tập ngoại vi đang dùng trong dự án.`

### 7.5. So sánh MQTT Broker

Nguồn gốc chính: `Bảng 3.17` trong thesis.

| Tiêu chí | Mosquitto | EMQX | HiveMQ | VerneMQ |
| --- | --- | --- | --- | --- |
| Kết nối đồng thời | ~1.000 | ~100.000.000 | ~200.000.000 | ~10.000.000 |
| Thông lượng message | 40K msg/s | 100K msg/s | 200K msg/s | 50K msg/s |
| Độ trễ | 0,25 ms | 0,27 ms | <1 ms | 2,1 ms |
| CPU | Rất thấp | Thấp, khoảng 2% | Thấp | Cao hơn |
| RAM | ~254 MB | ~495 MB | Trung bình | ~1,2 GB |
| Clustering | Không | Có, 20+ node | Có | Có |
| Dashboard | Hạn chế | Có | Có | Có |
| Chi phí | Miễn phí | Miễn phí / trả phí | Thường trả phí | Miễn phí / trả phí |

Kết luận nên chốt:

`Chọn EMQX Single Node cho giai đoạn hiện tại vì cân bằng tốt giữa hiệu năng, tính năng quản trị, khả năng mở rộng và chi phí.`

### 7.6. So sánh lưu trữ dữ liệu

Nguồn gốc chính: `Bảng 2.4` trong thesis.

| Tiêu chí | PostgreSQL only | TSDB only | Hybrid DB: PostgreSQL + VictoriaMetrics |
| --- | --- | --- | --- |
| Dữ liệu quan hệ | Tốt | Yếu | Rất tốt |
| Dữ liệu chuỗi thời gian | Trung bình | Rất tốt | Rất tốt |
| Hiệu suất ghi telemetry | Trung bình | Cao | Cao |
| Nén dữ liệu | Trung bình | Tốt | Rất tốt, `VictoriaMetrics` khoảng `10–70x` |
| Tài nguyên tiêu thụ | Trung bình | Tùy engine | Tối ưu hơn so với nhiều phương án time-series nặng |
| Độ rõ ràng trách nhiệm | Thấp hơn | Thấp hơn | Cao, tách đúng loại dữ liệu |
| Tích hợp Grafana | Tốt | Tốt | Tốt |

Kết luận nên chốt:

`Chọn PostgreSQL + VictoriaMetrics vì vừa bảo đảm nghiệp vụ quan hệ, vừa tối ưu ingest và truy vấn telemetry theo thời gian.`

### 7.7. So sánh framework frontend

Lưu ý:

- thesis khẳng định hệ thống thực tế được triển khai bằng `Next.js 15 + React 19`
- bảng dưới đây là lớp so sánh trình bày thêm để AI khác hiểu lý do chọn công nghệ; không nên diễn đạt như thể thesis đã benchmark đầy đủ cả ba framework

| Tiêu chí | Next.js 15 + React 19 | Nuxt 3 | Vite + React |
| --- | --- | --- | --- |
| SSR / hybrid rendering | Mạnh | Mạnh | Phải tự ghép thêm |
| App Router / routing có cấu trúc | Mạnh | Mạnh | Linh hoạt nhưng tự cấu hình nhiều hơn |
| Hệ sinh thái dashboard React | Rất mạnh | Tốt | Mạnh nhưng thiên “tự lắp ghép” |
| Tối ưu hiệu năng mặc định | Tốt | Tốt | Tốt ở SPA, ít opinionated |
| Phù hợp với stack đã triển khai | Cao nhất | Thấp | Trung bình |

Kết luận nên chốt:

`Chọn Next.js 15 + React 19 vì phù hợp với định hướng dashboard hiện đại, có App Router và tối ưu render tốt ngay từ framework.`

### 7.8. So sánh thư viện bản đồ

Lưu ý:

- thesis triển khai thực tế với `Leaflet`
- bảng dưới đây là dữ liệu hỗ trợ trình bày quyết định công nghệ
- `Mapbox` và `Google Maps` có chính sách giá thay đổi theo thời gian; nếu muốn đưa chi phí cụ thể lên slide thật, phải kiểm tra lại pricing chính thức tại thời điểm trình bày

| Tiêu chí | Leaflet | Mapbox GL JS | Google Maps JavaScript API |
| --- | --- | --- | --- |
| Mô hình giấy phép | Mã nguồn mở | Thương mại / usage-based | Thương mại / usage-based |
| Dễ tích hợp | Rất dễ | Trung bình | Dễ |
| Tùy biến layer / marker / geofence | Tốt | Rất mạnh | Tốt |
| Phù hợp bản đồ tracking 2D | Rất phù hợp | Phù hợp | Phù hợp |
| Áp lực chi phí cho đồ án | Thấp nhất | Có | Có |
| Phụ thuộc vendor | Thấp | Cao hơn | Cao hơn |

Kết luận nên chốt:

`Chọn Leaflet vì đủ dùng cho dashboard theo dõi phương tiện thời gian thực, dễ triển khai, chi phí thư viện bằng 0 và tránh phụ thuộc vendor.`

### 7.9. Các số liệu phần mềm / hạ tầng được phép dùng

Các số liệu dưới đây được phép đưa lên slide `kết quả tích hợp phần mềm và hạ tầng`:

| Chỉ số | Giá trị | Ghi chú |
| --- | --- | --- |
| VictoriaMetrics throughput | ~12.000 điểm/giây | Từ bảng tổng hợp cloud |
| WebSocket latency nội bộ | ~35 ms | Nội bộ hệ thống |
| First Contentful Paint | ~1.2 giây, có thể trình bày `< 2 giây` | Từ Lighthouse đo trên bản dựng thử nghiệm |
| Cập nhật bản đồ thời gian thực | ~1–2 giây | Từ device đến dashboard |
| Backend uptime 7 ngày | ~99.6% | Chỉ số ổn định vận hành |
| API response | 20–80 ms đơn giản, 100–300 ms phức tạp | Có thể dùng như chỉ số hỗ trợ |
| Quy mô đồng thời | 50+ phương tiện | Chỉ số của hệ thống phần mềm / cloud |

Các số liệu dưới đây không được dùng trong slide tiến độ hiện tại nếu muốn tránh gây hiểu nhầm về phần cứng:

- độ chính xác GPS trên thiết bị thật
- tiêu thụ điện active / sleep trên bo thật
- TTFF GNSS
- kết quả nhiệt độ, rung, ngoài xe
- thời lượng pin thực nghiệm trên bo cuối cùng

## 8. Mapping hình ảnh: số hình trong thesis + đường dẫn file

### 8.1. Kiến trúc tổng thể

- `Hình 1.3 - Kiến trúc tổng thể hệ thống IoT Vehicle Tracking`
- file: `resources/reports/thesis-chapters/assets/figures/01-chuong-1-gioi-thieu-hinh-1-3.svg`
- nên dùng cho: `Slide 2`, `Slide 4`

### 8.2. Chuyển đổi chế độ năng lượng

- `Hình 1.4 - Sơ đồ chuyển đổi giữa các chế độ năng lượng`
- file: `resources/reports/thesis-chapters/assets/figures/01-chuong-1-gioi-thieu-hinh-1-4.svg`
- nên dùng cho: `Slide 3` hoặc `Slide 5`

### 8.3. Kết nối BLE với OBD2

- `Hình 3.2 - Sơ đồ kết nối BLE giữa ESP32-S3 và vgate iCar Pro`
- file: `resources/reports/thesis-chapters/assets/figures/03-chuong-3-giai-phap-phan-cung-hinh-3-2.svg`
- nên dùng cho: `Slide 6`

### 8.4. Kiến trúc firmware

- `Hình 3.5 - Sơ đồ kiến trúc phân lớp của firmware`
- file: `resources/reports/thesis-chapters/assets/figures/04-chuong-3-giai-phap-firmware-hinh-3-5.svg`
- nên dùng cho: `Slide 8`

### 8.5. Kiến trúc cloud tổng quan

- `Hình 3.12 - Sơ đồ kiến trúc tổng quan hệ thống Cloud`
- file: `resources/reports/thesis-chapters/assets/figures/05-chuong-3-giai-phap-backend-hinh-3-12.svg`
- nên dùng cho: `Slide 9`

### 8.6. Luồng dữ liệu chi tiết đến dashboard

- `Hình 3.12a - Luồng dữ liệu chi tiết từ thiết bị đến dashboard`
- file: `resources/reports/thesis-chapters/assets/figures/thesis-99-bao-cao-thesis-hoan-chinh-04.svg`
- nên dùng cho: `Slide 11`

### 8.7. Chiến lược lưu trữ kép

- `Hình 3.13 - Sơ đồ chiến lược lưu trữ kép`
- file: `resources/reports/thesis-chapters/assets/figures/05-chuong-3-giai-phap-backend-hinh-3-13.svg`
- nên dùng cho: `Slide 9`

### 8.8. Giao diện bản đồ thời gian thực

- `Hình 3.20 - Giao diện trang bản đồ thời gian thực với các marker xe`
- file: `resources/reports/thesis-chapters/assets/figures/06-chuong-3-giai-phap-frontend-hinh-3-20.svg`
- nên dùng cho: `Slide 10`

### 8.9. Sơ đồ khối tổng thể tracker

- `Hình 4.1 - Sơ đồ khối tổng thể hệ thống tracker IoT`
- file: `resources/reports/thesis-chapters/assets/figures/07-chuong-4-trien-khai-hardware-hinh-4-1.svg`
- nên dùng cho: `Slide 4`, `Slide 6`, `Slide 7`

### 8.10. Luồng xử lý dữ liệu MQTT Bridge

- `Hình 4.20 - Luồng xử lý dữ liệu của MQTT Bridge`
- file: `resources/reports/thesis-chapters/assets/figures/09-chuong-4-trien-khai-cloud-hinh-4-17.svg`
- nên dùng cho: `Slide 9`, `Slide 11`

### 8.11. Dashboard tổng quan

- `Hình 4.23 - Giao diện trang Dashboard tổng quan`
- file: `resources/reports/thesis-chapters/assets/figures/09-chuong-4-trien-khai-cloud-hinh-4-20.svg`
- nên dùng cho: `Slide 10`, `Slide 11`

### 8.12. Bản đồ thời gian thực ở giai đoạn triển khai

- `Hình 4.25 - Giao diện bản đồ thời gian thực với vị trí các xe`
- file: `resources/reports/thesis-chapters/assets/figures/09-chuong-4-trien-khai-cloud-hinh-4-22.svg`
- nên dùng cho: `Slide 11`

### 8.13. Trang quản lý cảnh báo

- `Hình 4.26 - Giao diện trang quản lý cảnh báo`
- file: `resources/reports/thesis-chapters/assets/figures/09-chuong-4-trien-khai-cloud-hinh-4-23.svg`
- nên dùng cho: `Slide 10`

### 8.14. EMQX Dashboard

- `Hình 4.28 - EMQX Dashboard hiển thị trạng thái kết nối thiết bị`
- file: `resources/reports/thesis-chapters/assets/figures/09-chuong-4-trien-khai-cloud-hinh-4-25.svg`
- nên dùng cho: `Slide 9` nếu muốn minh họa broker đang chạy thật

### 8.15. Ảnh schematic hiện tại

- không có số hình chính thức trong thesis
- nên dùng ảnh chụp từ công cụ thiết kế mạch hiện tại
- nên dùng cho: `Slide 7`, `Slide 12`

### 8.16. Ảnh PCB layout hiện tại

- không có số hình chính thức trong thesis vì PCB chưa hoàn tất trong trạng thái báo cáo tiến độ này
- nên dùng ảnh chụp layout hiện tại từ phần mềm PCB
- nên dùng cho: `Slide 7`, `Slide 12`

## 9. Các lỗi AI khác rất dễ mắc phải và phải tránh

- biến báo cáo tiến độ thành báo cáo bảo vệ cuối cùng
- dùng giọng pitch deck, quảng bá, hoặc quá marketing
- trình bày phần cứng như thể đã xong toàn bộ PCB và prototype
- đưa các số liệu thực nghiệm phần cứng thật vào khi trạng thái hiện tại chưa phù hợp
- chỉ liệt kê công nghệ mà không có so sánh giải pháp và lý do chọn
- dùng quá nhiều tiếng Anh không cần thiết
- nhồi quá nhiều text vào một slide nhưng lại thiếu thông điệp chốt
- dùng ảnh sai số hình hoặc chỉ đưa link SVG mà không ghi số hình trong thesis
- dùng màu quá sặc sỡ, gradient nặng, icon trang trí không cần thiết
- trộn lẫn `kết quả phần mềm/hạ tầng` với `kết quả đo kiểm phần cứng thực nghiệm`

## 10. Checklist cuối cùng trước khi dùng prompt này cho AI khác

- đây là `báo cáo tiến độ`, không phải `bảo vệ luận văn cuối cùng`
- trạng thái phần cứng phải được giữ đúng: `đã xong schematic`, `PCB đang thực hiện`
- không được để AI khác viết như thể `prototype phần cứng đã kiểm thử hoàn chỉnh`
- `firmware`, `cloud`, `backend`, `frontend` phải được trình bày là các phần đã hoàn thành ở mức triển khai
- các slide chọn giải pháp phải có `so sánh`, `ưu nhược điểm`, `thông số/tiêu chí`, `kết luận`
- slide `kết quả tích hợp` chỉ dùng metric phần mềm / hạ tầng
- các ảnh từ thesis phải ghi đủ `số hình + tên hình + file SVG`
- phong cách trình bày phải `học thuật`, `tiết chế`, `ít màu mè`
- nếu AI khác muốn đưa giá dịch vụ Mapbox / Google Maps cụ thể thì phải kiểm tra lại pricing chính thức tại thời điểm làm slide

## 11. Kết luận của chính tài liệu prompt này

Nếu một AI khác bám sát tài liệu này, bộ slide đầu ra phải đạt các điểm sau:

1. Trung thực với trạng thái hiện tại của dự án.
2. Làm nổi bật khối phần mềm và hạ tầng đã hoàn thành.
3. Làm rõ rằng phần chưa xong nằm chủ yếu ở `PCB` và bước xác minh phần cứng thật.
4. Thể hiện được quá trình lựa chọn giải pháp thông qua so sánh có cơ sở.
5. Giữ được phong cách học thuật, chặt chẽ và tiết chế.

Các đầu việc có thể làm tiếp từ file prompt nguồn này:

- tạo một bản `prompt rút gọn` để dùng nhanh với AI tạo slide
- tạo một bản `speaker notes cực chi tiết` cho từng slide
- tạo một bản `prompt riêng cho PowerPoint`
- tạo một bản `prompt riêng cho HTML slides`
