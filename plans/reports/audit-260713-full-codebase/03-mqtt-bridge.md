# Audit READ-ONLY — Tracking_MqttBridge

Ngày: 2026-07-13. Phạm vi: cầu MQTT (EMQX) ↔ PostgreSQL / VictoriaMetrics / VictoriaLogs.
Phương pháp: đọc IN FULL từng file (28 `.ts` trong `src/`, 6 `.ts` trong `tests/`, 6 file config/deploy). Không sampling.
`path:line` tính theo file gốc. "verified" = xác nhận trực tiếp từ source đã đọc.

BASE: `Tracking_MqttBridge/`

---

## 1. Bảng coverage per-file

| # | File | Dòng | Đọc full | Ghi chú |
|---|------|-----:|:---:|------|
| 1 | src/index.ts | 195 | ✓ | Entry, routeMessage, shutdown, process handlers |
| 2 | src/config/env.ts | 74 | ✓ | Env parse, TLS enforcement, requireEnv |
| 3 | src/infrastructure/logger.ts | 11 | ✓ | pino, prod=info |
| 4 | src/infrastructure/database.ts | 1223 | ✓ | Pool, session lifecycle, alert sync |
| 5 | src/infrastructure/victoriametrics.ts | 96 | ✓ | writeMetric/writeDeviceTelemetry |
| 6 | src/infrastructure/victorialogs.ts | 69 | ✓ | writeLog/writeDeviceEvent |
| 7 | src/mqtt/client.ts | 121 | ✓ | connect/disconnect/publish |
| 8 | src/mqtt/subscriptions.ts | 49 | ✓ | subscribe topic + QoS |
| 9 | src/constants/topics.ts | 27 | ✓ | DEVICE/INTERNAL topics + QoS map |
| 10 | src/handlers/rawdata.handler.ts | 1299 | ✓ | Hot-path telemetry + OBD rules |
| 11 | src/handlers/status.handler.ts | 470 | ✓ | Session boundary/state |
| 12 | src/handlers/event.handler.ts | 111 | ✓ | Event → log + alert |
| 13 | src/handlers/firmware.handler.ts | 315 | ✓ | OTA log, dedup |
| 14 | src/services/batch-writer.service.ts | 193 | ✓ | Buffer + circuit breaker |
| 15 | src/services/bridge-health.service.ts | 89 | ✓ | HTTP health/ready |
| 16 | src/services/device-auth.service.ts | 40 | ✓ | verifyDeviceToken |
| 17 | src/services/geofence-checker.service.ts | 260 | ✓ | Haversine + polygon + CAS |
| 18 | src/cache/device-state.cache.ts | 143 | ✓ | Map state per device |
| 19 | src/cache/geofence-state.cache.ts | 165 | ✓ | Zone cache + CAS update |
| 20 | src/publishers/internal-event.publisher.ts | 51 | ✓ | publishInternalEvent |
| 21 | src/publishers/session-assignment.publisher.ts | 35 | ✓ | assign_session command |
| 22 | src/utils/session-runtime.util.ts | 133 | ✓ | Live-mutation guard |
| 23 | src/utils/session-identity.util.ts | 66 | ✓ | Identity conflict/hydrate |
| 24 | src/utils/timestamp.util.ts | 71 | ✓ | Normalize s/ms/us + skew |
| 25 | src/utils/correlation.util.ts | 3 | ✓ | uuid |
| 26 | src/types/payload.types.ts | 181 | ✓ | Payload interfaces |
| 27 | src/types/device-state.types.ts | 158 | ✓ | Runtime state normalize |
| 28 | src/validators/payload.validator.ts | 216 | ✓ | Zod schemas |
| 29 | tests/closing-session-resolution.test.ts | 135 | ✓ | DB mock, closing session |
| 30 | tests/device-state-cache.test.ts | 79 | ✓ | resolveSessionId |
| 31 | tests/session-runtime.util.test.ts | 207 | ✓ | Runtime guard |
| 32 | tests/session-identity.util.test.ts | 61 | ✓ | Identity util |
| 33 | tests/live-mutation-guard.test.ts | 53 | ✓ | shouldAcceptLiveMutation |
| 34 | tests/subscriptions.test.ts | 27 | ✓ | QoS map |
| 35 | package.json | 29 | ✓ | scripts/deps |
| 36 | tsconfig.json / tsconfig.build.json | 20/4 | ✓ | strict on, exclude test |
| 37 | Dockerfile | 18 | ✓ | multistage, non-root, healthcheck |
| 38 | docker-compose.yml / .uat.yml | 20/25 | ✓ | env_file, mem limit, external net |
| 39 | .env.example | 25 | ✓ | Placeholder secrets |

