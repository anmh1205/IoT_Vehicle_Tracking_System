import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/handlers/firmware.handler.ts', import.meta.url),
  'utf8',
);

test('firmware update resets seq watermark when a new boot is accepted', () => {
  assert.match(source, /resetSequenceWatermark = updateDecision\.reason === 'boot_seq_reset'/);
  assert.match(
    source,
    /WHEN \$14::boolean AND \$11::BIGINT IS NOT NULL THEN \$11::BIGINT/,
  );
  assert.match(
    source,
    /ELSE GREATEST\(COALESCE\(last_seq_no, -1::BIGINT\), \$11::BIGINT\)/,
  );
  assert.match(source, /shouldMarkStarted,\s+resetSequenceWatermark,/);
});

test('firmware lifecycle decision is serialized and committed before realtime publish', () => {
  const begin = source.indexOf("await client.query('BEGIN')");
  const deviceLock = source.indexOf("SELECT device_id FROM devices WHERE device_id = $1 FOR UPDATE");
  const deploymentLock = source.indexOf("LIMIT 1\\n       FOR UPDATE");
  const commit = source.indexOf("await client.query('COMMIT')", deploymentLock);
  const realtime = source.indexOf("publishInternalEvent('firmware'");

  assert.ok(begin >= 0);
  assert.ok(deviceLock > begin);
  assert.ok(deploymentLock > deviceLock);
  assert.ok(commit > deploymentLock);
  assert.ok(realtime > commit);
  assert.match(source, /finally \{\s*client\.release\(\);\s*\}/);
});

test('successful OTA inventory update shares the lifecycle transaction', () => {
  const successBranch = source.indexOf("if (payload.status === 'success')");
  const commit = source.indexOf("await client.query('COMMIT')", successBranch);
  assert.ok(successBranch >= 0);
  assert.ok(source.indexOf('SET firmware_version = $2', successBranch) < commit);
});
