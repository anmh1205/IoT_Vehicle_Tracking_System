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
  const transactionStart = source.indexOf('let updateDecision: UpdateDecision');
  const realtime = source.indexOf("publishInternalEvent('firmware'", transactionStart);
  const transaction = source.slice(transactionStart, realtime);

  assert.ok(transactionStart >= 0);
  assert.match(transaction, /await client\.query\('BEGIN'\)/);
  assert.match(
    transaction,
    /SELECT device_id FROM devices WHERE device_id = \$1 FOR UPDATE/,
  );
  assert.match(
    transaction,
    /FROM firmware_update_log[\s\S]*LIMIT 1\s+FOR UPDATE/,
  );
  assert.match(transaction, /await client\.query\('COMMIT'\)/);
  assert.match(transaction, /await client\.query\('ROLLBACK'\)/);
  assert.match(transaction, /finally \{\s*client\.release\(\);\s*\}/);
  assert.ok(realtime > transactionStart);
});

test('successful OTA inventory update shares the lifecycle transaction', () => {
  const transactionStart = source.indexOf('let updateDecision: UpdateDecision');
  const realtime = source.indexOf("publishInternalEvent('firmware'", transactionStart);
  const transaction = source.slice(transactionStart, realtime);
  const successBranch = transaction.indexOf("if (payload.status === 'success')");
  const inventoryUpdate = transaction.indexOf('SET firmware_version = $2', successBranch);
  const finalCommit = transaction.lastIndexOf("await client.query('COMMIT')");

  assert.ok(successBranch >= 0);
  assert.ok(inventoryUpdate > successBranch);
  assert.ok(finalCommit > inventoryUpdate);
});
