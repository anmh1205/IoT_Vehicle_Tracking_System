# Bộ câu hỏi phản biện DATN — IoT Vehicle Tracking System

**Sinh viên:** Lê Trọng An — 21010389  
**Đề tài:** Hệ thống IoT giám sát phương tiện cho dịch vụ cho thuê xe tự lái  
**Báo cáo nguồn:** `resources/reports/thesis/final/DATN-LE_TRONG_AN-21010389 (2).pdf` (104 trang)  
**Ngày dựng bộ câu hỏi:** 2026-06-05

---

## 0. Cách dùng tài liệu này

- Mỗi câu hỏi gắn với một mục cụ thể của báo cáo để dễ tra cứu khi luyện trả lời.
- Mỗi câu kèm gợi ý phòng vệ (ý chính cần nói) — không phải kịch bản đọc thuộc.
- Phần cuối liệt kê **những điểm yếu khả năng cao bị "soi"**: bất nhất giữa các chương, dữ liệu thiếu, điểm chưa kiểm chứng. Cần chuẩn bị câu trả lời thật trước khi vào phòng bảo vệ.

---

## 1. Câu hỏi cấp độ khái quát (mục tiêu, phạm vi, đóng góp)

### 1.1. Bài toán & motivation
1. **Tại sao chọn dịch vụ cho thuê xe tự lái thay vì dịch vụ taxi/đội xe vận tải?** Đặc thù nào của bài toán đó khiến giải pháp hiện có (Teltonika FMC920, OBD Vcar Viettel, Queclink GV305CEU) không đáp ứng?
2. **Đâu là đóng góp kỹ thuật mới (novel contribution)** so với các sản phẩm thương mại đã liệt kê ở Bảng 2.2? Khác biệt có đủ lớn để gọi là "đề tài kỹ thuật" hay chỉ là "tích hợp cấu hình"?
3. Mục 1.2 nói "liên kết dữ liệu hành trình, dữ liệu vận hành và thông tin cảnh báo trong cùng một hệ thống" — **các nền tảng thương mại như Wialon, Traccar, Geotab cũng làm điều này**. Sinh viên tự hào ở chỗ nào?
4. **Phạm vi (scope) "đội xe nhỏ và vừa" cụ thể là bao nhiêu phương tiện?** Hệ thống đã được kiểm chứng ở quy mô đó chưa?

### 1.2. Phương pháp luận
5. Quy trình ở Mục 1.4 dùng tiếp cận engineering design (xác định dữ liệu → chọn phần cứng → firmware → server → UI). **Có cân nhắc bắt đầu từ user research / job-to-be-done không?** Nếu không, làm sao biết "vượt tốc, đỗ lâu, ra khỏi vùng" là cảnh báo đúng nhu cầu?
6. **Đề tài có khảo sát người dùng thực** (chủ đội xe, người thuê xe) trước khi cố định bộ tiêu chí ở Bảng 1.1, 1.2 không? Nếu chỉ là giả định của sinh viên, độ tin cậy của requirements lớp ở Bảng 2.6 ra sao?

---

## 2. Phần cứng thiết bị

