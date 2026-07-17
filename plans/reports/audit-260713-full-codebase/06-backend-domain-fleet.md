# Audit 06 — Backend Domain (nửa sau iot→zone) + shared/config/types

- Phạm vi: `Tracking_Backend/src/domain/{iot,maintenance,notification,simulator,statistics,system,system-admin,telemetry,trip,validation-error,vehicle,violation,zone}` + `src/shared/**` + `src/config/**` + `src/types/**`
- Phương pháp: đọc IN FULL từng file `.ts` nguồn (không sampling). Test file (`*.test.ts`) chỉ liệt kê, không audit sâu (ngoài lens correctness nguồn).
- Mọi finding = `path:line` + severity. "verified" = xác nhận trực tiếp từ source.
- `domain/iot`: **RỖNG** — chỉ có thư mục `services/` không chứa file nào. Xác nhận không có code.

---

## Bảng coverage per-file

| File | Dòng | Đọc full | Ghi chú |
|---|---:|:---:|---|
| domain/iot/services/ | 0 | ✔ | Thư mục rỗng, không có `.ts` |
| domain/maintenance/services/maintenance-crud.service.ts | 125 | ✔ | CRUD, xử lý undefined-table |
| domain/maintenance/services/maintenance-list.service.ts | 64 | ✔ | Duplicate sanitizer |
| domain/maintenance/types/maintenance.types.ts | 66 | ✔ | DTO |
| domain/maintenance/repositories/maintenance.repository.ts | 154 | ✔ | SQL param hoá OK |
| domain/notification/repositories/notification.repository.ts | 217 | ✔ | Query LIMIT-less |
| domain/notification/services/notification.service.ts | 158 | ✔ | Phân trang in-memory |
| domain/simulator/services/simulator.service.ts | 936 | ✔ | Global state, auth_token swap |
| domain/simulator/types/simulator.types.ts | 44 | ✔ | DTO |
| domain/statistics/services/statistics.service.ts | 162 | ✔ | parse date UTC |
| domain/statistics/repositories/statistics.repository.ts | 301 | ✔ | DATE_TRUNC UTC, uptime overcount |
| domain/statistics/types/statistics.types.ts | 52 | ✔ | DTO |
| domain/system/services/system-status.service.ts | 348 | ✔ | Health checks, cpu loadavg |
| domain/system-admin/services/system-admin.service.ts | 1399 | ✔ | VM settings + idempotency + tx |
| domain/system-admin/repositories/victoriametrics.repository.ts | 77 | ✔ | fetch no timeout, PromQL interp |
| domain/system-admin/repositories/victorialogs.repository.ts | 36 | ✔ | JSON.parse per-line uncaught |
| domain/system-admin/types/system-admin-vm-settings.types.ts | 135 | ✔ | DTO |
| domain/telemetry/services/telemetry-history.service.ts | 141 | ✔ | LIMIT 10000 |
| domain/trip/services/trip-waypoints.service.ts | 214 | ✔ | Haversine, PromQL interp |
| domain/trip/types/trip.types.ts | 88 | ✔ | DTO |
| domain/trip/repositories/trip.repository.ts | 201 | ✔ | CRUD, sort allowlist OK |
| domain/trip/services/trip-crud.service.ts | 153 | ✔ | Duplicate sanitizer |
| domain/trip/services/trip-list.service.ts | 51 | ✔ | Duplicate sanitizer |
| domain/trip/services/trip-auto.service.ts | 73 | ✔ | Check-then-act race |
| domain/validation-error/services/validation-error.service.ts | 45 | ✔ | OK |
| domain/validation-error/repositories/validation-error.repository.ts | 68 | ✔ | OK |
| domain/validation-error/types/validation-error.types.ts | 50 | ✔ | DTO |
| domain/vehicle/services/vehicle-status.service.ts | 183 | ✔ | `void pool` dead import |
| domain/vehicle/types/vehicle.types.ts | 96 | ✔ | DTO |
| domain/vehicle/services/vehicle-list.service.ts | 56 | ✔ | Duplicate sanitizer |
| domain/vehicle/services/vehicle-crud.service.ts | 110 | ✔ | audit userId=0 |
| domain/vehicle/services/vehicle-assignment.service.ts | 72 | ✔ | Duplicate sanitizer |
| domain/vehicle/repositories/vehicle.repository.ts | 231 | ✔ | CRUD |
| domain/violation/services/violation-crud.service.ts | 100 | ✔ | Không idempotency |
| domain/violation/services/violation-list.service.ts | 45 | ✔ | OK |
| domain/violation/repositories/violation.repository.ts | 114 | ✔ | COALESCE detected_at vô nghĩa |
| domain/violation/types/violation.types.ts | 73 | ✔ | DTO |
| domain/zone/repositories/zone-boundary.repository.ts | 132 | ✔ | PostGIS, ANY() OK |
| domain/zone/repositories/vehicle-zone.repository.ts | 231 | ✔ | upsert ON CONFLICT |
| domain/zone/services/vehicle-zone.service.ts | 218 | ✔ | circle build order OK |
| domain/zone/services/zone-boundary.service.ts | 51 | ✔ | OK |
| domain/zone/types/zone.types.ts | 126 | ✔ | DTO |
| shared/utils/zone-geometry.util.ts | 61 | ✔ | GeoJSON [lon,lat] |
| shared/utils/geo.util.ts | 80 | ✔ | pointInPolygon [lat,lon] — mismatch tiềm ẩn |
| shared/utils/postgres-error.util.ts | 17 | ✔ | OK |
| shared/utils/errors.util.ts | 77 | ✔ | OK |
| shared/utils/response.util.ts | 55 | ✔ | OK |
| shared/utils/async-handler.util.ts | 9 | ✔ | OK |
| shared/utils/crypto.util.ts | 6 | ✔ | sha256 token hash |
| shared/serializers/problem-details.serializer.ts | 69 | ✔ | RFC7807 OK |
| shared/serializers/success-response.serializer.ts | 13 | ✔ | OK |
| shared/contracts/problem-details.contract.ts | 16 | ✔ | OK |
| shared/contracts/api-response.contract.ts | 9 | ✔ | OK |
| shared/types/common.types.ts | 19 | ✔ | Roles |
| config/env.ts | 88 | ✔ | Secret qua env, OK |
| config/sentry.ts | 27 | ✔ | OK |
| types/express.d.ts | 10 | ✔ | Augment |
| *test files* (vehicle-status, trip-waypoints, system-admin.service...) | — | skim | Không audit sâu |

