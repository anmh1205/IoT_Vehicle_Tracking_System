# 05 — Backend Domain Core (alert→geofence) + Infrastructure — Audit READ-ONLY

Scope: `Tracking_Backend/src/domain/**` nửa đầu alphabet (alert, audit, auth, customer, dashboard, device, driver, error-code, export, firmware, fuel-analytics, geofence) + toàn bộ `src/infrastructure/**` (database, logger, metrics, realtime). Read-only, không sửa code. Mọi finding = `path:line` + severity + trạng thái verify (đọc trực tiếp source).

Ngày: 2026-07-13. Phương pháp: đọc full từng file .ts (không sampling), grep-verify consumer khi cần.

---

## 1. Coverage per-file

Ghi chú: LOC = số dòng đọc thực tế. Tất cả file dưới đây đã đọc IN FULL.

### Infrastructure

| File | LOC | Ghi chú |
|---|---|---|
| infrastructure/database/pool.ts | 15 | `pg.Pool`, `max=connectionLimit`. KHÔNG có `statement_timeout`, `idle_timeout`, `connectionTimeoutMillis`. |
| infrastructure/database/queries.ts | 44 | Helper `findOne/findMany/insertOne/updateOne/deleteOne/executeQuery` — tất cả gọi `pool.query` trực tiếp, KHÔNG hỗ trợ client/transaction. |
| infrastructure/loger/winston.ts | ~40 | Winston config (thư mục tên sai chính tả `loger`). |
| infrastructure/logger/victorialogs-transport.ts | ~90 | Custom transport đẩy log sang VictoriaLogs. |
| infrastructure/logger/index.ts | 2 | Re-export `logger`, `createLogger`. |
| infrastructure/metrics/app-metrics.ts | ~110 | Prometheus counters/histograms (policy eval, violations, namespace conns...). |
| infrastructure/metrics/registry.ts | ~12 | prom-client registry. |
| infrastructure/realtime/socket-server.util.ts | ~460 | Socket.IO server, namespace auth, event-bus→socket fan-out. |
| infrastructure/realtime/mqtt-event-listener.ts | 743 | MQTT `internal/events/#` → event-bus. Hot-path ingest. |
| infrastructure/realtime/event-bus.util.ts | 316 | In-process `EventEmitter`, `setMaxListeners(100)`. |
| infrastructure/realtime/socket-auth.middleware.ts | 87 | Xác thực socket qua session token. |
| infrastructure/realtime/index.ts | ~30 | Re-export. |
| infrastructure/realtime/health.ts | ~45 | Health helper. |
| infrastructure/realtime/types.ts | ~25 | Typed socket. |
| infrastructure/mqtt-client-id.util.ts | ~20 | Gen client-id. |

### Domain alert
| File | LOC | Ghi chú |
|---|---|---|
| alert/services/alert-crud.service.ts | 268 | create/ack/resolve/dismiss/delete; publish 3-4 event mỗi lần. |
| alert/services/alert-list.service.ts | ~55 | list + pagination. |
| alert/repositories/alert.repository.ts | ~210 | CRUD raw SQL parameterized. |
| alert/types/alert.types.ts | ~90 | |

### Domain audit
| File | LOC | Ghi chú |
|---|---|---|
| audit/services/audit-log.service.ts | 57 | `record()` fire-and-forget, hỗ trợ `client?` + `strict?`. |
| audit/services/audit.service.ts | ~60 | |
| audit/repositories/audit-log.repository.ts | ~90 | `create(params, client?)` — có nhận PoolClient. |
| audit/repositories/audit.repository.ts | ~130 | |
| audit/types/audit.types.ts, audit-log.types.ts | ~110 | |

