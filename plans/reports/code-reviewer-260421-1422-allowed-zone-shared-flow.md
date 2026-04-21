## Code Review Summary

### Scope
- Files:
  - `/E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/geofences/components/allowed-zone-setup-sheet.tsx`
  - `/E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/geofences/hooks/use-vehicle-allowed-zone.ts`
  - `/E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/map/components/map-selected-device-overlay.tsx`
  - `/E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/map/components/tracking-map.tsx`
  - `/E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/components/device-detail-modal/overview-tab.tsx`
  - `/E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/vehicles/components/vehicle-detail-content.tsx`
  - `/E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/geofences/page.tsx`
  - `/E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/api/geofences.ts`
- Focus: allowed-zone shared flow, map overlay integration, vehicle/device integrations, geofences page rewrite
- Scout findings:
  - quyền edit đang lệch giữa entry points
  - invalidation không phủ trang geofences mới
  - page rewrite tạo N+1 request + hard cap 200 xe

### Overall Assessment
Luồng shared component nhìn đúng hướng: form contract gọn, map preview tách rõ, reuse tốt giữa map / vehicle / device / page. Nhưng còn 3 regression đáng chú ý: quyền truy cập không nhất quán, geofences page bị stale sau mutate/realtime, và rewrite mới scale kém do fan-out request theo từng xe.

### Critical Issues
- Không có.

### High Priority
1. Quyền chỉnh allowed-zone bị mở rộng sai ở vehicle detail, device overview và map overlay.
   - `.../src/features/vehicles/components/vehicle-detail-content.tsx:235-259`
   - `.../src/features/devices/components/device-detail-modal/overview-tab.tsx:489-522`
   - `.../src/features/map/components/tracking-map.tsx:321-353`
   - Các chỗ này truyền `canEdit={Boolean(vehicleId)}` hoặc tương đương, nên mọi user có vehicleId đều thấy nút mở sheet và vào flow chỉnh sửa. Trong khi page rewrite đúng hơn, đã gate bằng `useRoleAccess().canEditDevice` tại `.../src/app/dashboard/geofences/page.tsx:115-117, 190-193, 251-252`.
   - Tác động: viewer/read-only user có thể vào màn hình chỉnh vùng, thử save/delete, gây regression quyền và UX lẫn lộn.
   - Gợi ý fix: lấy `const access = useRoleAccess()` ở `vehicle-detail-content.tsx`, `overview-tab.tsx`, và map container/overlay; chỉ cho mở action + enable sheet khi `access.canEditDevice`.

2. Geofences page không tự refresh sau save/delete hoặc realtime allowed-zone update.
   - Query trang dùng key riêng tại `.../src/app/dashboard/geofences/page.tsx:129-138`.
   - Hook shared chỉ invalidate `['vehicle-allowed-zone', vehicleId]`, `['vehicle-allowed-zone-preview', vehicleId]`, `['vehicles']`, `['device-positions']`, `['device-detail']` tại `.../src/features/geofences/hooks/use-vehicle-allowed-zone.ts:33-40`.
   - Không có invalidation cho `['allowed-zone-page-zones', ...]`, nên khi lưu/xóa trong `AllowedZoneSetupSheet`, bảng/stats ở page rewrite có thể giữ dữ liệu cũ đến khi reload tay.
   - Tác động: user vừa save xong nhưng card “Đã có vùng / Chưa thiết lập / Đang ngoài vùng” và row state không đổi ngay; realtime event cũng không kéo page theo.
   - Gợi ý fix: chuẩn hóa query key factory cho allowed-zone page, rồi invalidate key đó trong `useVehicleAllowedZone`; hoặc tốt hơn, để page dùng hook/query chung có subscription/invalidation sẵn.

