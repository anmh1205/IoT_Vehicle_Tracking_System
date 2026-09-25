import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAlertQueueHref } from '../src/features/alerts/lib/alert-queue-route';

test('buildAlertQueueHref scopes device queue to active alerts by default', () => {
  assert.equal(
    buildAlertQueueHref({ deviceId: ' THINGDOCK-01 ', vehicleId: 'VH-01' }),
    '/dashboard/attention/queue?status=active&deviceId=THINGDOCK-01',
  );
});

test('buildAlertQueueHref falls back to vehicle scope when device is missing', () => {
  assert.equal(
    buildAlertQueueHref({ vehicleId: 'VH-01', status: null }),
    '/dashboard/attention/queue?vehicleId=VH-01',
  );
});

test('buildAlertQueueHref can include source filter for explicit queue views', () => {
  assert.equal(
    buildAlertQueueHref({ deviceId: 'DEV-01', source: 'obd' }),
    '/dashboard/attention/queue?status=active&deviceId=DEV-01&source=obd',
  );
});
