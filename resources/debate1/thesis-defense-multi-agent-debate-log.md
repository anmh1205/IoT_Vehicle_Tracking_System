# Thesis Defense Multi-Agent Debate Log

- Ngày tạo: 2026-04-12
- Nguồn chính: `resources/reports/thesis/final/thesis-final-report.tex`
- Bản text hỗ trợ đọc nhanh: `resources/reports/thesis/final/thesis-final-report.md`
- Mục tiêu: mô phỏng phiên phản biện thesis với 3 vai độc lập để tìm điểm yếu về chuyên môn, diễn đạt, bằng chứng, và tính nhất quán giữa báo cáo với repo thật.
- Vai trò:
  - `Hội đồng phản biện`
  - `Người tìm hiểu tech`
  - `Người trả lời`

Ghi chú: đây là transcript hợp nhất từ các vòng role-based. Nguồn gốc nội dung vẫn bám báo cáo LaTeX và đối chiếu repo thật; phần `.md` chỉ dùng để bóc tách nội dung nhanh hơn.

## Mở đầu

**Hội đồng phản biện:** Tôi sẽ hỏi theo hướng một buổi bảo vệ thật: quyết định kiến trúc, trade-off, độ tin cậy số liệu, rủi ro triển khai, và khả năng trình bày súc tích.

**Người tìm hiểu tech:** Tôi đã xác nhận một số phần cốt lõi là có thật trong repo: stack `ESP32-S3 + SIM7600CE-T + OBD2 BLE + EMQX + PostgreSQL + VictoriaMetrics + VictoriaLogs + Express + Socket.IO + Leaflet`, session token hash `SHA-256`, và luồng OTA/rollback có dấu vết rõ trong backend, mqtt bridge, và firmware.

**Người trả lời:** Chiến lược trả lời là 3 lớp: chốt ngắn ý chính, giải thích kỹ thuật, rồi buộc lại bằng chứng trong report/code. Phần nào repo chưa chứng minh được thì nói thẳng là chưa đủ bằng chứng.

## Vòng 1: Vì sao chọn `SIM7600CE-T` tích hợp LTE + GNSS?

**Hội đồng phản biện:** Vì sao em chọn `SIM7600CE-T` tích hợp thay vì tách riêng modem LTE và GNSS? Đánh đổi đó ảnh hưởng gì đến BOM, độ ổn định, và khả năng debug?

**Người trả lời:** Em chọn `SIM7600CE-T` vì nó giảm số module, giảm dây nối, giảm số rail nguồn và giảm độ phức tạp firmware khi chỉ cần một chuỗi AT để quản lý cả LTE lẫn GNSS. Đổi lại, em phải chấp nhận coupling cao hơn giữa mạng và định vị; khi modem có vấn đề thì GNSS cũng bị ảnh hưởng. Cách em bảo vệ quyết định này là đặt nó trong bối cảnh mục tiêu đồ án: thiết bị gọn, triển khai trên xe thật, tối ưu BOM và thời gian tích hợp.

**Người tìm hiểu tech:** Hướng trả lời này khớp với báo cáo ở các phần so sánh module modem/GNSS. Repo cũng cho thấy firmware thật đang bám SIM7600CE-T. Tuy nhiên cần tránh nói quá về “ổn định tuyệt đối”, vì phần GNSS vẫn phụ thuộc anten, nhiệt độ, và môi trường đo; những gì bạn có là bằng chứng trên hệ đang build, không phải bảo chứng cho mọi board.

**Hội đồng chốt:** Câu trả lời mạnh phải luôn có 2 vế: vì sao chọn tích hợp và cái giá phải trả. Nếu chỉ nói “gọn hơn” thì chưa đạt.

## Vòng 2: Các số liệu đo ở Chương 4-5 đáng tin đến đâu?

**Hội đồng phản biện:** Các con số như độ trễ realtime, P95 API, Lighthouse, pin dự phòng, deep sleep, GPS accuracy được đo theo quy trình nào? Làm sao để hội đồng tin đây là số liệu thật chứ không phải “số đẹp”?

**Người trả lời:** Em nên trả lời theo khuôn mẫu: nêu công cụ, nêu điều kiện đo, nêu số mẫu, rồi nêu giới hạn. Ví dụ với API là `k6`, với frontend là Lighthouse/Chrome DevTools, với các bài đo phần cứng là đồng hồ đo và kịch bản lặp. Nếu thiếu artifact gốc, em phải nói rõ hiện report đang lưu kết quả tổng hợp chứ chưa đóng gói đầy đủ log thô trong repo.

