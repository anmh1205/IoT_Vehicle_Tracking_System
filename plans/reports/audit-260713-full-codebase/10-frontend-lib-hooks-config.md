# Audit READ-ONLY — Frontend `lib` / `hooks` / `config` / `build`

- **Base dir:** `Tracking_Frontend/`
- **Phạm vi:** `src/lib/**` (48 file), `src/hooks/**` (10 file), `src/config/**` (2), `src/types/**` (1) + `package.json`, `tsconfig.json`, `eslint.config.mjs`, `Dockerfile`, `docker-compose.yml`, `docker-compose.uat.yml`.
- **Phương pháp:** đọc IN FULL từng file (không sampling). `src/providers/` và `src/stores/` KHÔNG tồn tại (store thật nằm ở `src/lib/stores/auth-store.ts`).
- **Quy ước:** mọi finding `path:line` + severity, `verified` = xác nhận trực tiếp từ source.

---

## 1. Bảng coverage per-file

### src/lib/api (23 file)
| File | Dòng | Ghi chú |
|---|---|---|
| api/client.ts | 100 | Axios instance, interceptor auth + refresh 401, `unwrap<T>`. **Điểm nóng nhất.** |
| api/base-url.ts | 46 | Resolve `API_BASE_URL` từ `NEXT_PUBLIC_API_DIRECT_URL` / loopback / relative. |
| api/auth.ts | 79 | login/logout/me/refresh/profile/password/notifications. |
| api/devices.ts | 72 | CRUD + sessions/telemetry/command/errors/positions. `normalizeDeviceList` defensive. |
| api/device-detail.ts | 103 | Aggregate `Promise.all` + `.catch(()=>null)` nuốt lỗi từng nhánh. |
| api/zones.ts | 227 | Zone types + normalize số. Cast `unwrap<any>` cho delete. |
| api/geofences.ts | 240 | Legacy adapter map zone→allowedZone. |
| api/system-admin.ts | 201 | VM settings CRUD, `idempotencyKey` optional (client không sinh). |
| api/system-status.ts | 30 | health/metrics. |
| api/firmware.ts | 103 | list/upload/deploy/deployments; normalize snake+camel. |
| api/exports.ts | 1 | Chỉ `export * from './export'`. |
| api/export.ts | 73 | export jobs + `downloadUrl` (dùng `toApiUrl`). |
| api/alerts.ts | 237 | Localize label + regex parse message; `alertServices` cast `any`. |
| api/notifications.ts | 19 | list/markRead/stats. |
| api/simulator.ts | 24 | start/stop/pause/resume/status — toàn `unwrap<any>`. |
| api/users.ts | 34 | CRUD + resetPassword. |
| api/vehicles.ts | 14 | CRUD + assignDevice. |
| api/trips.ts | 16 | CRUD + telemetry/start/end. |
| api/statistics.ts | 12 | 4 endpoint report. |
| api/maintenance.ts | 12 | CRUD. |
| api/violations.ts | 12 | list/get/create/acknowledge. |
| api/customers.ts | 12 | CRUD. |
| api/drivers.ts | 14 | CRUD. |
| api/dashboard.ts | 17 | stats/activity. |
| api/map.ts | 5 | `getPositions` — trùng `deviceServices.getPositions`. |

### src/lib/validations (11 file)
| File | Dòng | Ghi chú |
|---|---|---|
| auth.schema.ts | 9 | login. |
| device.schema.ts | 17 | device + command. |
| user.schema.ts | 10 | role enum lệch (xem F-08). |
| vehicle.schema.ts | 19 | year/customerId coerce. |
| customer.schema.ts | 12 | |
| maintenance.schema.ts | 11 | |
| trip.schema.ts | 11 | |
| geofence.schema.ts | 10 | type `polygon` nhưng API mới dùng `administrative_boundary` (xem F-09). |
| firmware.schema.ts | 14 | version regex semver. |
| export.schema.ts | 13 | entityType/format lệch `CreateExportInput` (xem F-10). |
| alert.schema.ts | 14 | alertType enum thiếu nhiều loại (xem F-11). |
| settings.schema.ts | 23 | profile/password/notificationPrefs. |

