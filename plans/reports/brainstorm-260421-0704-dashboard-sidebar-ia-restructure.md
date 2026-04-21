# Brainstorm Report — Dashboard sidebar IA restructure

## Problem statement
Sidebar FE hiện tại đang chia theo các nhóm `Điều hành / Vận hành / Đội xe / Cảnh báo / Nền tảng`, nhưng nhiều nhóm phản ánh cấu trúc nội bộ hơn là luồng công việc người dùng. Kết quả:
- chức năng gần nhau bị phân tán
- nhiều menu nhóm chỉ redirect sang trang con mặc định
- mental model khó hiểu với user hỗn hợp vai trò
- truy cập nhanh tới tác vụ chính chưa tối ưu

## Current-state findings
Nguồn chính:
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/config/dashboard-route-registry.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/config/nav-config.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/layout/AppSidebar.tsx`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/dashboard/components/quick-actions.tsx`

Quan sát chính:
1. Navigation đã tập trung qua route registry, nên thay đổi IA khả thi, blast radius kỹ thuật thấp.
2. Nhiều route cấp nhóm chỉ làm redirect:
   - `command` dùng dashboard tổng quan
   - `operations` -> `operations/map`
   - `fleet` -> `fleet/devices`
   - `attention` -> `attention/queue`
   - `platform` -> `platform/system-status`
3. Quick actions hiện đã phản ánh use case thật hơn menu chính: bản đồ, thiết bị, cảnh báo, exports, settings.
4. Alias cũ và route mới đang cùng tồn tại, dấu hiệu chuyển tiếp chưa clean.

## User constraints learned
- Persona chính: hỗn hợp vai trò
- Mức thay đổi chấp nhận: mạnh tay
- Tác vụ cần vào nhanh nhất:
  - bản đồ
  - thiết bị, kèm xe/tài xế/khách hàng liên quan
  - cảnh báo

## Evaluated approaches

### Option A — Giữ 5 nhóm cũ, chỉ tinh gọn
Pros:
- chi phí thấp
- ít đổi thói quen user cũ
- ít rủi ro regression

Cons:
- không xử lý gốc vấn đề taxonomy
- vẫn giữ nhãn mơ hồ
- vẫn còn phân mảnh mental model

Verdict: không đủ tốt nếu mục tiêu là cải thiện UX rõ rệt.

### Option B — Tái cấu trúc theo tác vụ, giữ sidebar phân cấp
Đề xuất taxonomy mới:
- Tổng quan
- Giám sát
- Tài sản
- Sự cố
- Hệ thống

Pros:
- khớp luồng công việc thật
- dễ hiểu cho vai trò hỗn hợp
- tận dụng được route registry hiện tại
- đủ mạnh để cải thiện UX nhưng chưa over-engineer

Cons:
- cần migrate nhãn, breadcrumbs, aliases, default landing
- user cũ cần thời gian làm quen ngắn

Verdict: recommended.

### Option C — Sidebar cực gọn + command palette first
Pros:
- rất nhanh cho power user
- giảm độ ồn thị giác
- hợp nếu search/palette mạnh

Cons:
- discoverability kém hơn
- không phù hợp nếu nhiều user vẫn dựa vào menu để học hệ thống
- yêu cầu đầu tư thêm vào search, recent, pin

Verdict: chỉ phù hợp như phase sau, không nên là bước đầu.

## Final recommendation
Chọn Option B với cấu trúc:

### 1) Tổng quan
- Dashboard

### 2) Giám sát
- Bản đồ
- Chuyến đi
- Vùng giám sát

### 3) Tài sản
- Thiết bị
- Phương tiện
- Tài xế
- Khách hàng

### 4) Sự cố
- Cảnh báo
- Bảo trì
- Vi phạm
- Thông báo

### 5) Hệ thống
- Trạng thái hệ thống
- Firmware
- Xuất dữ liệu
- Mô phỏng
- Quản lý người dùng
- Quản trị hệ thống
- Cài đặt cá nhân

