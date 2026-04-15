# Tech report: thesis defense technical depth probes

Timestamp: 2026-04-12 05:23 ICT

## Phạm vi
- Nguồn chính: `E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis\final\thesis-final-report.tex`
- Đối chiếu bối cảnh repo: `E:\anmh1205\IoT_Vehicle_Tracking_System\README.md`
- Mục tiêu: tạo câu hỏi phản biện kỹ thuật sâu, bám đúng thesis thực tế, không suy diễn quá phần đã chứng minh.

## 12 câu hỏi kỹ thuật chuyên sâu

### 1) Vì sao luận văn chọn baseline pin dự phòng 18650 1S, nhưng phần runtime lại chỉ dừng ở quy đổi thay vì đo xả thực trên cell mới?
- Gốc kỹ thuật: thời lượng backup phụ thuộc cả dung lượng thực, ESR pin, hiệu suất boost, profile tải modem 4G/BLE/GNSS, nhiệt độ.
- Thesis đã trả lời đến đâu: nêu công thức quy đổi và kết quả `~2.6--3.0 giờ` tracking, `~24--36 giờ` alert mode; nhiều chỗ ghi rõ là `ước tính theo baseline 18650`, chưa phải bộ đo mới trên cell thực.
- Chỗ còn mơ hồ/chưa đủ chứng cứ: chưa có discharge test thực tế trên đúng cell 18650 lắp trong thiết bị; chưa có đường cong sụt áp dưới tải peak 4G.
- Dữ kiện nên viện dẫn: success criteria `>=2.5 giờ` ở `thesis-final-report.tex:1132`; ghi chú `ước tính theo baseline 18650` ở `thesis-final-report.tex:10218-10223`, `11294-11296`, `11623-11625`.

### 2) Nếu hội đồng hỏi “thiết bị có thực sự bảo vệ được ắc quy xe không?”, em trả lời thế nào khi LVD 12V hiện tại chưa đạt target?
- Gốc kỹ thuật: bảo vệ ắc quy là claim an toàn hệ thống; LVD sai ngưỡng có thể rút cạn bình hơn dự kiến hoặc chuyển nguồn quá sớm.
- Thesis đã trả lời đến đâu: đã thiết kế profile 12V/24V rõ ràng; có đo profile 12V; kết quả ngắt 11.48V, đóng lại 12.53V.
- Chỗ còn mơ hồ/chưa đủ chứng cứ: kết quả 12V đang `Chưa đạt`; profile 24V chưa đo thực nghiệm.
- Dữ kiện nên viện dẫn: target OFF/ON ở `thesis-final-report.tex:1135-1136`, `3216-3218`; kết quả đo LVD ở `thesis-final-report.tex:10365-10404`; tổng hợp hạn chế ở `thesis-final-report.tex:11537-11540`, `12113-12114`.

### 3) Vì sao nhóm dám tuyên bố hỗ trợ 12V/24V khi phần đo thực nghiệm hiện mới theo profile 12V?
- Gốc kỹ thuật: 24V không chỉ là scale điện áp; còn liên quan sai số chia áp ADC, hysteresis comparator, buck thermal stress, transient khi đề máy/alternator.
- Thesis đã trả lời đến đâu: đã có kiến trúc nguồn 12--24V, profile ngưỡng 24V, BOM và logic firmware tương ứng.
- Chỗ còn mơ hồ/chưa đủ chứng cứ: chưa có vòng đo 27V xuống 21V; chưa có kết quả disconnect/reconnect profile 24V.
- Dữ kiện nên viện dẫn: phạm vi nguồn vào 12/24V ở `thesis-final-report.tex:992-993`, `2150`; profile 24V ở `thesis-final-report.tex:3218`, `3233-3241`; thừa nhận chưa đo ở `thesis-final-report.tex:10402-10404`, `11300-11301`, `11627-11628`.