### src/lib/utils + lib gốc (10 file)
| File | Dòng | Ghi chú |
|---|---|---|
| utils.ts | 22 | `cn`, date key local. |
| utils/date/format.ts | 107 | format number/date/duration/relative. |
| utils/device-state.ts | 194 | presentation mapping (pure). |
| utils/api-error.ts | 128 | trích field errors. |
| utils/query-invalidation.ts | 109 | invalidate map. |
| utils/browser-notification.ts | 65 | Notification API. |
| utils/logger.ts | 17 | dev-only logger. |
| brand.ts | 12 | hằng thương hiệu. |
| notification.ts | 16 | wrapper `sonner` toast. |
| stores/auth-store.ts | 35 | zustand auth (in-memory). |
| runtime/public-origin.ts | 69 | resolve public origin. |

### src/hooks (10 file), src/config (2), src/types (1)
| File | Dòng | Ghi chú |
|---|---|---|
| hooks/use-realtime-subscription.ts | 36 | socket on/off, cleanup OK. |
| hooks/use-device-status-realtime.ts | 95 | interval + cleanup OK. |
| hooks/use-infinite-list-query.ts | 127 | React-Query infinite. |
| hooks/use-progressive-list.ts | 38 | client slice. |
| hooks/use-role-access.ts | 62 | RBAC client. |
| hooks/use-nav.ts | 48 | filter nav theo quyền. |
| hooks/use-breadcrumbs.tsx | 13 | breadcrumb từ registry. |
| hooks/use-mobile.ts | 15 | matchMedia + cleanup OK. |
| hooks/use-media-query.ts | 14 | matchMedia + cleanup OK. |
| hooks/mutations/use-create-export.ts | 30 | mutation + invalidate. |
| config/dashboard-route-registry.ts | 459 | registry + breadcrumb/metadata. |
| config/nav-config.ts | 55 | build nav từ registry. |
| types/index.ts | 30 | ApiEnvelope, Paginated, NavItem. |

---

## 2. Findings theo severity

### 🔴 HIGH

**F-01 — Interceptor retry áp lên MỌI method, kể cả POST/PUT/DELETE non-idempotent** · `src/lib/api/client.ts:38-69` · verified
Điều kiện retry chỉ loại trừ theo status/`_retry`/refresh/login, KHÔNG lọc theo `originalRequest.method`. Khi 401 xảy ra giữa chừng một mutation (POST `/devices`, POST `/firmware/{id}/deploy`, POST `/alerts`…), sau refresh thành công request gốc được **replay nguyên vẹn** (dòng 69 `return apiClient(originalRequest)`). Nếu server đã xử lý lần đầu trước khi trả 401 (hoặc token hết hạn ngay sau khi ghi), có thể gây **double-write / lệnh trùng** (tạo 2 export, gửi 2 command tới thiết bị). Non-idempotent mutation cần chặn retry hoặc yêu cầu idempotency key.

**F-02 — `http.get<T>` / `unwrap<T>` cast không runtime-validate → shape mismatch ẩn toàn FE** · `src/lib/api/client.ts:89-100` + toàn bộ `api/*` · verified
`unwrap<T>` chỉ ép kiểu tĩnh; không có schema kiểm tra runtime. Mọi service cast `unwrap<any>` hoặc `unwrap<TInterface>` (vd `dashboard.ts:14 unwrap<DashboardStats>`, `firmware.ts:102 unwrap<FirmwareDeployment[]>`). Dù đã có `zod` trong deps, **không schema nào được dùng để parse response** — chỉ dùng cho form input. Backend đổi field (camel↔snake, đổi tên, null hoá) sẽ **không báo lỗi tại ranh giới API** mà lan xuống component gây `undefined` runtime. Đây là rủi ro hệ thống lớn nhất về độ bền dữ liệu.

**F-03 — Env var build lệch env var runtime → API base URL sai khi deploy** · `Dockerfile:6-17` vs `src/lib/api/base-url.ts:26` · verified
Dockerfile khai báo/inject `NEXT_PUBLIC_API_URL` và `NEXT_PUBLIC_API_BASE_URL` (dòng 6-7,12-13) nhưng `base-url.ts:26` chỉ đọc `process.env.NEXT_PUBLIC_API_DIRECT_URL`. Vì đây là biến `NEXT_PUBLIC_*` được **inline lúc build**, giá trị API_URL/API_BASE_URL truyền vào ARG **không có tác dụng** với client HTTP. Kết quả: bản build production rơi vào nhánh fallback (`/api/v1` relative hoặc `localhost:4000`) trừ khi `.env` tình cờ có `NEXT_PUBLIC_API_DIRECT_URL`. `docker-compose.yml` lại dùng `env_file: .env` (runtime) chứ không truyền `build.args`, nên ngay cả ARG cũng không được set khi build qua compose. **Cấu hình API endpoint dễ sai lệ thầm lặng.**

