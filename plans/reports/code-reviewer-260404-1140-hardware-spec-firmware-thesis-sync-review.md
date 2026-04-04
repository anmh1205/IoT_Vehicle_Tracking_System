## Code Review Summary

### Scope
- Files: firmware core (`pin_map.h`, `imu_lis3dsh.*`, `power_mgr.*`, `modem_lte.c`, `state_machine.c`, `CMakeLists.txt`), docs/changelog, thesis final markdown + UML + generated figures
- Focus: current working tree for plan `plans/260404-1038-hardware-spec-firmware-thesis-sync`
- Scout findings:
  - Rename impact chain is complete in firmware build/runtime path (`CMakeLists`, include, wake pin macro)
  - New modem control-line APIs are integrated with guard paths for `GPIO_NUM_NC`
  - Thesis markdown still references multiple deleted figure assets

### Overall Assessment
Firmware rename + modem placeholder handling are mostly safe at compile level. Main blocker is thesis asset consistency (broken markdown image links due deleted SVG files). Additional medium risk: LIS3DSH migration currently keeps LIS3DH register programming assumptions without runtime compatibility fallback.

### Critical Issues
- None found.

### High Priority
1. Broken thesis figure references due deleted assets
   - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md:1090,1319,1343,2160,2691,2781,2939,2974,3091,3886,4061,5540,5546,5565,5586,5608,5695,6661`
   - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-readability-draft.md:1111,1340,1364,2181,2712,2802,2962,2997,3114,3909,4084,5571,5577,5596,5617,5639,5726,6714`
   - Referenced files above include deleted paths shown by git status, e.g.:
     - `resources/reports/thesis/final/assets/figures/thesis-99-bao-cao-thesis-hoan-chinh-01.svg` (deleted)
     - `resources/reports/thesis/final/assets/figures/thesis-08-chuong-4-trien-khai-firmware-01.svg` (deleted)
     - `resources/reports/thesis/final/assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-33.svg` (deleted)
   - Impact: render/export thesis bị mất hình hàng loạt.
   - Minimal fix: chạy lại pipeline render để tái tạo đúng file-name markdown đang tham chiếu, hoặc cập nhật markdown sang bộ tên file mới rồi regenerate đồng bộ 1 lần.

### Medium Priority
1. LIS3DSH migration vẫn dùng register programming path cũ của LIS3DH (rủi ro tương thích chức năng interrupt/config)
   - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c:24-31,137-141,176-184`
   - Dù WHO_AM_I đã đổi `0x3F` (`:122-134`), các thanh ghi control/interrupt và giá trị config chưa có nhánh xác thực theo datasheet LIS3DSH.
   - Impact: có thể init thành công nhưng motion interrupt/vibration behavior sai hoặc không ổn định trên phần cứng thật.
   - Minimal fix: thêm verify step sau init (đọc lại register then assert expected bits) + log rõ failure reason; nếu cần giữ tối thiểu thì thêm TODO runtime guard trong changelog/plan và test on-target bắt buộc trước merge.

2. Recovery path phụ thuộc RESET line mapping; với `GPIO_NUM_NC` thì AT-fail sẽ fail cứng
   - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/pin_map.h:34`
   - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_lte.c:56-65,155-161`
   - Hiện tại `PIN_MODEM_RESET=GPIO_NUM_NC`; khi AT probe fail, recover path trả fail ngay vì reset không hỗ trợ.
   - Impact: giảm khả năng tự phục hồi trong nhiễu nguồn/boot race.
   - Minimal fix: nếu reset không map thì fallback retry AT mềm 1 lần trước khi fail (không thêm luồng phức tạp).

### Low Priority
1. Changelog có khả năng drift tên file IMU so với trạng thái thực tế nếu không commit đủ rename pair
   - `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-changelog.md:11-13,17`
   - Đang ghi `main/src/imu_lis3dsh.c`, `main/inc/imu_lis3dsh.h`; cần đảm bảo commit bao gồm file mới (hiện đang untracked trong working tree).
   - Minimal fix: xác nhận staged set gồm cả file mới trước khi merge.

### Edge Cases Found by Scout
- Deep sleep wake source đã đổi sang `PIN_LIS3DSH_INT`; phụ thuộc đúng wiring INT1 active-high (`state_machine.c:460`).
- `GPIO_NUM_NC` placeholders đã được guard trong `power_mgr.c` khi config/read/write nên không gây crash trực tiếp.
- Firmware rename chain trong code build path đã đồng bộ (`CMakeLists`, include headers, pin macros), không thấy leftover `PIN_LIS3DH`/`imu_lis3dh` trong firmware source hiện tại.

### Positive Observations
- Rename LIS3DH -> LIS3DSH được áp dụng xuyên suốt firmware entry points.
- Guard pattern với `ESP_ERR_NOT_SUPPORTED` cho modem optional lines khá gọn, đúng KISS.
- Có bổ sung logging phần cứng modem STATUS/NET-LIGHT để hỗ trợ chẩn đoán runtime.

### Recommended Actions
1. Fix thesis asset consistency ngay (regenerate hoặc update markdown refs đồng bộ) trước khi chốt sync.
2. Thêm fallback mềm AT retry khi RESET line chưa map.
3. Thêm bước verify register sau IMU init trên target để giảm rủi ro migration LIS3DSH.
4. Trước merge: confirm staged rename pair (`imu_lis3dsh.h/.c`) để tránh mismatch docs-vs-code.

### Metrics
- Type Coverage: N/A (C firmware + markdown assets)
- Test Coverage: chưa có số liệu trong review này
- Linting Issues: chưa chạy trong review này

### Unresolved Questions
- Board rev hiện tại có thật sự đấu RESET/DTR/STATUS/NET-LIGHT chưa, hay sẽ giữ NC đến rev sau?
- Bộ figure-name chuẩn cuối cùng cho thesis là nhóm `thesis-99-*` hay nhóm chapter-prefixed mới?
- Đã có test on-target xác nhận motion interrupt behavior LIS3DSH sau migrate chưa?
