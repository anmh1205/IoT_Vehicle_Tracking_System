# Audit V1 Canonical Checklist

Ngày cập nhật: 2026-04-19
Nguồn chuẩn: `resources/docs/audit-v1.pdf`
Nguồn đối chiếu ảnh/text: `resources/reports/audit-v1/2026-04-18/page-*.png`, `resources/reports/audit-v1/2026-04-18/page-*.txt`
Nguyên tắc đóng mục: chỉ đánh dấu hoàn tất khi UI local Docker, API/data thực và ảnh chụp live cùng khớp.

## 1. Liên kết dữ liệu lõi và dashboard
- [ ] PDF-01.1 Luồng gán `device -> vehicle` phải đồng bộ: xe đã gán thì device không còn báo `chưa gắn`.
  Nguồn: page-001.
  Ngữ cảnh ảnh: PDF cho thấy trạng thái gán đang lệch giữa màn device và màn vehicle.
- [ ] PDF-01.2 Kiểm tra toàn bộ luồng gán `customer -> vehicle` và `driver -> vehicle`, không chỉ sửa một màn hình đơn lẻ.
  Nguồn: page-001.
- [ ] PDF-01.3 Dashboard `Cảnh báo gần đây` phải lấy đúng nguồn dữ liệu, không rỗng giả khi thực tế đang có nhiều alert DTC/OBD.
  Nguồn: page-001.
- [ ] PDF-01.4 Dòng hoạt động thời gian thực phải được formalize lại: tiêu đề dạng nhãn rõ nghĩa, mô tả tiếng Việt, thông tin hữu ích hơn.
  Nguồn: page-001.

## 2. Vận hành / bản đồ
- [ ] PDF-02.1 Khi đã có overlay thông tin dưới map thì bỏ ô thông tin chọn thiết bị bị trùng trong sidebar.
  Nguồn: page-002.
  Ngữ cảnh ảnh: card thiết bị được chọn trong danh sách bên trái đang lặp vai trò với overlay ở đáy map.
- [ ] PDF-02.2 Click chọn một thiết bị phải tự focus/fly tới thiết bị, tương đương nút `Theo dõi xe`.
  Nguồn: page-002.
- [ ] PDF-02.3 Overlay dưới map phải hiển thị đúng thứ tự và đúng nghĩa: `tốc độ -> tua máy -> pin thiết bị -> ắc quy xe -> nhiệt độ máy -> tọa độ -> thời gian cập nhật`.
  Nguồn: page-002.
- [ ] PDF-02.4 Phải tách rõ `pin` và `ắc quy`; ô điện áp không được dùng sai ý nghĩa `hướng` hoặc trường không liên quan.
  Nguồn: page-002.
- [ ] PDF-02.5 Icon cảnh báo ở cuối overlay phải đỏ khi có lỗi và có tooltip giải thích lỗi tương ứng.
  Nguồn: page-002.
- [ ] PDF-02.6 Kích thước hai nút `Theo dõi xe` và `Vùng giám sát` phải đồng bộ với cụm nút `Đường phố / Vệ tinh`.
  Nguồn: page-002.
- [ ] PDF-02.7 Marker thiết bị phải là hình xe phù hợp với ngữ cảnh bản đồ đội xe.
  Nguồn: page-002 và yêu cầu user bổ sung sau đó.

## 3. Vùng giám sát
- [ ] PDF-03.1 UI tạo geofence không được tràn text hoặc dồn form khó đọc.
  Nguồn: page-003.
- [ ] PDF-03.2 Bán kính phải dùng đơn vị `km` thay vì `m` trong UI.
  Nguồn: page-003.
- [ ] PDF-03.3 Cho phép dải nhập từ `1 km` đến không giới hạn bằng ô nhập tay.
  Nguồn: page-003.
- [ ] PDF-03.4 Thanh kéo phải tối ưu cho dải `1..500 km`, nhưng không chặn giá trị lớn hơn nếu nhập tay.
  Nguồn: page-003.
- [ ] PDF-03.5 Hỗ trợ chọn tâm bằng cách chấm trực tiếp trên map.
  Nguồn: page-003.
- [ ] PDF-03.6 Luồng `tạo vùng bán kính` và `dùng xe đã chọn` phải được đơn giản hóa, không gây rối.
  Nguồn: page-003.
- [ ] PDF-03.7 Trang danh sách geofence phải khớp data thật, không chỉ hiện khung tính năng rỗng hoặc lệch cấu hình seed/mock.
  Nguồn: page-005.

## 4. Chuyến đi
- [ ] PDF-04.1 Dữ liệu trip phải khớp dữ liệu thực đang có trong hệ thống.
  Nguồn: page-004.
- [ ] PDF-04.2 Replay/map của trip phải được tích hợp vào modal hoặc bố cục tương đương modal device detail, không tách rời khó theo dõi.
  Nguồn: page-004.

## 5. Device detail modal
- [ ] PDF-05.1 Tab tổng quan cần tooltip giải thích thông số khi rê chuột.
  Nguồn: page-006.
- [ ] PDF-05.2 Bỏ biểu đồ runtime gần đây nếu giá trị thấp hoặc không còn mang ý nghĩa.
  Nguồn: page-006.
- [ ] PDF-05.3 Gộp hợp lý `Lộ trình` và `Phiên chạy` để tránh trùng chức năng.
  Nguồn: page-006.
