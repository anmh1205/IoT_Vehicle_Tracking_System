# Báo Cáo Kiểm Tra Hệ Thống Cloud

> **Dự án:** Hệ thống Giám sát Phương tiện IoT (IoT Vehicle Tracking System)
> **Ngày kiểm tra:** 13/02/2026
> **Phạm vi:** Backend, Frontend, Hạ tầng (MQTT Bridge, Docker, PostgreSQL, EMQX)
> **Tổng số phát hiện:** 93 (12 Nghiêm trọng, 24 Cao, 34 Trung bình, 23 Thấp)

---

## 1. Tổng Quan

| Thành phần | Nghiêm trọng | Cao | Trung bình | Thấp | Tổng |
|------------|---------------|-----|------------|------|------|
| **Backend** (Tracking_Backend) | 5 | 8 | 10 | 6 | **29** |
| **Frontend** (Tracking_Frontend) | 1 | 6 | 12 | 8 | **27** |
| **Hạ tầng** (MqttBridge, Docker, PostgreSQL, EMQX) | 6 | 10 | 12 | 9 | **37** |
| **TỔNG CỘNG** | **12** | **24** | **34** | **23** | **93** |

### Điểm yếu kiến trúc chính

Hệ thống hiện tại chỉ kiểm tra **"người dùng đã đăng nhập chưa"** (qua middleware `requireAuth`) nhưng **không bao giờ kiểm tra "người dùng có quyền làm việc này không"**. Vai trò (role) được lưu trong cơ sở dữ liệu (`users.role`) nhưng không có middleware nào kiểm soát quyền truy cập. Hệ quả là bất kỳ người dùng nào đã đăng nhập đều có thể thực hiện các thao tác cấp quản trị viên.

---

## 2. Các Phát Hiện Mức NGHIÊM TRỌNG (12)

### 2.1 Backend — Nghiêm trọng (5)

#### C-BE-01: Không kiểm soát phân quyền (RBAC) trên các route quản lý người dùng
- **File:** `Tracking_Backend/src/api/routes/auth.routes.ts`
- **Vấn đề:** Các route `GET/POST/PATCH/DELETE /users` chỉ dùng middleware `requireAuth` — không kiểm tra vai trò. Bất kỳ người dùng đã đăng nhập nào cũng có thể tạo tài khoản admin, xóa người dùng, hoặc thay đổi vai trò.
- **Tác động:** Leo thang đặc quyền hoàn toàn. Người dùng thường có thể tự cấp quyền admin cho mình.
- **Cách sửa:** Thêm middleware `requireRole('admin')` vào tất cả route quản lý người dùng.

#### C-BE-02: Endpoint nhận dữ liệu IoT không được bảo vệ
- **File:** `Tracking_Backend/src/api/routes/iot.routes.ts`
- **Vấn đề:** `router.post('/data', iotController.ingestData)` không có middleware xác thực và không có giới hạn tốc độ (rate limiting). So sánh token trong tầng service dùng so sánh chuỗi thường (dễ bị tấn công timing attack).
- **Tác động:** Bất kỳ ai cũng có thể gửi dữ liệu telemetry giả mạo. Không có giới hạn tốc độ nên có thể bị tấn công flood.
- **Cách sửa:** Thêm middleware xác thực API key + giới hạn tốc độ. Dùng `timingSafeEqual()` để so sánh token.

#### C-BE-03: Tạo mật khẩu tạm không an toàn
- **File:** `Tracking_Backend/src/api/controllers/auth.controller.ts`
- **Vấn đề:** Mật khẩu tạm thời dùng `Math.random()` — hàm này không an toàn về mặt mật mã, có thể dự đoán được.
- **Tác động:** Kẻ tấn công có thể đoán được mật khẩu tạm.
- **Cách sửa:** Dùng `crypto.randomBytes(16).toString('hex')` hoặc `crypto.randomUUID()`.

