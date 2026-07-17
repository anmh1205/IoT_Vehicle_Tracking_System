# Brainstorm: Cách mạng UI/UX + IA toàn site (2026-04-16)

## 1. Mục tiêu
- Biến dashboard hiện tại thành một hệ thống vận hành có IA rõ ràng, không phải tập hợp các trang CRUD.
- Giảm số điểm điều hướng cấp 1, tăng điều hướng theo ngữ cảnh công việc.
- Phân bổ lại tính năng theo flow vận hành thật: nhìn -> ưu tiên -> xử lý -> điều tra -> quản trị.
- Đồng bộ visual language giữa login, app shell, page header, data surface và detail surface.

## 2. Cách audit
- Đọc route tree và nav config trong frontend.
- Đối chiếu app router, sidebar, breadcrumbs, page container, metadata và page state hiện tại.
- Soi từng nhóm page theo góc nhìn IA, workflow, thông tin hiển thị, độ tin cậy dữ liệu, khả năng deep-link và mobile density.
- Đối chiếu với mental model của một sản phẩm vận hành đội xe thực sự, không đối chiếu với một admin panel generic.

## 3. Inventory hiện tại
### 3.1 Route chính đang có
- Overview: `/dashboard`
- Map: `/dashboard/map`
- Fleet CRUD: `/dashboard/devices`, `/dashboard/vehicles`, `/dashboard/customers`, `/dashboard/drivers`
- Monitoring: `/dashboard/alerts`, `/dashboard/notifications`, `/dashboard/violations`, `/dashboard/trips`, `/dashboard/geofences`
- Technical: `/dashboard/maintenance`, `/dashboard/firmware`, `/dashboard/system-status`, `/dashboard/simulator`, `/dashboard/exports`
- Analysis: `/dashboard/statistics`, `/dashboard/fuel`
- Admin: `/dashboard/settings`, `/dashboard/users`, `/dashboard/system-admin`

### 3.2 Alias route đang làm mờ IA
- `/dashboard/admin/system` -> redirect `/dashboard/system-admin`
- `/dashboard/admin/system-status` -> redirect `/dashboard/system-status`
- `/dashboard/admin/users` -> redirect `/dashboard/users`

## 4. Phát hiện lớn
### 4.1 App shell hiện tại bị tách đôi bản sắc
- Login có visual direction rõ, đậm chất control room.
- Dashboard shell dùng palette trung tính và metadata chung, tạo cảm giác như một sản phẩm khác.
- Kết quả: login và app không có cùng DNA.

### 4.2 IA đang chia theo module kỹ thuật, không chia theo công việc
- Sidebar chia `Hệ thống / Quản lý / Giám sát / Kỹ thuật / Phân tích / Quản trị`.
- Người vận hành không nghĩ theo module như vậy. Họ nghĩ theo: xe nào đang có vấn đề, ca trực này phải xử lý gì, vào đâu để điều tra tiếp.

### 4.3 Quá nhiều list page cùng một công thức
- Stats bar + filter + table + modal lặp lại ở devices, vehicles, customers, drivers, alerts, trips, users, firmware.
- Nhìn như có nhiều route cấp 1, nhưng thực chất chỉ là nhiều biến thể của cùng một trang bảng dữ liệu.

### 4.4 Detail model không nhất quán
- Device vừa có modal rất lớn vừa có full page.
- Trip dùng full page hợp lý hơn vì có replay.
- Vehicle, customer, maintenance, geofence đang rơi vào trạng thái nửa profile, nửa workspace.
- Hệ thống thiếu quy tắc chung: khi nào modal, khi nào drawer, khi nào full page.

### 4.5 Nhiều page monolithic, khó tạo bước nhảy UX nếu không tách surface
- `customers/page.tsx`, `maintenance/page.tsx`, `firmware/page.tsx`, `users/page.tsx` đều rất lớn.
- Đây là dấu hiệu page đang ôm cả state, layout, domain logic và interaction model vào một chỗ.

### 4.6 Browser/page metadata chưa làm đúng vai trò điều hướng
- Toàn bộ dashboard đang dùng title chung từ layout.
- Khi mở nhiều tab, người dùng không phân biệt được alert, maintenance, trip hay user.

