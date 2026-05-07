# Báo cáo nghiên cứu: Hướng giao diện web mobile cho IoT Vehicle Tracking System

Ngày nghiên cứu: 2026-05-04  
Phạm vi: `Tracking_Frontend` Next.js dashboard, `Tracking_Mobile` Flutter WebView shell, mobile web/PWA UX.

## Tóm tắt

Nên làm **mobile web responsive/PWA làm lõi**, không tách một frontend mobile riêng lúc này. Lý do: mobile app hiện tại là Flutter shell bọc Next.js dashboard bằng WebView; route, API client, realtime Socket.IO, table/card/map component đã nằm trong `Tracking_Frontend`. Tách UI mới sẽ tăng chi phí đồng bộ và nguy cơ lệch contract.

Hướng hợp lý: biến dashboard thành **ứng dụng mobile ưu tiên vận hành**. Màn hình mobile không nên bê nguyên toàn bộ desktop dashboard vào first fold. Mobile cần 4 việc chính: xem xe trên bản đồ, xem xe/cảnh báo cần xử lý, xem chi tiết nhanh, nhận thông báo/native capability. Các việc nặng như firmware, admin, export, simulator nên để trong menu phụ hoặc ưu tiên tablet/desktop.

## Căn cứ nội bộ

- README: Frontend chạy Next.js trên port `4001`; Mobile chạy Flutter shell; backend có REST + realtime.
- `Tracking_Mobile/lib/features/webview/webview_screen.dart`: mobile app load `AppConfig.webAppUrl` trong `InAppWebView`.
- `Tracking_Mobile/lib/features/webview/js_bridge.dart`: có native bridge cho notification, token, device info, location placeholder, FCM token.
- `Tracking_Frontend/src/config/dashboard-route-registry.ts`: dashboard chia thành 5 surface: Điều hành, Vận hành, Đội xe, Cảnh báo, Nền tảng.
- `Tracking_Frontend/src/app/dashboard/map/page.tsx`: map đã có mobile drawer + selected-device overlay.
- `Tracking_Frontend/src/components/common/data-table.tsx`: table desktop đã có mobile card layout.
- `docs/code-standards.md`: đã yêu cầu skip link, aria-label, `100dvh`, touch target 44px, Flutter semantic widgets.
- `resources/docs/ui-remediation-2026-04-20/*`: đã có tiền lệ giảm copy dài, progressive disclosure, sidebar/list scroll riêng.

## Nguồn ngoài đã đối chiếu

