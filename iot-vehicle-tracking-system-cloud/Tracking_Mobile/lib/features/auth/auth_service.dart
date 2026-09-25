import 'package:tracking_mobile/core/services/storage_service.dart';

/// Handles token persistence using secure storage.
class AuthService {
  final _storage = StorageService.instance;

  Future<String?> getSavedToken() => _storage.getAuthToken();

  Future<void> saveToken(String token) => _storage.saveAuthToken(token);

  Future<void> clearToken() => _storage.deleteAuthToken();
}
