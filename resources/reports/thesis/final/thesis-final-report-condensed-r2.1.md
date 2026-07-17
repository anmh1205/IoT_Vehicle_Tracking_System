<div class="center">

**ĐẠI HỌC PHENIKAA**

---

`<img src="./assets/brand/phenikaa-university-logo.jpeg" style="width:30.0%" alt="image" />`

**ĐỒ ÁN TỐT NGHIỆP**
**THIẾT KẾ HỆ THỐNG IoT CHO ỨNG DỤNG QUẢN LÝ**
**PHƯƠNG TIỆN GIAO THÔNG TRONG LĨNH VỰC**
**CHO THUÊ XE TỰ LÁI**

<div class="minipage">

**Sinh viên:** Lê Trọng An
**Mã số sinh viên:** 21010389
**Lớp:** K15-KTCĐT2
**Ngành:** Kỹ thuật Cơ điện tử
**Giảng viên hướng dẫn:** TS. Nguyễn Đức Nam

</div>

**Hà Nội - 2026**

</div>

<div class="center">

**PHENIKAA UNIVERSITY**
**FACULTY OF MECHANICAL ENGINEERING AND MECHATRONICS**

`<img src="./assets/brand/phenikaa-university-logo.jpeg" style="width:28.0%" alt="image" />`

**CAPSTONE THESIS**
**DESIGN OF AN IoT SYSTEM FOR VEHICLE MANAGEMENT**
**IN SELF-DRIVE CAR RENTAL SERVICES**

<div class="minipage">

| **Student** | **Student ID** | **Class** |
| :---------------- | :------------------- | :-------------- |
| Le Trong An       | 21010389             | K15-KTCĐT2     |

**Supervisor:** Dr. Nguyen Duc Nam

</div>

**HANOI - 2026**

</div>

# NHẬN XÉT ĐỒ ÁN TỐT NGHIỆP CỦA GIẢNG VIÊN HƯỚNG DẪN

> Phần này giữ đúng mẫu biểu của nhà trường và được điền khi nộp hồ sơ bảo vệ chính thức.

# NHẬN XÉT ĐỒ ÁN TỐT NGHIỆP CỦA GIẢNG VIÊN PHẢN BIỆN

> Phần này giữ đúng mẫu biểu của nhà trường và được điền khi nộp hồ sơ bảo vệ chính thức.

# BIÊN BẢN ĐÁNH GIÁ ĐỒ ÁN TỐT NGHIỆP

> Phần này giữ đúng mẫu biểu của hội đồng, gồm thông tin phiên bảo vệ, câu hỏi phản biện, phần trả lời và kết luận.

# GIẢI TRÌNH CÁC CHỈNH SỬA (NẾU CÓ)

> Tài liệu giải trình sẽ được bổ sung sau khi có góp ý chính thức từ hội đồng.

# LỜI CAM ĐOAN

Tên tôi là: **Lê Trọng An**.

Mã số sinh viên: **21010389** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Lớp: **K15-KTCĐT2**  
Ngành: **Kỹ thuật Cơ điện tử**.

Tôi cam đoan đồ án tốt nghiệp với đề tài **"Thiết kế hệ thống IoT cho ứng dụng quản lý phương tiện giao thông trong lĩnh vực cho thuê xe tự lái"** là kết quả nghiên cứu do tôi trực tiếp thực hiện, dưới sự hướng dẫn của **TS. Nguyễn Đức Nam**.

Toàn bộ nội dung, số liệu, hình ảnh và kết quả trình bày trong báo cáo là trung thực, được trích dẫn rõ nguồn khi tham khảo tài liệu bên ngoài, và chưa từng công bố dưới danh nghĩa tác giả khác. Nếu có bất kỳ sai phạm nào về học thuật hoặc bản quyền, tôi xin hoàn toàn chịu trách nhiệm trước nhà trường và pháp luật.

<div class="flushright">

Hà Nội, ngày … tháng … năm 2026  
**SINH VIÊN THỰC HIỆN**  
Lê Trọng An

</div>

# TÓM TẮT ĐỒ ÁN TỐT NGHIỆP - ABSTRACT

Đồ án xây dựng một hệ thống IoT phục vụ quản lý đội xe cho thuê tự lái theo hướng triển khai thực tế, với kiến trúc ba lớp: **thiết bị gắn trên xe**, **máy chủ xử lý dữ liệu**, và **giao diện khai thác cho người vận hành**. Mục tiêu kỹ thuật là giải đồng thời bốn yêu cầu vận hành: theo dõi vị trí theo thời gian thực, thu dữ liệu vận hành cơ bản từ OBD-II, phát hiện sự kiện bất thường đủ sớm để can thiệp, và duy trì tiêu thụ điện an toàn khi xe dừng lâu.

Ở lớp thiết bị, hệ thống thu dữ liệu vị trí, tốc độ và trạng thái vận hành rồi truyền về máy chủ qua MQTT. Ở lớp máy chủ, dữ liệu được chuẩn hóa, lưu trữ và xử lý cảnh báo. Ở lớp giao diện, người quản lý theo dõi bản đồ, trạng thái xe, dữ liệu chuyến đi và cảnh báo thời gian thực trên một màn hình thống nhất.

Kết quả triển khai cho thấy hệ thống đã được chế tạo thành nguyên mẫu hoàn chỉnh (PCB + vỏ in 3D), lắp thử trên xe thật và kiểm chứng bằng đo kiểm trong phòng thí nghiệm lẫn ngoài thực địa. Các chỉ tiêu chính về dòng ngủ sâu, thời gian kết nối OBD-II, độ trễ toàn tuyến dữ liệu và khả năng phục vụ đồng thời nhiều thiết bị đều đạt ngưỡng đề ra. Kết quả này xác nhận phương án của đồ án vừa đúng về mặt thiết kế kỹ thuật, vừa khả thi cho bài toán quản lý đội xe quy mô nhỏ và vừa.

**Từ khóa:** IoT, quản lý phương tiện, xe cho thuê tự lái, GPS, OBD-II, MQTT

**Abstract (English)**

This capstone thesis presents an IoT-based fleet tracking system for self-drive rental operations, designed for practical deployment with three integrated layers: an onboard device, a backend processing server, and an operator-facing dashboard. The engineering objective is to satisfy four operational constraints at once: near real-time tracking, basic OBD-II telemetry acquisition, timely event alerting, and low-power behavior during long parking periods.

At the device layer, telemetry data (location, speed, and operational status) is collected and published via MQTT. At the server layer, data is normalized, stored, and processed into trip history and alerts. At the dashboard layer, operators monitor map position, vehicle status, trip data, and event alerts through a single interface.

The final implementation includes a full prototype (custom PCB and 3D-printed enclosure), installed and validated on a real vehicle through both laboratory and field tests. Key performance metrics—deep-sleep current, OBD-II connection latency, end-to-end data delay, and concurrent device handling—meet the target thresholds. These results confirm that the proposed architecture is technically sound and practically deployable for small- and medium-scale rental fleet management.

**Keywords:** IoT, vehicle tracking, self-drive rental, GPS, OBD-II, MQTT

# LỜI CẢM ƠN - ACKNOWLEDGEMENTS

Em xin trân trọng bày tỏ lòng biết ơn sâu sắc tới **TS. Nguyễn Đức Nam**, người đã trực tiếp hướng dẫn, góp ý chi tiết và định hướng học thuật trong suốt quá trình thực hiện đồ án. Các góp ý của thầy không chỉ giúp em hoàn thiện sản phẩm kỹ thuật, mà còn giúp em rèn tư duy phân tích vấn đề theo hướng có tiêu chí, có kiểm chứng và có kết luận rõ ràng.

Em xin chân thành cảm ơn quý thầy cô **Khoa Cơ khí - Cơ điện tử, Đại học Phenikaa** đã trang bị nền tảng kiến thức và môi trường học tập cần thiết để em có thể thực hiện đề tài này theo đúng chuẩn kỹ thuật và chuẩn học thuật.

Em cũng xin gửi lời cảm ơn tới gia đình và bạn bè đã luôn động viên, hỗ trợ tinh thần trong suốt thời gian thực hiện đồ án, đặc biệt trong giai đoạn chế tạo nguyên mẫu và kiểm thử thực địa.

Dù đã nỗ lực hoàn thiện báo cáo và sản phẩm, đồ án chắc chắn vẫn còn những điểm cần tiếp tục cải tiến. Em rất mong nhận được thêm ý kiến góp ý từ quý thầy cô và hội đồng để hoàn thiện hơn trong các nghiên cứu tiếp theo.

<div class="flushright">

Hà Nội, ngày … tháng … năm 2026  
**SINH VIÊN THỰC HIỆN**  
Lê Trọng An

</div>

# MỤC LỤC - TABLE OF CONTENT

# DANH MỤC BẢNG - LIST OF TABLES

# DANH MỤC HÌNH ẢNH VÀ ĐỒ THỊ - LIST OF FIGURES

# DANH MỤC TỪ VIẾT TẮT - LIST OF ABBREVIATIONS

| Từ viết tắt | Nghĩa                                 |
| :------------- | :------------------------------------- |
| ADC            | Bộ chuyển đổi tương tự sang số |
| API            | Giao diện lập trình ứng dụng      |
| BLE            | Bluetooth năng lượng thấp          |
| BOM            | Danh sách linh kiện                  |
| ECU            | Bộ điều khiển điện tử trên xe  |
| ESP            | Nền tảng vi điều khiển Espressif  |
| GNSS           | Hệ thống vệ tinh dẫn đường      |
| GPS            | Hệ thống định vị toàn cầu       |
| IMU            | Cảm biến quán tính                 |
| IoT            | Internet vạn vật                     |
| LTE            | Mạng dữ liệu di động 4G           |
| MCU            | Vi điều khiển trung tâm            |
| MQTT           | Giao thức truyền bản tin nhẹ       |
| OBD-II         | Cổng chẩn đoán trên xe            |
| OTA            | Cập nhật phần mềm từ xa           |
| PCB            | Bảng mạch in                         |
| QoS            | Mức đảm bảo truyền bản tin       |
| RTC            | Đồng hồ thời gian thực            |
| VPS            | Máy chủ ảo                          |

# CHƯƠNG 1. GIỚI THIỆU ĐỒ ÁN - SUMMARY

## 1.1. Đặt vấn đề và bối cảnh sử dụng

Trong hoạt động cho thuê xe tự lái, nhiều đơn vị đã gắn thiết bị GPS để theo dõi
vị trí và hành trình của xe. Cách làm này đáp ứng được nhu cầu giám sát cơ bản.
Tuy nhiên, khi đi vào quản lý khai thác, các thông tin đó còn nhiều hạn chế. Người quản lý cần
theo dõi thêm trạng thái sử dụng của xe, các cảnh báo trong lúc vận hành và số
liệu để kiểm tra lại sau mỗi chuyến đi.

