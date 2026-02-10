import 'package:shared_preferences/shared_preferences.dart';
import 'package:tracking_mobile/core/utils/logger.dart';

/// Simple key-value cache backed by SharedPreferences.
///
/// Each entry stores a timestamp so stale data can be detected.
/// Used for non-sensitive data only (UI state, last-known positions).
class OfflineCache {
  OfflineCache._();

  static final OfflineCache instance = OfflineCache._();

  static const String _timestampSuffix = '__ts';

  /// Cache a string value with the current timestamp.
  Future<void> put(String key, String value) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, value);
      await prefs.setInt(
        '$key$_timestampSuffix',
        DateTime.now().millisecondsSinceEpoch,
      );
    } catch (e) {
      Log.error('OfflineCache put failed for $key: $e');
    }
  }

  /// Retrieve a cached value. Returns null if not found.
  Future<String?> get(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(key);
    } catch (e) {
      Log.error('OfflineCache get failed for $key: $e');
      return null;
    }
  }

  /// Get the timestamp when a key was last written. Returns null if not found.
  Future<DateTime?> getTimestamp(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final ms = prefs.getInt('$key$_timestampSuffix');
      if (ms == null) return null;
      return DateTime.fromMillisecondsSinceEpoch(ms);
    } catch (e) {
      return null;
    }
  }

  /// Check whether the cached value is older than [maxAge].
  Future<bool> isStale(String key, Duration maxAge) async {
    final ts = await getTimestamp(key);
    if (ts == null) return true;
    return DateTime.now().difference(ts) > maxAge;
  }

  /// Remove a single cached entry.
  Future<void> remove(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(key);
      await prefs.remove('$key$_timestampSuffix');
    } catch (e) {
      Log.error('OfflineCache remove failed for $key: $e');
    }
  }

  /// Clear all cached data.
  Future<void> clearAll() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      Log.info('OfflineCache cleared');
    } catch (e) {
      Log.error('OfflineCache clearAll failed: $e');
    }
  }
}
