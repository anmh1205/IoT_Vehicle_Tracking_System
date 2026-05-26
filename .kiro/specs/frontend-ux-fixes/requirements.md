# Requirements Document

## Introduction

Tài liệu yêu cầu cho feature `frontend-ux-fixes` — tổng hợp toàn bộ lỗi tính năng, hoạt động, UI/UX đã phát hiện trong frontend web app IoT Vehicle Tracking System. Bao gồm 30 vấn đề được phân loại thành: lỗi tính năng nghiêm trọng, vấn đề UX/thao tác, thiếu sót API/data flow, và cải thiện cần thiết.

## Glossary

- **Mutation**: TanStack React Query mutation — async operation thay đổi server state
- **Optimistic Update**: Cập nhật UI ngay lập tức trước khi server confirm, rollback nếu fail
- **Query Invalidation**: Đánh dấu cached query là stale để trigger refetch
- **OBD DTC**: On-Board Diagnostics Trouble Code — mã lỗi chuẩn xe hơi (format: P/C/B/U + 4 hex digits)
- **Batch Operation**: Thực hiện cùng action trên nhiều items cùng lúc
- **Partial Save**: Tình huống một phần form submit thành công nhưng phần còn lại thất bại

## Requirements

### Requirement 1: Alert Detail Modal Action Buttons

**User Story:** Là operator, tôi muốn có thể xác nhận, giải quyết hoặc bỏ qua cảnh báo trực tiếp từ modal chi tiết, để không phải đóng modal rồi quay lại bảng để thao tác.

#### Acceptance Criteria

- 1.1 When alert detail modal is open AND alert.status !== 'resolved', Then modal footer hiển thị 3 action buttons: "Xác nhận" (acknowledge), "Giải quyết" (resolve), "Bỏ qua" (dismiss)
- 1.2 When user click một action button, Then button đó và các button khác bị disable cho đến khi mutation hoàn tất (success hoặc error)
- 1.3 When alert action (ack/resolve/dismiss) thành công, Then gọi `queryInvalidation.alerts.all(queryClient)` VÀ hiển thị success toast VÀ cập nhật alert state trong modal
- 1.4 When alert action thất bại, Then hiển thị error toast với message từ API VÀ buttons trở lại enabled state

### Requirement 2: Error Codes Tab Action Buttons

**User Story:** Là kỹ thuật viên, tôi muốn đánh dấu mã lỗi OBD đã xử lý trực tiếp từ bảng error codes, để theo dõi tiến độ sửa chữa mà không cần hệ thống bên ngoài.

#### Acceptance Criteria

- 2.1 When error code chưa resolved (resolvedAt === null), Then hiển thị nút "Đánh dấu đã xử lý" trong cột hành động của bảng
- 2.2 When user click "Đánh dấu đã xử lý", Then gọi API resolve error code VÀ invalidate `device-errors` query VÀ hiển thị success toast
- 2.3 When error code name matches pattern /^[PCBU][0-9A-F]{4}$/i, Then hiển thị badge "OBD DTC"; otherwise hiển thị badge "System"

### Requirement 3: Workspace Alerts Section Action Buttons

**User Story:** Là operator, tôi muốn resolve/ack alert trực tiếp từ device workspace modal, để không phải navigate ra trang alerts riêng khi đang xem thông tin thiết bị.

#### Acceptance Criteria

- 3.1 When workspace alerts section hiển thị alert cards, Then mỗi card có buttons: "Xác nhận" (nếu status === 'active') và "Giải quyết" (nếu status !== 'resolved')
- 3.2 When user resolve/ack alert từ workspace section, Then invalidate `queryInvalidation.alerts.all()` VÀ `queryInvalidation.alerts.deviceScoped(queryClient, deviceId)`

### Requirement 4: Bulk Alert Actions Batch Processing

**User Story:** Là operator, tôi muốn bulk resolve/ack nhiều cảnh báo cùng lúc một cách đáng tin cậy, với feedback rõ ràng về kết quả từng item trong batch.

#### Acceptance Criteria

- 4.1 When user click "Xác nhận đã chọn" hoặc "Giải quyết đã chọn", Then system gọi `Promise.allSettled` cho tất cả selected IDs thay vì `forEach((id) => mutation.mutate(id))`
- 4.2 When batch operation đang chạy, Then cả hai bulk buttons bị disable VÀ hiển thị loading indicator cho đến khi TẤT CẢ promises settle
- 4.3 When batch hoàn tất với all success, Then hiển thị success toast "Đã xử lý N cảnh báo"; khi partial failure thì warning toast "M/N thành công, K thất bại"
- 4.4 When batch operation settle (regardless of partial failure), Then clear selected IDs VÀ gọi `queryInvalidation.alerts.all(queryClient)`

### Requirement 5: Settings Form Error Handling

**User Story:** Là admin, tôi muốn biết chính xác phần nào của cấu hình đã lưu thành công và phần nào thất bại, để không bị mất dữ liệu hoặc nhầm lẫn trạng thái.

#### Acceptance Criteria

