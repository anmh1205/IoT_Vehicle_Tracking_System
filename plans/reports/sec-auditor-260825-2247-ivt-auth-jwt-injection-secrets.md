# Báo cáo kiểm toán bảo mật IVT — Auth/JWT · Injection · Secrets

- **Ngày:** 2026-08-26 · **Phạm vi:** Tracking_Backend, Tracking_Frontend, Tracking_MqttBridge, Tracking_EMQX/PostgreSQL/NPM/Grafana/Victoria*, firmware (secrets only)
- **Phương pháp:** đọc trực tiếp dòng mã bị nghi ngờ (CONFIRMED) hoặc suy luận từ mẫu mã (SUSPECTED — ghi rõ). Không in giá trị secret thật (chỉ 3 ký tự đầu + [REDACTED]).
- **Lưu ý kiến trúc:** Hệ thống **không dùng JWT**. Auth web dùng opaque session token (random 256-bit, lưu DB dạng SHA-256 hash); auth thiết bị dùng per-device `auth_token`. Mọi kết luận về "JWT" dưới đây được thay bằng đánh giá tương đương trên cơ chế thực tế.

---

## 1. Auth & quản lý phiên (JWT/session)

**[P1] Commit chứa device auth token thật của firmware**
- `iot-vehicle-tracking-system-firmware/sdkconfig:602` — `CONFIG_TRACKER_DEFAULT_AUTH_TOKEN="72d…[REDACTED]"` (git-tracked, xác nhận bằng `git ls-files`).
- Vì sao quan trọng: ai đọc được repo có thể giả mạo thiết bị `TRACKER_001` gửi dữ liệu GPS/OBD giả tới broker `mqtt.thingdock.dev` (cũng lộ trong `sdkconfig:604-605` kèm IP fallback `103.47.…`), qua cầu thủ `verifyDeviceToken`.
- Fix: xoay token trong DB + nạp qua NVS/provisioning thay vì Kconfig default; đưa `sdkconfig` ra khỏi git (giữ `sdkconfig.defaults` không chứa giá trị thật).

**[P2] Session sliding window không có giới hạn tuyệt đối**
- `src/middleware/auth.middleware.ts:95,131` gọi `extendSession(session.id, sessionConfig.extensionHours)` ở **mọi** request; `user-session.repository.ts:40-46` đặt lại `expires_at = NOW() + interval` vô điều kiện. `SESSION_MAX_LIFETIME_HOURS` chỉ áp lúc tạo (`auth-session.service.ts:89`) nên phiên hoạt động liên tục không bao giờ hết hạn theo tuổi thọ tối đa.
- Fix: thêm cột `absolute_expires_at` và từ chối gia hạn khi vượt quá.

**[P2] Swagger UI công khai không cần xác thực**
- `src/index.ts:98-99`: `app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec))` trước mọi auth. Lộ toàn bộ bề mặt API (kèm schema lỗi) cho internet, nhất là khi backend publish thẳng `0.0.0.0:4000` (`Tracking_Backend/docker-compose.yml:9`, UAT y hệt `docker-compose.uat.yml:6`).
- Fix: giới hạn `/api-docs` theo IP nội bộ/admin hoặc tắt ở production.

**[P2] Endpoint tải firmware artifact không yêu cầu đăng nhập**
- `src/api/routes/firmware.routes.ts:21`: `router.get('/:id/download', attachUserIfAvailable, …)` đặt **trước** `router.use(requireAuth)`; `attachUserIfAvailable` (`auth.middleware.ts:103-139`) không bao giờ chặn; controller `downloadFirmware` (`firmware.controller.ts:202`) cũng không kiểm tra role. ID số tuần tự → dò được toàn bộ firmware binary.
- Có thể là chủ ý cho thiết bị OTA (tham số `encoding=hex`), nhưng hiện tại bất kỳ ai cũng tải được artifact.
- Fix: xác thực bằng device token riêng hoặc URL ký hạn thời (signed URL).

**[P2] Xác thực thiết bị chấp nhận so khớp plaintext với giá trị đã hash**
- `Tracking_MqttBridge/src/services/device-auth.service.ts:28-31` và `infrastructure/database.ts` (validateDevice): điều kiện `auth_token = encode(sha256($2),'hex') OR auth_token = $3`. Nhánh OR thứ hai nghĩa là nếu attacker có được giá trị lưu trong DB (chính là hash), gửi nguyên hash đó như token vẫn hợp lệ; đồng thời duy trì hỗ trợ token lưu plaintext kiểu legacy.
- Fix: xóa nhánh plaintext, migrate toàn bộ sang hash-only.