- [ ] PDF-05.4 Phân biệt rõ `pin thiết bị`, `ắc quy xe`, `nhiệt độ động cơ`; không gộp sai ngữ nghĩa.
  Nguồn: page-007.
- [ ] PDF-05.5 Hiển thị đúng `firmware`, `biển số`, `khách hàng`; không được thiếu khi dữ liệu đã gán.
  Nguồn: page-007.
- [ ] PDF-05.6 Rà lại `chu kỳ gửi cấu hình`; phải giải thích rõ nó là gì và vì sao ra giá trị hiện tại, tránh số liệu vô nghĩa như `33 phút`.
  Nguồn: page-007 và page-012.
- [ ] PDF-05.7 Đổi các nhãn khó hiểu như `độ tươi bản tin`, `nhịp quan sát`, `readiness chưa complete catalyst`; thay bằng tiếng Việt chuẩn và rõ nghĩa hơn.
  Nguồn: page-008, page-009, page-010.
- [ ] PDF-05.8 Tăng diện tích map, giảm scroll; modal nên nghiên cứu bố cục rộng hơn kiểu `95% màn hình`, map lớn bên phải, thông tin bên trái.
  Nguồn: page-010.
- [ ] PDF-05.9 Tab `Mã lỗi` và `Lệnh` phải hoạt động thực sự; nếu luồng thật chưa có dữ liệu thì seed/mock hợp logic để audit UI/UX.
  Nguồn: page-011.
- [ ] PDF-05.10 Tab `Dữ liệu thô` phải hiển thị theo dạng matrix/bảng: có mã, giải thích, giá trị tương ứng.
  Nguồn: page-012.
- [ ] PDF-05.11 Tab `Cài đặt` phải hỗ trợ chu kỳ riêng cho `driving / parking / alert`, đồng thời kiểm tra được luồng cloud -> firmware end-to-end.
  Nguồn: page-012.

## 6. Fleet pages
- [ ] PDF-06.1 Audit và sửa toàn bộ nhóm `Phương tiện`.
  Nguồn: page-013.
- [ ] PDF-06.2 Audit và sửa toàn bộ nhóm `Tài xế`.
  Nguồn: page-013.
- [ ] PDF-06.3 Audit và sửa toàn bộ nhóm `Khách hàng`.
  Nguồn: page-013.
- [ ] PDF-06.4 Các màn fleet phải hiển thị đúng ngữ cảnh liên kết xe, thiết bị, khách hàng và trạng thái vận hành.
  Nguồn: page-013.

## 7. Alerts / notifications / maintenance
- [ ] PDF-07.1 Alert list phải hiển thị được alert thuộc thiết bị nào, xe nào.
  Nguồn: page-014.
- [ ] PDF-07.2 Alert detail modal phải rộng hơn và bố cục lại hợp lý; tránh chỗ thừa/chỗ thiếu.
  Nguồn: page-015.
- [ ] PDF-07.3 Sửa lỗi hiển thị `mark/markup` trong alert detail.
  Nguồn: page-015.
- [ ] PDF-07.4 Phần `Giải quyết` trong alert detail phải Việt hóa, giải thích lỗi và gợi ý hướng xử lý cho user.
  Nguồn: page-015.
- [ ] PDF-07.5 Màn `Bảo trì` phải được tái thiết kế UI/UX, hoàn thiện chức năng và relation với hệ thống; không được chỉ là khung rỗng.
  Nguồn: page-016.
- [ ] PDF-07.6 `Thông báo` phải hiển thị được là của thiết bị nào, xe nào.
  Nguồn: page-017.

## 8. System pages
- [ ] PDF-08.1 `Trạng thái hệ thống` phải hiển thị nhiều thông tin cần thiết hơn về các service, không quá sơ sài.
  Nguồn: page-018.
- [ ] PDF-08.2 `Firmware` phải được thiết kế lại toàn bộ về UI/UX và cấu trúc thông tin, theo đúng use case OTA.
  Nguồn: page-019.
- [ ] PDF-08.3 `Quản trị hệ thống` phải làm lại UI/UX, có trang đủ để xem metrics của VictoriaMetrics.
  Nguồn: page-020.
- [ ] PDF-08.4 `Quản trị hệ thống` phải có trang xem/quản trị PostgreSQL phù hợp.
  Nguồn: page-020.
- [ ] PDF-08.5 `Quản trị hệ thống` phải hoàn thiện đủ user case vận hành chính, không chỉ là demo truy vấn.
  Nguồn: page-020.

## 9. Cài đặt thông báo
- [ ] PDF-09.1 Thêm kênh thông báo `Discord`.
  Nguồn: page-021.
- [ ] PDF-09.2 Thêm kênh thông báo `Telegram bot`.
  Nguồn: page-021.
- [ ] PDF-09.3 FE phải có nút bật/tắt và khi bật phải có form nhập thông tin cấu hình.
  Nguồn: page-021.
- [ ] PDF-09.4 Thông tin cấu hình kênh thông báo phải lưu xuống PostgreSQL đúng logic.
  Nguồn: page-021.

## 10. Ghi chú thực thi vòng hiện tại
- [ ] Chỉ đóng mục khi đã có ảnh live mới sau rebuild local Docker.
- [ ] Với mục UI/UX, phải đối chiếu cả bố cục ảnh gốc trong PDF và hành vi thực tế trên local.
- [ ] Với mục liên quan data/flow, phải kiểm tra API và dữ liệu thật thay vì chỉ sửa giao diện.
