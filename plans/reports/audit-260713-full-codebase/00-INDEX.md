# 00 — INDEX: Audit toàn bộ codebase IoT Vehicle Tracking System

- **Ngày:** 2026-07-13 → 2026-07-14
- **Phương pháp:** READ-ONLY. 12 subagent quét song song, mỗi con đọc IN FULL từng file trong scope (không sampling), ghi 1 report `path:line` + severity. INDEX này tổng hợp bằng cách **đọc trọn từng report**, không đếm bằng grep.
- **Phạm vi:** toàn monorepo — Firmware ESP32-S3, ECU Simulator, MqttBridge, Backend (Node/TS), Frontend (Next.js), Mobile (Flutter).
- **Severity:** CRITICAL (khai thác/mất dữ liệu/brick ngay) · HIGH (lỗ hổng/sai dữ liệu nghiêm trọng) · MEDIUM (correctness/resilience) · LOW (nợ kỹ thuật/style).

---

## 1. Bảng tổng hợp theo component

| # | Report | Component | Files đọc | CRIT | HIGH | MED | LOW | Σ |
|---|--------|-----------|----------:|-----:|-----:|----:|----:|--:|
| 01 | `01-ecu-simulator.md` | ECU Simulator (AVR/PlatformIO) | 15 | 0 | 1 | 5 | 8 | 14 |
| 02 | `02-mobile-flutter.md` | Mobile (Flutter/Dart) | 22 | **2** | 3 | 8 | 8 | 21 |
| 03 | `03-mqtt-bridge.md` | MqttBridge (TS) | 40 | 0 | 5 | 9 | 6 | 20 |
| 04 | `04-backend-api.md` | Backend API + Middleware | ~75 | **3** | 3 | 6 | 7 | 19 |
| 05 | `05-backend-domain-core.md` | Backend domain (alert→geofence) + infra | ~70 | **3** | 5 | 7 | 6 | 21 |
| 06 | `06-backend-domain-fleet.md` | Backend domain (iot→zone) + shared | ~55 | 0 | 2 | 12 | 7 | 21 |
| 07 | `07-frontend-app-components.md` | FE app router + components chung | ~90 | 0 | 0 | 3 | 5 | 8 |
| 08 | `08-frontend-devices-map.md` | FE features devices + map | 101 | 0 | 4 | 8 | 10 | 22 |
| 09 | `09-frontend-features-rest.md` | FE features còn lại | 119 | **2** | 4 | 7 | 5 | 18 |
| 10 | `10-frontend-lib-hooks-config.md` | FE lib/hooks/config/build | ~61 | 0 | 3 | 8 | 12 | 23 |
| 11 | `11-firmware-adapters-platform.md` | FW modem/imu/power/nvs/adc | ~35 | 0 | 1 | 4 | 5 | 10 |
| 11b | `11b-firmware-ble-mqtt.md` | FW BLE OBD + MQTT + GNSS/SD/RTC | 19 | **1** | 3 | 7 | 7 | 18 |
| 12 | `12-firmware-core-domain.md` | FW app-core + domain + shared-kernel | 51 | **2** | 5 | 6 | 6 | 19 |
| | | **TỔNG** | **~753** | **13** | **39** | **90** | **92** | **~234** |

> **Coverage:** report 11 gốc hết iteration trước khi verify line-level nhóm BLE/MQTT/GNSS/SD/RTC → tách sang **11b** (đã hoàn tất, 19 file / ~8.900 dòng line-level). Firmware nay phủ trọn.

---

## 2. CRITICAL — 13 lỗ hổng phải xử lý trước tiên

### Firmware (đường tấn công OTA hoàn chỉnh + use-after-free)
- **[12/C-1]** TLS server cert verify **TẮT mặc định** cho OTA (`util_ota_http.c:19,425`); chỉ có SHA-256 integrity, **không signed-image** → MITM cấp firmware giả.
- **[12/C-2]** MQTT command channel **default port 1883 plaintext** (`app_config_defaults.c`) → kênh nhận lệnh OTA/reboot không mã hoá/xác thực. Ghép C-1+C-2 = chiếm quyền OTA end-to-end.
- **[11b/C-1]** **Use-after-free BLE OBD**: `ble_obd_disconnect` `free(ctx)` (`ble_obd.c:701`) nhưng **không gỡ notify callback** (static `s_obd_chars[1].notify_cb`, `usr_ctx=ctx`). Nếu `BLE_GAP_EVENT_NOTIFY_RX` tới trên NimBLE host task sau free → deref heap đã giải phóng (`ble_obd.c:509`) → heap corruption/crash.

