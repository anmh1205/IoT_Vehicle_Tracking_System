# UI Remediation Master Checklist (2026-04-20)

## Mục tiêu
- Sửa triệt để các lỗi UI/UX theo phản hồi mới nhất.
- Thực hiện tuần tự từng nhóm lỗi, hoàn tất kiểm tra nhóm hiện tại rồi mới chuyển nhóm tiếp theo.
- Tránh thêm copy dài/vô nghĩa; ưu tiên thông tin vận hành thực dụng.

## Nguyên tắc thực thi
- [x] Không chuyển nhóm khi chưa đạt đủ acceptance của nhóm hiện tại.
- [x] Mỗi nhóm phải có: sửa code, tự test cục bộ, cập nhật trạng thái checklist.
- [x] Chỉ sửa trong phạm vi lỗi; không phát sinh redesign ngoài yêu cầu.
- [x] Mọi text tiếng Việt hiển thị cho người dùng phải có dấu đầy đủ, không để bản không dấu.

## Bổ sung bắt buộc từ plan `260420-1636-firmware-fe-refactor-ivm26-benchmark`
- [x] Quality gate tối thiểu trước khi chốt vòng sửa: `lint + typecheck + build + manual verify`.
- [x] Ưu tiên tái sử dụng shared component hiện có (`stat-card`, `PageContainer`, `data-table`, pattern chung); không fork pattern mới không cần thiết.
- [x] Giữ tương thích ngược hành vi hiện có (API contract, realtime flow, role gate), tránh regression tính năng đang chạy.
- [x] Ưu tiên progressive disclosure cho thông tin phụ (tooltip, panel/drawer thu gọn), giữ first-fold tập trung thông tin vận hành chính.
- [x] Mỗi nhóm sửa xong phải có bằng chứng kiểm tra trực quan qua browser trước khi chuyển nhóm kế tiếp.

## Danh mục nhóm lỗi
1. [x] Nhóm 1 - Replay Tab (panel góc phải map, 3 nút replay, timeline, bảng thông số, thu gọn/mở rộng)
   - Tài liệu: `01-route-replay-corner-panel.md`
2. [x] Nhóm 2 - Settings Tab (UI/UX lưu cấu hình, tối ưu header, dọn giải thích)
   - Tài liệu: `02-device-settings-tab-ux.md`
3. [x] Nhóm 3 - Modal phương tiện/tài xế/khách hàng (stat card ngang, bỏ trùng lặp)
   - Tài liệu: `03-entity-detail-modals-statcards.md`
4. [x] Nhóm 4 - Vận hành/Bản đồ (status thiết bị + trạng thái xe, tooltip cảnh báo, filter 1 hàng, sidebar scroll)
   - Tài liệu: `04-operations-map-sidebar-status-alerts.md`
5. [x] Nhóm 5 - Modal cảnh báo/hàng đợi (diễn giải + hướng xử lý theo từng loại lỗi)
   - Tài liệu: `05-alert-detail-dynamic-guidance.md`
6. [x] Nhóm 6 - Dọn copy vô nghĩa toàn UI + chuẩn hóa stat card toàn hệ thống
   - Tài liệu: `06-global-copy-cleanup-and-statcard-standardization.md`

## Tiêu chí hoàn tất tổng
- [x] `npm run typecheck` backend/frontend pass.
- [x] Lint pass cho các file đã sửa.
- [x] Docker local chạy ổn (`tracking-backend`, `tracking-frontend` healthy).
- [x] Kiểm tra browser xác nhận đủ 6 nhóm lỗi đã xử lý.

## Trạng thái hiện tại
- Bước lập kế hoạch: `Completed`
- Nhóm đang xử lý: `Hoàn tất 6/6 nhóm`

## Follow-up sau nghiệm thu (2026-04-20)
- [x] Reopen Nhóm 1 theo phản hồi: replay không được là bảng/card lớn.
- [x] Chuyển replay sang thanh dọc nhỏ full-height mép phải map trong tab Lộ trình.
- [x] Xác nhận nút thu gọn/mở rộng còn hoạt động đúng sau khi đổi layout.
- [x] Chụp bằng chứng trực quan bằng CCS Browser:
  - `resources/reports/audit-v1/2026-04-20/live/devices-detail-route-replay-rail-fixed.png`
  - `resources/reports/audit-v1/2026-04-20/live/devices-detail-route-replay-rail-collapsed.png`
  - `resources/reports/audit-v1/2026-04-20/live/devices-detail-route-tab-replay-rail-context.png`

## Follow-up tăng cường rà UI/UX (2026-04-21)
- [x] Đưa viewport kiểm tra về kích thước bình thường `1366x768`.
- [x] Sửa overflow bảng `Cảnh báo/Hàng đợi` để không tràn ngang toàn trang.
- [x] Dọn subtitle mô tả dư ở header `Trạng thái hệ thống`, `Quản trị hệ thống`, `Hàng đợi`.
- [x] Chuyển giải thích telemetry trong modal thiết bị sang pattern info tooltip.
- [x] Tối ưu hiển thị giá trị dài của stat card khách hàng (email không vỡ layout).
- [x] Re-verify đầy đủ qua CCS Browser và lưu bằng chứng:
  - `resources/reports/audit-v1/2026-04-20/recheck-uiux-round5-normal-fixes/verification-round5.md`
