import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tracking_mobile/core/utils/logger.dart';

/// Riverpod provider exposing the current [InAppWebViewController].
final webViewControllerProvider =
    StateNotifierProvider<WebViewControllerNotifier, WebViewState>((ref) {
  return WebViewControllerNotifier();
});

class WebViewState {
  final InAppWebViewController? controller;
  final bool isReady;

  const WebViewState({this.controller, this.isReady = false});

  WebViewState copyWith({
    InAppWebViewController? controller,
    bool? isReady,
  }) {
    return WebViewState(
      controller: controller ?? this.controller,
      isReady: isReady ?? this.isReady,
    );
  }
}

class WebViewControllerNotifier extends StateNotifier<WebViewState> {
  WebViewControllerNotifier() : super(const WebViewState());

  void setController(InAppWebViewController controller) {
    state = state.copyWith(controller: controller, isReady: true);
    Log.debug('WebView controller stored in provider');
  }

  /// Reload the current page.
  Future<void> reload() async {
    await state.controller?.reload();
  }

  /// Navigate to a path within the web app.
  Future<void> navigateTo(String path) async {
    final controller = state.controller;
    if (controller == null) return;

    await controller.evaluateJavascript(
      source: 'window.location.href = "$path";',
    );
  }

  /// Execute arbitrary JavaScript in the WebView.
  Future<dynamic> evaluateJs(String source) async {
    return state.controller?.evaluateJavascript(source: source);
  }
}