### 4) OTA của hệ thống đang ở mức “production-ready” hay mới ở mức “khép kín luồng chức năng”? 
- Gốc kỹ thuật: OTA thật sự production-ready cần atomicity, rollback tự động đáng tin cậy, watchdog, test power-loss/reboot-loop, integrity + authn/authz mạnh.
- Thesis đã trả lời đến đâu: backend → EMQX → device → bridge đã có đường đi; firmware có download, SHA-256, rollback helper; có endpoint OTA và log firmware.
- Chỗ còn mơ hồ/chưa đủ chứng cứ: chương đo lường nói rõ OTA giai đoạn này chủ yếu `đối chiếu theo mã nguồn và kiểm tra tích hợp`, chưa có bộ số đo định lượng dài ngày; watchdog chưa đầy đủ.
- Dữ kiện nên viện dẫn: kiến trúc OTA ở `thesis-final-report.tex:5356-5409`, `8035-8079`; nhận định đo lường OTA ở `thesis-final-report.tex:10718-10725`; hardening còn thiếu ở `thesis-final-report.tex:11515-11519`, `11696-11699`, `11724-11725`, `12067-12070`.

### 5) Cơ chế replay qua microSD đảm bảo “không mất dữ liệu” hay chỉ “giảm khoảng trống dữ liệu”? 
- Gốc kỹ thuật: replay cần chứng minh ordering, deduplication, ACK semantics, quota/GC, durability khi mất điện giữa chừng, wear-out SD.
- Thesis đã trả lời đến đâu: mô tả enqueue local + replay theo sequence, ACK/QoS, backoff, quota GC; risk matrix có R1/R5/R9.
- Chỗ còn mơ hồ/chưa đủ chứng cứ: chính thesis nói chưa tách bộ đo định lượng riêng cho replay dài hạn; đánh giá hiện chủ yếu định tính + đối chiếu mã nguồn.
- Dữ kiện nên viện dẫn: mô tả offline queue ở `thesis-final-report.tex:3590-3592`, `4352-4358`, `7024`; giới hạn đo lường ở `thesis-final-report.tex:10674-10716`; rủi ro SD ở `thesis-final-report.tex:12071-12074`, `12143-12145`.

### 6) Tại sao firmware dùng state machine trung tâm thay vì tách nhiều task FreeRTOS? Điểm mạnh và trade-off là gì?
- Gốc kỹ thuật: đây là quyết định kiến trúc; hội đồng có thể hỏi về determinism, debugability, starvation, coupling.
- Thesis đã trả lời đến đâu: chọn state machine trung tâm để giữ logic tập trung, primitive FreeRTOS chỉ dùng tại NimBLE host, BLE manager, BLE OBD, modem AT.
- Chỗ còn mơ hồ/chưa đủ chứng cứ: chưa có benchmark cụ thể về CPU load hoặc worst-case scheduling dưới đồng thời BLE+LTE+IMU wake.
- Dữ kiện nên viện dẫn: rationale ở `thesis-final-report.tex:3597-3601`, `3617-3623`, ví dụ `app_main` tại `thesis-final-report.tex:3625-3647`, đồng bộ primitive ở `3651-3655`.

### 7) Độ tin cậy OBD2 trên nhiều dòng xe được chứng minh tới đâu?
- Gốc kỹ thuật: tương thích OBD2 phụ thuộc ECU, PID support, timing, BLE adapter behavior, vị trí lắp đặt.
- Thesis đã trả lời đến đâu: chọn vgate iCar Pro vì BLE 4.0, hỗ trợ giao thức rộng; có 2 xe thực nghiệm Toyota Vios 2020 và Honda City 2021; giai đoạn này xong đo trên 2 xe.
- Chỗ còn mơ hồ/chưa đủ chứng cứ: số mẫu xe còn ít; xe thứ ba mới là kế hoạch mở rộng; claim “đa số xe tại Việt Nam” cần nói cẩn trọng.
- Dữ kiện nên viện dẫn: thử nghiệm 2 xe ở `thesis-final-report.tex:10021-10034`; vendor compatibility ở `thesis-final-report.tex:2884-2903`; nhận định phổ biến giao thức ở `10360-10363`.

