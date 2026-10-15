import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const database = readFileSync(new URL('../src/infrastructure/database.ts', import.meta.url), 'utf8');
const batchWriter = readFileSync(new URL('../src/services/batch-writer.service.ts', import.meta.url), 'utf8');
const touch = database.slice(
  database.indexOf('export const touchDeviceSession'),
  database.indexOf('export const completeDeviceSession'),
);

test('both active and legacy telemetry aggregate paths gate last session position by event time', () => {
  const guards = touch.match(
    /WHEN status = 'running' AND \$2::timestamptz >= COALESCE\(last_update, '-infinity'::timestamptz\)/g,
  ) ?? [];
  assert.equal(guards.length, 6);
  for (const field of ['last_latitude', 'last_longitude', 'last_speed']) {
    const updates = touch.match(new RegExp(field + ' = CASE', 'g')) ?? [];
    assert.equal(updates.length, 2);
  }
  assert.match(touch, /WHERE id = \$1 AND device_id = \$9 AND \$\{sessionStatusPredicate\}/);
});

test('deferred batches cannot mutate completed, cross-device or stale sessions', () => {
  const begin = batchWriter.indexOf('UPDATE device_sessions');
  assert.ok(begin >= 0);
  const statement = batchWriter.slice(begin, batchWriter.indexOf(');', begin));
  assert.match(statement, /WHERE id = \$1/);
  assert.match(statement, /AND device_id = \$5/);
  assert.match(statement, /AND status = 'running'/);
  assert.match(statement, /to_timestamp\(\$6 \/ 1000\.0\) >= COALESCE\(last_update, '-infinity'::timestamptz\)/);
  assert.match(statement, /update\.deviceId/);
  assert.match(statement, /update\.payloadTimestamp/);
});
