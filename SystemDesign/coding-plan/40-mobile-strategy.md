# Mobile Strategy

> Flutter WebView Hybrid App cho IoT Vehicle Tracking System

---

## 1. Tổng Quan Chiến Lược

### 1.1 Lý do chọn Flutter WebView Hybrid

| Approach | Pros | Cons |
|----------|------|------|
| **Native (Swift/Kotlin)** | Best performance | 2 codebases, expensive |
| **React Native** | Cross-platform | Limited native access |
| **Flutter Native** | Cross-platform, good perf | Duplicate UI effort |
| **Flutter WebView** ✅ | Reuse web, native features | WebView overhead |

**Quyết định**: Flutter WebView Hybrid vì:
1. **Reuse 90% web dashboard** - Không cần build lại UI
2. **Native features khi cần** - Push notifications, background tracking, offline storage
3. **Single codebase** - iOS + Android từ 1 source
4. **Phát triển nhanh** - Web team có thể đóng góp

### 1.2 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 FLUTTER WEBVIEW HYBRID                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Flutter Shell                     │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │              InAppWebView                    │    │    │
│  │  │  ┌───────────────────────────────────────┐  │    │    │
│  │  │  │         Next.js Web App               │  │    │    │
│  │  │  │    (Dashboard, Maps, Charts)          │  │    │    │
│  │  │  └───────────────────────────────────────┘  │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                         │                            │    │
│  │                    JS Bridge                         │    │
│  │                         │                            │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │              Native Services                 │    │    │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │    │
│  │  │  │Firebase │ │Location │ │ Local   │       │    │    │
│  │  │  │  FCM    │ │Tracking │ │ Storage │       │    │    │
│  │  │  └─────────┘ └─────────┘ └─────────┘       │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

### 2.1 Dependencies

```yaml
# pubspec.yaml
name: vehicle_tracking
description: IoT Vehicle Tracking Mobile App

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # WebView
  flutter_inappwebview: ^6.0.0

  # State Management
  flutter_riverpod: ^2.4.0
  riverpod_annotation: ^2.3.0

  # Firebase
  firebase_core: ^2.24.0
  firebase_messaging: ^14.7.0

  # Local Storage
  shared_preferences: ^2.2.0
  flutter_secure_storage: ^9.0.0

  # Connectivity
  connectivity_plus: ^5.0.0

  # Socket.IO (fallback when offline)
  socket_io_client: ^2.0.0

  # Background Services
  workmanager: ^0.5.0

  # Notifications
  flutter_local_notifications: ^16.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  riverpod_generator: ^2.3.0
  build_runner: ^2.4.0
  flutter_lints: ^3.0.0
```

---

## 3. Project Structure

```
lib/
├── main.dart                      # Entry point
├── app.dart                       # MaterialApp setup
│
├── core/                          # Core utilities
│   ├── config/
│   │   ├── app_config.dart        # URLs, environment
│   │   └── routes.dart            # Navigation
│   ├── services/
│   │   ├── connectivity_service.dart
│   │   ├── notification_service.dart
│   │   └── storage_service.dart
│   └── utils/
│       └── logger.dart
│
├── features/                      # Feature modules
│   ├── webview/
│   │   ├── webview_screen.dart    # Main WebView
│   │   ├── js_bridge.dart         # JS ↔ Native bridge
│   │   └── webview_controller.dart
│   ├── auth/
│   │   ├── auth_provider.dart     # Riverpod state
│   │   └── auth_service.dart
│   ├── notifications/
│   │   ├── fcm_handler.dart
│   │   └── local_notification_service.dart
│   └── offline/
│       ├── offline_cache.dart
│       └── sync_service.dart
│
└── widgets/                       # Shared widgets
    ├── loading_indicator.dart
    ├── error_view.dart
    └── splash_screen.dart
```

---

## 4. Core Implementation

### 4.1 App Configuration

```dart
// core/config/app_config.dart
class AppConfig {
  static const String webAppUrl = String.fromEnvironment(
    'WEB_APP_URL',
    defaultValue: 'https://tracking.example.com',
  );

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.tracking.example.com',
  );

  static const String wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'wss://api.tracking.example.com',
  );

  static const bool isProduction = bool.fromEnvironment('PRODUCTION', defaultValue: false);
}
```

### 4.2 Main Entry Point