**Người tìm hiểu tech:** Đây là điểm hội đồng có thể bẻ khá mạnh. Trong report có các số như `~185 ms`, `P95 ~400 ms`, `1000 request/endpoint`, `Lighthouse 87`, `FCP ~1.2s`, nhưng hiện tôi không thấy artifact k6/log/CSV/trace tương ứng được lưu trong repo implementation. Với pin dự phòng và một số số liệu điện năng, chính report cũng đã tự chú thích theo kiểu baseline/quy đổi chứ chưa phải toàn bộ là đo thực.

**Hội đồng chốt:** Không được né. Nếu log gốc chưa lưu, hãy nói “đây là kết quả tổng hợp trong giai đoạn kiểm thử, em cần bổ sung phụ lục hoặc repo artifact để tăng khả năng tái lập”.

## Vòng 3: Vì sao dùng MQTT + QoS phân tầng thay cho HTTP hoặc CoAP?

**Hội đồng phản biện:** Vì sao em dùng MQTT 5.0 và QoS phân tầng thay vì HTTP/REST hoặc CoAP cho luồng thiết bị?

**Người trả lời:** Em chọn MQTT vì bài toán là uplink thời gian thực trên nền 4G có lúc không ổn định, dữ liệu gửi lặp chu kỳ, cần publish/subscribe, và cần tách mức ưu tiên giữa telemetry với alert/command. QoS 0 phù hợp cho telemetry mất gói được, còn QoS 1 dành cho sự kiện quan trọng. REST phù hợp cho backend API chứ không phù hợp bằng MQTT nếu ép thiết bị phải đẩy dữ liệu liên tục.

**Người tìm hiểu tech:** Lập luận kiến trúc này ổn. Nhưng phải cẩn thận ở chữ `MQTT 5.0`. Trong repo hiện tại, tôi chưa thấy cấu hình explicit `protocolVersion: 5` trong các lời gọi `mqtt.connect(...)`. Nghĩa là bạn có thể bảo vệ lựa chọn theo hướng “thiết kế hướng MQTT 5.0 / broker hỗ trợ 5.0”, nhưng nếu bị hỏi “feature 5.0 nào em đang dùng thật trong code?” thì cần trả lời rất chính xác hoặc hạ mức khẳng định.

**Hội đồng chốt:** Câu này có 2 mức. Mức 1 là chọn MQTT thay vì HTTP. Mức 2 là chứng minh bạn dùng đúng thứ bạn viết trong thesis. Đừng trộn hai mức làm một.

## Vòng 4: MQTT Bridge, dual-write, và kiến trúc nhiều kho dữ liệu

**Hội đồng phản biện:** Vì sao em tách `PostgreSQL`, `VictoriaMetrics`, `VictoriaLogs`, và `MQTT Bridge` thay vì gom về một chỗ? Kiến trúc này được kiểm chứng tải thực đến đâu?

**Người trả lời:** Em nên trả lời rằng mỗi kho dữ liệu giải quyết một access pattern khác nhau: PostgreSQL cho thực thể quan hệ, VictoriaMetrics cho time-series, VictoriaLogs cho log truy vết. MQTT Bridge tồn tại để validate payload, tạo session, và phân luồng dữ liệu thay vì nhồi tất cả vào backend API. Đây là cách giảm trách nhiệm cho backend và giúp kiểm soát ingest tốt hơn.

**Người tìm hiểu tech:** Lập luận này có cơ sở trong code. MQTT Bridge thật sự đang làm validate, session, VictoriaMetrics, VictoriaLogs, và ghi trạng thái. Nhưng có một giới hạn quan trọng: luồng ghi hiện là best-effort async, không phải transaction xuyên 3 kho. Nếu hội đồng hỏi “em đảm bảo nhất quán dữ liệu tuyệt đối thế nào?” thì câu trả lời trung thực phải là: em giảm rủi ro bằng tách trách nhiệm và logging/correlation, chứ chưa chứng minh transaction phân tán.

**Hội đồng chốt:** Không sao nếu chưa giải quyết transaction phân tán. Sai là khi trình bày như thể mọi thứ đã “đảm bảo tuyệt đối”.

## Vòng 5: BLE OBD2, reverse engineering, và phạm vi tương thích xe

**Hội đồng phản biện:** Phần khó nhất là BLE OBD2 và ISO-TP. Em thực sự làm đến đâu, test trên những xe nào, và mức tương thích hiện tại là gì?

