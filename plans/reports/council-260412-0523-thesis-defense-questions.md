# Bộ câu hỏi phản biện hội đồng cho thesis IoT Vehicle Tracking System

Nguồn bám chính:
- `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`
- Các vùng chính đã đối chiếu: tóm tắt, mục tiêu/phạm vi, lựa chọn phương án, đo lường 4.3, đánh giá chương 5, bài học chương 6.

## Nhận định nhanh
- Đóng góp mạnh nhất của thesis là tích hợp end-to-end một hệ thống thực chạy được từ PCB, firmware, cloud đến dashboard.
- Điểm dễ bị phản biện nhất không nằm ở “có làm được hay không” mà ở: độ mới học thuật, độ tin cậy đo lường, khả năng tổng quát hóa kết quả, và mức sẵn sàng production.
- Một số claim đã tự thừa nhận còn giới hạn: mới đo trên 2 xe; có chỉ số còn là quy đổi/ước tính; TLS cho MQTT và watchdog chưa hoàn tất; LVD profile 12V còn cần hiệu chuẩn; cloud mới kiểm thử 50–100 thiết bị.

## 14 câu hỏi phản biện chính

### 1) Đề tài khẳng định đóng góp học thuật chính là gì: một sản phẩm tích hợp end-to-end, hay một phương pháp kỹ thuật mới?
- **Vì sao hội đồng hỏi:** Thesis mạnh về tích hợp hệ thống hoàn chỉnh, nhưng nếu gọi là đóng góp học thuật thì cần làm rõ phần nào là tri thức mới, phần nào là engineering integration.
- **Điểm yếu có thể bị khai thác:** Nếu trả lời mơ hồ, hội đồng có thể kết luận đề tài chủ yếu là “ghép công nghệ sẵn có” hơn là có novelty rõ ràng.
- **Một câu trả lời tốt cần có:** Xác định thẳng novelty nằm ở tối ưu trade-off theo bối cảnh xe thuê tự lái tại Việt Nam: BLE OBD2 + LTE/GNSS tích hợp + power architecture + cloud dual-storage + cost envelope; đồng thời thừa nhận đây là novelty ở mức tích hợp hệ thống, không phải phát minh thuật toán mới.

### 2) Vì sao anh chọn ESP32-S3 thay vì STM32L4 dù chính thesis thừa nhận STM32L4 tốt hơn về low-power?
- **Vì sao hội đồng hỏi:** Đây là quyết định kiến trúc lõi; nếu không bảo vệ tốt, hội đồng sẽ cho rằng anh hy sinh mục tiêu năng lượng chỉ để tiện phát triển.
- **Điểm yếu có thể bị khai thác:** Kết quả deep sleep toàn hệ thống ~0.5 mA khá sát ngưỡng mục tiêu, nên lựa chọn MCU có thể bị xem là chưa tối ưu triệt để.
- **Một câu trả lời tốt cần có:** Chứng minh bài toán là tối ưu toàn hệ, không phải tối ưu một thông số MCU; BLE tích hợp giúp bỏ module ngoài, giảm BOM/độ phức tạp/rủi ro tích hợp; chênh lệch deep sleep MCU không quyết định toàn bộ vì modem, power path và ngoại vi chi phối đáng kể.

### 3) Vì sao anh chọn OBD2 BLE qua vgate iCar Pro thay vì OBD2 có dây, trong khi BLE làm tăng rủi ro tương thích và độ ổn định?
- **Vì sao hội đồng hỏi:** Đây là trade-off giữa khả năng lắp đặt thực địa và độ tin cậy kỹ thuật.
- **Điểm yếu có thể bị khai thác:** Thesis có nêu rủi ro không tương thích với một số dòng xe và tài liệu adapter hạn chế; hơn nữa phần multi-frame phải reverse engineer.
- **Một câu trả lời tốt cần có:** Nêu rõ mục tiêu deployment thực tế cho xe thuê cần giảm dây dẫn và linh hoạt vị trí lắp; chứng minh BLE vẫn đủ ổn định ở scope hiện tại; thừa nhận đánh đổi và nêu kế hoạch mở rộng compatibility matrix trên nhiều dòng xe.

