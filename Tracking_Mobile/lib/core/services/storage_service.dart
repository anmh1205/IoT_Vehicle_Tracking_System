import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:tracking_mobile/core/utils/logger.dart';

/// Secure key-value storage for sensitive data (auth tokens, etc.).
///
/// Uses Keychain on iOS and EncryptedSharedPreferences on Android.
class StorageService {
  StorageService._();

  static final StorageService instance = StorageService._();

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  // Key constants
  static const _keyAuthToken = 'auth_token';
  static const _keyFcmToken = 'fcm_token';

  // --- Auth Token ---

  Future<String?> getAuthToken() => _read(_keyAuthToken);

  Future<void> saveAuthToken(String token) => _write(_keyAuthToken, token);

  Future<void> deleteAuthToken() => _delete(_keyAuthToken);

  // --- FCM Token ---

  Future<String?> getFcmToken() => _read(_keyFcmToken);

  Future<void> saveFcmToken(String token) => _write(_keyFcmToken, token);

  // --- Generic helpers ---

  Future<String?> _read(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (e) {
      Log.error('SecureStorage read failed for $key: $e');
      return null;
    }
  }

  Future<void> _write(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
    } catch (e) {
      Log.error('SecureStorage write failed for $key: $e');
    }
  }

  Future<void> _delete(String key) async {
    try {
      await _storage.delete(key: key);
    } catch (e) {
      Log.error('SecureStorage delete failed for $key: $e');
    }
  }

  /// Wipe all secure storage (used on logout).
  Future<void> clearAll() async {
    try {
      await _storage.deleteAll();
      Log.info('Secure storage cleared');
    } catch (e) {
      Log.error('SecureStorage clearAll failed: $e');
    }
  }
}
