# Rà soát UI UX và báo cáo IVTS Cloud

Ngày 27/11/2026. Mốc đối chiếu là `origin/main` tại `152883fda`. Phạm vi gồm các luồng web từ đăng nhập đến điều hành, xem bản đồ, chuyến đi và báo cáo. Kiểm tra cloud bao gồm API liên quan, bộ kiểm thử Backend và MQTT Bridge, cùng phân tích tĩnh và kiểm thử Flutter.

## Kết quả rà soát

| Mức ưu tiên | Hiện tượng | Thay đổi |
| --- | --- | --- |
| Cao | Báo cáo nhiên liệu chưa áp dụng phạm vi thiết bị và phương tiện của người dùng khi tổng hợp chuyến đi. | Cả tổng số, bảng theo xe và chuỗi thời gian dùng chung điều kiện truy cập SQL của danh sách chuyến đi. Kiểm thử bao phủ tài khoản được cấp quyền, dữ liệu cũ chỉ có liên kết xe, bản ghi mâu thuẫn, tài khoản quản trị và thao tác thu hồi quyền. |
| Cao | Frontend trả khung dashboard khi trình duyệt chưa có cookie phiên. Khi chốt kiểm tra chạy, nó cũng từng bỏ tham số bản đồ trong URL trả về. | Đặt Next.js Proxy cùng cấp với `src/app`. Chuyển về trang đăng nhập với đường dẫn và tham số cần khôi phục. API vẫn xác thực phiên và thực thi phạm vi truy cập. |
| Cao | Tổng quan có thể dựng dòng sự kiện, nhịp kết nối và giờ hoạt động lịch sử từ trạng thái thiết bị hiện tại khi API lỗi hoặc trả 0. | Năm truy vấn Tổng quan dùng các endpoint tương ứng của Backend. Số 0 và danh sách rỗng hợp lệ được giữ nguyên. Khi truy vấn lỗi, màn hình hiển thị trạng thái chưa tải được và cho phép thử lại phần lỗi. |
| Cao | Ngày kết thúc của báo cáo nhiên liệu chỉ được tính tới đầu ngày UTC. Biểu đồ có thể thiếu nhóm tuần hoặc tháng cuối nếu hai mốc cách nhau ngắn hơn một nhóm. | Ngày chỉ có phần lịch được tính tới cuối ngày UTC. Chuỗi biểu đồ bắt đầu và kết thúc theo ranh giới nhóm. Danh sách theo xe sắp xếp số lít theo giá trị số. |
| Trung bình | Lỗi tải chuyến đi hiện như một danh sách rỗng. Sau khi thao tác bắt đầu hoặc kết thúc thất bại, nút có thể vẫn bị khóa. | Tách thông báo tải lần đầu, lỗi tải thêm và lỗi số liệu tổng hợp. Giữ các trang đã tải, cho thử lại và làm mới số đếm sau thao tác. Nút chỉ bị khóa trong lúc yêu cầu đang chạy. Các thao tác ghi hiển thị theo vai trò mà API cho phép. |
| Trung bình | Thống kê và Nhiên liệu thiếu đường dẫn trong menu. Hai trang gửi truy vấn khi khoảng ngày bị bỏ trống hoặc đảo thứ tự. | Thêm cả hai mục vào nhóm Vận hành. Kiểm tra khoảng ngày trước khi gọi API, thêm nút thử lại và dùng dấu gạch ngang khi chưa có kết quả cho chỉ số. Bỏ nút xuất báo cáo theo khoảng ngày vốn bị vô hiệu hóa. |
| Trung bình | Nội dung giới thiệu đẩy biểu mẫu đăng nhập xuống dưới màn hình điện thoại. Tùy chọn ghi nhớ đăng nhập không ảnh hưởng thời hạn cookie. | Đưa biểu mẫu lên ngay sau nhận diện IVTS trên màn hình hẹp. Bỏ tùy chọn không có hiệu lực, liên kết lỗi với từng trường và chừa chỗ cho nút hiện mật khẩu. |
| Trung bình | Menu di động vẫn che nội dung sau khi chọn trang. Bản đồ có hai phần tử cùng đích của liên kết bỏ qua điều hướng. | Đóng menu sau khi chọn liên kết nội bộ. Sửa đích nhận focus, cấu trúc breadcrumb và nhãn trang hiện tại. Bảng dùng chung nhận diện cả biểu tượng SVG trong nút và ẩn phân trang khi không có bản ghi. |

