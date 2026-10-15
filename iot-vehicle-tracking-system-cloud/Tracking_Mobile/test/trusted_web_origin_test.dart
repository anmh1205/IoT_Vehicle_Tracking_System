import 'package:flutter_test/flutter_test.dart';
import 'package:tracking_mobile/features/webview/trusted_web_origin.dart';

void main() {
  const trusted = 'https://thingdock.dev/app';

  test('accepts exact origin with routes, query, fragments and case changes', () {
    expect(isTrustedWebOrigin('https://thingdock.dev/', trusted), isTrue);
    expect(
      isTrustedWebOrigin('https://thingdock.dev:443/dashboard?tab=1#alerts', trusted),
      isTrue,
    );
    expect(isTrustedWebOrigin('https://THINGDOCK.DEV/app', trusted), isTrue);
  });

  test('rejects deceptive hosts and userinfo', () {
    for (final url in [
      'https://thingdock.dev.evil.test/app',
      'https://thingdock.dev@evil.test/',
      'https://evil.test/?next=https://thingdock.dev',
      'https://thingdock.dev./',
      'https://another-thingdock.dev/',
    ]) {
      expect(isTrustedWebOrigin(url, trusted), isFalse, reason: url);
    }
  });

  test('compares the parsed authority rather than URL text', () {
    expect(
      isTrustedWebOrigin(
        'https://thingdock.dev/dashboard?redirect=https://evil.test/',
        trusted,
      ),
      isTrue,
    );
    expect(
      isTrustedWebOrigin(
        'https://evil.test/dashboard?redirect=https://thingdock.dev/',
        trusted,
      ),
      isFalse,
    );
    expect(
      isTrustedWebOrigin(
        'https://thingdock.dev:443@evil.test/dashboard',
        trusted,
      ),
      isFalse,
    );
  });

  test('rejects scheme and non-equivalent port changes', () {
    for (final url in [
      'http://thingdock.dev/',
      'https://thingdock.dev:444/',
      'http://thingdock.dev:443/',
      'javascript:alert(1)',
      'about:blank',
      'data:text/html,hello',
      'file:///index.html',
    ]) {
      expect(isTrustedWebOrigin(url, trusted), isFalse, reason: url);
    }
  });

  test('uses exact configured development origin', () {
    const development = 'http://localhost:3002/app';
    expect(isTrustedWebOrigin('http://localhost:3002/login', development), isTrue);
    expect(isTrustedWebOrigin('http://localhost:3003/login', development), isFalse);
    expect(isTrustedWebOrigin('https://localhost:3002/login', development), isFalse);
  });

  test('fails closed on malformed and untrusted configuration', () {
    expect(isTrustedWebOrigin(null, trusted), isFalse);
    expect(isTrustedWebOrigin('%%%invalid', trusted), isFalse);
    expect(isTrustedWebOrigin('https://thingdock.dev/', 'file:///app'), isFalse);
    expect(isTrustedWebOrigin('https://thingdock.dev/', 'https://u@thingdock.dev'), isFalse);
  });
}
