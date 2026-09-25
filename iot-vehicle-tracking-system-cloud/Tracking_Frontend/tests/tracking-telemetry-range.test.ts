import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTrackingTelemetryRange } from '../src/features/devices/hooks/use-device-tracking-telemetry';

test('resolveTrackingTelemetryRange advances the end of rolling periods on each call', () => {
  const firstNow = Date.parse('2026-05-10T16:00:00.000Z');
  const secondNow = Date.parse('2026-05-10T16:01:30.000Z');

  const first = resolveTrackingTelemetryRange('24h', { from: '', to: '' }, firstNow);
  const second = resolveTrackingTelemetryRange('24h', { from: '', to: '' }, secondNow);

  assert.equal(first.to, '2026-05-10T16:00:00.000Z');
  assert.equal(second.to, '2026-05-10T16:01:30.000Z');
  assert.notEqual(first.from, second.from);
});

test('resolveTrackingTelemetryRange keeps explicit custom day boundaries stable', () => {
  const range = resolveTrackingTelemetryRange(
    'custom',
    { from: '2026-05-09', to: '2026-05-10' },
    Date.parse('2026-05-10T16:01:30.000Z'),
  );

  assert.equal(range.from, new Date('2026-05-09T00:00:00.000').toISOString());
  assert.equal(range.to, new Date('2026-05-10T23:59:59.999').toISOString());
});
