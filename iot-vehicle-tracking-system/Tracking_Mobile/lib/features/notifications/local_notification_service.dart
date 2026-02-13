import 'dart:io';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:tracking_mobile/core/utils/logger.dart';

/// Initializes the FlutterLocalNotificationsPlugin with platform-specific config.
///
/// Called once at app startup from [main.dart].
class LocalNotificationService {
  const LocalNotificationService._();

  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static Future<void> init() async {
    // Android initialization
    const androidSettings = AndroidInitializationSettings(
      '@mipmap/ic_launcher',
    );

    // iOS initialization
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _plugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // Create Android notification channel
    if (Platform.isAndroid) {
      await _createAndroidChannel();
    }

    Log.info('Local notifications initialized');
  }

  static Future<void> _createAndroidChannel() async {
    const channel = AndroidNotificationChannel(
      'tracking_default',
      'Tracking Notifications',
      description: 'Vehicle tracking alerts and updates',
      importance: Importance.high,
    );

    final androidPlugin =
        _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();

    await androidPlugin?.createNotificationChannel(channel);
  }

  static void _onNotificationTap(NotificationResponse response) {
    Log.info('Local notification tapped: ${response.payload}');
    // Could deep-link into the web app based on payload
  }
}
