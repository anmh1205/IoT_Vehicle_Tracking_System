# 04 — Audit Backend API + Middleware (READ-ONLY)

BASE DIR: `Tracking_Backend/src` — tầng HTTP: `api/{controllers,routes,validators,openapi}` + `middleware/**` + `index.ts`.
Stack: Node/Express + TypeScript, PostgreSQL (raw SQL qua `pg` pool), Zod validators, session-token auth (cookie + Bearer).
Phương pháp: đọc IN FULL từng file (line-verified). Findings có `path:line` + severity. `verified` = xác nhận trực tiếp từ source.

---

## Bảng coverage per-file

### Middleware (7 file, gồm 1 test)
| File | Dòng | Ghi chú |
|---|---|---|
| `middleware/auth.middleware.ts` | 139 | `requireAuth`/`requireAdminRole`/`attachUserIfAvailable`. Token từ Bearer **hoặc** cookie `session_token`. RBAC chỉ 2 mức: authed vs admin(root/admin). Không có mức granular (manager/operator/viewer bị bỏ qua ở route). |
| `middleware/rate-limit.middleware.ts` | 33 | `authRateLimit` 100/60s, `generalRateLimit` 1000/30s. Theo IP (mặc định lib). |
| `middleware/error-handler.middleware.ts` | 36 | RFC7807. Unhandled → 500 generic, không leak stack ra response (stack chỉ vào logger). OK. |
| `middleware/metrics.middleware.ts` | 37 | Prometheus, normalizePath chống high-cardinality. No issue. |
| `middleware/request-id.middleware.ts` | 9 | Nhận `x-request-id` từ client không sanitize → phản chiếu vào header + logs (log-injection nhẹ). |
| `middleware/sentry.middleware.ts` | 48 | No-op nếu chưa init. OK. |
| `middleware/__tests__/error-handler.test.ts` | 151 | Test khẳng định unhandled error trả `INTERNAL_ERROR` / "An unexpected error occurred" — xác nhận không leak. |

### Entry / routes gốc
| File | Dòng | Ghi chú |
|---|---|---|
| `index.ts` | 146 | Thứ tự middleware chuẩn. CORS `credentials:true`, origin từ config. `/api/v1` + `/api` (alias). `/health`, `/metrics`, `/api-docs` không auth. |
| `api/routes/index.ts` | 57 | Mount 25 nhóm route. Alias trùng: `/device`+`/devices`, `/export`+`/exports`, `/stats`+`/statistics`. `/health` mount lại (đã có ở index.ts). `/users` vs `/auth/users` trùng chức năng. |

