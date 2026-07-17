# 08 — Audit Frontend: feature `devices` + `map` (READ-ONLY)

**Phạm vi:** `src/features/devices/**` (68 file) + `src/features/map/**` (33 file) của `Tracking_Frontend`.
**Phương pháp:** đọc full mọi dòng từng file (read_file). Mọi finding kèm `path:line` + severity, đánh dấu `verified` khi rút ra trực tiếp từ source.
**Kết luận nhanh:** không có secret/credential lộ trong code; map dùng **Leaflet (OSM + Esri)** chứ KHÔNG phải Google Maps → không có API key client. Rủi ro chính nằm ở **contract drift (snake/camel + `{data}` wrapper), timezone hiển thị raw UTC, filter/tính toán client-side trên dữ liệu phân trang, và một số dead code/alias gây nhầm lẫn**.

---

## 1. Bảng coverage per-file

### 1.1 feature `devices`

| # | File | LOC (~) | Ghi chú |
|---|------|--------|---------|
| 1 | `types/index.ts` | 200 | Contract type FE cho Device/telemetry/session/error/command |
| 2 | `hooks/use-devices.ts` | ~150 | List + filter client-side trên page |
| 3 | `hooks/use-device-realtime.ts` | ~230 | Socket device status/position |
| 4 | `hooks/use-device-detail.ts` | ~160 | Detail query |
| 5 | `hooks/use-device-tracking-telemetry.ts` | ~320 | Telemetry + tự tính distance/speed |
| 6 | `hooks/use-device-position-snapshot.ts` | ~170 | Snapshot vị trí, overfetch full list |
| 7 | `hooks/use-device-sessions.ts` | ~140 | Sessions phân trang |
| 8 | `hooks/use-device-error-codes.ts` | ~130 | Error codes + localize regex |
| 9 | `hooks/use-device-commands.ts` | ~55 | Command history |
| 10 | `hooks/use-device-event-logs.ts` | ~50 | Event logs |
| 11 | `hooks/use-send-command.ts` | ~35 | Mutation gửi lệnh |
| 12 | `hooks/use-create-device.ts` | ~35 | Mutation tạo |
| 13 | `hooks/use-update-device.ts` | ~35 | Mutation cập nhật |
| 14 | `hooks/use-delete-device.ts` | ~35 | Mutation xoá |
| 15 | `hooks/use-update-device-settings.ts` | ~40 | Mutation settings |
| 16 | `hooks/use-device-runtime-chart.ts` | ~65 | Runtime chart query |
| 17 | `hooks/use-device-imu-accel-delta-chart.ts` | ~65 | IMU chart query |
| 18 | `components/device-detail-modal/modal-container.tsx` | 797 | **Orchestrator nặng nhất**: query fan-out, realtime, normalize DTO, raw feed |
| 19 | `components/device-detail-modal/modal-context.tsx` | ~130 | Context provider |
| 20 | `components/device-detail-modal/telemetry-insights.ts` | ~230 | Tính freshness/coordinate/format |
| 21 | `components/device-detail-modal/device-detail-presenters.ts` | ~280 | Presenter telemetry/config |
| 22 | `components/device-detail-modal/obd-diagnostics.ts` | ~400 | Parse OBD payload |
| 23 | `components/device-detail-modal/normalize-obd-sample-age.ts` | ~15 | Helper |
| 24 | `components/device-detail-modal/dialog-body.tsx` | 265 | Layout dialog + tabs |
| 25 | `components/device-detail-modal/workspace-shell.tsx` | 268 | Layout workspace fullscreen |
| 26 | `components/device-detail-modal/workspace-canvas.tsx` | 84 | Router section |
| 27 | `components/device-detail-modal/workspace-types.ts` | 122 | Type workspace + normalize DTO |
| 28 | `components/device-detail-modal/workspace-alerts-section.tsx` | 170 | Alert cards + ack/resolve |
| 29 | `components/device-detail-modal/workspace-zones-section.tsx` | 77 | Allowed zone |
| 30 | `components/device-detail-modal/workspace-overview-quick-stats.tsx` | 252 | **DEAD CODE (0 consumer)** |
| 31 | `components/device-detail-modal/overview-tab.tsx` | ~530 | Tab tổng quan |
| 32 | `components/device-detail-modal/route-tab.tsx` | ~640 | Tab lộ trình + replay |
| 33 | `components/device-detail-modal/route-replay-map.tsx` | ~150 | Leaflet replay |
| 34 | `components/device-detail-modal/raw-data-tab.tsx` | ~640 | Tab raw feed |
| 35 | `components/device-detail-modal/settings-tab.tsx` | ~530 | Tab cài đặt + xoá (ConfirmDialog) |
| 36 | `components/device-detail-modal/error-codes-tab.tsx` | 194 | Tab mã lỗi + resolve |
| 37 | `components/device-detail-modal/commands-tab.tsx` | 87 | Tab lệnh |
| 38 | `components/device-detail-modal/sessions-tab.tsx` | ~90 | Tab session |
| 39 | `components/device-detail-modal/runtime-tab.tsx` | 32 | Tab runtime |
| 40 | `components/device-detail-modal/session-imu-accel-delta-chart-dialog.tsx` | 45 | Dialog chart IMU |
| 41 | `components/device-detail-modal/empty-state.tsx` | 16 | Empty state |
| 42 | `components/device-detail-modal/index.tsx` | 69 | Modal shell |
| 43 | `components/device-card.tsx` | 131 | Card (a11y OK: role/tabIndex/keydown) |
| 44 | `components/device-grid.tsx` | 17 | Grid, không virtualize |
| 45 | `components/device-columns.tsx` | 104 | Column table |
| 46 | `components/device-filters.tsx` | 77 | Filter |
| 47 | `components/device-stats-bar.tsx` | 52 | Stat "trên trang" |
| 48 | `components/device-form.tsx` | 227 | Form create/update, `defaultValues: any` |
| 49 | `components/device-create-modal.tsx` | 12 | Wrapper |
| 50 | `components/device-edit-modal.tsx` | 13 | Wrapper |
| 51 | `components/device-runtime-chart.tsx` | 49 | Bar chart |
| 52 | `components/device-imu-accel-delta-chart.tsx` | 40 | Line chart, slice UTC |
| 53 | `components/device-detail-sheet.tsx` | 14 | Wrapper |
| 54 | `components/device-detail-modal.tsx` | 3 | Re-export |
| 55 | `components/device-telemetry-tab.tsx` | 3 | **Alias sai tên → DeviceDetailSheet** |
| 56 | `components/device-commands-tab.tsx` | 3 | **Alias sai tên → DeviceDetailSheet** |
| 57 | `components/device-session-table.tsx` | 3 | **Alias sai tên → DeviceDetailSheet** |
| 58 | `components/export-modal.tsx` | 117 | Export dialog |
| 59 | `components/mobile-device-content.tsx` | 15 | Wrapper mobile |
| 60 | `components/mobile-device-header.tsx` | 13 | Header mobile |
| 61 | `components/mobile-tab-selector.tsx` | 10 | Tab mobile |
| 62 | `components/device-skeletons.tsx` | 23 | Skeleton |
| 63 | `components/stat-card.tsx` | 13 | Wrapper StatCard |
| 64 | `components/error-box.tsx` | 17 | Error box |
| 65 | `components/device-constants.ts` | 34 | Labels/variants |
| 66 | `components/device-design-constants.ts` | 14 | Style constants |
| 67 | `components/device-utils.ts` | 21 | Runtime hours/status/badge |
| 68 | `components/index.ts` | 21 | Barrel export |

