# Nhóm 2 - Settings Tab: Sửa UX Lưu Cấu Hình

## Phạm vi
- File chính: `Tracking_Frontend/src/features/devices/components/device-detail-modal/settings-tab.tsx`

## Lỗi hiện tại
- Người dùng vẫn phải cuộn nhiều, UX lưu cấu hình chưa mượt.
- Header các ô chưa tối ưu sát góc theo yêu cầu.
- Nhiều đoạn giải thích dài gây rối mắt.

## Root Cause
- Bố cục hiện tại có quá nhiều section mô tả dài (`payload preview`, `flow step`) chiếm chiều cao.
- Sticky save bar có nhưng bị cạnh tranh với khối nội dung dài nên tổng trải nghiệm vẫn nặng.

## Kế hoạch kỹ thuật
1. Tối giản section đầu: giữ thông tin cần thiết và bỏ mô tả dài không phục vụ thao tác.
2. Đưa các field chính lên vùng nhìn đầu tiên (tránh cuộn sâu).
3. Chuẩn hóa card header (`px-4 pt-3 pb-2`) để sát góc hơn.
4. Giữ/siết pattern info-icon tooltip cho toàn bộ phần giải thích thay vì text block.
5. Tinh chỉnh sticky save bar: luôn thấy, có trạng thái dirty rõ ràng.

## Acceptance Checklist
- [x] Không cần cuộn xa để vừa nhập vừa lưu.
- [x] Header card sát góc trên trái hơn bản hiện tại.
- [x] Giải thích dài được thay bằng info-tooltip.
- [x] Sticky save bar dễ dùng, không che nội dung quan trọng.