#### C-BE-04: Token phiên đăng nhập bị lộ trong phản hồi /auth/me
- **File:** `Tracking_Backend/src/api/controllers/auth.controller.ts`
- **Vấn đề:** `GET /auth/me` trả về token phiên đăng nhập dạng thô trong body phản hồi, khiến nó bị lộ cho JavaScript và các middleware ghi log.
- **Tác động:** Token có thể bị đánh cắp qua XSS, log, hoặc công cụ dev trình duyệt.
- **Cách sửa:** Xóa trường `token` khỏi phản hồi `/auth/me`. Token chỉ nên tồn tại trong cookie HTTP-only.

#### C-BE-05: Chế độ Dev cho phép chạy khi thiếu khóa bí mật
- **File:** `Tracking_Backend/src/config/env.ts`
- **Vấn đề:** Hàm `requireEnv()` trả về chuỗi rỗng trong môi trường dev khi thiếu biến môi trường bí mật (bao gồm `SESSION_SECRET`), thay vì báo lỗi.
- **Tác động:** Ứng dụng chạy với khóa bí mật rỗng/yếu trong môi trường phát triển, che giấu lỗi cấu hình.
- **Cách sửa:** Luôn ném lỗi (throw) cho các biến môi trường quan trọng về bảo mật (`SESSION_SECRET`, `POSTGRESQL_PASSWORD`).

### 2.2 Frontend — Nghiêm trọng (1)

#### C-FE-01: Cho phép tải ảnh từ mọi domain (nguy cơ SSRF)
- **File:** `Tracking_Frontend/next.config.ts`
- **Vấn đề:** `remotePatterns: [{ hostname: '**' }]` cho phép component Image của Next.js proxy BẤT KỲ URL bên ngoài nào.
- **Tác động:** Tấn công SSRF (Server-Side Request Forgery) — kẻ tấn công có thể dò mạng nội bộ thông qua endpoint tối ưu ảnh.
- **Cách sửa:** Chỉ cho phép các hostname cụ thể (ví dụ: `api.yourdomain.com`, `tiles.openstreetmap.org`).

### 2.3 Hạ tầng — Nghiêm trọng (6)

#### C-IN-01: MQTT TLS bị tắt mặc định
- **File:** `Tracking_MqttBridge/src/config/env.ts`
- **Vấn đề:** `MQTT_USE_TLS` mặc định là `false` và `MQTT_REJECT_UNAUTHORIZED` mặc định là `false`. Dữ liệu telemetry (tọa độ GPS, dữ liệu OBD2) được truyền dưới dạng văn bản thường (không mã hóa).
- **Tác động:** Tấn công nghe lén (Man-in-the-middle) có thể chặn/sửa đổi toàn bộ dữ liệu telemetry phương tiện.
- **Cách sửa:** Đặt mặc định `MQTT_USE_TLS=true` và `MQTT_REJECT_UNAUTHORIZED=true`. Chỉ cho phép ghi đè trong chế độ dev rõ ràng.

#### C-IN-02: 3 trong 4 handler MQTT thiếu xác thực
- **File:**
  - `Tracking_MqttBridge/src/handlers/status.handler.ts`
  - `Tracking_MqttBridge/src/handlers/event.handler.ts`
  - `Tracking_MqttBridge/src/handlers/firmware.handler.ts`
- **Vấn đề:** Chỉ có `rawdata.handler.ts` xác thực `auth_token`. 3 handler còn lại chấp nhận mọi tin nhắn mà không cần xác thực. Thiết bị giả mạo có thể gửi cập nhật trạng thái, sự kiện, hoặc báo cáo firmware giả.
- **Tác động:** Mạo danh thiết bị không cần xác thực trên các kênh status/events/firmware.
- **Cách sửa:** Thêm `validateDeviceAuth()` vào tất cả handler, hoặc tạo middleware xác thực dùng chung.