### Controllers (23)
| File | Dòng | Ghi chú |
|---|---|---|
| `auth.controller.ts` | 236 | login set cookie httpOnly/sameSite lax. `resetUserPassword` trả plaintext temp password. Không last-admin protection. |
| `device.controller.ts` | 278 | listDevices/getDevicePositions truyền `req.user` (scoping). **getDevice/telemetry/command/ota... KHÔNG scope theo user** → IDOR. `importDevices`/`triggerOta`/`rollbackOta` không dùng Zod. |
| `vehicle.controller.ts` | 167 | CRUD không phân quyền + không scope owner. `importVehicles` không Zod, mass-assign field từ row. |
| `customer.controller.ts` | 67 | CRUD chỉ requireAuth, không RBAC, không scope. |
| `trip.controller.ts` | 131 | CRUD + start/end không RBAC/scope. `getTripTelemetry` interval whitelist OK. |
| `geofence.controller.ts` | 227 | CRUD + policy + allowed-zone, không RBAC. Trùng chức năng với zones.controller. |
| `firmware.controller.ts` | 320 | **createFirmware nhận `filePath` tùy ý từ body** (path traversal/arbitrary path). Không RBAC. downloadFirmware stream range OK, filename sanitized. |
| `system-admin.controller.ts` | 376 | `requireAdminRole` per-handler OK. `queryTable(table)` — table name tới service **không check whitelist tại API** (raw SQL identifier). PromQL/LogsQL raw. |
| `system.controller.ts` | 26 | Admin-gated per-handler. OK. |
| `simulator.controller.ts` | 51 | Admin-gated (`assertCanAccessSimulator`) + Zod. OK. |
| `statistics.controller.ts` | 169 | Raw SQL tĩnh (không input người dùng) → không injection. Không statement_timeout. `getFleetUsage`/uptime... truyền `from/to/interval` string thẳng vào service (cần kiểm domain). |
| `dashboard.controller.ts` | 40 | parseInt page/limit không giới hạn max. |
| `notification.controller.ts` | 69 | Scope theo `req.user!.id` (đúng). page/limit không max. |
| `alert.controller.ts` | 93 | CRUD không RBAC. createAlert public-to-authed. |
| `violation.controller.ts` | 60 | CRUD không RBAC. |
| `driver.controller.ts` | 67 | CRUD không RBAC. |
| `maintenance.controller.ts` | 68 | CRUD không RBAC. |
| `fuel-analytics.controller.ts` | 33 | from/to/interval string thẳng vào service. |
| `export.controller.ts` | 58 | Scope theo userId (đúng). `createExport` không Zod (exportType/filters). downloadExport existsSync + res.download OK. |
| `telemetry.controller.ts` | 48 | getHistory require deviceId nhưng **không scope theo user** → xem telemetry mọi device. createExport không Zod. |
| `zones.controller.ts` | 78 | Không RBAC. Trùng vehicle-allowed-zone của geofence. |
| `validation-error.controller.ts` | 23 | Zod OK, chỉ requireAuth. |
| `audit-log.controller.ts` | 18 | Admin-gated ở route. Zod OK. |

### Routes (27)
| File | Dòng | Ghi chú |
|---|---|---|
| `auth.routes.ts` | 26 | login+authRateLimit. users* gated requireAdminRole. |
| `users.routes.ts` | 20 | Trùng auth users; `/profile`,`/notification-settings` self; phần còn lại admin. `reset-password` chỉ có ở đây. |
| `device.routes.ts` | 28 | `router.use(requireAuth)` toàn bộ, **không có requireAdminRole** cho create/delete/command/ota/regenerate-token. |
| `vehicle.routes.ts` | 21 | Chỉ requireAuth. |
| `customer.routes.ts` | 16 | Chỉ requireAuth. |
| `trip.routes.ts` | 19 | Chỉ requireAuth. |
| `geofence.routes.ts` | 31 | Chỉ requireAuth. Thứ tự route: `/policies`,`/policy-violations`,`/vehicles/...` đặt trước `/:id` (đúng, tránh shadow). |
| `firmware.routes.ts` | 55 | **`/:id/download` dùng `attachUserIfAvailable` → tải firmware KHÔNG auth**. Phần còn lại chỉ requireAuth (không admin). upload 100MB. |
| `export.routes.ts` | 14 | requireAuth. |
| `system-admin.routes.ts` | 27 | requireAuth (RBAC admin nằm trong controller). |
| `system.routes.ts` | 11 | requireAuth (admin trong controller). |
| `statistics.routes.ts` | 18 | requireAuth. `fleet-usage`+`fleet-utilization` cùng handler. |
| `dashboard.routes.ts` | 16 | requireAuth. `activity`+`activity-feed` cùng handler. |
| `alert.routes.ts` | 18 | requireAuth. |
| `violation.routes.ts` | 15 | requireAuth. |
| `driver.routes.ts` | 16 | requireAuth. |
| `maintenance.routes.ts` | 16 | requireAuth. |
| `notifications.routes.ts` | 15 | requireAuth. `read-all`+`mark-all-read` trùng. |
| `telemetry.routes.ts` | 11 | requireAuth. |
| `simulator.routes.ts` | 15 | requireAuth (admin trong controller). |
| `zones.routes.ts` | 20 | requireAuth. |
| `fuel-analytics.routes.ts` | 12 | requireAuth. |
| `validation-error.routes.ts` | 11 | requireAuth. |
| `audit-log.routes.ts` | 13 | requireAuth + requireAdminRole (đúng mẫu chuẩn). |
| `health.routes.ts` | 80 | Không auth (đúng cho probe). DB/VM check. |
| `metrics.routes.ts` | 64 | Basic-auth; **bypass khi dev không set password**; so sánh mật khẩu không hằng-thời-gian. |

