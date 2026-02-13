import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tracking_mobile/core/utils/logger.dart';

/// Whether the device currently has network connectivity.
final isOnlineProvider = StreamProvider<bool>((ref) {
  return ConnectivityService.onConnectivityChanged;
});

/// Thin wrapper around [Connectivity] for testability.
class ConnectivityService {
  const ConnectivityService._();

  static final Connectivity _connectivity = Connectivity();

  /// Stream that emits `true` when online, `false` when offline.
  static Stream<bool> get onConnectivityChanged {
    return _connectivity.onConnectivityChanged.map((results) {
      final online = results.any((r) => r != ConnectivityResult.none);
      Log.debug('Connectivity changed: online=$online');
      return online;
    });
  }

  /// One-shot check of current connectivity.
  static Future<bool> checkNow() async {
    final results = await _connectivity.checkConnectivity();
    return results.any((r) => r != ConnectivityResult.none);
  }
}
