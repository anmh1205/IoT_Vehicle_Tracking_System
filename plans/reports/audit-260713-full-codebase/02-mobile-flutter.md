# Audit Mobile App (Flutter/Dart) — READ-ONLY

**Base dir:** `Tracking_Mobile/`
**Ngày:** 2026-07-13
**Phạm vi:** 21 file `.dart` (lib/ + test/) + `pubspec.yaml`. Loại trừ `.dart_tool/`, `build/`.
**Kiến trúc:** App hybrid — Flutter shell bọc `InAppWebView` load dashboard Next.js. Không có UI native ngoài splash/loading/error. Không có model Dart fromJson/toJson (không parse JSON backend trực tiếp — mọi data qua WebView).

---

## Bảng coverage per-file

| # | File | Dòng | Đọc full | Ghi chú |
|---|------|------|----------|---------|
| 1 | `pubspec.yaml` | 46 | ✅ | Deps: inappwebview, riverpod, firebase, secure_storage, shared_prefs, connectivity, local_notifications, workmanager |
| 2 | `lib/main.dart` | 36 | ✅ | Entry point; check config, init Firebase + local notif |
| 3 | `lib/app.dart` | 32 | ✅ | MaterialApp, 2 route (splash/webview) |
| 4 | `lib/core/config/app_config.dart` | 46 | ✅ | URL config qua `--dart-define`; default http localhost |
| 5 | `lib/core/config/routes.dart` | 7 | ✅ | 2 hằng route |
| 6 | `lib/core/utils/logger.dart` | 28 | ✅ | Logger 4 level; silence debug/info khi prod |
| 7 | `lib/core/services/storage_service.dart` | 71 | ✅ | flutter_secure_storage; token + fcm |
| 8 | `lib/core/services/connectivity_service.dart` | 32 | ✅ | connectivity_plus wrapper + StreamProvider |
| 9 | `lib/core/services/notification_service.dart` | 39 | ✅ | Wrapper show local notification |
| 10 | `lib/features/auth/auth_service.dart` | 12 | ✅ | Token persistence facade |
| 11 | `lib/features/auth/auth_provider.dart` | 57 | ✅ | Riverpod StateNotifier auth |
| 12 | `lib/features/webview/webview_screen.dart` | 194 | ✅ | Màn hình chính InAppWebView |
| 13 | `lib/features/webview/js_bridge.dart` | 122 | ✅ | Cầu JS ↔ native (6 handler) |
| 14 | `lib/features/webview/webview_controller.dart` | 55 | ✅ | Provider giữ controller; eval JS |
| 15 | `lib/features/notifications/fcm_handler.dart` | 105 | ✅ | FCM lifecycle |
| 16 | `lib/features/notifications/local_notification_service.dart` | 66 | ✅ | Init local notif plugin |
| 17 | `lib/features/offline/offline_cache.dart` | 80 | ✅ | Cache KV qua SharedPreferences |
| 18 | `lib/features/offline/sync_service.dart` | 63 | ✅ | Sync khi online lại — **placeholder** |
| 19 | `lib/widgets/splash_screen.dart` | 87 | ✅ | Splash + init sequence |
| 20 | `lib/widgets/loading_indicator.dart` | 36 | ✅ | Widget loading |
| 21 | `lib/widgets/error_view.dart` | 56 | ✅ | Widget lỗi + retry |
| 22 | `test/loading_indicator_test.dart` | 17 | ✅ | 1 widget test duy nhất |

**Tổng: 22 file đọc full (21 .dart + pubspec), 0 sampling.**

---

## Findings theo severity

### CRITICAL