- [W3C WCAG 2.2 - Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): mức tối thiểu 24x24 CSS px, nhưng project nên giữ 44px cho thao tác mobile thường xuyên theo code standards.
- [web.dev Responsive Design](https://web.dev/learn/design/): responsive = fluid grids/media + media queries; cần test layout theo viewport/input mode.
- [web.dev Core Web Vitals](https://web.dev/articles/vitals?hl=en): theo dõi LCP, INP, CLS; target tốt: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 ở p75 mobile/desktop.
- [Android Developers - Window Size Classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes): compact/medium/expanded width nên là cơ sở quyết định layout.
- [Android Developers - Adaptive Navigation](https://developer.android.com/develop/ui/compose/layouts/adaptive/build-adaptive-navigation): compact window nên dùng bottom navigation; expanded nên dùng rail/drawer.
- [web.dev PWA](https://web.dev/learn/pwa/progressive-web-apps): PWA giúp một codebase có install, offline, OS integration.
- [web.dev PWA Caching](https://web.dev/learn/pwa/caching/): service worker/cache nên dùng có chọn lọc, không cache bừa telemetry realtime.
- [Android Developers - WebView native bridge risks](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges): native bridge/WebView có rủi ro XSS/interface injection, cần allowlist và giới hạn capability.

## Kết luận kiến trúc UI

### 1. Chọn "responsive dashboard + PWA + Flutter shell"

Nên:
- Giữ `Tracking_Frontend` là UI chính cho web desktop, mobile browser, và Flutter WebView.
- Thêm mobile-specific layout trong cùng component tree, không tạo `Tracking_Frontend_Mobile`.
- Để Flutter shell phụ trách native-only: FCM/local notification, secure storage, native auth bridge, deep link, có thể thêm location sau này.
- Thêm PWA manifest/service worker cho browser/mobile web, nhưng offline chỉ nên cache app shell + fallback + metadata gần nhất, không cache dữ liệu nhạy cảm/telemetry realtime dài hạn.

Không nên:
- Viết lại dashboard bằng Flutter native lúc này.
- Tạo route mobile riêng sao chép business logic.
- Đưa toàn bộ sidebar desktop vào mobile first screen.

### 2. Mobile information architecture đề xuất

Bottom nav 4 tab trên compact width:

| Tab | Route gốc | Vai trò |
|---|---|---|
| Bản đồ | `/dashboard/operations/map` | Màn hình chính, live tracking |
| Cần xử lý | `/dashboard/attention/queue` | Active alerts, violations, maintenance |
| Đội xe | `/dashboard/fleet` | Xe/thiết bị/tài xế/khách hàng, ưu tiên search |
| Thêm | `/dashboard/platform` | Settings, firmware, export, admin, simulator |

Tablet/desktop:
- Giữ sidebar/rail hiện tại.
- Có thể hiển thị 2-pane: list + detail, map + detail rail.

### 3. Mobile first screen nên là Bản đồ

Lý do:
- Sản phẩm là tracking, bản đồ là tác vụ có giá trị cao nhất.
- Code hiện đã đầu tư mobile drawer + selected overlay.
- User ngoài hiện trường thường cần: "xe nào, ở đâu, có lỗi gì, làm gì tiếp".

First fold mobile nên có:
- Map full-height `100dvh`.
- Nút "Thiết bị (n)" dạng pill ở top-left.
- Cụm layer/follow/fit controls góc phải, touch target >=44px.
- Bottom sheet khi chọn xe: biển số/tên xe, trạng thái device, trạng thái xe, cập nhật lúc nào, cảnh báo, shortcut nhanh.
- Nếu có critical alert: banner nhỏ, có CTA mở chi tiết.

### 4. Điều hướng và progressive disclosure

Compact mobile:
- Bottom nav cho 4 destination top-level.
- Sidebar chỉ mở khi bấm "Thêm" hoặc hamburger; không bắt user scroll sidebar dài để tìm tác vụ chính.
- Detail dùng bottom sheet/route detail, không dùng modal center như desktop.
- Table chuyển thành card list, hiện 3-5 field quan trọng; action gom trong overflow/action row.

Medium/expanded:
- Dùng sidebar hiện tại hoặc nav rail.
- List-detail side-by-side cho fleet/alerts/trips.
- Map inspect rail như hiện tại là hợp lý.

## Design system đề xuất

Tính cách UI: **industrial operations, realtime monitoring, bình tĩnh nhưng đủ khẩn khi cần**.

Nên:
- Nền sáng trung tính, text đậm, status color rõ: xanh lá online, vàng cảnh báo, đỏ nghiêm trọng, xanh dương thông tin.
- Map là nền chính, panels dùng surface trong/nhạt vừa đủ, không làm kiểu hero/marketing.
- Copy ngắn, tiếng Việt có dấu, nói bằng hành động: "Kiểm tra kết nối", "Mở chi tiết", "Ẩn vùng".
- Icon Lucide/shadcn nhất quán.
- Font hiện tại Inter/Archivo/IBM Plex Sans chấp nhận được; nếu đổi thì cần đổi toàn hệ thống, chưa cần trong phase mobile.

Không nên:
- Gradient/orb/trang trí.
- Card trong card.
- Copy giải thích dài trong dashboard.
- Button text dài trên mobile.

## Quy tắc component cho mobile

### Map
- Giữ `MapSelectedDeviceOverlay` mobile, nhưng cần giới hạn chiều cao và có state collapsed/expanded nếu nội dung dài.
- `MobileDeviceDrawer` nên có search + filter sticky, list scroll riêng.
- Controls map: 44x44, cách nhau >=8px, respect `safe-area-*`.
- Marker/pin có thể nhỏ hơn 24px nếu vị trí trên map là essential, nhưng phải có list/drawer thay thế để chọn device.

### Tables/lists
- `DataTable` đã có mobile card: nên dùng bắt buộc cho alerts/fleet/trips/maintenance.
- Mobile card chỉ hiện: title, status/severity, relative time, owner/entity, 1 primary action.
- Column visibility menu có thể ẩn trên mobile, thay bằng filter/sort sheet.

### Forms
- Forms mobile dùng full-screen sheet/route, field một cột.
- Sticky bottom action bar: Save/Cancel/Retry.
- Validate gần field, không toast-only.

### Charts
- Mobile chỉ hiện KPI cards + chart đơn giản.
- Recharts phải có fixed height/aspect ratio để tránh CLS.
- Trend detail để sang route/detail, không nhồi vào first fold.

### Notification
- Bell hiện trong header compact, nhưng critical alerts nên có surface riêng trong tab "Cần xử lý".
- Native bridge chỉ nên đẩy notification quan trọng; không spam mỗi telemetry update.

## Bảo mật WebView/PWA

Cần làm trước khi mở rộng native bridge:
- Strict allowlist origin cho WebView navigation.
- CSP cho frontend, giảm rủi ro XSS vì WebView có bridge.
- Bridge methods phải có capability check, chỉ expose khi authenticated và same trusted origin.
- Không inject token bằng string JS thuần nếu có thể thay bằng secure cookie/handshake bridge có nonce.
- External link nên mở browser ngoài, không load trong WebView có bridge.
- PWA cache không lưu access token, raw telemetry nhạy cảm, user export.

## Kế hoạch triển khai đề xuất

### Phase 1 - Mobile shell UX baseline

- Thêm mobile bottom nav trong dashboard layout cho compact width.
- Đặt default mobile landing sau login về `/dashboard/operations/map`.
- Giảm header mobile: hamburger/back, title ngắn, notification.
- Kiểm tra safe area, `100dvh`, không horizontal scroll ở 360/375/390/414px.

### Phase 2 - Operations map mobile polish

- Map overlay có collapsed/expanded.
- Device drawer sticky filter + list scroll.
- Critical alert treatment trên selected vehicle.
- Tap targets 44px cho controls, gap 8px.
- Test map pinch/pan không xung đột bottom sheet.

### Phase 3 - Attention + Fleet mobile lists

- Alert/violation/maintenance card layout chuẩn.
- Fleet search-first list.
- Detail pages chuyển sang mobile-friendly route/sheet.
- Bulk/admin actions đưa vào overflow hoặc ẩn nếu không phù hợp mobile.

### Phase 4 - PWA + WebView hardening

- Web app manifest + app icons.
- Service worker app-shell cache + offline fallback.
- FCM/native notification bridge rule.
- CSP + bridge nonce/allowlist review.

### Phase 5 - Verification

- Playwright mobile screenshots: 360x740, 375x812, 390x844, 414x896, 768x1024, 1024x768.
- Lighthouse mobile/Core Web Vitals budget.
- Manual WebView test Android: login, back, reload, offline, reconnect, push, map gestures.
- Accessibility smoke: keyboard, screen reader labels, aria-pressed, focus trap trong sheets.

## Acceptance criteria

- Mobile first screen vào map trong <=2.5s LCP ở local/prod-like network budget.
- Không có horizontal scroll ở compact width.
- Tất cả frequent controls >=44x44px.
- Bottom nav có tối đa 4 item, label ngắn, icon rõ.
- Map pan/zoom được, chọn marker được, mở list được, đóng sheet không che controls chính.
- Alerts/fleet/trips mobile không dùng table ngang làm UI chính.
- WebView không load untrusted origin; bridge không expose khi không tin cậy.
- Offline/reconnect có state rõ: "Đang mất kết nối", "Đang đồng bộ lại", "Thử lại".

## Quyết định đề xuất

**Chốt hướng:** `Tracking_Frontend` là canonical mobile web UI; `Tracking_Mobile` là native shell.  
**Ưu tiên đầu:** `/dashboard/operations/map` + `/dashboard/attention/queue`.  
**Không làm ngay:** native Flutter rewrite, route mobile tách riêng, offline-first telemetry database.

## Câu hỏi còn mở

- Mobile user chính là quản trị viên, điều phối viên, hay tài xế/kỹ thuật viên hiện trường?
- Có cần tài xế xem app riêng với role hạn chế không?
- Mobile có bắt buộc chạy offline bao lâu, hay chỉ cần offline fallback/reconnect?
- Push notification rule: cảnh báo nào được đẩy native, ngưỡng severity nào?
- Có yêu cầu store release cho Flutter shell, hay PWA/browser là đủ trong giai đoạn tiếp?
