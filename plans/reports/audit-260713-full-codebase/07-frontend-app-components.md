# Audit 07 — Frontend App Router + Components chung (Next.js)

**Scope:** `src/app/**`, `src/components/**`, `middleware.ts` (root), `next.config.ts`
**Base:** `Tracking_Frontend/`
**Phương pháp:** READ-ONLY, đọc full mọi file trong scope + verify shim/shadow qua source. Cross-check thêm các file `src/lib`, `src/hooks`, `src/features/auth` cần cho phần security (chỉ để xác minh, không thuộc scope report này).
**Kết luận nhanh:** Tầng app+components ở trạng thái **tốt & production-oriented**. Không có secret baked client, không token localStorage, không mock/fake data trong app router, a11y được chú ý rõ (skip-link, aria-label icon-only button, keyboard row, sr-only label). Vấn đề chính là **kiến trúc migration route chưa dọn** (legacy + grouped cùng tồn tại, 3 lớp redirect) và một vài **god file** + **RBAC client-side cần backend enforce** (không verify được ở tầng này).

---

## 1. Bảng coverage per-file

### 1.1 Config + root (root & app shell)

| File | Dòng | Loại | Ghi chú |
|---|---|---|---|
| `middleware.ts` | 53 | Auth middleware | Gate mọi route trừ public prefix; check cookie `session_token` |
| `next.config.ts` | 97 | Config | `output: standalone`, image remotePatterns, 30 redirects legacy→grouped, rewrite `/api/:path*`→backend |
| `src/app/layout.tsx` | 54 | Root layout | fonts (vietnamese subset), metadata brand, skip-link, `<html lang="vi">` |
| `src/app/page.tsx` | 14 | Root page | `redirect('/login')` — không render |
| `src/app/login/page.tsx` | 87 | Page | Marketing panel + `<LoginForm/>`, `id=main-content`, aria-labelledby |
| `src/app/error.tsx` | 18 | Error boundary | segment-level, `console.error` + reset |
| `src/app/global-error.tsx` | 26 | Error boundary | root-level, có `<html>/<body>` |
| `src/app/not-found.tsx` | 14 | 404 | link về `/dashboard`; **BOM ở đầu file** (ký tự ``) |
| `src/app/dashboard/layout.tsx` | 51 | Layout | KBar + Sidebar + header (bell/theme/mode); `defaultOpen` từ cookie `sidebar_state` |
| `src/app/dashboard/page.tsx` | 125 | Page (overview) | React Query x6, error aggregate + "Thử lại tất cả", charts + KPI thật từ API |

### 1.2 Dashboard pages — REAL implementation (code thật)

| File | Dòng | Ghi chú |
|---|---|---|
| `dashboard/devices/page.tsx` | ~230 | List + detail modal, RBAC `canViewAllDevices` |
| `dashboard/devices/[id]/page.tsx` | ~430 | Detail thật |
| `dashboard/vehicles/page.tsx` | ~390 | CRUD + ConfirmDialog xóa |
| `dashboard/vehicles/[id]/page.tsx` | 41 | Wrapper mỏng → feature component |
| `dashboard/drivers/page.tsx` | ~300 | CRUD + ConfirmDialog |
| `dashboard/customers/page.tsx` | ~700 | **God file**: form + list + filter + detail |
| `dashboard/customers/[id]/page.tsx` | 1 | Re-export `@/features/customers/pages/customer-detail-page` |
| `dashboard/users/page.tsx` | ~540 | **God file**: form tạo user (password), RBAC `canManageUsers` |
| `dashboard/settings/page.tsx` | 226 | Profile/password/notif/theme tabs — **save qua API** (`authServices`), KHÔNG fake localStorage |
| `dashboard/system-status/page.tsx` | ~160 | System health |
| `dashboard/system-admin/page.tsx` | ~150 | Admin utilities, RBAC `canAccessSystemAdmin` |
| `dashboard/zones/page.tsx` | 304 | Zones/geofence membership (inside/outside/suspect/unknown) |
| `dashboard/geofences/page.tsx` | 286 | Legacy → nội dung tương đương zones |
| `dashboard/geofences/[id]/page.tsx` | ~13 | Re-export shim |
| `dashboard/alerts/page.tsx` | 465 | Infinite list PAGE_SIZE=50, filters từ searchParams, AlertDetailModal |
| `dashboard/violations/page.tsx` | 220 | PAGE_SIZE=20, ViolationDetailModal |
| `dashboard/notifications/page.tsx` | 109 | PAGE_SIZE=20, markAllRead |
| `dashboard/statistics/page.tsx` | 17 | Wrapper → `StatisticsOverview` feature |
| `dashboard/fuel/page.tsx` | 17 | Wrapper → `FuelAnalyticsPage` feature |
| `dashboard/map/page.tsx` | 87 | `dynamic(ssr:false)` TrackingMap, realtime hooks, error+retry |
| `dashboard/trips/page.tsx` | ~380 | List + filter + ConfirmDialog |
| `dashboard/trips/[id]/page.tsx` | ~270 | Detail thật |
| `dashboard/maintenance/page.tsx` | **812** | **God file lớn nhất** — schedule/list/form/detail trong 1 file |
| `dashboard/maintenance/[id]/page.tsx` | ~340 | Detail thật |
| `dashboard/exports/page.tsx` | 385 | Job list, Progress realtime, download link, RBAC `canExportData` |
| `dashboard/simulator/page.tsx` | 95 | Telemetry simulator, RBAC `canAccessSystemAdmin` |
| `dashboard/firmware/page.tsx` | ~640 | **God file** — list/summary/upload/deploy/history/assignment orchestration |

