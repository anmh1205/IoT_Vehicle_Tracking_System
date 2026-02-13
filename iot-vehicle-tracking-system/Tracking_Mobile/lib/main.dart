import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:tracking_mobile/app.dart';
import 'package:tracking_mobile/core/utils/logger.dart';
import 'package:tracking_mobile/features/notifications/local_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  // NOTE: Requires google-services.json (Android) and GoogleService-Info.plist (iOS)
  // to be placed in the respective platform directories.
  try {
    await Firebase.initializeApp();
    Log.info('Firebase initialized');
  } catch (e) {
    Log.error('Firebase init failed (may not be configured): $e');
  }

  // Initialize local notifications
  await LocalNotificationService.init();

  runApp(
    const ProviderScope(
      child: TrackingApp(),
    ),
  );
}