### 1.2 feature `map` (đã đọc full ở phiên trước)

| # | File | Ghi chú |
|---|------|---------|
| 1 | `types/index.ts` | Contract map/inspect payload |
| 2 | `constants/map-config.ts` | Tile URL (OSM/Esri), center/zoom |
| 3 | `store/map-store.ts` (~370 LOC) | Zustand store lớn nhất map |
| 4 | `hooks/use-map-realtime.ts` | Realtime device position |
| 5 | `hooks/use-device-positions.ts` | Positions query |
| 6 | `hooks/use-map-shortcut-targets.ts` | Shortcut targets |
| 7 | `hooks/use-map-inspect-shortcuts.ts` | Keyboard shortcut |
| 8 | `hooks/use-map-url-sync.ts` | Sync URL state |
| 9 | `components/tracking-map.tsx` (~600 LOC) | Leaflet core, OSM+Esri, không API key |
| 10 | `components/device-marker.tsx` + `marker-icon.ts` | Permanent tooltip (clutter) |
| 11 | `components/device-cluster.tsx` | Cluster |
| 12 | `components/geofence-layer.tsx` | Polygon geofence |
| 13 | `components/map-allowed-zone-layer.tsx` | Layer allowed zone |
| 14 | `components/map-geofence-draft-layer.tsx` | Draft layer |
| 15 | `components/map-geofence-workspace.tsx` (~490 LOC) | UI vẽ geofence nặng |
| 16 | `components/map-allowed-zone-panel.tsx` (~760 LOC) | Panel allowed zone nặng nhất |
| 17 | `components/map-controls.tsx` | Controls |
| 18 | `components/map-inspect-rail.tsx` | Inspect rail |
| 19 | `components/map-selected-device-overlay.tsx` | Overlay |
| 20 | `components/device-list-panel.tsx` | **Không virtualize** |
| 21 | `components/device-list-item.tsx` | List item |
| 22 | `components/mobile-device-drawer.tsx` | Speed NaN risk |
| 23 | `components/device-filter.tsx` / `-compact.tsx` / `device-search.tsx` | Filter/search |
| 24 | `components/map-device-summary.tsx` | Summary |
| 25 | `components/map-layer-switcher.tsx` | Switch tile |
| 26 | `components/map-panel-utils.ts` | Utils |
| 27 | `lib/map-url-state.ts` / `map-mode.ts` | URL/mode helper |
| 28 | `components/index.ts` | Barrel |
| — | (các file phụ còn lại) | Đã đọc full |