#### C-IN-03: Cookie Erlang được mã cứng trong cấu hình EMQX
- **File:** `Tracking_EMQX/etc/emqx.conf`
- **Vấn đề:** `node.cookie = tracking_emqx_secret_cookie` được mã cứng trong file cấu hình đã commit lên Git. Cookie này dùng để xác thực các node trong cụm Erlang.
- **Tác động:** Kẻ tấn công có cookie này có thể tham gia cụm EMQX và chạy mã Erlang tùy ý.
- **Cách sửa:** Chuyển sang biến môi trường: `node.cookie = ${EMQX_NODE_COOKIE}`.

#### C-IN-04: Mật khẩu admin mặc định trong dữ liệu khởi tạo
- **File:** `Tracking_PostgreSQL/init/01-users.sql`
- **Vấn đề:** Tài khoản admin được tạo sẵn với mật khẩu đã biết `Admin@2026` (hash bcrypt trong file SQL). Mật khẩu này tồn tại vĩnh viễn trong lịch sử Git.
- **Tác động:** Bất kỳ ai có quyền truy cập repo đều biết mật khẩu admin.
- **Cách sửa:** Tạo sẵn với mật khẩu ngẫu nhiên, buộc đổi mật khẩu khi đăng nhập lần đầu, hoặc dùng biến môi trường cho mật khẩu khởi tạo.

#### C-IN-05: Không có ràng buộc CHECK trên cột vai trò/trạng thái người dùng
- **File:** `Tracking_PostgreSQL/init/01-users.sql`
- **Vấn đề:** `users.role` và `users.status` là kiểu `VARCHAR` không có ràng buộc `CHECK`. Có thể chèn bất kỳ giá trị chuỗi nào.
- **Tác động:** Vi phạm toàn vẹn dữ liệu. Các vai trò/trạng thái không hợp lệ có thể vượt qua logic ứng dụng.
- **Cách sửa:** Thêm `CHECK (role IN ('admin', 'operator', 'viewer'))` và `CHECK (status IN ('active', 'inactive', 'suspended'))`.

#### C-IN-06: Schema handler firmware không khớp với cơ sở dữ liệu
- **File:** `Tracking_MqttBridge/src/handlers/firmware.handler.ts`
- **Vấn đề:** Schema Zod xác thực `status` là `'downloading'|'installing'` nhưng enum trong cơ sở dữ liệu chỉ có `'started'|'in_progress'|'success'|'failed'|'timeout'`. Ngoài ra, câu INSERT chèn vào cột `progress` và `target_version` — hai cột này không tồn tại trong bảng.
- **Tác động:** Mọi tin nhắn trạng thái firmware sẽ lỗi INSERT. Tính năng này bị hỏng âm thầm.
- **Cách sửa:** Đồng bộ schema Zod với enum thực tế trong CSDL. Thêm cột thiếu hoặc xóa khỏi câu INSERT.

---

## 3. Các Phát Hiện Mức CAO (24)

### 3.1 Backend — Cao (8)

| Mã | Phát hiện | File | Mô tả |
|----|-----------|------|--------|
| H-BE-01 | Không xử lý `unhandledRejection` | `src/index.ts` | Promise bị reject không được xử lý sẽ crash âm thầm mà không dọn dẹp tài nguyên |
| H-BE-02 | Tham gia phòng Socket.IO không cần phân quyền | `socket-server.util.ts` | Bất kỳ người dùng đã đăng nhập nào cũng có thể tham gia phòng `device:{id}` bất kỳ và nhận dữ liệu telemetry |
| H-BE-03 | CORS dạng wildcard khi cấu hình `*` | `socket-server.util.ts` | Socket.IO chấp nhận mọi origin khi CORS_ORIGIN là `*` |
| H-BE-04 | Token trong query string của WebSocket | `socket-auth.middleware.ts` | Token phiên đăng nhập lộ trong URL, bị ghi log bởi proxy/server |
| H-BE-05 | Nhận dữ liệu IoT không có transaction | `iot-ingestion.service.ts` | 4-5 câu truy vấn tuần tự không có transaction — ghi dữ liệu một phần khi có lỗi |
| H-BE-06 | Dọn phiên hết hạn không bao giờ chạy | `user-session.repository.ts` | Hàm `cleanupExpired()` tồn tại nhưng không bao giờ được gọi. Phiên tích lũy mãi mãi |
| H-BE-07 | Timestamp rate limit bị cũ | `rate-limit.middleware.ts` | `message.timestamp` được tính tại thời điểm nạp module, không bao giờ được cập nhật |
| H-BE-08 | Route alias trùng lặp | `routes/index.ts` | `device`/`devices`, `export`/`exports`, `stats`/`statistics` — gây nhầm lẫn API |