### 8) Kết quả stress cloud/backend có đủ mạnh để bảo vệ claim `>=50 thiết bị, dư địa 100` không?
- Gốc kỹ thuật: cần phân biệt test bench với deployment production; single-node broker khác rất xa HA/cluster production.
- Thesis đã trả lời đến đâu: có k6, MQTT Bench, VPS 4vCPU/8GB, single-node EMQX/PostgreSQL/VictoriaMetrics; nêu hệ thống ổn định ở 50--100 thiết bị.
- Chỗ còn mơ hồ/chưa đủ chứng cứ: chưa thấy chứng minh HA thật, failover broker, cluster EMQX; uptime 99.5% suy ra từ cửa sổ thử ngắn dễ bị hỏi.
- Dữ kiện nên viện dẫn: success criteria cloud ở `thesis-final-report.tex:1191-1194`; setup stress ở `10061-10103`; nhận định 50--100 thiết bị ở `10823`, `10918`, `10971`, `11741`.

### 9) Với frontend dashboard, tại sao dùng Next.js 15 + React 19 thay vì stack CSR nhẹ hơn cho bài toán admin nội bộ?
- Gốc kỹ thuật: trade-off SSR/RSC vs complexity; hội đồng có thể hỏi có over-engineering không.
- Thesis đã trả lời đến đâu: chọn vì balance giữa first load, tổ chức module, realtime + REST cache, Docker deployment.
- Chỗ còn mơ hồ/chưa đủ chứng cứ: thesis thiên về lập luận kiến trúc; phần đo hiệu năng frontend chủ yếu Lighthouse ~87, chưa đối chiếu trực tiếp với một baseline CSR cùng tính năng.
- Dữ kiện nên viện dẫn: lý do chọn ở `thesis-final-report.tex:5534-5555`, `5610-5634`; Lighthouse ở `10980-11024`, `11407`.

### 10) Khi mất BLE OBD2, hệ thống suy luận IGN qua ADC có đủ tin cậy không? 
- Gốc kỹ thuật: suy luận ignition từ điện áp ắc quy phụ thuộc nhiều điều kiện sạc/tải, nhất là khi alternator, phụ tải lớn hoặc xe 24V.
- Thesis đã trả lời đến đâu: đã mô tả fallback IGN qua ADC khi BLE không sẵn sàng; có ngưỡng IGN_ON/OFF theo profile 12V/24V.
- Chỗ còn mơ hồ/chưa đủ chứng cứ: chưa thấy confusion matrix hoặc test sai số khi xe có tải phụ lớn; profile 24V chưa đo thực nghiệm.
- Dữ kiện nên viện dẫn: requirement fallback ở `thesis-final-report.tex:2041-2042`; ngưỡng IGN ở `3688-3689`, `4547-4548`, `8143-8144`; giới hạn 24V như câu 3.

### 11) Hệ thống đang “secure by design” đến mức nào, và còn thiếu gì trước khi ra production?
- Gốc kỹ thuật: IoT security cần device identity mạnh, transport security, secret rotation, audit logging, OTA trust chain.
- Thesis đã trả lời đến đâu: opaque session token hash SHA-256, MQTT ACL per-device, Zod validation, rate limiting/CORS; README cũng khuyến nghị TLS MQTT/ACL.
- Chỗ còn mơ hồ/chưa đủ chứng cứ: thesis thừa nhận TLS MQTT, device certificate, security logging chưa đầy đủ; hiện mới mức cơ bản.
- Dữ kiện nên viện dẫn: success criteria bảo mật ở `thesis-final-report.tex:1196-1197`; rủi ro R4 ở `12052-12055`, `12092-12100`; README security baseline ở `README.md:482-490`.

### 12) Nếu hội đồng hỏi “điểm yếu kỹ thuật lớn nhất hiện tại là gì?”, nên trả lời điểm nào để vừa trung thực vừa kiểm soát narrative?
- Gốc kỹ thuật: câu này kiểm tra khả năng tự đánh giá hệ thống như kỹ sư thật, không chỉ trình diễn thành tựu.
- Thesis đã trả lời đến đâu: tự nêu rõ các điểm cần làm sâu: LVD 12V, dòng 4G continuous, replay dài hạn, watchdog, TLS, test độ bền SD.
- Chỗ còn mơ hồ/chưa đủ chứng cứ: chưa có thứ tự ưu tiên hoàn chỉnh giữa safety, reliability, security.
- Dữ kiện nên viện dẫn: tổng kết chương 4 ở `thesis-final-report.tex:11533-11540`; hardening còn thiếu ở `11515-11519`; ưu tiên rủi ro ở `12141-12145`.