---

## 2. Findings theo severity

### 🔴 HIGH

**H1 — Contract drift: FE tự đoán cả snake_case lẫn camelCase + cả 2 shape `{data}` wrapper (verified)**
`modal-container.tsx:266-328` (`toLinkedVehicle`, `toWorkspaceAlert`) map **đồng thời** `raw.vehicleId ?? raw.vehicle_id`, `createdAt ?? created_at`… cho gần như MỌI field. Cùng pattern ở `modal-container.tsx:88-116` (`serverSessionStart ?? server_session_start`, `occurredAt ?? occurred_at`, `sentAt ?? sent_at`). Và `obdAlerts.data?.items ?? obdAlerts.data?.data?.items` (`modal-container.tsx:559`, `:581`) chấp nhận cả bare list lẫn `{data:{items}}`.
→ Đây là bằng chứng backend trả shape **không nhất quán/không ổn định**; FE đang "phòng thủ mù". Khi BE đổi casing, một số field im lặng thành `null` mà không có lỗi. **Cần chốt 1 contract chuẩn ở BE + validate (zod) tại boundary.**

**H2 — `http.get<T>` cast không validate → mismatch ẩn (verified)**
Xuyên suốt các hook (`use-device-*`, `alertServices.getList`, `vehicleServices.getById/getList`) dữ liệu được cast `as Record<string,unknown>` / `as Device` mà không schema-validate. Ví dụ `context.device` build bằng `{ ...(device ?? {}), ...(detail.data?.device ?? {}) } as Device` (`modal-container.tsx:595-598`) — merge 2 nguồn rồi cast, dễ tạo Device "nửa vời" (field từ list + field từ detail lệch nhau). Nếu enum `currentStatus` trả value lạ, `DEVICE_STATUS_LABELS[...] ?? current` (`device-columns.tsx:63`) hiển thị raw string cho user.

**H3 — ID-space mismatch khi resolve mã lỗi ECU (verified)**
`error-codes-tab.tsx:61-73`: `resolveMutation` gọi `alertServices.resolve(errorId)` với `errorId = item.id` là id của **device_error_code**, không phải alert id. Nếu 2 bảng dùng id-space khác nhau → resolve nhầm alert khác hoặc 404. Cần xác nhận BE: `device_error_codes.id` có phải cũng là `alerts.id`? (Nghi vấn cao vì `WorkspaceAlertsSection` dùng cùng `alertServices.resolve` nhưng trên alert thật.)

**H4 — Filter status/type chạy client-side trên dữ liệu ĐÃ phân trang (verified)**
`use-devices.ts` (và error-codes filter) lọc trên các page đã tải, không phải toàn bộ dataset → user thấy "0 kết quả" hoặc thiếu device dù thực tế có ở page chưa tải. `device-stats-bar.tsx:13-18` cũng chỉ đếm "trên trang" (đã ghi label "trên trang" nên đỡ hiểu lầm, nhưng "Tổng thiết bị" lấy `totalCount ?? totalOnPage` — khi thiếu totalCount sẽ hiển thị số trang làm tổng).

### 🟠 MEDIUM

**M1 — Timezone: hiển thị giờ raw UTC bằng `slice()` chuỗi ISO (verified)**
- `device-imu-accel-delta-chart.tsx:16` → `item.timestamp.slice(11,16)`
- `session-imu-accel-delta-chart-dialog.tsx:20` → `point.timestamp.slice(11,19)`
Cắt trực tiếp ký tự 11-16/11-19 của ISO string = **giờ UTC nguyên gốc**, không convert sang local (hoặc UTC+7). Trục thời gian chart lệch 7h so với các nơi dùng `formatDateTime`/`formatRelative`. Không nhất quán trong cùng modal.