### Backend (auth/quyền/atomicity)
- **[04/C1]** Firmware **tải KHÔNG cần auth** (`firmware.routes.ts:38` — `attachUserIfAvailable` đặt trước `requireAuth`) → lộ binary cho bất kỳ ai.
- **[04/C2]** Toàn bộ ghi/xoá tài nguyên chỉ cần "đã đăng nhập", **không phân quyền role** → viewer/operator create/delete/deploy-OTA/regenerate-token được (privilege escalation ngang).
- **[04/C3]** `createFirmware` nhận **`filePath` tuỳ ý từ body** (không Zod, không base-dir check) → path traversal + `deleteFirmware` `fs.unlink` xoá file hệ thống tuỳ ý.
- **[05/F-1]** **Không có transaction** ở mọi multi-write trong nửa domain này → policy-eval + createViolation + upsertState rời rạc, crash giữa chừng = double-count/bỏ sót vi phạm.
- **[05/F-2]** Check-then-act tạo trùng (user/device/driver/error-code/firmware) **không transaction/lock** — an toàn CHỈ KHI DB có UNIQUE (chưa verify được từ code).
- **[05/F-3]** MQTT hot-path **không serialize theo device** → out-of-order + race ghi state; `Date.now()` fallback thay device-clock làm sai timeline.

### Frontend (fabricate dữ liệu)
- **[09/C1]** `use-statistics.ts` **bịa uptime** (up=100/degraded=85/offline=55) + **runtime** (`activeLike.length*0.2`) khi API rỗng, render như số thật, không nhãn "ước lượng".
- **[09/C2]** `use-dashboard-stats.ts` tổng hợp/độn KPI + activity client-side khi thiếu field backend.

### Mobile (JS injection)
- **[02/C1]** Auth token **nội suy thẳng vào chuỗi JS** `window.__NATIVE_AUTH_TOKEN__="$token"` (`webview_screen.dart:131`) không escape → JS injection nếu token chứa ký tự đặc biệt. Chạy lại mỗi `onLoadStop`.
- **[02/C2]** `navigateTo` nội suy path vào `window.location.href="$path"` (`webview_controller.dart:46`) → cùng lỗ hổng; `evaluateJs` chạy JS thô tuỳ ý.

---

## 3. Chủ đề xuyên hệ thống (lặp ở nhiều component)

Đây là các **lớp lỗi**, không phải điểm đơn lẻ — sửa cần chính sách chung:

### 3.1 Timezone UTC vs UTC+7 (sai ranh giới ngày toàn hệ)
- Backend: `statistics.repository` `DATE_TRUNC` theo tz session Postgres (UTC) → off-by-one ngày [06/M1]; geofence quota hardcode +7h thủ công [05/F-10]; `fuel-analytics` dùng tz DB → **hai định nghĩa "ngày" khác nhau** trong cùng backend.
- Frontend: `formatDateTime`/`formatRelative` dùng tz trình duyệt, không ép UTC+7 [10/F-13]; chart IMU `slice()` ISO string = giờ UTC raw [08/M1]; simulator preview `toLocaleString` [09/L5].
- Firmware: timestamp fallback = uptime (không epoch) khi mất trusted time [12/M-2].
- **→ Cần: một convention timezone toàn dự án (đề xuất set Postgres session `Asia/Ho_Chi_Minh` hoặc `AT TIME ZONE` tường minh + FE format cố định UTC+7).**

### 3.2 Contract drift camelCase/snake_case + `{data}` wrapper
- FE "phòng thủ mù" `raw.vehicleId ?? raw.vehicle_id`, `data?.items ?? data?.data?.items` khắp devices/customers/dashboard [08/H1, 09/H2, 07/§3].
- `unwrap<T>` cast **không runtime-validate** dù có zod trong deps [10/F-02]; nhiều schema validation lệch model thật (role thiếu root/manager [10/F-08], alertType thiếu loại [10/F-11], exportSchema lệch [10/F-10], geofenceType lệch [10/F-09]).
- Firmware trộn camelCase (OTA `jobId`) + snake_case (telemetry) [12/H-4]; schema version drift 2.0 vs 1.0.0 [12/H-5].
- **→ Cần: chốt 1 envelope chuẩn ở backend + zod parse tại ranh giới API FE.**

