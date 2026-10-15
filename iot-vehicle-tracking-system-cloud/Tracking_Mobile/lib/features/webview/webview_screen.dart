import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tracking_mobile/core/config/app_config.dart';
import 'package:tracking_mobile/core/services/connectivity_service.dart';
import 'package:tracking_mobile/core/utils/logger.dart';
import 'package:tracking_mobile/features/auth/auth_provider.dart';
import 'package:tracking_mobile/features/notifications/fcm_handler.dart';
import 'package:tracking_mobile/features/webview/js_bridge.dart';
import 'package:tracking_mobile/features/webview/trusted_web_origin.dart';
import 'package:tracking_mobile/features/webview/webview_controller.dart';
import 'package:tracking_mobile/widgets/error_view.dart';
import 'package:tracking_mobile/widgets/loading_indicator.dart';

/// Main screen that hosts the InAppWebView loading the Next.js dashboard.
class WebViewScreen extends ConsumerStatefulWidget {
  const WebViewScreen({super.key});

  @override
  ConsumerState<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends ConsumerState<WebViewScreen> {
  InAppWebViewController? _controller;
  bool _isLoading = true;
  bool _hasError = false;
  String? _errorMessage;
  StreamSubscription<String>? _fcmTokenSubscription;

  @override
  void initState() {
    super.initState();
    _fcmTokenSubscription = FCMHandler.tokenChanges.listen((token) {
      unawaited(_notifyFcmTokenChanged(token));
    });
  }

  @override
  void dispose() {
    final subscription = _fcmTokenSubscription;
    if (subscription != null) {
      unawaited(subscription.cancel());
    }
    super.dispose();
  }

  final InAppWebViewSettings _settings = InAppWebViewSettings(
    useShouldOverrideUrlLoading: true,
    mediaPlaybackRequiresUserGesture: false,
    javaScriptEnabled: true,
    // Native JavaScript handlers must not be invoked by third-party iframes
    // inside an otherwise trusted dashboard. Restrict enforcement in the
    // WebView engine itself, not merely by checking the top-level URL in Dart.
    javaScriptHandlersForMainFrameOnly: true,
    javaScriptBridgeForMainFrameOnly: true,
    javaScriptCanOpenWindowsAutomatically: false,
    supportZoom: false,
    allowsInlineMediaPlayback: true,
    // Android-specific
    useHybridComposition: true,
    domStorageEnabled: true,
    databaseEnabled: true,
    // iOS-specific
    allowsBackForwardNavigationGestures: true,
  );

  @override
  Widget build(BuildContext context) {
    final isOnline = ref.watch(isOnlineProvider);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final canGoBack = await _controller?.canGoBack() ?? false;
        if (canGoBack) {
          _controller?.goBack();
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: isOnline.when(
            data: (online) {
              if (!online && _hasError) {
                return ErrorView(
                  message: 'Không có kết nối Internet',
                  onRetry: _reload,
                );
              }
              return _buildWebView();
            },
            loading: () => _buildWebView(),
            error: (_, __) => _buildWebView(),
          ),
        ),
      ),
    );
  }

  Widget _buildWebView() {
    return Stack(
      children: [
        InAppWebView(
          initialUrlRequest: URLRequest(
            url: WebUri(AppConfig.webAppUrl),
          ),
          initialSettings: _settings,
          onWebViewCreated: _onWebViewCreated,
          onLoadStart: _onLoadStart,
          onLoadStop: _onLoadStop,
          onReceivedError: _onReceivedError,
          onConsoleMessage: _onConsoleMessage,
          shouldOverrideUrlLoading: _shouldOverrideUrlLoading,
        ),
        if (_isLoading) const LoadingIndicator(),
        if (_hasError && _errorMessage != null)
          ErrorView(
            message: _errorMessage!,
            onRetry: _reload,
          ),
      ],
    );
  }

  void _onWebViewCreated(InAppWebViewController controller) {
    _controller = controller;
    ref.read(webViewControllerProvider.notifier).setController(controller);

    // Register JS bridge handlers
    JSBridge.register(controller, ref);

    Log.info('WebView created');
  }

  void _onLoadStart(InAppWebViewController controller, WebUri? url) {
    setState(() {
      _isLoading = true;
      _hasError = false;
      _errorMessage = null;
    });
    Log.debug('Loading: $url');
  }

  Future<void> _onLoadStop(
    InAppWebViewController controller,
    WebUri? url,
  ) async {
    setState(() => _isLoading = false);

    // The URL from the callback may be stale after redirects. Inspect the
    // controller's current top-level document before exposing native APIs.
    if (!await _isTrustedCurrentPage(controller)) {
      Log.warn('Skipped native bridge on an untrusted WebView page');
      return;
    }
    await JSBridge.inject(controller);

    // Recheck after the asynchronous bridge operation. Serialize secrets as
    // JSON rather than interpolating unescaped token characters into JS.
    final token = ref.read(authProvider).token;
    if (token != null && await _isTrustedCurrentPage(controller)) {
      await controller.evaluateJavascript(
        source: 'window.__NATIVE_AUTH_TOKEN__ = ${jsonEncode(token)};',
      );
      Log.debug('Auth token injected into trusted WebView origin');
    }

    Log.info('Page loaded: $url');
  }

  void _onReceivedError(
    InAppWebViewController controller,
    WebResourceRequest request,
    WebResourceError error,
  ) {
    // Only handle main frame errors
    if (request.isForMainFrame ?? false) {
      setState(() {
        _isLoading = false;
        _hasError = true;
        _errorMessage = _friendlyError(error.type);
      });
      Log.error('WebView error: ${error.type} - ${error.description}');
    }
  }

  void _onConsoleMessage(
    InAppWebViewController controller,
    ConsoleMessage message,
  ) {
    Log.debug('JS Console [${message.messageLevel}]: ${message.message}');
  }

  Future<NavigationActionPolicy?> _shouldOverrideUrlLoading(
    InAppWebViewController controller,
    NavigationAction action,
  ) async {
    final url = action.request.url?.toString() ?? '';

    // Permit only the exact configured origin; about:blank has no native
    // privileges and may be used by the WebView during initialization.
    if (isTrustedWebOrigin(url, AppConfig.webAppUrl) || url == 'about:blank') {
      return NavigationActionPolicy.ALLOW;
    }

    // Block external URLs (could open in external browser if needed)
    Log.warn('Blocked external navigation: $url');
    return NavigationActionPolicy.CANCEL;
  }

  Future<void> _notifyFcmTokenChanged(String token) async {
    final controller = _controller;
    if (controller == null || !await _isTrustedCurrentPage(controller)) return;

    final encodedToken = jsonEncode(token);
    await controller.evaluateJavascript(
      source: '''
        window.dispatchEvent(new CustomEvent('NativeFcmTokenChanged', {
          detail: { token: $encodedToken }
        }));
      ''',
    );
  }

  Future<bool> _isTrustedCurrentPage(InAppWebViewController controller) async {
    try {
      final currentUrl = (await controller.getUrl())?.toString();
      return isTrustedWebOrigin(currentUrl, AppConfig.webAppUrl);
    } catch (error) {
      Log.warn('Unable to validate WebView origin: $error');
      return false;
    }
  }

  void _reload() {
    setState(() {
      _hasError = false;
      _errorMessage = null;
      _isLoading = true;
    });
    _controller?.reload();
  }

  String _friendlyError(WebResourceErrorType? type) {
    if (type == WebResourceErrorType.NOT_CONNECTED_TO_INTERNET) {
      return 'Không có kết nối Internet.';
    }
    return 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
}
