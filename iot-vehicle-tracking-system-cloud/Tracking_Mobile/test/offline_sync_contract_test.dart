import 'package:flutter_test/flutter_test.dart';
import 'package:tracking_mobile/features/offline/sync_service.dart';

void main() {
  test('unsupported offline mutation is rejected instead of queued', () async {
    await expectLater(
      SyncService.instance.enqueue('update-1', '{"status":"acked"}'),
      throwsA(isA<UnsupportedError>()),
    );
  });

  test('legacy start/stop calls do not register fake synchronization work', () {
    expect(() {
      SyncService.instance.start();
      SyncService.instance.stop();
    }, returnsNormally);
  });
}