### 4) Phần OBD2 multi-frame qua BLE dựa trên reverse engineering khá nhiều. Anh làm gì để đảm bảo tính đúng đắn kỹ thuật chứ không chỉ “chạy được trên một adapter”? 
- **Vì sao hội đồng hỏi:** Đây là điểm kỹ thuật khó nhất và cũng dễ bị nghi ngờ nhất về độ vững chắc học thuật.
- **Điểm yếu có thể bị khai thác:** Phụ thuộc thiết bị bên thứ ba ít tài liệu; nguy cơ lời giải chỉ đúng với vgate iCar Pro hoặc một firmware version cụ thể.
- **Một câu trả lời tốt cần có:** Mô tả rõ quy trình đối chiếu nhiều nguồn: sniff BLE, đọc ISO 15765-2, so sánh với ứng dụng mã nguồn mở, kiểm tra single-frame/multi-frame, và xác thực bằng dữ liệu thực trên xe/simulator; đồng thời thừa nhận phạm vi tương thích hiện mới chắc nhất với adapter đã chọn.

### 5) Anh đo trên 2 xe Toyota Vios 2020 và Honda City 2021. Với cỡ mẫu như vậy, cơ sở nào để kết luận hệ thống “phù hợp cho doanh nghiệp cho thuê xe tại Việt Nam”? 
- **Vì sao hội đồng hỏi:** Đây là câu hỏi về external validity và statistical confidence.
- **Điểm yếu có thể bị khai thác:** 2 xe là quá ít nếu suy rộng cho nhiều dòng xe, nhiều ECU, nhiều điều kiện điện áp và hành vi sử dụng.
- **Một câu trả lời tốt cần có:** Thừa nhận đây là pilot validation chứ chưa phải khảo sát đại diện; nhấn mạnh mục tiêu của thesis là chứng minh feasibility end-to-end; nếu muốn khái quát hóa thì cần pha kiểm thử tiếp theo trên nhiều hãng xe, năm sản xuất, chuẩn OBD2 và điều kiện sử dụng khác nhau.

### 6) Thesis có ghi một số chỉ số “quy đổi theo baseline 18650” hoặc “ước tính, cần xác nhận thêm”. Vậy độ tin cậy của các kết luận về năng lượng hiện ở mức nào?
- **Vì sao hội đồng hỏi:** Hội đồng thường đánh rất mạnh vào chỗ kết luận dựa trên số liệu chưa fully measured.
- **Điểm yếu có thể bị khai thác:** Runtime pin dự phòng và deep sleep peak chưa phải toàn bộ đều là số đo lặp nhiều lần; có chỗ là estimate/quy đổi.
- **Một câu trả lời tốt cần có:** Phân biệt rõ đâu là số đo trực tiếp, đâu là số suy ra; không overclaim; trình bày sai số thiết bị đo, điều kiện đo, giả định quy đổi, và kế hoạch đo lặp trên cell/batch phần cứng chuẩn hóa ở vòng tiếp theo.

### 7) Mục tiêu phần cứng đặt ra dòng active trung bình <250 mA, nhưng ở bảng đo có active tracking khoảng ~350 mA. Vậy anh giải thích thế nào về việc “đạt” hay “chưa đạt” tiêu chí này?
- **Vì sao hội đồng hỏi:** Đây là điểm hội đồng rất dễ bắt lỗi vì có vẻ mâu thuẫn giữa mục tiêu ban đầu và số liệu đo.
- **Điểm yếu có thể bị khai thác:** Nếu trả lời không chặt, sẽ bị xem là đánh tráo khái niệm giữa “trung bình chu kỳ” và “giai đoạn truyền liên tục”.
- **Một câu trả lời tốt cần có:** Giải thích rõ ~350 mA là pha active tracking liên tục khi 4G truyền mạnh; còn average driving mode theo chu kỳ hoạt động được đánh giá ~180–220 mA; nhấn mạnh cần tách “steady average over cycle” và “worst-case continuous transmit”.

