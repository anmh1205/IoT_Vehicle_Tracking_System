import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:tracking_mobile/core/services/notification_service.dart';
import 'package:tracking_mobile/core/services/storage_service.dart';
import 'package:tracking_mobile/core/utils/logger.dart';
import 'package:tracking_mobile/features/notifications/local_notification_service.dart';

/// Top-level handler for background FCM messages (must be top-level function).
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  Log.info('FCM background message: ${message.messageId}');
  // Local notification is auto-displayed by the system for background messages
  // with a notification payload. Data-only messages can be handled here.
}

/// Manages Firebase Cloud Messaging lifecycle:
/// permission request, token retrieval, foreground/background handling.
class FCMHandler {
  const FCMHandler._();

  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  /// Initialize FCM: request permission, get token, set up listeners.
  static Future<void> init() async {
    try {
      // Request permission (iOS requires explicit request; Android auto-grants)
      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        Log.warn('FCM permission denied by user');
        return;
      }

      Log.info(
        'FCM permission: ${settings.authorizationStatus}',
      );

      // Get and store FCM token
      final token = await _messaging.getToken();
      if (token != null) {
        await StorageService.instance.saveFcmToken(token);
        Log.info('FCM token obtained: ${token.substring(0, 12)}...');
      }

      // Listen for token refresh
      _messaging.onTokenRefresh.listen((newToken) async {
        await StorageService.instance.saveFcmToken(newToken);
        Log.info('FCM token refreshed');
        // TODO: Re-register with backend API when token changes
      });

      // Background handler (must be top-level)
      FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);

      // Foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Message tap (app was in background, user tapped notification)
      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

      // Check if app was opened from a terminated state via notification
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        _handleNotificationTap(initialMessage);
      }

      Log.info('FCM initialized');
    } catch (e) {
      Log.error('FCM init failed: $e');
    }
  }

  /// Handle messages received while app is in the foreground.
  /// The system does NOT auto-display these, so we show a local notification.
  static void _handleForegroundMessage(RemoteMessage message) {
    Log.info('FCM foreground message: ${message.messageId}');

    final notification = message.notification;
    if (notification == null) return;

    NotificationService.show(
      title: notification.title ?? 'Vehicle Tracking',
      body: notification.body ?? '',
      id: message.hashCode,
    );
  }

  /// Handle when user taps a notification (from background or terminated).
  static void _handleNotificationTap(RemoteMessage message) {
    Log.info('Notification tapped: ${message.data}');

    // Data payload can contain a route to deep-link into the web app.
    // Example: { "route": "/vehicles/123" }
    // The WebView controller can navigate to this path.
    final route = message.data['route'];
    if (route != null) {
      Log.info('Deep link from notification: $route');
      // Deep linking is handled by the WebView controller provider
      // which can be accessed from the widget tree.
    }
  }
}