**[P2] Token phiên trả về trong body và giữ trong bộ nhớ JS**
- `src/api/controllers/auth.controller.ts:80,112` (`/auth/me`, `/auth/refresh`) trả `{ user, token }`; FE lưu vào zustand (`src/lib/stores/auth-store.ts`) và gắn `Bearer` (`client.ts:21-27`) + socket `auth.token` (`socket-provider.tsx:80`). Cookie httpOnly (`auth.controller.ts:52-58`) là kênh chính — tốt — nhưng việc echo token ra body làm cơ chế httpOnly mất một phần ý nghĩa (mọi XSS đọc được token trong state/memory).
- Ghi nhận đúng thiết kế cho WebSocket; cân nhắc socket auth qua cookie để bỏ hẳn token trong JS.

**[P3] Chấp nhận token qua query param trên WebSocket**
- `src/infrastructure/realtime/socket-auth.middleware.ts:17-19` nhận `query?.token` — token rơi vào access log/proxy. FE chỉ dùng `auth.token`, nên có thể bỏ nhánh query.

**[P3] Không có khóa tài khoản sau nhiều lần sai mật khẩu**
- `src/api/routes/auth.routes.ts:9`: login chỉ có rate-limit chung 100 req/phút/IP (`rate-limit.middleware.ts:15-23`), không lockout/captcha theo tài khoản → brute-force phân tán IP khả thi.

**[P3] `SESSION_SECRET` nạp nhưng không bao giờ dùng**
- `src/config/env.ts:68` định nghĩa; grep toàn `src/` không có nơi nào đọc `sessionConfig.secret` (không ký/hashing nào dùng nó). Cấu hình chết dễ gây hiểu nhầm rằng token được ký bằng nó.

**Điểm mạnh đã xác minh:** bcryptjs cost 12 (`auth.helpers.ts:4`); token 32 byte random, chỉ lưu SHA-256 hash trong DB (`crypto.util.ts:3-6`, `user-session.repository.ts:10-14`); đổi mật khẩu revoke toàn bộ phiên (`auth-password.service.ts:28`, reset admin `auth.controller.ts:233`); mọi route nghiệp vụ đều áp `requireAuth` (24/24 file routes có auth, chỉ `health`/`metrics` cố tình mở — metrics có Basic Auth guard riêng `metrics.routes.ts:22-52`); socket.io có middleware xác thực riêng; CORS single-origin + credentials (`index.ts:65-72`); helmet + rate limit chung; `trust proxy 1` chỉ bật production (`index.ts:45-47`).

## 2. Injection (SQL / command / template)

**[P2] Truy vấn VictoriaMetrics/VictoriaLogs nhận chuỗi query người dùng verbatim**
- `system-admin.service.ts:100-134` → `victoriametrics.repository.ts:27-38` (`url.searchParams.set('query', promql)`) và `victorialogs.repository.ts:8-11`. Đây là tính năng chủ đích (admin chạy PromQL/LogsQL) và endpoint bắt buộc `requireAdminRole` (`system-admin.controller.ts:44-57`), nhưng không có whitelist/timeout → admin bị chiếm phiên có thể trích xuất mọi dữ liệu observability, và query nặng có thể DoS VM/VL.
- Fix: giới hạn độ dài + timeout fetch + (tuỳ chọn) cấm label selecto ngoài `device_id`.

**Kết luận CONFIRMED sạch cho phần còn lại** (đã đọc từng vị trí động):
- Mọi giá trị người dùng đều đi qua placeholder `$n` (`pg` parameterized): search ILIKE (`driver.repository.ts:108-114` và tương tự alert/user/customer/device/vehicle/trip/violation/geofence/maintenance/firmware/audit-log), filter ngày, LIMIT/OFFSET.
- Fragment SQL nội suy đều từ nguồn tĩnh hoặc whitelist: `ALLOWED_SORT_COLUMNS` (driver `:118-120`, device `:235`, trip `:67`, vehicle `:63` — key lạ rơi về default), bảng system-admin dùng allowlist `ALLOWED_TABLES` 17 bảng + `quoteIdentifier` escape `"` (`system-admin.service.ts:179-223,315`), cột nhạy cảm bị lọc (`SENSITIVE_COLUMN_RE :213-214`, ẩn `password_hash`, `auth_token`); audit table tra map `AUDIT_TABLES` (`audit.repository.ts:82-85`); `METRIC_SQL`/`FIELD_ALIASES` là map hằng (`device-telemetry.service.ts:33-…`, `telemetry-history.service.ts:15-32`); biểu thức runtime dashboard chọn từ 2 chuỗi literal (`dashboard.repository.ts:60-70`); export type tra `EXPORT_CONFIGS` tĩnh (`export-file.service.ts:159-161`); tên cột SET trong UPDATE dựng từ tên field cố định, giá trị luôn bind tham số.
- Không tìm thấy `child_process`/`exec`/`spawn`, `eval`, `$where` trong backend + bridge (grep phủ `src/`). Không có template engine render input người dùng phía server (Next.js/React escape mặc định).
- Path handling an toàn: firmware path lấy từ DB do server tự sinh (`firmware-deploy.service.ts:102-130` kiểm tra tồn tại/kích thước/sha256); export ghi vào `EXPORTS_DIR` cố định với tên do server tạo (`export-file.service.ts:204-205`), download kiểm tra ownership theo `userId` (`export-job.service.ts`, `export.controller.ts:38-52`).
- **[P3] ILIKE wildcard do người dùng kiểm soát** — `%${search}%` không escape `%`/`_` → scan toàn bảng gây chậm (DoS nhẹ). Fix: escape ký tự wildcard trước khi bind.