### 2.1. Lựa chọn linh kiện
7. **Bảng 3.1: vgate iCar Pro vs ELM327 có dây — trọng số "Hạn chế can thiệp vào hệ thống điện" 35%.** Trong khi đó iCar Pro vẫn cắm vào cổng OBD-II, cũng cấp dòng từ ECU. Vậy "ít xâm lấn" hơn ELM327 ở chỗ nào về mặt điện?
8. iCar Pro là sản phẩm thương mại của bên thứ ba, **không có protocol công khai chính thức**. Khi thiết bị giao tiếp BLE với iCar Pro, làm sao bảo đảm tương thích lâu dài nếu hãng cập nhật firmware? **Có dùng reverse-engineered protocol không?**
9. **Bảng 3.2: SW-420, MPU6050, LIS3DSH** — sao bỏ qua các MEMS phổ biến hơn như **LIS2DW12, LSM6DS3, BMA456** vốn có chế độ wake-on-motion mạch lạc và datasheet rõ ràng hơn?
10. Mục 3.2.1c chọn **SIM7600CE-T**. Nhưng module này chỉ hỗ trợ **LTE Cat 4**, mà mục b ở trang 15 dùng "EC200U-CN + L76K (LTE Cat 1)" làm phương án đối chứng. **Cat 4 vs Cat 1 cho ứng dụng IoT chỉ truyền MQTT bản tin nhỏ — có lãng phí không?** Tại sao không dùng Cat 1 hoặc Cat-M1 (ít tốn pin hơn nhiều)?
11. **SIM7600CE-T là dòng "China" cho thị trường Trung Quốc.** Có chứng nhận sử dụng tại Việt Nam (Bộ TT&TT) chưa? Nếu triển khai thương mại, vấn đề pháp lý band tần được xử lý thế nào?
12. **Pin 18650 dòng VTC5A 2600 mAh được cố định trong vỏ kín đặt trong cabin xe**. Đã đánh giá rủi ro nhiệt (thermal runaway) khi xe phơi nắng 60-70°C chưa? Có BMS chuyên dụng hay chỉ TP5100? **Vi phạm UN38.3, IEC 62133 nếu mang đi sản xuất hàng loạt không?**

### 2.2. Thiết kế PCB & nguồn
13. **Hình 4.4 cho thấy chuỗi nguồn 12-24V → MP2482 (5V) → AP2112 (3.3V) → ESP32-S3.** Hiệu suất tổng cộng được công bố 85% (Bảng 4.6), nhưng **căn cứ đo nào?** Datasheet MP2482 đỉnh ~92%, AP2112 là LDO ~70-80%; ghép lại có khi chỉ ~70%.
14. **MP2482 hỗ trợ 4-36V đầu vào — đã có TVS, MOV, fuse chống transient từ ô-tô (load dump 24V, ISO 7637)?** Trong schematic ở trang 73 không thấy clamp circuit. Một xung load dump 87V/400ms có thể giết MP2482.
15. **TPS54231** cấp 4V cho SIM7600CE-T — module SIMCom yêu cầu **dòng đỉnh 2A khi truyền burst**, TPS54231 chỉ cho 2A liên tục. Đã đo điện áp drop khi modem TX không? Có bulk capacitor đủ lớn?
16. **IPC-2221 và IEC 60664-1 (Bảng 2.4) chỉ là chuẩn tham chiếu — đã thực sự tính clearance/creepage cho mạch 24V chưa?** Layout trang 77-78 cho thấy mass layer khá dày, nhưng không có tính toán cụ thể.
17. **Layout PCB hai lớp (Phụ lục 1, mục 10)** — module SIM7600CE-T LTE phát công suất 23 dBm, đã có RF stitching ground, antenna keep-out theo SIMCom Hardware Design v1.06? Hai lớp có đủ không, hay nên 4 lớp?
18. **Schematic trang 73-76** có vài cluster mạch không có tham chiếu rõ ràng (RC giá trị?), cho thấy chưa hoàn toàn release-ready. Bản schematic này đã pass design review của ai?
19. **Vỏ in 3D 100x100x45mm** — vật liệu gì? PLA/PETG/ABS? Chịu được nhiệt cabin xe Việt Nam mùa hè (>60°C ở táp-lô) không?