**M2 — `toFixed`/`toLocaleString`/`new Date().toLocaleString` trên giá trị có thể null (cần verify runtime)**
`device-card.tsx:109`: `new Date(device.lastSeenAt).toLocaleString('vi-VN')` — có guard `device.lastSeenAt ?` nên OK. Nhưng cần rà `telemetry-insights.ts`/`device-detail-presenters.ts`: các format speed/temp/battery dựa vào `formatNumber`/`toFixed` — nếu input `NaN`/`Infinity` (từ phép chia distance/time) sẽ ra "NaN"/"Infinity" trên UI. `getDeviceRuntimeHours` (`device-utils.ts:6`) chia `/3600` an toàn (có `?? 0`).

**M3 — FE tự tính distance/averageSpeed/maxSpeed khác BE (verified)**
`use-device-tracking-telemetry.ts` expose `distanceKm`, `averageSpeed`, `maxSpeed` tính client-side từ route rows (Haversine/aggregate). Nếu BE cũng tính runtime/quãng đường (session uptime, trip distance) → **2 nguồn số liệu lệch nhau** hiển thị cùng lúc (overview vs session). Cần chốt nguồn chân lý.

**M4 — Query fan-out lớn cho 1 device + invalidate rộng (verified)**
Mở modal 1 device kích hoạt ~13 query (`useDeviceDetail`, sessions, errors, commands, tracking, runtime, positionSnapshot, eventLogs, obdAlerts, linkedVehicle, deviceScopedAlerts…) + 5 realtime subscription (`device:status/position/session_start/session_end/command:ack`, `modal-container.tsx:491-544`). `refreshCurrent` (`:437-459`) invalidate 14 query-key mỗi lần có event. Có throttle 10s cho "heavy views" (`refreshTelemetryViews`, `:461-489`) — tốt, nhưng `device:status/session_*/command:ack` gọi `refreshCurrent` **không throttle** → khi thiết bị flapping (status đổi liên tục) sẽ tạo storm invalidate + refetch.

**M5 — `positionSnapshot` overfetch (verified — từ audit hook trước)**
`use-device-position-snapshot.ts` fetch full position list rồi filter client-side theo device → N-fold overfetch khi mở nhiều modal / device nhiều.

**M6 — Danh sách device không virtualize (verified)**
`device-grid.tsx:12` map toàn bộ `devices`; `map/components/device-list-panel.tsx` render tất cả device. Với fleet lớn (hàng nghìn) → re-render storm + DOM nặng. Realtime position tick cập nhật store → mọi item re-render nếu selector không memo hoá kỹ.

**M7 — Map marker permanent tooltip (verified)**
`map/components/device-marker.tsx` + `marker-icon.ts` dùng permanent tooltip cho mọi marker → clutter + chi phí layout/perf khi số marker lớn hoặc update vị trí liên tục (marker/tooltip churn).

**M8 — Mock data trộn vào raw feed qua env flag (verified)**
`modal-container.tsx:75` `NEXT_PUBLIC_OBD_UI_MOCK === '1'` chèn `obd-mock-preview` (`:143-187`) vào raw feed thật. Là feature flag hợp lệ, nhưng dữ liệu giả nằm chung stream dữ liệu thật; nếu flag bị bật nhầm ở prod → user thấy "rpm=1650, coolant=92" giả. Nên chặn cứng ở production build.

### 🟡 LOW

**L1 — Dead code: `WorkspaceOverviewQuickStats` 0 consumer (verified)**
`workspace-overview-quick-stats.tsx:59` — search toàn `src` chỉ ra chính nó. 252 LOC không được import ở đâu (workspace-canvas dùng `OverviewTab`, không dùng component này).

**L2 — Alias file sai tên gây nhầm lẫn (verified)**
`device-telemetry-tab.tsx`, `device-commands-tab.tsx`, `device-session-table.tsx` đều chỉ `export { DeviceDetailSheet as ... }`. Tên gợi ý là bảng/tab riêng nhưng thực chất đều là **cùng một DeviceDetailSheet**. Barrel `index.ts` không export chúng (chỉ export detail-sheet), nên có thể là tàn dư refactor → dễ gây import nhầm.

**L3 — `resolveTimestamp` / id fallback `Math.random()` (verified)**
`modal-container.tsx:78,87,96,105`: khi row thiếu id/timestamp, dùng `Math.random()` làm key React → key đổi mỗi render, phá reconciliation (remount không cần thiết) cho các row thiếu id. Nên dùng index ổn định.