```dart
// main.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp();

  // Initialize notifications
  await NotificationService.initialize();

  runApp(
    const ProviderScope(
      child: VehicleTrackingApp(),
    ),
  );
}

class VehicleTrackingApp extends StatelessWidget {
  const VehicleTrackingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Vehicle Tracking',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}
```

### 4.3 WebView Screen

```dart
// features/webview/webview_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class WebViewScreen extends ConsumerStatefulWidget {
  const WebViewScreen({super.key});

  @override
  ConsumerState<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends ConsumerState<WebViewScreen> {
  InAppWebViewController? _webViewController;
  bool _isLoading = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            InAppWebView(
              initialUrlRequest: URLRequest(
                url: WebUri(AppConfig.webAppUrl),
              ),
              initialSettings: InAppWebViewSettings(
                javaScriptEnabled: true,
                useShouldOverrideUrlLoading: true,
                mediaPlaybackRequiresUserGesture: false,
                allowsInlineMediaPlayback: true,
                // Cache settings
                cacheEnabled: true,
                clearCache: false,
              ),
              onWebViewCreated: (controller) {
                _webViewController = controller;
                _setupJSBridge(controller);
              },
              onLoadStart: (controller, url) {
                setState(() => _isLoading = true);
              },
              onLoadStop: (controller, url) {
                setState(() => _isLoading = false);
                _injectAuthToken();
              },
              onReceivedError: (controller, request, error) {
                _handleError(error);
              },
            ),
            if (_isLoading)
              const Center(child: CircularProgressIndicator()),
          ],
        ),
      ),
    );
  }

  void _setupJSBridge(InAppWebViewController controller) {
    // Add JavaScript handler for native calls
    controller.addJavaScriptHandler(
      handlerName: 'nativeBridge',
      callback: (args) async {
        final action = args[0] as String;
        final data = args.length > 1 ? args[1] : null;

        switch (action) {
          case 'showNotification':
            await NotificationService.showLocal(
              title: data['title'],
              body: data['body'],
            );
            break;
          case 'saveToken':
            await StorageService.saveToken(data['token']);
            break;
          case 'getDeviceInfo':
            return await _getDeviceInfo();
          case 'logout':
            await _handleLogout();
            break;
        }
      },
    );
  }

  Future<void> _injectAuthToken() async {
    final token = await StorageService.getToken();
    if (token != null) {
      await _webViewController?.evaluateJavascript(source: '''
        window.localStorage.setItem('auth_token', '$token');
        window.dispatchEvent(new CustomEvent('nativeTokenInjected'));
      ''');
    }
  }

  Future<Map<String, dynamic>> _getDeviceInfo() async {
    return {
      'platform': Platform.isIOS ? 'ios' : 'android',
      'version': await PackageInfo.fromPlatform().then((p) => p.version),
      'fcmToken': await FirebaseMessaging.instance.getToken(),
    };
  }

  void _handleError(WebResourceError error) {
    // Show offline page or retry button
    setState(() => _isLoading = false);
  }

  Future<void> _handleLogout() async {
    await StorageService.clearAll();
    await FirebaseMessaging.instance.deleteToken();
    // Navigate to login or refresh WebView
    _webViewController?.reload();
  }
}
```

### 4.4 JavaScript Bridge

```dart
// features/webview/js_bridge.dart

/// Web App calls:
/// window.flutter_inappwebview.callHandler('nativeBridge', 'action', data)
///
/// Supported actions:
/// - showNotification: { title, body, data? }
/// - saveToken: { token }
/// - getDeviceInfo: returns { platform, version, fcmToken }
/// - logout: clears storage, FCM token
/// - getCurrentLocation: returns { lat, lng }
/// - openExternalLink: { url }
/// - shareContent: { title, text, url? }
/// - vibrate: { duration? }

class JSBridge {
  static const String injectScript = '''
    window.NativeBridge = {
      showNotification: (title, body, data) => {
        return window.flutter_inappwebview.callHandler('nativeBridge', 'showNotification', { title, body, data });
      },
      saveToken: (token) => {
        return window.flutter_inappwebview.callHandler('nativeBridge', 'saveToken', { token });
      },
      getDeviceInfo: () => {
        return window.flutter_inappwebview.callHandler('nativeBridge', 'getDeviceInfo');
      },
      logout: () => {
        return window.flutter_inappwebview.callHandler('nativeBridge', 'logout');
      },
      getCurrentLocation: () => {
        return window.flutter_inappwebview.callHandler('nativeBridge', 'getCurrentLocation');
      },
      isNativeApp: () => true,
    };

    // Dispatch ready event
    window.dispatchEvent(new CustomEvent('nativeBridgeReady'));
  ''';
}
```