Nhiều thiết bị hiện dùng mới tập trung vào vị trí, chưa gom thông tin về một nơi để
theo dõi và đối chiếu. Thiết bị cũng thường không lấy được dữ liệu vận hành của
xe, nên các thông tin như tốc độ, trạng thái động cơ, dữ liệu cảm biến hoặc mã lỗi
chưa đi vào cùng một hệ thống quản lý.

Khoảng trống đó tạo ra nhu cầu rõ ràng: cần một hệ thống theo dõi tập trung cho xe
cho thuê tự lái, kết hợp dữ liệu hành trình với dữ liệu vận hành để người quản lý
quan sát được tình trạng xe đầy đủ hơn trong từng chuyến.

![Hình 1.1 - Sơ đồ tổng quan vấn đề và giải pháp đề xuất](./assets/figures/01-chuong-1-gioi-thieu-hinh-1-1-ai.png)

_Hình 1.1: Sơ đồ tổng quan vấn đề và giải pháp đề xuất_

## 1.2. Mục tiêu và phạm vi của đồ án

Để đáp ứng nhu cầu theo dõi và quản lý nêu trên, hệ thống tập trung vào bốn nhóm chức năng chính:

- Theo dõi hành trình và trạng thái xe theo thời gian thực.
- Thu dữ liệu vận hành cơ bản qua OBD-II (On-Board Diagnostics II, chuẩn chẩn đoán chung trên ô tô).
- Phát hiện cảnh báo trong quá trình sử dụng xe.
- Tổng hợp dữ liệu sau chuyến đi để đối chiếu khai thác.

Các chỉ tiêu kỹ thuật và ràng buộc triển khai tương ứng được tổng hợp trong bảng sau:

**Bảng 1.1: Mục tiêu và ràng buộc chính của đồ án**

| Hạng mục                   | Chỉ tiêu chính                                                      |
| :--------------------------- | :--------------------------------------------------------------------- |
| Nguồn cấp thiết bị       | 12-24 VDC                                                              |
| Bộ điều khiển trung tâm | ESP32-S3                                                               |
| Giao tiếp với xe           | OBD-II                                                                 |
| Dữ liệu chính cần thu    | Tọa độ GPS, tốc độ, một số dữ liệu vận hành cơ bản       |
| Cảnh báo chính            | Vượt tốc độ, đỗ lâu, ra khỏi vùng quản lý                  |
| Chức năng tổng hợp       | Quãng đường, thời gian sử dụng, ước tính chi phí khai thác |
| Ràng buộc chi phí         | Không vượt 20.000.000 VND cho phương án của đồ án            |
| Môi trường kiểm chứng   | Phòng thí nghiệm và xe thử nghiệm                                |
| Khả năng chế tạo         | PCB chuyên dụng, vỏ in 3D                                           |
| Chuẩn tham chiếu           | IPC-2221, IEC 60664-1                                                  |

## 1.3. Các tiêu chí cần đạt của đồ án

Từ mục tiêu và ràng buộc ở Bảng 1.1, hệ thống đồ án xây dựng cần đặt ra tiêu chí theo năm nhóm:
lắp đặt-nguồn, thu dữ liệu, quản lý năng lượng, khai thác dữ liệu và chế tạo/đo
kiểm.

**Bảng 1.2: Các tiêu chí cần đạt của đồ án**

| Nhóm tiêu chí        | Nội dung cần đạt                                                                              |
| :---------------------- | :------------------------------------------------------------------------------------------------ |
| Lắp đặt và nguồn   | Thiết bị gọn, dùng được với nguồn xe 12-24 VDC, lắp được trên xe thật              |
| Thu dữ liệu           | Theo dõi được tọa độ GPS, tốc độ và dữ liệu OBD-II cơ bản                          |
| Quản lý năng lượng | Có chế độ ngủ, có nguồn dự phòng, không làm ảnh hưởng lớn đến ắc quy xe         |
| Khai thác dữ liệu    | Hiển thị được vị trí, hành trình, trạng thái và cảnh báo trên giao diện dễ hiểu |
| Kiểm chứng            | Có nguyên mẫu PCB, vỏ in 3D, đo kiểm trong phòng thí nghiệm và trên xe                 |

## 1.4. Phương pháp tiếp cận thiết kế kỹ thuật

Từ bộ tiêu chí ở Bảng 1.2, đồ án đi theo chuỗi quyết định có kiểm soát rủi ro: chốt
đầu ra dữ liệu trước, chốt kiến trúc xử lý sau, rồi mới tích hợp toàn hệ thống. Cách
đi này giúp mọi lựa chọn phần cứng và phần mềm đều bám trực tiếp vào nhu cầu khai
thác, thay vì chọn linh kiện trước rồi tìm cách ghép mục tiêu vào sau.

Bước đầu tiên là xác định dữ liệu bắt buộc (vị trí, trạng thái, thông tin OBD-II cơ
bản), chu kỳ cập nhật và ngưỡng chấp nhận độ trễ. Khi ba tham số này được khóa,
tải xử lý của MCU, tải truyền của modem và biên tiêu thụ điện của thiết bị được xác
định rõ ngay từ đầu thiết kế.

Từ đó, hệ thống được tách thành ba khối có biên giao tiếp tường minh: thiết bị trên
xe, máy chủ và giao diện. Mỗi khối được kiểm chứng độc lập bằng tiêu chí đo được,
sau đó mới ghép liên khối để tránh lỗi dây chuyền khi tích hợp.

Nguồn được ưu tiên xử lý sớm vì thiết bị lấy điện trực tiếp từ ắc quy xe. Cơ chế ngủ
sâu, đánh thức theo chuyển động và nguồn dự phòng được đưa vào ngay ở pha thiết kế
đầu để giải đồng thời hai yêu cầu đối nghịch: bám xe liên tục và không làm tụt ắc quy
khi xe dừng lâu.

Hình 1.2 minh họa đầy đủ trình tự này, từ khóa yêu cầu đầu vào đến xác nhận kết quả
ở mức hệ thống.

![Hình 1.2 - Trình tự triển khai từ yêu cầu đến sản phẩm hoàn chỉnh](./assets/figures/01-chuong-1-gioi-thieu-hinh-1-2-ai.png)

_Hình 1.2: Trình tự từ yêu cầu, chọn phương án, chế tạo đến kiểm chứng_

## 1.5. Kết quả chính và định hướng sử dụng

Kết quả chính của đồ án là một chuỗi vận hành khép kín từ xe đến người quản lý.
Thiết bị thu vị trí, tốc độ, dữ liệu OBD-II cơ bản và trạng thái nguồn; máy chủ nhận
bản tin, lưu hành trình, tổng hợp dữ liệu và xử lý cảnh báo; giao diện web hiển thị
trạng thái hiện thời đồng thời cho phép tra cứu lại từng chuyến đi theo lịch sử.

![Hình 1.3 - Giao diện tổng quan của hệ thống thật](./assets/result/anh-bien-tap-tu-nguon-that-r2/he-thong-thuc-te-tong-quan-live.png)

_Hình 1.3: Hệ thống hoàn chỉnh gồm thiết bị gắn trên xe, máy chủ xử lý dữ liệu và giao diện web để người quản lý theo dõi trạng thái đội xe_

Thiết bị đổi chế độ theo trạng thái vận hành thực của xe. Khi xe chạy, thiết bị lấy
dữ liệu và gửi bản tin theo chu kỳ để giữ tính liên tục của hành trình. Khi xe dừng,
thiết bị hạ tiêu thụ xuống mức thấp nhưng vẫn giám sát rung hoặc dịch chuyển để kích
hoạt lại đúng thời điểm. Hình 1.4 mô tả cơ chế chuyển trạng thái này.

![Hình 1.4 - Chuyển đổi giữa các chế độ năng lượng của thiết bị](./assets/figures/01-chuong-1-gioi-thieu-hinh-1-4-ai.png)

_Hình 1.4: Thiết bị đổi chế độ theo trạng thái xe để theo dõi và tiết kiệm điện_

Bộ phần cứng đã được chế tạo bằng PCB, đặt trong vỏ in 3D và lắp thử trên xe. Kết
quả đo kiểm xác nhận hệ thống đáp ứng các chức năng cốt lõi: theo dõi vị trí, đọc
OBD-II cơ bản, phát cảnh báo và tổng hợp dữ liệu chuyến đi.

Để làm rõ vì sao các kết quả này đạt được, phần tiếp theo bóc tách bài toán theo từng
ràng buộc kỹ thuật: nguồn, lắp đặt, truyền dữ liệu và tiêu chí nghiệm thu định lượng.

## 1.6. Tiến độ thực hiện theo mốc (dạng Gantt rút gọn)

Để kiểm soát phạm vi và tránh lan man, đồ án được chia thành 6 pha chính theo thứ tự phụ
thuộc kỹ thuật. Cách chia này giúp từng mốc đều có đầu ra rõ: từ chốt yêu cầu, chốt phương
án, đến chế tạo và đo kiểm.

**Bảng 1.3: Tiến độ thực hiện (Gantt rút gọn theo tuần)**

| Hạng mục công việc | Tuần 1-2 | Tuần 3-4 | Tuần 5-6 | Tuần 7-8 | Tuần 9-10 | Tuần 11-12 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Khảo sát bài toán và chốt yêu cầu | ■ | ■ |  |  |  |  |
| Thiết kế kiến trúc tổng thể |  | ■ | ■ |  |  |  |
| Thiết kế phần cứng + PCB |  |  | ■ | ■ |  |  |
| Phát triển firmware và giao tiếp OBD-II |  |  | ■ | ■ | ■ |  |
| Triển khai máy chủ và giao diện |  |  |  | ■ | ■ |  |
| Đo kiểm, tối ưu và hoàn thiện báo cáo |  |  |  |  | ■ | ■ |

Bảng 1.3 cho thấy các hạng mục quan trọng (phần cứng, firmware, backend, kiểm thử) đã
được triển khai theo trình tự có kiểm soát phụ thuộc, không làm chồng chéo các bước cần
đi tuần tự.

# CHƯƠNG 2. PHÂN TÍCH VẤN ĐỀ KỸ THUẬT - PROBLEM ANALYSIS

## 2.1. Mô tả vấn đề

### 2.1.1. Bối cảnh thực tế

