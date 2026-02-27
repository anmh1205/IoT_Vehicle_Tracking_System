import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tracking_mobile/core/config/app_config.dart';
import 'package:tracking_mobile/core/services/connectivity_service.dart';
import 'package:tracking_mobile/core/utils/logger.dart';
import 'package:tracking_mobile/features/auth/auth_provider.dart';
import 'package:tracking_mobile/features/webview/js_bridge.dart';
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

  final InAppWebViewSettings _settings = InAppWebViewSettings(
    useShouldOverrideUrlLoading: true,
    mediaPlaybackRequiresUserGesture: false,
    javaScriptEnabled: true,
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
                  message: 'No internet connection',
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

    // Inject JS bridge script
    await JSBridge.inject(controller);

    // Inject auth token if available
    final token = ref.read(authProvider).token;
    if (token != null) {
      await controller.evaluateJavascript(
        source: 'window.__NATIVE_AUTH_TOKEN__ = "$token";',
      );
      Log.debug('Auth token injected into WebView');
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

    // Allow navigation within the web app domain
    if (url.startsWith(AppConfig.webAppUrl) || url.startsWith('about:')) {
      return NavigationActionPolicy.ALLOW;
    }

    // Block external URLs (could open in external browser if needed)
    Log.warn('Blocked external navigation: $url');
    return NavigationActionPolicy.CANCEL;
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
      return 'No internet connection.';
    }
    return 'Something went wrong. Please try again.';
  }
}
