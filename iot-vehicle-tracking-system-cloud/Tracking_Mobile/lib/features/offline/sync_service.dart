/// IVTS Flutter currently provides cached read-only UI data, not durable
/// offline mutation replay. The previous implementation silently accepted
/// queued API requests and falsely logged successful synchronization.
@Deprecated('Offline mutations are unsupported until durable authenticated replay is implemented')
class SyncService {
  SyncService._();

  static final SyncService instance = SyncService._();

  /// No connectivity listener is registered: there is no queue to flush.
  void start() {}

  void stop() {}

  /// Reject offline mutations explicitly instead of claiming persistence.
  Future<void> enqueue(String key, String jsonPayload) async {
    throw UnsupportedError(
      'Offline mutations are not supported. Reconnect and retry the action online.',
    );
  }
}