### 8) Ngưỡng LVD profile 12V đo được khoảng 11.48V thay vì 12.0V như thiết kế. Với hệ thống gắn trên xe thật, sai lệch này có thể gây hệ quả gì?
- **Vì sao hội đồng hỏi:** Đây là câu hỏi sát an toàn vận hành, rất thực tế và rất dễ tạo áp lực.
- **Điểm yếu có thể bị khai thác:** Nếu ngắt muộn hơn thiết kế, nguy cơ ảnh hưởng khả năng đề nổ hoặc làm giảm tuổi thọ ắc quy.
- **Một câu trả lời tốt cần có:** Thừa nhận đây là điểm chưa hoàn thiện; phân tích sai số đo ADC, tolerance linh kiện, hysteresis và profile điện áp thực tế theo loại xe; nêu hướng hiệu chuẩn lại threshold bằng thực nghiệm cold-cranking và nhiều điều kiện nhiệt độ.

### 9) Hệ thống nói có bảo vệ bảo mật bằng session-based auth, SHA-256 hash token, ACL theo thiết bị; nhưng chính thesis lại nói TLS cho MQTT và device certificate chưa hoàn thiện. Vậy hiện tại hệ thống chống giả mạo thiết bị đến đâu?
- **Vì sao hội đồng hỏi:** Security claim rất hay bị bóc nếu thiếu cơ chế bảo mật đầu-cuối trên kênh thiết bị.
- **Điểm yếu có thể bị khai thác:** Nếu MQTT chưa TLS/certificate đầy đủ, attacker có thể nghe lén, chiếm token, replay hoặc giả lập client trong một số kịch bản xấu.
- **Một câu trả lời tốt cần có:** Tách rõ “mức bảo mật hiện tại” và “mức production-ready”; nêu current controls giảm thiểu được gì, chưa giảm thiểu được gì; nói rõ production cần MQTTS, device identity mạnh hơn, certificate provisioning/rotation, security event logging.

### 10) Hệ thống cloud mới kiểm thử ở mức 50–100 thiết bị, nhưng phần hướng phát triển nói đến hàng ngàn xe. Cơ sở nào để tin kiến trúc hiện tại scale được?
- **Vì sao hội đồng hỏi:** Đây là câu hỏi về scalability realism, tránh việc extrapolate quá xa từ số đo nhỏ.
- **Điểm yếu có thể bị khai thác:** Single-node EMQX, single-node VictoriaMetrics, một bridge xử lý chính; chưa có benchmark ở cấp độ hàng ngàn kết nối thực.
- **Một câu trả lời tốt cần có:** Không khẳng định bừa là “scale được chắc chắn”; phải nói kiến trúc hiện tại mới chứng minh scale ở mức nhỏ-vừa, còn tiền đề mở rộng nằm ở việc tách broker/bridge/storage và hỗ trợ clustering; cần benchmark tiếp với workload thực, queueing, backpressure và HA.

### 11) Anh dùng PostgreSQL + VictoriaMetrics thay vì TimescaleDB một hệ thống hợp nhất. Tại sao anh chấp nhận tăng độ phức tạp vận hành?
- **Vì sao hội đồng hỏi:** Hội đồng muốn xem anh có hiểu trade-off hệ thống, không chỉ chọn theo benchmark đẹp.
- **Điểm yếu có thể bị khai thác:** Hai hệ lưu trữ làm tăng cognitive load, đồng bộ vận hành, backup, observability, consistency story.
- **Một câu trả lời tốt cần có:** Chỉ ra đặc tính dữ liệu khác nhau: nghiệp vụ quan hệ vs telemetry time-series; nêu lợi ích write throughput và retention của VictoriaMetrics; đồng thời thừa nhận đổi lại là vận hành phức tạp hơn và phù hợp vì scope hệ thống đã tách service ngay từ đầu.