## Why this is better
1. Nhóm menu theo câu hỏi user thật hỏi mỗi ngày:
   - theo dõi gì?
   - quản lý tài sản nào?
   - có sự cố gì cần xử lý?
   - có gì cần cấu hình?
2. Đưa top tasks vào 1 click path.
3. Loại bỏ khác biệt khó hiểu giữa `Điều hành` và `Vận hành`.
4. Giảm số lần click vào group rồi bị redirect tiếp.

## UX changes recommended
1. Map-first access
   - map là entry quan trọng nhất cho vận hành
   - cân nhắc cho map thành landing mặc định hoặc landing theo last-used

2. Asset cluster
   - gom device/vehicle/driver/customer vào cùng cụm `Tài sản`
   - tăng deep-link qua lại giữa các entity liên quan

3. Incident inbox
   - gom alert queue + maintenance + violation + notifications vào cụm `Sự cố`
   - tạo cảm giác 1 nơi để xử lý việc cần chú ý

4. Remove empty group clicks
   - group header nên expand/collapse
   - chỉ click được nếu trang group thực sự có giá trị
   - tránh redirect trung gian vô nghĩa

5. Promote shortcuts
   - shortcut cố định cho: bản đồ, cảnh báo active, thiết bị, tìm xe/thiết bị
   - nâng vai trò của quick actions và KBar

6. Add pinned/recent
   - hợp với persona hỗn hợp vai trò
   - giảm phụ thuộc vào trí nhớ menu

## Technical implementation implications
Files likely central:
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/config/dashboard-route-registry.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/config/nav-config.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/layout/AppSidebar.tsx`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/dashboard/components/quick-actions.tsx`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/kbar/index.tsx`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/hooks/use-breadcrumbs.tsx`

Secondary impact:
- metadata titles
- aliases/redirect compatibility
- default landing behavior
- breadcrumbs semantics

## Suggested phased plan direction
### Phase 1 — IA cleanup
- map toàn bộ route hiện tại sang task-based groups
- chốt taxonomy và naming
- xác định mục nào giữ alias chuyển tiếp

### Phase 2 — Sidebar refactor
- cập nhật route registry
- cập nhật nav config
- cập nhật sidebar rendering semantics

### Phase 3 — Shortcut layer
- refactor quick actions theo top task
- mở rộng KBar cho navigation + entity lookup
- thêm pinned/recent nếu scope cho phép

### Phase 4 — Landing optimization
- chọn default landing: map-first, dashboard-first, hoặc remember-last
- xác nhận theo role hoặc usage pattern

### Phase 5 — Validation
- test 3 luồng chính:
  - giám sát realtime
  - tra cứu tài sản
  - xử lý sự cố
- đo click depth + time-to-target

## Risks
- đổi taxonomy mạnh có thể làm user cũ bỡ ngỡ nếu không có chuyển tiếp rõ
- nếu chỉ đổi label mà không đổi grouping, UX gain thấp
- nếu route alias giữ quá lâu, IA mới có thể bị nhiễu bởi cấu trúc cũ

## Success metrics
- vào được `Bản đồ`, `Thiết bị`, `Cảnh báo` trong 1 click từ sidebar hoặc shortcut
- không còn group page chỉ redirect mà không tạo giá trị
- breadcrumb và menu label tự giải thích được việc user làm
- giảm thời gian tìm trang mục tiêu cho user mới

## Recommended next step
Tạo implementation plan chi tiết cho Option B, ưu tiên:
1. sidebar IA
2. shortcut layer
3. landing behavior
4. validation checklist

## Unresolved questions
- default landing nên là `Bản đồ`, `Tổng quan`, hay `remember last page`?
- phase đầu có làm `pinned/recent` luôn không, hay để phase sau?
- có cần role-based navigation khác nhau theo permission/persona hay chưa?