Trong mô hình cho thuê xe tự lái, một người quản lý có thể phải theo dõi nhiều xe
trong cùng một ngày. Xe nhận trả ở các thời điểm khác nhau, chạy trên nhiều tuyến
khác nhau, nên nếu dữ liệu đến chậm hoặc rời rạc thì rất khó xử lý tình huống
phát sinh.

Thực tế hiện nay nhiều đơn vị đã dùng thiết bị GPS để theo dõi hành trình xe.
Giải pháp này làm tốt phần vị trí và lịch sử di chuyển. Tuy nhiên, khi cần
kiểm tra trạng thái vận hành của xe, thời gian sử dụng hoặc dữ liệu để đối chiếu
sau chuyến đi thì lượng thông tin đó chưa đủ. Người quản lý vẫn phải xem thêm ở
các nguồn khác.

Đồ án xử lý trực tiếp khoảng trống này: lắp thiết bị lên xe thật, lấy dữ liệu cần
thiết, gửi về máy chủ và hiển thị tập trung cho người quản lý.

### 2.1.2. Các khó khăn kỹ thuật chính

Từ nhu cầu vận hành thực tế, đồ án bóc tách năm điểm kỹ thuật chi phối toàn bộ thiết
kế (Bảng 2.1a và Hình 2.1a).

**Bảng 2.1a: Tóm tắt các khó khăn kỹ thuật chính**

| Nhóm vấn đề       | Điều phải giải quyết                                                          |
| :-------------------- | :--------------------------------------------------------------------------------- |
| Nguồn trên xe       | Thiết bị phải chạy ổn định nhưng không làm tụt ắc quy khi xe đỗ lâu |
| Theo dõi khi xe đỗ | Hệ thống phải ngủ sâu nhưng vẫn tự thức khi có rung hoặc dịch chuyển  |
| Đọc dữ liệu xe    | Cần đọc được OBD-II cơ bản, lắp gọn và ít can thiệp vào điện xe    |
| Truyền dữ liệu     | Phải giữ kết nối qua mạng di động và có gửi bù khi mất mạng           |
| Giao diện khai thác | Người quản lý phải nhìn nhanh vị trí, cảnh báo và dữ liệu chuyến đi |

<div class="center">

`<img src="./assets/figures/02-chuong-2-phan-tich-hinh-2-1a-ai.png" style="width:92.0%" alt="image" />`

</div>

_Hình 2.1a: Năm nhóm khó khăn chi phối việc chọn phần cứng, cách vận hành và giao diện của hệ thống_

Năm điểm này là cơ sở để chốt phần cứng, cách vận hành và cách tổ chức giao diện.

## 2.2. Bối cảnh và cơ sở kỹ thuật

### 2.2.1. Các cách quản lý xe đang dùng trên thực tế

Trong thực tế hiện nay có ba mức triển khai phổ biến. Mức cơ bản chỉ theo dõi vị trí
và lịch sử di chuyển bằng GPS. Mức mở rộng bổ sung cảnh báo, báo cáo và một phần dữ
liệu vận hành. Mức thứ ba là vận hành ghép nhiều nguồn rời: bản đồ, dữ liệu xe và
nhật ký thủ công.

Điểm nghẽn của mức thứ ba không nằm ở chỗ thiếu dữ liệu, mà nằm ở chỗ dữ liệu phân
mảnh theo công cụ. Khi cần truy vết một chuyến đi hoặc xử lý tranh chấp, người vận
hành phải tự ghép thời gian và ngữ cảnh giữa nhiều nguồn nên độ tin cậy thao tác giảm.

### 2.2.2. Đối sánh với yêu cầu của đồ án

Từ bối cảnh trên, đề tài chọn hướng "vừa đủ để quản lý" thay vì mở rộng tối đa chức
năng. Cách chọn này đặt trọng tâm vào khả năng vận hành thật: đọc được dữ liệu xe ở
mức cần thiết, có cảnh báo theo sự kiện, có tổng hợp chuyến đi, nhưng vẫn giữ thiết
bị gọn để lắp ổn định và giữ tổng chi phí trong giới hạn.

**Bảng 2.1: So sánh các hướng tiếp cận quản lý xe**

| Tiêu chí                                          | Theo dõi rời rạc                  | Định vị GPS đơn giản | Hệ thống quản lý thương mại | Hệ thống của đồ án |
| :-------------------------------------------------- | :----------------------------------- | :------------------------- | :--------------------------------- | :----------------------- |
| Theo dõi vị trí thời gian thực                 | Có nhưng phụ thuộc nhiều nguồn | Có                        | Có                                | Có                      |
| Đọc dữ liệu từ xe                              | Gần như không có                 | Hạn chế                  | Có tùy cấu hình                | Có                      |
| Cảnh báo khi xe đỗ hoặc bất thường          | Rời rạc                            | Hạn chế                  | Có                                | Có                      |
| Tổng hợp quãng đường và thời gian sử dụng | Phải ghép thêm số liệu          | Cơ bản                   | Có                                | Có                      |
| Chi phí đầu tư ban đầu                        | Thấp                                | Thấp đến trung bình    | Trung bình đến cao              | Thấp đến trung bình  |
| Khả năng tùy biến theo yêu cầu đồ án       | Thấp                                | Thấp                      | Thấp                              | Cao                      |

Phương án hợp lý nhất là một bộ tích hợp vừa đủ: theo dõi vị trí, đọc OBD-II cơ
bản, phát cảnh báo và tổng hợp chuyến đi. Đây cũng là phạm vi sát nhất với mục
tiêu của đề tài.

## 2.3. Yêu cầu kỹ thuật và tiêu chuẩn thiết kế

### 2.3.1. Chỉ tiêu thiết kế chính

Bảng 2.2 chốt các chỉ tiêu thiết kế và cũng là mốc đối chiếu kết quả ở cuối đồ án.

**Bảng 2.2: Chỉ tiêu thiết kế chính**

| Hạng mục                      | Chỉ tiêu                                                 |
| :------------------------------ | :--------------------------------------------------------- |
| Nguồn cấp thiết bị          | 12-24 VDC                                                  |
| Nền tảng điều khiển        | ESP                                                        |
| Giao tiếp với xe              | OBD-II                                                     |
| Dữ liệu chính cần quản lý | Tọa độ GPS, tốc độ                                   |
| Dữ liệu tổng hợp            | Quãng đường, thời gian sử dụng, chi phí khai thác |
| Cảnh báo chính               | Vượt tốc độ, đỗ lâu                                |
| Môi trường kiểm chứng      | Phòng thí nghiệm và xe thử nghiệm                    |

Quy về vận hành, các chỉ tiêu trên được gom thành bốn yêu cầu kiểm chứng: (1) vị trí
và trạng thái xe phải lên nhanh; (2) OBD-II cơ bản phải đọc ổn định trong pha xe chạy;
(3) khi xe đỗ, thiết bị phải giảm tiêu thụ nhưng vẫn phát hiện rung/dịch chuyển; và
(4) dữ liệu phải đi tới giao diện đủ nhanh để người quản lý xử lý tình huống kịp thời.

### 2.3.2. Ràng buộc thiết kế

Ràng buộc của đồ án đến từ cách lắp thiết bị lên xe thật. Thiết bị phải gọn, phải
giữ được nguồn khi xe dừng lâu, phải chế tạo được bằng PCB và vỏ in 3D, đồng
thời tổng chi phí phải nằm trong giới hạn đã giao.

**Bảng 2.3: Ràng buộc thiết kế**

| Nhóm ràng buộc    | Nội dung                                                              |
| :------------------- | :--------------------------------------------------------------------- |
| Lắp đặt           | Thiết bị phải gọn, ít xâm lấn, lắp được trên xe thật      |
| Năng lượng        | Có chế độ ngủ và nguồn dự phòng để tránh rút cạn ắc quy |
| Truyền dữ liệu    | Dữ liệu phải gửi được qua mạng di động với độ trễ thấp  |
| Khả năng chế tạo | Thiết bị phải chế tạo được bằng PCB và vỏ in 3D             |
| Chi phí             | Tổng chi phí đồ án không vượt 20.000.000 VND                   |
| Chuẩn tham chiếu   | Bố trí mạch theo IPC-2221 và IEC 60664-1                           |

IPC-2221 và IEC 60664-1 được dùng làm mốc bố trí mạch và khoảng cách an toàn điện.

Vì các ràng buộc này, phương án cuối ưu tiên ba trục không thể thay thế: lắp gọn trên
xe thật, nguồn ổn định theo chu kỳ vận hành dài và khả năng chế tạo-lắp lại có thể lặp
chuẩn. Các tính năng mở rộng chỉ được giữ khi không phá vỡ ba trục này.

### 2.3.3. Chỉ tiêu nghiệm thu

Ở giai đoạn nghiệm thu, mỗi chỉ tiêu đều phải đo được ở cả hai điều kiện: bàn thử và
xe thật. Hình 2.1 chỉ rõ tuyến dữ liệu cần theo dõi, còn Bảng 2.4 chốt ngưỡng đạt để
tránh đánh giá cảm tính.

![Hình 2.1 - Luồng dữ liệu của hệ thống](./assets/figures/02-chuong-2-phan-tich-hinh-2-1-ai.png)

_Hình 2.1: Dữ liệu đi từ xe đến thiết bị, máy chủ và giao diện quản lý_

**Bảng 2.4: Chỉ tiêu nghiệm thu chính**

| Hạng mục                                | Chỉ tiêu                                  |
| :---------------------------------------- | :------------------------------------------ |
| Độ chính xác vị trí ngoài trời    | Dưới 5 m trong điều kiện thoáng       |
| Thời gian kết nối OBD-II               | Dưới 10 s                                 |
| Tần suất cập nhật dữ liệu           | 5-10 s                                      |
| Độ trễ từ thiết bị đến giao diện | Dưới 3 s                                  |
| Cảnh báo vượt vùng                   | Dưới 10 s                                 |
| Dòng ngủ sâu                           | Khoảng 0,5 mA cho phương án triển khai |
| Số thiết bị đồng thời               | Từ 50 thiết bị trở lên                 |

## 2.4. Yêu cầu từ các bên liên quan

Ba nhóm quyết định trực tiếp cách thiết kế hệ thống là: đơn vị quản lý xe, người vận
hành kỹ thuật và người lắp đặt trên xe. Bảng 2.5 ghép rõ từng nhu cầu với quyết định
thiết kế tương ứng.

**Bảng 2.5: Yêu cầu từ các bên liên quan và tác động đến thiết kế**