### 🟠 MEDIUM

**F-04 — `.catch(() => null)` nuốt toàn bộ lỗi từng nhánh aggregate** · `src/lib/api/device-detail.ts:84-93` · verified
`getAggregate` chạy `Promise.all` với mỗi nhánh `.catch(()=>null)`. Lỗi mạng/500/403 bị nuốt, UI hiển thị "rỗng" thay vì báo lỗi — không phân biệt được "không có dữ liệu" và "gọi API thất bại". Không log (logger chỉ chạy dev).

**F-05 — Không có timeout / AbortController ở tầng axios** · `src/lib/api/client.ts:15-19` · verified
`axios.create` không set `timeout`. Request treo (backend chậm / mất mạng) sẽ **pending vô hạn**, không tự huỷ. Không service nào truyền `signal`. React-Query không tự abort được vì service không nhận `signal`. Nguy cơ request rác tồn đọng, loading spinner kẹt.

**F-06 — Refresh 401: nếu refresh trả 401 kèm mutation gốc, `.finally` reset cờ nhưng lỗi refresh làm logout toàn cục** · `src/lib/api/client.ts:49-85` · verified
Cơ chế single-flight `isRefreshing`/`refreshPromise` đúng, nhưng: (a) các request 401 song song đến trước khi `refreshPromise` được gán vẫn tự tạo lần refresh riêng nếu timing xấu (giữa `!isRefreshing` check và set — thực tế JS đơn luồng nên OK, verified an toàn); (b) khi refresh fail, `window.location.assign` (dòng 80) reload cứng — mất mọi state chưa lưu. Chấp nhận được nhưng nên dùng router điều hướng mềm.

**F-07 — Secret channel (botToken/webhookUrl/chatId) đi qua interface client & có thể render** · `src/lib/api/auth.ts:10-13,30-40` · verified
`TelegramChannelState.botToken` và `NotificationChannelState.webhookUrl` là field client-facing. Bản thân lib chỉ định nghĩa type (không rò rỉ ở tầng này), nhưng cần đánh dấu: nếu component hiển thị nguyên `botToken`, đó là lộ secret. Chuyển sang report tầng feature để kiểm tra render. (Ở tầng lib: chỉ ghi nhận thiết kế trả secret về client.)

**F-08 — `userSchema.role` enum lệch model User** · `src/lib/validations/user.schema.ts:8` vs `src/lib/stores/auth-store.ts:9` · verified
Schema: `z.enum(['admin','operator','viewer'])`. Model `User.role`: `'root'|'admin'|'manager'|'operator'|'viewer'`. Thiếu `root` và `manager`. Form tạo/sửa user **không cho phép chọn `manager`/`root`** dù backend + RBAC (`use-role-access.ts:2`) hỗ trợ. Ngược lại nếu backend trả `manager`, validate form edit sẽ fail.

**F-09 — `geofenceSchema.geofenceType` enum lệch API zones** · `src/lib/validations/geofence.schema.ts:5` vs `src/lib/api/zones.ts:3` · verified
Schema: `['circle','polygon']`. API model `VehicleZoneType = 'circle'|'administrative_boundary'`. Không có `polygon` trong API mới; `administrative_boundary` không có trong schema. Schema geofence dường như thuộc endpoint `/geofences` legacy còn zones là API mới — hai hệ song song dễ gây nhầm (F-16).

**F-10 — `exportSchema` lệch `CreateExportInput`** · `src/lib/validations/export.schema.ts:5-8` vs `src/lib/api/export.ts:16-19` · verified
Schema dùng `entityType` + `format` + `from`/`to`. API `CreateExportInput` dùng `exportType` + `filters`. Field không khớp tên → nếu form submit theo schema, `exportServices.create` sẽ map sai (`exportType` undefined, dồn hết vào `filters` qua nhánh `rest` ở `export.ts:58-59`).