---

## 5. Push Notifications (FCM)

### 5.1 FCM Handler

```dart
// features/notifications/fcm_handler.dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class FCMHandler {
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  static Future<void> initialize() async {
    // Request permission
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Get FCM token
    final token = await FirebaseMessaging.instance.getToken();
    print('FCM Token: $token');

    // Send token to backend
    await _registerToken(token);

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Handle background messages
    FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);

    // Handle notification tap
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // Initialize local notifications
    await _initializeLocalNotifications();
  }

  static Future<void> _registerToken(String? token) async {
    if (token == null) return;

    final authToken = await StorageService.getToken();
    if (authToken == null) return;

    await http.post(
      Uri.parse('${AppConfig.apiBaseUrl}/api/v1/notifications/register'),
      headers: {
        'Authorization': 'Bearer $authToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'fcm_token': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
      }),
    );
  }

  static Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();

    await _localNotifications.initialize(
      const InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      ),
      onDidReceiveNotificationResponse: (response) {
        // Handle notification tap
        _handleNotificationTap(RemoteMessage(data: {'payload': response.payload}));
      },
    );
  }

  static Future<void> _handleForegroundMessage(RemoteMessage message) async {
    // Show local notification when app is in foreground
    await _localNotifications.show(
      message.hashCode,
      message.notification?.title,
      message.notification?.body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'vehicle_tracking',
          'Vehicle Tracking',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      payload: jsonEncode(message.data),
    );
  }

  static Future<void> _handleNotificationTap(RemoteMessage message) async {
    final data = message.data;

    // Navigate to specific page based on notification type
    if (data['type'] == 'alert') {
      // Navigate to alerts page
      final alertId = data['alert_id'];
      // Use deep link or WebView navigation
    } else if (data['type'] == 'device') {
      // Navigate to device details
      final deviceId = data['device_id'];
    }
  }
}

// Background handler (top-level function)
@pragma('vm:entry-point')
Future<void> _handleBackgroundMessage(RemoteMessage message) async {
  // Handle background message
  print('Background message: ${message.messageId}');
}
```

---

## 6. Offline Support

### 6.1 Connectivity Service

```dart
// core/services/connectivity_service.dart
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final connectivityProvider = StreamProvider<bool>((ref) {
  return Connectivity().onConnectivityChanged.map((result) {
    return result != ConnectivityResult.none;
  });
});

class ConnectivityService {
  static Future<bool> isOnline() async {
    final result = await Connectivity().checkConnectivity();
    return result != ConnectivityResult.none;
  }
}
```

### 6.2 Offline Cache

```dart
// features/offline/offline_cache.dart
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class OfflineCache {
  static const String _cacheKey = 'offline_cache';
  static const String _lastSyncKey = 'last_sync';

  static Future<void> cacheData(String key, dynamic data) async {
    final prefs = await SharedPreferences.getInstance();
    final cache = await _getCache(prefs);

    cache[key] = {
      'data': data,
      'timestamp': DateTime.now().toIso8601String(),
    };

    await prefs.setString(_cacheKey, jsonEncode(cache));
  }

  static Future<T?> getCachedData<T>(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final cache = await _getCache(prefs);

    final entry = cache[key];
    if (entry == null) return null;

    return entry['data'] as T;
  }

  static Future<Map<String, dynamic>> _getCache(SharedPreferences prefs) async {
    final cacheString = prefs.getString(_cacheKey);
    if (cacheString == null) return {};
    return jsonDecode(cacheString) as Map<String, dynamic>;
  }

  static Future<void> clearCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_cacheKey);
  }
}
```

---

## 7. Web App Integration

### 7.1 Frontend Changes (Next.js)

