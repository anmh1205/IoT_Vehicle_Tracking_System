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

  static bool get _isLocalWebApp =>
      webAppUrl.contains('localhost') || webAppUrl.contains('127.0.0.1');
  static bool get _isLocalApi =>
      apiBaseUrl.contains('localhost') || apiBaseUrl.contains('127.0.0.1');
  static bool get _isLocalWs => wsUrl.contains('localhost') || wsUrl.contains('127.0.0.1');

  static bool get hasSecureProductionConfig {
    if (!isProduction) return true;

    final secureWeb = webAppUrl.startsWith('https://');
    final secureApi = apiBaseUrl.startsWith('https://');
    final secureWs = wsUrl.startsWith('wss://');

    return (secureWeb || _isLocalWebApp) && (secureApi || _isLocalApi) && (secureWs || _isLocalWs);
  }

  /// User-Agent suffix injected into WebView so the frontend can detect native app.
  static const String userAgentSuffix = 'TrackingMobileApp/1.0';
}