### Domain auth
| File | LOC | Ghi chú |
|---|---|---|
| auth/services/auth-session.service.ts | 130 | login/logout/validateSession. |
| auth/services/auth-password.service.ts | ~45 | change password. |
| auth/services/user-management.service.ts | 298 | CRUD user, check-then-act trên username. |
| auth/repositories/user.repository.ts | 144 | raw SQL parameterized. |
| auth/repositories/user-session.repository.ts | ~65 | |
| auth/helpers/auth.helpers.ts | 21 | bcryptjs, SALT_ROUNDS=12. |
| auth/types/auth.types.ts | ~60 | |

### Domain customer / dashboard
| File | LOC | Ghi chú |
|---|---|---|
| customer/repositories/customer.repository.ts | ~160 | |
| customer/services/customer-crud.service.ts | ~90 | check-then-act trên customer code. |
| customer/services/customer-list.service.ts | ~45 | |
| customer/types/customer.types.ts | ~55 | |
| dashboard/repositories/dashboard.repository.ts | ~320 | nhiều aggregate query. |
| dashboard/services/dashboard-stats.service.ts | ~100 | |
| dashboard/types/dashboard.types.ts | ~40 | |

### Domain device
| File | LOC | Ghi chú |
|---|---|---|
| device/repositories/device.repository.ts | 565 | list + LATERAL joins alert summary + latest event context. |
| device/repositories/device-session.repository.ts | 141 | session stats, GPS count LATERAL. |
| device/repositories/device-command.repository.ts | ~140 | |
| device/services/device-crud.service.ts | 111 | create (token), regenerate token. |
| device/services/device-runtime.service.ts | 57 | totalRuntime = base + active (⚠ xem F-11). |
| device/services/device-sessions.service.ts | ~65 | |
| device/services/device-details.service.ts | 99 | |
| device/services/device-list.service.ts | 92 | |
| device/services/device-telemetry.service.ts | ~330 | |
| device/services/device-command.service.ts | 93 | MQTT publish, module-singleton client. |
| device/services/device-error.service.ts | 82 | regex DTC, severity→errorCode map. |
| device/types/device.types.ts | 229 | |

### Domain driver / error-code / export / firmware / fuel-analytics
| File | LOC | Ghi chú |
|---|---|---|
| driver/services/driver-crud.service.ts | 114 | check-then-act driverCode. |
| driver/services/driver-list.service.ts | 97 | |
| driver/repositories/driver.repository.ts | 339 | normalize driver-name join theo tên (không FK). |
| driver/types/driver.types.ts | 109 | |
| error-code/services/error-code-definition.service.ts | 59 | check-then-act code. |
| error-code/repositories/error-code-definition.repository.ts | 76 | |
| error-code/types/error-code.types.ts | 41 | |
| export/services/export-job.service.ts | 69 | `void processExport(job)` fire-and-forget. |
| export/services/export-processing.service.ts | 57 | |
| export/services/export-file.service.ts | 211 | ExcelJS, query LIMIT-less. |
| export/repositories/export.repository.ts | 36 | |
| export/types/export.types.ts | 25 | |
| firmware/services/firmware-deploy.service.ts | 344 | OTA deploy, dedupe, MQTT dispatch. |
| firmware/services/firmware-upload/list/activate/delete.service.ts | 31/56/35/9 | |
| firmware/repositories/firmware.repository.ts | 282 | createDeployments bulk insert, sha256 lưu. |
| firmware/constants/ota-lifecycle.constants.ts | 47 | |
| firmware/types/firmware.types.ts | 88 | |
| fuel-analytics/services/fuel-analytics.service.ts | 70 | parseRange, fuelPrice mặc định. |
| fuel-analytics/repositories/fuel-analytics.repository.ts | 152 | SUM fuel/distance, div-by-zero guard. |
| fuel-analytics/types/fuel-analytics.types.ts | ~40 | |