**Người trả lời:** Em nên mô tả rất thực dụng: em chọn BLE OBD2 vì phù hợp lắp đặt trên xe thật, ESP32-S3 có BLE tích hợp nên giảm phần cứng phụ, và hệ thống tập trung vào tập PID đủ dùng cho tracking, không tuyên bố bao phủ toàn bộ mọi xe. Nếu có hỏi sâu hơn, phải nói được logic scan/kết nối, request/response, timeout, và multi-frame ở mức khái niệm.

**Người tìm hiểu tech:** Repo có driver BLE OBD và state machine thật, nhưng ở khía cạnh học thuật, hội đồng sẽ rất thích hỏi “bao phủ đến đâu”. Bạn chưa nên nói như một sản phẩm universal OBD2 reader. Câu an toàn là: đã kiểm chứng trên một số luồng thực nghiệm đủ để phục vụ đồ án và phần tracking, chưa khẳng định bao phủ toàn bộ hệ sinh thái xe.

**Hội đồng chốt:** Đây là nơi sự trung thực làm bạn mạnh hơn. Thừa nhận phạm vi kiểm chứng giới hạn tốt hơn việc phát biểu quá rộng.

## Vòng 6: Nguồn, LVD, pin dự phòng, và điểm yếu phần cứng

**Hội đồng phản biện:** Kết quả LVD 12V hiện bị lệch mục tiêu. Em xác định nguyên nhân gốc như thế nào, và bước sửa là gì?

**Người trả lời:** Em cần trả lời theo ngôn ngữ kỹ thuật cụ thể: khả năng sai số nằm ở comparator, điện trở chia áp, hysteresis, ADC calibration, hoặc điều kiện đo tải thực. Quan trọng là nêu kế hoạch sửa có thể làm được: chỉnh ngưỡng phần cứng, đo sweep lại, tách profile 12V và 24V, xác nhận dưới tải thực thay vì chỉ bench no-load.

**Người tìm hiểu tech:** Điểm này không cần tranh cãi, vì chính report đã ghi rõ `11.48V` và `12.53V` là chưa đạt cho profile 12V, và profile 24V còn chưa có vòng đo thực nghiệm hoàn chỉnh. Nếu bạn nói phần này “đã ổn định” thì hội đồng sẽ bắt ngay.

**Hội đồng chốt:** Đây không phải chỗ để phòng thủ bằng lời. Đây là chỗ để cho thấy tư duy kỹ sư: biết lỗi ở đâu, sửa thế nào, và chấp nhận nó chưa xong.

## Vòng 7: Bảo mật, session, production readiness

**Hội đồng phản biện:** Những biện pháp bảo mật hiện có đã đủ để chạy production chưa? Vì sao em chọn session-based thay vì JWT?

**Người trả lời:** Em nên nói rằng mình ưu tiên session opaque token vì revoke được ngay, token được hash `SHA-256` trong DB, và cùng mô hình auth đi qua cả HTTP lẫn Socket.IO. Đây là lựa chọn pragmatic cho bài toán quản trị thiết bị và dashboard. Nhưng em cũng phải nói thẳng là production-grade security còn thiếu TLS bắt buộc toàn tuyến, device certificate, secure boot, audit trail đầy đủ, và một số hardening khác.

**Người tìm hiểu tech:** Có một rủi ro diễn đạt trong report cần sửa. Report hiện mô tả token lưu memory-only trong Zustand và đính `Authorization: Bearer` cho mọi request. Thực tế frontend đang `withCredentials: true`, backend set cookie `session_token`, và middleware backend đọc cả Bearer lẫn cookie. Nghĩa là logic thật đang là hybrid cookie + bearer token, không phải chỉ memory-only như report mô tả.

**Hội đồng chốt:** Phần auth là nơi hội đồng rất dễ hỏi vì nó đụng bảo mật và logic hệ thống. Thesis phải mô tả đúng triển khai hiện tại hoặc phải chú thích rõ “thiết kế dự kiến” khác “triển khai hiện tại”.

## Vòng 8: Frontend, realtime, và tính nhất quán công nghệ

**Hội đồng phản biện:** Frontend của em đang là gì? Next.js 15 hay 16? Chart dùng ECharts hay Recharts? Room realtime hoạt động thế nào?

**Người trả lời:** Câu đúng là: report đang frozen theo một snapshot công nghệ cũ hơn, còn repo hiện tại đã nâng version/framework ở một số điểm. Em phải chủ động nói “phần thesis cần đồng bộ lại với repo”. Về realtime, ý tưởng thiết kế là đúng: backend bắn sự kiện qua Socket.IO, frontend nhận realtime, và phần room theo thiết bị là để giảm broadcast thừa.