### 1.3 Firmware components (`dashboard/firmware/components/`)

| File | Ghi chú |
|---|---|
| `firmware-deploy-dialog.tsx` (~500L) | Chọn device + strategy, deploy OTA |
| `firmware-upload-dialog.tsx` (~140L) | Upload bản firmware mới |
| `firmware-deployment-history.tsx` (~270L) | Lịch sử triển khai |
| `firmware-device-assignment.tsx` (~200L) | Gán firmware cố định cho device |
| `firmware-device-assignment-columns.tsx` (~200L) | Column def cho bảng assignment |
| `firmware-summary-cards.tsx` (~180L) | KPI cards |
| `firmware-utils.ts` (~100L) | Helper format/status |

### 1.4 Dashboard route shims (re-export / metadata-only) — verified

Tất cả các file dưới đây chỉ `export { default } from '...'` (± `buildDashboardMetadata`), **không phải shadow nguy hiểm** — sibling `page.tsx` re-export chính bản thân route con, không có sibling `foo.tsx` che thư mục `foo/`:

- `dashboard/command|platform|fleet|operations|attention/page.tsx` — index/redirect entries
- `fleet/{devices,vehicles,drivers,customers}[/[id]]` → legacy pages
- `operations/{trips,trips/[id],geofences,geofences/[id]}`
- `platform/{users,my-settings,system-admin,firmware,exports,simulator,system-status}`
- `attention/{queue,violations,notifications,maintenance,maintenance/[id]}`
- `admin/{users,system,system-status}`

`dashboard/attention/queue/page.tsx` → re-export `../../alerts/page` (queue = alerts). `dashboard/command/page.tsx` → re-export `../page` (command = overview).

### 1.5 Components chung