---

## Findings theo severity

### HIGH

**H1 — Simulator để lộ device auth_token / lock-out thiết bị khi crash** · `domain/simulator/services/simulator.service.ts:843-852, 482-504, 506-560` · verified
- `startSimulation` GHI ĐÈ `devices.auth_token` bằng hash token giả lập (`simulatorAuthTokenHash`) cho mọi device, và CHỈ khôi phục `originalAuthToken` trong `restoreSimulatorAuthTokens` khi stop **graceful** (line 560, 870).
- Nếu process crash / bị kill / restart giữa lúc chạy → `auth_token` trong DB kẹt ở giá trị giả lập ⇒ **thiết bị thật không xác thực được nữa** (mất kết nối vĩnh viễn tới khi can thiệp thủ công). Đây là data-integrity + availability risk nghiêm trọng.
- Ngoài ra `restoreSimulatorAuthTokens` chỉ `UPDATE ... WHERE auth_token = simulatorHash` — nếu device đã ghi token khác trong lúc đó thì không phục hồi.

**H2 — Simulator dùng state toàn cục 1 process (không an toàn khi scale ngang)** · `simulator.service.ts:84-85, 881` · verified
- `runningSimulation` / `lastSnapshot` là biến module-level. Nếu backend chạy >1 instance (K8s/replica), mỗi process có state riêng: start/stop/status không đồng bộ, có thể 2 instance cùng chiếm device, cùng swap auth_token → nhân đôi H1. Không có lock phân tán / cột trạng thái trong DB.

### MEDIUM