**Người tìm hiểu tech:** Đây là mismatch rất rõ:
- Report lặp nhiều lần `Next.js 15`, nhưng `Tracking_Frontend/package.json` hiện là `next 16.1.6`.
- Report nói `ECharts`, nhưng frontend thực đang import `recharts`; không thấy dependency `echarts`.
- Report có phần mô tả Socket.IO khá tốt, và backend thật đúng là có 5 namespace `/dashboard`, `/devices`, `/notifications`, `/exports`, `/firmware`. Điểm này là một điểm mạnh có thể giữ.

**Hội đồng chốt:** Không được để hội đồng phát hiện mismatch version trước bạn. Hãy tự nói ra, đóng khung đó là “drift giữa repo hiện tại và snapshot thesis”, rồi nêu kế hoạch đồng bộ.

## Vòng 9: Tính nhất quán report-vs-repo ở mức cấu hình và pin map

**Hội đồng phản biện:** Nếu tôi mở repo ngay lúc này, tôi có thấy đúng pin map, đúng IMU runtime, đúng auth flow như em viết trong thesis không?

**Người trả lời:** Em phải cực kỳ thận trọng ở câu này. Câu trả lời an toàn là: có những phần đã khớp, nhưng cũng có những phần đang drift giữa các board revision hoặc giữa report và code hiện tại. Em cần tách “thiết kế mong muốn”, “trạng thái code”, và “trạng thái đo thực nghiệm”.

**Người tìm hiểu tech:** Đây là cụm rủi ro lớn nhất nếu hội đồng đối chiếu repo:
- Report mô tả `Next.js 15`, `ECharts`, auth memory-only; repo hiện tại không còn đúng hoàn toàn.
- Firmware có driver `imu_lis3dsh.c`, nhưng `state_machine.c` đang có `TRACKER_ENABLE_IMU=0` và log `IMU init skipped`.
- `pin_map.h` trong firmware hiện map UART modem `GPIO17/18`, `PIN_MODEM_PWRKEY GPIO_NUM_34`, IMU `INT41/42`, `SDA2`, `SCL1`; trong khi report lại mô tả các map khác như UART `16/17`, `PWR-KEY 26`, IMU `INT21`, `SDA47`, `SCL48`.

**Hội đồng chốt:** Đây không còn là lỗi trình bày nhỏ. Đây là việc bạn phải khóa ngay “baseline nào là baseline chính thức để bảo vệ”. Nếu không, hội đồng chỉ cần mở một file pin map là bạn mất thế chủ động.

## Vòng 10: Nếu chỉ có 60-90 giây để mở đầu phần bảo vệ?

**Hội đồng phản biện:** Em sẽ dẫn dắt thế nào để không biến bài nói thành danh sách công nghệ?

**Người trả lời:** Em nên đi theo khung 3 ý:
1. Bài toán thực tế: xe cần bị giám sát vị trí, trạng thái, và cảnh báo theo thời gian thực trong điều kiện vận hành thật.
2. Cách giải: thiết bị IoT trên xe thu dữ liệu OBD2/GNSS, gửi qua MQTT, bridge phân luồng về các kho lưu trữ và dashboard web hiển thị realtime.
3. Bằng chứng: hệ thống đã chạy end-to-end, có số liệu độ trễ/kiểm thử chính, nhưng còn một số giới hạn như LVD và đồng bộ thesis-vs-repo cần hoàn thiện.

**Người tìm hiểu tech:** Cách mở đầu tốt nhất là chốt bằng 1 điểm mạnh và 1 giới hạn. Ví dụ: “Điểm mạnh của em là luồng realtime end-to-end và kiến trúc tách lớp; điểm còn dang dở là phải đồng bộ lại báo cáo với repo hiện tại và bổ sung artifact đo kiểm”.

**Hội đồng chốt:** Nếu mở đầu bằng vấn đề -> giải pháp -> bằng chứng -> giới hạn, bạn sẽ nghe giống một kỹ sư trưởng thành hơn là người chỉ thuộc stack.

## Tổng hợp các điểm cần lưu ý