### Medium Priority
1. Lightweight geofences page hiện tạo N+1 request và hard-cap 200 xe.
   - `.../src/app/dashboard/geofences/page.tsx:121-138`
   - Page gọi `vehicleServices.getList({ page: 1, limit: 200 })`, sau đó `Promise.all` gọi `getVehicleAllowedZone(vehicleId)` cho từng xe.
   - Tác động:
     - Fleet > 200 xe bị cắt im lặng, stats sai.
     - Với 200 xe sẽ phát sinh 201 request/page load, tăng latency và tải backend.
     - Mỗi refetch do filter change / invalidation sẽ fan-out lại toàn bộ.
   - Gợi ý fix: ưu tiên endpoint aggregate trả allowed-zone summary theo danh sách xe hoặc paginated list từ backend; tối thiểu chỉ fetch allowed-zone khi row visible/selected và hiển thị stats từ API tổng hợp.

2. Shared invalidation đang quá rộng so với intent của allowed-zone mutate.
   - `.../src/features/geofences/hooks/use-vehicle-allowed-zone.ts:33-40`
   - Mỗi save/delete invalidate cả `['vehicles']`, `['device-positions']`, `['device-detail']` nhưng vẫn bỏ sót key của geofences page rewrite.
   - Tác động: vừa refetch thiếu chỗ cần, vừa refetch thừa chỗ không cần; maintainability kém vì logic phân tán và khó đoán side effect.
   - Gợi ý fix: gom query keys allowed-zone vào key factory riêng (`vehicle zone`, `vehicle preview`, `allowed-zone page summaries`, `vehicle detail summary`) rồi invalidate chính xác theo dependency thực tế.

### Low Priority
1. `AllowedZoneSetupSheet` phụ thuộc ngầm vào caller để gate edit, nhưng contract chưa tự bảo vệ rõ.
   - `.../src/features/geofences/components/allowed-zone-setup-sheet.tsx:57-75, 293-305`
   - Hiện component chỉ disable control dựa trên `canEdit`, nhưng caller nào quên truyền đúng role sẽ mở sai quyền ngay.
   - Gợi ý fix: document rõ prop contract, hoặc truyền `canEdit` từ hook access ngay tại mỗi entry point và tránh mặc định `true` nếu component được tái dùng rộng.

### Edge Cases Found by Scout
- Cùng một flow shared nhưng quyền edit không đồng bộ giữa map / vehicle / device / page.
- Dữ liệu allowed-zone có nhiều consumer nhưng query invalidation chưa map đúng dependency graph.
- Rewrite “lightweight” giảm UI complexity nhưng đổi lại thành request fan-out, dễ lộ vấn đề ở fleet lớn.

### Positive Observations
- `allowed-zone-form.ts` tách schema/default/payload tốt, contract rõ và dễ test.
- `AllowedZoneSetupSheet` xử lý preview map pick khá sạch, không trộn logic API vào map layer.
- `MapSelectedDeviceOverlay` và `AllowedZoneStatusCard` cho trải nghiệm cấu hình nhanh, reuse ổn.
- Geofences page rewrite đơn giản hơn CRUD geofence tổng quát, đúng YAGNI cho use case “mỗi xe một vùng”.

### Recommended Actions
1. Đồng bộ gate quyền bằng `useRoleAccess().canEditDevice` cho mọi entry point allowed-zone.
2. Trích xuất query-key factory cho allowed-zone và invalidate đúng page rewrite key sau mutate/realtime.
3. Thay N+1 page load bằng aggregate endpoint hoặc lazy-per-row fetch + summary endpoint.
4. Sau khi sửa, verify lại 3 luồng: map overlay, vehicle detail, device overview, và geofences page stats sau save/delete.

### Metrics
- Type Coverage: chưa đo
- Test Coverage: chưa đo
- Linting Issues: chưa chạy

### Unresolved Questions
- Backend đã có hoặc sẵn sàng thêm endpoint aggregate cho allowed-zone summary theo fleet chưa?
- Viewer có được phép xem status allowed-zone nhưng không được mở sheet, hay cần ẩn cả card action hoàn toàn?