| Bên liên quan               | Điều cần có                                                                       | Tác động đến thiết kế                                                            |
| :---------------------------- | :------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------- |
| Đơn vị quản lý xe        | Biết vị trí xe, trạng thái xe, cảnh báo và báo cáo chuyến đi              | Hệ thống phải có bản đồ, hành trình, cảnh báo và phần tổng hợp dữ liệu |
| Người vận hành kỹ thuật | Biết thiết bị nào đang trực tuyến, mất kết nối hay có vấn đề về nguồn | Giao diện phải có trạng thái thiết bị và thông tin nguồn cơ bản             |
| Việc lắp đặt trên xe     | Lắp nhanh, ít xâm lấn, dễ tháo khi đổi xe                                     | Thiết bị phải gọn, dùng OBD-II không dây và vỏ bảo vệ độc lập             |

Điểm chung giữa ba nhóm là cần thông tin nhanh, thống nhất và ít thao tác chuyển màn
hình. Vì vậy, giao diện chính ưu tiên bản đồ, trạng thái xe và cảnh báo tức thời; lớp
thông tin kỹ thuật chi tiết được tách trang để không làm nhiễu quyết định vận hành.

## Kết luận chương 2

Tập yêu cầu trên quy về ba quyết định bắt buộc cho giai đoạn thiết kế: nguồn phải bền
khi xe đỗ lâu, OBD-II phải đủ dữ liệu nhưng ít xâm lấn hệ thống điện xe, và dữ liệu
phải lên giao diện đủ nhanh để hỗ trợ xử lý vận hành theo thời gian thực.

# CHƯƠNG 3. CÁC GIẢI PHÁP THIẾT KẾ - DESIGN SOLUTIONS

## 3.1. Phân tích tổng thể và nguyên lý làm việc

### 3.1.1. Thành phần chính của hệ thống

Hình 3.1 mô tả ba lớp chức năng chính của hệ thống theo tuyến dữ liệu từ xe đến người
quản lý. Vai trò từng lớp được phân tách rõ như sau:

- Thiết bị trên xe: thu GPS, OBD-II, trạng thái nguồn và tín hiệu chuyển động.
- Máy chủ: nhận bản tin, chuẩn hóa dữ liệu, lưu hành trình và xử lý cảnh báo.
- Giao diện: hiển thị vị trí xe, trạng thái vận hành và dữ liệu chuyến đi.

Cách tách lớp này giúp mỗi khối tập trung đúng việc của mình: xe ưu tiên thu dữ liệu
ổn định, máy chủ ưu tiên lưu-truy vấn-cảnh báo, giao diện ưu tiên tốc độ quan sát và
ra quyết định.

![Hình 3.1 - Sơ đồ tổng thể của hệ thống thiết bị theo dõi](./assets/figures/03-chuong-3-giai-phap-phan-cung-hinh-3-1-ai.png)

_Hình 3.1: Quan hệ giữa thiết bị trên xe, máy chủ và giao diện quản lý_

### 3.1.2. Tiêu chí chốt phương án

Mọi lựa chọn đều được kiểm theo bốn tiêu chí: đủ chức năng, gọn khi lắp, tiêu thụ
điện hợp lý và chi phí phù hợp. Bốn tiêu chí này được dùng xuyên suốt cho từng cụm
quyết định ngay sau đây: MCU, mô-đun 4G+GPS, cách lấy OBD-II và phương án nguồn/cảm
biến chuyển động.

## 3.2. Đề xuất và lựa chọn phần cứng trên xe

Phần cứng trên xe quyết định trực tiếp thiết bị có vận hành bền trong điều kiện thực tế
hay không. Các lựa chọn vì vậy không chốt theo từng linh kiện rời, mà chốt theo chuỗi
phụ thuộc hệ thống: năng lực điều khiển trung tâm, ổn định truyền dữ liệu-định vị, mức
xâm lấn khi lấy OBD-II và khả năng duy trì năng lượng trong trạng thái xe đỗ.

### 3.2.1. Vi điều khiển trung tâm

Vi điều khiển trung tâm phải xử lý đồng thời modem, OBD-II không dây, cảm biến, chế độ ngủ và gửi bản tin. Bộ điều khiển vì thế cần đủ cổng giao tiếp, chạy ổn định và tích hợp được trên một bo mạch.

**Bảng 3.1: Ma trận quyết định chọn vi điều khiển**

| Tiêu chí                           | Trọng số | ESP32-S3     | STM32L4 + Bluetooth rời | nRF52840 |
| :----------------------------------- | :--------- | :----------- | :----------------------- | :------- |
| Đủ cổng giao tiếp cho hệ thống | 3          | 5            | 4                        | 3        |
| Có sẵn Bluetooth để đọc OBD-II | 3          | 5            | 2                        | 5        |
| Hỗ trợ ngủ sâu                   | 2          | 4            | 4                        | 4        |
| Dễ tích hợp trên một bo mạch   | 3          | 5            | 3                        | 3        |
| Điểm tổng                         |            | **46** | 32                       | 37       |

ESP32-S3 được chọn vì đáp ứng tốt nhất nhóm yêu cầu của đồ án. Phần thuận ở đây
là chip đã có sẵn Bluetooth, đủ cổng giao tiếp và dễ gom toàn bộ hệ thống lên một
PCB.

Nếu dùng STM32L4, bo mạch phải ghép thêm Bluetooth rời nên mạch sẽ dài hơn và số
phần phải xử lý cũng tăng lên. So với nRF52840, ESP32-S3 hợp hơn với yêu cầu giao
tiếp đồng thời của hệ thống này.

### 3.2.2. Truyền dữ liệu và định vị

Phần truyền dữ liệu và định vị quyết định việc thông tin có đi được từ xe về máy
chủ ổn định hay không. Với thiết bị đặt trên xe, số lượng mô-đun rời và số dây
nối ảnh hưởng trực tiếp đến độ gọn khi lắp.

**Bảng 3.2: Ma trận quyết định chọn mô-đun truyền dữ liệu và định vị**

| Tiêu chí                              | Trọng số | A7670C + GPS rời | EC200U + GPS rời | SIM7600CE-T  |
| :-------------------------------------- | :--------- | :---------------- | :---------------- | :----------- |
| Số lượng mô-đun cần lắp          | 3          | 2                 | 2                 | 5            |
| Độ gọn của phần cứng              | 3          | 3                 | 3                 | 5            |
| Mức độ đơn giản khi điều khiển | 2          | 3                 | 3                 | 5            |
| Phù hợp lắp trên xe thử nghiệm    | 3          | 3                 | 3                 | 5            |
| Điểm tổng                            |            | 28                | 28                | **50** |

SIM7600CE-T được chọn vì gộp 4G và GPS trong cùng một mô-đun. Nhờ đó, sơ đồ dây
ngắn hơn, ít chỗ nối hơn và thiết bị gọn hơn khi đặt trong cabin hoặc dưới táp
lô.

Hai phương án dùng GPS rời vẫn đáp ứng được chức năng, nhưng phần cứng sẽ dài hơn
và số dây trong vỏ cũng tăng lên. Với đồ án này, phương án tích hợp hợp lý hơn vì
gọn hơn và dễ lắp hơn.

### 3.2.3. Giao tiếp OBD-II

Phần OBD-II phải đáp ứng hai yêu cầu cùng lúc: đọc được dữ liệu đủ dùng và vẫn
giữ việc lắp đặt đơn giản. Nếu đi dây trực tiếp, bộ theo dõi sẽ rườm rà hơn và mức
can thiệp vào điện xe cũng cao hơn.

**Bảng 3.3: Ma trận quyết định chọn cách lấy dữ liệu OBD-II**

| Tiêu chí                   | Trọng số | Đấu trực tiếp | Bộ chuyển đổi có dây | Bộ chuyển đổi Bluetooth |
| :--------------------------- | :--------- | :---------------- | :------------------------- | :-------------------------- |
| Ít can thiệp vào xe       | 3          | 1                 | 3                          | 5                           |
| Dễ lắp và tháo           | 3          | 1                 | 3                          | 5                           |
| Dễ thay thế khi đổi xe   | 2          | 1                 | 3                          | 5                           |
| Đủ dữ liệu cho quản lý | 3          | 5                 | 4                          | 4                           |
| Điểm tổng                 |            | 23                | 36                         | **52**                |

Đồ án chọn bộ chuyển đổi OBD-II Bluetooth `vgate iCar Pro`. Cách làm này lắp
nhanh, ít xâm lấn và vẫn đọc đủ nhóm dữ liệu cơ bản cần cho quản lý xe. Khi đổi
xe hoặc tháo lắp lại, việc thao tác cũng nhẹ hơn nhiều so với kéo dây trực tiếp.

Phương án đấu trực tiếp cho dữ liệu sâu hơn, nhưng việc lắp đặt nặng hơn. Phương
án bộ chuyển đổi có dây bớt can thiệp hơn, nhưng vẫn để lại nhiều dây trong cabin.
Với phạm vi của đồ án, OBD-II không dây là phương án hợp lý nhất.

![Hình 3.2a - Kết nối không dây giữa thiết bị và bộ đọc OBD-II](./assets/figures/03-chuong-3-giai-phap-phan-cung-hinh-3-2.svg)

_Hình 3.2a: Thiết bị nhận dữ liệu xe qua bộ đọc OBD-II không dây_

### 3.2.4. Cảm biến chuyển động và nguồn

Khi xe đỗ, thiết bị không thể giữ mọi phần của mạch hoạt động liên tục vì dòng tiêu
thụ sẽ tăng lên rõ rệt. Do đó hệ thống cần một cảm biến đủ đơn giản để đánh thức
thiết bị khi có rung hoặc dịch chuyển. Đi cùng với nó là cách cấp nguồn vừa ổn
định khi xe chạy, vừa tránh kéo tụt ắc quy khi xe dừng lâu.

**Bảng 3.4: Ma trận quyết định chọn cảm biến chuyển động**

| Tiêu chí                           | Trọng số | Công tắc rung | IMU 6 trục | LIS3DSH      |
| :----------------------------------- | :--------- | :-------------- | :---------- | :----------- |
| Tiêu thụ điện thấp              | 3          | 4               | 2           | 5            |
| Độ ổn định khi phát hiện rung | 3          | 2               | 4           | 4            |
| Dễ dùng với MCU                   | 2          | 3               | 3           | 5            |
| Phù hợp mục tiêu của đồ án   | 3          | 2               | 3           | 5            |
| Điểm tổng                         |            | 28              | 31          | **50** |

LIS3DSH được chọn vì tiêu thụ thấp, làm việc tin cậy và có chân ngắt để đánh thức
thiết bị khi xe đang đỗ mà xuất hiện rung hoặc dịch chuyển. Với mục tiêu của đề
tài, chừng đó là đủ.