**C1 — JS injection qua auth token nhét thẳng vào WebView (verified)**
`lib/features/webview/webview_screen.dart:131-133`
```dart
await controller.evaluateJavascript(
  source: 'window.__NATIVE_AUTH_TOKEN__ = "$token";',
);
```
Token nội suy trực tiếp vào chuỗi JS không escape. Nếu token chứa `"`, `\`, newline, hoặc `</script>`/`;`, attacker (hoặc token bị chỉnh) phá vỡ chuỗi và **thực thi JS tuỳ ý** trong ngữ cảnh trang. Token thường là JWT (an toàn ký tự) nhưng không có ràng buộc kiểm tra — đây là injection sink thực sự. Cần `jsonEncode(token)` hoặc truyền qua handler thay vì string-interp. Chạy lại **mỗi lần `onLoadStop`** (mỗi lần load trang), khuếch đại bề mặt.

**C2 — `navigateTo` nội suy path vào `window.location.href` (verified)**
`lib/features/webview/webview_controller.dart:46-48`
```dart
source: 'window.location.href = "$path";',
```
Cùng lỗ hổng: `path` không escape → JS injection nếu path đến từ nguồn không tin (vd deep-link FCM `message.data['route']`, xem M7). `evaluateJs(String source)` (dòng 52-54) còn cho phép chạy JS thô tuỳ ý — cần kiểm soát caller.

---

### HIGH

**H1 — Auth token phơi ra dưới dạng biến global cho mọi script trên trang (verified)**
`lib/features/webview/webview_screen.dart:132`
`window.__NATIVE_AUTH_TOKEN__` là biến global. Bất kỳ script bên thứ ba / XSS nào trong web app đều đọc được → **đánh cắp token**. Nên truyền qua `postMessage` có origin hoặc handler pull thay vì global var.

**H2 — Bridge handler không kiểm origin/xác thực caller (verified)**
`lib/features/webview/js_bridge.dart:73-101`
`saveToken` và `logout` gọi được bởi *bất kỳ* JS nào chạy trong WebView. Một XSS trong web app có thể (a) ghi đè token nạn nhân bằng token attacker (session-fixation), hoặc (b) ép logout. `shouldOverrideUrlLoading` chỉ chặn navigate, không chặn script cùng trang. Cần whitelist origin hoặc nonce trước khi chấp nhận `saveToken`.

**H3 — `clearToken()` xoá TOÀN BỘ secure storage, kể cả FCM token (verified)**
`lib/features/auth/auth_service.dart:11` → `storage.clearAll()`
```dart
Future<void> clearToken() => _storage.clearAll();
```
`clearAll()` (`storage_service.dart:63`) gọi `deleteAll()` — logout xoá luôn `fcm_token`. Sau logout, push notification hỏng cho tới khi FCM cấp lại. Đúng ra chỉ nên `deleteAuthToken()`.

---

### MEDIUM

**M1 — Enforce HTTPS chỉ chạy khi `PRODUCTION=true`; default là http/ws cleartext (verified)**
`lib/core/config/app_config.dart:8-42`, `lib/main.dart:12-16`
Default `webAppUrl=http://localhost:3002`, `apiBaseUrl=http://...`, `wsUrl=ws://...`. `hasSecureProductionConfig` trả `true` ngay khi `isProduction=false` (dòng 35). Nếu build release quên set `--dart-define=PRODUCTION=true`, app chạy cleartext HTTP mà không cảnh báo. Không có Android `usesCleartextTraffic`/NSAppTransportSecurity kiểm tra trong Dart (cần xác nhận ở native manifest — ngoài scope Dart).

**M2 — `SyncService._syncPendingData` là placeholder, dữ liệu enqueue không bao giờ được gửi (verified)**
`lib/features/offline/sync_service.dart:45-62`
```dart
// In a real implementation, iterate over known sync keys, POST ...
// For now this is a placeholder that logs the event.
Log.info('Sync complete');
```
`enqueue()` (dòng 40-43) ghi payload vào cache nhưng `_syncPendingData` chỉ log "Sync complete" — **mất dữ liệu offline âm thầm**. Ngoài ra `enqueue` dùng key cố định `sync_$key` → gọi cùng key ghi đè payload cũ (không phải queue thực).