**F-11 — `alertSchema.alertType` thiếu nhiều loại backend dùng** · `src/lib/validations/alert.schema.ts:6` vs `src/lib/api/alerts.ts:26-42` · verified
Schema enum: `['speeding','zone','geofence','offline','maintenance','other']`. Nhưng label map hỗ trợ `geofence_enter/exit`, `zone_enter/exit`, `zone_outside_periodic`, `device_offline`, `maintenance_due`, `high_imu_accel_delta`, `harsh_braking`, `idle_too_long`. Tạo alert thủ công qua form sẽ chặn phần lớn loại thực tế.

### 🟡 LOW

**F-12 — `formatNumber` trả `String(value)` thô khi non-finite thay vì fallback** · `src/lib/utils/date/format.ts:81-83` · verified
Với `Infinity`/`NaN` (vd chia cho 0 phía trên), hàm trả `"Infinity"`/`"NaN"` hiển thị ra UI thay vì `fallback`. Div-by-zero không được chặn tại util (phụ thuộc caller).

**F-13 — `formatDateTime`/`formatRelative` dùng timezone máy client, không cố định UTC+7** · `src/lib/utils/date/format.ts:36,42-48,98-107` · verified
`new Date(value)` + `date-fns format` render theo **timezone trình duyệt**. Không ép Asia/Ho_Chi_Minh. Máy khách ở TZ khác sẽ thấy giờ lệch. Với hệ tracking VN đây là rủi ro hiển thị thời điểm sự kiện sai.

**F-14 — `parseDateKeyAsLocal` fallback `new Date(value)` cho chuỗi non-`YYYY-MM-DD`** · `src/lib/utils.ts:14-20` · verified
Nếu `value` không đúng định dạng, rơi về `new Date(value)` (parse UTC cho ISO) → lệch ngày ở biên. Edge nhỏ.

**F-15 — Endpoint `getPositions` trùng lặp 2 nơi** · `src/lib/api/map.ts:4` và `src/lib/api/devices.ts:71` · verified
`mapServices.getPositions` và `deviceServices.getPositions` gọi cùng `/devices/positions`. Trùng lặp, dễ phân kỳ. `map.ts` gần như dead wrapper.

**F-16 — Hai hệ zone song song (geofences legacy + zones mới) qua adapter** · `src/lib/api/geofences.ts:203-240` · verified
`geofences.ts` vừa gọi endpoint `/geofences` cũ, vừa proxy sang `zoneServices` (`getVehicleAllowedZone`, `upsert…`) rồi map field (`circleCenter*`→`center*`). Duy trì hai bộ type/naming song song = nợ kỹ thuật, dễ lệch khi backend đổi.

**F-17 — `roundNumber`/`formatDuration` giả định input là **giây**; không có guard ms** · `src/lib/utils/date/format.ts:49-64` · verified
`formatDuration(totalSeconds)` diễn giải input là giây. Nếu caller truyền millisecond (vd `secondsSinceLastSeen` vs field `*Ms`), kết quả sai 1000×. Không kiểm tra tại util (rủi ro tuỳ caller — cần review consumer).

**F-18 — `eslint`: tắt loạt rule an toàn** · `eslint.config.mjs:11-15` · verified
`@typescript-eslint/no-explicit-any: off`, `react-hooks/set-state-in-effect: off`, `react-hooks/purity: off`, `react-hooks/incompatible-library: off`. Việc tắt `no-explicit-any` khớp thực tế `unwrap<any>` tràn lan (F-02) — lint không còn cản việc mất kiểu. `set-state-in-effect: off` che các pattern setState-trong-effect (vd `use-mobile.ts`, `use-media-query.ts` — thực tế có cleanup nên OK, nhưng rule bị tắt toàn cục nên không bảo vệ nơi khác).

**F-19 — `MQTT` env ARG khai báo trong Dockerfile nhưng không dùng trong code** · `Dockerfile:10-11,16-17` · verified
`NEXT_PUBLIC_MQTT_HOST`, `NEXT_PUBLIC_MQTT_WS_PORT` được inject nhưng grep toàn `src` không thấy consumer (chỉ `NEXT_PUBLIC_WS_URL`/`WS_PATH` được dùng ở `socket-provider.tsx`). Dead build arg.

**F-20 — `use-media-query.ts` gần như trùng `use-mobile.ts`** · `src/hooks/use-media-query.ts` vs `src/hooks/use-mobile.ts` · verified
Cả hai theo dõi `max-width: 768px`. `use-media-query` chỉ được dùng ở 3 page (`zones`, `firmware`, `exports`). Trùng chức năng, nên hợp nhất.