Công tắc rung đơn giản nhưng độ lặp lại thấp. IMU 6 trục mạnh hơn, nhưng vượt quá
nhu cầu của hệ thống. LIS3DSH cho phương án gọn và vừa tầm.

![Hình 3.2 - Sơ đồ nguồn của thiết bị](./assets/figures/03-chuong-3-giai-phap-phan-cung-hinh-3-4.svg)

_Hình 3.2: Nguồn xe được chia cho mạch xử lý, modem và nguồn dự phòng_

![Hình 3.2b - Kiến trúc phân phối nguồn trong thiết bị](./assets/figures/03-chuong-3-giai-phap-phan-cung-hinh-3-4a.svg)

_Hình 3.2b: Các nhánh nguồn chính trong thiết bị_

Sơ đồ nguồn được chia thành bốn nhánh chính:

- nhánh 3,3 V cho logic;
- nhánh khoảng 4 V cho modem;
- nhánh sạc và pin dự phòng;
- mạch bảo vệ điện áp thấp để bảo vệ ắc quy xe.

## 3.3. Đề xuất và lựa chọn cách vận hành, xử lý dữ liệu

Sau khi chốt phần cứng, bài toán chuyển sang logic vận hành và đường đi dữ liệu. Thiết
bị được thiết kế theo bốn trạng thái: chạy, đỗ, ngủ sâu và cảnh báo. Mô hình trạng thái
này giải đồng thời hai ràng buộc khó nhất: giảm tiêu thụ điện trong pha xe dừng và vẫn
không bỏ sót sự kiện cần cảnh báo khi hệ thống ở mức năng lượng thấp.

![Hình 3.3 - Sơ đồ chế độ làm việc chính của thiết bị](./assets/figures/04-chuong-3-giai-phap-firmware-hinh-3-11.svg)

_Hình 3.3: Thiết bị đổi chế độ theo trạng thái chạy, đỗ và cảnh báo_

Hình 3.3a diễn tả cụ thể hơn trình tự này, từ lúc kiểm tra nguồn đến lúc gửi bản
tin rồi quyết định ngủ hay tiếp tục làm việc.

![Hình 3.3a - Lưu đồ vận hành chính của thiết bị](./assets/figures/04-chuong-3-giai-phap-firmware-hinh-3-7.svg)

_Hình 3.3a: Trình tự lấy dữ liệu, gửi bản tin và chuyển chế độ của thiết bị_

**Bảng 3.5: Các phương án kỹ thuật chốt cho hệ thống**

| Hạng mục                        | Phương án chốt                                          | Cơ sở chọn                                                            |
| :-------------------------------- | :---------------------------------------------------------- | :----------------------------------------------------------------------- |
| Cách vận hành thiết bị       | Chia theo từng chế độ làm việc                        | Dễ quản lý đọc dữ liệu, gửi dữ liệu và chuyển chế độ ngủ |
| Kênh gửi dữ liệu              | MQTT                                                        | Nhẹ, phù hợp dữ liệu nhỏ gửi lặp lại                            |
| Tiếp nhận và xử lý dữ liệu | Máy chủ tách phần nhận, lưu và cảnh báo            | Dễ vận hành và dễ mở rộng                                         |
| Lưu trữ dữ liệu               | Cơ sở dữ liệu cho hành trình và dữ liệu vận hành | Phù hợp bài toán quản lý xe                                        |
| Giao diện web                    | Giao diện tập trung                                       | Dễ nhìn bản đồ, trạng thái và cảnh báo                         |
| Ứng dụng di động              | Ứng dụng hỗ trợ theo dõi nhanh                         | Thuận tiện nhận cảnh báo trên điện thoại                        |

Hai quyết định kỹ thuật then chốt ở phần này là cơ chế chuyển trạng thái của thiết bị
và giao thức truyền dữ liệu. Với bản tin ngắn, gửi lặp theo chu kỳ và yêu cầu độ trễ
thấp, MQTT là lựa chọn phù hợp vì giảm overhead kết nối nhưng vẫn giữ được độ tin cậy
ở mức cần thiết cho bài toán vận hành.

Ở phía máy chủ, logic được khóa vào ba nhiệm vụ: nhận bản tin, lưu lịch sử và phát cảnh
báo theo sự kiện. Giao diện chỉ giữ các màn hình trực tiếp phục vụ điều hành để luồng
quan sát không bị đứt bởi các trang phụ ít dùng.

![Hình 3.4 - Kiến trúc xử lý dữ liệu ở máy chủ](./assets/figures/05-chuong-3-giai-phap-backend-hinh-3-12.svg)

_Hình 3.4: Dữ liệu từ xe được nhận, lưu và xử lý tại máy chủ_

![Hình 3.5 - Luồng dữ liệu từ thiết bị đến giao diện quản lý](./assets/figures/05-chuong-3-giai-phap-backend-hinh-3-12a.svg)

_Hình 3.5: Tuyến dữ liệu từ thiết bị đến màn hình theo dõi_

Phần giao diện giữ ba màn hình chính: thiết bị, bản đồ và dữ liệu chi tiết. Người
quản lý theo dõi xe và xử lý cảnh báo ngay trên các màn hình này, không phải đi qua
nhiều trang phụ.

![Hình 3.6 - Cách tổ chức giao diện khai thác chính](./assets/figures/06-chuong-3-giai-phap-frontend-hinh-3-21.svg)

_Hình 3.6: Giao diện chính ưu tiên bản đồ, trạng thái và cảnh báo_

## 3.4. Phương án thiết kế cuối

Phương án thiết kế cuối được khóa ở bốn lựa chọn chính: ESP32-S3 cho điều khiển trung
tâm, SIM7600CE-T cho truyền dữ liệu và định vị, LIS3DSH cho cơ chế đánh thức theo
chuyển động, và OBD-II Bluetooth cho dữ liệu vận hành cơ bản. Trên nền phần cứng đó,
thiết bị vận hành theo bốn trạng thái chạy-đỗ-cảnh báo-ngủ sâu để cân bằng độ bám xe
và mức tiêu thụ điện.

Ở tầng máy chủ, MQTT được dùng làm kênh tiếp nhận bản tin trước khi dữ liệu được lưu
hành trình, trạng thái và cảnh báo. Giao diện khai thác giữ bốn cụm thông tin cốt lõi:
bản đồ, trạng thái thiết bị, dữ liệu chi tiết và cảnh báo sự kiện.

## Kết luận chương 3

Đến cuối phần thiết kế, phương án kỹ thuật đã được khóa cho cả ba lớp: thiết bị, máy
chủ và giao diện; đồng thời cơ sở chọn của từng quyết định đã được lượng hóa bằng ma
trận và tiêu chí vận hành. Bước tiếp theo là kiểm chứng theo chuỗi từ phần cứng lắp
trên xe, đến hành vi vận hành và các số đo toàn tuyến dữ liệu.

# CHƯƠNG 4. TRIỂN KHAI GIẢI PHÁP VÀ KẾT QUẢ - IMPLEMENTATION AND RESULTS

## 4.1. Phần cứng thiết bị

Phần cứng của thiết bị gồm khối nguồn, bo mạch xử lý trung tâm, khối truyền thông,
bộ nhớ, cảm biến và bộ đọc OBD-II không dây. Các khối này được ghép thành một bộ
hoàn chỉnh để lắp thử trên xe thật.

![Hình 4.1 - Sơ đồ các khối chính của thiết bị phần cứng](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4-1.png)

_Hình 4.1: Các khối chính của thiết bị, trong đó khối nguồn được ghi rõ theo các mô-đun nguồn sử dụng_

Hình 4.1 cho thấy cách các khối chính nối với nhau. Nguồn xe 12V/24V đi vào khối
nguồn trên PCB, sau đó cấp cho khối xử lý trung tâm, khối truyền thông và các phần
phụ trợ. Bộ đọc OBD-II đặt rời ngoài PCB và trao đổi dữ liệu với bo mạch qua
Bluetooth. Cách chia khối này giúp sơ đồ dễ theo dõi và thuận tiện hơn khi kiểm tra.

Hình 4.2 tách riêng phần nguồn để thấy rõ các nhánh cấp cho mạch logic, modem và
nguồn dự phòng. Cách cấp nguồn này giúp thiết bị làm việc ổn định hơn khi điện áp
trên xe thay đổi hoặc khi modem phát công suất cao.

![Hình 4.2 - Sơ đồ phân nhánh nguồn](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4-6.png)

_Hình 4.2: Nguồn xe 12-24 VDC được phân nhánh cho logic, modem và nguồn dự phòng_

Để tránh kéo thêm dây trong cabin, bộ theo dõi không được cắm trực tiếp vào cổng
OBD-II. Bộ chuyển đổi OBD-II được đặt ở cổng dưới táp lô, còn thiết bị theo dõi
đặt tách rời trong cabin theo không gian của từng xe và liên lạc với bộ đọc
qua Bluetooth.

![Hình 4.2a - Sơ đồ nguyên lý bố trí bộ đọc OBD-II và thiết bị theo dõi trên xe](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4-14.png)

_Hình 4.2a: Bộ đọc OBD-II đặt ở cổng xe, còn thiết bị theo dõi đặt tách rời trong cabin_

**Bảng 4.1: Các phần cứng đã hoàn thành**

| Thành phần                     | Kết quả                                                         |
| :------------------------------- | :---------------------------------------------------------------- |
| PCB thiết bị                   | Thiết kế, gia công và lắp ráp hoàn chỉnh                  |
| Nguồn 12-24 VDC                 | Hoạt động ổn định trên dải điện áp mục tiêu          |
| MCU trung tâm                   | ESP32-S3 vận hành ổn định                                    |
| Truyền dữ liệu và định vị | SIM7600CE-T gửi dữ liệu và định vị tốt                    |
| OBD-II                           | Kết nối Bluetooth với vgate iCar Pro, đọc dữ liệu cơ bản |
| Cảm biến chuyển động        | LIS3DSH đánh thức thiết bị và tạo cảnh báo               |
| Nguồn dự phòng                | Giữ thiết bị hoạt động khi mất nguồn chính               |
| Cơ khí                         | PCB và vỏ in 3D, lắp được trên xe thử nghiệm             |

Đến giai đoạn này, phần cứng đã đi hết chuỗi bắt buộc: thiết kế PCB, lắp ráp, đóng
vỏ và lắp thử trên xe. Kết quả là một bộ thiết bị hoàn chỉnh có thể vận hành trên xe
thật.

Hình 4.3a cho thấy trình tự lắp nguyên mẫu theo từng bước để bảo đảm việc lắp đặt có
thể lặp lại.

![Hình 4.3a - Quy trình triển khai nguyên mẫu phần cứng](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4-12.png)