### 3.2 Frontend — Cao (6)

| Mã | Phát hiện | File | Mô tả |
|----|-----------|------|--------|
| H-FE-01 | Middleware chỉ kiểm tra sự tồn tại cookie | `middleware.ts` | Không xác thực giá trị token — token hết hạn/không hợp lệ vẫn được cho qua |
| H-FE-02 | Hiển thị thông báo lỗi thô cho người dùng | `error.tsx`, `global-error.tsx` | `error.message` hiển thị trực tiếp — lộ stack trace/thông tin nội bộ |
| H-FE-03 | Session guard nuốt mọi lỗi | `session-guard.tsx` | `.catch(() => clearAuth())` coi lỗi mạng như 401 — đăng xuất cả khi bị timeout mạng |
| H-FE-04 | Lưu token kép (cookie + Zustand) | `auth-store.ts` | Token lưu ở cả cookie và Zustand state — có thể bị lệch nhau |
| H-FE-05 | `socket.off('disconnect')` gỡ TẤT CẢ listener | `connection-banner.tsx` | Phá hỏng handler disconnect của SocketProvider, ngăn kết nối lại |
| H-FE-06 | Phân quyền chỉ ở phía client | `use-role-access.ts` | Ẩn phần tử UI nhưng route vẫn truy cập được bằng nhập URL trực tiếp |

### 3.3 Hạ tầng — Cao (10)

| Mã | Phát hiện | File | Mô tả |
|----|-----------|------|--------|
| H-IN-01 | Bộ nhớ cache trạng thái thiết bị không giới hạn | `device-state.cache.ts` | `Map<string, DeviceState>` tăng không giới hạn — không có TTL, không có loại bỏ |
| H-IN-02 | Truy vấn CSDL mỗi tin nhắn MQTT để xác thực | `rawdata.handler.ts` | Mỗi tin nhắn raw data đều gọi `SELECT` để xác thực token — không có cache |
| H-IN-03 | Không có giới hạn tốc độ theo thiết bị trên MQTT | `index.ts` | Thiết bị bị xâm nhập có thể spam tin nhắn mà không bị chặn |
| H-IN-04 | Session ID dùng bộ đếm `Date.now()` | `device-state.cache.ts` | Session ID đơn điệu, dự đoán được thay vì dùng random mật mã |
| H-IN-05 | Token xác thực thiết bị lưu SHA-256 không có salt | `infrastructure/database.ts` | Hash không salt cho phép tấn công rainbow table nếu CSDL bị lộ |
| H-IN-06 | Không có healthcheck trên Docker container | Tất cả `docker-compose.yml` ứng dụng | Container Backend, Frontend, MqttBridge không có healthcheck — orchestrator không phát hiện được lỗi |
| H-IN-07 | Dashboard NPM admin mở trên 0.0.0.0:81 | `Tracking_NPM/docker-compose.yml` | Trang quản trị Nginx Proxy Manager lộ ra tất cả giao diện mạng với mật khẩu mặc định |
| H-IN-08 | `unhandledRejection` không kích hoạt shutdown | `MqttBridge/src/index.ts` | Ghi log lỗi nhưng tiếp tục chạy trong trạng thái có thể bị hỏng |
| H-IN-09 | Không có ràng buộc FK trên event_logs.device_id | `init/04-event-logs.sql` | Có thể xuất hiện bản ghi mồ côi — sự kiện tham chiếu đến thiết bị đã bị xóa |
| H-IN-10 | Cấu hình SSL trong EMQX tham chiếu file chứng chỉ không tồn tại | `Tracking_EMQX/etc/emqx.conf` | Cấu hình SSL trỏ đến file chứng chỉ không có trong repo |

