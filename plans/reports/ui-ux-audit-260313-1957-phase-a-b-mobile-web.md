# UI/UX Audit Phase A+B (mobile app + mobile web)

- Project: IoT Vehicle Tracking System
- Date: 2026-03-13
- Scope: `Tracking_Frontend` (Next.js) + `Tracking_Mobile` (Flutter WebView)
- Goal: inventory flow/screen (Phase A) + heuristic audit nhanh (Phase B)

## Method

- Read route/layout/component chính của web + mobile shell.
- Ưu tiên heuristic: Accessibility, Touch target, Responsive layout, Feedback state, Consistency.
- Focus mobile viewport (375px first), rồi tablet/desktop.

---

## Phase A — Screen/Flow Inventory

### A1) Screen inventory (high traffic / high risk)

| Platform | Screen | Entry | Main actions | Risk |
|---|---|---|---|---|
| Web | Login | `/login` | login, show/hide password, remember me | High |
| Web | Dashboard shell | `/dashboard/*` | open sidebar, breadcrumb nav, notification, theme switch | High |
| Web | Map tracking | `/dashboard/map` | open device drawer, search/filter, pick marker/device | Critical |
| Web | Devices | `/dashboard/devices` | switch table/cards, filter, create/edit/delete | High |
| Web | Notifications | `/dashboard/notifications` + bell dropdown | read all, open detail target | Medium |
| Mobile | Splash | app launch | init session, fcm, sync, route to webview | Medium |
| Mobile | WebView host | `AppRoutes.webview` | load web app, retry error, back navigation | Critical |

### A2) Primary user flows

1. **F1 Login flow (web + webview):** open login → submit creds → redirect dashboard.
2. **F2 Real-time map flow:** open map → filter/search device → open selected device info.
3. **F3 Device management flow:** list device → switch view mode → open detail/edit/delete.
4. **F4 Notification flow:** bell/dropdown or notification page → mark read/all read → jump target.
5. **F5 Mobile bootstrap flow:** splash init → webview load → loading/error/offline/retry.

### A3) UI surface map (where mobile UX can break first)

- Header control cluster: sidebar trigger + breadcrumb + notification + theme controls.
- Overlay surfaces: popover, sheet, drawer, modal.
- Dense action bars: devices page toolbar, map drawer top row.
- Async states: webview loading/error/offline + dashboard data loading.

---

## Phase B — Heuristic Audit (quick)

### B0) Summary

- P0: 2 issues
- P1: 6 issues
- P2: 3 issues
- Strengths noted: semantic labels/form usage khá ổn; state loading/error có hiện diện; mobile sheet pattern đã dùng ở sidebar/map drawer.

### B1) Findings backlog