_Hình 4.3a: Trình tự lắp nguyên mẫu từ kiểm tra linh kiện đến đóng vỏ_

## 4.2. Hoạt động của thiết bị và máy chủ

Trong vận hành thực, thiết bị đi qua chuỗi hành vi cố định: khởi động, kiểm tra nguồn,
lấy vị trí, ghép OBD-II, gửi dữ liệu; sau đó chuyển ngủ sâu khi xe dừng và tự đánh thức
khi có rung hoặc đến chu kỳ gửi tin. Chuỗi này giúp thiết bị bám sát trạng thái xe mà
vẫn giữ tiêu thụ điện trong vùng an toàn cho ắc quy.

Khi xe bắt đầu hoạt động, thiết bị thức dậy, bật modem, đồng bộ GPS và ghép OBD-II.
Trong pha xe chạy, dữ liệu vị trí-tốc độ-trạng thái được gửi đều về máy chủ. Khi xe dừng,
thiết bị hạ tiêu thụ nhưng vẫn canh rung/dịch chuyển để không bỏ lỡ sự kiện vận hành.

**Bảng 4.2: Các chức năng chính trên thiết bị đã chạy ổn định**

| Nhóm chức năng        | Kết quả                                                                             |
| :----------------------- | :------------------------------------------------------------------------------------ |
| Quản lý trạng thái   | Thiết bị chuyển đúng giữa chạy, đỗ, cảnh báo và ngủ                      |
| Đọc vị trí GPS       | Thu được vị trí, số vệ tinh, tốc độ                                         |
| Đọc OBD-II             | Thu được RPM, tốc độ xe, nhiệt độ nước, mức nhiên liệu, tải động cơ |
| Quản lý nguồn         | Theo dõi điện áp, bảo vệ ắc quy, dùng pin dự phòng                          |
| Gửi dữ liệu           | Gửi đều dữ liệu vị trí, trạng thái và sự kiện lên máy chủ              |
| Cảnh báo               | Phát hiện vượt tốc độ, rung khi xe đỗ, ra khỏi vùng cho phép              |
| Lưu tạm khi mất mạng | Giữ dữ liệu và gửi bù khi có lại kết nối                                    |

![Hình 4.4 - Sơ đồ hệ thống máy chủ](./assets/figures/09-chuong-4-trien-khai-cloud-hinh-4-15.svg)

_Hình 4.4: Luồng dữ liệu từ thiết bị lên máy chủ và ra giao diện khai thác_

![Hình 4.4a - Cấu trúc triển khai các dịch vụ máy chủ](./assets/figures/09-chuong-4-trien-khai-cloud-hinh-4-16.png)

_Hình 4.4a: Các dịch vụ nhận dữ liệu, lưu trữ và khai thác của máy chủ_

Ở tầng máy chủ, ba nhiệm vụ được tách rõ: tiếp nhận bản tin, xử lý-lưu trữ và cung cấp
kết quả ra giao diện. Việc tách vai trò này giúp phần trên xe giữ mức đơn giản cần thiết,
trong khi logic tổng hợp-cảnh báo được tập trung hóa để dễ kiểm soát khi tăng số lượng
thiết bị đồng thời.

**Bảng 4.3: Các phần chính trên máy chủ**

| Thành phần          | Kết quả triển khai                                                   |
| :-------------------- | :---------------------------------------------------------------------- |
| Kênh nhận dữ liệu | Nhận ổn định dữ liệu gửi từ thiết bị                          |
| Xử lý trung gian    | Chuẩn hóa dữ liệu, tách vị trí, trạng thái và cảnh báo      |
| Lưu trữ             | Lưu hành trình, dữ liệu vận hành, thiết bị và cảnh báo      |
| Ứng dụng            | Cung cấp giao diện web và ứng dụng di động cho người quản lý |

## 4.3. Giao diện khai thác

Giao diện web là điểm tương tác chính của người quản lý nên ưu tiên tốc độ quan sát và
xử lý tình huống. Bố cục được giữ quanh ba tác vụ cốt lõi: theo dõi vị trí, nhận cảnh
báo và tra cứu chuyến đi. Vì vậy, bản đồ-trạng thái-cảnh báo nằm ở màn hình chính, còn
các thông tin thiên về kỹ thuật được tách sang lớp chi tiết.

![Hình 4.5 - Giao diện chi tiết thiết bị trên hệ thống thật](./assets/result/anh-bien-tap-tu-nguon-that-r2/he-thong-thuc-te-chi-tiet-thiet-bi-live.png)

_Hình 4.5: Màn hình chi tiết thiết bị với trạng thái, thời gian chạy và vị trí gần nhất_

![Hình 4.6 - Bản đồ giám sát phương tiện trên hệ thống thật](./assets/result/anh-bien-tap-tu-nguon-that-r2/he-thong-thuc-te-ban-do-live.png)

_Hình 4.6: Màn hình bản đồ theo dõi vị trí và trạng thái xe_

![Hình 4.7 - Màn hình dữ liệu OBD-II và dữ liệu thô trên hệ thống](./assets/result/anh-bien-tap-tu-nguon-that-r2/he-thong-thuc-te-du-lieu-obd-raw-data.png)

_Hình 4.7: Màn hình kiểm tra dữ liệu OBD-II và bản tin thiết bị gửi về_

Màn hình tổng hợp cho biết xe nào đang trực tuyến, xe nào mất kết nối và xe nào có
cảnh báo. Màn hình bản đồ dùng để bám hành trình và vùng quản lý. Màn hình OBD-II
chỉ giữ các thông số cơ bản, đủ cho việc kiểm tra xe và đối chiếu trạng thái vận
hành.

Bên cạnh web, đồ án có lớp theo dõi trên điện thoại ở mức **hỗ trợ vận hành**: nhận
cảnh báo đẩy và xem nhanh trạng thái khi người quản lý không ngồi trước máy tính.
Phạm vi đồ án không phát triển đầy đủ toàn bộ nghiệp vụ trên mobile như bản web,
mà tập trung vào các tác vụ phản ứng nhanh.

## 4.4. Kết quả kiểm thử theo mục tiêu

Sau khi xác nhận phần cứng, máy chủ và giao diện vận hành ổn định, bước tiếp theo là
kiểm chứng định lượng theo mục tiêu đã khóa từ đầu. Câu hỏi cần trả lời không phải
"hệ thống có chạy hay không", mà là "hệ thống có đạt đúng ngưỡng vận hành khi lắp trên
xe thật hay không". Các phép đo được chia thành hai nhóm:

- Trên bàn thử: kiểm tra dòng ngủ, dòng hoạt động, chuyển nguồn, phản hồi OBD-II
  và độ trễ truyền dữ liệu.
- Trên xe: kiểm tra GPS, hành trình, cảnh báo và khả năng khai thác trên giao
  diện.

Nguyên tắc đo là: điều kiện thử phải rõ, và kết quả phải theo được tới màn hình cuối.

![Hình 4.7a - Sơ đồ bố trí đo kiểm trong phòng thí nghiệm](./assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-20.png)

_Hình 4.7a: Bố trí đo kiểm trong phòng thí nghiệm_

![Hình 4.7b - Thiết bị lắp trên xe thử nghiệm](./assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-21.svg)

_Hình 4.7b: Phương án thử trên xe với thiết bị theo dõi và bộ đọc OBD-II_

![Hình 4.7c - Sơ đồ chuỗi kiểm thử tổng thể](./assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-22.svg)

_Hình 4.7c: Chuỗi kiểm thử từ thiết bị đến giao diện quan sát_

**Bảng 4.4a: Cơ sở của các phép đo chính**

| Nhóm đo                        | Điều kiện đo                                                                        | Căn cứ đánh giá                                                         |
| :------------------------------- | :-------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------- |
| Nguồn và tiêu thụ điện     | Cấp nguồn DC mô phỏng nguồn xe, theo dõi dòng và chuyển nguồn                 | Đánh giá ảnh hưởng lên ắc quy và khả năng duy trì hoạt động   |
| Đọc dữ liệu OBD-II           | Ghép bộ đọc Bluetooth, đọc lặp các PID cơ bản                                 | Đánh giá tốc độ kết nối và độ ổn định của dữ liệu xe        |
| Định vị GPS                   | Lắp trên xe, chạy ngoài trời và quan sát bản đồ                               | Đánh giá thời gian lên vị trí và độ chính xác ngoài thực địa |
| Truyền dữ liệu và giao diện | So sánh thời điểm thiết bị gửi dữ liệu với thời điểm giao diện cập nhật | Đánh giá mức thời gian thực của toàn hệ thống                      |
| Cảnh báo và xử lý sự kiện | Tạo vùng thử, kịch bản đỗ lâu, rung hoặc mất mạng                            | Đánh giá khả năng phục vụ trực tiếp cho quản lý xe                |

**Bảng 4.4: Kết quả kiểm thử theo mục tiêu vận hành**

| Mục tiêu kiểm tra                                       | Cách quan sát                                                                        | Kết quả                                                                             |
| :--------------------------------------------------------- | :------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| Xe vừa hoạt động thì thiết bị có thức dậy không | Quan sát trạng thái thiết bị sau khi cấp nguồn hoạt động                     | Thiết bị thức dậy sau khoảng 2 s                                                 |
| Dữ liệu xe có đọc được không                      | Kết nối OBD-II không dây và đọc dữ liệu cơ bản                              | Kết nối sau khoảng 4 s, phản hồi dữ liệu khoảng 60-75 ms                      |
| Vị trí xe có lên nhanh không                          | Quan sát vị trí xe trên bản đồ                                                  | Sau khoảng 5 s thiết bị lấy lại vị trí, bản đồ cập nhật sau khoảng 1-2 s |
| Dữ liệu có lên máy chủ ổn định không             | So sánh thời điểm thiết bị gửi dữ liệu và thời điểm giao diện cập nhật | Độ trễ truyền dữ liệu khoảng 120-180 ms                                        |
| Khi mất mạng có bị mất hẳn dữ liệu không          | Ngắt mạng rồi cho kết nối lại                                                    | Thiết bị lưu đệm và gửi bù khi có mạng                                      |
| Khi xe ra khỏi vùng cho phép có báo không            | Tạo vùng thử và chạy xe qua ranh giới                                            | Cảnh báo xuất hiện sau khoảng 5-7 s                                              |
| Hệ thống có đủ sức phục vụ nhóm xe nhỏ không    | Tăng số thiết bị mô phỏng đồng thời                                           | Ổn định với từ 50 thiết bị trở lên                                           |