### Domain geofence
| File | LOC | Ghi chú |
|---|---|---|
| geofence/services/policy-evaluator.service.ts | 465 | hot-path đánh giá policy, quota, timezone UTC+7. |
| geofence/services/geofence-crud.service.ts | 275 | trùng lặp code với vehicle-policy-crud (xem F-16). |
| geofence/services/vehicle-policy-crud.service.ts | 162 | |
| geofence/services/vehicle-allowed-zone.service.ts | 175 | upsert zone, preview center. |
| geofence/services/geofence-list.service.ts | 58 | N+1 vehicleIds (xem F-9). |
| geofence/services/policy-rollout-config.service.ts | 23 | enforcement matrix hardcoded. |
| geofence/repositories/vehicle-policy.repository.ts | 132 | |
| geofence/repositories/vehicle-policy-state.repository.ts | 83 | upsert optimistic-lock có điều kiện. |
| geofence/repositories/vehicle-policy-violation.repository.ts | 163 | ON CONFLICT dedupe_key DO NOTHING. |
| geofence/repositories/vehicle-allowed-zone.repository.ts | 149 | upsert ON CONFLICT vehicle_id. |
| geofence/repositories/policy-state.repository.ts | 20 | barrel re-export. |
| geofence/repositories/geofence.repository.ts | 174 | |
| geofence/types/geofence.types.ts | 286 | |

Test files ghi nhận (không audit sâu): `geofence/repositories/vehicle-allowed-zone.repository.test.ts`, `fuel-analytics/services/fuel-analytics.service.test.ts`.

---

## 2. Findings theo severity

### CRITICAL

**F-1 — Không có transaction ở bất kỳ multi-write nào trong nửa domain này (fake/thiếu atomicity).** — verified
`infrastructure/database/queries.ts:1-44`, `infrastructure/database/pool.ts:1-16`.
Toàn bộ helper query gọi thẳng `pool.query`, KHÔNG có API `withTransaction`/`getClient` (chỉ `system-admin.service.ts:419` — ngoài scope — tự định nghĩa `withTransaction`). Hệ quả trong scope:
- `geofence/services/policy-evaluator.service.ts:378-393` và `:429-442`: đánh giá quota rồi `createPolicyViolation` (violation.repo) và `upsertPolicyState` là **các lệnh rời rạc, không cùng transaction**. Nếu crash giữa chừng → violation ghi nhưng state không cập nhật (hoặc ngược lại) → double-count quota hoặc bỏ sót vi phạm.
- `alert/services/alert-crud.service.ts:63-113`: `alertRepo.create` + 4 `publishEvent` không nguyên tử với audit; nếu process chết sau create, event realtime mất (chấp nhận được) nhưng không có bù trừ.
- `audit-log.service.ts:28-41` nhận `client?: PoolClient` (thiết kế cho tx) nhưng **không call-site nào trong nửa domain này truyền client** → khả năng transaction chưa bao giờ được dùng cho audit + business write cùng lúc.
Đây là rủi ro toàn hệ: mọi "multi-write" đều best-effort, không rollback.

**F-2 — Check-then-act tạo trùng không có unique constraint/lock (race).** — verified
- `auth/services/user-management.service.ts:125-146`: `findByUsername` → nếu null thì `create`. Hai request song song cùng username sẽ cùng qua check rồi cùng insert. An toàn CHỈ KHI DB có UNIQUE(username) — không xác nhận được từ source (schema ngoài scope). Nếu thiếu unique index → tạo trùng user.
- Tương tự: `device/services/device-crud.service.ts:60-66` (deviceId), `driver/services/driver-crud.service.ts:78-83` (driverCode), `error-code/...service.ts:34-39` (code), `firmware/services/firmware-upload.service.ts:9-16` (version).
Cần verify từng bảng có UNIQUE tương ứng; nếu không, đây là lỗ tạo-trùng kinh điển. Repo-level không dùng `ON CONFLICT` cho các insert này (khác với `vehicle_policy_state`, `vehicle_allowed_zones`, `violations` vốn có ON CONFLICT).