### 2.3. Đánh thức / năng lượng
20. **Bảng 4.7 ước tính "ngủ 120s, thức 10s, dòng ngủ 0,5 mA → 52 ngày trên 20% ắc quy".** Tính toán đã bỏ qua **dòng quiescent của vgate iCar Pro luôn cắm** (dù đã ghi 1,2W tự tắt sau 30 phút). Nhưng nếu xe đỗ 60 ngày, lúc xe được khởi động lần sau, iCar Pro lại bật — có quay lại được không? Tổng tiêu thụ thực tế đã đo đủ chưa hay chỉ tính trên giấy?
21. **0,5 mA ngủ sâu là dòng "quan sát" — đo bằng dụng cụ gì? Multimeter Fluke?** Ở chế độ deep sleep, dòng có thể chỉ vài µA hoặc đỉnh tới hàng mA khi RTC wakeup; multimeter trung bình **không đo nổi** nếu không có current ranger chuyên dụng (uCurrent, Otii, Joulescope). Số đo này tin được không?
22. **Hình 4.18: Cảnh báo 228 mA, Hoạt động 210 mA, Gửi tin 216 mA** — sao "cảnh báo" (chỉ thêm tín hiệu IMU + push) lại tốn nhiều hơn "gửi tin"? Logic này không nhất quán; có giải thích được không?
23. **LIS3DSH wake-on-motion threshold cụ thể bao nhiêu mg?** Ngưỡng có chống được rung do gió, mưa lớn (false wakeup) không? Đã đo tỉ lệ false wakeup 24h chưa?
24. **Mục 3.2.1.b nói "ngủ 120s là chu kỳ kiểm tra".** Trong 120s này nếu xe bị di chuyển (kéo, cẩu), thiết bị mất bao lâu mới phát cảnh báo? Hệ thống chống trộm có bảo đảm tính tức thời?

---

## 3. Firmware

### 3.1. Kiến trúc
25. **Tại sao chọn ESP-IDF + FreeRTOS thay vì Zephyr RTOS** — Zephyr có driver chuẩn hơn cho LIS3DSH, hỗ trợ MCUboot OTA bài bản hơn?
26. **Bảng 3.5 trọng số "Mức bám sát nền tảng chính thức của Espressif" 15%.** Tiêu chí này nghiêng phần thắng cho ESP-IDF — **liệu có bias không?** Trên thực tế, Arduino-on-ESP32 dùng underlying ESP-IDF, vậy "bám sát" có khác biệt thực chất gì?
27. **FreeRTOS task layout cụ thể: bao nhiêu task, ưu tiên, stack size?** Báo cáo không đưa bảng task — giáo viên hỏi "task lock contention thế nào, có deadlock không" thì trả lời ra sao?
28. **Heap fragmentation trên ESP32-S3 với MQTT + BLE + cellular đồng thời** — đã profile chưa? ESP32 có ~512KB RAM, MQTT broker connection + TLS handshake + buffer message + BLE stack có thể chiếm 200+ KB.

### 3.2. OBD-II qua BLE
29. **vgate iCar Pro hoạt động ở vai trò BLE peripheral, ESP32-S3 là central**. Khi xe có BLE jamming hoặc nhiều thiết bị đeo, **làm sao bảo đảm bond bền vững?** Đã có cơ chế re-pair tự động chưa?
30. **BLE pairing có dùng Just Works (no pairing code) hay Passkey?** Just Works hoàn toàn không an toàn — kẻ tấn công có thể MitM lấy PIDs OBD-II.
31. **Có đo độ trễ BLE giữa ESP32-S3 ↔ iCar Pro chưa?** OBD-II PID đọc liên tục 1Hz có ổn định không? PID nào đã thực test (RPM, vehicle speed, MIL, DTC)?
32. **Báo cáo Bảng 4.3 liệt kê 12 nhóm DTC (P0300-P0740...).** Đã đọc thử thực tế bao nhiêu DTC trên xe thật, hay chỉ liệt kê từ tài liệu SAE J1979?