Tổng: 34 file `.ts` + 6 file config/deploy + `.env.example`. Không tìm thấy `.gitignore`/`.dockerignore` trong thư mục bridge (search_files, verified). Không có TODO/FIXME/HACK trong `src/` (verified).

---

## 2. Findings theo severity

### CRITICAL

Không có finding CRITICAL độc lập. Rủi ro cao nhất là mất message khi broker mất session (F-H1) và double-count telemetry (F-H2, F-H3) — xếp HIGH.

### HIGH

**F-H1 — Không re-subscribe sau khi broker mất session (mất toàn bộ message thầm lặng)**
`src/mqtt/client.ts:51-73`, `src/index.ts:129-138` (verified).
`subscribeToDeviceTopics(client)` chỉ được gọi đúng 1 lần trong `main()` (index.ts:131). Handler `client.on('connect')` (client.ts:51) và `'reconnect'` (client.ts:56) chỉ log, KHÔNG subscribe lại. Bridge dựa hoàn toàn vào `clean:false` (client.ts:22) để broker khôi phục subscription. Nếu EMQX restart mất persistent session, session expiry, hoặc clientId bị kick, sau reconnect bridge KHÔNG có subscription nào → nuốt trọn mọi message device mà không có lỗi. `bridgeHealthState.subscriptionsReady` vẫn `true` (index.ts:132) nên `/ready` báo `ok` sai. Đề xuất: re-subscribe trong mỗi `connect`, và dùng thông tin `granted`/`sessionPresent` để quyết định.

**F-H2 — touchDeviceSession: retry trong catch gây double-increment `data_points_count`**
`src/infrastructure/database.ts:624-809` (verified).
Khối `try` (625) chạy UPDATE `device_sessions` với `data_points_count = COALESCE(...,0)+1` (629) rồi UPDATE `devices` (698) — hai `pool.query` RIÊNG BIỆT, KHÔNG trong transaction. Nếu UPDATE `devices` (698) ném lỗi (vd deadlock/timeout), khối `catch` (715) chạy LẠI TOÀN BỘ, gồm UPDATE `device_sessions` lần hai → `data_points_count` +1 hai lần cho cùng 1 telemetry, các trung bình (avg_*) cũng cộng dồn sai. Non-idempotent retry trên mutation đã một phần thành công. Đề xuất: gộp cả hai UPDATE vào 1 transaction, hoặc chỉ retry đúng câu đã fail.

**F-H3 — Thiếu idempotency cho rawdata → double count khi message trùng seq/timestamp**
`src/handlers/rawdata.handler.ts:889-899`, `:1186-1201`; `src/utils/session-runtime.util.ts:97-107` (verified).
`shouldAcceptLiveMutation` chỉ reject khi `incomingSeqNo < cachedLastSeqNo` (util:104). Message trùng lặp có seq_no BẰNG NHAU và timestamp không lùi → `accept=true` → `touchDeviceSession` cộng `data_points_count+1` và tính lại avg. Rawdata không dedup theo `metadata.message_id` (khác với firmware handler có dedup). QoS0 hạn chế redelivery, nhưng device tự gửi trùng, hoặc bridge xử lý lại, sẽ thổi phồng số liệu session. Đề xuất: dedup theo `message_id` hoặc guard seq `<=`.

**F-H4 — Không serialize xử lý message theo device key (race read-modify-write trên cache/DB)**
`src/index.ts:88-115` (verified), tương tác `src/cache/device-state.cache.ts:50-85`.
`routeMessage` gọi handler kiểu fire-and-forget (`handleRawData(...).catch(...)`, index:90-108) không await, không hàng đợi per-device. Với 1 device, các message rawdata/status đến gần nhau chạy đan xen qua các `await` (DB, metrics). `handleRawData` đọc `getStatus` (rawdata:867) rồi mãi tới `setStatus` (rawdata:1221) sau nhiều await; song song `handleStatus` cũng `setStatus`. Đây là check-then-act xuyên await → cache device có thể bị ghi đè ngược, `lastSeqNo`/`lastPayloadTimestampMs` watermark không nhất quán, làm live-mutation guard sai. DB có `FOR UPDATE` cho session (mitigate một phần) nhưng cache thì không. Đề xuất: hàng đợi tuần tự theo `deviceId`.