**M3 — FCM token refresh không đăng ký lại với backend (verified)**
`lib/features/notifications/fcm_handler.dart:49-53`
```dart
_messaging.onTokenRefresh.listen((newToken) async {
  await StorageService.instance.saveFcmToken(newToken);
  // TODO: Re-register with backend API when token changes
});
```
Token mới chỉ lưu local, backend vẫn giữ token cũ → push tới thiết bị hỏng sau khi FCM xoay token.

**M4 — Deep-link từ notification không được thực thi (verified)**
`lib/features/notifications/fcm_handler.dart:92-103`
`_handleNotificationTap` đọc `message.data['route']`, log rồi bỏ. Comment ghi "handled by WebView controller" nhưng không có code điều hướng thật → tap notification không đưa user tới màn đúng. Dead functionality.

**M5 — `getCurrentLocation` trả mock data giả (verified)**
`lib/features/webview/js_bridge.dart:104-110`
```dart
// Placeholder - location permission ...
return {'latitude': 0.0, 'longitude': 0.0, 'available': false};
```
Web app gọi bridge nhận về (0,0). `available:false` có báo hiệu, nhưng nếu web quên check `available` sẽ hiểu nhầm vị trí là (0,0) — nguồn gốc Gulf of Guinea.

**M6 — Không xử lý hết hạn/refresh token (verified)**
`lib/features/auth/auth_provider.dart` toàn bộ — token restore & giữ vĩnh viễn, không kiểm tra expiry/refresh. Token JWT hết hạn vẫn được inject vào WebView, đẩy việc xử lý 401 hoàn toàn sang web app.

**M7 — `route` từ FCM (dữ liệu bên ngoài) có thể chảy vào sink injection (correctness/security link)**
`fcm_handler.dart:98` + `webview_controller.dart:47`
`message.data['route']` là dữ liệu do server/attacker gửi qua push. Nếu sau này nối vào `navigateTo(path)` (C2) mà chưa escape → RCE-in-webview. Hiện chưa nối (M4) nên chưa khai thác được, nhưng là bẫy chờ.

**M8 — `LocalNotificationService.init()` ngoài try/catch ở main (verified)**
`lib/main.dart:29`
Firebase init được bọc try/catch (dòng 21-26) nhưng `await LocalNotificationService.init()` thì không. Nếu plugin ném lỗi lúc khởi tạo (thiếu channel/permission trên vài thiết bị) → app crash trắng màn trước khi `runApp`.

---

### LOW

**L1 — `workmanager: ^0.5.0` khai báo nhưng không dùng ở bất kỳ file .dart nào (verified)**
`pubspec.yaml:35` — grep toàn lib không thấy import `workmanager`. Dead dependency, tăng kích thước & bề mặt tấn công. (Background sync dự kiến dùng nhưng chưa triển khai — xem M2.)

**L2 — `appVersion` hardcode '1.0.0' lệch nguồn với pubspec (verified)**
`lib/features/webview/js_bridge.dart:90` trả `'appVersion': '1.0.0'` trong khi `pubspec.yaml:4` là `1.0.0+1`. Sẽ drift khi bump version vì không đọc từ package_info.

**L3 — Tất cả dependency dùng caret range mở `^` (verified)**
`pubspec.yaml:15-40` — `^6.0.0`, `^2.4.0`, v.v. Cho phép minor/patch tự nâng → build không tất định nếu không commit `pubspec.lock`. Chuẩn Flutter nhưng nên pin/lock cho release. Không phát hiện package lạ/typosquat — tất cả đều là package chính thống.

**L4 — `SyncService`/FCM listener không được dispose (verified)**
`sync_service.dart:20` `start()` mở `StreamSubscription`; `stop()` (dòng 33) tồn tại nhưng **không nơi nào gọi**. FCM `onMessage`/`onTokenRefresh`/`onConnectivity` listener cũng không cancel. Đều là singleton sống suốt vòng đời app nên rò rỉ giới hạn, nhưng không sạch. `SplashScreen` gọi `start()` (dòng 39) không có teardown.

