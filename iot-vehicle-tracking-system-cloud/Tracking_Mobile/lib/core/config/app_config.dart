/// Application configuration loaded from environment / compile-time constants.
///
/// For production, pass values via --dart-define:
///   flutter run --dart-define=WEB_APP_URL=https://app.example.com
class AppConfig {
  AppConfig._();

  static const String webAppUrl = String.fromEnvironment(
    'WEB_APP_URL',
    defaultValue: 'http://localhost:3002',
  );

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const String wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'ws://localhost:3000',
  );

  static const bool isProduction = bool.fromEnvironment(
    'PRODUCTION',
    defaultValue: false,
  );

  static bool get hasSecureProductionConfig {
    if (!isProduction) return true;
    return isApprovedProductionUrl(webAppUrl, secureScheme: 'https') &&
        isApprovedProductionUrl(apiBaseUrl, secureScheme: 'https') &&
        isApprovedProductionUrl(wsUrl, secureScheme: 'wss');
  }
  /// User-Agent suffix injected into WebView so the frontend can detect native app.
  static const String userAgentSuffix = 'TrackingMobileApp/1.0';
}

/// Permit secure transport to any valid host, or cleartext only to exact
/// loopback endpoints used for local development/diagnostics.
/// URL prefixes or a substring such as '?next=localhost' are never evidence
/// that a remote destination is trustworthy.
bool isApprovedProductionUrl(String rawUrl, {required String secureScheme}) {
  final uri = Uri.tryParse(rawUrl);
  if (uri == null || !uri.hasAuthority || uri.host.isEmpty || uri.userInfo.isNotEmpty) {
    return false;
  }
  if (uri.scheme == secureScheme) return true;
  final insecureScheme = secureScheme == 'wss' ? 'ws' : 'http';
  if (uri.scheme != insecureScheme) return false;
  return uri.host == 'localhost' ||
      uri.host == '127.0.0.1' ||
      uri.host == '::1' ||
      uri.host == '[::1]';
}