**F-H5 — firmware handler: SELECT-rồi-INSERT không nguyên tử → double-insert job mới khi đồng thời**
`src/handlers/firmware.handler.ts:134-213` (verified).
`decideFirmwareUpdate` dedup theo `last_message_id`/seq nhưng CHỈ so với hàng `existing` đã SELECT (firmware:51-53). SELECT (134) và INSERT (164) không trong transaction, không `FOR UPDATE`. Hai message firmware cho cùng `jobId` mới đến đồng thời → cả hai thấy `existing=null` → cả hai INSERT → 2 hàng `firmware_update_log`. Idempotency phụ thuộc unique constraint DB (không xác minh được từ bridge). Đề xuất: `INSERT ... ON CONFLICT` hoặc bọc transaction + `FOR UPDATE`.

### MEDIUM

**F-M1 — Graceful shutdown thiếu force-exit watchdog**
`src/index.ts:146-177` (verified).
`shutdown` await tuần tự `disconnectMqtt` → `stopBatchWriter` → `closePool` → `stopBridgeHealthServer` rồi `process.exit(0)`. Nếu bất kỳ await nào treo (vd `client.end(false,...)` client.ts:86 không có timeout, hoặc `pool.end()` chờ query treo), tiến trình không bao giờ thoát; SIGTERM của orchestrator sẽ leo thang SIGKILL và bỏ qua flush. Không có `setTimeout(()=>process.exit(1), N)` bảo hiểm. Đề xuất: thêm watchdog force-exit.

**F-M2 — Batch flush cập nhật `device_sessions` last_lat/lon/speed KHÔNG guard theo thời gian**
`src/services/batch-writer.service.ts:112-125` (verified).
UPDATE `devices` trong batch có `GREATEST(last_seen_at,...)` chống out-of-order (batch:90-93), NHƯNG UPDATE `device_sessions` (batch:113) dùng `COALESCE($n, last_latitude)` không so timestamp. Do handler chạy song song (F-H4), thứ tự `addUpdate` có thể không theo thời gian thiết bị → vị trí cũ ghi đè vị trí mới trong session. Đề xuất: guard bằng timestamp/`updated_at`.

**F-M3 — Running-average tính sai về mặt toán học**
`src/infrastructure/database.ts:650-664`, `:737-751` (verified).
`avg_vehicle_battery = ROUND((avg + new)/2)` là trung bình trượt kiểu EWMA, KHÔNG phải trung bình cộng thực của các mẫu. Kết quả lệch nặng về mẫu gần nhất. Nếu field tên `avg_*` được hiểu là mean thật ở backend/report thì sai dữ liệu. Đề xuất: dùng `sum/count` hoặc đặt lại tên field.

**F-M4 — Fallback timestamp = server_now tạo dữ liệu thời gian "bịa"**
`src/utils/timestamp.util.ts:55-71` (verified), dùng ở rawdata:844, status:125, event:42.
Khi payload timestamp và `metadata.sent_at` đều ngoài cửa sổ skew, trả `server_now` (timestamp.util:70). Telemetry/alert bị gán thời gian server thay vì thời điểm thực → sai timeline, có cảnh báo log (`timestampSource!=='payload'`) nhưng dữ liệu vẫn ghi. Chấp nhận được nhưng cần đánh dấu rõ ở downstream. MEDIUM correctness.

**F-M5 — Auth chấp nhận token thô (plaintext) song song hash**
`src/services/device-auth.service.ts:28-33`, `src/infrastructure/database.ts:96-100` (verified).
Điều kiện `auth_token = encode(sha256($2),'hex') OR auth_token = $3` cho phép so khớp token CHƯA hash. Comment nói dành cho "internal simulators", nghĩa là DB có thể lưu token plaintext và bridge chấp nhận. Rủi ro: lộ token = full impersonate; nhánh plaintext làm yếu mô hình bảo mật. Đề xuất: bỏ nhánh `$3` ở production, chỉ so hash.