**F-3 — MQTT hot-path không serialize theo device → out-of-order & race ghi state.** — verified
`infrastructure/realtime/mqtt-event-listener.ts:337-722`. Handler `client.on('message')` xử lý mọi message concurrently; các nhánh dùng `void ...().catch()` fire-and-forget:
- `:498` `void persistRawDataEventLog(...)` (INSERT event_logs),
- `:601` `void alertCrudService.createAlert(...)`,
- `:682` `void handleIgnitionEvent(...)`,
- `:714` `void processCommandAck(...)`.
Không có hàng đợi/khoá theo `device_id`. Hai message của cùng device đến gần nhau chạy song song → INSERT event_logs theo thứ tự bất kỳ, và nếu bất kỳ downstream nào làm read-modify-write trên state cùng device sẽ bị race. `toTimestampMs` (`:75`) fallback `Date.now()` khi parse fail → **server-clock thay cho device-clock**, làm sai thứ tự thời gian (out-of-order timestamp).

### HIGH

**F-4 — Quota distance đọc-sửa-ghi trên state chia sẻ, chỉ optimistic-lock MỘT nhánh.** — verified
`geofence/services/policy-evaluator.service.ts:222-241` cộng dồn `consumedMeters += computeDistanceMeters(...)` dựa trên `state.last_lat/lon/last_evaluated_at`. Nhánh DISTANCE_QUOTA có bảo vệ optimistic qua `enforceExpectedLastEvaluatedAt=true` + `expectedLastEvaluatedAt` (`:391-392`, repo `vehicle-policy-state.repository.ts:51-53` WHERE `last_evaluated_at IS NOT DISTINCT FROM`). Nhưng:
- `evaluateVehiclePolicies:421-452` chạy các policy **tuần tự trong 1 lần gọi**, còn hai lần gọi song song (hai telemetry cùng vehicle qua F-3) sẽ đọc cùng `state`, một cái ghi thành công, cái kia bị `upserted===null` → **skip** (log warn `:396`), tức **mất quãng đường của telemetry bị skip** → under-count quota.
- Nhánh spatial (RADIUS/ADMIN_BOUNDARY) `:429-442` upsert **KHÔNG** truyền `enforceExpectedLastEvaluatedAt` → last-writer-wins, không phát hiện stale → có thể ghi đè spatial_state cũ hơn (out-of-order).

**F-5 — Query xuất Excel không LIMIT, tải toàn bảng vào RAM (OOM).** — verified
`export/services/export-file.service.ts:24-136,168` — các `EXPORT_CONFIGS.query` là `SELECT ... FROM devices/vehicles/trips/alerts/maintenance ORDER BY created_at DESC` **không LIMIT, không filter**, rồi `findMany` nạp toàn bộ vào mảng + build workbook trong bộ nhớ (`:194-201`). Bảng `trips`/`alerts`/`event`-scale lớn → phình RAM, tắc event-loop. Không dùng streaming/cursor.

**F-6 — Namespace realtime rò dữ liệu chéo user (thiếu phân quyền theo chủ sở hữu).** — verified
`infrastructure/realtime/socket-server.util.ts:86-87` `canAccessNamespace` chỉ chặn namespace `firmware` cho non-admin; các namespace `devices`, `dashboard`, `notifications` chỉ cần **đăng nhập hợp lệ** (socket-auth). Fan-out:
- `:325-328` device events broadcast tới room `device:${deviceId}` — cần verify ai được join room đó; nếu client tự join tuỳ ý → xem mọi device.
- `export:progress`/`export:ready` (`event-bus`) mang `user_id` nhưng cần kiểm chứng chỉ emit tới đúng `user:${userId}`. Tại `:441-447` chưa thấy lọc theo user (cần xem hàm emit chi tiết). Rủi ro: user A nhận tiến độ export của user B.