### Validators (18, gồm 3 test)
| File | Dòng | Ghi chú |
|---|---|---|
| `auth.validator.ts` | 104 | createUser role enum KHÔNG có `root` (tốt). Không `.strict()` → field thừa bị bỏ im lặng. |
| `device.validator.ts` | 82 | update_config params `.strict()`. Còn lại không strict. |
| `vehicle.validator.ts` | 58 | Không strict. |
| `customer.validator.ts` | 46 | Không strict. |
| `trip.validator.ts` | 46 | Không strict. |
| `driver.validator.ts` | 54 | Không strict. |
| `geofence.validator.ts` | 139 | `params: z.record(unknown)` — không validate nội dung policy. |
| `zone.validator.ts` | 68 | union circle/admin-boundary, superRefine OK. |
| `alert.validator.ts` | 33 | OK. |
| `violation.validator.ts` | 42 | OK. |
| `maintenance.validator.ts` | 38 | OK. |
| `simulator.validator.ts` | 60 | superRefine min<=max, có default. OK. |
| `system-admin.validator.ts` | 109 | `vmValueSchema = z.any()`; table name chỉ min1/max128 (không regex identifier). |
| `audit-log.validator.ts` | 14 | OK. |
| `validation-error.validator.ts` | 8 | OK. |
| `auth.validator.test.ts` | 33 | test. |
| `device.validator.test.ts` | 41 | test. |
| `nullable-update.validator.test.ts` | 63 | test. |

### OpenAPI
| File | Dòng | Ghi chú |
|---|---|---|
| `openapi/spec.ts` | 1235 | Spec drift nặng so với validator thực tế (xem F-14). |

---

## Findings theo severity

### CRITICAL

**C1 — Firmware tải KHÔNG cần auth (`firmware.routes.ts:38`) [verified]**
`router.get('/:id/download', attachUserIfAvailable, ...)` đặt TRƯỚC `router.use(requireAuth)`. `attachUserIfAvailable` cho qua kể cả không có token (`auth.middleware.ts:110-113`). ⇒ Bất kỳ ai biết/duyệt id đều tải được firmware binary (`firmware.controller.ts:202` downloadFirmware). Lộ tài sản firmware, hỗ trợ reverse-engineering. URL OTA (`device.controller.ts:178` buildFirmwareDownloadUrl) cũng dựa endpoint này.

**C2 — Toàn bộ ghi/xoá tài nguyên chỉ cần "đã đăng nhập", không phân quyền vai trò [verified]**
device/vehicle/customer/trip/driver/maintenance/alert/violation/geofence/zone/firmware routes chỉ có `router.use(requireAuth)` (vd `device.routes.ts:8`, `vehicle.routes.ts:8`, `firmware.routes.ts:40`). Vai trò `viewer`/`operator` (định nghĩa ở `auth.validator.ts:84`) vẫn create/update/delete/`regenerate-token`/`deploy firmware`/`OTA` được. RBAC chi tiết chỉ tồn tại cho `admin`(system-admin/simulator/system/audit-logs). ⇒ Privilege escalation theo chiều ngang giữa các role thấp.

**C3 — createFirmware nhận `filePath` tuỳ ý từ body (`firmware.controller.ts:61,67-69`) [verified]**
`const { ..., filePath } = req.body; const resolvedFilePath = filePath ? String(filePath) : join(storagePath, filename)`. Không Zod, không kiểm base dir. Kết hợp C2 (route chỉ requireAuth) ⇒ user thấp có thể tạo bản ghi firmware trỏ tới đường dẫn tuỳ ý trên server; sau đó `deleteFirmware` (`:119`) `fs.unlink` theo filePath từ DB → xoá file hệ thống (path traversal / arbitrary delete). Cần xác nhận thêm ở firmware-delete.service.