### 12) Anh đánh giá độ trễ end-to-end dưới 500 ms và cập nhật dashboard dưới 2 giây. Chính xác anh đo theo phương pháp nào, p50 hay p95, và đã lặp bao nhiêu lần?
- **Vì sao hội đồng hỏi:** Con số latency nếu không có phương pháp thống kê rõ thì rất dễ bị xem là minh họa, không phải kết quả nghiên cứu chắc chắn.
- **Điểm yếu có thể bị khai thác:** Thesis nêu giá trị đo nhưng chưa thấy trình bày sâu phân phối, confidence interval hay số mẫu cho mọi chỉ số latency.
- **Một câu trả lời tốt cần có:** Mô tả timestamp chain, cách đồng bộ mốc thời gian, số lần đo, tải nền, điều kiện mạng; nếu chưa có p95/p99 thì thừa nhận và nói hiện số liệu chủ yếu là baseline vận hành chứ chưa phải benchmark thống kê đầy đủ.

### 13) Với tình huống mất sóng dài, anh replay từ microSD theo sequence và ACK cho bản ghi critical. Vậy anh xử lý duplicate, out-of-order, hoặc mất đồng bộ giữa PostgreSQL và VictoriaMetrics như thế nào?
- **Vì sao hội đồng hỏi:** Đây là câu hỏi rất “hội đồng kỹ thuật”, đánh vào tính nhất quán dữ liệu khi offline-first.
- **Điểm yếu có thể bị khai thác:** Nếu replay không có idempotency hoặc dedup rõ ràng, hệ thống có thể nhân bản telemetry/cảnh báo hoặc lệch giữa các storage.
- **Một câu trả lời tốt cần có:** Nêu rõ khóa sequence/message-id, chính sách idempotent ở bridge/backend, phân tầng mức quan trọng giữa telemetry và critical events, và thừa nhận đây là phần cần đo dài hạn thêm trong vận hành thực.

### 14) Thesis chủ động không điều khiển động cơ xe, không khóa xe từ xa. Đây là quyết định vì giới hạn kỹ thuật, hay vì cân nhắc an toàn và pháp lý?
- **Vì sao hội đồng hỏi:** Câu này kiểm tra tư duy đạo đức-kỹ thuật chứ không chỉ khả năng làm tính năng.
- **Điểm yếu có thể bị khai thác:** Nếu trả lời là “chưa làm kịp”, hội đồng có thể cho rằng tác giả chưa nhìn đủ rủi ro safety và liability.
- **Một câu trả lời tốt cần có:** Khẳng định đây là quyết định chủ đích: hệ thống hiện ưu tiên giám sát và cảnh báo, không can thiệp actuator của xe để tránh rủi ro an toàn chức năng, pháp lý và trách nhiệm khi điều khiển sai trong lúc xe đang vận hành.

## 5 câu follow-up ngắn để vặn lại
1. “Anh vừa nói hệ thống ‘đạt’, vậy ‘đạt’ theo số đo trực tiếp hay theo số quy đổi?”
2. “Nếu bỏ vgate iCar Pro đi và đổi adapter khác, phần nào trong kết luận của anh còn giữ được?”
3. “Tại sao với chỉ 2 xe thử nghiệm anh dám suy ra tính ứng dụng cho doanh nghiệp thực tế?”
4. “Nếu broker hoặc bridge bị restart giữa lúc replay microSD, anh đảm bảo toàn vẹn dữ liệu bằng cơ chế nào?”
5. “Nếu hôm nay triển khai production thật, anh dám chịu trách nhiệm bảo mật ở mức nào khi MQTTS và device certificate chưa hoàn chỉnh?”

## Unresolved questions
- Thesis chưa thể hiện thật rõ cho mọi chỉ số latency rằng số mẫu đo, phân phối thống kê và confidence level là bao nhiêu.
- Chưa thấy bằng chứng kiểm thử tương thích OBD2 trên phổ xe rộng hơn 2 mẫu xe hiện tại.
- Chưa thấy benchmark production-like cho HA/failover hoặc scale hàng ngàn thiết bị; mới dừng ở luận cứ kiến trúc và test nhỏ-vừa.