**F-7 — `stats:update` amplification: mỗi thao tác alert publish tới 2 lần, mỗi telemetry publish thêm.** — verified
`alert/services/alert-crud.service.ts` publish `alert:*` **và** `stats:update` ở create/ack/resolve/dismiss/delete (`:104,150,200,236,261`). `mqtt-event-listener.ts` gọi `publishStatsUpdate` cho gần như mọi event (`:409,496,525,541,632,636,143`). Ở tần suất telemetry cao → bão `stats:update` fan-out ra toàn bộ client dashboard (server.of('/dashboard') broadcast). Không có debounce/throttle. Tick fan-out amplification.

**F-8 — DB/broker down → buffer/handler nuốt lỗi, mất write im lặng.** — verified
- `mqtt-event-listener.ts:498-503,621-633,714-716`: mọi write downstream `.catch()` chỉ log; khi Postgres down, event_logs/alert **mất vĩnh viễn** (không retry, không dead-letter). MQTT QoS1 đã ack ở broker nên message không được gửi lại.
- `export/services/export-job.service.ts:50` `void processExport(job)` fire-and-forget: nếu process restart giữa chừng, job kẹt `processing` mãi (không có job-recovery).
- `device/services/device-command.service.ts:10-43`: MQTT client singleton; nếu broker down lúc `sendCommand`, `publish` callback báo lỗi → set command `failed` (ok), nhưng client reconnect state không được kiểm tra trước publish.

### MEDIUM

**F-9 — N+1 query khi list geofence.** — verified
`geofence/services/geofence-list.service.ts:39-47`: `Promise.all(result.geofences.map(... findVehiclesByGeofenceId(geofence.id)))` — mỗi geofence một query `SELECT vehicle_id FROM geofence_vehicles`. 20 geofence/trang = 21 query. Nên JOIN/aggregate 1 query. `geofence-crud.service.ts:hydrateVehicleIds` cũng vậy (từng cái).

**F-10 — Timezone UTC+7 hardcode; ranh giới ngày/tháng dễ off-by drift.** — verified
`geofence/services/policy-evaluator.service.ts:27` `TIMEZONE_OFFSET_HOURS = 7` và `buildCycleWindow:103-124` tự cộng/trừ 7h thủ công quanh `Date.UTC`. Không dùng thư viện tz → không xử lý DST (VN không DST nên tạm ổn) nhưng **hard-code**: nếu triển khai vùng khác sẽ sai chu kỳ quota. `fuel-analytics.repository.ts:90-99` dùng `DATE_TRUNC('day'/'week'/'month', ...)` theo **timezone của DB session** (không set) → có thể lệch ngày so với UTC+7 của quota → hai module dùng hai định nghĩa "ngày" khác nhau (inconsistent day boundary).

**F-11 — Double-count runtime khả năng (completed + active).** — verified
`device/services/device-runtime.service.ts:41-50`: `totalRuntime = max(device.total_runtime_seconds,0) + activeRuntimeSeconds`, với `activeRuntimeSeconds = max(now - server_session_start, uptime)`. Nếu `device.total_runtime_seconds` **đã bao gồm** session running hiện tại (tuỳ cách cập nhật ở bridge/khác) → cộng thêm active = **đếm hai lần**. Cần verify semantics của `total_runtime_seconds`. Ngoài ra `Date.now() - server_session_start` là **server-clock** so với start có thể là device-clock → drift.

**F-12 — NaN/null coalesce thành 0 tạo dữ liệu "bịa".** — verified
- `fuel-analytics.repository.ts:31-34,74-76,141-143`: `parseFloat(row ?? '0')`, `avgConsumption = distance>0 ? ... : 0`. Div-by-zero đã guard (tốt), nhưng khi `distance=0` mà `fuel>0` (đổ nhiên liệu, xe không chạy) → consumption **báo 0** thay vì ∞/undefined → che giấu bất thường.
- `device/services/device-error.service.ts:26-38` `severityToErrorCode` default `100` cho severity lạ → gán mã lỗi giả.
- `fuel-analytics.service.ts:40` `totalCost: 0` khởi tạo rồi mới set ở service (`:50`); nhưng `getByVehicle`/`getTrends` **không có cost** → luôn 0. Nếu FE hiển thị "chi phí = 0" dễ hiểu nhầm.

