# Nhóm 6 - Dọn Copy Vô Nghĩa + Chuẩn Hóa Stat Card

## Phạm vi
- Toàn bộ frontend liên quan các câu mô tả “ngữ cảnh”, “narrative” không phục vụ thao tác.
- Component gốc: `Tracking_Frontend/src/components/common/stat-card.tsx`

## Lỗi hiện tại
- Còn nhiều dòng giải thích dài/vô nghĩa rải rác.
- Kích thước stat card chưa nhất quán giữa các màn.

## Kế hoạch kỹ thuật
1. Rà soát chuỗi mô tả dư thừa bằng grep theo cụm từ khóa (`Ngữ cảnh`, `để`, câu dài > 1 dòng trong card header...).
2. Gỡ hoặc chuyển sang info-tooltip nếu thực sự cần.
3. Chuẩn hóa `StatCard`:
   - min-height thống nhất.
   - spacing/header/value/subtitle nhất quán.
   - giới hạn subtitle line clamp để tránh card cao bất thường.
4. Kiểm tra các màn chính: system-status, system-admin, alerts, devices, vehicles, customers, drivers, trips.

## Acceptance Checklist
- [x] Các câu mô tả vô nghĩa bị loại bỏ.
- [x] Chỉ giữ giải thích có ích dưới dạng info-tooltip khi phù hợp.
- [x] Stat card đồng bộ kích thước toàn hệ thống.