---

## 4. Các Phát Hiện Mức TRUNG BÌNH (34)

### 4.1 Backend — Trung bình (10)

| Mã | Phát hiện | File |
|----|-----------|------|
| M-BE-01 | Mảng import không giới hạn kích thước trong device controller | `device.controller.ts` |
| M-BE-02 | Vấn đề truy vấn N+1 khi liệt kê thiết bị | `device.controller.ts` |
| M-BE-03 | Tham số lệnh (command) không được validate | `device-command.service.ts` |
| M-BE-04 | Không giới hạn trần cho phân trang (pagination limit) | Nhiều controller |
| M-BE-05 | Thiếu middleware timeout cho request | `index.ts` |
| M-BE-06 | Tính trung bình chạy (running average) cho rung động không chính xác | `iot-ingestion.service.ts` |
| M-BE-07 | Không có bảo vệ CSRF trên các endpoint thay đổi trạng thái | Tất cả route POST/PATCH/DELETE |
| M-BE-08 | Helmet CSP chưa được cấu hình (dùng mặc định) | `index.ts` |
| M-BE-09 | Không giới hạn kích thước body request | `index.ts` |
| M-BE-10 | Mount route kép (/api/v1 và /api) | `index.ts` |

### 4.2 Frontend — Trung bình (12)

| Mã | Phát hiện | File |
|----|-----------|------|
| M-FE-01 | Race condition khi 401 — nhiều request cùng redirect | `client.ts` |
| M-FE-02 | Mỗi component tạo `setInterval` riêng (100+ thiết bị = 100+ timer) | `use-device-status-realtime.ts` |
| M-FE-03 | `useMemo` dùng dependency là object (bị vô hiệu hóa bởi tham chiếu mới) | `use-device-status-realtime.ts` |
| M-FE-04 | File API service trùng lặp (export.ts và exports.ts) | `src/lib/api/` |
| M-FE-05 | Trang dashboard hoàn toàn `'use client'` với 5 truy vấn song song | `dashboard/page.tsx` |
| M-FE-06 | Không có Suspense boundary trên các trang tải dữ liệu | Nhiều trang |
| M-FE-07 | URL dự phòng mã cứng trong socket provider | `socket-provider.tsx` |
| M-FE-08 | Thử kết nối lại WebSocket vô hạn lần | `socket-provider.tsx` |
| M-FE-09 | Không có trạng thái loading khi ô bản đồ tải lỗi | `map-view.tsx` |
| M-FE-10 | Thiếu directive `'use client'` tiềm ẩn | `login/page.tsx` |
| M-FE-11 | Kích thước bundle lớn — import toàn bộ ECharts | Nhiều component biểu đồ |
| M-FE-12 | Không có error boundary theo từng module tính năng | Các feature component |

### 4.3 Hạ tầng — Trung bình (12)

