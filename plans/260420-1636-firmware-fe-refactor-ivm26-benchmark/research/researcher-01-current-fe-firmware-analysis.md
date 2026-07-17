# Phân tích hiện trạng firmware FE

## Phạm vi
- Chỉ phân tích UI/UX + ranh giới dữ liệu của page firmware FE.
- Không đề xuất implement code.

## 1) Route/page + component hierarchy
- Entry chính là `src/app/dashboard/firmware/page.tsx:44-384`.
- Page là client component, tự gánh toàn bộ: auth gate, fetch, realtime, mutation, tính KPI, render layout.
- Cấu trúc con hiện tại:
  - `FirmwareSummaryCards` `src/app/dashboard/firmware/components/firmware-summary-cards.tsx:20-133`
  - `FirmwareDeploymentHistory` `src/app/dashboard/firmware/components/firmware-deployment-history.tsx:36-207`
  - `FirmwareUploadDialog` `src/app/dashboard/firmware/components/firmware-upload-dialog.tsx:20-132`
  - `FirmwareDeployDialog` `src/app/dashboard/firmware/components/firmware-deploy-dialog.tsx:45-327`
  - helper chung `firmware-utils.ts` được import từ page `page.tsx:29-36`
- Page còn nhúng table + 2 block “ngữ cảnh” trung tâm, nên hierarchy thực tế là 1 page lớn + 4 panel chức năng.

## 2) Data fetch / mutation / realtime / permission / state boundaries
- Permission gate ở đầu page: `page.tsx:233-244` qua `useRoleAccess()`.
- Data fetch:
  - firmware list: `page.tsx:51-54`
  - devices list: `page.tsx:55`
  - deployments summary: `page.tsx:67-79`, fan-out theo từng firmware.
- Mutation:
  - delete: `page.tsx:113-123`
  - activate/deactivate: `page.tsx:125-137`
  - upload: `firmware-upload-dialog.tsx:34-55`
  - deploy OTA: `firmware-deploy-dialog.tsx:106-125`
- Realtime:
  - socket progress/complete chỉ invalidate summary + toast: `page.tsx:139-158`
- State boundaries đang mỏng:
  - page giữ `uploadOpen`, `deployTarget`, derived metrics, table columns.
  - dialog giữ search/selection/strategy riêng.
  - No central view-model; nhiều derived values lặp ở page và summary/history.

## 3) Dấu hiệu rối thông tin / thiếu progressive disclosure / pain points
- Rối thông tin cao: page hiển thị cùng lúc KPI, context cards, table, history, upload, deploy; mật độ thông tin dày `page.tsx:246-380`.
- Progressive disclosure yếu: ngay mặt đầu đã expose cả “ngữ cảnh bản phát hành”, “ngữ cảnh đợt OTA gần nhất”, bảng dữ liệu, rồi lịch sử dài `page.tsx:263-367`.
- `FirmwareDeploymentHistory` còn nhồi quá nhiều metadata trong từng item `firmware-deployment-history.tsx:110-200`, khó scan nhanh.
- `FirmwareDeployDialog` nặng nhất: search, bulk select, thống kê, phân bố version, context deploy, summary rủi ro trong 1 modal `firmware-deploy-dialog.tsx:148-323`.
- Có dấu hiệu over-context: `page.tsx:85-112` và `firmware-summary-cards.tsx:25-44` đều tính KPI gần giống nhau.
- Fan-out deployments theo từng firmware ở page `page.tsx:67-79` có nguy cơ tốn chi phí + làm UI chậm khi list tăng.
- Realtime chỉ toast, không có trạng thái live trên card/table nên user khó hiểu thay đổi thực sự ảnh hưởng gì `page.tsx:139-158`.

## 4) Giữ lại vs cần refactor
### Nên giữ
- Route hiện tại và phân quyền sớm `page.tsx:233-244`.
- Các dialog tách riêng upload/deploy `firmware-upload-dialog.tsx:20-132`, `firmware-deploy-dialog.tsx:45-327`.
- Helper format/label chung trong `firmware-utils.ts` (đã giảm trùng lặp).
- Data table + action menu vì phù hợp workflow quản trị `page.tsx:347-359`.

### Nên refactor
- Tách page thành “shell + view model + sections”; hiện page làm quá nhiều việc `page.tsx:44-384`.
- Hợp nhất logic derived metrics vào 1 selector/hook để tránh tính lặp giữa page và summary/history `page.tsx:85-112`, `firmware-summary-cards.tsx:25-44`, `firmware-deployment-history.tsx:42-63`.
- Giảm độ dày của history item bằng progressive disclosure (summary mặc định, mở rộng chi tiết sau).
- Rà lại deploy modal: tách “chọn thiết bị” khỏi “tóm tắt chiến dịch” để giảm cognitive load `firmware-deploy-dialog.tsx:148-323`.
- Cân nhắc phân trang/virtualization cho history và table nếu data tăng, vì hiện đang render full list + slice 20 nhưng vẫn fetch rộng `page.tsx:67-79`, `firmware-deployment-history.tsx:110-111`.
- Realtime nên phản hồi trực tiếp vào vùng liên quan thay vì chỉ toast `page.tsx:142-148`.

## Kết luận ngắn
- Firmware FE hiện đúng chức năng nhưng UI đang “control center” hơn là “progressive workflow”.
- Refactor ưu tiên: giảm tải nhận thức, gom derived state, cắt fan-out query, làm rõ từng lớp: phát hành, triển khai, lịch sử, realtime.

## Unresolved questions
- Dữ liệu `firmwareServices.getDeployments(item.id)` có API backend nào hỗ trợ summary tổng hợp thay vì fan-out theo từng firmware không?
- Có cần giữ lịch sử OTA trên page chính hay nên chuyển sang tab/accordion riêng?
- Realtime event `firmware:progress/complete` có payload đủ để cập nhật cục bộ mà không cần invalidate toàn bộ summary không?
- Tần suất firmware/device records có thể tăng đến mức nào để quyết định có cần pagination/virtualization ngay không?