### 3.3. OTA & buffer
33. **Bảng 4.10 phân vùng OTA: factory 1536KB + ota_0 + ota_1.** Tổng 4.5MB cho code, nhưng ESP32-S3 thường có 8MB flash. Còn lại dùng làm gì? FAT cho microSD buffer? Có schema rõ ràng?
34. **Lưu đệm SD 1GB ≈ 24,3 ngày bản tin offline (Mục 4.3.2.c)** — đây là phép tính giả định 1 bản tin/giây × 512 byte. Thực tế, **nếu xe đi qua hầm Hải Vân (mất sóng 7 phút)**, lưu đệm chỉ cần ~210 KB. Tính 24,3 ngày có ý nghĩa gì? Đó là worst case không thực tế.
35. **Khi mạng phục hồi và phải gửi bù, MQTT Bridge có rate-limit ingestion không?** Nếu 50 thiết bị cùng phục hồi và đẩy 100k bản tin mỗi máy lên EMQX, broker và backend có sập không?
36. **OTA dùng giao thức gì?** HTTPS pull từ S3? MQTT-OTA? Có verify chữ ký firmware không (anti-rollback, secure boot)? **Rủi ro cài firmware giả mạo qua OTA rất nghiêm trọng** vì thiết bị nằm trên xe của khách hàng.

---

## 4. Server & dữ liệu

### 4.1. Kiến trúc backend
37. **Stack EMQX + MQTT Bridge + PostgreSQL + VictoriaMetrics + VictoriaLogs (Hình 4.13)** là rất nhiều dịch vụ cho dự án DATN. **Có over-engineering không?** Cụ thể VictoriaLogs đảm nhiệm gì mà PostgreSQL hoặc EMQX retained log không làm được?
38. **MQTT Bridge** là dịch vụ tự viết hay dùng EMQX rule engine? Source code đâu? (Phụ lục 4 chỉ trỏ GitHub repo `anmh1205/IoT_Vehicle_Tracking_System`.)
39. **VictoriaMetrics dùng cho time-series GPS** — schema (label cardinality) thế nào? Mỗi xe là một series? Khi đội 1000 xe sẽ ra series cardinality bao nhiêu? Có đo memory footprint chưa?
40. **TLS cho MQTT** — chứng chỉ tự ký hay Let's Encrypt? Thiết bị có verify cert chain (mTLS) hay chỉ TLS một chiều? Mục 5.4 mới khuyến nghị "tăng bảo mật đường truyền" — nghĩa là **bản hiện tại CHƯA bảo mật đầy đủ?**

### 4.2. Quy mô và load test
41. **Mục 4.3.3.b: "đã kiểm tra 50 thiết bị đồng thời, tải hệ thống 20-25%"** — kiểm bằng cách nào? K6/JMeter? Bao nhiêu RPS? Đo trên VPS cấu hình gì (CPU, RAM)? Báo cáo không công bố.
42. Phụ lục 1 nói **VPS 120k VND/tháng × 6 tháng = 720k**. VPS 120k tier ở Việt Nam thường 1-2 vCPU, 2-4 GB RAM. Chạy đồng thời EMQX + Postgres + VictoriaMetrics + VictoriaLogs + backend + frontend trên cùng máy → **liệu thực sự bền với 50 thiết bị không?** Chứ đừng nói 1000.
43. **Cập nhật bản đồ "1-2 giây" (Bảng 4.12)** — tần suất polling từ frontend hay WebSocket push? Nếu HTTP polling, tải backend tăng tuyến tính theo số người dùng đồng thời.

### 4.3. Bảo mật & quyền riêng tư
44. **Phụ lục 4 LỘ credentials**:
    - `MQTT TLS Broker: admin / anmh1205`
    - `EMQX Dashboard: admin / anmh1205`
    - `Frontend: admin / Admin@2026`
    Đây là credentials production của môi trường UAT công khai trên Internet (`thingdock.dev`). **Việc đăng credential vào báo cáo + commit GitHub là vi phạm bảo mật nghiêm trọng.** Sinh viên giải thích thế nào?
45. **Dữ liệu vị trí GPS thuộc nhóm dữ liệu cá nhân nhạy cảm (Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân)**. Hệ thống có:
    - Cơ chế consent từ người thuê xe?
    - Tối thiểu hóa thu thập (data minimization)?
    - Quyền xóa / quyền truy cập của chủ thể dữ liệu?
    - Thời hạn lưu trữ rõ ràng?
    Mục 6.3 nói "phải gắn với mục đích quản lý..." nhưng **đó là tuyên bố nguyên tắc, chưa có cơ chế kỹ thuật.**