### 3.3 Thiếu idempotency → double-count / double-insert
- Bridge: retry non-atomic double-increment `data_points_count` [03/F-H2], rawdata thiếu dedup [03/F-H3], firmware SELECT-rồi-INSERT [03/F-H5].
- Backend: trip-auto tạo 2 trip in_progress [06/M7], violation không dedup [06/M8], check-then-act [05/F-2].
- FE: interceptor retry POST/PUT/DELETE sau refresh 401 → double-write [10/F-01].
- Firmware: command drop im lặng không NACK [12/M-4].
- **→ Cần: UNIQUE constraint + `ON CONFLICT`/advisory lock + idempotency key cho mutation.**

### 3.4 RBAC cosmetic (client ẩn UI, backend không enforce?)
- FE `use-role-access` chỉ ẩn menu/nút [07/M1, 08, 09/Q1] — **nếu backend không enforce role trên endpoint (firmware deploy, user CRUD, export, simulator, system-admin) thì viewer gọi API trực tiếp được** = khớp thẳng với [04/C2]. Đây là lỗ hổng nối FE↔BE cần đối chiếu ngay.

### 3.5 Query không giới hạn → OOM / cạn pool
- Notification LIMIT-less + phân trang in-memory [06/M5, M6]; export SELECT toàn bảng vào RAM [05/F-5]; pool thiếu `statement_timeout`/`connectionTimeout` [05/F-14, 04/M6]; VM/VL fetch không timeout [06/M9]; FE axios không timeout/AbortController [10/F-05]; pagination không chặn trần [04/M3].

### 3.6 State toàn cục / race concurrency
- Simulator global state 1-process, swap `auth_token` **kẹt khi crash → device thật lock-out** [06/H1, H2]; realtime listener accumulation khi re-init [05/F-13]; firmware race `s_telemetry.obd_*` BLE task↔FSM task [12/H-3]; race state singleton BLE ghi không giữ `lock_mtx` từ NimBLE host task, field không `volatile` [11b/H-1, M-7]; use-after-free notify callback [11b/C-1]; race URC flags MQTT [11b/M-3].

### 3.8 TLS không verify cert (MITM) — cả OTA lẫn MQTT
- OTA HTTP `authmode=0` mặc định [12/C-1]; MQTT broker TLS `authmode=0` mặc định (`mqtt_session.c:659`) dù ép implicit TLS 8883 → man-in-the-middle lộ credential/telemetry [11b/H-3]; MQTT 1883 plaintext [12/C-2]. **→ Cần: bật `CONFIG_TRACKER_TLS_VERIFY_SERVER=1` + provision CA cho field build.**

### 3.9 Publish timeout mismatch firmware (đúng vùng "bug publish timeout")
- [11b/H-2] AT-wait ~30s < modem publish op timeout 120s → firmware báo fail sai khi mạng chậm trong khi modem vẫn publish thành công → tầng trên re-enqueue: QoS1 message trùng, QoS0 gửi lại. Ghép với thiếu idempotency (§3.3).

### 3.7 Fabricate / mock trá hình lẫn production path
- FE bịa KPI [09/C1,C2]; `maintenance-meta.ts` strip prefix "MOCK MTN:" (backend còn seed mock) [09/M3]; `NEXT_PUBLIC_OBD_UI_MOCK` chèn data giả vào raw feed thật [08/M8]; fuel đơn giá hardcode ~25k VND/L [09/M2]; mobile `getCurrentLocation` trả (0,0) [02/M5], `SyncService` placeholder mất dữ liệu offline [02/M2].

---

## 4. Điểm mạnh đã xác nhận (để cân bằng)

- **Token security tốt toàn FE + Mobile:** không lưu localStorage, in-memory zustand + httpOnly cookie, không secret trong `NEXT_PUBLIC_` [07, 08, 09, 10, 02].
- **SQL parameter hoá đúng** khắp backend repositories, sort dùng allowlist, `quoteIdentifier` + `ALLOWED_TABLES` cho dynamic query [04, 05, 06].
- **OTA fail-safe firmware:** verify SHA-256 trước `set_boot_partition`, abort partial write → power-loss không brick; telemetry counters spinlock; offline_queue QoS tách watermark atomic [12].
- **ECU sim:** logic vật lý powertrain, đơn vị quãng đường, bounds mảng, timing non-blocking, công thức SAE J1979 đều verified sạch [01].
- **Bridge:** TLS bắt buộc ngoài dev, Zod `.strict()`, session lifecycle transaction + `FOR UPDATE`, geofence CAS chống lost-update, circuit breaker chống OOM [03].
- **Docker:** multistage, non-root, healthcheck ở cả bridge/backend/frontend [03, 10].
- **A11y FE tốt:** skip-link, aria-label, keyboard row, ConfirmDialog cho destructive [07, 08].