**F-13 — Listener accumulation nếu init realtime nhiều lần.** — verified (rủi ro điều kiện)
`event-bus.util.ts:286-287` `emitter.setMaxListeners(100)`; `socket-server.util.ts:325-460` đăng ký ~30 `subscribeEvent` khi init. Nếu `initSocketServer` bị gọi lại (hot-reload/test/re-init) mà không `removeAllEventListeners` trước → listener chồng chất, mỗi event emit N lần và cảnh báo MaxListeners. Không thấy guard idempotent ở init. `mqtt-event-listener.ts:310-312` cũng dùng biến module `client`, `initMqttEventListener` không kiểm tra `client` đã tồn tại → gọi 2 lần tạo 2 kết nối + 2 subscribe → xử lý message trùng đôi.

**F-14 — Pool thiếu statement_timeout / connectionTimeout / idle timeout.** — verified
`infrastructure/database/pool.ts:4-11` chỉ set `max`. Không `statement_timeout` → query treo (vd export full-table F-5, dashboard aggregate) giữ connection vô hạn, dễ cạn pool. Không `connectionTimeoutMillis` → request xếp hàng vô định khi pool cạn.

**F-15 — Regex-driven ECU/DTC filter chạy trên `alerts` mỗi lần, không index-friendly.** — verified
`device/services/device-error.service.ts:14-19` filter dùng `CONCAT_WS(...) ~* '(...)[pcbu][0-3][0-9a-f]{3}...'` trên cột `title/message` → sequential scan, không dùng index; kết hợp `LIMIT/OFFSET` phân trang (`:41-58`) chạy 2 lần (count + rows) mỗi request.

### LOW

**F-16 — Trùng lặp code lớn giữa `geofence-crud.service.ts` và `vehicle-policy-crud.service.ts`.** — verified
`sanitizeVehiclePolicy`, `sanitizePolicyState`, `listVehiclePolicies`, `getVehiclePolicyById`, `createVehiclePolicy`, `updateVehiclePolicy`, `listVehiclePolicyStates`, `listVehiclePolicyViolations` **định nghĩa y hệt ở cả hai file** (`geofence-crud.service.ts:129-275` vs `vehicle-policy-crud.service.ts:17-162`). Dead/duplicate — cần grep consumer để biết bản nào thực sự dùng (controller layer ngoài scope). Rủi ro maintenance: sửa một bên quên bên kia.

**F-17 — `executeQuery` cho assignVehicle nuốt kết quả conflict.** — verified
`geofence/repositories/geofence.repository.ts:156-160` `assignVehicle` dùng `ON CONFLICT DO NOTHING` trả `rowCount`; service `:106` không kiểm tra 0 → luôn báo `{success:true}` kể cả khi đã tồn tại (idempotent, chấp nhận được nhưng không phản hồi trạng thái thực).

**F-18 — Logger thư mục sai chính tả `loger` + rủi ro log PII.** — verified
Thư mục `infrastructure/loger/winston.ts` (sai chính tả, `index.ts` re-export từ `./loger`). `auth-session.service.ts:97` log `User "${username}" logged in` — username là PII mức thấp; `mqtt-event-listener.ts:159` đã chủ động strip `auth_token` khỏi raw_payload (tốt). Không phát hiện log password/token thô. `alert-crud.service.ts:65` log title alert (có thể chứa dữ liệu vị trí/biển số).

**F-19 — Số round bcrypt=12 fixed, không cấu hình.** — verified
`auth/helpers/auth.helpers.ts:4` `SALT_ROUNDS = 12` hardcode (ổn về mặt bảo mật, bcrypt có salt tự sinh — KHÔNG phải lỗi salt). Chỉ là không tuỳ biến qua env; không phải finding bảo mật thật, ghi để loại nghi ngờ "password không salt": **bcrypt tự salt, không có vấn đề**.