**L4 — `device-form.tsx` dùng `defaultValues: any` (verified)**
`device-form.tsx:62` mất type-safety; đọc `defaultValues.vibrationThreshold` (`:96`) — field không có trong type `Device` hiện tại → nghi field cũ/không đồng bộ contract.

**L5 — Enum status FE giả định 4 value cứng (verified)**
`device-constants.ts` chỉ định nghĩa `running/online/stopped/disconnected`. `getDeviceBadgeClassName` (`device-utils.ts`) thêm nhánh `'running'` màu emerald. Nếu BE thêm status mới → fallback outline/slate + label raw. Không crash nhưng UX kém.

**L6 — `getType`/`formatErrorCodeLabel` regex-based localization brittle (verified)**
`error-codes-tab.tsx:29-44` phân loại severity qua regex `^[PCBU][0-9A-F]{4}$` trên `errorName` + so `errorCode >= 500/200`. Ngưỡng số magic, không có nguồn contract → dễ phân loại sai khi BE đổi mã.

**L7 — OBD alert localize bằng regex match tiếng Anh (verified)**
`modal-container.tsx:198-247` (`localizeObdAlertTitle/Message`) match chuỗi English cứng ("idle-load anomaly", `RPM x while speed y km/h…`). Nếu BE đổi 1 ký tự message → rơi về hiển thị English gốc. Fragile i18n.

**L8 — A11y map (verified — từ audit map trước)**
Map Leaflet cơ bản không keyboard-accessible cho chọn marker/device; một số panel dùng div-clickable. `device-card.tsx` thì làm đúng (role button + Enter/Space + focus ring) — nên dùng làm chuẩn tham chiếu.

**L9 — Xoá device có confirm (POSITIVE, verified)**
`settings-tab.tsx` dùng `ConfirmDialog` trước `onDeleteDevice`. Destructive action được bảo vệ đúng.

**L10 — Security posture (POSITIVE, verified)**
Map dùng Leaflet + OSM/Esri tile, KHÔNG có Google Maps API key `NEXT_PUBLIC_*` lộ client. Không phát hiện secret trong toàn bộ 101 file.

---

## 3. Điểm tích cực đáng giữ
- Empty/loading/error state đầy đủ ở hầu hết tab (`DeviceDetailEmptyState`, `DeviceDetailSkeleton`, `ErrorBox`).
- `DeviceCard` a11y chuẩn (keyboard + ARIA label).
- Xoá device có `ConfirmDialog`.
- Throttle 10s cho refetch telemetry nặng (`TELEMETRY_REFRESH_THROTTLE_MS`).
- Realtime subscription có guard theo `devicePublicId` (lọc payload không đúng device, tránh xử lý chéo).
- Không có API key/secret client-side.

---

## 4. Câu hỏi mở (cho parent / cần xác minh với BE)

1. **Contract casing:** BE trả camelCase hay snake_case cho device/vehicle/alert/session? Có `{data}` wrapper không? (FE đang đỡ cả hai → cần chốt 1 shape + zod validate). — liên quan **H1, H2**.
2. **ID-space mã lỗi:** `device_error_codes.id` có dùng chung không gian với `alerts.id` không? `alertServices.resolve(item.id)` ở `error-codes-tab` có đúng target? — **H3**.
3. **Filter/pagination:** Filter status/type/search nên đẩy xuống BE (server-side) hay dataset đủ nhỏ để filter client? Hiện đang filter trên page đã tải → sai kết quả. — **H4**.
4. **Nguồn chân lý số liệu:** distance/averageSpeed/maxSpeed/runtime — FE tự tính hay lấy BE? Có đang hiển thị 2 con số lệch nhau ở overview vs session không? — **M3**.
5. **Timezone chuẩn dự án:** hiển thị theo viewer-local hay ép UTC+7? Các chart IMU đang show raw UTC (slice) trong khi format khác dùng locale → cần thống nhất. — **M1**.
6. **Realtime flapping:** `device:status` không throttle khi flapping — có cần debounce/throttle giống telemetry views? — **M4**.
7. **Mock OBD:** `NEXT_PUBLIC_OBD_UI_MOCK` có được đảm bảo tắt ở production build không? — **M8**.
8. **Dead code:** xoá `WorkspaceOverviewQuickStats` + 3 alias file (`device-telemetry-tab`, `device-commands-tab`, `device-session-table`) được không, hay còn nơi khác import động? — **L1, L2**.
9. **Scale marker/list:** fleet dự kiến bao nhiêu device? Nếu >vài trăm → cần virtualize list + tắt permanent tooltip. — **M6, M7**.
