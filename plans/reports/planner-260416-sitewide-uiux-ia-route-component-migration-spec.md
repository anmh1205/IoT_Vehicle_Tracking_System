# Planner Spec: Route map + component map + migration plan UI/UX IA toàn site (2026-04-16)

## 1. Mục tiêu
- Biến audit IA thành spec có thể build thật sự.
- Định nghĩa route map canonical, component map, migration plan và acceptance criteria.
- Giữ tối đa logic domain hiện có; đổi shell, route, navigation, state sync và workflow trước.

## 2. Phạm vi
- Frontend dashboard Next.js trong `iot-vehicle-tracking-system-cloud/Tracking_Frontend`.
- Liên quan trực tiếp:
- `src/app/dashboard/*`
- `src/config/nav-config.ts`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/PageContainer.tsx`
- `src/hooks/use-breadcrumbs.tsx`
- Các feature folders: `dashboard`, `map`, `devices`, `vehicles`, `drivers`, `customers`, `alerts`, `maintenance`, `notifications`, `violations`, `trips`, `geofences`, `firmware`, `exports`, `system-status`, `system-admin`, `settings`, `simulator`, `statistics`, `fuel-analytics`

## 3. Non-goals
- Chưa đổi domain schema backend.
- Chưa làm visual polish cuối cùng.
- Chưa mở rộng analytics/fuel trước khi xong trust guardrails.
- Chưa viết lại toàn bộ feature page từ đầu.

## 4. Nguyên tắc thực thi
- Không big bang rewrite.
- Tạo route canonical mới bằng wrapper trước, redirect route cũ sau.
- Một route registry là source of truth cho nav, breadcrumb, metadata, alias và role gating.
- Modal/drawer/full-page phải có contract chung.
- Metric page-slice không được giả làm system KPI.
- Mọi page/workspace quan trọng phải URL-sync.

## 5. Strategy tổng
- Bước 1: tạo navigation + metadata + breadcrumb foundation.
- Bước 2: tạo canonical route tree mới nhưng vẫn reuse page component hiện có.
- Bước 3: đổi primary nav sang 5 surface.
- Bước 4: build Command, Attention, Fleet, Operations shell theo workflow mới.
- Bước 5: đưa Platform ra khỏi operator flow.

## 6. Route strategy
### 6.1 Quy tắc
- Route canonical mới phải thể hiện surface.
- Route cũ được giữ tạm để redirect trong giai đoạn migration.
- Detail route phải nằm dưới surface của nó, không nằm lộn xộn ở root dashboard.
- Analytics tạm giữ route cũ trong giai đoạn trust-fix, chưa force vào IA mới ngay.

### 6.2 Route registry cần có
Tạo file mới:
- `src/config/dashboard-route-registry.ts`

Shape đề xuất:
```ts
export type DashboardSurface = 'command' | 'operations' | 'fleet' | 'attention' | 'platform';

