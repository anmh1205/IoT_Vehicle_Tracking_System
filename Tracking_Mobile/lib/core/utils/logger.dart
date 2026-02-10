import 'dart:developer' as dev;

import 'package:tracking_mobile/core/config/app_config.dart';

/// Simple leveled logger. Silences debug/info in production builds.
class Log {
  const Log._();

  static void debug(String message) {
    if (!AppConfig.isProduction) {
      dev.log(message, name: 'DEBUG');
    }
  }

  static void info(String message) {
    if (!AppConfig.isProduction) {
      dev.log(message, name: 'INFO');
    }
  }

  static void warn(String message) {
    dev.log(message, name: 'WARN');
  }

  static void error(String message, [Object? error, StackTrace? stackTrace]) {
    dev.log(message, name: 'ERROR', error: error, stackTrace: stackTrace);
  }
}