### HIGH

**H1 — IDOR: truy cập tài nguyên device/telemetry theo id không kiểm quyền sở hữu [verified]**
`listDevices`/`getDevicePositions` truyền `req.user` để scope (`device.controller.ts:38,104`) NHƯNG `getDevice(:48)`, `getTelemetry(:125)`, `getSessionTelemetry(:136)`, `getRuntimeStats`, `getCommands`, `getErrors`, `sendCommand(:147)`, `triggerOta`, `rollbackOta`, `regenerateToken` KHÔNG truyền/kiểm `req.user`. Cùng vấn đề: `telemetry.controller.ts:15` getTelemetryHistory theo `deviceId` bất kỳ. ⇒ user có `device_access_mode='assigned'/'customer'` vẫn đọc/điều khiển device ngoài phạm vi bằng cách đoán id.

**H2 — SQL identifier injection tiềm ẩn ở system-admin queryTable (`system-admin.controller.ts:121-147`, validator `:34-36`) [verified-partial]**
`table` chỉ validate `min1/max128`, không whitelist tại API, truyền thẳng vào `systemAdminService.queryTable(table,...)`. Table/column name không thể parameterize trong SQL. Nếu service nội suy chuỗi → SQLi (dù admin-only). `listTables`/`getTableColumns` cùng đường. Cần đối chiếu service để xác nhận whitelist.

**H3 — PromQL/LogsQL injection ở system-admin (`system-admin.controller.ts:44-73`) [verified]**
`query` (PromQL) và LogSQL truyền nguyên văn tới VictoriaMetrics/Logs. Admin-only giảm rủi ro nhưng vẫn cho phép truy vấn/enumerate ngoài phạm vi thiết kế; không giới hạn phạm vi datasource.

### MEDIUM

**M1 — Không có last-admin protection & reset password lộ plaintext (`auth.controller.ts:194-236`) [verified]**
`updateUser` cho đổi `role/status` bất kỳ, `deleteUser` xoá user bất kỳ — không chặn hạ cấp/xoá admin cuối cùng. `resetUserPassword` trả `temporaryPassword` plaintext trong response body (`:235`) và không cấm reset chính admin/root.

**M2 — Nhiều endpoint bỏ Zod, nhận body thô + mass-assign [verified]**
`device.importDevices` (`:226`), `vehicle.importVehicles` (`:119`), `device.triggerOta`/`rollbackOta`, `firmware.createFirmware`/`deployFirmware`, `export.createExport`, `telemetry.createExport`. Field lấy ad-hoc từ `req.body`, không strict, không giới hạn số phần tử mảng (chỉ chặn gián tiếp bởi body limit 100kb).

**M3 — Pagination không chặn trần ở handler thủ công [verified]**
`device.get{Sessions,Commands,Errors}` (`:89-90,264-265,273-274`), `notification.listNotifications` (`:10-11`), `dashboard.get{Activity,DeviceActivity,FleetRuntime}`, `firmware.listFirmware` (`:41-42`) parseInt page/limit không `Math.min(...,max)`. Cho phép limit khổng lồ → tải nặng DB. (Các validator Zod khác đã max 100 — tốt.)

**M4 — Field thừa bị nuốt im lặng (thiếu `.strict()`) [verified]**
Hầu hết Zod object không `.strict()` (chỉ `device.validator` update_config và vài chỗ). Client gửi field lạ không bị từ chối → khó phát hiện contract drift, tiềm ẩn ghi nhầm nếu service dùng spread.

**M5 — metrics basic-auth yếu (`metrics.routes.ts:22-52`) [verified]**
Dev bypass khi không set `METRICS_PASSWORD`; so sánh `pwd !== password` không hằng-thời-gian (timing). Prometheus metrics có thể lộ nội tại nếu cấu hình sai.