| File | Dòng | Loại | Ghi chú |
|---|---|---|---|
| `components/breadcrumbs.tsx` | 37 | nav | dùng `useBreadcrumbs` |
| `components/nav-user.tsx` | 91 | nav | logout → `authServices.logout()` + `clearAuth` + redirect |
| `components/mode-toggle.tsx` | 29 | theme | sr-only label OK |
| `components/theme-selector.tsx` | 73 | theme | Label sr-only OK |
| `components/active-theme.tsx` | 46 | context | set cookie `active_theme`, class `theme-*` |
| `components/auth/session-guard.tsx` | 68 | auth | `getMe()` bootstrap, loading spinner |
| `components/providers/providers.tsx` | ~40 | provider | compose Query/Theme/Realtime/Session |
| `components/providers/query-provider.tsx` | ~25 | provider | React Query client |
| `components/providers/socket-provider.tsx` | ~230 | provider | socket.io namespaces, WS URL từ env |
| `components/providers/realtime-provider.tsx` | ~8 | provider | thin re-export |
| `components/layout/AppSidebar.tsx` | ~190 | layout | nav filtered qua RBAC, brand lockup |
| `components/layout/PageContainer.tsx` | ~60 | layout | title/desc/headerAction wrapper |
| `components/layout/notification-bell.tsx` | ~10 | layout | thin re-export feature |
| `components/common/data-table.tsx` | 375 | table | TanStack, mobile card + desktop table, keyboard row, empty/loading |
| `components/common/data-table-column-header.tsx` | 40 | table | sort header |
| `components/common/confirm-dialog.tsx` | 62 | dialog | destructive variant + isPending |
| `components/common/empty-state.tsx` | 34 | state | icon/title/desc/action |
| `components/common/stat-card.tsx` | 100 | kpi | loading skeleton |
| `components/common/connection-banner.tsx` | 72 | realtime | role=alert/status, aria-live, dismiss |
| `components/common/infinite-scroll-trigger.tsx` | 66 | list | IntersectionObserver + fallback button |
| `components/common/brand-mark.tsx` | 96 | brand | BrandMark + BrandLockup |
| `components/common/user-avatar.tsx` | 38 | avatar | sr-only name fallback |
| `components/kbar/index.tsx` | 68 | cmdk | actions từ navConfig (RBAC filtered) |
| `components/kbar/kbar-content.tsx` | 18 | cmdk | results render |
| `components/kbar/result-item.tsx` | 34 | cmdk | item row |
| `components/kbar/use-theme-switching.tsx` | 36 | cmdk | theme actions |
| `components/ui/*.tsx` (31 file) | — | primitives | **shadcn/ui chuẩn** (radix), có custom: layer z-index vars, safe-area insets, size variants, dialog auto sr-only description |

---

## 2. Findings theo severity

### 🔴 HIGH — (không có finding blocking trong scope)

Không phát hiện lỗ hổng bảo mật nghiêm trọng tầng client. Xem CẢNH BÁO ở MEDIUM về RBAC cần backend enforce.

### 🟠 MEDIUM

**M1 — RBAC hoàn toàn cosmetic ở client; phải verify backend enforce.** `verified`
- `src/hooks/use-role-access.ts:24-61` tính quyền từ `useAuthStore().user.role`; `src/hooks/use-nav.ts:25-43` ẩn menu; các page (`exports/page.tsx:235`, `simulator/page.tsx:16`, `firmware`, `users`, `system-admin`) chỉ render "Khu vực hạn chế" khi thiếu quyền.
- Đây chỉ là **ẩn UI**. `apiClient` (`src/lib/api/client.ts:21-27`) đính Bearer token cho MỌI request — nếu backend không tự enforce role trên các endpoint (firmware deploy, user create, export, simulator publish), thì viewer/operator vẫn gọi API trực tiếp được. **Ngoài scope frontend để xác nhận** → xem Câu hỏi mở Q1.

**M2 — Kiến trúc migration route chưa dọn: legacy + grouped cùng tồn tại + 3 lớp canonicalization.** `verified`
- Code thật nằm ở thư mục **legacy** (`vehicles/`, `users/`, `maintenance/`, `firmware/`, `exports/`, `simulator/`, `settings/`, ...). Thư mục **grouped** (`fleet/*`, `platform/*`, `attention/*`, `operations/*`) chỉ re-export.
- Canonicalization xảy ra ở **3 nơi độc lập**: `next.config.ts:51-83` (30 redirects), `middleware.ts:6-31` (legacyZonePathPatterns → `/dashboard/zones`), và `dashboard-route-registry` (metadata). Rủi ro drift: thêm route mới dễ quên 1 trong 3 nơi.
- `zones` vs `geofences`: có `dashboard/geofences/page.tsx` (286L, code thật) **và** `dashboard/zones/page.tsx` (304L, code thật) song song, nhưng `next.config.ts:57-60` + `middleware.ts:6-11` redirect geofences→zones. → `geofences/page.tsx` thực tế **dead code** (không route nào tới được nếu redirect bật). Xem Q2.

**M3 — God files.** `verified`
- `dashboard/maintenance/page.tsx` = **812 dòng** (schedule + list + form + filter + detail trong 1 client component).
- `dashboard/firmware/page.tsx` ≈ 640 dòng.
- `dashboard/customers/page.tsx` ≈ 700 dòng, `dashboard/users/page.tsx` ≈ 540 dòng.
- Khó test/maintain; nên tách form/columns/hooks như pattern `firmware/components/` đã làm.

