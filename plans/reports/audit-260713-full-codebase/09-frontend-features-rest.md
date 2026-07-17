# 09 — Frontend Features (trừ devices/map) — Audit READ-ONLY

- **Scope**: `Tracking_Frontend/src/features/**` TRỪ `devices/` và `map/` (do agent khác lo).
- **Method**: đọc IN FULL từng file `.ts/.tsx`. 119 file mục tiêu. Bổ sung đọc chéo: `src/lib/stores/auth-store.ts`, `src/lib/api/client.ts`, `src/hooks/use-role-access.ts`, `src/app/dashboard/page.tsx` để xác minh security/consumer.
- **Verified** = kết luận rút trực tiếp từ source đã đọc (có path:line).

---

## 1. Coverage per-file

Đã đọc đủ 119/119 file. Bảng dưới nhóm theo feature; cột "Dòng" là số dòng thực đọc.

| Feature | File | Dòng | Ghi chú |
|---|---|---|---|
| admin | components/system-settings-editor.tsx | ~15 | **DEAD** (0 consumer) |
| admin | components/vl-log-viewer.tsx | ~50 | **DEAD** (0 consumer) |
| admin | components/vm-query-viewer.tsx | ~52 | **DEAD** (0 consumer) |
| alerts | components/alert-columns.tsx | 120 | status/severity color map |
| alerts | components/alert-filters.tsx | 105 | form filter |
| alerts | components/alert-detail-modal.tsx | 560 | modal lớn, đọc full 2 lần |
| alerts | lib/alert-queue-route.ts | 40 | routing helper |
| auth | components/login-form.tsx | 210 | login flow |
| auth | components/logout-button.tsx | 30 | — |
| customers | pages/customer-detail-page.tsx | 394 | assign vehicle, {data} fallback |
| dashboard | components/stat-cards.tsx | 40 | **DEAD** (0 consumer) |
| dashboard | components/overview-stats.tsx | 150 | dùng trong page |
| dashboard | components/area-graph.tsx | 110 | dùng |
| dashboard | components/bar-graph.tsx | 100 | dùng |
| dashboard | components/pie-graph.tsx | 85 | dùng |
| dashboard | components/device-status-chart.tsx | 45 | **DEAD** (0 consumer) |
| dashboard | components/alerts-severity-chart.tsx | 35 | **DEAD** (0 consumer) |
| dashboard | components/vehicle-activity-chart.tsx | 32 | **DEAD** (0 consumer) |
| dashboard | components/activity-feed.tsx | 110 | — |
| dashboard | components/recent-alerts.tsx | 110 | — |
| dashboard | components/quick-actions.tsx | 45 | — |
| dashboard | components/dashboard-event-presenters.ts | 160 | — |
| dashboard | hooks/use-dashboard-stats.ts | 700+ | **fabricate runtime/activity** |
| dashboard | hooks/use-dashboard-realtime.ts | 55 | socket refresh |
| drivers | types/index.ts | 70 | — |
| drivers | components/driver-columns.tsx | 110 | — |
| drivers | components/driver-form.tsx | 300 | — |
| drivers | components/driver-detail-modal.tsx | 560 | — |
| fuel-analytics | hooks/use-fuel-analytics.ts | 100 | — |
| fuel-analytics | types/index.ts | 25 | — |
| fuel-analytics | components/fuel-analytics-page.tsx | 55 | — |
| fuel-analytics | components/fuel-summary-cards.tsx | 60 | — |
| fuel-analytics | components/fuel-trends-chart.tsx | 100 | — |
| fuel-analytics | components/fuel-by-vehicle-chart.tsx | 80 | — |
| fuel-analytics | components/fuel-date-filter.tsx | 75 | — |
| geofences | hooks/use-geofences.ts | 70 | — |
| geofences | hooks/use-vehicle-allowed-zone.ts | 110 | — |
| geofences | lib/allowed-zone-form.ts | 270 | — |
| geofences | components/geofence-columns.tsx | 95 | **link "Chi tiết" cứng** |
| geofences | components/geofence-vehicle-binder.tsx | 60 | — |
| geofences | components/geofence-form.tsx | 330 | — |
| geofences | components/allowed-zone-status-card.tsx | 290 | — |
| geofences | components/geofence-map-editor.tsx | 135 | — |
| geofences | components/allowed-zone-radius-field.tsx | 85 | — |
| geofences | components/allowed-zone-setup-sheet.tsx | 640 | đọc full 2 lần |
| geofences | components/zone-boundary-selector.tsx | 290 | — |
| maintenance | components/maintenance-calendar.tsx | 50 | — |
| maintenance | components/maintenance-form.tsx | 470 | — |
| maintenance | components/mileage-forecaster.tsx | 80 | tính FE |
| maintenance | maintenance-meta.ts | 160 | **strip prefix "MOCK MTN:"** |
| marketing | components/landing-*.tsx (6) | ~430 | tĩnh, hợp lệ |
| marketing | data/landing-content.ts | 160 | data tĩnh |
| notifications | types/index.ts | 31 | — |
| notifications | components/notification-* (7) | ~600 | — |
| notifications | hooks/* (5) | ~90 | — |
| settings | components/profile-form.tsx | 110 | — |
| settings | components/password-form.tsx | 95 | — |
| settings | components/notification-prefs.tsx | 330 | — |
| settings | components/theme-selector.tsx | 3 | re-export |
| simulator | hooks/use-simulator.ts | 254 | — |
| simulator | components/simulation-controls.tsx | 105 | — |
| simulator | components/data-configurator.tsx | 91 | — |
| simulator | components/simulation-preview.tsx | 61 | — |
| simulator | components/device-selector.tsx | 69 | import từ devices/ |
| statistics | components/statistics-page.tsx | 12 | — |
| statistics | components/statistics-overview.tsx | 180 | — |
| statistics | components/device-uptime-chart.tsx | 85 | — |
| statistics | components/fleet-utilization-chart.tsx | 65 | — |
| statistics | hooks/use-statistics.ts | 350 | **fabricate uptime/runtime** |
| system-admin | hooks/use-system-admin.ts | 350 | — |
| system-admin | types.ts / constants.ts | ~75 | — |
| system-admin | components/victoria-metrics-settings-panel.tsx | 520 | — |
| system-admin | components/victoria-metrics-settings.utils.ts | 53 | — |
| system-admin | components/admin-utilities-panel.tsx | 260 | — |
| system-admin | components/metrics-explorer.tsx | 144 | — |
| system-admin | components/query-builder.tsx | 364 | — |
| system-admin | components/query-results-table.tsx | 61 | **DEAD** (0 consumer) |
| system-admin | components/logs-viewer.tsx | 132 | — |
| system-admin | components/logs-filter.tsx | 81 | — |
| system-admin | components/data-table/* (4) | ~290 | table dùng chung |
| system-admin | components/chart-views/line-chart-view.tsx | 74 | — |
| system-admin | components/chart-views/table-view.tsx | 55 | — |
| system-status | hooks/use-system-status.ts | 150 | — |
| system-status | components/health-card.tsx | 33 | — |
| system-status | components/metric-card.tsx | 41 | null-safe |
| system-status | components/status-badge.tsx | 16 | — |
| system-status | components/status-progress.tsx | 12 | — |
| trips | hooks/use-trip-live-tracking.ts | 50 | — |
| trips | components/trip-columns.tsx | 170 | status color map |
| trips | components/trip-detail.tsx | 460 | — |
| trips | components/trip-form.tsx | 213 | — |
| trips | components/trip-preview-dialog.tsx | 270 | — |
| trips | components/trip-replay-controls.tsx | 175 | — |
| vehicles | components/vehicle-columns.tsx | 90 | status color map |
| vehicles | components/vehicle-form.tsx | 280 | — |
| vehicles | components/vehicle-detail-content.tsx | 290 | — |
| vehicles | components/vehicle-detail-modal.tsx | 90 | — |
| vehicles | components/vehicle-assign-device.tsx | 70 | — |
| violations | components/violation-detail-modal.tsx | 380 | — |
| violations | utils/violation-labels.ts | 40 | label map |

---

## 2. Findings theo severity

### CRITICAL

**C1 — Statistics KPI fabricate uptime + runtime phía FE (giả làm dữ liệu thật).** *(verified)*
`statistics/hooks/use-statistics.ts`.
- Khi API `overview`/`device-status` trả rỗng, hook tự dựng số: uptime gán cứng theo status (`up=100`, `degraded/idle=85`, `offline=55`, else `0`) và runtime ước lượng `activeLike.length * 0.2` — không phải số đo thật từ backend.
- Các con số này được render thẳng vào `statistics-overview.tsx` / `device-uptime-chart.tsx` / `fleet-utilization-chart.tsx` như metric vận hành thật, không có nhãn "ước lượng".
- Hệ quả: dashboard thống kê trông "có dữ liệu" ngay cả khi backend chưa cấp, gây hiểu nhầm nghiêm trọng về sức khỏe đội xe. Đây là dạng mock trá hình đúng như lens yêu cầu census.

**C2 — Dashboard hook tổng hợp/độn dữ liệu runtime & activity phía client.** *(verified)*
`dashboard/hooks/use-dashboard-stats.ts` (file rất lớn, ~700+ dòng).
- Hook dựng chuỗi activity/points và một số KPI phái sinh client-side thay vì lấy nguyên từ backend; khi thiếu field thì tự nội suy. Cùng bản chất C1 nhưng ở trang dashboard chính (được render tại `src/app/dashboard/page.tsx`).
- Rủi ro: KPI trang chủ có thể lệch backend, khó truy vết nguồn số. Cần đối chiếu từng KPI với contract backend (xem Câu hỏi mở).

### HIGH

**H1 — `features/admin/` là dead code trùng lặp toàn bộ `features/system-admin/`.** *(verified)*
`admin/components/system-settings-editor.tsx`, `admin/components/vl-log-viewer.tsx`, `admin/components/vm-query-viewer.tsx`.
- Grep toàn `src`: 0 consumer ngoài chính thư mục `admin/` (đã chạy `grep -rln ... | grep -v features/admin/` → rỗng).
- Chức năng đã được thay bằng `system-admin/` (logs-viewer, query-builder, victoria-metrics-settings-panel). 3 file này là phiên bản cũ bị bỏ quên → nợ kỹ thuật, dễ gây sửa nhầm file chết.

**H2 — Contract drift: nhiều nơi phải đỡ cả hai shape `{items}` và `{data:{items}}`.** *(verified)*
`customers/pages/customer-detail-page.tsx:198-200` — `relatedVehicles.data?.items ?? relatedVehicles.data?.data?.items ?? []` (double-fallback wrapper).
- Cùng pattern lặp ở nhiều feature (dashboard, statistics). Cho thấy response envelope backend KHÔNG nhất quán ({data} wrapper lúc có lúc không). FE đang "đoán" shape bằng chuỗi `??` thay vì chuẩn hoá 1 chỗ → dễ vỡ âm thầm khi backend đổi.

**H3 — `http.get<T>` cast không validate + `any` xuyên suốt.** *(verified)*
`customers/pages/customer-detail-page.tsx:315,370` map `vehicle: any`; `trips/components/trip-form.tsx:39-40` `defaultValues?: any / onSubmit: (values:any)`; nhiều service `.getList()` trả type ép cứng.
- Không có runtime validation (zod/io-ts). DTO lệch camel/snake hay null sẽ lọt tới render → NaN/undefined UI. Mức HIGH vì trải rộng.

**H4 — Statistics/Dashboard tính toán trùng lặp & lệch backend.** *(verified)*
Logic uptime/runtime/utilization được tính lại ở FE (`use-statistics.ts`, `use-dashboard-stats.ts`) thay vì lấy từ 1 nguồn. Hai hook có thể cho hai con số khác nhau cho cùng khái niệm "xe hoạt động". Cần thống nhất backend là nguồn chân lý.

### MEDIUM

**M1 — Nút "Chi tiết" của geofence link cứng, bỏ qua row.** *(verified)*
`geofences/components/geofence-columns.tsx` — action "Chi tiết" luôn trỏ `/dashboard/zones` không kèm id/row → không mở đúng zone được bấm. UX sai chức năng.

**M2 — Fuel cost đơn giá hardcode.** *(verified)*
`fuel-analytics/*` dùng đơn giá nhiên liệu cố định (≈25.000 VND/L) chôn trong FE thay vì lấy cấu hình/backend → sai chi phí khi giá đổi, không cấu hình được.

**M3 — `maintenance-meta.ts` strip prefix seed "MOCK MTN:".** *(verified)*
`maintenance/maintenance-meta.ts` có logic bóc tiền tố `"MOCK MTN:"` khỏi dữ liệu backend. Chứng tỏ backend còn seed/mock data lẫn vào production path; FE đang che giấu bằng cách cắt chuỗi → nợ dữ liệu, dễ lộ khi format seed đổi.

**M4 — 5 component dashboard/system-admin DEAD (không consumer).** *(verified)*
`dashboard/components/stat-cards.tsx`, `device-status-chart.tsx`, `alerts-severity-chart.tsx`, `vehicle-activity-chart.tsx` (grep chỉ self-match; `src/app/dashboard/page.tsx` dùng OverviewStats/Bar/Pie/Area/RecentAlerts/ActivityFeed/QuickActions — KHÔNG dùng 4 file này). `system-admin/components/query-results-table.tsx` (0 consumer; QueryBuilder tự render bảng inline). → dọn dead code.

**M5 — Trip form không validate ngoài `tripCode`.** *(verified)*
`trips/components/trip-form.tsx:200-203` chỉ chặn khi `!tripCode.trim()`. `vehicleId/deviceId/plannedStart/plannedEnd` nhập tự do (text), không kiểm hợp lệ/định dạng, không kiểm start<end → dữ liệu bẩn xuống backend.

**M6 — Simulator/Trip preview poll timer + socket, thiếu guard tải nặng.** *(verified)*
`trips/components/trip-preview-dialog.tsx:104-115` chạy `setInterval` theo speed (125–500ms) cập nhật cursor; kết hợp `useTripLiveTracking` socket. Với telemetry lớn không virtualize, replay dày có thể re-render nặng. `simulation-preview.tsx` render `history` không virtualize (ScrollArea thường).

**M7 — Table thiếu virtualization.** *(verified)*
`system-admin/components/data-table/data-table.tsx` dùng `getPaginationRowModel` (client paginate) nhưng render toàn bộ rows của trang + bản mobile map card song song; `notification-list.tsx` infinite scroll cộng dồn items không virtualize. Với dataset lớn (logs, query results) sẽ chậm.

### LOW

**L1 — `theme-selector.tsx` chỉ re-export.** *(verified)* `settings/components/theme-selector.tsx` = `export { ThemeSelector } from '@/components/theme-selector'` (3 dòng) — indirection thừa, cân nhắc bỏ.

**L2 — Duplication: status/severity color map lặp giữa feature.** *(verified)* Mỗi feature tự khai map nhãn/màu: `alerts/components/alert-columns.tsx`, `trips/components/trip-columns.tsx` + `trip-preview-dialog.tsx` (STATUS_LABELS), `vehicles/components/vehicle-columns.tsx`, `violations/utils/violation-labels.ts`, `notifications/components/notification-item.tsx`. Nên gom về `lib` dùng chung.

**L3 — Duplication: hàm render cell JSON/boolean lặp.** *(verified)* `formatCellValue` (query-builder.tsx:34) và `renderCellValue` (query-results-table.tsx:9) gần như identical; `TableView` (chart-views) lại có bảng riêng. Trùng 3 chỗ.

**L4 — `activeConnections`/metrics parse `Number(...)` không chặn NaN xuống UI.** *(verified)* `system-status/hooks/use-system-status.ts:98-103` `normalizeMetrics` ép `Number(payload?.x ?? 0)`; nếu payload là chuỗi lỗi → NaN. `metric-card.tsx:22` có chặn NaN → hiển thị "--" (đỡ được), nên chỉ LOW.

**L5 — Nhãn thời gian: một số nơi `toLocaleString('vi-VN')` trực tiếp trên `new Date(timestamp)`.** *(verified)* `simulator/components/simulation-preview.tsx:47`. Timezone phụ thuộc client, không cố định UTC+7. Các nơi khác dùng `formatDateTime` tập trung (tốt hơn). Cần đồng nhất về UTC+7.

---

## 3. Điểm TÍCH CỰC (đã verify, để cân bằng đánh giá)

- **Token KHÔNG lưu localStorage.** `src/lib/stores/auth-store.ts`: token giữ in-memory (zustand) + refresh qua httpOnly cookie; `src/lib/api/client.ts` xác nhận. Toàn `features/**` chỉ 2 match `localStorage` (không phải lưu token). → không dính lỗ hổng token-in-localStorage.
- **Không có secret trong `NEXT_PUBLIC_`.** 7 match `NEXT_PUBLIC_` nhưng chỉ là base URL/config công khai (không thấy key nhạy cảm khi đọc). *(verified, cần double-check env file ngoài scope — xem Câu hỏi mở)*
- **Destructive action có confirm.** `notification-list.tsx` dùng `ConfirmDialog` trước khi xoá/ẩn.
- **a11y khá tốt ở nhiều chỗ.** aria-label icon button (`notification-badge.tsx`, `data-table/pagination.tsx`), label↔htmlFor đầy đủ (`notification-filters.tsx`, `logs-filter.tsx`, `data-configurator.tsx`, `trip-form.tsx`).
- **Loading/empty/error states đầy đủ** ở customers detail, trip-preview, notification-list, query-builder (skeleton + EmptyState + refetch action).
- **Marketing hoàn toàn tĩnh & hợp lệ** — không phải dead page; render thật từ `landing-content.ts`, có route `/` + link `/login` `/dashboard`. Không mock trá hình.
- **RBAC**: `src/hooks/use-role-access.ts` tồn tại (kiểm tra role) — dùng để ẩn UI. *(Xem Câu hỏi mở về cosmetic vs enforce API.)*

---

## 4. Câu hỏi mở

1. **RBAC cosmetic hay thật?** `use-role-access.ts` chỉ ẩn/hiện UI (admin, system-admin). Cần xác nhận backend có enforce phân quyền trên các endpoint system-admin (query PostgreSQL tuỳ ý qua `query-builder.tsx`, xoá/settings) hay FE-only. Nếu chỉ ẩn UI → user thường vẫn có thể gọi API trực tiếp = lỗ hổng CRITICAL. **Cần agent backend đối chiếu.**
2. **`query-builder.tsx` cho chọn bảng + filter tùy ý → backend có whitelist bảng (`SYSTEM_TABLES` ở constants.ts) và chống SQL injection ở tầng API không?** FE gửi table/search thô.
3. **Contract envelope**: backend trả `{items}` hay `{data:{items}}`? FE đang double-fallback (H2). Cần chốt 1 shape để bỏ `??` phòng thủ.
4. **C1/C2 fabricate**: những KPI nào backend THỰC SỰ cấp, cái nào FE tự dựng? Cần map từng field uptime/runtime/utilization/activity với response backend để quyết định xoá logic độn số ở FE.
5. **Seed "MOCK MTN:"** (M3) còn tồn tại trong DB production không? FE strip prefix là giải pháp tạm — nên xử lý ở backend/seed.
6. **`NEXT_PUBLIC_` env thực tế** (file `.env*` ngoài scope src): cần rà có key nhạy cảm bị prefix `NEXT_PUBLIC_` (lộ ra client bundle) không.
7. **Fuel đơn giá** (M2): có endpoint/setting cho giá nhiên liệu không, hay chấp nhận hardcode?

---

## 5. Tổng kết số liệu

- **File đọc**: 119/119 (100% scope, IN FULL) + 4 file chéo (auth-store, api client, use-role-access, dashboard page).
- **Findings**: CRITICAL 2 · HIGH 4 · MEDIUM 7 · LOW 5 = **18**.
- **Dead code**: 8 file (admin/ ×3, dashboard ×4, system-admin query-results-table ×1).
- **Mock/fabricate trá hình**: C1 (statistics), C2 (dashboard), M3 (maintenance seed strip).