46. **Người thuê xe có biết xe có tracker không?** Pháp luật nhiều nước yêu cầu disclosure. Hệ thống Việt Nam có yêu cầu này (Luật giao thông đường bộ, Luật Bảo vệ NTD)?
47. **API JWT có refresh token, blacklist, RBAC?** Báo cáo không đề cập. Backend trên `api.thingdock.dev` đã có rate limiting, WAF, DDoS protection?

---

## 5. Frontend & UX

48. **Hình 4.16 hiển thị 12,02V ắc quy xe và 4,07V pin thiết bị, GIK TB IMU 0 m/s²** — UX tốt; nhưng cảnh báo "443 tổng" với "0 chưa xử lý, 0 đã xác nhận" (Hình 4.17) → **logic count không khớp**, có lỗi sync không?
49. **DTC `P0420 Catalyst System Efficiency Below Threshold` xuất hiện ở mọi thiết bị TRACKER_001..005** trong khi xe chỉ có 1 (`36E-04721`). Đây là **dữ liệu mock hay thật?**
50. **Bản đồ dùng OpenStreetMap tile?** Mapbox? Google Maps? License và chi phí khi scale?
51. **Mức độ accessibility (WCAG)?** Người vận hành không cần "rocket science UI" nhưng giao diện công cụ cũng cần ARIA, contrast — đã kiểm chưa?

---

## 6. Đo kiểm & tính chính xác (kiểm chứng nghiêm ngặt)

52. **Bảng 4.12 "Độ trễ truyền qua mạng di động: 120-180 ms"** — đo bằng phương pháp gì? `mosquitto_pub` round-trip? **Bao nhiêu mẫu, deviation, percentile P95/P99?** Trung bình 150ms vô nghĩa nếu P99 là 5000ms.
53. **"Cảnh báo vượt vùng 2-3s"** — geofence radius bao nhiêu? Hysteresis chống flicker khi xe đi qua biên? Sample rate GPS? Không có chi tiết.
54. **Bảng 4.7 cột "Xe đỗ thức 10s ngủ 120s ⟹ 1246,7 giờ trên pin+20% ắc quy"** — phép tính `91,8 Wh / 0,082W ≈ 1119 giờ`, **không khớp với 1246,7 giờ trong bảng** (chênh ~10%). Sai số ở đâu?
55. **Mục 4.4 đối chiếu: "Đạt" cho mọi tiêu chí.** Nhưng tiêu chí "đo kiểm trên xe thật" — đã đo trên BAO NHIÊU xe? Một xe `36E-04721` không thể chứng minh tương thích OBD-II với "nhiều dòng xe".
56. **Hệ thống đã chạy bao nhiêu km thực tế trên đường?** Bao nhiêu giờ liên tục? 1 ngày, 1 tuần hay 1 tháng? Báo cáo né câu này.

---

## 7. Bài toán kinh doanh & chi phí

57. **Phụ lục 1: chi phí thiết bị 2.114.000 VND ÷ chi phí thử nghiệm 768.000 VND ÷ tổng 2.882.000 VND.** Nhưng **Bảng 4.14 (Chương 4) ghi "tổng chi phí 6 tháng 5.762.000 VND"**. **Hai con số mâu thuẫn**, nguồn nào đúng?
58. Giá 2 triệu/thiết bị **chưa tính nhân công lắp đặt, vỏ in 3D, chứng nhận, bảo hành**. Giá tham chiếu OBD Vcar Viettel 2 triệu (đã bao thuê bao). **So sánh đã công bằng chưa?**
59. **Mô hình kinh doanh:** bán 1 lần hay SaaS? VPS chia chung — ai trả? Khi 1 chủ đội xe có 30 phương tiện, chi phí biến đổi mỗi tháng là?
60. **Bảo hành RMA?** Pin 18650 phồng, modem chết, vgate iCar Pro hỏng — quy trình thay thế thế nào? Sản phẩm DATN không cần trả lời, nhưng nếu sinh viên định "triển khai thực tế" như slogan — phải có câu trả lời.

