import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tracking_mobile/core/config/routes.dart';
import 'package:tracking_mobile/core/utils/logger.dart';
import 'package:tracking_mobile/features/auth/auth_provider.dart';
import 'package:tracking_mobile/features/notifications/fcm_handler.dart';
import 'package:tracking_mobile/features/offline/sync_service.dart';

/// Splash screen shown on app launch.
///
/// Restores the auth session, initializes FCM, starts the sync service,
/// then navigates to the WebView screen.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    // Restore saved auth session
    await ref.read(authProvider.notifier).restoreSession();

    // Initialize Firebase Cloud Messaging
    try {
      await FCMHandler.init();
    } catch (e) {
      Log.error('FCM init skipped: $e');
    }

    // Start background sync listener
    SyncService.instance.start();

    // Brief delay so the splash is visible
    await Future.delayed(const Duration(milliseconds: 800));

    if (!mounted) return;

    // Always navigate to WebView; the web app handles its own auth UI
    Navigator.of(context).pushReplacementNamed(AppRoutes.webview);
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.directions_car_rounded,
              size: 80,
              color: colorScheme.primary,
            ),
            const SizedBox(height: 24),
            Text(
              'Vehicle Tracking',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