**F-21 — `docker-compose.yml` publish `0.0.0.0:4001` (bind mọi interface)** · `docker-compose.yml:8-9` · verified
Port map `'0.0.0.0:4001:4001'` expose container ra mọi NIC của host. Nếu host public, frontend lộ trực tiếp không qua reverse proxy. UAT (`docker-compose.uat.yml:6`) dùng `'4001:4001'` (cũng bind all mặc định). Cân nhắc bind `127.0.0.1` khi có proxy trước.

**F-22 — `compose` version `3.8` obsolete + `env_file: .env` không kiểm tra tồn tại** · `docker-compose.yml:1,10` · verified
Key `version` đã deprecated ở Compose v2. `.env` được nạp runtime nhưng các biến `NEXT_PUBLIC_*` đã bị inline lúc build (F-03) nên phần lớn không có hiệu lực — cấu hình gây hiểu nhầm là runtime-configurable.

**F-23 — `unwrap` phân biệt envelope chỉ dựa `requestId` là string + có `data`** · `src/lib/api/client.ts:89-100` · verified
Nếu payload nghiệp vụ tình cờ có field `requestId: string` và `data`, sẽ bị bóc nhầm. Xác suất thấp nhưng là heuristic mong manh; không có versioning/`meta` check dù `ApiEnvelope` có `meta`.

---

## 3. Điểm tích cực (verified)
- Interceptor loại trừ đúng `/auth/refresh` và `/auth/login` khỏi vòng retry 401 (`client.ts:35-42`) → tránh loop refresh.
- Token **không lưu localStorage** — auth-store giữ in-memory + `withCredentials` cookie (`auth-store.ts:26`, `client.ts:17,22-24`). Không dính lens "token từ localStorage" (grep chỉ thấy localStorage ở `notification-dropdown.tsx`, ngoài scope). **Đây là điểm tốt.**
- Hook có timer/listener/subscription đều cleanup đúng: `use-device-status-realtime.ts:83-85`, `use-realtime-subscription.ts:32-34`, `use-mobile.ts:12`, `use-media-query.ts:11`. Không phát hiện leak.
- `use-realtime-subscription` dùng `handlerRef` để tránh re-subscribe mỗi lần handler đổi (`:18-22`) — pattern đúng.
- `getNumberFormatter` cache `Intl.NumberFormat` (`format.ts:13-30`) — tốt cho perf.
- `system-admin.ts` `encodeURIComponent(key)` cho path param (`:167,174,...`) — tránh path injection.
- Không phát hiện dependency typosquat; version pin bằng caret (`^`) range hợp lý cho lib phổ biến (axios, zod, next 16.1.6, react 19.2.3). Dockerfile chạy `node server.js` từ `.next/standalone` (không chạy `tsx`), user non-root (`nextjs`), healthcheck có sẵn — build stage tách builder/runner đúng chuẩn.

---

## 4. Câu hỏi mở
1. **F-01/F-05:** Backend có idempotency cho mutation (POST export/command/deploy) không? Nếu chưa, retry sau refresh có gây double-write thật không — cần kiểm tra log backend.
2. **F-03:** Biến env nào thực sự được set trong `.env` production? Cần xác nhận `NEXT_PUBLIC_API_DIRECT_URL` có tồn tại lúc build không, nếu không thì API base đang chạy ở fallback nào?
3. **F-02:** Có kế hoạch parse response bằng `zod` tại ranh giới API không, hay chấp nhận cast? Đây là quyết định kiến trúc cần chủ dự án xác nhận.
4. **F-08→F-11:** Các validation schema có đang được dùng cho form thực tế không, hay đã bị thay bằng schema trong `features/*`? Cần đối chiếu tầng feature để biết schema lệch có gây bug production hay chỉ là dead code.
5. **F-16:** `/geofences` legacy còn được backend hỗ trợ không, hay đã fully migrate sang `/zones`? Nếu đã bỏ, `geofences.ts` phần gọi `/geofences` là dead.
6. **F-13/F-17:** Chuẩn timezone hiển thị của hệ là UTC+7 cố định hay theo client? Field thời lượng runtime backend trả bằng giây hay ms (ảnh hưởng `formatDuration`)?