### 🟡 LOW

**L1 — `not-found.tsx` có BOM (``) ở đầu file.** `verified` — `src/app/not-found.tsx:1`. Vô hại nhưng bẩn; nên strip.

**L2 — Overview KPI/chart lệ thuộc `?? []` / `?? 0` khi query lỗi.** `verified` — `dashboard/page.tsx:106-118`. Có error banner tổng ("Thử lại tất cả") nên user vẫn biết, nhưng chart vẫn render rỗng thay vì error state riêng cho từng chart → có thể gây hiểu nhầm "0 xe" khi thực chất là lỗi mạng. UX minor.

**L3 — `exports` download link là `<a href>` GET không token.** `verified` — `dashboard/exports/page.tsx:289` `exportServices.downloadUrl(row.id)`. Vì auth qua cookie `session_token` (withCredentials) nên link GET có thể hoạt động; nhưng nếu endpoint download yêu cầu Bearer header (như các API khác), link `<a>` sẽ **không gửi Bearer** → cần backend chấp nhận cookie cho route này. Xem Q3.

**L4 — `NavUser` mục "Hồ sơ" (`nav-user.tsx:76-79`) không gắn action/onClick/link.** `verified` — DropdownMenuItem "Hồ sơ" chỉ render, không điều hướng tới settings/profile. Nút chết (cosmetic). "Đăng xuất" thì có handler đầy đủ.

**L5 — `error.tsx`/`global-error.tsx` hiển thị `error.message` thô cho user.** `verified` — `error.tsx:13`, `global-error.tsx:18`. Có thể lộ chi tiết kỹ thuật/stack message. Nên map sang thông báo thân thiện.

### 🟢 INFO / điểm tốt (đáng ghi nhận)

- **Không secret nào baked client.** `verified` — grep `NEXT_PUBLIC_*` chỉ trả về API/WS base URL (`base-url.ts:26`, `socket-provider.tsx:40,75`, `admin-utilities-panel.tsx:30-32`) và 1 mock toggle `NEXT_PUBLIC_OBD_UI_MOCK` (features/, ngoài scope). Không API key/secret.
- **Không token trong localStorage/sessionStorage.** `verified` — `auth-store.ts` là zustand in-memory (không `persist`); token chỉ sống trong RAM + gửi Bearer (`client.ts:22-24`). Session bền qua httpOnly cookie `session_token` (do backend set — grep `session_token` trong `src/` = 0 kết quả, frontend không tự set/đọc). Đây là mô hình đúng (XSS-resilient hơn localStorage).
- **Không mock/fake/TODO trong app router.** `verified` — grep `mock|fake|dummy|Math.random|TODO|placeholder` trên `src/app/**/*.tsx`: 44 match nhưng **toàn bộ là input `placeholder=` hợp lệ**. KPI/chart lấy từ React Query thật.
- **Settings save thật qua API**, không fake localStorage — `settings/page.tsx:9-17` dùng `authServices` mutations.
- **A11y tốt:** skip-link (`layout.tsx:42-47`), icon-only button có `aria-label` (login eye toggle `login-form.tsx:147`, connection-banner dismiss `:59`, data-table pagination `:354,366`), Label sr-only cho search/theme, `role/aria-live` trên banner + form errors, keyboard-activatable table rows (`data-table.tsx:136-144,239-251`), dialog tự chèn sr-only description khi thiếu (`dialog.tsx:83-87`). Modal focus-trap do Radix xử lý.
- **Không có clickable `<div onClick>` thiếu role/tabIndex** trong app+components (grep = 0). Nơi cần click-div (data-table row) đã có `tabIndex` + `onKeyDown` + guard `isInteractiveTarget`.
- **Không disable zoom** — grep `user-scalable|maximum-scale` = 0.
- **Destructive có ConfirmDialog** ở vehicles/drivers/trips/devices/customers/firmware/users (`ConfirmDialog` với `variant="destructive"` + `isPending`).
- **Loading/empty/error states** phổ biến: `StatCard` skeleton, `DataTable` skeleton+EmptyState, map error+retry, dashboard error aggregate.
- UI primitives = shadcn/ui chuẩn, có hardening: z-index layer vars, safe-area insets (mobile notch), size variants responsive.