export type DashboardRouteDef = {
  id: string;
  title: string;
  surface: DashboardSurface;
  path: string;
  aliases?: string[];
  parentId?: string;
  navLevel?: 'primary' | 'secondary' | 'hidden';
  roleGate?: string[];
  supportsUrlState?: boolean;
  legacy?: boolean;
};
```

Registry này phải feed cho:
- `AppSidebar`
- `use-breadcrumbs`
- metadata helper
- redirect map
- secondary surface nav

## 7. Canonical route map near-term
### 7.1 Command
- `/dashboard/command`: Command Center / overview mới. Legacy alias: `/dashboard`
- `/dashboard/command/handoff`: shift handoff
- `/dashboard/command/incidents`: live incidents

### 7.2 Operations
- `/dashboard/operations/map`: live map workspace. Legacy alias: `/dashboard/map`
- `/dashboard/operations/trips`: trips list/workspace. Legacy alias: `/dashboard/trips`
- `/dashboard/operations/trips/[id]`: trip investigation. Legacy alias: `/dashboard/trips/[id]`
- `/dashboard/operations/geofences`: geofence workspace. Legacy alias: `/dashboard/geofences`
- `/dashboard/operations/geofences/[id]`: geofence detail. Legacy alias: `/dashboard/geofences/[id]`

### 7.3 Fleet
- `/dashboard/fleet`: redirect sang lens mặc định
- `/dashboard/fleet/devices`: devices lens. Legacy alias: `/dashboard/devices`
- `/dashboard/fleet/devices/[id]`: device canonical page. Legacy alias: `/dashboard/devices/[id]`
- `/dashboard/fleet/vehicles`: vehicles lens. Legacy alias: `/dashboard/vehicles`
- `/dashboard/fleet/vehicles/[id]`: vehicle canonical page. Legacy alias: `/dashboard/vehicles/[id]`
- `/dashboard/fleet/drivers`: drivers lens. Legacy alias: `/dashboard/drivers`
- `/dashboard/fleet/customers`: customers lens. Legacy alias: `/dashboard/customers`
- `/dashboard/fleet/customers/[id]`: customer canonical page. Legacy alias: `/dashboard/customers/[id]`

### 7.4 Attention
- `/dashboard/attention`: redirect sang queue mặc định
- `/dashboard/attention/queue`: queue hợp nhất. Near-term có thể wrapper từ logic alerts cũ
- `/dashboard/attention/maintenance`: maintenance lens. Legacy alias: `/dashboard/maintenance`
- `/dashboard/attention/maintenance/[id]`: maintenance case page. Legacy alias: `/dashboard/maintenance/[id]`
- `/dashboard/attention/violations`: violations lens. Legacy alias: `/dashboard/violations`
- `/dashboard/attention/notifications`: notifications lens. Legacy alias: `/dashboard/notifications`

### 7.5 Platform
- `/dashboard/platform`: redirect sang landing role-gated
- `/dashboard/platform/system-status`: service health. Legacy alias: `/dashboard/system-status`, `/dashboard/admin/system-status`
- `/dashboard/platform/firmware`: OTA workspace. Legacy alias: `/dashboard/firmware`
- `/dashboard/platform/exports`: exports utility. Legacy alias: `/dashboard/exports`
- `/dashboard/platform/simulator`: test lab. Legacy alias: `/dashboard/simulator`
- `/dashboard/platform/users`: identity ops. Legacy alias: `/dashboard/users`, `/dashboard/admin/users`
- `/dashboard/platform/system-admin`: logs/query/metrics. Legacy alias: `/dashboard/system-admin`, `/dashboard/admin/system`
- `/dashboard/platform/my-settings`: user settings. Legacy alias: `/dashboard/settings`

### 7.6 Insights giữ tạm ở chế độ compatibility
- `/dashboard/statistics`: hidden compatibility route
- `/dashboard/fuel`: hidden compatibility route

Long-term target nếu analytics đạt trust:
- `/dashboard/command/insights/statistics`
- `/dashboard/command/insights/fuel`

## 8. Redirect policy
- Route cũ vẫn tồn tại trong 1-2 release đầu.
- Route cũ chỉ làm redirect sang canonical route mới.
- Breadcrumb, metadata, active nav và page title phải dựa theo canonical route, không dựa theo alias.
- Các alias `admin/*` phải bị xóa sớm nhất sau khi Platform route mới ổn định.

## 9. Physical route scaffolding
### 9.1 App router additions
Cần tạo folder mới:
- `src/app/dashboard/command`
- `src/app/dashboard/command/handoff`
- `src/app/dashboard/command/incidents`
- `src/app/dashboard/operations`
- `src/app/dashboard/operations/map`
- `src/app/dashboard/operations/trips`
- `src/app/dashboard/operations/trips/[id]`
- `src/app/dashboard/operations/geofences`
- `src/app/dashboard/operations/geofences/[id]`
- `src/app/dashboard/fleet`
- `src/app/dashboard/fleet/devices`
- `src/app/dashboard/fleet/devices/[id]`
- `src/app/dashboard/fleet/vehicles`
- `src/app/dashboard/fleet/vehicles/[id]`
- `src/app/dashboard/fleet/drivers`
- `src/app/dashboard/fleet/customers`
- `src/app/dashboard/fleet/customers/[id]`
- `src/app/dashboard/attention`
- `src/app/dashboard/attention/queue`
- `src/app/dashboard/attention/maintenance`
- `src/app/dashboard/attention/maintenance/[id]`
- `src/app/dashboard/attention/violations`
- `src/app/dashboard/attention/notifications`
- `src/app/dashboard/platform`
- `src/app/dashboard/platform/system-status`
- `src/app/dashboard/platform/firmware`
- `src/app/dashboard/platform/exports`
- `src/app/dashboard/platform/simulator`
- `src/app/dashboard/platform/users`
- `src/app/dashboard/platform/system-admin`
- `src/app/dashboard/platform/my-settings`

### 9.2 Wrapper-first rule
- Route mới ban đầu không viết lại logic.
- Route mới chỉ render page component hiện có.
- Ví dụ:
- `src/app/dashboard/fleet/devices/page.tsx` render `DevicesPage`
- `src/app/dashboard/operations/trips/page.tsx` render `TripsPage`
- `src/app/dashboard/platform/firmware/page.tsx` render `FirmwarePage`

### 9.3 Redirect wrappers
- Route cũ ban đầu đổi thành redirect page.
- Ví dụ:
- `src/app/dashboard/devices/page.tsx` redirect `/dashboard/fleet/devices`
- `src/app/dashboard/map/page.tsx` redirect `/dashboard/operations/map`

## 10. Component architecture target
### 10.1 Shell layer
Cần có 4 primitive mới:
- `DashboardShell`: shell tổng, host primary nav, utility rail, connection/banner
- `SurfaceSecondaryNav`: nav cấp 2 theo surface hiện tại
- `ContextHeader`: title, subtitle, data quality, scope notice, primary actions
- `WorkspaceBody`: chia slot `summary`, `filters`, `main`, `detail`, `rail`

### 10.2 Workspace primitive layer
- `SavedViewBar`
- `ScopeNotice`
- `DataQualityBadge`
- `DataQualityBanner`
- `ActionRail`
- `QueueFiltersBar`
- `EntityRelationshipStrip`
- `EntityQuickDrawer`
- `EntityDetailHeader`
- `AuditTimeline`

### 10.3 Page contract layer
Mỗi page/workspace lớn phải theo contract:
- Header biết mình thuộc surface nào
- Filter state URL-backed
- Summary chỉ rõ scope dữ liệu
- Main surface luôn có đường mở drawer/page/action
- Empty, error, loading theo pattern chung

## 11. Component map current -> target
- `src/config/nav-config.ts`: thành adapter lấy data từ route registry
- `src/components/layout/AppSidebar.tsx`: thành primary surface nav, chỉ còn 5 surface
- `src/hooks/use-breadcrumbs.tsx`: derive từ route registry, bỏ hardcoded route mapping
- `src/components/layout/PageContainer.tsx`: giữ làm base container, tách header/control strip ra primitive mới
- `src/app/dashboard/layout.tsx`: host `DashboardShell`, `SurfaceSecondaryNav`, metadata helper
- `src/app/dashboard/page.tsx`: legacy redirect sau khi `Command` sẵn sàng
- `src/features/map/*`: reuse mạnh cho Operations core workspace
- `src/features/devices/components/device-detail-modal/*`: giữ là modal workspace tổng hợp cho thiết bị, tiếp tục mở rộng thay vì thu hẹp
- `src/features/statistics/*`: giữ hidden workspace đến khi xong trust guardrails
- `src/features/system-admin/*`: đặt dưới Platform shell

## 12. File additions đề xuất
- `src/config/dashboard-route-registry.ts`
- `src/lib/navigation/get-surface-by-path.ts`
- `src/lib/navigation/get-secondary-nav.ts`
- `src/lib/navigation/get-legacy-redirect.ts`
- `src/lib/metadata/dashboard-metadata.ts`
- `src/components/layout/surface-secondary-nav.tsx`
- `src/components/layout/context-header.tsx`
- `src/components/layout/workspace-body.tsx`
- `src/components/common/data-quality-badge.tsx`
- `src/components/common/data-quality-banner.tsx`
- `src/components/common/scope-notice.tsx`
- `src/components/common/action-rail.tsx`
- `src/features/shared/entity/entity-quick-drawer.tsx`
- `src/features/shared/entity/entity-detail-header.tsx`
- `src/features/shared/entity/entity-relationship-strip.tsx`
- `src/features/shared/entity/audit-timeline.tsx`
- `src/hooks/use-url-query-state.ts`

## 13. File modifications đề xuất
- `src/app/dashboard/layout.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/PageContainer.tsx`
- `src/hooks/use-breadcrumbs.tsx`
- `src/config/nav-config.ts`
- `src/app/dashboard/*/page.tsx` cho redirect wrappers
- Các page có local tab/filter/page state để sync URL

## 14. Surface-level component map
### 14.1 Command
Cần tạo:
- `src/features/command/components/command-center-page.tsx`
- `src/features/command/components/fleet-health-ribbon.tsx`
- `src/features/command/components/critical-queue-panel.tsx`
- `src/features/command/components/shift-handoff-panel.tsx`
- `src/features/command/components/system-health-strip.tsx`

### 14.2 Operations
Cần tạo:
- `src/features/operations/components/operations-surface-shell.tsx`
- `src/features/operations/components/map-action-rail.tsx`
- `src/features/operations/components/trip-investigation-bridge.tsx`

Reuse:
- `features/map/*`
- `features/trips/*`
- `features/geofences/*`

### 14.3 Fleet
Cần tạo:
- `src/features/fleet/components/fleet-surface-shell.tsx`
- `src/features/fleet/components/fleet-lens-nav.tsx`
- `src/features/fleet/components/fleet-saved-views.tsx`

Reuse:
- `features/devices/*`
- `features/vehicles/*`
- `features/drivers/*`
- `features/customers/*`

### 14.4 Attention
Cần tạo:
- `src/features/attention/components/attention-center-page.tsx`
- `src/features/attention/components/attention-queue-table.tsx`
- `src/features/attention/components/attention-action-rail.tsx`
- `src/features/attention/components/attention-owner-status-bar.tsx`

Reuse:
- `features/alerts/*`
- `features/maintenance/*`
- `features/notifications/*`
- `features/violations/*`

### 14.5 Platform
Cần tạo:
- `src/features/platform/components/platform-surface-shell.tsx`
- `src/features/platform/components/platform-landing-page.tsx`

Reuse:
- `features/system-status/*`
- `features/system-admin/*`
- `features/settings/*`
- `features/simulator/*`
- logic page hiện tại của firmware, exports, users

## 15. URL state plan
### 15.1 Utility
- Tạo `src/hooks/use-url-query-state.ts`
- Nếu repo đã có `nuqs`, dùng nó để giảm boilerplate
- URL sync tối thiểu:
- `page`
- `search`
- `sortBy`
- `sortOrder`
- `status`
- `type`
- `view`
- `tab`
- `source`
- `date range`

### 15.2 Ưu tiên migration
1. `devices`
2. `alerts`
3. `maintenance`
4. `trips`
5. `vehicles`
6. `customers`
7. `drivers`
8. `users`
9. `settings`
10. `system-admin`

## 16. Metadata + breadcrumb plan
### 16.1 Metadata helper
Tạo helper chung:
```ts
export const getDashboardMetadata = (routeId: string, entityLabel?: string) => ({
  title: entityLabel ? `${entityLabel} | ${routeTitle}` : `${routeTitle} | IVM26`,
  description: routeDescription,
});
```

### 16.2 Breadcrumb
- `use-breadcrumbs.tsx` không được hardcode path cũ.
- Breadcrumb derive từ route registry và dynamic segment label.
- Legacy alias route cũng phải map về breadcrumb canonical.

## 17. Detail surface contract
### 17.1 Drawer
Dùng cho:
- quick inspect trong map/list/queue
- entity summary
- quick actions

### 17.2 Full page
Dùng cho:
- trip investigation
- device canonical page
- maintenance case
- geofence detail
- platform tools nặng

### 17.3 Modal
Dùng cho:
- create/edit nhỏ
- confirm/delete
- utility forms

### 17.4 Device migration rule
- Device modal hiện tại tiếp tục là surface tổng hợp tính năng cho thiết bị.
- Canonical device page vẫn giữ vai trò deep-link, chia sẻ URL, mở toàn màn hình và điều tra dài hơi.
- Không cắt các tab sâu như `route`, `sessions`, `errors`, `commands`, `raw`, `settings` khỏi modal nếu chưa có lý do workflow thật sự rõ ràng.

## 18. Migration plan theo phase
### Phase A. Foundation registry
- Tạo `dashboard-route-registry.ts`
- Refactor `nav-config.ts` thành adapter
- Refactor `use-breadcrumbs.tsx`
- Tạo metadata helper
- Acceptance:
- có một source of truth cho route/nav/breadcrumb/alias
- metadata sinh được theo route id

### Phase B. Canonical route scaffolding
- Tạo route folders mới
- Tạo wrapper page mới render lại page cũ
- Route cũ đổi thành redirect
- Acceptance:
- nav mới trỏ đúng canonical route
- old bookmarks vẫn chạy

### Phase C. Shell + surface nav
- Refactor `AppSidebar.tsx` chỉ còn 5 surface
- Thêm `SurfaceSecondaryNav`
- Thêm `ContextHeader`
- Acceptance:
- route nào cũng hiện đúng active primary nav và secondary nav theo surface

### Phase D. URL state + metric scope
- Migrate URL state theo thứ tự ưu tiên
- Thêm `ScopeNotice`
- Relabel KPI page-slice
- Acceptance:
- refresh/back/share URL giữ context
- không còn stat card mơ hồ về scope

### Phase E. Command + Attention
- Build `Command Center`
- Build `Attention Center`
- Đưa notifications vào lens
- Acceptance:
- operator có trang gốc queue-first
- operator có một queue hợp nhất để xử lý

### Phase F. Fleet + Operations
- Fleet shell hợp nhất
- Map action bridge
- Trip/geofence bridge
- Acceptance:
- từ map/list/queue có đường đi rõ sang entity và next action

### Phase G. Platform regroup
- Chuyển firmware/system-status/system-admin/users/my-settings/simulator/exports vào Platform
- Xóa alias `admin/*`
- Acceptance:
- operator nav sạch
- admin tool role-gated và tập trung

### Phase H. Cleanup
- Xóa route wrappers cũ sau release ổn định
- Dọn duplicate presentation logic
- Tách page monolithic thành shell + feature component

## 19. Testing / audit checkpoints
- Route regression:
- old URL redirect đúng
- canonical URL active nav đúng
- breadcrumb đúng
- browser title đúng

- URL state regression:
- search/filter/page/tab survive refresh
- share URL mở đúng view

- Surface contract:
- modal chỉ chứa deep workflow ở những nơi đã chốt rõ contract, hiện tại `DeviceDetailModal` là ngoại lệ có chủ đích
- device modal và device page phải có trách nhiệm bổ trợ nhau nhưng không gây mơ hồ về đường đi kế tiếp

- Data trust:
- statistics fallback phải show state rõ
- metric page-slice phải có label scope
- assignment/selector không bị cắt 100 item

- Mobile:
- secondary nav không tràn
- context header không quá cao
- map drawer và fleet lens vẫn action-oriented

## 20. Rủi ro + giảm thiểu
- Rủi ro: đổi route quá nhiều làm mất muscle memory.
- Giảm thiểu: redirect + labels quen thuộc + breadcrumb canonical + rollout theo phase.

- Rủi ro: wrapper route gây duplicate code tạm thời.
- Giảm thiểu: wrapper chỉ là phase ngắn; route registry làm trụ để cleanup.

- Rủi ro: refactor nav/breadcrumb làm vỡ active state.
- Giảm thiểu: route registry là source of truth, không để hardcode rải rác.

- Rủi ro: URL state migration gây race condition hoặc query spam.
- Giảm thiểu: debounce search, stable serializer, chỉ sync field cần thiết.

## 21. Definition of done cho spec này
- Team có thể build từng phase mà không phải suy đoán lại IA.
- Mỗi route có canonical home rõ ràng.
- Mỗi component mới có responsibility rõ ràng.
- Migration plan cho phép ship dần, không cần freeze cả dashboard.

## 22. Thứ tự build đề xuất sau spec
1. Foundation registry
2. Canonical route scaffolding
3. Shell + nav
4. URL state + metric scope
5. Command Center
6. Attention Center
7. Fleet Workspace
8. Operations deepening
9. Platform regroup
10. Cleanup

## 23. Câu hỏi còn mở
- Có muốn canonical root sau login là `/dashboard/command` hay `/dashboard/operations/map`?
- Có muốn `drivers/[id]` có full page canonical ngay từ phase Fleet không, hay tạm giữ drawer?
- Có chấp nhận `my-settings` là canonical path mới hay giữ `settings` để giảm đổi muscle memory?
- `statistics` và `fuel` có đủ mức ưu tiên để có route canonical mới trong đợt IA này không, hay chỉ hidden utility tạm thời?