## 3. Secrets trong repo

**[P2] File .env cũ nằm trong lịch sử git**
- Commit `f561f2ee3` thêm `iot-vehicle-tracking-system/.env` (+`backend/.env`); lần cuối đụng tới `af0f8d5ca` (2026-02-04). Hiện không còn track (`git ls-files` xác nhận), các `.env` thật đều đang ignored (`git status --ignored`). Kiểm tra nội dung lịch sử: `DB_PASSWORD=you…[REDACTED]`, `JWT_SECRET=you…[REDACTED]`, `TELEGRAM_BOT_TOKEN=you…[REDACTED]` — dạng placeholder "your-…"; `MQTT_PASSWORD` rỗng. Rủi ro thấp nhưng vẫn là dữ liệu nhạy cảm trong lịch sử vĩnh viễn.
- Fix: nếu từng dùng giá trị thật ở môi trường live thì rotate; cân nhắc `git filter-repo`/BFG nếu repo sẽ public.

**Không tìm thấy secret hardcode khác (CONFIRMED):**
- Không file `.pem/.key/.p12/.crt/.pfx` nào được track; `docs/cicd-required-secrets-and-env.md` không chứa giá trị thật.
- Compose dùng pattern đúng: `${POSTGRES_PASSWORD:?required}` (`Tracking_PostgreSQL/docker-compose.yml:9`), `${EMQX_DASHBOARD__DEFAULT_PASSWORD:?…}` + `${EMQX_NODE__COOKIE:?…}` (`Tracking_EMQX/docker-compose.yml:14-15`), `${GRAFANA_PASSWORD:?…}` (`Tracking_Grafana/docker-compose.yml:10`); backend/bridge/frontend chỉ `env_file: .env`.
- `.env.example` chỉ chứa `CHANGE_ME_*`.
- Firmware: không có WiFi PSK/APN password/cert nhúng; `TRACKER_MODEM_APN="internet"` là APN công khai, không phải secret.

## 4. CORS & cấu hình phụ cận (phát hiện kèm theo)

**[P1] VictoriaLogs publish ra 0.0.0.0:9428 không có authentication**
- `Tracking_VictoriaLogs/docker-compose.yml` (`ports: "0.0.0.0:9428:9428"`); service khởi động KHÔNG có flag `-httpAuth.*` hay authProxy. VictoriaLogs mặc định không xác thực → toàn bộ log ứng dụng (có thể chứa username, deviceId, nội dung lỗi) đọc được công khai nếu VPS không chặn firewall.
- Đối chứng: VictoriaMetrics **không** publish port (`Tracking_VictoriaMetrics/docker-compose.yml` không có `ports:`) — đúng chuẩn.
- Fix: bỏ mapping 9428 (bridge đã nói chuyện qua network nội bộ) hoặc đặt sau vmauth/NPM với auth.

**[P1] PostgreSQL publish 0.0.0.0:5432**
- `Tracking_PostgreSQL/docker-compose.yml:14-15`. Tường lửa VPS là lớp phòng duy nhất; mật khẩu mạnh là điều kiện cần chứ không đủ (brute-force + CVE).
- Fix: xóa mapping, chỉ giữ mạng Docker nội bộ; truy cập qua SSH tunnel khi cần debug.

