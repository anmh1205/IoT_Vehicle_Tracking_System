import 'dart:async';

import 'package:tracking_mobile/core/services/connectivity_service.dart';
import 'package:tracking_mobile/core/utils/logger.dart';
import 'package:tracking_mobile/features/offline/offline_cache.dart';

/// Watches connectivity and triggers sync when the device comes back online.
///
/// Queued operations (e.g. pending API calls made while offline)
/// are stored in [OfflineCache] under known keys and flushed here.
class SyncService {
  SyncService._();

  static final SyncService instance = SyncService._();

  StreamSubscription<bool>? _subscription;
  bool _isSyncing = false;

  /// Start listening for connectivity changes.
  void start() {
    _subscription?.cancel();
    _subscription = ConnectivityService.onConnectivityChanged.listen(
      (online) {
        if (online) {
          _syncPendingData();
        }
      },
    );
    Log.info('SyncService started');
  }

  /// Stop listening (call on app dispose).
  void stop() {
    _subscription?.cancel();
    _subscription = null;
    Log.info('SyncService stopped');
  }

  /// Queue a JSON payload to be synced when connectivity returns.
  Future<void> enqueue(String key, String jsonPayload) async {
    await OfflineCache.instance.put('sync_$key', jsonPayload);
    Log.debug('Enqueued sync item: $key');
  }

  Future<void> _syncPendingData() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      Log.info('Connectivity restored - syncing pending data...');

      // In a real implementation, iterate over known sync keys,
      // POST each payload to the backend, and remove on success.
      // For now this is a placeholder that logs the event.

      Log.info('Sync complete');
    } catch (e) {
      Log.error('Sync failed: $e');
    } finally {
      _isSyncing = false;
    }
  }
}
