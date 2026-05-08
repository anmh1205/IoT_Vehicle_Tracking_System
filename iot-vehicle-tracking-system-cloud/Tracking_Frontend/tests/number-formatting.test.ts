import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, roundNumber } from '../src/lib/utils/date/format';
import {
  pickLatestTelemetryTimestamp,
  pickLatestTelemetryValue,
} from '../src/features/devices/components/device-detail-modal/device-detail-presenters';

test('formatNumber keeps at most 2 fraction digits by default', () => {
  assert.equal(formatNumber(12), '12');
  assert.equal(formatNumber(12.3), '12,3');
  assert.equal(formatNumber(12.3456), '12,35');
});

test('formatNumber respects custom precision overrides', () => {
  assert.equal(formatNumber(12.9, { maximumFractionDigits: 0 }), '13');
  assert.equal(formatNumber(12, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '12,00');
});

test('roundNumber keeps numeric values aligned with UI precision', () => {
  assert.equal(roundNumber(12.3456), 12.35);
  assert.equal(roundNumber(12.3456, 1), 12.3);
});

test('pickLatestTelemetryValue prefers the newer snapshot value', () => {
  assert.equal(
    pickLatestTelemetryValue(10, '2026-05-08T10:00:00.000Z', 20, '2026-05-08T10:01:00.000Z'),
    20,
  );
});

test('pickLatestTelemetryValue keeps telemetry value when it is newer', () => {
  assert.equal(
    pickLatestTelemetryValue(15, '2026-05-08T10:02:00.000Z', 12, '2026-05-08T10:01:00.000Z'),
    15,
  );
});

test('pickLatestTelemetryTimestamp prefers the newest timestamp source', () => {
  assert.equal(
    pickLatestTelemetryTimestamp(
      '2026-05-08T10:00:00.000Z',
      '2026-05-08T10:01:00.000Z',
      '2026-05-08T09:59:00.000Z',
    ),
    '2026-05-08T10:01:00.000Z',
  );
});