---

## 8. So sánh & đóng góp (likely "câu hỏi đỉnh")

61. **Open-source alternative `Traccar` đã miễn phí, hỗ trợ ~200 protocol tracker thương mại.** Nếu chủ đội xe có thể mua Teltonika FMC920 + chạy Traccar VPS, tổng chi phí không quá 2-3 triệu/xe **mà không cần tự chế PCB**. **Vậy ý nghĩa của tự chế thiết bị là gì?**
62. **Đóng góp khoa học** (publishable result) là gì? Đề tài có: dataset mới? Thuật toán mới? Kiến trúc mới? Hay là kỹ năng tích hợp tốt?
63. **So với các paper tham khảo [5][6] ([5] Lee 2014, [6] Malekian 2017),** đề tài mới hơn ở điểm nào? Hai paper này 9-12 năm trước, nhưng cách tiếp cận của đồ án vẫn lặp lại ý tưởng cốt lõi.

---

## 9. Tương lai & rủi ro

64. **Mục 5.4 "Khuyến nghị cho tương lai" toàn things-to-do** chứ chưa làm: kiểm chứng dài hạn, mở rộng OBD, tăng bảo mật, OTA config. **Vậy bản hiện tại có thực sự "deployment-ready" như mục tiêu?**
65. **Khi 5G phủ sóng và 4G LTE bị deprecate, SIM7600CE-T sẽ thành rác**. Lifecycle planning?
66. **2G shutdown ở VN đã bắt đầu ([12]).** Nếu 4G shutdown 2030-2035, thiết bị có upgrade path (Cat-M1/NB-IoT/5G RedCap) không?

---

## 10. Câu hỏi chốt sổ (cá nhân & quy trình)

67. **Đề tài thực hiện 1 mình (Bảng phụ lục 3)?** Toàn bộ schematic, layout PCB, firmware, backend, frontend đều của Lê Trọng An?
68. **Repo `anmh1205/IoT_Vehicle_Tracking_System`** — số commit, contributor? GitHub history có chứng minh quá trình thực hiện không?
69. **AI tools (ChatGPT, Claude, Copilot)** đã hỗ trợ phần nào của đồ án? Nếu code AI sinh ra mà sinh viên không hiểu sâu, phản biện sẽ phát hiện bằng câu hỏi cụ thể về implementation detail.
70. **Một câu hỏi sinh viên CHƯA trả lời được trong báo cáo, mà nếu được làm lại sẽ làm khác?**

---

## 11. ĐIỂM YẾU CẦN CHUẨN BỊ TRƯỚC (sinh viên phải biết)

| # | Điểm yếu | Vị trí trong báo cáo | Lý do dễ bị "bắt" |
|---|----------|---------------------|-------------------|
| A | **Bất nhất tên cảm biến**: Chương 3 viết LIS3DSH ([11]); Chương 6.1 viết LIS3DH; Phụ lục 1 viết LIS3DH. | Trang 14, 60, 67 | Hai chip khác hệ (DSH cao cấp hơn, có FIFO state machine; DH cơ bản). Phản biện chỉ ra sẽ rất khó chữa. |
| B | **Bất nhất chi phí 6 tháng**: 5.762.000 (Bảng 4.14) ≠ 2.882.000 (Mục 5.2 + Phụ lục 1). | Trang 54, 57, 68 | Sai số 100%, không phải làm tròn. |
| C | **Lộ credentials production**: `admin/anmh1205`, `Admin@2026` được in trong Phụ lục 4 và đăng UAT công khai. | Trang 71 | Vi phạm nguyên tắc bảo mật cơ bản; sinh viên IoT chưa được làm vậy. |
| D | **Hình 4.18 logic phi vật lý**: cảnh báo (228mA) > gửi tin (216mA). | Trang 49 | Khó giải thích nếu không có dataset đo gốc. |
| E | **Phép tính 1246,7h vs 91,8/0,082** sai ~10%. | Trang 48 | Có thể là làm tròn, nhưng phải có lời giải thích. |
| F | **Thiếu bảng FreeRTOS task** (priority, stack, IPC). | Toàn Mục 4.2 | Hỏi "thread model" sẽ lúng túng nếu chưa chuẩn bị. |
| G | **0,5 mA deep sleep không có phương pháp đo**. | Trang 46 | ESP32-S3 deep sleep thường 5-150 µA; 0,5 mA = 500 µA hơi cao, không cực thấp. |
| H | **Pháp lý dữ liệu cá nhân (Nghị định 13/2023)**: chưa có cơ chế consent/quyền xóa cụ thể. | Mục 6.3 | Sinh viên Cơ điện tử thường yếu về compliance. |
| I | **Không kiểm chứng OBD trên nhiều xe**: chỉ có `36E-04721` xuất hiện. | Mục 4.3, 5.3 | "Tương thích nhiều dòng xe" là claim chưa chứng minh. |
| J | **Không có dataset đo thực tế** (km chạy, giờ chạy, % uptime). | Toàn Chương 4 | "Đã chạy bao lâu" → câu trả lời thiếu defendable. |
| K | **Schematic ESP32-S3 trang 74 có khu vực mạch không rõ ràng** (chú thích RC bị che). | Phụ lục 4 | Phản biện điện tử có thể chỉ vào nút cụ thể. |

