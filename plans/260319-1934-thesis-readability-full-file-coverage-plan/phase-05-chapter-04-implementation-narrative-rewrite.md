# Phase 05 — Chapter 04 implementation narrative rewrite

## Context Links
- Source files:
  - `resources/reports/thesis/chapters/07-chuong-4-trien-khai-hardware.md`
  - `resources/reports/thesis/chapters/08-chuong-4-trien-khai-firmware.md`
  - `resources/reports/thesis/chapters/09-chuong-4-trien-khai-cloud.md`
  - `resources/reports/thesis/chapters/10-chuong-4-ket-qua-do-luong.md`
- Validation artifact: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`
- Covers: toàn bộ Chương 4, gồm thiết kế chi tiết, chế tạo/lắp ráp, triển khai firmware/cloud/frontend, monitoring, hardening, tóm tắt, kiểm thử, kết luận chương.

## Overview
- Priority: Very High
- Status: Ready
- Mục tiêu: làm Chương 4 dễ đọc hơn bằng cách tách rõ phần kể luồng hoạt động và phần tham chiếu triển khai chi tiết.

## Execution order inside phase
1. `07-chuong-4-trien-khai-hardware.md`
2. `08-chuong-4-trien-khai-firmware.md`
3. `09-chuong-4-trien-khai-cloud.md`
4. `10-chuong-4-ket-qua-do-luong.md`
5. QA continuity Chương 4 trong assembled artifact

## Key Insights
- Chương 4 hiện chứa nhiều code/config/toolchain/build steps nên rất dễ biến thành tài liệu nội bộ thay vì narrative luận văn.
- Với cấu trúc mới, Chương 4 đã tách thành các source files theo domain; đây là lợi thế để ép narrative trước, evidence sau.
- Người đọc không chuyên cần hiểu hệ thống được dựng lên như thế nào trước khi phải đối mặt với lệnh, file, Docker, GPIO mapping hay stack BLE.

## Requirements
- Giữ đủ bằng chứng triển khai, kiểm thử và độ chín kỹ thuật.
- Với mọi module lớn, ưu tiên mô tả input → xử lý → output trước khi đưa code/config.
- Giữ code block/command block khi chúng thực sự chứng minh thiết kế hoặc quy trình chạy hệ thống.
- Bảo đảm phần test results vẫn rõ ý nghĩa, không chỉ liệt kê số liệu.
- Sau khi sửa source files, QA continuity trong bản assembled thay vì vá trực tiếp `final/`.

## Related Code Files
- Source of truth: `resources/reports/thesis/chapters/07-chuong-4-trien-khai-hardware.md` → `resources/reports/thesis/chapters/10-chuong-4-ket-qua-do-luong.md`
- Validation artifact: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`

## Implementation Steps
1. Rewrite `07`, ưu tiên narrative hardware detail, assembly, installation.
2. Rewrite `08`, ép flow firmware theo input → xử lý → output.
3. Rewrite `09`, giảm độ dày config bằng cue rõ ràng trước block lệnh.
4. Rewrite `10`, nêu ý nghĩa phép đo trước bảng/kết quả.
5. Chạy QA continuity trên assembled artifact cho nhịp nối `07 → 08 → 09 → 10`.

## File handoff checklist
- [ ] File mở đầu bằng mục tiêu phần này rõ ràng.
- [ ] Code/config block lớn có cue giải thích đọc để thấy gì.
- [ ] Test/results có câu chốt ý nghĩa.
- [ ] Đoạn cuối file nối tự nhiên sang file kế tiếp.

## Todo List
- [ ] Căn lại `07` theo narrative kỹ thuật dễ theo.
- [ ] Căn lại `08` phần firmware implementation.
- [ ] Căn lại `09` phần cloud/backend/frontend/observability.
- [ ] Căn lại `10` phần tóm tắt, đo lường, test results, kết luận chương.
- [ ] QA continuity Chương 4 trong bản assembled.

## Success Criteria
- Người đọc hiểu luồng triển khai mà không cần đọc sâu từng block lệnh.
- Các phần code/config không còn xuất hiện như khối thông tin không ngữ cảnh.
- Kết quả kiểm thử có ý nghĩa đọc rõ ràng, không chỉ là bảng số liệu.
- Khi ráp lại ở file final, Chương 4 vẫn giữ một narrative thống nhất.

## Definition of Done
- 4 source files `07-10` hoàn tất theo đúng execution order.
- Mỗi file pass file handoff checklist.
- QA continuity Chương 4 pass trong assembled artifact.

## Risk Assessment
- Rút gọn quá mạnh có thể làm mất dấu vết triển khai thực tế.
- Tách narrative/reference không khéo có thể làm đứt liên hệ giữa mô tả và bằng chứng.
- Sửa không đồng đều giữa 4 source files làm chương lệch nhịp.

## Security Considerations
- Giữ nguyên các phần hardening, auth, observability, request tracing, OTA và các lưu ý production.
- Không làm yếu đi thông điệp về an toàn vận hành hoặc kiểm thử phục hồi lỗi.

## Next Steps
- Sang Phase 06 để gọn hóa `11` và `12`.
