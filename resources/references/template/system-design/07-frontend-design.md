# 07. Thiết kế dashboard và mobile IVTS

## Điều hướng và quyền

`/` chuyển hướng tới `/login`. Sau khi đăng nhập, người dùng vào cây `/dashboard`. Dashboard tổ chức màn hình theo công việc vận hành.

| Khu vực | Ví dụ |
| --- | --- |
| Điều hành | `/dashboard/command`, bản đồ tại `/dashboard/operations/map` và lịch sử chuyến đi |
| Đội xe | `/dashboard/fleet/devices`, xe, tài xế và khách hàng |
| Cần xử lý | Hàng đợi cảnh báo, bảo trì, vi phạm và thông báo |
| Nền tảng | Firmware, export, simulator, trạng thái dịch vụ và quản lý người dùng |

Next.js Proxy dùng cookie phiên để điều hướng. Backend quyết định yêu cầu HTTP và Socket.IO nào được phép. Route redirect tương thích nằm trong [cấu hình Next.js](../../../../iot-vehicle-tracking-system-cloud/Tracking_Frontend/next.config.ts).

## Luồng đọc và hiển thị

- Feature hooks và API client đọc DTO đã giải bọc. Cache phân biệt snapshot hiện tại, lịch sử và dữ liệu theo phiên. Khi đổi thiết bị hoặc khoảng thời gian, khóa truy vấn cần phản ánh đúng phạm vi đó.
- HTTP cung cấp snapshot ban đầu và dữ liệu lịch sử. Sự kiện Socket.IO cập nhật hoặc làm mới cache liên quan. Màn hình phải có trạng thái đang tải, rỗng và lỗi có thể thử lại. Giá trị trực tiếp thuộc snapshot hiện tại.
- Bản đồ điều hành có layer vùng cho phép và panel chỉnh sửa theo xe đang chọn. API hook và tạo payload thuộc feature geofence, được chia sẻ với các màn hình ngoài bản đồ.
- Các thành phần tương tác giữ nhãn truy cập, điều hướng bàn phím và vùng bấm phù hợp. Màn hình native có semantic state cho đang tải và lỗi.

## Flutter WebView

Flutter tải ứng dụng web đã cấu hình. Lớp native bổ sung lưu token, thông báo và tích hợp thiết bị. Native bridge kiểm tra origin và frame trước khi nhận token, xóa phiên hoặc mở quyền thiết bị. Quy trình logout cần đồng bộ phiên web và trạng thái native để người dùng có thể chuyển tài khoản trên cùng thiết bị.

- [Route và layout dashboard](../../../../iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/)
- [Realtime provider](../../../../iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/providers/socket-provider.tsx)
- [Các thành phần bản đồ](../../../../iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/map/components/)
- [Tích hợp Flutter WebView](../../../../iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/features/webview/)