- 5.1 When user submit settings form, Then toàn bộ submit logic nằm trong try/catch block
- 5.2 When `onUpdateNameId` thành công nhưng `onUpdateSettings` thất bại, Then hiển thị warning toast "Tên đã cập nhật nhưng cấu hình kỹ thuật thất bại" VÀ form giữ dirty state
- 5.3 When `onUpdateNameId` thất bại, Then hiển thị error toast VÀ abort toàn bộ submit (không gọi `onUpdateSettings`)

### Requirement 6: Notification Delete Confirm Dialog

**User Story:** Là user, tôi muốn được hỏi xác nhận trước khi ẩn thông báo, để tránh xóa nhầm thông báo quan trọng.

#### Acceptance Criteria

- 6.1 When user click nút "Ẩn" trên notification item, Then mở ConfirmDialog với title "Ẩn thông báo" và description cảnh báo thao tác không thể hoàn tác
- 6.2 When confirm dialog mở, Then hiển thị nút "Ẩn" (confirm) và "Hủy" (cancel)
- 6.3 When user click "Ẩn" trong confirm dialog, Then gọi `deleteMutation.mutate(id)` VÀ đóng dialog

### Requirement 7: Notification Mutations Error Handling

**User Story:** Là user, tôi muốn được thông báo khi thao tác đánh dấu đã đọc hoặc ẩn thông báo thất bại, để biết cần thử lại.

#### Acceptance Criteria

- 7.1 When markRead mutation thất bại, Then hiển thị error toast "Không thể đánh dấu đã đọc" với message từ API
- 7.2 When delete mutation thất bại, Then hiển thị error toast "Không thể ẩn thông báo" với message từ API
- 7.3 When markAllRead mutation (dropdown) thất bại, Then hiển thị error toast "Không thể đánh dấu tất cả đã đọc" với message từ API

### Requirement 8: Notification Dropdown Text Clarity

**User Story:** Là user, tôi muốn text trên nút trong dropdown thông báo rõ nghĩa, để hiểu chính xác hành động sẽ thực hiện.

#### Acceptance Criteria

- 8.1 When notification dropdown hiển thị, Then nút mark-all có text "Đánh dấu tất cả đã đọc" thay vì "Đánh dấu tất cả"

### Requirement 9: Centralized Query Invalidation for Alerts

**User Story:** Là developer, tôi muốn có helper tập trung cho alert query invalidation, để đảm bảo mọi nơi resolve/ack alert đều invalidate đúng và đủ query keys.

#### Acceptance Criteria

- 9.1 When import queryInvalidation, Then có sẵn namespace `queryInvalidation.alerts` với methods: `all()`, `list()`, `deviceScoped()`, `summary()`
- 9.2 When gọi `queryInvalidation.alerts.all(queryClient)`, Then invalidate: `['alerts']`, queries matching `alerts-summary`, `['device-obd-alerts']`, `['dashboard-recent-alerts']`
- 9.3 When any component resolve/ack/dismiss alert, Then sử dụng `queryInvalidation.alerts.all()` hoặc `.deviceScoped()` thay vì tự gọi `queryClient.invalidateQueries` riêng lẻ

### Requirement 10: Optimistic Update for Alert Resolve

**User Story:** Là operator, tôi muốn row cảnh báo biến mất ngay khi tôi resolve, để trải nghiệm mượt mà và không phải đợi server response.

#### Acceptance Criteria

- 10.1 When user resolve một alert từ table, Then row biến mất ngay lập tức trước khi API response (optimistic update)
- 10.2 When resolve API trả về error, Then row được restore về vị trí cũ VÀ hiển thị error toast (rollback)
- 10.3 When resolve mutation settle (success hoặc error), Then gọi `queryInvalidation.alerts.all(queryClient)` để đảm bảo data consistency

### Requirement 11: Alert Detail Modal Map Section

**User Story:** Là operator, tôi muốn map section trong alert modal hiển thị placeholder rõ ràng khi không có tọa độ, thay vì để trống gây nhầm lẫn.

#### Acceptance Criteria

- 11.1 When alert không có latitude/longitude hợp lệ, Then hiển thị EmptyState placeholder "Không có tọa độ hợp lệ" với mô tả giải thích (đã implement, giữ nguyên)

### Requirement 12: Device Modal Mobile Responsiveness

**User Story:** Là user mobile, tôi muốn header badges trong device modal không bị overflow trên màn hình nhỏ, để đọc được thông tin thiết bị.

#### Acceptance Criteria

- 12.1 When device modal mở trên mobile viewport (width < 640px), Then badges wrap xuống dòng mới hoặc collapse để không overflow container

### Requirement 13: Commands Tab UX Clarity

**User Story:** Là user, tôi muốn commands tab rõ ràng rằng đây là lịch sử lệnh đã gửi, để không nhầm lẫn với form gửi lệnh mới.

#### Acceptance Criteria

- 13.1 When commands tab hiển thị, Then title/empty state rõ ràng label "Lịch sử lệnh điều khiển" thay vì chỉ "Commands"

### Requirement 14: Notification Stats Consistency

**User Story:** Là user, tôi muốn badge số thông báo chưa đọc cập nhật ngay sau khi đánh dấu đã đọc, để phản ánh đúng trạng thái hiện tại.

#### Acceptance Criteria

- 14.1 When markRead hoặc markAll thành công trong dropdown, Then invalidate cả `['notification-stats']` query để unreadCount cập nhật ngay
