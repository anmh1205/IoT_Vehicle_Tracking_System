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
  test('bridge injection checks the actual top-frame origin inside the page', () {
    const nativeApi = 'window.NativeBridge = { isNativeApp: true };';
    final source = trustedBridgeInjectionSource(trusted, nativeApi);
    expect(source, isNotNull);
    expect(source, contains('window.top !== window'));
    expect(source, contains('window.location.origin !== "https://thingdock.dev"'));
    expect(source, contains(nativeApi));
    expect(source, isNot(contains('window.__NATIVE_AUTH_TOKEN__')));

    // Untrusted configuration must fail closed before generating script.
    expect(trustedBridgeInjectionSource('file:///index.html', nativeApi), isNull);
    expect(trustedBridgeInjectionSource('https://user@thingdock.dev', nativeApi), isNull);
    expect(trustedBridgeInjectionSource('javascript:alert(1)', nativeApi), isNull);
  });

  test('native allowlist is an exact Android origin, never a host wildcard', () {
    expect(
      nativeBridgeOriginAllowList(trusted, isAndroid: true),
      <String>{'https://thingdock.dev'},
    );
    expect(
      nativeBridgeOriginAllowList(
        'http://localhost:3002/app', isAndroid: true,
      ),
      <String>{'http://localhost:3002'},
    );
    expect(
      nativeBridgeOriginAllowList('file:///app', isAndroid: true),
      isEmpty,
    );
  });

  test('Apple native origin regex is anchored and escapes host characters', () {
    final patterns = nativeBridgeOriginAllowList(trusted, isAndroid: false);
    expect(patterns, hasLength(1));
    final allow = RegExp(patterns.single);
    expect(allow.hasMatch('https://thingdock.dev'), isTrue);
    for (final origin in <String>[
      'https://thingdock.dev.attacker.test',
      'https://thingdockXdev',
      'https://thingdock.dev@attacker.test',
      'http://thingdock.dev',
      'https://thingdock.dev:444',
      'https://attacker.test/https://thingdock.dev',
    ]) {
      expect(allow.hasMatch(origin), isFalse, reason: origin);
    }
  });

  test('native JavaScript handler allowlist is anchored regex on both platforms', () {
    final patterns = nativeHandlerOriginAllowList(trusted);
    expect(patterns, hasLength(1));
    final allowed = RegExp(patterns.single);
    expect(allowed.hasMatch('https://thingdock.dev'), isTrue);

    // An Android literal bridge origin must not double as an unanchored
    // handler regex; the latter could match spoofed hostname prefixes.
    expect(patterns, isNot(nativeBridgeOriginAllowList(trusted, isAndroid: true)));
    for (final origin in <String>[
      'https://thingdock.dev.evil.example',
      'https://thingdockXdev',
      'https://thingdock.dev@evil.example',
      'https://other.test/https://thingdock.dev',
      'http://thingdock.dev',
      'https://thingdock.dev:444',
      'https://thingdock.dev:443.attacker.example',
      'https://thingdock.dev/path',
    ]) {
      expect(allowed.hasMatch(origin), isFalse, reason: origin);
    }

    final local = nativeHandlerOriginAllowList('http://localhost:3002/app');
    expect(local, hasLength(1));
    final localRule = RegExp(local.single);
    expect(localRule.hasMatch('http://localhost:3002'), isTrue);
    expect(localRule.hasMatch('http://localhost:3003'), isFalse);
    expect(localRule.hasMatch('http://localhostX3002'), isFalse);
    expect(nativeHandlerOriginAllowList('file:///app'), isEmpty);
    expect(nativeHandlerOriginAllowList('https://x@thingdock.dev'), isEmpty);
  });

  test('native callback requires trustworthy origin, frame and request URL', () {
    bool allowed({
      required bool mainFrame,
      required String? origin,
      required String? request,
    }) => isTrustedNativeBridgeCaller(
      isMainFrame: mainFrame,
      origin: origin,
      requestUrl: request,
      appUrl: trusted,
    );

    expect(allowed(mainFrame: true, origin: 'https://thingdock.dev',
      request: 'https://thingdock.dev/app'), isTrue);
    expect(allowed(mainFrame: false, origin: 'https://thingdock.dev',
      request: 'https://thingdock.dev/app'), isFalse);
    expect(allowed(mainFrame: true, origin: 'https://evil.test',
      request: 'https://thingdock.dev/app'), isFalse);
    expect(allowed(mainFrame: true, origin: 'https://thingdock.dev',
      request: 'https://evil.test/frame'), isFalse);
    expect(allowed(mainFrame: true, origin: null,
      request: 'https://thingdock.dev/app'), isFalse);
    expect(allowed(mainFrame: true, origin: 'https://thingdock.dev',
      request: null), isFalse);
  });

}