Hai thay đổi về số liệu Tổng quan kế thừa cách xử lý dữ liệu có thẩm quyền và phạm vi thiết bị đã được ghi nhận ở [#195](https://github.com/anmh1205/IoT_Vehicle_Tracking_System/issues/195) và [#182](https://github.com/anmh1205/IoT_Vehicle_Tracking_System/issues/182).

## Kiểm thử

| Lớp kiểm tra | Kết quả |
| --- | --- |
| HTTP và trình duyệt | Yêu cầu bản đồ chưa đăng nhập đổi từ HTTP 200 trước khi đặt Proxy sang HTTP 307. URL đích giữ lựa chọn thiết bị và mức thu phóng. Đường dẫn thiết bị có dấu chấm cũng chuyển về đăng nhập. Kiểm tra thiếu thông tin, sai mật khẩu và đăng nhập thành công bằng Microsoft Edge. Ở viewport 390 × 664 px, đáy nút đăng nhập nằm tại 424 px và trang không cuộn ngang. |
| Vận hành trên Microsoft Edge | Tổng quan giữ dòng sự kiện rỗng và phục hồi biểu đồ giờ hoạt động từ lỗi HTTP 503 về 0 giờ. Chuyến đi hiện lỗi danh sách và lỗi số liệu riêng, rồi trở về trạng thái rỗng sau khi thử lại. Trên màn hình 390 px, menu tự đóng khi vào Thống kê, bộ lọc báo lỗi ngày đảo thứ tự, và Nhiên liệu phục hồi từ lỗi về 0 L. |
| Frontend | `npm ci` và `npm run verify` đạt, gồm 47 bài kiểm thử và bản build production. Lint còn 2 cảnh báo có sẵn ở trang Firmware và trình xử lý phiên web. |
| Backend | `npm ci`, `npm run verify` và `npm run build` đạt. 347 bài đạt, 50 bài tích hợp bị bỏ qua trong lần chạy mặc định. Bộ kiểm thử phạm vi dữ liệu liên quan được chạy riêng. |
| Phạm vi dữ liệu báo cáo | 5 bài kiểm thử SQL trong bộ `asset-read.postgres.integration.test.ts` đạt qua PostgreSQL nhúng PGlite và kết nối TCP. Bao phủ tổng số nhiên liệu, chi tiết từng xe, chuỗi thời gian, thu hồi quyền và một khoảng ngày cắt qua hai tuần. |
| MQTT Bridge | `npm ci`, `npm run verify` và `npm run build` đạt. 87 bài đạt, 6 bài tích hợp cần dịch vụ ngoài được bỏ qua trong lần chạy mặc định. |
| Flutter Mobile | `flutter test` đạt 20 bài. `flutter analyze` với Flutter 3.50.0 trả 7 thông báo mức info về import Material đã bị đánh dấu deprecated. Workflow của repository ghim Flutter 3.27.0. |

## Hạng mục còn mở

- Chưa kiểm tra web trên UAT hoặc WebView Android/iOS thật. Kiểm thử Edge dùng API giả lập, nên không chứng minh đường đi từ thiết bị thật qua EMQX và PostgreSQL đến trình duyệt.
- Kiểm tra `npm audit --omit=dev` của lockfile Backend báo 30 mục, gồm 1 nghiêm trọng, 13 cao và 16 trung bình. Frontend có 1 mục trung bình và MQTT Bridge có 0 mục. Số đếm là kết quả đối chiếu phiên bản gói phụ thuộc với dữ liệu advisory. Khả năng ảnh hưởng của từng mục trên cấu hình triển khai còn cần xác minh.
- Xuất tệp tổng hợp Thống kê theo khoảng ngày chưa có luồng backend tương ứng. Chức năng xuất dữ liệu hiện có nằm ở Nền tảng → Xuất dữ liệu.