```typescript
// lib/native-bridge.ts
declare global {
  interface Window {
    NativeBridge?: {
      showNotification: (title: string, body: string, data?: any) => Promise<void>;
      saveToken: (token: string) => Promise<void>;
      getDeviceInfo: () => Promise<{
        platform: 'ios' | 'android';
        version: string;
        fcmToken: string;
      }>;
      logout: () => Promise<void>;
      getCurrentLocation: () => Promise<{ lat: number; lng: number }>;
      isNativeApp: () => boolean;
    };
  }
}

export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && !!window.NativeBridge?.isNativeApp();
}

export async function registerFCMToken(): Promise<void> {
  if (!isNativeApp()) return;

  const deviceInfo = await window.NativeBridge!.getDeviceInfo();

  await fetch('/api/v1/notifications/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fcm_token: deviceInfo.fcmToken,
      platform: deviceInfo.platform,
    }),
  });
}

export async function showNativeNotification(
  title: string,
  body: string,
  data?: any
): Promise<void> {
  if (isNativeApp()) {
    await window.NativeBridge!.showNotification(title, body, data);
  } else {
    // Fallback to web notifications
    new Notification(title, { body });
  }
}
```

### 7.2 Auth Hook Update

```typescript
// hooks/use-auth.ts
import { isNativeApp } from '@/lib/native-bridge';

export function useAuth() {
  const login = async (credentials: LoginCredentials) => {
    const response = await api.post('/auth/login', credentials);
    const { token } = response.data;

    // Save to localStorage
    localStorage.setItem('auth_token', token);

    // Notify native app
    if (isNativeApp()) {
      await window.NativeBridge!.saveToken(token);
    }
  };

  const logout = async () => {
    localStorage.removeItem('auth_token');

    if (isNativeApp()) {
      await window.NativeBridge!.logout();
    } else {
      router.push('/login');
    }
  };

  return { login, logout };
}
```

---

## 8. Build & Release

### 8.1 Android Configuration

```gradle
// android/app/build.gradle
android {
    defaultConfig {
        applicationId "com.example.vehicletracking"
        minSdkVersion 21
        targetSdkVersion 34
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }

    flavorDimensions "environment"
    productFlavors {
        development {
            dimension "environment"
            applicationIdSuffix ".dev"
            resValue "string", "app_name", "Vehicle Tracking Dev"
        }
        production {
            dimension "environment"
            resValue "string", "app_name", "Vehicle Tracking"
        }
    }
}
```

### 8.2 iOS Configuration

```xml
<!-- ios/Runner/Info.plist -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoadsInWebContent</key>
    <true/>
</dict>
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to show nearby vehicles</string>
<key>UIBackgroundModes</key>
<array>
    <string>fetch</string>
    <string>remote-notification</string>
</array>
```

### 8.3 Build Commands

```bash
# Development
flutter run --flavor development --dart-define=WEB_APP_URL=http://localhost:3002

# Production APK
flutter build apk --release --flavor production \
  --dart-define=WEB_APP_URL=https://tracking.example.com \
  --dart-define=API_BASE_URL=https://api.tracking.example.com \
  --dart-define=PRODUCTION=true

# Production iOS
flutter build ipa --release \
  --dart-define=WEB_APP_URL=https://tracking.example.com \
  --dart-define=API_BASE_URL=https://api.tracking.example.com \
  --dart-define=PRODUCTION=true
```

---

## 9. Testing

```dart
// test/webview_test.dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('WebView Tests', () {
    testWidgets('should load web app', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: WebViewScreen()));

      // Verify loading indicator appears
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });

  group('Native Bridge Tests', () {
    test('should handle notification action', () async {
      // Mock test
    });
  });
}
```

---

## 10. Implementation Checklist

### Phase 1: Setup
- [ ] Create Flutter project
- [ ] Configure Firebase (iOS + Android)
- [ ] Add dependencies to pubspec.yaml
- [ ] Setup Android build flavors
- [ ] Setup iOS configurations

### Phase 2: Core Features
- [ ] Implement WebView screen
- [ ] Setup JS Bridge
- [ ] Implement auth token injection
- [ ] Handle WebView errors

### Phase 3: Native Features
- [ ] FCM push notifications
- [ ] Local notifications
- [ ] Secure storage for tokens
- [ ] Connectivity monitoring

### Phase 4: Offline Support
- [ ] Implement offline cache
- [ ] Sync service
- [ ] Offline UI fallback

### Phase 5: Web App Integration
- [ ] Add NativeBridge detection to Next.js
- [ ] Update auth hooks
- [ ] Handle deep links

### Phase 6: Release
- [ ] Configure signing (Android)
- [ ] Configure provisioning (iOS)
- [ ] Build and test release versions
- [ ] App Store / Play Store submission
