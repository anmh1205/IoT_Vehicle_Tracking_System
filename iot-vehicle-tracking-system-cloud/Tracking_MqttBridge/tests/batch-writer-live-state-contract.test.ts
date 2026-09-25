import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/services/batch-writer.service.ts', import.meta.url),
  'utf8',
);

const updateStart = source.indexOf('`UPDATE devices');
const updateEnd = source.indexOf('WHERE device_id = $1`', updateStart);
const updateSql = source.slice(updateStart, updateEnd);

test('batch device update gates every live field by watermark and session liveness', () => {
  assert.ok(updateStart >= 0 && updateEnd > updateStart);

  const watermarkGate =
    "to_timestamp($6 / 1000.0) >= COALESCE(last_seen_at, '-infinity'::timestamptz)";
  assert.ok(updateSql.includes(watermarkGate));
  assert.ok(updateSql.includes("WHERE s.id = $7 AND s.status = 'running'"));

  for (const field of [
    'current_status',
    'ignition_state',
    'motion_state',
    'vehicle_state',
    'device_state',
    'sleep_mode',
    'last_latitude',
    'last_longitude',
    'last_speed',
  ]) {
    const fieldStart = updateSql.indexOf(`${field} = CASE`);
    assert.ok(fieldStart >= 0, `${field} must be guarded by CASE`);
    const fieldSlice = updateSql.slice(fieldStart, fieldStart + 900);
    assert.ok(
      fieldSlice.includes(watermarkGate),
      `${field} must check the live-state watermark`,
    );
  }
});

test('batch writer keeps last_seen monotonic even when a live mutation is rejected', () => {
  assert.match(
    updateSql,
    /last_seen_at = GREATEST\([\s\S]*?to_timestamp\(\$6 \/ 1000\.0\)[\s\S]*?\)/,
  );
});