| Mã | Phát hiện | File |
|----|-----------|------|
| M-IN-01 | Batch thất bại bị mất vĩnh viễn — không có hàng đợi dead-letter | `batch-writer.service.ts` |
| M-IN-02 | Circuit breaker chỉ reset theo timer — không có health probe | `batch-writer.service.ts` |
| M-IN-03 | Không có connection pooling cho ghi HTTP VictoriaMetrics | `batch-writer.service.ts` |
| M-IN-04 | MQTT QoS 1 với `clean: false` nhưng không có session ID cố định | `MqttBridge/src/config/` |
| M-IN-05 | Không có graceful drain khi MQTT ngắt kết nối | `MqttBridge/src/index.ts` |
| M-IN-06 | PostgreSQL dùng superuser `postgres` cho ứng dụng | Tất cả `docker-compose.yml` |
| M-IN-07 | Chưa định nghĩa chiến lược sao lưu/khôi phục | Hạ tầng chung |
| M-IN-08 | Chưa cấu hình thời gian lưu giữ dữ liệu VictoriaMetrics | `Tracking_VictoriaMetrics/` |
| M-IN-09 | Không có giới hạn tài nguyên trên Docker container | Tất cả `docker-compose.yml` |
| M-IN-10 | Mật khẩu dashboard EMQX trong docker-compose | `Tracking_EMQX/docker-compose.yml` |
| M-IN-11 | Không có xoay vòng log cho VictoriaLogs | `Tracking_VictoriaLogs/` |
| M-IN-12 | Thiếu ghim phiên bản docker-compose.yml | Nhiều file compose |

---

## 5. Các Phát Hiện Mức THẤP (23)

### 5.1 Backend — Thấp (6)

| Mã | Phát hiện |
|----|-----------|
| L-BE-01 | Còn câu lệnh `console.log` trong code production |
| L-BE-02 | Định dạng phản hồi lỗi không nhất quán giữa các controller |
| L-BE-03 | Thiếu chú thích OpenAPI/Swagger trên một số endpoint |
| L-BE-04 | Chưa có chiến lược deprecation cho phiên bản API |
| L-BE-05 | Import không sử dụng trong một số file service |
| L-BE-06 | Thiếu JSDoc trên các phương thức repository |

### 5.2 Frontend — Thấp (8)

| Mã | Phát hiện |
|----|-----------|
| L-FE-01 | Đặt tên file component không nhất quán (PascalCase lẫn kebab-case) |
| L-FE-02 | Một số trang thiếu meta title/description |
| L-FE-03 | Không có skeleton loading trên bảng dữ liệu |
| L-FE-04 | Trợ năng: thiếu aria-label trên các nút chỉ có icon |
| L-FE-05 | Không hỗ trợ điều hướng bàn phím trên component bản đồ |
| L-FE-06 | Vấn đề tương phản màu trên một số huy hiệu trạng thái |
| L-FE-07 | Thiếu các biến thể favicon (apple-touch-icon...) |
| L-FE-08 | Chưa cấu hình PWA manifest |

### 5.3 Hạ tầng — Thấp (9)

| Mã | Phát hiện |
|----|-----------|
| L-IN-01 | Chưa tối ưu `.dockerignore` (node_modules, .git) |
| L-IN-02 | Chưa dùng multi-stage Docker build cho Frontend |
| L-IN-03 | Không ghim phiên bản tag Docker image (dùng `latest`) |
| L-IN-04 | Thiếu provisioning dashboard Grafana |
| L-IN-05 | Chưa định nghĩa quy tắc cảnh báo Prometheus |
| L-IN-06 | Metrics EMQX chưa được Prometheus thu thập |
| L-IN-07 | Chưa có công cụ migration cơ sở dữ liệu tự động |
| L-IN-08 | Thiếu `.env.example` cho một số service |
| L-IN-09 | Không phân đoạn mạng Docker (tất cả service trên một mạng) |

---

## 6. Các Thực Hành Bảo Mật Tốt Đã Có (13 điểm)

Hệ thống đã áp dụng nhiều thực hành bảo mật tốt:

