# Debug/Diagnostics Report — /cook --auto (programming docs)

Ngày: 2026-04-04 (Asia/Saigon)
Phạm vi: `iot-vehicle-tracking-system-firmware/hardware-specs/programming/*.md`

## Kết quả tổng quan
- **Blocker:** Không còn blocker kỹ thuật rõ ràng ở mức traceability nội bộ tài liệu.
- **Non-blocker:** Có vài điểm clarity cần siết để giảm khả năng hiểu sai khi đọc nhanh.

## Findings chính
1) **Inconsistency proof floor (đã sửa)**
- Trước sửa: `90-source-registry.md` ghi proof floor cho claim critical là `>=1 vendor + >=1 field evidence` (không nêu điều kiện field availability), trong khi `00-overview.md` và `91-claim-registry.md` có điều kiện "khi field source khả dụng".
- Rủi ro: reader hiểu nhầm rằng mọi claim critical luôn bắt buộc có field evidence, kể cả case không có field source.
- Fix: chuẩn hóa câu ở source registry để match policy chung.

2) **Citation index thiếu internal source index (đã sửa)**
- Trước sửa: `99-citation-index.md` map claim có dùng `SRC-I-*` nhưng phần `Source index` chưa liệt kê các source nội bộ này.
- Rủi ro: traceability không trọn vẹn khi audit nhanh từ citation index.
- Fix: thêm `SRC-I-SCOUT-01`, `SRC-I-RES-VENDOR`, `SRC-I-RES-FIELD` vào source index.

3) **Cấu trúc warning variant-sensitive (non-blocker)**
- Hiện trạng: warning confidence C cho `CLM-SIM-005` đã có trong SIM guide + matrix + unresolved.
- Gap nhẹ: `07-integration-patterns.md` (Pattern B) có nhắc `+CGNSINF` nhưng không lặp explicit warning C/preconditions tại chỗ.
- Tác động: reader skim riêng file integration có thể apply sớm mà bỏ qua điều kiện variant/manual lock.

## Đã sửa trực tiếp
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/hardware-specs/programming/90-source-registry.md`
  - Chuẩn hóa proof floor line theo policy "khi field source khả dụng".
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/hardware-specs/programming/99-citation-index.md`
  - Bổ sung internal source IDs vào `Source index`.

## Khuyến nghị còn lại (non-blocker)
1. Thêm 1 dòng warning ngay trong `07-integration-patterns.md`/Pattern B:
   - `CGNS* behavior variant/manual-sensitive (confidence C until UQ-002/UQ-003 closed)`.
2. Nếu dùng pack này cho handoff nhanh, thêm badge ngắn ở đầu mỗi file guide:
   - `Variant-sensitive: Yes/No` để giảm đọc sót policy.

## Unresolved questions
- Không có unresolved mới ngoài ledger hiện tại (`UQ-001..UQ-007`).