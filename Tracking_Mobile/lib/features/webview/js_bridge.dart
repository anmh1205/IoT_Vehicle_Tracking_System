import 'dart:io';

import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tracking_mobile/core/services/notification_service.dart';
import 'package:tracking_mobile/core/services/storage_service.dart';
import 'package:tracking_mobile/core/utils/logger.dart';
import 'package:tracking_mobile/features/auth/auth_provider.dart';

/// Manages the JavaScript bridge between the Flutter shell and the Next.js web app.
///
/// Defines `window.NativeBridge` in the WebView with methods the web app can call
/// to access native capabilities (notifications, secure storage, device info, etc.).
class JSBridge {
  const JSBridge._();

  /// JavaScript source injected into every page to define the NativeBridge API.
  static const String _bridgeScript = '''
    (function() {
      if (window.NativeBridge) return;

      window.NativeBridge = {
        isNativeApp: function() { return true; },

        showNotification: function(title, body) {
          window.flutter_inappwebview.callHandler('showNotification', title, body);
        },

        saveToken: function(token) {
          window.flutter_inappwebview.callHandler('saveToken', token);
        },

        getDeviceInfo: function() {
          return window.flutter_inappwebview.callHandler('getDeviceInfo');
        },

        logout: function() {
          window.flutter_inappwebview.callHandler('logout');
        },

        getCurrentLocation: function() {
          return window.flutter_inappwebview.callHandler('getCurrentLocation');
        },

        getFcmToken: function() {
          return window.flutter_inappwebview.callHandler('getFcmToken');
        }
      };

      // Dispatch event so the web app knows the bridge is ready
      window.dispatchEvent(new Event('NativeBridgeReady'));
    })();
  ''';

  /// Inject the bridge script into the current page.
  static Future<void> inject(InAppWebViewController controller) async {
    await controller.evaluateJavascript(source: _bridgeScript);
    Log.debug('JS Bridge injected');
  }

  /// Register native handler callbacks on the WebView controller.
  static void register(InAppWebViewController controller, WidgetRef ref) {
    controller.addJavaScriptHandler(
      handlerName: 'showNotification',
      callback: (args) {
        final title = args.isNotEmpty ? args[0].toString() : 'Notification';
        final body = args.length > 1 ? args[1].toString() : '';
        NotificationService.show(title: title, body: body);
        Log.info('Native notification: $title');
      },
    );

    controller.addJavaScriptHandler(
      handlerName: 'saveToken',
      callback: (args) async {
        if (args.isNotEmpty) {
          final token = args[0].toString();
          await ref.read(authProvider.notifier).login(token);
          Log.info('Auth token saved from web app');
        }
      },
    );

    controller.addJavaScriptHandler(
      handlerName: 'getDeviceInfo',
      callback: (_) {
        return {
          'platform': Platform.isIOS ? 'ios' : 'android',
          'isNativeApp': true,
          'appVersion': '1.0.0',
        };
      },
    );

    controller.addJavaScriptHandler(
      handlerName: 'logout',
      callback: (_) async {
        await ref.read(authProvider.notifier).logout();
        Log.info('Logout triggered from web app');
      },
    );

    controller.addJavaScriptHandler(
      handlerName: 'getCurrentLocation',
      callback: (_) async {
        // Placeholder - location permission and service integration
        // would be added in a future iteration.
        return {'latitude': 0.0, 'longitude': 0.0, 'available': false};
      },
    );

    controller.addJavaScriptHandler(
      handlerName: 'getFcmToken',
      callback: (_) async {
        final token = await StorageService.instance.getFcmToken();
        return token;
      },
    );

    Log.debug('JS Bridge handlers registered');
  }
}
