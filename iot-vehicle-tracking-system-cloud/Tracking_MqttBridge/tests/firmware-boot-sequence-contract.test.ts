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