Bảng 4.4 cho thấy hệ thống đạt đúng các mục tiêu vận hành đã đặt: thiết bị thức dậy
nhanh, OBD-II phản hồi trong vùng thời gian chấp nhận, vị trí cập nhật kịp theo chuyến
đi, dữ liệu hiển thị gần thời gian thực và cảnh báo xuất hiện đủ sớm để can thiệp.

![Hình 4.8 - Cảnh báo geofence trên giao diện quản lý](./assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-35.svg)

_Hình 4.8: Giao diện cảnh báo khi xe ra khỏi vùng cho phép_

![Hình 4.9 - Phục hồi hành trình sau khi có lại kết nối](./assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-37.svg)

_Hình 4.9: Bản đồ tiếp tục cập nhật hành trình sau khi kết nối được phục hồi_

**Bảng 4.5: Các số liệu đo kiểm chính**

| Hạng mục                                      | Kết quả đạt được |
| :---------------------------------------------- | :---------------------- |
| Dòng ngủ sâu                                 | ~500 µA (~0,5 mA)      |
| Dòng hoạt động trung bình                  | ~180-220 mA             |
| Thời lượng pin dự phòng                    | ~2,6-3,0 giờ           |
| Độ chính xác GPS ngoài trời               | ~2-3 m                  |
| Kết nối OBD-II không dây                    | ~4 s                    |
| Phản hồi dữ liệu OBD-II                     | ~60-75 ms               |
| Độ trễ truyền dữ liệu qua mạng di động | ~120-180 ms             |
| Thời gian khôi phục kết nối                | ~15-30 s                |
| Cập nhật bản đồ thời gian thực           | ~1-2 s                  |
| Cảnh báo vượt vùng                         | ~5-7 s                  |
| Thời gian phản hồi máy chủ                 | ~95-200 ms              |
| Số thiết bị đồng thời                     | 50+ thiết bị          |

Các số đo chính đều nằm trong khoảng mục tiêu. Dòng ngủ sâu khoảng 0,5 mA giúp hạn
chế ảnh hưởng lên ắc quy khi xe đỗ lâu. GPS, OBD-II và độ trễ cập nhật đáp ứng nhu
cầu theo dõi thời gian thực. Hệ thống cũng giữ ổn định khi tăng tải lên mức 50+
thiết bị.

Các đồ thị dưới đây cho thấy rõ hơn các kết quả chính.

![Hình 4.10 - Dòng tiêu thụ theo chu kỳ hoạt động](./assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-23.svg)

_Hình 4.10: Dòng tiêu thụ thay đổi theo các trạng thái chạy, đỗ, cảnh báo và ngủ sâu của thiết bị_

Đồ thị dòng cho thấy rõ hai trạng thái làm việc. Khi modem phát 4G, dòng tăng theo
các đỉnh ngắn. Khi xe đỗ, dòng hạ xuống vùng deep sleep và giữ ở mức rất thấp.
Đây là phần cần quan tâm vì liên quan trực tiếp đến ắc quy xe.

![Hình 4.11 - Phân bố thời gian kết nối OBD-II Bluetooth](./assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-26.svg)

_Hình 4.11: Phần lớn các lần ghép nối OBD-II hoàn thành trong vùng 3-5 s, phù hợp với yêu cầu vận hành thực tế_

Thời gian ghép OBD-II tập trung chủ yếu trong khoảng 3-5 s. Mức này đủ để thiết
bị lấy dữ liệu xe ngay sau khi xe bắt đầu hoạt động.

![Hình 4.12 - Thời gian lấy lại vị trí GPS](./assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-27.svg)

_Hình 4.12: Ở các lần khởi động lại thông thường, thiết bị lấy lại vị trí nhanh nhờ điều kiện warm start và hot start_

Với bài toán này, điều quan trọng là xe vừa di chuyển thì vị trí phải lên kịp.
Kết quả ở Hình 4.12 cho biết thiết bị lấy lại vị trí trong vài giây và theo kịp
chuyến đi.

![Hình 4.13 - Phân bố độ trễ từ thiết bị đến giao diện](./assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-30.svg)

_Hình 4.13: Độ trễ toàn tuyến tập trung chủ yếu ở khâu truyền qua mạng di động, còn phần xử lý trong máy chủ chiếm tỷ trọng nhỏ_

Độ trễ lớn nhất nằm ở đoạn truyền qua mạng 4G. Sau khi bản tin vào máy chủ, phần
lưu trữ và cập nhật giao diện diễn ra nhanh.

![Hình 4.14 - So sánh chỉ tiêu thiết kế và kết quả đạt được](./assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-38.svg)

_Hình 4.14: Các chỉ tiêu chính đều nằm trong vùng mục tiêu đã đặt ra từ đầu_

Hình 4.14 đặt kết quả đo cạnh các chỉ tiêu đã chốt từ đầu. Các chỉ tiêu về nguồn, GPS,
OBD-II, độ trễ và khả năng phục vụ đồng thời đều nằm trong giới hạn đặt ra.

## 4.5. Đối chiếu với mục tiêu của đồ án

Bảng 4.6 đối chiếu trực tiếp từng mục tiêu đề tài với kết quả của bộ thiết bị hoàn chỉnh.

**Bảng 4.6: Kiểm chứng chỉ tiêu thiết kế**

| Mục tiêu theo đồ án               | Kết quả triển khai                                                               |
| :------------------------------------- | :---------------------------------------------------------------------------------- |
| Nguồn 12-24 VDC                       | Thiết bị làm việc ổn định trên nguồn xe 12-24 VDC                          |
| Nền tảng ESP                         | Đã triển khai trên ESP32-S3                                                     |
| Giao tiếp OBD-II                      | Đã đọc dữ liệu OBD-II qua Bluetooth                                           |
| Theo dõi tọa độ GPS, tốc độ     | Đã theo dõi theo thời gian thực trên bản đồ                                |
| Tính quãng đường                  | Đã tổng hợp theo hành trình thực tế của xe                                 |
| Tính thời gian sử dụng             | Đã tổng hợp theo chuyến đi và thời gian xe hoạt động                     |
| Ước tính chi phí khai thác        | Đã tổng hợp theo quãng đường, thời gian sử dụng và dữ liệu vận hành |
| Cảnh báo vượt tốc độ            | Đã triển khai và hiển thị trên giao diện web                                |
| Cảnh báo đỗ lâu                   | Đã triển khai qua trạng thái đỗ và thời gian không hoạt động           |
| Chế tạo PCB và lắp đặt thực tế | Đã hoàn thành PCB, vỏ in 3D và kiểm thử trên xe                            |

Ngoài các mục tiêu chính, hệ thống còn triển khai quản lý vùng và cảnh báo ra khỏi vùng cho phép để hỗ trợ kiểm soát phạm vi khai thác xe.

**Bảng 4.7: Kiểm chứng các ràng buộc thiết kế**

| Ràng buộc thiết kế                                   | Kết quả                                                                                                 |
| :------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| Chi phí toàn bộ đồ án không vượt 20.000.000 VND | Tổng chi phí triển khai ở mức 4.504.000-5.704.000 VND                                                |
| Thiết bị chế tạo được bằng PCB và vỏ in 3D     | Đã chế tạo PCB, lắp trong vỏ in 3D và lắp thử trên xe                                           |
| Kiểm chứng trong phòng thí nghiệm                   | Đã đo dòng ngủ, dòng hoạt động, độ trễ truyền dữ liệu và phản hồi OBD-II                |
| Kiểm chứng trên xe thử nghiệm                       | Đã theo dõi vị trí, tốc độ, hành trình, cảnh báo và dữ liệu OBD-II trên xe                |
| Tuân theo IPC-2221 và IEC 60664-1                      | Đã dùng để bố trí mạch nguồn, phân tách các nhánh điện và khoảng cách an toàn cơ bản |

Kết quả ở Bảng 4.6 và Bảng 4.7 xác nhận hệ thống đồng thời đạt hai lớp yêu cầu: chức
năng khai thác và ràng buộc triển khai thực tế.

## 4.6. Kết luận nghiệm thu theo mục tiêu đề tài

Để tránh đánh giá cảm tính, các mục tiêu chính được chốt lại theo ba mức: **Đạt**,
**Đạt có điều kiện**, và **Chưa đạt**. Trong phạm vi đồ án, tất cả mục tiêu bắt buộc đều đạt.

**Bảng 4.8: Kết luận nghiệm thu mục tiêu cốt lõi**

| Mục tiêu cốt lõi | Minh chứng | Mức đạt |
| :--- | :--- | :---: |
| Theo dõi vị trí và trạng thái xe theo thời gian thực | Bản đồ cập nhật liên tục, độ trễ toàn tuyến ~120-180 ms | Đạt |
| Thu dữ liệu vận hành cơ bản từ OBD-II | Kết nối OBD-II ~4 s, phản hồi dữ liệu ~60-75 ms | Đạt |
| Cảnh báo sớm theo sự kiện vận hành | Geofence cảnh báo ~5-7 s, có kịch bản đỗ lâu/rung | Đạt |
| Vận hành tiết kiệm năng lượng khi xe dừng | Dòng ngủ sâu ~0,5 mA, có cơ chế đánh thức theo ngữ cảnh | Đạt |
| Tính khả thi triển khai thực tế | Có PCB + vỏ 3D + lắp thử xe thật + đo kiểm lab/field | Đạt |

Phần còn lại cần mở rộng ở giai đoạn sau đồ án là kiểm thử dài hạn đa xe theo nhiều điều
kiện thời tiết và chất lượng sóng khác nhau. Đây là hướng nâng độ bền vận hành, không phải
điểm thiếu của mục tiêu cốt lõi trong phạm vi đề tài.

# CHƯƠNG 5. ĐÁNH GIÁ VÀ KHUYẾN NGHỊ - EVALUATION AND RECOMMENDATION

## 5.1. Đánh giá hiệu năng kỹ thuật

Kết quả triển khai cho thấy kiến trúc ba lớp của hệ thống (thiết bị trên xe - máy chủ - giao diện) vận hành đúng theo mục tiêu thiết kế và giữ được tính nhất quán dữ liệu trên toàn tuyến. Điểm cốt lõi không nằm ở từng thành phần chạy riêng lẻ, mà ở việc các thành phần phối hợp ổn định dưới điều kiện vận hành thực: xe chạy, xe dừng dài giờ, mất-khôi phục mạng, và phát sinh cảnh báo theo sự kiện.

Ở lớp thiết bị, các số đo về dòng tiêu thụ, trạng thái ngủ sâu và cơ chế đánh thức xác nhận bài toán năng lượng đã được giải theo đúng tiêu chí ban đầu: theo dõi liên tục nhưng không gây rủi ro cho ắc quy khi xe đỗ lâu. Ở lớp dữ liệu, thời gian kết nối OBD-II, độ trễ truyền và khả năng gửi bù sau mất mạng chứng minh hệ thống đáp ứng yêu cầu “dữ liệu đủ nhanh để điều hành”, thay vì chỉ “có dữ liệu để lưu”.

