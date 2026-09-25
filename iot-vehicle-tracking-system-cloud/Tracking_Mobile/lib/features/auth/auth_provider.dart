import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tracking_mobile/features/auth/auth_service.dart';
import 'package:tracking_mobile/core/utils/logger.dart';

/// Riverpod provider for authentication state.
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

class AuthState {
  final String? token;
  final bool isLoading;

  const AuthState({this.token, this.isLoading = false});

  bool get isAuthenticated => token != null;

  AuthState copyWith({String? token, bool? isLoading, bool clearToken = false}) {
    return AuthState(
      token: clearToken ? null : (token ?? this.token),
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState());

  final _authService = AuthService();

  /// Attempt to restore a saved session on app start.
  Future<void> restoreSession() async {
    state = state.copyWith(isLoading: true);
    final token = await _authService.getSavedToken();
    if (token != null) {
      state = AuthState(token: token);
      Log.info('Session restored from secure storage');
    } else {
      state = const AuthState();
      Log.info('No saved session found');
    }
  }

  /// Save token received from the web app via JS bridge.
  Future<void> login(String token) async {
    await _authService.saveToken(token);
    state = AuthState(token: token);
    Log.info('Auth token saved');
  }

  /// Clear only the auth token; keep the installation FCM token for re-registration.
  Future<void> logout() async {
    await _authService.clearToken();
    state = const AuthState();
    Log.info('Logged out, token cleared');
  }
}