1. **Truy vấn SQL có tham số hóa** xuyên suốt — không tìm thấy lỗ hổng SQL injection
2. **bcryptjs với 12 vòng hash** cho mật khẩu
3. **Token phiên được hash SHA-256** trong CSDL (không lưu dạng thô)
4. **Helmet.js** bật cho các header bảo mật
5. **Giới hạn tốc độ** trên endpoint xác thực (10 request/15 phút)
6. **Xác thực Zod** trên tất cả đầu vào request (cả backend lẫn frontend)
7. **Cấu hình CORS** với origin rõ ràng
8. **Cookie HTTP-only** cho việc truyền token phiên
9. **Middleware Request-ID** cho việc truy vết
10. **Xử lý tắt máy an toàn** (SIGTERM/SIGINT) trên backend
11. **EMQX tắt truy cập ẩn danh** (`allow_anonymous = false`)
12. **EMQX mặc định từ chối ACL** (`authorization.no_match = deny`)
13. **Mô hình Circuit breaker** trong batch writer của MQTT Bridge

---

## 7. Lộ Trình Sửa Lỗi

### Đợt 1 — Bảo Mật Nghiêm Trọng (Tuần 1)

| Ưu tiên | Công việc | Mã lỗi | Thời gian ước tính |
|----------|-----------|---------|---------------------|
| P0 | Thêm middleware RBAC + áp dụng cho tất cả route quản trị | C-BE-01 | 4 giờ |
| P0 | Bảo vệ endpoint IoT (API key + rate limit + timingSafeEqual) | C-BE-02 | 3 giờ |
| P0 | Thay `Math.random()` bằng `crypto.randomBytes()` | C-BE-03 | 30 phút |
| P0 | Xóa token khỏi phản hồi `/auth/me` | C-BE-04 | 30 phút |
| P0 | Thêm xác thực vào handler MQTT status/event/firmware | C-IN-02 | 2 giờ |
| P0 | Giới hạn hostname ảnh trong next.config.ts | C-FE-01 | 30 phút |
| P0 | Sửa schema handler firmware cho khớp với CSDL | C-IN-06 | 2 giờ |
| P0 | Chuyển Erlang cookie EMQX sang biến môi trường | C-IN-03 | 30 phút |

**Tổng ước tính: khoảng 13 giờ**

### Đợt 2 — Gia Cố Hệ Thống (Tuần 2)

| Ưu tiên | Công việc | Mã lỗi | Thời gian ước tính |
|----------|-----------|---------|---------------------|
| P1 | Bật MQTT TLS mặc định | C-IN-01 | 2 giờ |
| P1 | Thêm xử lý `unhandledRejection`/`uncaughtException` | H-BE-01, H-IN-08 | 1 giờ |
| P1 | Sửa phân quyền tham gia phòng Socket.IO | H-BE-02 | 2 giờ |
| P1 | Chuyển token từ query string sang Socket.IO auth | H-BE-04 | 2 giờ |
| P1 | Bọc nhận dữ liệu IoT trong transaction | H-BE-05 | 1 giờ |
| P1 | Thêm cron dọn phiên hết hạn | H-BE-06 | 1 giờ |
| P1 | Sửa connection-banner socket.off() | H-FE-05 | 30 phút |
| P1 | Thêm healthcheck Docker cho tất cả service | H-IN-06 | 2 giờ |
| P1 | Giới hạn NPM admin chỉ trên localhost | H-IN-07 | 30 phút |
| P1 | Thêm cơ chế loại bỏ cache trạng thái thiết bị (LRU/TTL) | H-IN-01 | 2 giờ |
| P1 | Cache token xác thực thiết bị trong MqttBridge | H-IN-02 | 2 giờ |
| P1 | Thêm ràng buộc CHECK cho bảng users | C-IN-05 | 1 giờ |
| P1 | Buộc đổi mật khẩu admin khi đăng nhập lần đầu | C-IN-04 | 2 giờ |
| P1 | Sửa `requireEnv()` luôn báo lỗi cho biến bí mật | C-BE-05 | 1 giờ |

**Tổng ước tính: khoảng 20 giờ**

### Đợt 3 — Chất Lượng & Độ Tin Cậy (Tuần 3-4)