**F-M6 — Dockerfile `COPY . .` không có `.dockerignore` → nguy cơ bake secret vào layer builder**
`Dockerfile:5` (verified), không có `.dockerignore` (verified).
Stage builder `COPY . .` copy toàn bộ context. Nếu `.env` (hoặc cert) tồn tại lúc build, nó nằm trong layer image builder. Stage runner chỉ copy `dist`/`node_modules`/`package*.json` (Dockerfile:11-13) nên image cuối sạch, nhưng layer builder trung gian vẫn chứa secret và có thể rò nếu image builder được push/cache-share. Đề xuất: thêm `.dockerignore` (`.env`, `*.pem`, `node_modules`, `dist`).

**F-M7 — device-state cache Map không bao giờ evict**
`src/cache/device-state.cache.ts:25` (verified).
`deviceStates = new Map()` chỉ set/get, không TTL/evict. Bị chặn bởi số device (fleet) nên không phải leak vô hạn thực sự, nhưng với churn deviceId (test/rogue) sẽ phình. Container giới hạn 256MB (compose:15). Cùng nhóm: `ruleCooldownUntil`, `idleAnomalyStartedAt`, `activeDtcRuleKeysByDevice` (rawdata:61-63) — cooldown của OBD maintenance rule (obd_channel_unstable...) không được xóa khi hết active (chỉ DTC & IMU được dọn: rawdata:320,585). Growth nhỏ bounded. Đề xuất: eviction theo idle.

**F-M8 — publishInternalEvent bị nuốt khi MQTT chưa/đã ngắt (mất event trong lúc shutdown/reconnect)**
`src/publishers/internal-event.publisher.ts:26-33`, `src/mqtt/client.ts:110-113` (verified).
Nếu `!client?.connected`, publish chỉ log warn rồi `return` — event (kể cả QoS1: session/alert/status) bị BỎ, không buffer/retry. Trong lúc reconnect hoặc sau `disconnectMqtt` ở shutdown mà handler còn in-flight, các event quan trọng (session ended, alert) mất. Đề xuất: hàng đợi tạm hoặc chặn shutdown tới khi handler xong.

**F-M9 — uncaughtException → shutdown → exit(0); unhandledRejection không thoát**
`src/index.ts:182-189` (verified).
`uncaughtException` gọi `shutdown('uncaughtException')` kết thúc bằng `process.exit(0)` (index:176) — che giấu crash (exit code 0 = orchestrator coi là thành công/không restart-cảnh báo). `unhandledRejection` chỉ log, không thoát → tiến trình chạy tiếp trong trạng thái có thể hỏng. Đề xuất: exit code khác 0 cho uncaught; cân nhắc thoát cho unhandledRejection.

### LOW

**F-L1 — command/ack không validate schema**
`src/index.ts:53-74` (verified). `handleCommandAck` `JSON.parse` thủ công, không Zod; publish `parsed.response ?? parsed.error ?? null` nguyên trạng vào internal event. Input chưa kiểm soát shape.

**F-L2 — `findActiveDeviceSessionId` là dead code (0 consumer)**
`src/infrastructure/database.ts:971` (verified). Không nơi nào import/gọi (search verified: chỉ khai báo). `invalidateVehicleCache` (geofence-state.cache.ts:163) và `writeMetric` (victoriametrics.ts:17) cũng không có consumer trong `src/` (search verified) — chỉ export, chưa dùng.

**F-L3 — Health server bind 0.0.0.0 và trả nhiều metadata**
`src/services/bridge-health.service.ts:64` (verified). Bind mọi interface; body `/health` trả `lastError` (có thể chứa message nội bộ) tới bất kỳ ai reach port 4003. Compose không publish port ra ngoài (không có `ports:`), rủi ro thấp trong mạng nội bộ.

**F-L4 — Label metrics dùng device_id (cardinality)**
`src/infrastructure/victoriametrics.ts:60-66` (verified). `device_id` làm label cho mọi `tracker_telemetry_*`. Cardinality = số device × số metric; chấp nhận được với fleet vừa, cần chú ý nếu fleet lớn. Đã `sanitizeLabel` chống injection (victoriametrics.ts:10-12, verified).