**M6 — Thiếu statement_timeout ở tầng API [verified]**
Không thấy set timeout cho truy vấn raw (`statistics.controller.ts` Promise.all nhiều query, health). Query nặng/độc có thể treo connection pool.

### LOW

**L1 — request-id phản chiếu header client chưa sanitize (`request-id.middleware.ts:5-7`)** — nguy cơ log/response header injection nhẹ (CRLF phụ thuộc Express đã lọc).

**L2 — CORS default fallback `http://localhost:4001` + `credentials:true` (`index.ts:65-72`, `env.ts:73-75`)** — không reflect origin (an toàn), nhưng fallback dev lọt vào prod nếu quên set `CORS_ORIGIN`.

**L3 — `attachUserIfAvailable` nuốt lỗi im lặng (`auth.middleware.ts:135-138`)** — lỗi DB khi resolve session bị bỏ qua, khó chẩn đoán.

**L4 — Handler/alias trùng lặp (route shadow không nguy hiểm nhưng gây drift):** `/device`+`/devices`, `/stats`+`/statistics`, `/export`+`/exports`, `/users` vs `/auth/users`, `dashboard activity/activity-feed`, `statistics fleet-usage/fleet-utilization`, `notifications read-all/mark-all-read`, `firmware assign=deploy` (`firmware.controller.ts:166`), firmware activate cả POST+PUT. `/health` mount 2 lần.

**L5 — OpenAPI spec drift nặng (`openapi/spec.ts`) [verified]** — vd device body ghi `serialNumber/model/firmwareVersion` (`:264-268`) trong khi validator dùng `deviceId/deviceName` (`device.validator.ts:3-16`); vehicle ghi `licensePlate/make` vs `vehicleId/plateNumber/brand`; nhiều endpoint đánh dấu bảo mật Bearer nhưng thực tế cũng chấp nhận cookie; `/firmware/{id}/download` spec ghi cần auth ngầm nhưng thực tế mở. Tài liệu không phản ánh contract thật → FE dễ tích hợp sai.

**L6 — CSV/Excel formula injection (export)** — `export`/`telemetry` tạo job export ra xlsx; tầng API không sanitize giá trị bắt đầu bằng `=,+,-,@`. Rủi ro nằm ở domain export-job (ngoài scope file này) nhưng bắt nguồn từ input API không kiểm.

**L7 — Response wrapper nhất quán `{success,data,meta,requestId}` (`response.util.ts`, `success-response.serializer.ts`)** — controller đều dùng `sendOk/sendCreated`; không thấy chỗ trả bare object. Đây là điểm tốt (no issue), ghi để chứng minh coverage.

---

## Câu hỏi mở

1. `systemAdminService.queryTable/getTableColumns` có whitelist table/column name không, hay nội suy chuỗi vào SQL? (quyết định H2 là CRITICAL hay giảm nhẹ).
2. `firmware-delete.service` xoá file theo `filePath` DB thế nào — có ràng buộc trong `storagePath` không? (quyết định mức C3).
3. Thiết kế RBAC kỳ vọng: `viewer/operator/manager` được phép ghi tài nguyên nào? Hiện code coi mọi authed user như nhau (C2) — có phải chủ ý?
4. `device_access_mode` (all/assigned/customer) chỉ áp dụng cho listDevices — có yêu cầu enforce cho getDevice/telemetry/command không? (H1).
5. `/firmware/:id/download` mở không auth là cố ý (thiết bị OTA tự kéo) hay sót? Nếu cố ý, có token/HMAC ký URL không?
6. `/users` và `/auth/users` cùng tồn tại — bên nào là canonical, bên nào cần deprecate?
7. Có cần last-admin protection và ẩn `temporaryPassword` khỏi response (M1)?
8. from/to/interval trong statistics/fuel-analytics được parse/parameterize ở domain hay ghép chuỗi PromQL/SQL? (liên quan injection).