**M1 — Timezone UTC vs UTC+7: DATE_TRUNC bucket sai ranh giới ngày** · `domain/statistics/repositories/statistics.repository.ts:12-14, 50, 154, 220` · verified
- Bucket dùng `DATE_TRUNC('day'|'week'|'month', ts)` theo timezone của session Postgres (thường UTC). Với nghiệp vụ VN (UTC+7), một chuyến/alert lúc 06:00 sáng giờ VN (23:00 UTC hôm trước) bị gộp sang **ngày hôm trước**. Off-by-one ngày/tháng trên toàn bộ báo cáo thống kê. Không có `AT TIME ZONE 'Asia/Ho_Chi_Minh'`.
- Kết hợp `statistics.service.ts:27-37`: filter `to` date-only set `23:59:59.999Z` (UTC) — lệch 7h so với cuối ngày local.

**M2 — DeviceUptime overcount: SUM(uptime) không clamp vào range** · `statistics.repository.ts:93-131` · verified
- Join lấy mọi session giao với `[from,to]` (line 111-114) nhưng `SUM(s.uptime)` / `EXTRACT(EPOCH ... session_end - session_start)` tính **toàn bộ** thời lượng session, kể cả phần nằm ngoài range. `uptimePercent` bị đội lên (đã `Math.min(...,100)` che), `downHours` bị ép về 0 (`Math.max(...,0)`). Số liệu uptime không phản ánh đúng cửa sổ thời gian.

**M3 — TripSummary avg_duration dùng NOW() cho trip chưa kết thúc** · `statistics.repository.ts:223` · verified
- `AVG(EXTRACT(EPOCH FROM (COALESCE(actual_end, NOW()) - COALESCE(actual_start, planned_start, created_at))) / 60)` — trip đang `in_progress` (actual_end NULL) dùng NOW() ⇒ duration bị thổi phồng theo thời điểm chạy query; trip không có actual_start dùng created_at ⇒ trộn mốc không đồng nhất. Kết quả "avg duration" không ổn định giữa các lần gọi.

**M4 — FleetUsage inactive dùng tổng xe hiện tại cho mọi bucket lịch sử** · `statistics.repository.ts:52-85` · verified
- `totalVehicles = COUNT(*) FROM vehicles` (hiện tại) rồi `inactiveVehicles = total - active` cho từng bucket quá khứ. Xe mới thêm gần đây làm sai lệch số "inactive" của các ngày trong quá khứ. Ngoài ra `total` đếm cả xe không có device (không bao giờ "active") nên inactive luôn bị cộng thêm.

**M5 — Notification: query LIMIT-less + phân trang/thống kê in-memory** · `domain/notification/repositories/notification.repository.ts:167-173`, `domain/notification/services/notification.service.ts:80-98, 127-158` · verified
- `findNotificationRows` `ORDER BY a.created_at DESC` **không có LIMIT** — kéo toàn bộ alerts (kèm LATERAL join vehicles) về Node. `listNotifications` `.slice(offset, offset+limit)` sau khi load hết; `getNotificationStats` load hết rồi đếm. Với bảng alerts lớn → unbounded buffer, chậm, tốn RAM. N+1 tiềm ẩn qua LATERAL nhưng chính là vấn đề full-scan.

**M6 — markAllNotificationsRead: INSERT ... SELECT toàn bộ alerts** · `notification.repository.ts:190-203` · verified
- `INSERT INTO notification_states SELECT $1, a.id, TRUE... FROM alerts a ON CONFLICT ...` chèn/upsert một dòng cho **mọi** alert của hệ thống cho mỗi user. Ghi hàng loạt không giới hạn, tăng tuyến tính theo số alerts × user. Cân nhắc chỉ đánh dấu alerts chưa có state / trong khoảng thời gian.

**M7 — trip-auto: check-then-act race tạo trùng trip** · `domain/trip/services/trip-auto.service.ts:19-39, 61-73` · verified
- `handleIgnitionOn`: `findActiveTrip` rồi `INSERT`. Hai event ignition `on` cho cùng vehicle đến gần nhau (redelivery MQTT / bounce) ⇒ cả hai qua check `existing=null` ⇒ **2 trip in_progress**. Không có unique partial index / advisory lock. `trip_code = AUTO-<device>-<Date.now()>` cũng có thể trùng nếu 2 event cùng ms.
- Tương tự `handleIgnitionOff` không idempotent nhưng ít hại hơn.