**F-L5 — Metrics/logs QoS0 fire-and-forget, mất thầm lặng khi VM/VL down**
`src/handlers/rawdata.handler.ts:1100`, `victorialogs.ts:17-50`, `victoriametrics.ts:29-49` (verified). Ghi bằng `fetch` không retry/không buffer; VM/VL down → chỉ log lỗi, mất điểm dữ liệu. Thiết kế chấp nhận cho telemetry, nhưng OBD alert log (rawdata:451) cũng theo cùng đường → mất bằng chứng alert.

**F-L6 — env fallback localhost/postgres ở non-prod có thể nối nhầm DB**
`src/config/env.ts:44-66` (verified). Ngoài production, `requireEnv` chỉ warn; host/user default `localhost`/`postgres`. Chạy nhầm môi trường dev có thể ghi vào DB local ngoài ý muốn. Prod đã throw (env:17-18) — tốt.

---

## 3. Điểm tích cực (verified)

- TLS bắt buộc ngoài dev: `MQTT_USE_TLS`/`MQTT_REJECT_UNAUTHORIZED` throw nếu false (env.ts:35-42). Không có `rejectUnauthorized:false` hardcode.
- Không có secret hardcode trong source/Dockerfile/compose; `.env.example` toàn placeholder `CHANGE_ME_*`.
- Zod validate chặt (`.strict()` cho `data`, regex schema_version/UUID/DTC) (payload.validator.ts).
- `auth_token` bị loại khỏi payload phát internal (`buildSanitizedRawPayload`, rawdata:65-68).
- Session lifecycle dùng transaction + `FOR UPDATE` (database.ts:214/265/295/838) chống race ghi session.
- geofence dùng optimistic CAS qua `expected*` (geofence-state.cache.ts:110-117) chống lost-update.
- Live-mutation guard chống out-of-order theo watermark/seq/boot (session-runtime.util.ts).
- timestamp normalize xử lý s/ms/us + cửa sổ skew (timestamp.util.ts).
- Batch writer có circuit breaker chống OOM (batch-writer.service.ts:29-43, 149-160) — có chủ đích drop khi DB down.
- Dockerfile: multistage, non-root `bridge` (uid 1001), healthcheck, prod chạy `node dist/index.js` (KHÔNG tsx). Compose có mem/cpu limit, không publish port datastore, dùng external network.

---

## 4. Câu hỏi mở

1. `device_sessions`/`firmware_update_log` có UNIQUE constraint (device_id+boot_id+local_session_key, job_id+device_id) không? Quyết định mức độ nghiêm trọng của F-H5 (double-insert) và tính an toàn của các INSERT không nguyên tử.
2. Backend hiểu `avg_vehicle_battery`/`avg_device_battery`/`avg_imu_accel_delta_mps2` là mean thật hay EWMA? (F-M3) Nếu là mean → sai số liệu report.
3. EMQX có bật persistent session bền vững qua broker restart cho clientId `mqtt-bridge-production` không? Nếu không, F-H1 gây mất message trên diện rộng.
4. Có single-instance guarantee cho bridge không? ClientId cố định `mqtt-bridge-production` (client.ts:8) → chạy 2 instance sẽ kick lẫn nhau (session takeover) và nhân đôi ghi DB. Cần xác nhận deploy 1 replica.
5. Shape internal event (`data`/`session`/`alert`/`status`) khớp contract backend consumer chưa? Không kiểm chứng được trong bridge — cần đối chiếu với service backend.
6. `auth_token` plaintext (F-M5) còn cần cho môi trường thật hay chỉ simulator? Nếu chỉ dev → gate bằng env.
7. Có mong đợi bridge buffer/retry internal event QoS1 khi MQTT tạm mất kết nối không (F-M8)? Hiện tại drop.

---

## 5. Tóm tắt số liệu

- File đọc full: **40** (34 `.ts` + Dockerfile + 2 compose + 2 tsconfig + package.json + .env.example).
- Findings: **HIGH 5**, **MEDIUM 9**, **LOW 6** = **20**. CRITICAL: 0.
- Trọng tâm rủi ro: mất message khi mất broker session (F-H1), double-count telemetry do thiếu idempotency + retry non-atomic (F-H2, F-H3), race do không serialize per-device (F-H4), double-insert firmware (F-H5).
