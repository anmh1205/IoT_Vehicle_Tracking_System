# Nhóm 1 - Replay Tab: Corner Panel Gọn Trong Map

## Phạm vi
- File chính: `Tracking_Frontend/src/features/devices/components/device-detail-modal/route-tab.tsx`
- File liên quan: `route-replay-map.tsx` (nếu cần), style class tại component.

## Lỗi hiện tại
- Replay UI sau chỉnh sửa bị nặng và kém hơn bản cũ.
- Controls replay và thông số không nằm đúng bố cục mong muốn.
- Chưa có panel góc phải trong map có thể thu gọn/mở rộng.

## Yêu cầu bắt buộc
- Một panel ở góc phải phần map.
- Hàng 1: đúng 3 nút replay (`về đầu`, `play/pause`, `về cuối`).
- Hàng 2: timeline slider.
- Các hàng dưới: thông số dạng compact, không dùng bảng nặng.
- Panel phải có nút thu gọn/mở rộng.

## Cập nhật theo phản hồi mới nhất (2026-04-20)
- Panel replay phải là một thanh dọc nhỏ.
- Thanh phải chạy dài từ trên xuống dưới theo mép phải map (`top -> bottom`, `right edge`).
- Không giữ kiểu card nổi to/đậm như bản trước.

## Root Cause
- Replay info/control đang nằm dưới map thành khối dài, không phải corner panel.
- Component RouteTab đang chứa nhiều phần phụ (session list + filter) làm loãng trọng tâm replay.

## Kế hoạch kỹ thuật
1. Tái cấu trúc phần bên phải RouteTab: map làm nền, panel overlay tuyệt đối góc phải.
2. Tách panel replay thành block riêng trong RouteTab để dễ kiểm soát thứ tự hàng.
3. Giữ logic replay hiện có (cursor, play/pause, speed nếu cần) nhưng chỉ hiển thị 3 nút chính ở hàng đầu.
4. Chuyển danh sách thông số sang các khối compact theo cột dọc.
5. Thêm state `isReplayPanelCollapsed` + nút toggle.
6. Kiểm tra responsive: thanh replay vẫn bám mép phải map và thu gọn được.

## Acceptance Checklist
- [x] Panel góc phải xuất hiện trong khung map.
- [x] Panel là thanh dọc nhỏ chạy từ trên xuống dưới ở mép phải map.
- [x] Hàng đầu đúng 3 nút replay.
- [x] Hàng 2 là slider timeline.
- [x] Hàng dưới là thông số compact, không dùng bảng nặng.
- [x] Có thu gọn/mở rộng và hoạt động đúng.
- [x] Không phá logic chọn session và render route.

## Bằng chứng kiểm tra
- `resources/reports/audit-v1/2026-04-20/live/devices-detail-route-replay-rail-fixed.png`
- `resources/reports/audit-v1/2026-04-20/live/devices-detail-route-replay-rail-collapsed.png`
- `resources/reports/audit-v1/2026-04-20/live/devices-detail-route-tab-replay-rail-context.png`