---

## 3. Contract drift (route handler vs backend)

- **Không có route handler** (`app/**/route.ts`) nào trong frontend — grep = 0. Toàn bộ API đi qua rewrite `next.config.ts:85-93` (`/api/:path*` → `${apiBase}/api/:path*`) hoặc gọi trực tiếp `API_BASE_URL` (`base-url.ts`). ⇒ **Không có bề mặt contract drift ở tầng app router**; drift (nếu có) nằm ở `src/lib/api/*` (ngoài scope report này).
- `unwrap()` (`client.ts:89-100`) phòng thủ 2 shape response (envelope có `requestId`+`data` vs raw) — cho thấy backend có 2 kiểu trả về; dashboard overview cũng `?? data?.items` fallback (`dashboard/page.tsx:59`), gợi ý shape chưa nhất quán 100%. Xem Q4.

---

## 4. Config review

- `next.config.ts` — `output: 'standalone'` (Docker OK). **Không có security headers** (CSP, X-Frame-Options, HSTS, X-Content-Type-Options) trong `headers()` — không khai báo. Nếu không có reverse-proxy set header thì thiếu. Xem Q5.
- `images.remotePatterns` chỉ cho `*.localhost` / `*.tracking.local` (`:44-49`) — dev/internal domain. Prod cần thêm domain thật nếu load ảnh external.
- `rewrites` proxy dùng `resolveApiBaseForRewrite()` với fallback `http://tracking-backend:4000` (internal service name) + đặc biệt hoá `api.thingdock.dev` → dùng internal (`:16-38`). Logic ổn cho container networking.
- `middleware.ts` matcher `'/((?!_next/static|_next/image|favicon.ico).*)'` (`:52`) — **bao phủ rộng, không thiếu route** (mọi thứ trừ static assets đều qua gate). `isPublicPath` cho phép `/`, `/login`, `/api`, `/landing`, và mọi path có đuôi file (`publicFilePattern` `:5`). ⚠️ `publicFilePattern = /\/[^/]+\.[^/]+$/` — bất kỳ path kết thúc bằng `x.y` đều thành public; hiện chỉ dùng cho static nên OK, nhưng nếu có route dạng `/dashboard/report.2024` sẽ vô tình bypass auth. Edge-case, low risk.

---

## 5. Câu hỏi mở

- **Q1 (RBAC — quan trọng nhất):** Backend có enforce role trên các endpoint nhạy cảm (firmware deploy/upload, user create/delete, export create, simulator publish, system-admin) không? Client chỉ ẩn UI; nếu backend chỉ check "đã đăng nhập" mà không check role → viewer gọi API trực tiếp được. Cần đối chiếu với audit backend.
- **Q2 (dead code):** `dashboard/geofences/page.tsx` (286L code thật) có còn cần không, khi `next.config.ts` + `middleware.ts` đều redirect geofences→zones? Nếu redirect luôn bật → xoá được. Kế hoạch dọn legacy folders (vehicles/users/... code thật) sau khi grouped ổn định là gì?
- **Q3 (export download):** Endpoint `exportServices.downloadUrl(id)` (dùng qua `<a href>` GET) auth bằng cookie hay Bearer? Nếu Bearer-only → link tải sẽ 401 vì thẻ `<a>` không gửi Authorization header.
- **Q4 (response shape):** Vì sao `unwrap()` và dashboard phải fallback 2 shape (`data.items` vs `data.data.items`)? Backend đã chuẩn hoá envelope chưa, hay còn endpoint trả shape cũ?
- **Q5 (security headers):** Security headers (CSP/HSTS/X-Frame-Options) được set ở đâu — reverse proxy/ingress hay cần thêm vào `next.config.ts headers()`? Hiện `next.config.ts` không khai báo.
- **Q6 (god files):** Có kế hoạch refactor `maintenance/page.tsx` (812L), `firmware/page.tsx`, `customers/page.tsx`, `users/page.tsx` theo pattern tách `components/` như firmware đã làm không?
- **Q7 (nav "Hồ sơ"):** Mục "Hồ sơ" trong `NavUser` là chủ đích để trống (chưa làm) hay quên gắn link tới `/dashboard/platform/my-settings`?
