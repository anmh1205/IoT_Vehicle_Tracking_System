# UI/UX Audit Phase C — Accessibility deep audit (mobile web + Flutter WebView)

- Project: IoT Vehicle Tracking System
- Date: 2026-03-13
- Scope: `Tracking_Frontend` + `Tracking_Mobile`
- Based on: Phase A+B report `plans/reports/ui-ux-audit-260313-1957-phase-a-b-mobile-web.md`

## Method

- Static code audit focused on a11y: accessible name, form label, keyboard/focus, live region, semantics, touch target proxy (code-level).
- Reference checklist: WCAG AA practical + UI/UX Pro Max accessibility domain.
- Note: no runtime screen-reader session in this phase (TalkBack/VoiceOver pending).

---

## C1) Deep findings (accessibility)

### Summary

- P0: 3
- P1: 6
- P2: 4

### Findings table

| ID | Sev | Area | Finding | Evidence | Impact | Fix direction |
|---|---|---|---|---|---|---|
| C-01 | P0 | Icon button accessible name | Bell icon button thiếu accessible name | `Tracking_Frontend/src/features/notifications/components/notification-badge.tsx:8` | SR user không biết nút gì | Add `aria-label` rõ nghĩa (ví dụ “Mở thông báo”) |
| C-02 | P0 | Keyboard accessibility | Card clickable bằng `onClick` trên `<div>` nhưng không keyboard-focusable/operable | `Tracking_Frontend/src/features/devices/components/device-card.tsx:15` | Keyboard user không mở được device card | Chuyển thành `<button>`/`<a>` semantic hoặc thêm role+tabIndex+onKeyDown |
| C-03 | P0 | Keyboard accessibility | List row clickable bằng `label` + cursor pointer, không keyboard interaction rõ ràng | `Tracking_Frontend/src/features/simulator/components/device-selector.tsx:47` | Người dùng keyboard khó chọn row ổn định | Dùng control semantic rõ (button/checkbox wrapper chuẩn) |
| C-04 | P1 | Focus order/efficiency | Chưa có skip-link cho layout dashboard nav-heavy | `Tracking_Frontend/src/app/layout.tsx:16`, `Tracking_Frontend/src/components/ui/sidebar.tsx:272` | Keyboard user tab qua nhiều item trước khi tới nội dung | Thêm “Bỏ qua đến nội dung chính” link |
| C-05 | P1 | Touch target + a11y motor | Sidebar trigger `size-7` (~28px) dưới chuẩn thao tác mobile | `Tracking_Frontend/src/components/ui/sidebar.tsx:235` | Người dùng run tay/low dexterity dễ bấm trượt | Tăng hit area >=44x44 |
| C-06 | P1 | Touch target + a11y motor | Nút map controls 32x32 (`h-8 w-8`) nhỏ cho mobile | `Tracking_Frontend/src/features/map/components/map-controls.tsx:55` | Mis-tap cao khi thao tác bản đồ | Tăng target >=44x44 hoặc tách mobile variant |
| C-07 | P1 | Touch target + a11y motor | Pagination icon buttons 32x32 | `Tracking_Frontend/src/features/system-admin/components/data-table/pagination.tsx:15` | Giảm usability trên mobile/tablet | Tăng target size |
| C-08 | P1 | Dynamic error announcement | Login error text inline dùng `<p>` (không live-region), có thể không được SR announce ngay | `Tracking_Frontend/src/features/auth/components/login-form.tsx:73`, `:95` | User SR bỏ lỡ lỗi theo field | Bọc message bằng region có `aria-live=polite`/`role=alert` theo field |
| C-09 | P1 | Icon-only controls labeling | Nhiều icon buttons map controls không thấy `aria-label` | `Tracking_Frontend/src/features/map/components/map-controls.tsx:55` | SR đọc nút mơ hồ | Add per-action label (zoom in/out, fit bounds, fly to selected) |
| C-10 | P2 | Mobile responsive + readability | Popover thông báo width cố định `w-96` dễ gây clipping ở 375px | `Tracking_Frontend/src/features/notifications/components/notification-dropdown.tsx:42` | Ảnh hưởng đọc nội dung + focus trap khó chịu | Dùng width responsive / mobile sheet |
| C-11 | P2 | Language consistency (assistive UX) | Mobile app error/retry tiếng Anh, không đồng nhất locale VI | `Tracking_Mobile/lib/features/webview/webview_screen.dart:61`, `:190`, `Tracking_Mobile/lib/widgets/error_view.dart:43` | Người dùng VN + SR nghe text mixed language | Localize message + button label |
| C-12 | P2 | Flutter semantics | Loading/Error widgets chưa thêm `Semantics` labels rõ ràng | `Tracking_Mobile/lib/widgets/loading_indicator.dart:14`, `error_view.dart:19` | SR context nghèo (đặc biệt lúc loading dài) | Add Semantics(label, live region intent) |
| C-13 | P2 | Viewport robustness | Dùng `h-[calc(100vh-4rem)]` ở map/page container có thể lệch trên mobile browser chrome | `Tracking_Frontend/src/app/dashboard/map/page.tsx:18`, `Tracking_Frontend/src/components/layout/PageContainer.tsx:53` | Focus area + visible region có thể nhảy | Cân nhắc `dvh`/layout strategy mobile-safe |

---

## C2) Checks passed

- Login fields có label `htmlFor` đúng: `Tracking_Frontend/src/features/auth/components/login-form.tsx:71`, `:78`.
- Password toggle có `aria-label`: `Tracking_Frontend/src/features/auth/components/login-form.tsx:90`.
- Mode toggle có sr-only label: `Tracking_Frontend/src/components/mode-toggle.tsx:19`.
- Sidebar sheet có title/description cho SR: `Tracking_Frontend/src/components/ui/sidebar.tsx:171`.
- Table loading có `role=status` + `aria-live=polite`: `Tracking_Frontend/src/components/common/data-table.tsx:85`.

---

## C3) Priority recommendation

1. **Wave A (blocker accessibility):** C-01, C-02, C-03.
2. **Wave B (high impact mobile + keyboard):** C-04, C-05, C-06, C-07, C-08, C-09.
3. **Wave C (polish + localization + semantics):** C-10, C-11, C-12, C-13.

---

## C4) Suggested acceptance criteria for next fix phase

- All icon-only interactive elements have explicit accessible name.
- All clickable non-semantic containers removed or made fully keyboard-operable.
- Mobile touch target >=44x44 for primary controls.
- Error/validation updates announced to SR in context.
- TalkBack + VoiceOver smoke test passes on login/map/devices/notification flows.

---

## Unresolved questions

1. Release target có bắt buộc WCAG 2.1 AA compliance formal hay “best effort AA”?
2. Có chấp nhận chuyển một số card từ `div onClick` sang `button` (minor style impact)?
3. Có timeline cho i18n đồng bộ VN/EN trong mobile app không?
