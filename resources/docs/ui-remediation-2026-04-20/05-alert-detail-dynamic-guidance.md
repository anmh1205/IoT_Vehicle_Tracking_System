# Nhóm 5 - Modal Cảnh Báo/Hàng Đợi

## Phạm vi
- `Tracking_Frontend/src/features/alerts/components/alert-detail-modal.tsx`

## Lỗi hiện tại
- “Diễn giải và hướng xử lý” còn cảm giác text cứng, chưa đủ theo từng trường hợp thực tế.

## Root Cause
- Mapping `buildAlertExplanation` còn ít nhánh và chưa khai thác metric cụ thể (`actual`, `threshold`, `status`...).

## Kế hoạch kỹ thuật
1. Mở rộng rule theo loại cảnh báo (`speeding`, `offline`, `maintenance_due`, `harsh_braking`, geofence enter/exit, default).
2. Nội dung đề xuất có biến số vận hành cụ thể khi có dữ liệu (vượt bao nhiêu, mất kết nối bao lâu, ...).
3. Trình bày theo checklist hành động ngắn thay vì đoạn văn dài.
4. Giữ fallback rõ ràng khi thiếu dữ liệu.

## Acceptance Checklist
- [x] Mỗi loại lỗi chính có diễn giải riêng.
- [x] Hướng xử lý có tính hành động cụ thể.
- [x] Không còn block text “một kiểu cho mọi lỗi”.