---

## 5. Câu hỏi mở tổng hợp (quyết định mức nghiêm trọng thật — cần chủ dự án/schema trả lời)

1. **Schema UNIQUE constraints?** `users(username)`, `devices(device_id)`, `drivers(driver_code)`, `firmware(version)`, `violations(alert_id)`, partial index `trips(vehicle_id) WHERE in_progress` — có hay không? → quyết định [05/F-2], [06/M7,M8], [03/F-H5] lên CRITICAL hay không.
2. **Backend có enforce RBAC theo role trên endpoint không**, hay chỉ check "đã đăng nhập"? → quyết định [04/C2] + [07/M1, 09/Q1] là lỗ hổng CRITICAL thực thi được.
3. **`systemAdminService.queryTable` có whitelist table/column không** hay nội suy chuỗi SQL? → [04/H2] CRITICAL hay giảm nhẹ. (Report 06 xác nhận service có `ALLOWED_TABLES` — cần đối chiếu tầng API.)
4. **Production firmware có bật `CONFIG_TRACKER_TLS_VERIFY_SERVER=1` + CA cert + MQTTS 8883** không? Có kế hoạch signed-OTA không? → [12/C-1, C-2].
5. **Timezone convention toàn dự án** là UTC+7 cố định hay theo client? Postgres session tz set gì? → [06/M1, 05/F-10, 10/F-13, 08/M1].
6. **Envelope response chuẩn** — `{items}` hay `{data:{items}}`? Có kế hoạch zod-validate ranh giới API không? → [08/H1, 09/H2, 10/F-02].
7. **KPI nào backend thật cấp vs FE tự độn?** Cần map từng field uptime/runtime/utilization để xoá logic fabricate [09/C1,C2].
8. **`total_runtime_seconds` semantics** — đã gồm session running chưa? Ai cập nhật (backend hay bridge)? → [05/F-11] double-count runtime.
9. **`device_error_codes.id` có chung id-space với `alerts.id`?** → [08/H3] resolve nhầm alert.
10. **Simulator có chạy trên môi trường có device thật không?** Có cơ chế reconcile `auth_token` khi crash? → [06/H1].

---

## 6. Đề xuất thứ tự khắc phục

**P0 (bảo mật, làm ngay):**
- [04/C1] thêm `requireAuth` cho firmware download (hoặc HMAC-signed URL nếu device tự kéo OTA).
- [04/C2]+RBAC: enforce role trên mọi endpoint ghi/xoá + system-admin.
- [04/C3] Zod + base-dir clamp cho `filePath`.
- [12/C-1,C-2]+[11b/H-3] bật TLS verify (OTA + MQTT) + MQTTS + provision CA + cân nhắc signed-OTA cho production build.
- [11b/C-1] clear `notify_cb`/`usr_ctx` + đảm bảo không còn notify in-flight trước `free(ctx)` trong BLE disconnect.
- [02/C1,C2] `jsonEncode(token)` / escape path trong WebView.

**P1 (toàn vẹn dữ liệu):**
- [05/F-1] bọc transaction cho multi-write; [05/F-2]+schema UNIQUE; [03/F-H1] re-subscribe sau reconnect broker; [06/H1] reconcile auth_token simulator; [09/C1,C2] bỏ fabricate KPI.

**P2 (correctness/resilience):**
- Timezone convention (§3.1); contract envelope + zod (§3.2); idempotency (§3.3); query LIMIT + timeout (§3.5).

**P3 (nợ kỹ thuật):**
- Dead code (admin/ FE, geofences legacy, alias files, dup sanitizer), god files (maintenance 812L…), OpenAPI spec drift, magic numbers.

---

*INDEX tạo từ đọc trọn toàn bộ 13 report (12 component + 11b bổ sung). Firmware phủ trọn line-level.*