- Điểm mạnh thật sự của thesis nằm ở tư duy hệ thống nhiều tầng: device -> broker -> bridge -> backend -> frontend.
- Luồng realtime, auth session, OTA, và tổ chức nhiều kho dữ liệu có dấu vết thật trong repo, nên đây là phần nên ưu tiên bảo vệ.
- Điểm yếu lớn nhất không phải là thiếu công nghệ, mà là drift giữa thesis và repo hiện tại.
- Điểm yếu thứ hai là nhiều số liệu đẹp nhưng artifact tái lập chưa được đóng gói rõ trong repo.
- Điểm yếu thứ ba là phần nguồn/LVD và một số tuyên bố về IMU/runtime chưa nên nói như đã hoàn thiện.

## Sai sót và phần cần chỉnh sửa trong thesis

1. Đồng bộ version frontend: đổi toàn bộ `Next.js 15` thành baseline đúng với repo hiện tại, hoặc ghi rõ thesis đang freeze theo snapshot cũ.
2. Đồng bộ thư viện biểu đồ: nếu frontend thật dùng `Recharts` thì report không nên tiếp tục mô tả `ECharts` như công nghệ chính.
3. Sửa mô tả auth flow: hiện report mô tả memory-only + bearer-only chưa đúng với triển khai hybrid cookie + bearer token.
4. Kiểm tra và chuẩn hóa lại toàn bộ pin map giữa thesis, firmware, hardware docs, và board revision đang dùng.
5. Sửa cách diễn đạt về IMU/LIS3DSH: nếu runtime path đang disable thì không được viết như đã fully verified trong toàn bộ chuỗi đo thực nghiệm.
6. Hạ mức khẳng định với `MQTT 5.0` nếu chưa có chứng cứ explicit trong code, hoặc bổ sung chứng cứ cấu hình thật.
7. Bổ sung/đính kèm artifact đo kiểm: k6 outputs, Lighthouse report, benchmark logs, trace, ảnh setup đo, hoặc ít nhất mô tả môi trường đo chi tiết.
8. Tách rõ “đo thực nghiệm”, “quy đổi baseline”, và “ước tính kỹ thuật” trong các bảng pin, deep sleep, và runtime.
9. Giữ nguyên nhưng làm rõ hơn phần 5 namespace Socket.IO vì đây là đoạn khá khớp giữa report và code.
10. Với LVD, phải viết theo ngôn ngữ trung thực: profile 12V chưa đạt, profile 24V chưa đo đủ, hướng sửa đã xác định.

## Đề xuất cải thiện cách trả lời và trình bày

1. Trả lời theo mẫu: kết luận ngắn -> giải thích kỹ thuật -> dẫn bằng chứng -> nói rõ giới hạn.
2. Chủ động thú nhận 2-3 drift lớn trước khi hội đồng hỏi: `Next.js`, chart library, auth flow, pin map.
3. Không dùng câu “hệ thống đã hoàn thiện” cho phần phần cứng nguồn và IMU.
4. Khi bị hỏi sâu về benchmark, đừng cố thủ bằng con số; hãy chuyển sang mô tả phương pháp đo, điều kiện đo, và kế hoạch tăng khả năng tái lập.
5. Với câu hỏi “vì sao không dùng X?”, luôn trả lời theo trade-off của bài toán thực tế thay vì trả lời theo độ hot của công nghệ.
6. Trong slide hoặc lời mở đầu, luôn chốt 1 hạn chế còn mở. Điều đó làm phần trình bày đáng tin hơn.

## Danh sách ưu tiên chỉnh sửa ngay

1. Chốt một baseline chính thức để bảo vệ: repo hiện tại hay snapshot thesis.
2. Đồng bộ `Next.js`, chart library, auth flow, và pin map trong report.
3. Bổ sung phụ lục hoặc thư mục artifact cho benchmark và đo kiểm.
4. Viết lại các đoạn dễ overclaim: IMU runtime, MQTT 5.0, ACL per-device, production readiness.
5. Chỉnh phần LVD theo hướng “đã phát hiện lỗi và có kế hoạch sửa”, không mô tả như kết quả đã đạt.

## Câu hỏi bỏ ngỏ

- Baseline chính thức để bảo vệ là board/code revision nào?
- Report có cần bám repo hiện tại 100%, hay được phép bảo vệ theo snapshot đã freeze trước đó?
- Có artifact đo kiểm thô đang nằm ngoài repo không? Nếu có, nên nhập vào `resources/` để tăng tính tái lập.
- Pin map đúng cuối cùng cho board bảo vệ là map nào?
- Phần IMU/LIS3DSH có được bật trong build trình diễn hay chỉ dừng ở mức driver sẵn sàng?