### 4.7 Platform tools đang chen vào luồng operator
- `Firmware`, `System status`, `Simulator`, `Exports`, `Users`, `System admin`, `Settings` đều có giá trị.
- Nhưng chúng không nên ngồi ngang hàng với các surface xử lý công việc trực tiếp của operator.

### 4.8 Map là màn hình có hướng đi đúng nhất
- `Map` gần nhất với một workspace vận hành thật: full-bleed, có list panel, có realtime, có context.
- Đây nên là chuẩn cho các surface khác: workspace trước, CRUD sau.

### 4.9 Attention domain đang bị cắt nhỏ
- `Alerts`, `Notifications`, `Violations`, `Maintenance` đều là các hàng đợi cần ưu tiên và xử lý.
- Tách thành 4 route cấp 1 riêng làm operator phải nhảy qua lại và mất ngữ cảnh.

### 4.10 Fleet domain đang bị chia theo bảng dữ liệu thay vì theo đồ thị đối tượng
- `Devices`, `Vehicles`, `Drivers`, `Customers` thực chất là các mặt cắt của cùng một fleet graph.
- Tách thành 4 route cấp 1 làm tăng chi phí điều hướng và giảm khả năng cross-reference.

## 5. Kết luận thẳng
- Nếu chỉ tiếp tục polish từng page riêng lẻ, hệ thống sẽ đẹp hơn nhưng không tạo được cảm giác “revolution”.
- Muốn đổi đời thật sự thì phải đổi IA, shell, metadata, detail model và role surface trước.
- Không nên bắt đầu bằng việc đổi màu, đổi icon hay thêm card.

## 6. North star mới
Sản phẩm phải được nhìn như một **Mission Control for Fleet Operations** với 5 surface lớn.

### 6.1 Surface 1: Command Center
Mục tiêu:
- Cho ca trực biết ngay tình hình hiện tại trong 10 giây.

Nội dung:
- Critical queue
- Fleet health
- Live fleet snapshot
- Shift handoff
- Attention shortcuts

### 6.2 Surface 2: Operations
Mục tiêu:
- Điều độ, theo dõi và điều tra luồng vận hành sống.

Nội dung:
- Live map
- Trips
- Geofences
- Realtime activity

### 6.3 Surface 3: Fleet Workspace
Mục tiêu:
- Quản lý toàn bộ asset graph trong một khung nhìn.

Nội dung:
- Vehicles
- Devices
- Drivers
- Customers

### 6.4 Surface 4: Attention Center
Mục tiêu:
- Gom mọi thứ cần xử lý vào một hàng đợi có ưu tiên.

Nội dung:
- Alerts
- Maintenance
- Violations
- Notifications

### 6.5 Surface 5: Platform Center
Mục tiêu:
- Chứa công cụ kỹ thuật và quản trị không phục vụ trực tiếp cho operator.

Nội dung:
- Firmware
- System status
- Simulator
- Exports
- Users
- System admin
- Settings

## 7. IA đề xuất
### 7.1 Primary nav mới
1. Command
2. Operations
3. Fleet
4. Attention
5. Platform

### 7.2 Secondary nav theo surface
- Command: Overview, Shift handoff, Live incidents
- Operations: Live map, Trips, Geofences
- Fleet: Vehicles, Devices, Drivers, Customers
- Attention: Queue, Maintenance, Violations, Notifications
- Platform: Firmware, System status, Exports, Simulator, Users, System admin, My settings

## 8. Mapping current -> new
- `/dashboard` -> `Command / Overview`
- `/dashboard/map` -> `Operations / Live map`
- `/dashboard/trips` -> `Operations / Trips`
- `/dashboard/geofences` -> `Operations / Geofences`
- `/dashboard/devices` -> `Fleet / Devices`
- `/dashboard/vehicles` -> `Fleet / Vehicles`
- `/dashboard/drivers` -> `Fleet / Drivers`
- `/dashboard/customers` -> `Fleet / Customers`
- `/dashboard/alerts` -> `Attention / Queue`
- `/dashboard/maintenance` -> `Attention / Maintenance`
- `/dashboard/violations` -> `Attention / Violations`
- `/dashboard/notifications` -> `Attention / Notifications`
- `/dashboard/statistics` -> hidden `Insights` compatibility route
- `/dashboard/fuel` -> hidden `Insights` compatibility route
- `/dashboard/firmware` -> `Platform / Firmware`
- `/dashboard/system-status` -> `Platform / System status`
- `/dashboard/simulator` -> `Platform / Simulator`
- `/dashboard/exports` -> `Platform / Exports`
- `/dashboard/users` -> `Platform / Users`
- `/dashboard/system-admin` -> `Platform / System admin`
- `/dashboard/settings` -> `Platform / My settings`
- `/dashboard/admin/*` -> remove alias

