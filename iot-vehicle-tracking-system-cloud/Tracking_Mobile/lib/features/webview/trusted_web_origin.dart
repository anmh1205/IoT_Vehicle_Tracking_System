import 'dart:convert';

/// Accept only the configured application's exact HTTP(S) origin.
///
/// Paths, query strings and fragments may vary within the trusted origin.
/// A matching URL prefix is never sufficient: host, scheme and effective port
/// must agree, and embedded userinfo is rejected.
bool isTrustedWebOrigin(String? candidateUrl, String appUrl) {
  if (candidateUrl == null) return false;

  final candidate = Uri.tryParse(candidateUrl);
  final configured = Uri.tryParse(appUrl);
  if (candidate == null || configured == null) return false;

  if (configured.scheme != 'http' && configured.scheme != 'https') {
    return false;
  }
  if (configured.host.isEmpty || configured.userInfo.isNotEmpty) {
    return false;
  }
  if (candidate.scheme != 'http' && candidate.scheme != 'https') {
    return false;
  }
  return candidate.host.isNotEmpty &&
      candidate.userInfo.isEmpty &&
      candidate.scheme == configured.scheme &&
      candidate.host == configured.host &&
      candidate.port == configured.port;
}

/// Provide native-enforced allowed origins for the WebView bridge.
/// Android uses exact origin rules; iOS uses anchored escaped regex patterns.
Set<String> nativeBridgeOriginAllowList(
  String appUrl, {
  required bool isAndroid,
}) {
  final uri = Uri.tryParse(appUrl);
  if (uri == null ||
      (uri.scheme != 'http' && uri.scheme != 'https') ||
      uri.host.isEmpty ||
      uri.userInfo.isNotEmpty) {
    return <String>{};
  }
  final defaultPort = uri.scheme == 'https' ? 443 : 80;
  final portSuffix = uri.port == defaultPort ? '' : ':${uri.port}';
  final origin = '${uri.scheme}://${uri.host}$portSuffix';
  if (isAndroid) return <String>{origin};
  final escapedOrigin = RegExp.escape(origin);
  return <String>{'^$escapedOrigin\$'};
}

/// Native JavaScript **handler** origin rules are regular expressions on both
/// Android and iOS. They must not reuse the Android WebView bridge's literal
/// origin rule, which could behave like an unanchored, unescaped regex.
Set<String> nativeHandlerOriginAllowList(String appUrl) =>
    nativeBridgeOriginAllowList(appUrl, isAndroid: false);

/// Validate calling frame independently from the displayed top frame.
bool isTrustedNativeBridgeCaller({
  required bool isMainFrame,
  required String? origin,
  required String? requestUrl,
  required String appUrl,
}) {
  return isMainFrame &&
      isTrustedWebOrigin(origin, appUrl) &&
      isTrustedWebOrigin(requestUrl, appUrl);
}

/// Guard injected JS in the document itself against navigation/redirect races.
/// Native callbacks still enforce their own trusted top-frame/caller checks.
String? trustedBridgeInjectionSource(String appUrl, String bridgeScript) {
  if (!isTrustedWebOrigin(appUrl, appUrl)) return null;
  final originLiteral = jsonEncode(Uri.parse(appUrl).origin);
  return '''
    (function() {
      if (window.top !== window || window.location.origin !== $originLiteral) return;
      $bridgeScript
    })();
  ''';
}