## 8 điểm tech-risk / thiếu chặt chẽ / dễ bị bắt bẻ

1. `LVD 12V chưa đạt target thực đo`  
   - Evidence: `11.48V` disconnect vs target `12.0V`; `12.53V` reconnect vs target `12.2V` tại `thesis-final-report.tex:10386-10390`.

2. `Profile 24V mới ở mức thiết kế, chưa có thực đo`  
   - Evidence: thesis ghi rõ cần thực hiện vòng đo 27V→21V sau tại `thesis-final-report.tex:10402-10404`.

3. `Backup runtime 18650 chưa phải số đo thực nghiệm trên cell mới`  
   - Evidence: nhiều bảng ghi `ước tính theo baseline 18650`, `cần đo lại` tại `10218-10223`, `10269-10273`, `11294-11296`, `12110-12112`.

4. `Deep sleep và vài số điện còn mức ước tính/bước đầu`  
   - Evidence: deep sleep `~0.5 mA`, peak `~2 mA (ước tính, cần xác nhận thêm)` tại `10168-10172`.

5. `Replay microSD đã có code path nhưng thiếu benchmark định lượng dài hạn`  
   - Evidence: thesis tự nói đánh giá replay hiện theo hướng định tính + đối chiếu mã nguồn ở `10674-10716`.

6. `OTA khép kín chức năng nhưng chưa đủ hardening production`  
   - Evidence: OTA trong Chương 4 đánh giá qua source/integration; watchdog vẫn thiếu tại `10721-10725`, `11515-11519`, `12067-12070`.

7. `Tính đại diện phần OBD2/xe thử còn mỏng`  
   - Evidence: mới hoàn tất trên 2 xe, xe thứ ba là kế hoạch tiếp theo ở `10021-10034`.

8. `Stress/uptime cloud còn thiên về pilot-scale single-node`  
   - Evidence: môi trường stress là single-node EMQX/VictoriaMetrics/PostgreSQL tại `10061-10085`; claim 50--100 thiết bị hợp lý cho pilot nhưng chưa phải production-grade HA proof.

## Cách trả lời an toàn khi bị xoáy
- Không nên bảo vệ quá đà các claim chưa có thực đo. Nên nói rõ: `đã triển khai`, `đã đối chiếu mã nguồn`, `đã có pilot evidence`, nhưng `chưa đủ bằng chứng production-scale`.
- Ưu tiên narrative: kiến trúc đúng + prototype vận hành thật + đã chỉ ra đúng backlog hardening tiếp theo.
- Nếu bị ép vào con số, luôn tách `measured`, `estimated`, `planned re-validation`.

## Kết luận ngắn
Luận văn mạnh ở chỗ: kiến trúc end-to-end đồng bộ, mô tả kỹ thuật khá sâu, có prototype thật từ hardware tới dashboard. Luận văn yếu ở chỗ: một số claim reliability/safety/power còn dựa trên quy đổi, đo bước đầu, hoặc đối chiếu source hơn là stress-test định lượng dài ngày. Nếu rehearsal tốt, nên chủ động thừa nhận 4 khoảng trống: `LVD 12V`, `24V real measurement`, `18650 real discharge`, `watchdog/OTA/SD replay hardening`.

## Unresolved questions
- Trong source thesis có chỗ dùng `LIS3DH`, có chỗ dùng `LIS3DSH`; cần thống nhất tên cảm biến trước phiên bảo vệ.
- Nếu team có số đo bổ sung ngoài thesis source cho 24V, 18650 real discharge, OTA soak test thì nên chuẩn bị như appendix/slides backup, vì text thesis hiện chưa chứng minh đủ.
