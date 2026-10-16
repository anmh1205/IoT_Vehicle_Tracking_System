import 'package:flutter_test/flutter_test.dart';
import 'package:tracking_mobile/core/config/app_config.dart';

void main() {
  test('secure HTTPS and WSS URLs require a real authority', () {
    expect(isApprovedProductionUrl('https://app.example.com/dashboard', secureScheme: 'https'), isTrue);
    expect(isApprovedProductionUrl('wss://api.example.com/socket', secureScheme: 'wss'), isTrue);
    expect(isApprovedProductionUrl('https://', secureScheme: 'https'), isFalse);
    expect(isApprovedProductionUrl('https://user@site.test', secureScheme: 'https'), isFalse);
  });

  test('insecure transports are restricted to exact loopback hosts', () {
    for (final origin in [
      'http://localhost:3002/',
      'http://127.0.0.1:4000/api',
      'ws://localhost:5000/socket',
      'ws://127.0.0.1:5000/socket',
    ]) {
      expect(isApprovedProductionUrl(origin, secureScheme: origin.startsWith('ws:') ? 'wss' : 'https'),
          isTrue, reason: origin);
    }
    for (final origin in [
      'http://example.com/localhost',
      'http://localhost.attacker.test',
      'http://localhost@attacker.test',
      'http://127.0.0.1.attacker.test',
      'http://attacker.test/?next=127.0.0.1',
      'ws://attacker.test/localhost',
      'data:text/html,localhost',
    ]) {
      expect(isApprovedProductionUrl(origin, secureScheme: origin.startsWith('ws:') ? 'wss' : 'https'),
          isFalse, reason: origin);
    }
  });
}