| ID | Severity | Heuristic | Finding | Evidence | Impact | Suggested fix direction |
|---|---|---|---|---|---|---|
| H-01 | P0 | Accessibility (name/label) | Icon-only bell button chưa có accessible name rõ ràng | `Tracking_Frontend/src/features/notifications/components/notification-badge.tsx:8` | Screen reader khó hiểu nút | Add `aria-label="Mở thông báo"` (và giữ badge text tách riêng) |
| H-02 | P0 | Touch target | Sidebar trigger chỉ ~28px (`size-7`), dưới chuẩn 44px mobile touch | `Tracking_Frontend/src/components/ui/sidebar.tsx:235` | Dễ mis-tap, UX kém trên mobile | Tăng hit area >=44px, hoặc thêm invisible padding tap-zone |
| H-03 | P1 | Responsive layout | Theme selector có `min-w-[220px]` trong top header, dễ chật/overflow ở mobile | `Tracking_Frontend/src/components/theme-selector.tsx:35` + `Tracking_Frontend/src/app/dashboard/layout.tsx:31` | Header crowded, giảm usability | Dùng compact mode trên mobile (icon trigger/sheet), bỏ min-width cứng |
| H-04 | P1 | Responsive overlay | Notification popover fixed `w-96` (384px) có thể tràn ở viewport 375px | `Tracking_Frontend/src/features/notifications/components/notification-dropdown.tsx:42` | Horizontal clipping/cut content | Dùng `w-[min(92vw,24rem)]` hoặc mobile sheet |
| H-05 | P1 | Touch target | Nhiều mobile action button dùng size `sm` (h=32px), dưới chuẩn touch | `.../mobile-device-header.tsx:7`, `.../device-filter-compact.tsx:32`, `.../mobile-device-drawer.tsx:46` | Tăng lỗi thao tác ngón tay | Dùng size >=44px cho touch-first context |
| H-06 | P1 | Interaction consistency | Password toggle trong login là custom button nhỏ, hit area hẹp | `Tracking_Frontend/src/features/auth/components/login-form.tsx:86` | Khó bấm trên mobile, nhất là 1 tay | Tăng vùng bấm (wrapper 44x44), giữ icon center |
| H-07 | P1 | Information density | Header dashboard chứa nhiều control đồng thời (bell + theme selector + mode toggle) | `Tracking_Frontend/src/app/dashboard/layout.tsx:31` | Cognitive load + cramped layout trên màn nhỏ | Gộp control vào menu “Display/Settings” trên mobile |
| H-08 | P1 | Localization consistency | Label tab dùng tiếng Anh “Cards” giữa UI tiếng Việt | `Tracking_Frontend/src/features/devices/components/mobile-tab-selector.tsx:7` | Giảm tính nhất quán ngôn ngữ | Chuẩn hóa copy tiếng Việt (“Thẻ”) |
| H-09 | P2 | Feedback/a11y semantics | Flutter loading view chỉ spinner, thiếu text trạng thái | `Tracking_Mobile/lib/widgets/loading_indicator.dart:14` | Người dùng khó hiểu đang chờ gì | Thêm status text ngắn + semantics label |
| H-10 | P2 | Localization consistency | ErrorView nút retry tiếng Anh “Retry” khác ngôn ngữ app | `Tracking_Mobile/lib/widgets/error_view.dart:43` | Mismatch ngôn ngữ, cảm giác chưa hoàn thiện | Chuẩn hóa copy tiếng Việt |
| H-11 | P2 | Layout resilience | Nhiều khối đặt chiều cao cố định theo viewport (`calc(100vh-4rem)`) | `Tracking_Frontend/src/features/map/components/map-page.tsx` không có; thực tế ở `Tracking_Frontend/src/app/dashboard/map/page.tsx:18` và `Tracking_Frontend/src/components/layout/PageContainer.tsx:53` | Có thể va chạm khi banner/network bar xuất hiện | Kiểm thử với banner on/off + safe-area, chuyển sang layout linh hoạt hơn |

### B2) Positive checks

- Login form có label đúng cho input: `Tracking_Frontend/src/features/auth/components/login-form.tsx:71`.
- Theme mode toggle có `sr-only`: `Tracking_Frontend/src/components/mode-toggle.tsx:19`.
- Sidebar mobile sheet có title/description dành cho SR: `Tracking_Frontend/src/components/ui/sidebar.tsx:171`.
- Mobile error view có retry button min size 48dp: `Tracking_Mobile/lib/widgets/error_view.dart:45`.

---

## Recommended priority after A+B

1. **Wave 1 (must fix now):** H-01, H-02.
2. **Wave 2 (high mobile impact):** H-03, H-04, H-05, H-06, H-07.
3. **Wave 3 (polish/consistency):** H-08, H-09, H-10, H-11.

---

## Unresolved questions

1. Mobile web target chính là responsive browser hay chủ yếu qua Flutter WebView?
2. Có yêu cầu chuẩn WCAG level nào (AA hay AAA) cho release này không?
3. Có design token/breakpoint policy chính thức để lock width/height hành vi header/popover không?