**L5 — `shouldOverrideUrlLoading` chặn mọi URL ngoài domain, kể cả `tel:`/`mailto:` (verified)**
`lib/features/webview/webview_screen.dart:163-177`
Chỉ ALLOW url bắt đầu bằng `webAppUrl` hoặc `about:`. Link `tel:`, `mailto:`, thanh toán, hay redirect OAuth bên ngoài đều bị CANCEL âm thầm → tính năng web có thể gãy. Comment ghi "could open in external browser" nhưng chưa làm.

**L6 — `connectivity != Internet reachability` (verified)**
`lib/core/services/connectivity_service.dart:20-24` map `!= none` thành online. Có Wi-Fi nhưng không có Internet (captive portal) vẫn báo online → `SyncService` trigger sync thất bại lặp. connectivity_plus không kiểm reachability thật.

**L7 — `_WebViewScreenState` không override `dispose()` (verified)**
`webview_screen.dart:21` — `_controller` (InAppWebViewController) không dispose tường minh. inappwebview tự quản khi widget bị gỡ nên rủi ro thấp, nhưng thiếu cleanup rõ ràng.

**L8 — Chỉ 1 widget test, không cover logic bridge/auth/config (verified)**
`test/loading_indicator_test.dart` — test duy nhất kiểm CircularProgressIndicator. Không có test cho JSBridge escaping, AuthNotifier, hasSecureProductionConfig, SyncService. Vùng rủi ro cao (C1/C2/H2) hoàn toàn không được test.

---

## Ghi chú tích cực (verified)
- Token lưu bằng `flutter_secure_storage` (Keychain/EncryptedSharedPrefs) — đúng chuẩn, **không** SharedPreferences plaintext (`storage_service.dart:12-15`). SharedPreferences chỉ dùng cho cache non-sensitive (`offline_cache.dart` — comment dòng 7 nói rõ).
- Không có API key/secret hardcode trong source Dart.
- `!` bang operator chỉ dùng 1 chỗ có guard null đúng (`webview_screen.dart:93` sau check dòng 91) — không né null-safety ẩu.
- Logger silence debug/info ở prod (`logger.dart:9-19`); nhưng `warn`/`error` vẫn log — không lộ token vì token không được log.
- WebView có xử lý loading/error/offline state (ErrorView + LoadingIndicator + retry) — resilience cơ bản OK, có accessibility Semantics.

---

## Câu hỏi mở
1. **Token format**: auth token là JWT hay chuỗi tuỳ ý? Nếu có thể chứa ký tự đặc biệt/do người dùng ảnh hưởng thì C1/C2 là CRITICAL thực thi được ngay.
2. **Backend API shape**: App không parse JSON backend trực tiếp (mọi thứ qua WebView). Xác nhận không có màn hình native nào sẽ gọi REST → nếu tương lai thêm, cần model + xử lý contract drift (hiện chưa có).
3. **usesCleartextTraffic / ATS**: Manifest Android & Info.plist iOS (native, ngoài scope Dart) có cho phép cleartext không? M1 chỉ đảm bảo ở tầng Dart config.
4. **FCM → backend registration**: token FCM có được gửi lên backend ở đâu (web app qua bridge `getFcmToken`?) hay hoàn toàn thiếu? Ảnh hưởng M3.
5. **SyncService**: có kế hoạch triển khai flush thật không, hay offline queue là tính năng đã bỏ? Hiện enqueue mất dữ liệu (M2).
6. **Origin của web app**: `webAppUrl` có phục vụ script bên thứ ba (analytics/map SDK) không? Nếu có, H1/H2 nghiêm trọng hơn vì bề mặt XSS lớn.