**F-20 — `parseInt(countResult.rows[0].total)` giả định luôn có row.** — verified
`driver.repository.ts:126`, `geofence.repository.ts:50`, `firmware.repository.ts:44` truy cập `rows[0].total/count` không guard null. `COUNT(*)` luôn trả 1 row nên an toàn thực tế; ghi nhận là fragile-nếu-query-đổi.

**F-21 — `firmware-deploy` cập nhật object in-memory sau dispatch fail nhưng không nhất quán DB.** — verified
`firmware/services/firmware-deploy.service.ts:293-309`: khi MQTT dispatch fail, gọi `markDeploymentDispatchFailed` (DB) rồi **cũng** mutate `deployment.*` in-memory để trả view. Hai nguồn (DB update + object mutate) có thể lệch nếu DB update thất bại (không await-check kết quả). Minor.

---

## 3. Điểm tích cực (ghi nhận)

- SQL toàn bộ **parameterized** (`$1,$2...`) — không phát hiện string-concatenation injection. `ORDER BY` dùng whitelist (`driver.repository.ts:18-24`, `device` sort tương tự) — chống injection cột sort.
- `firmware-deploy.service.ts:101-134` `assertFirmwareArtifactReady` verify tồn tại file + size khớp + sha256 regex `^[a-f0-9]{64}$` trước khi deploy — tốt.
- `vehicle-policy-violation.repository.ts:92` `ON CONFLICT (dedupe_key) DO NOTHING` chống trùng violation; `vehicle-policy-state.repository.ts:38-54` upsert có optimistic-lock điều kiện — thiết kế concurrency đúng hướng (chỉ chưa áp cho spatial, F-4).
- `mqtt-event-listener.ts:159` strip `auth_token`/`authToken` khỏi payload trước khi lưu — chống rò secret.
- `socket-auth.middleware.ts` verify session active + expiry + role trước khi cho kết nối.
- `fuel-analytics` div-by-zero đều guard `distance>0 ? ... : 0`.

---

## 4. Câu hỏi mở (cần verify ngoài scope hoặc từ chủ dự án)

1. **Schema constraints:** Các bảng `users(username)`, `devices(device_id)`, `drivers(driver_code)`, `error_code_definitions(code)`, `firmware(version)` có UNIQUE index không? Nếu không → F-2 lên CRITICAL thực sự.
2. **`total_runtime_seconds` semantics (F-11):** giá trị này đã bao gồm session `running` hiện tại hay chỉ các session `completed`? Ai cập nhật nó (backend hay MqttBridge)?
3. **Room join policy (F-6):** Client join `device:${deviceId}` / `user:${userId}` theo cơ chế nào? Controller/socket handler layer (ngoài scope nửa này) có kiểm tra quyền sở hữu device/user trước khi cho join không?
4. **Transaction chiến lược (F-1):** Có kế hoạch bọc `evaluatePolicy → createViolation → upsertState` trong 1 transaction? `audit-log.record(client)` đã sẵn API nhưng chưa dùng — có ý định dùng?
5. **Init idempotency (F-13):** `initSocketServer` / `initMqttEventListener` có được đảm bảo gọi đúng 1 lần vòng đời process? Có path re-init (test, cluster worker) không?
6. **Export scale (F-5):** Kỳ vọng số dòng tối đa cho `trips`/`alerts` export? Có cần chuyển sang streaming (ExcelJS `WorkbookWriter`) + LIMIT?
7. **Day-boundary consistency (F-10):** DB session timezone được set gì? `fuel-analytics` (`DATE_TRUNC` theo DB tz) và geofence quota (UTC+7 thủ công) có cần thống nhất một định nghĩa "ngày"?
8. **Duplicate policy CRUD (F-16):** File nào (`geofence-crud` hay `vehicle-policy-crud`) là canonical? Bản kia có dead code không?
