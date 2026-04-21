# Nhóm 3 - Modal Phương Tiện/Tài Xế/Khách Hàng

## Phạm vi
- `Tracking_Frontend/src/features/vehicles/components/vehicle-detail-content.tsx`
- `Tracking_Frontend/src/features/vehicles/components/vehicle-detail-modal.tsx`
- `Tracking_Frontend/src/features/drivers/components/driver-detail-modal.tsx`
- `Tracking_Frontend/src/features/customers/pages/customer-detail-page.tsx`

## Lỗi hiện tại
- Bố cục tách 2 bên gây trải nghiệm kém; stat card không còn đúng nghĩa “stat card”.
- Thông tin trùng lặp giữa title, badge, section detail.
- Nhiều mô tả dài không cần thiết.

## Root Cause
- Các modal/page detail đang theo layout narrative + section dày chữ.
- Thiếu lớp “summary stat row” thống nhất cho 3 đối tượng.

## Kế hoạch kỹ thuật
1. Chuẩn hóa top section của cả 3 màn theo pattern:
   - Header ngắn gọn.
   - 1 hàng stat card ngang (4–6 card) cho chỉ số cốt lõi.
2. Gỡ thông tin trùng ở body nếu đã có ở title/stat.
3. Rút gọn mô tả section; chỉ giữ label + value trọng yếu.
4. Đảm bảo responsive: stat card xuống hàng hợp lý trên màn hình hẹp.

## Acceptance Checklist
- [x] Cả 3 màn có hàng stat card ngang rõ ràng.
- [x] Không còn chia tách 2 bên kiểu nặng chữ như hiện tại.
- [x] Thông tin trùng lặp được loại bỏ.
- [x] Nội dung title đủ gọn để thay thế các dòng mô tả thừa.