**M8 — Violation không idempotency ⇒ double-count** · `domain/violation/services/violation-crud.service.ts:41-61`, `domain/violation/repositories/violation.repository.ts:70-94` · verified
- `createViolation` insert thẳng, không kiểm tra trùng theo `alert_id` / correlation. Nếu pipeline alert/geofence gọi lại (retry, message trùng) ⇒ tạo nhiều violation cho cùng sự kiện, kéo theo `publishEvent('stats:update')` đếm sai. Không có unique constraint được thể hiện trong code.
- `violation.repository.ts:74,92`: `detected_at COALESCE($14, NOW())` nhưng `$14 = new Date().toISOString()` luôn non-null ⇒ COALESCE vô nghĩa, `detected_at` luôn = thời điểm insert (không phải thời điểm vi phạm thực).

**M9 — VictoriaMetrics/Logs fetch không timeout + parse dễ vỡ** · `domain/system-admin/repositories/victoriametrics.repository.ts:32,60`, `domain/system-admin/repositories/victorialogs.repository.ts:13,23` · verified
- `fetch(url)` không `AbortSignal.timeout` ⇒ nếu VM/VL treo, request backend treo theo (khác với `system-status.service.ts` có timeout 3s). Resilience kém khi datastore chậm.
- `victorialogs.ts:23`: `JSON.parse(line)` từng dòng, **không try/catch** ⇒ 1 dòng NDJSON lỗi làm hỏng toàn bộ query logs.

**M10 — PromQL/query injection qua deviceId nội suy chuỗi** · `domain/trip/services/trip-waypoints.service.ts:122-125` · verified
- `tracker_telemetry_latitude{device_id="${deviceId}"}` nội suy trực tiếp `deviceId` vào PromQL. `deviceId` lấy từ DB (trip.device_id) nên rủi ro thấp hơn input người dùng, nhưng nếu device_id chứa `"}` sẽ hỏng/tiêm query. Nên escape hoặc validate.

**M11 — Audit log ghi userId=0 cho mọi thao tác vehicle** · `domain/vehicle/services/vehicle-crud.service.ts:57-62, 84-89, 104-109` · verified
- `auditLog.record({ userId: 0, ... })` hard-code — create/update/delete vehicle đều quy về user 0 thay vì actor thật (service không nhận actorId). Mất tính truy vết audit.

**M12 — activateVmSetting không thực sự áp cấu hình runtime** · `domain/system-admin/services/system-admin.service.ts:1228-1234` · verified
- "activate" chỉ `UPDATE system_settings SET updated_at = NOW()` — không đẩy config sang VictoriaMetrics/vmalert/vmauth runtime. Validation (line 1076-1154) có probe live nhưng bước activate là no-op ngoài việc ghi revision. Nguy cơ hiểu nhầm "đã kích hoạt" trong khi runtime chưa đổi. (Placeholder / thiếu tích hợp.)

### LOW

**L1 — Trùng lặp hàm sanitizer giữa nhiều file** · `trip-crud.service.ts:16-41` & `trip-list.service.ts:4-29`; `vehicle-{crud,list,assignment}.service.ts`; `maintenance-{crud,list}.service.ts` · verified
- `sanitizeTrip` / `sanitizeVehicle` / `sanitizeMaintenance` được copy-paste y hệt ở 2-3 file. DRY: nên tách 1 serializer dùng chung. Rủi ro DTO drift khi sửa 1 nơi quên nơi khác.

**L2 — `void pool` dead import** · `domain/vehicle/services/vehicle-status.service.ts:1, 182-183` · verified
- `pool` import chỉ để `void pool` suppress unused. Nên bỏ import.

**L3 — getDeviceSessionRuntimeExpression roundtrip mỗi lần gọi** · `statistics.repository.ts:28-42, 250` · verified
- Introspect `information_schema.columns` mỗi lần `getSummaryTotals` — nên cache kết quả (schema tĩnh trong runtime).

**L4 — geo.util pointInPolygon dùng [lat,lon] còn zone-geometry xuất [lon,lat]** · `shared/utils/geo.util.ts:57-80` vs `shared/utils/zone-geometry.util.ts:54` · verified
- `pointInPolygon`/`pointOnPolygonBoundary` giả định polygon `[lat,lon]`; `buildCircleGeometry` xuất GeoJSON `[lon,lat]`. Hiện `geo.util` không được gọi trong phạm vi file đã đọc, nhưng nếu ai đó ghép 2 util này sẽ đảo lat/lon. Ghi chú để tránh bẫy.

