/// Accept only the configured application's exact HTTP(S) origin.
///
/// Paths, query strings and fragments may vary within the trusted origin.
/// A matching URL prefix is never sufficient: host, scheme and effective port
/// must agree, and embedded userinfo is rejected.
bool isTrustedWebOrigin(String? candidateUrl, String appUrl) {
  if (candidateUrl == null) return false;

  final candidate = Uri.tryParse(candidateUrl);
  final configured = Uri.tryParse(appUrl);
  if (candidate == null || configured == null) return false;

  if (configured.scheme != 'http' && configured.scheme != 'https') {
    return false;
  }
  if (configured.host.isEmpty || configured.userInfo.isNotEmpty) {
    return false;
  }
  if (candidate.scheme != 'http' && candidate.scheme != 'https') {
    return false;
  }
  return candidate.host.isNotEmpty &&
      candidate.userInfo.isEmpty &&
      candidate.scheme == configured.scheme &&
      candidate.host == configured.host &&
      candidate.port == configured.port;
}