| Ưu tiên | Công việc | Mã lỗi | Thời gian ước tính |
|----------|-----------|---------|---------------------|
| P2 | Hợp nhất lưu trữ token kép | H-FE-04 | 3 giờ |
| P2 | Sửa error boundary (làm sạch error.message) | H-FE-02 | 2 giờ |
| P2 | Sửa xử lý lỗi session guard | H-FE-03 | 1 giờ |
| P2 | Thêm bảo vệ race condition khi 401 | M-FE-01 | 2 giờ |
| P2 | Tối ưu timer trạng thái thiết bị (dùng interval chung) | M-FE-02 | 2 giờ |
| P2 | Thêm hàng đợi dead-letter cho batch thất bại | M-IN-01 | 4 giờ |
| P2 | Tạo user PostgreSQL riêng (không phải superuser) | M-IN-06 | 2 giờ |
| P2 | Thêm giới hạn tốc độ MQTT theo thiết bị | H-IN-03 | 3 giờ |
| P2 | Cấu hình thời gian lưu giữ VictoriaMetrics | M-IN-08 | 1 giờ |
| P2 | Thêm giới hạn tài nguyên Docker | M-IN-09 | 2 giờ |
| P2 | Thêm middleware bảo vệ CSRF | M-BE-07 | 3 giờ |
| P2 | Cấu hình Helmet CSP đúng cách | M-BE-08 | 2 giờ |
| P2 | Tree-shake import ECharts | M-FE-11 | 2 giờ |
| P2 | Thêm Suspense boundary cho các trang dữ liệu | M-FE-06 | 3 giờ |

**Tổng ước tính: khoảng 32 giờ**

---

## 8. Ma Trận Đánh Giá Rủi Ro

```
Tác động
  ^
  |  C-BE-01    C-IN-02         C-BE-02
  |  (RBAC)     (MQTT Auth)     (IoT Endpoint)
  |
Cao|─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  |  C-BE-04    C-IN-01         C-FE-01
  |  (Token)    (MQTT TLS)      (SSRF)
  |
TB |─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  |  C-BE-03    C-IN-06         H-BE-06
  |  (Random)   (Schema)        (Phiên)
  |
Thấp|─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  +──────────┬──────────┬──────────┬──────────>
           Thấp     Trung bình    Cao    Khả năng xảy ra
```

---

## 9. Khuyến Nghị Kiến Trúc

### Ngắn hạn (Sprint hiện tại)
1. **Triển khai middleware RBAC** — Tạo middleware `requireRole(...roles)` kiểm tra `req.user.role`
2. **Thống nhất mô hình xác thực** — Tất cả handler MQTT nên dùng chung hàm `validateDeviceAuth()`
3. **Hàm bọc transaction** — Tạo tiện ích `withTransaction(pool, callback)` cho các thao tác nhiều truy vấn

### Trung hạn (Sprint tiếp theo)
1. **Mô hình API Gateway** — Xem xét thêm rate limiting, xác thực, và ghi log tại tầng gateway
2. **Cache xác thực theo sự kiện** — Cache token thiết bị trong MqttBridge với TTL, vô hiệu hóa qua topic MQTT
3. **Chuẩn hóa phản hồi lỗi** — Thống nhất định dạng: `{ error: { code, message, details } }`

### Dài hạn (Quý tiếp theo)
1. **mTLS cho MQTT** — Chuyển từ xác thực bằng token sang xác thực bằng chứng chỉ
2. **Migration cơ sở dữ liệu** — Thay thế script SQL khởi tạo bằng công cụ migration (ví dụ: node-pg-migrate)
3. **Khả năng quan sát (Observability)** — Hoàn thiện pipeline Prometheus + Grafana + cảnh báo

---

*Tạo bởi Kiểm tra Hệ thống Cloud — IoT Vehicle Tracking System*
*Kiểm tra thực hiện ngày 13/02/2026*
