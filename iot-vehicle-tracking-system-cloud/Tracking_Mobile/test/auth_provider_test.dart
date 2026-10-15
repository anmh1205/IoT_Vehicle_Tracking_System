import 'package:flutter_test/flutter_test.dart';
import 'package:tracking_mobile/features/auth/auth_provider.dart';
import 'package:tracking_mobile/features/auth/auth_service.dart';

class FakeAuthService extends AuthService {
  String? savedToken;
  bool failRead = false;
  bool failWrite = false;
  bool failDelete = false;

  @override
  Future<String?> getSavedToken() async {
    if (failRead) throw StateError('read unavailable');
    return savedToken;
  }

  @override
  Future<void> saveToken(String token) async {
    if (failWrite) throw StateError('write unavailable');
    savedToken = token;
  }

  @override
  Future<void> clearToken() async {
    if (failDelete) throw StateError('delete unavailable');
    savedToken = null;
  }
}

void main() {
  test('failed secure-store write does not claim a durable login', () async {
    final storage = FakeAuthService()..failWrite = true;
    final notifier = AuthNotifier(authService: storage);
    addTearDown(notifier.dispose);

    await expectLater(notifier.login('token'), throwsStateError);
    expect(notifier.state.isAuthenticated, isFalse);
    expect(storage.savedToken, isNull);
  });

  test('failed secure-store delete does not falsely claim logout', () async {
    final storage = FakeAuthService();
    final notifier = AuthNotifier(authService: storage);
    addTearDown(notifier.dispose);

    await notifier.login('token');
    storage.failDelete = true;
    await expectLater(notifier.logout(), throwsStateError);
    expect(notifier.state.isAuthenticated, isTrue);
    expect(storage.savedToken, 'token');
  });

  test('failed token restoration clears loading and reports failure', () async {
    final storage = FakeAuthService()..failRead = true;
    final notifier = AuthNotifier(authService: storage);
    addTearDown(notifier.dispose);

    await expectLater(notifier.restoreSession(), throwsStateError);
    expect(notifier.state.isLoading, isFalse);
    expect(notifier.state.isAuthenticated, isFalse);
  });

  test('successful login, restart restoration and logout remain consistent', () async {
    final storage = FakeAuthService();
    final notifier = AuthNotifier(authService: storage);
    addTearDown(notifier.dispose);

    await notifier.login('token');
    expect(notifier.state.isAuthenticated, isTrue);
    expect(storage.savedToken, 'token');

    await notifier.restoreSession();
    expect(notifier.state.token, 'token');

    await notifier.logout();
    expect(notifier.state.isAuthenticated, isFalse);
    expect(storage.savedToken, isNull);
  });
}