## 9. Quy tắc phân bổ feature
### 9.1 Modal
Chỉ dùng cho:
- Create nhanh
- Edit nhỏ
- Confirm action
- Secondary peek
- Ngoại lệ có chủ đích: `DeviceDetailModal` tiếp tục là workspace tổng hợp cho thiết bị và được phép giữ nhiều tab sâu nếu workflow thực tế cần

Không dùng cho:
- Điều tra sự cố phức tạp
- Replay
- Multi-section detail
- Long-lived operator workflow

### 9.2 Drawer / side panel
Chỉ dùng cho:
- Quick inspection khi đang ở trong list, map hoặc queue
- Entity summary và action nhanh

### 9.3 Full page
Chỉ dùng cho:
- Deep investigation
- Replay / timeline
- Complex multi-step form
- Heavy admin workspace

## 10. Visual direction mới
### 10.1 Tổng thể
- Chọn một hướng duy nhất: control-room light mode, không generic admin.
- Không quay về dark-only.
- Light là mặc định để đọc dữ liệu lâu; dark chỉ là theme phụ.

### 10.2 Typography
- Heading: `Archivo`
- Body/UI: `IBM Plex Sans`
- Telemetry/metric monospace: `IBM Plex Mono` hoặc `Fira Code`

### 10.3 Color system
- Nền sáng, sạch, technical: slate + blue signal.
- Accent action: amber hoặc orange.
- Severity system phải nhất quán toàn app, không đổi theo page.

### 10.4 Layout system
- Sidebar cấp 1 gọn hơn.
- Có contextual secondary nav trong từng surface.
- Header không chỉ là breadcrumb; nó phải là control strip.

## 11. Page-level transformation
### 11.1 Command Center
Trang mới cần có:
- Fleet status ribbon
- Critical attention queue
- Live map snapshot mini
- Active trips
- Maintenance due summary
- System health strip
- Recent operator actions

### 11.2 Fleet Workspace
Cần đổi từ “4 CRUD page” thành “một workspace có 4 lens”.

### 11.3 Attention Center
Cần đổi từ “nhiều bảng riêng” thành “triage system”.

### 11.4 Platform Center
Cần đổi thành admin workspace có kỷ luật, role-gated và tách khỏi operator flow.

## 12. Design debt phải xử lý sớm
- Dynamic metadata theo page và theo entity.
- Xóa alias route `admin/*`.
- Chuẩn hóa pattern: stats strip, filter bar, queue/table, detail drawer, empty state, error state.
- Tách page monolithic thành shell + surface components.
- Chuyển logic localize OBD trùng lặp về shared presenter/domain formatter.

## 13. Roadmap làm thật
### Phase 1: Shell + IA foundation
- Redesign sidebar primary nav
- Tạo contextual secondary nav
- Dynamic browser titles
- Remove alias route
- Chuẩn hóa page header/control strip

### Phase 2: Command Center
- Thay dashboard hiện tại bằng command center queue-first
- Gom summary từ alerts, maintenance, trips, health

### Phase 3: Fleet Workspace
- Tạo route cha Fleet
- Đưa Devices / Vehicles / Drivers / Customers vào cùng một khung IA
- Chuẩn hóa detail drawer + canonical detail page

### Phase 4: Attention Center
- Gộp Alerts / Maintenance / Violations / Notifications
- Bulk action đồng nhất
- Assignment, priority, source, entity view

### Phase 5: Platform Center
- Gom Firmware / System status / Simulator / Exports / Users / System admin / Settings
- Role-gated nav và shell

### Phase 6: Polish + motion + density
- Typography system
- Token colors mới
- Saved views
- Keyboard flow
- Mobile operator adaptation

## 14. Thứ tự ưu tiên nếu muốn tạo cảm giác “cách mạng” nhanh
1. Đổi shell + IA trước
2. Làm Command Center mới
3. Gộp Attention domain
4. Gộp Fleet domain
5. Đẩy Platform ra sau