---

## 12. Gợi ý chuẩn bị 48 giờ trước bảo vệ

1. **Tạo file đính chính (errata)**: thừa nhận lỗi LIS3DSH/LIS3DH, lỗi tổng chi phí, đính kèm phương pháp đo dòng. Phản biện thường chấp nhận errata nếu sinh viên chủ động hơn nếu bị "bắt".
2. **Đổi mật khẩu UAT** ngay; xóa credentials khỏi Phụ lục 4 nếu còn kịp in lại; chuẩn bị câu trả lời "đó là môi trường UAT throwaway, đã rotate sau khi nộp báo cáo".
3. **Đo lại dòng deep sleep** bằng đa năng kế ở thang µA hoặc Otii nếu mượn được, ghi log; in thành 1 trang phụ lục đem theo.
4. **Tạo bảng task FreeRTOS** (10-12 task: bleClient, mqttPub, mqttSub, gnssPoll, imuMonitor, otaTask, watchdog, sleepFsm, persistTask, healthcheck, uiSerial, ledTask) với stack/priority — học thuộc.
5. **Chạy thử lại load test** với K6, ghi P50/P95/P99/throughput; in 1 chart đem theo.
6. **Chuẩn bị 1 slide so sánh với Traccar + Teltonika** — phân biệt "đóng góp tích hợp end-to-end" vs "thiết bị mới hoàn toàn".
7. **Học thuộc phần datasheet SIM7600CE-T (band, current, mounting)** — câu hỏi RF rất phổ biến với hội đồng có giảng viên ngành Điện tử Viễn thông.

---

## Câu hỏi chưa giải quyết

- Bộ câu hỏi này dựa trên **báo cáo PDF cuối**, không kiểm tra source code thực tế trên GitHub. Để hoàn thiện, nên đọc thêm `firmware/`, `backend/`, `frontend/` trong repo `anmh1205/IoT_Vehicle_Tracking_System` và bổ sung câu hỏi về implementation cụ thể (ví dụ: queue policy, retry strategy, JWT lifecycle).
- Chưa biết **thành phần hội đồng**: nếu có giảng viên RF → thêm câu về antenna/SAR; nếu có giảng viên Cơ khí → ít hỏi điện tử; nếu có giảng viên CNTT → đào sâu backend/security. Sinh viên nên hỏi giáo viên hướng dẫn về thành phần hội đồng để điều chỉnh trọng tâm ôn.
- **Phụ lục 3** ghi mốc thực hiện 01-05/2026, nhưng không rõ mốc kiểm chứng dài hạn nằm trong DATN hay sẽ được đẩy sang giai đoạn sau. Cần làm rõ trong slide để tránh hứa hẹn vượt phạm vi.
