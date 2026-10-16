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

/// Provide a native-enforced allowlist for the Flutter InAppWebView bridge.
///
/// Android expects exact scheme/host/port origin rules. On Apple platforms
/// the plugin interprets rules as regular expressions, so anchor and escape
/// every metacharacter to avoid matching attacker-controlled suffixes.
Set<String> nativeBridgeOriginAllowList(
  String appUrl, {
  required bool isAndroid,
}) {
  final uri = Uri.tryParse(appUrl);
  if (uri == null ||
      (uri.scheme != 'http' && uri.scheme != 'https') ||
      uri.host.isEmpty ||
      uri.userInfo.isNotEmpty) {
    return <String>{}; // Empty set means deny all.
  }

  final defaultPort = uri.scheme == 'https' ? 443 : 80;
  final portSuffix = uri.port == defaultPort ? '' : ':${uri.port}';
  final origin = '${uri.scheme}://${uri.host}$portSuffix';

  if (isAndroid) return <String>{origin};
  final escapedOrigin = RegExp.escape(origin);
  return <String>{'^$escapedOrigin\
}

/// Authenticate the *calling frame* in addition to the displayed top frame.
///
/// A trusted top-level page may contain hostile cross-origin iframes, and a
/// navigation race can invalidate a previously accepted URL. An opaque or
/// unreported frame origin must never be granted native privileges.
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
};
}

/// Authenticate the *calling frame* in addition to the displayed top frame.
///
/// A trusted top-level page may contain hostile cross-origin iframes, and a
/// navigation race can invalidate a previously accepted URL. An opaque or
/// unreported frame origin must never be granted native privileges.
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