## 15. File cần động vào khi implement
- `src/config/nav-config.ts`
- `src/components/layout/AppSidebar.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/theme.css`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/alerts/page.tsx`
- `src/app/dashboard/maintenance/page.tsx`
- `src/app/dashboard/notifications/page.tsx`
- `src/app/dashboard/violations/page.tsx`
- `src/app/dashboard/devices/page.tsx`
- `src/app/dashboard/vehicles/page.tsx`
- `src/app/dashboard/drivers/page.tsx`
- `src/app/dashboard/customers/page.tsx`
- `src/app/dashboard/system-admin/page.tsx`
- `src/app/dashboard/system-status/page.tsx`

## 16. Rủi ro
- Rủi ro lớn nhất không phải code, mà là mất muscle memory nếu đổi IA quá nhanh.
- Cần migration mềm: redirect, breadcrumb rõ ràng, label quen thuộc, release theo phase.
- Không nên đổi domain term kỹ thuật đang dùng tốt; chỉ đổi surface và mental model.

## 17. Success metrics
- Giảm số click để từ alert mở đúng entity và xử lý.
- Giảm số cấp menu mà operator phải học.
- Tăng khả năng phân biệt tab/page khi mở nhiều màn hình.
- Giảm thời gian định vị “tôi đang ở đâu, cần vào đâu tiếp theo”.
- Tăng reuse surface pattern, giảm page-specific UI snowflake.

## 18. Câu hỏi còn mở
- Có muốn giữ `Statistics` và `Fuel` thành surface riêng dài hạn hay đẩy vào `Command / Insights`?
- Mức độ tách shell operator và shell admin muốn đến đâu?

## 19. Bằng chứng định lượng bổ sung
- Dashboard hiện có 30 route `page.tsx`.
- 14/30 page vượt 200 dòng.
- 15/30 page có `useState` ngay ở page shell.
- 12/30 page dùng `DataTable`.
- 11/30 page dùng `Dialog` hoặc `Modal` ngay ở page level.
- 4/30 page có `Tabs` ở page level.
- 0/30 page có page-specific metadata.
- 0/30 page dùng URL state thực sự cho filter/tab/pagination.

## 20. Taxonomy để audit cho đúng bệnh
- IA mismatch
- Workflow gap
- Missing information
- Low-value information
- Trust/reliability problem
- Scale debt
- URL/deep-link debt
- Consistency debt

## 21. Vấn đề hệ thống lớn chưa được viết rõ trong report đầu
### 21.1 URL state gần như vắng bóng
- Filter, tab, pagination, selected lens, dialog context chủ yếu là `useState`.
- Refresh, back/forward, copy URL đều làm mất ngữ cảnh.

### 21.2 Browser metadata không làm đúng vai trò điều hướng
- Layout dashboard đang dùng title chung.
- Khi mở nhiều tab, người dùng không biết tab nào là trip, maintenance hay alert.

### 21.3 Rất nhiều stat card là “count trên trang”, không phải system truth
- `vehicles`, `customers`, `drivers`, `trips`, `users`, `geofences`, `violations`, `alerts` đều có card đếm từ `rows` hoặc page slice hiện tại.
- Về mặt cảm nhận, người dùng dễ hiểu nhầm đó là KPI toàn hệ thống.

### 21.4 Có nơi đang filter client-side sau khi đã page server-side
- `alerts/page.tsx` lấy page từ server trước, sau đó mới cắt `source = all / obd / system` ở client.
- Điều này làm `pagination.total` và list hiển thị không còn cùng một nghĩa.

### 21.5 Hard limit 100 và preview slice là debt scale nguy hiểm
- `vehicles`, `customers`, `geofences`, `firmware`, `simulator` đều có chỗ dùng `limit: 100`.
- Với fleet lớn hơn 100, UI có thể sai im lặng.

### 21.6 Hệ thống bị split giữa quick modal và canonical page mà không có luật
- Device là ví dụ rõ nhất: modal rất lớn và route detail cùng tồn tại.
- Quy tắc mới cần chốt rõ: modal là surface thao tác tổng hợp trước, còn canonical page là deep-link dài hơi, chia sẻ URL và điều tra mở rộng.

### 21.7 Entity graph còn yếu
- Nhiều detail page phải tự nhắc rằng dữ liệu đang thiếu liên kết.
- Đây là dấu hiệu xe - thiết bị - khách hàng - tài xế - alert - maintenance - trip chưa thành một đồ thị vận hành đủ mạnh.

### 21.8 Presentation logic domain đang bị duplicate
- Localize OBD alert title/message đang lặp lại ở `alerts` và `maintenance`.
- Đây là consistency debt và sẽ càng rối khi product lớn lên.

### 21.9 Quá nhiều page là “table + modal + form” nhưng không có workspace second level
- Bề ngoài nhìn như nhiều route.
- Bên trong là cùng một interaction formula.

## 22. Thông tin đang thiếu ở những nơi user cần ra quyết định
- Owner / assignee
- Next action
- Source evidence
- Freshness / confidence
- Entity relationships
- Operational timeline
- Role context

## 23. Thông tin đang hiển thị nhiều nhưng giá trị thấp
- Count card tính theo page slice nhưng đặt ở đầu trang như KPI.
- Badge type quá rộng trong notifications.
- Config raw key-value dump ở device detail.
- Preview top 3 / top 6 / top 8 ở quá nhiều nơi mà không có ngữ cảnh.
- Timestamp lặp lại nhưng không chỉ ra hành động tiếp theo.

## 24. Tính năng quan trọng đang thiếu
- Attention center đúng nghĩa: queue hợp nhất có assignment, owner, SLA, bulk action thật sự.
- Deep-linking cho filter/tab/entity.
- Saved views theo ca trực, nhóm xe, customer, sự cố.
- Cross-entity drill-down: alert -> device -> trip -> geofence -> maintenance case.
- Data quality indicator.
- Manual maintenance case creation + lifecycle rõ ràng.
- Trip investigation overlay.
- Firmware rollout discipline.
- Notification action routing.
- User security operations.
- Simulator presets.
- Export templates / schedules.
- System incident bridge.

## 25. Audit theo route để không bỏ sót
### 25.1 Command
`/dashboard`
- Vẫn là chart-soup overview, chưa phải command center.
- Thiếu queue ưu tiên, shift handoff, action center.

### 25.2 Operations
`/dashboard/map`
- Là màn hình có hướng đi đúng nhất.
- Điểm yếu lớn: selected device card chủ yếu hiển thị thông tin, chưa có action bridge mạnh.

`/dashboard/trips`
- List page hữu ích nhưng vẫn CRUD-first.
- Stats đang diễn ra / hoàn tất / đã hủy chỉ đếm trên trang hiện tại.

`/dashboard/trips/[id]`
- Replay là điểm mạnh thật sự.
- Thiếu overlay cảnh báo, geofence event, violation, fuel, maintenance relevance.

`/dashboard/geofences`
- Vẫn là list-first.
- Stats active/inactive/totalVehiclesBound có tính page-slice.
- Manage vehicles đang dựa vào `limit: 100`.

`/dashboard/geofences/[id]`
- Detail page khá hơn list page.
- Vehicle binder vẫn chỉ thấy tối đa 100 xe.
- Policy violations có nguy cơ mất item vì lấy rồi lọc ở client.

### 25.3 Fleet
`/dashboard/devices`
- Mobile đang có duplicate semantics giữa `MobileTabSelector` và `TabsList` table/cards.
- Filter/view/page chưa URL-backed.
- Detail modal đang bị dùng như full workspace.

`/dashboard/devices/[id]`
- Đã có canonical page nhưng vẫn khá thụ động.
- Thiếu active alerts, related trips, maintenance history, command bridge.

`/dashboard/vehicles`
- List CRUD-first.
- Device assign dialog chỉ thấy tối đa 100 device.
- Chưa có lens theo no-device, maintenance overdue, insurance expiring, active alert.

`/dashboard/vehicles/[id]`
- Detail page dễ đọc nhưng vẫn giống profile page hơn là operational workspace.

`/dashboard/customers`
- Page rất lớn và monolithic.
- `withVehicle` và preview plate dựa trên vehicle list `limit: 100`, nên có thể sai.

`/dashboard/customers/[id]`
- Có missing signal tốt.
- Thiếu tổng quan fleet của customer, linked vehicles/devices, recent alerts, trip volume, SLA.

`/dashboard/drivers`
- Stats active/inactive/license mang tính page-slice.
- Chưa có driver behavior, assigned vehicle, recent trip, license expiry queue, violations history.

### 25.4 Attention
`/dashboard/alerts`
- Source filter OBD/system bị cắt sau server paging.
- Stats total/pending/ack/critical lấy trên `rows` đang hiển thị.
- Bulk action đang `selected.forEach(mutate)`, chưa phải batch workflow nghiêm túc.
- Chưa có owner, assignee, SLA, linked entity graph.

`/dashboard/notifications`
- Đây là queue “đọc/ẩn”, chưa phải queue “xử lý”.
- Item thiếu severity, owner, entity target, route target, source system.

`/dashboard/violations`
- Stats speeding/harsh/idle đếm trên page rows.
- Workflow hiện tại gần như chỉ có `acknowledge`.

`/dashboard/maintenance`
- Là một trong những page tham vọng nhất: list + calendar + forecast + OBD recommendation.
- Nhưng vẫn là page monolithic.
- Chưa có create maintenance case rõ ràng trên trang.
- `dueSoon` và OBD recommendations chỉ là top-3 preview.

`/dashboard/maintenance/[id]`
- Detail page đi đúng hướng vì tự nêu missing signals.
- Vẫn thiếu owner, linked alert/OBD evidence, phụ tùng, hóa đơn/chứng từ, file đính kèm, approval, notes timeline.

### 25.5 Insights / Analytics
`/dashboard/statistics`
- Rủi ro lớn nhất là trust.
- Nếu endpoint analytics không có dữ liệu có nghĩa, hook sẽ nội suy từ snapshot device.
- UI có thể trông hợp lý nhưng không đáng tin.

`/dashboard/fuel`
- Giao diện sạch nhưng quá mỏng cho một top-level page.
- Thiếu anomalous consumption, cost baseline, per-trip, per-driver, route/load context.

### 25.6 Platform
`/dashboard/firmware`
- Tool mạnh nhưng rất dense và phẳng.
- Device selector chỉ 100 device.
- Deployment tracker chỉ show 20 item gần đây.
- Thiếu cohort/ring/canary, rollback, retry batch, compatibility/preflight, failure-rate summary.

`/dashboard/exports`
- Hữu ích nhưng giá trị IA không xứng đáng top-level operator nav.
- Chưa có saved template, recurring export, destination, ownership, audit trail.

`/dashboard/system-status`
- Điểm tốt: không giả dữ liệu, sẵn sàng hiện notice khi telemetry hệ thống không có.
- Điểm thiếu: không có history, dependency graph, per-service drill-down, jump-to-logs.

`/dashboard/simulator`
- Hữu dụng cho test nhưng UI cao và tuyến tính.
- Chưa có scenario presets, route-aware, geofence-aware, expected-vs-observed compare.

`/dashboard/settings`
- Thực chất là profile/preferences page.
- Tabs local, không share được.
- Route name dễ gây hiểu nhầm thành system config.

`/dashboard/users`
- Stats admins/suspended/inactive chủ yếu là trên page rows.
- Temporary password hiện thẳng trên page là một UX/security concern.
- Chưa có invite flow, last login, session revoke, MFA/passkey status, audit trail.

`/dashboard/system-admin`
- Đang là 3 tab: logs/query/metrics.
- Dùng như tool chest, chưa phải admin workspace có trí nhớ.
- Tabs local, không deep-link.

`/dashboard/admin/*`
- Chỉ là redirect alias.
- Giá trị IA bằng 0.

## 26. Net-net
- Vấn đề lớn nhất của trang không nằm ở màu sắc hay border radius.
- Vấn đề lớn nhất là: IA chưa theo công việc, queue chưa theo xử lý, dữ liệu chưa đủ đáng tin và relation graph chưa đủ mạnh để điều tra.
- Nếu chỉ làm đẹp từng page, kết quả vẫn là một app CRUD lớn hơn, đẹp hơn, nhưng không thành Mission Control.

## 27. Backlog ưu tiên P0 / P1 / P2
Nguyên tắc xếp độ:
- `P0`: nếu không làm, mọi redesign UI đều có nguy cơ nói dối user hoặc vỡ workflow.
- `P1`: tạo bước nhảy về mental model, IA và workflow.
- `P2`: nâng độ chín sản phẩm và năng lực scale vận hành.

## 28. P0 - Foundation bắt buộc làm trước
### P0-01. Dynamic metadata + browser context
- Thêm metadata theo route và theo entity detail.
- Done when: mở nhiều tab vẫn phân biệt được đúng page.

### P0-02. URL state cho filter / tab / pagination / lens
- Done when: refresh, back/forward, share URL không làm mất ngữ cảnh.

### P0-03. Định nghĩa lại “system KPI” và “page summary”
- Done when: user không còn hiểu nhầm count trên page là toàn hệ thống.

### P0-04. Data trust guardrails cho analytics
- Done when: chart fallback luôn có trạng thái `live / partial / fallback / unavailable` rõ ràng.

### P0-05. Loại bỏ partial truth do hard limit 100 và client filter sau paging
- Done when: selector và summary quan trọng không còn nói sự thật một phần.

### P0-06. Surface contract: modal / drawer / full-page
- Done when: mỗi entity có canonical detail surface rõ ràng.

### P0-07. Shared presentation layer cho diagnostics / maintenance text
- Done when: cùng một event nguồn chỉ có một cách hiển thị thống nhất.

### P0-08. Deep-link contract giữa entity graph
- Done when: từ queue item quan trọng luôn có đường đi rõ ràng đến entity gốc và workflow tiếp theo.

## 29. P1 - Redesign theo IA và workflow
### P1-01. Đổi primary IA sang 5 surface
### P1-02. Command Center thay cho dashboard hiện tại
### P1-03. Map thành operational workspace thật sự
### P1-04. Fleet Workspace hợp nhất
### P1-05. Attention Center hợp nhất
### P1-06. Maintenance workflow đầy đủ
### P1-07. Notification surface hạ cấp đúng mức
### P1-08. Platform tách khỏi operator flow

## 30. P2 - Độ chín sản phẩm và năng lực scale
### P2-01. Insights maturity
### P2-02. Saved views + shift handoff
### P2-03. Firmware rollout discipline
### P2-04. System incident workspace
### P2-05. User security ops
### P2-06. Simulator lab
### P2-07. Export ops

## 31. Thứ tự triển khai để tránh sơn lại CRUD
1. `P0-01` đến `P0-08`
2. `P1-01` IA + shell
3. `P1-02` Command Center
4. `P1-05` Attention Center
5. `P1-04` Fleet Workspace
6. `P1-03` Operations workspace
7. `P1-06` Maintenance lifecycle
8. `P1-08` Platform regroup
9. Các mục `P2`

## 32. Những thứ chưa nên làm sớm
- Chưa nên đổi palette, animation, gradient, iconography toàn site trước khi xong `P0-03`, `P0-04`, `P0-05`.
- Chưa nên làm dashboard mới trước khi chốt `P1-01` IA.
- Chưa nên mở rộng `fuel/statistics` trước khi giải quyết trust và data quality.
- Tiếp tục polish `DeviceDetailModal` như workspace tổng hợp, nhưng phải giữ rõ đường mở canonical page để tránh mơ hồ trách nhiệm giữa modal và full page.

## 33. Definition of done cấp chương trình
- Operator vào app có thể định vị: tôi đang ở đâu, cần xử lý gì, vào đâu tiếp theo.
- KPI cấp hệ thống và count trên page không còn bị nhầm lẫn.
- Refresh/back/share URL không làm mất ngữ cảnh.
- Không còn selector/summary quan trọng nào dùng partial dataset mà không cảnh báo.
- Mọi queue item quan trọng đều có owner, next action, route target, entity target.
- Platform tool không còn làm ô nhiễm operator navigation.

## 34. Câu hỏi mở bổ sung
- Mục tiêu ngắn hạn có muốn ship `Attention Center` trước `Fleet Workspace` không?
- Có chấp nhận tách `Settings` thành `My Settings` để tránh nhầm với system config không?
- Có muốn `Map` là trang mặc định sau login thay cho overview chart page không?

## 35. Execution spec liên kết
- Route map + component map + migration plan chi tiết nằm ở:
- `plans/reports/planner-260416-sitewide-uiux-ia-route-component-migration-spec.md`