**L5 — cpuUsage luôn 0 trên Windows/loadavg=0** · `domain/system/services/system-status.service.ts:319-322` · verified
- `os.loadavg()[0]` trả 0 trên Windows ⇒ cpuUsage=0. Trên Linux container thì OK. Metric không cross-platform.

**L6 — statistics `.replace('ts', ...)` chỉ thay lần xuất hiện đầu** · `statistics.repository.ts:154, 220` · verified (hiện đúng nhưng mong manh)
- `bucketExpr.replace('ts', 'created_at')` dựa vào việc chuỗi `DATE_TRUNC('day', ts)` chỉ có 1 cụm `ts`. Đúng hiện tại nhưng nếu đổi format bucketExpr (vd thêm token chứa "ts") sẽ thay nhầm. Dùng regex `/\bts\b/` hoặc placeholder rõ ràng an toàn hơn. (getFleetUsage line 50 đã dùng `/ts/g` — không nhất quán.)

**L7 — simulator trip_code / jobId dựa Date.now() có thể trùng** · `simulator.service.ts:856`, `trip-auto.service.ts:28` · verified
- `sim-${Date.now()}` / `AUTO-${deviceId}-${Date.now()}` — 2 lời gọi cùng ms trùng ID. Rủi ro thấp, nên thêm randomUUID.

---

## Nhận xét tích cực (để cân bằng)
- SQL trong repositories phần lớn **parameter hoá đúng** ($1,$2...), sort dùng allowlist (`trip.repository.ts:16-22`, `vehicle.repository.ts:16-22`), tránh injection.
- `system-admin.service.ts`: dùng allowlist bảng (`ALLOWED_TABLES`), lọc cột nhạy cảm (`SENSITIVE_COLUMN_RE`, `password_hash`, `auth_token`), `quoteIdentifier` escape — chống injection tốt cho dynamic table query.
- Idempotency VM settings + optimistic concurrency (`expectedRevision`) + transaction (`withTransaction` BEGIN/COMMIT/ROLLBACK) triển khai nghiêm túc, xử lý unique-violation race hợp lý.
- `config/env.ts`: secret đọc từ env, `requireEnv` throw ở production — không hardcode secret.
- Notification/violation/maintenance list đều bắt `isUndefinedTableError` (42P01) trả rỗng thay vì crash — resilience tốt cho module chưa migrate.
- `errors.util` + `problem-details.serializer` tuân RFC 7807, contract-serializer khớp shape (`ProblemDetails` ↔ serializer output; `ApiSuccessResponse` ↔ `buildSuccessResponse`). **Không thấy DTO drift** giữa contracts và serializers.

---

## Câu hỏi mở
1. **Simulator auth_token swap (H1)**: có cơ chế reconcile/cron khôi phục `auth_token` khi process chết bất thường không? Có cột đánh dấu "device đang bị simulator chiếm" để phục hồi sau restart? Simulator có được phép chạy trên môi trường có device thật không?
2. **Đơn vị thời gian VN**: toàn hệ thống có convention timezone chưa? Postgres session timezone là UTC hay Asia/Ho_Chi_Minh? Báo cáo statistics kỳ vọng ranh giới ngày theo giờ VN — cần `AT TIME ZONE` (xem M1).
3. **Idempotency telemetry/violation**: có unique constraint `violations(alert_id)` hoặc dedup theo correlation_id ở tầng DB không (M8)? Pipeline alert có at-least-once delivery không?
4. **trip-auto race (M7)**: có partial unique index `trips(vehicle_id) WHERE status='in_progress'` ở migration không? (Không thấy trong code, cần xác nhận schema.)
5. **activateVmSetting (M12)**: bước "activate" có tích hợp đẩy config sang VM runtime ở nơi khác (worker/cron) không, hay thực sự chỉ là ghi DB?
6. **Notification scale (M5/M6)**: số alerts kỳ vọng ~ bao nhiêu? Nếu lớn cần LIMIT + phân trang tại SQL và giới hạn markAll theo thời gian.
7. **`fuel_used_liters` / cost trip**: `trip.types` có field nhưng `endTrip`/`computeRouteSummary` không tính fuel/cost — có phải tính ở nơi khác hay là dead field?