**[P2] EMQX giữ listener TCP 1883 không mã hóa mở trên 0.0.0.0**
- `Tracking_EMQX/etc/emqx.conf:9-12` (`bind 0.0.0.0:1883`, max_connections 10240). Firmware có logic buộc TLS theo sentinel host (`mqtt_topics.c:40-43`, `mqtt_internal.h:52` — `mqtt.thingdock.dev` chính là sentinel) nên luồng chính đi 8883, nhưng 1883 vẫn là bề mặt tấn công (credential stuffing, thiết bị cấu hình sai kết nối plaintext làm lộ token).
- **[P2]** Đồng thời `sdkconfig:606`: `# CONFIG_TRACKER_TLS_VERIFY_SERVER is not set` — TLS bật nhưng **tắt xác thực chứng chỉ server** → MITM bằng cert tùy ý vẫn đọc/ghi được luồng MQTT.
- Fix: đóng listener 1883 ở broker công khai; bật `CONFIG_TRACKER_TLS_VERIFY_SERVER=y` (CA isrgrootx1 đã có sẵn logic trong Kconfig).

**[P3] `/health` trả message lỗi dependency gốc cho client ẩn danh**
- `health.routes.ts:20-22` (`checks.database.error = err.message`) — lộ chi tiết nội bộ (host/port DB…). Fix: chỉ trả status, log chi tiết phía server. Tương tự `/ws-health` (`index.ts:91-93`) mở snapshot realtime.

**[P3] Basic Auth của `/metrics` so sánh không constant-time và phân tích cứng `user:pass`**
- `metrics.routes.ts:42-48`: bỏ qua username, `decoded.split(':')[1]` hỏng nếu mật khẩu chứa `:`; dùng `!==` thường (timing). Fix: dùng `crypto.timingSafeEqual` và tách theo dấu `:` đầu tiên.

**CORS:** cấu hình tốt — single origin từ env (`env.ts:73-75`), `credentials: true`, method/header giới hạn rõ (`index.ts:66-71`). Không thấy `origin: '*'` kèm credentials. FE middleware.ts chỉ kiểm tra sự tồn tại của cookie để redirect UX (không phải ranh giới bảo mật — enforcement thật nằm ở API, đúng mô hình).

---

## Tổng hợp

| Mức | Số lượng | Finding |
|-----|----------|---------|
| P0  | 0        | — |
| P1  | 3        | Token thiết bị commit trong sdkconfig; VictoriaLogs 9428 public không auth; PostgreSQL 5432 public |
| P2  | 7        | Session không cap tuyệt đối; /api-docs public; firmware download ẩn danh; nhánh plaintext device-token; PromQL/LogsQL verbatim (admin); EMQX 1883 mở; TLS verify tắt phía firmware; .env cũ trong lịch sử git |
| P3  | 7        | Socket query-token; không account lockout; SESSION_SECRET chết; ILIKE wildcard; /health lộ lỗi; metrics Basic Auth yếu; (gộp) token echo trong body |

*Ghi chú đếm: nhóm P2 liệt kê 8 dòng vì hai mục EMQX/TLS-verify gắn cùng một phát hiện hạ tầng.*

## File đã quét, sạch (không phát hiện)
Backend: `pool.ts`, `queries.ts`, `errors.util.ts`, `postgres-error.util.ts`, `async-handler.util.ts`, `response.util.ts`, toàn bộ `api/validators/*` (zod), `user.repository.ts`, `user-session.repository.ts`, `auth-session.service.ts`, `auth-password.service.ts`, `user-management.service.ts`, `simulator.service.ts` (SQL parameterized; lưu ý vận hành: swap token simulator có thể kẹt nếu process crash giữa chừng), `export-*`, `telemetry-history.service.ts`, `device-telemetry.service.ts`, `audit-log.service.ts`, các repository alert/violation/customer/geofence/maintenance/trip/vehicle/driver/error-code/notification/validation-error. Bridge: `mqtt/client.ts`, `config/env.ts` (ép TLS ngoài dev), handlers event/status/firmware/rawdata (đều gọi verifyDeviceToken). Infra: compose của Backend/Frontend/MqttBridge/NPM/Grafana/VictoriaMetrics, `emqx.conf`. Frontend: `client.ts`, `auth.ts`, `session-guard.tsx`, `base-url.ts`, `middleware.ts`, `next.config.ts` (NEXT_PUBLIC_* chỉ là URL, không chứa secret).

## Câu hỏi chưa giải quyết
1. Repo GitHub hiện tại là public hay private? Quyết định mức ưu tiên P1 token-firmware và việc scrub lịch sử git.
2. Firewall VPS (ufw/security group) có đang chặn 5432/9428/1883 từ internet không? Nếu có, hai finding P1 hạ tầng giảm xuống P2/P3.
3. Route `GET /firmware/:id/download` mở cho ẩn danh là chủ ý cho thiết bị OTA hay thiếu sót? Thiết bị hiện xác thực thế nào khi tải OTA?
