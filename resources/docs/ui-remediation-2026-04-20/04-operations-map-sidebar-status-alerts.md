# Nhóm 4 - Vận Hành/Bản Đồ

## Phạm vi
- `Tracking_Frontend/src/features/map/components/map-selected-device-overlay.tsx`
- `Tracking_Frontend/src/features/map/components/device-list-panel.tsx`
- `Tracking_Frontend/src/features/map/components/map-device-summary.tsx`
- `Tracking_Frontend/src/features/map/components/device-search.tsx`
- `Tracking_Frontend/src/features/map/components/device-filter.tsx`

## Lỗi hiện tại
- Icon cảnh báo chưa đặt đúng vị trí sau label trạng thái thiết bị.
- Chưa có phân biệt trạng thái thiết bị vs trạng thái xe.
- Tooltip icon cảnh báo phản ánh chưa ổn định theo phản hồi người dùng.
- Filter chưa nằm gọn trên 1 hàng.
- Summary có mô tả dư thừa.
- Sidebar chưa đảm bảo chỉ scroll list thiết bị.

## Kế hoạch kỹ thuật
1. Overlay header: thứ tự hiển thị
   - Tên thiết bị
   - Badge trạng thái thiết bị
   - Badge trạng thái xe (đang lái/đỗ/cảnh báo)
   - Icon cảnh báo ngay sau cụm trạng thái
2. Tooltip cảnh báo:
   - Trigger bằng button rõ ràng.
   - Tooltip hiển thị nội dung cảnh báo đầy đủ.
3. Filter bar:
   - Gom `search` + `status dropdown` cùng một hàng.
4. Summary panel:
   - Bỏ mô tả dài “Tổng quan đội xe hiển thị...”
   - Giữ số liệu ngắn.
5. Sidebar scroll:
   - Header/filter/stat fixed.
   - Chỉ danh sách thiết bị trong vùng scroll.

## Acceptance Checklist
- [x] Trạng thái thiết bị và trạng thái xe hiển thị tách biệt rõ.
- [x] Icon cảnh báo nằm sau cụm trạng thái.
- [x] Tooltip cảnh báo hiển thị đúng chi tiết.
- [x] Search + filter nằm cùng 1 hàng.
- [x] Summary không còn mô tả dài dư thừa.
- [x] Chỉ list thiết bị scroll.
