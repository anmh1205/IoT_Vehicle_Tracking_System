## Code Review Summary

### Scope
- Files: `iot-vehicle-tracking-system-firmware/hardware-specs/programming/*.md` (16 files)
- LOC: ~750
- Focus: docs consistency/safety readiness for finalize
- Scout findings: biến thể phần cứng (SKU modem/IMU variant/UART voltage domain) là điểm rủi ro chính; confidence C đã được gắn đúng cho luồng GNSS variant-sensitive.

### Overall Assessment
Bộ docs có cấu trúc tốt, traceability tốt, warning cho vùng chưa chắc chắn được thể hiện khá đầy đủ. Không thấy claim tấn công/unsafe ngoài defensive context. Có 1 lỗi đồng bộ nhỏ đã sửa trực tiếp trong citation index.

### Critical Issues
- Không phát hiện critical issue mức chặn phát hành do sai kỹ thuật hoặc unsafe guidance.

### High Priority
1. Publish blocking status chưa phản ánh đầy đủ UQ phụ thuộc trực tiếp claim `critical`:
   - `CLM-SIM-002` yêu cầu xác nhận domain UART/level shifting (gắn với `UQ-004`) nhưng hiện ledger chỉ block publish bằng danh sách tĩnh, chưa ràng buộc theo claim-level gate.
   - Tác động: đội đọc có thể hiểu nhầm rằng đã “pass global” dù claim critical còn phụ thuộc unresolved phần cứng.
   - File: `93-unresolved-questions.md:21` + liên quan `91-claim-registry.md:16`, `92-cross-validation-matrix.md:16`.

### Medium Priority
1. Khai báo runtime anchor có thể lệch với tree hiện tại (driver LIS3DSH đã thay đổi trong git status gần đây), cần xác nhận tránh stale reference:
   - `00-overview.md:44` trỏ `main/src/imu_lis3dsh.c`.
   - Nếu file đã đổi/xóa, nên đổi thành “historical/runtime anchor” hoặc cập nhật path hiện hành.
2. Một số “open issues” dùng UQ ID nhưng không link trực tiếp sang ledger, làm giảm khả năng điều hướng nhanh:
   - `01-esp32-s3-programming-guide.md:44`, `03-lis3dsh-vs-lis3dh-programming-guide.md:40-41`, `06-power-ic-and-sequencing-guide.md:39`.

### Low Priority
1. DRY có thể tối ưu thêm: cụm warning confidence C cho GNSS variant được lặp ở nhiều file (02, 07, 92). Có thể giữ 1 canonical warning block và dẫn link để giảm drift khi update.

### Edge Cases Found by Scout
- Variant drift modem (CE/NA/X-H) gây lệch command/timing và parser behavior (`CGNS*`).
- UART voltage-domain mismatch 1.8V/3.3V có thể gây lỗi ngắt quãng hoặc hư phần cứng.
- Wake polarity/capability mismatch gây false wake hoặc wake fail khó tái hiện.
- Power burst khi GNSS+LTE đồng thời có thể biểu hiện như AT timeout giả lỗi logic.

### Positive Observations
- Matrix/claim/source/citation được tổ chức nhất quán, ID format đồng bộ.
- Confidence C có warning/preconditions/unresolved refs khá rõ.
- Debug playbook có pass/fail criteria, phù hợp production troubleshooting.
- Không thấy hướng dẫn offensive hoặc vượt defensive scope.

### Recommended Actions
1. Trước finalize, thêm rule gate rõ: claim `critical` nào còn phụ thuộc UQ thì publish status phải “conditional” thay vì pass chung.
2. Xác nhận lại runtime anchor path IMU để tránh stale doc.
3. Chuẩn hóa link UQ thành link markdown trực tiếp tới `93-unresolved-questions.md` cho các guide.

### Metrics
- Type Coverage: N/A (docs-only)
- Test Coverage: N/A (docs-only)
- Linting Issues: N/A (không chạy markdown linter trong vòng review này)

### Unresolved Questions
- Runtime file `main/src/imu_lis3dsh.c` còn tồn tại sau thay đổi firmware hiện tại không?
- Có muốn chuyển “Blocking publish” sang bảng theo `Claim ID -> Blocking UQ` để kiểm soát gate chặt hơn không?