Về tích hợp thực tế, việc chọn OBD-II Bluetooth, PCB riêng và vỏ in 3D cho thấy phương án có tính triển khai: lắp được trên xe thật, tháo-lắp lại được, và không cần can thiệp sâu vào hệ điện nguyên bản của xe.

## 5.2. Đánh giá kinh tế triển khai

Chi phí phần cứng cho một thiết bị ở mức **1.514.000 VND**; chi phí SIM dữ liệu khoảng **70.000 VND/tháng/thiết bị**; chi phí máy chủ cho giai đoạn phát triển-thử nghiệm 6 tháng khoảng **2.370.000-3.570.000 VND**. Tổng chi phí triển khai hệ thống vì vậy nằm trong khoảng **4.504.000-5.704.000 VND**.

Mức chi phí này thấp đáng kể so với trần ngân sách 20.000.000 VND của đề tài, đồng thời vẫn bảo toàn đầy đủ ba lớp chức năng cốt lõi đã cam kết. Nghĩa là phương án không đạt mục tiêu bằng cách cắt giảm chức năng, mà đạt bằng cách tối ưu cấu hình phần cứng, chọn giao thức phù hợp và tổ chức xử lý tập trung ở máy chủ.

Khi mở rộng số lượng xe, chi phí hạ tầng dùng chung trên mỗi xe giảm dần; phần tăng tuyến tính chủ yếu là thiết bị và SIM. Điều này phù hợp cho bài toán đội xe nhỏ và vừa, nơi yêu cầu chi phí đầu vào thấp nhưng vẫn cần khả năng theo dõi-vận hành liên tục.

## 5.3. Đánh giá khả năng vận hành

Ở góc nhìn nghiệp vụ, hệ thống đáp ứng đúng ba lớp thông tin mà người quản lý cần trong thực tế: (1) trạng thái thời gian thực, (2) cảnh báo theo ngữ cảnh vận hành, và (3) dữ liệu tổng hợp sau chuyến đi để đối chiếu khai thác.

Luồng sử dụng đã được kiểm chứng theo đúng trình tự nghiệp vụ: xe chạy thì bản đồ cập nhật kịp, có sự kiện thì cảnh báo bật sớm để can thiệp, và kết thúc chuyến thì dữ liệu quãng đường-thời lượng-chi phí có sẵn để đánh giá. Sự nhất quán giữa số đo kỹ thuật (độ trễ, kết nối OBD-II, dòng ngủ sâu, tải đồng thời) và hành vi trên giao diện là bằng chứng trực tiếp cho tính vận hành của giải pháp.

## 5.4. Khuyến nghị phát triển tiếp theo

Để nâng hệ thống từ mức nguyên mẫu kỹ thuật lên mức triển khai ổn định theo lô, các ưu tiên nên đi theo thứ tự sau:

1. **Chuẩn hóa cơ khí và quy trình lắp đặt** theo từng nhóm xe (vị trí thiết bị, anten, dây nguồn, phương án cố định).
2. **Tối ưu nguồn và pin dự phòng** để tăng biên an toàn trong các kịch bản xe dừng dài ngày.
3. **Kiểm thử dài hạn đa điều kiện** (nhiệt độ, chất lượng sóng, chu kỳ bật/tắt liên tục) để đánh giá độ bền vận hành.
4. **Nâng cấp lớp khai thác dữ liệu** theo hướng cô đọng báo cáo chuyến đi và ưu tiên cảnh báo cần hành động ngay.

Cách đi này giữ đúng tinh thần của đồ án: ưu tiên tính dùng được trong vận hành thật trước khi mở rộng thêm các tính năng nâng cao.

# CHƯƠNG 6. PHẢN HỒI VÀ BÀI HỌC KINH NGHIỆM - REFLECTION AND CASE STUDIES

## 6.1. Ứng dụng kiến thức kỹ thuật

Đồ án là quá trình tích hợp liên ngành từ nguồn điện, nhúng, truyền thông dữ liệu, cơ khí-vật liệu đến triển khai phần mềm máy chủ và giao diện. Bài học lớn nhất là: giá trị kỹ thuật không đến từ việc từng khối “đúng theo lý thuyết” một cách riêng rẽ, mà đến từ việc các khối giữ được ổn định khi chạy đồng thời trong điều kiện thực địa.

Trong chuỗi đó, mỗi quyết định kỹ thuật đều có tác động dây chuyền: nguồn quyết định độ bền phiên vận hành; mô hình trạng thái quyết định tiêu thụ điện và mức bỏ sót sự kiện; tổ chức dữ liệu ở máy chủ quyết định tốc độ phản hồi của giao diện. Vì vậy, cách làm hiệu quả nhất là khóa tiêu chí đo ngay từ đầu và kiểm chứng theo tuyến thay vì kiểm từng thành phần độc lập.

## 6.2. Bài học khi xử lý các điểm khó

Ba điểm khó nhất của bài toán là: cân bằng năng lượng khi xe đỗ dài giờ, giữ độ liên tục dữ liệu khi mạng di động biến động, và duy trì mức lắp đặt ít xâm lấn trên nhiều xe khác nhau.

Những điểm khó này được xử lý bằng ba nguyên tắc triển khai:

- **Tách rõ miền chức năng:** thiết bị ưu tiên thu-gửi ổn định, máy chủ ưu tiên xử lý-lưu trữ-cảnh báo, giao diện ưu tiên quan sát-hành động.
- **Thiết kế theo trạng thái vận hành:** chạy/đỗ/cảnh báo/ngủ sâu để điều khiển tiêu thụ điện theo ngữ cảnh thực.
- **Ưu tiên giải pháp lắp đặt thực dụng:** OBD-II không dây + cấu hình phần cứng gọn để giảm can thiệp hệ điện xe.

Bài học rút ra là: trong bài toán IoT gắn xe, quyết định “đủ dùng, ổn định, lặp lại được” có giá trị cao hơn quyết định “nhiều tính năng nhưng khó vận hành”.

## 6.3. Tác động triển khai thực tế

Khi đưa vào vận hành, hệ thống tạo ra thay đổi trực tiếp ở năng lực quản lý đội xe: người vận hành có thể theo dõi vị trí-trạng thái-cảnh báo trên một màn hình thống nhất, đồng thời truy hồi dữ liệu chuyến đi để đối chiếu nhanh khi phát sinh sự cố hoặc tranh chấp.

Tuy nhiên, việc khai thác dữ liệu vị trí và dữ liệu vận hành phải đi kèm nguyên tắc quản trị dữ liệu rõ ràng: đúng mục đích, đúng thẩm quyền truy cập, đúng thời gian lưu, và đúng cách chia sẻ. Đây là điều kiện bắt buộc để hệ thống không chỉ hiệu quả về kỹ thuật mà còn phù hợp về vận hành và trách nhiệm dữ liệu.

## 6.4. Tổng kết

Đồ án đã hoàn thành mục tiêu cốt lõi: xây dựng một hệ thống IoT quản lý xe cho thuê tự lái có thể triển khai thực tế, gồm thiết bị trên xe, máy chủ xử lý dữ liệu và giao diện khai thác tập trung.

Ở lớp kỹ thuật, hệ thống đã đáp ứng các ràng buộc chính về nguồn 12-24 VDC, nền tảng ESP32-S3, kết nối OBD-II, thu nhận vị trí GPS và vận hành trạng thái tiết kiệm năng lượng. Ở lớp khai thác, hệ thống cung cấp được dữ liệu thời gian thực, cảnh báo sự kiện và tổng hợp chuyến đi phục vụ điều hành.

Quan trọng nhất, toàn bộ chuỗi **thu dữ liệu -> truyền dữ liệu -> xử lý -> hiển thị** đã được kiểm chứng bằng đo kiểm trong phòng thí nghiệm và thử nghiệm trên xe thật, với các chỉ số nằm trong ngưỡng mục tiêu của đề tài. Kết quả này xác nhận phương án đề xuất không dừng ở mức mô hình trình diễn, mà đạt mức khả thi cho triển khai vận hành trong bối cảnh đội xe nhỏ và vừa.

# TÀI LIỆU TRÍCH DẪN - REFERENCES

## [A] Tài liệu chính của đồ án

[1] Lê Trọng An, _Phụ lục I - Mô tả đồ án_, Đại học Phenikaa, 2026.

[2] Kho mã nguồn đồ án IoT Vehicle Tracking System, gồm mã nguồn thiết bị, máy
chủ, giao diện web, ứng dụng di động và tài liệu thiết kế trong thư mục
`resources/`, 2026.

## [B] Tài liệu kỹ thuật

[3] Espressif Systems, _ESP32-S3 Series Datasheet_, 2024.

[4] SIMCom, _SIM7600 Series Hardware Design Manual_, 2024.

[5] STMicroelectronics, _LIS3DSH Datasheet_, 2024.

[6] OASIS, _MQTT Version 3.1.1_, 2014.

[7] IPC, _IPC-2221: Generic Standard on Printed Board Design_, 2022.

[8] IEC, _IEC 60664-1: Insulation Coordination for Equipment within Low-Voltage
Systems_, 2020.

[9] SAE, _OBD-II / J1979 Service Definitions_, 2021.

# PHỤ LỤC

## PHỤ LỤC 1. TÓM TẮT CHI PHÍ

**Bảng PL-1.1: Tóm tắt chi phí của phương án đồ án**

| Hạng mục                          | Giá trị tham chiếu                                                   |
| :---------------------------------- | :---------------------------------------------------------------------- |
| Phần cứng một thiết bị         | 1.514.000 VND                                                           |
| SIM dữ liệu di động             | Khoảng 70.000 VND/tháng/thiết bị                                    |
| Hạ tầng máy chủ                 | Khoảng 300.000-500.000 VND/tháng, tên miền khoảng 300.000 VND/năm |
| Tổng chi phí triển khai đồ án | 4.504.000-5.704.000 VND                                                 |
| Giới hạn chi phí của đồ án   | Không vượt 20.000.000 VND                                            |

## PHỤ LỤC 2. HỒ SƠ BÀN GIAO

Các thành phần bàn giao của đồ án gồm:

- mã nguồn thiết bị;
- mã nguồn máy chủ;
- mã nguồn giao diện web;
- mã nguồn ứng dụng di động;
- tài liệu thiết kế phần cứng;
- báo cáo đồ án;
- bộ hình minh họa, sơ đồ và snapshot kiểm thử.
