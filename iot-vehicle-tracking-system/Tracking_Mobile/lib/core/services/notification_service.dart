import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:tracking_mobile/core/utils/logger.dart';

/// Convenience wrapper for showing local notifications from anywhere.
class NotificationService {
  const NotificationService._();

  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static const _androidChannel = AndroidNotificationDetails(
    'tracking_default',
    'Tracking Notifications',
    channelDescription: 'Vehicle tracking alerts and updates',
    importance: Importance.high,
    priority: Priority.high,
  );

  static const _notificationDetails = NotificationDetails(
    android: _androidChannel,
    iOS: DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    ),
  );

  /// Show a local notification with [title] and [body].
  static Future<void> show({
    required String title,
    required String body,
    int id = 0,
  }) async {
    try {
      await _plugin.show(id, title, body, _notificationDetails);
    } catch (e) {
      Log.error('Failed to show notification: $e');
    }
  }
}
