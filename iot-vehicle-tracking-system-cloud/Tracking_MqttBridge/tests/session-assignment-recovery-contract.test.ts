import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/handlers/status.handler.ts', import.meta.url),
  'utf8',
);

test('resolved running session repairs a missing device canonical assignment', () => {
  const marker = "A mid-session reboot can restore the durable local/boot identity";
  const start = source.indexOf(marker);
  assert.ok(start >= 0);
  const block = source.slice(start, start + 1800);
  assert.match(block, /effectiveStatus === 'running'/);
  assert.match(block, /resolvedSessionId !== null/);
  assert.match(block, /payloadCanonicalSessionId === null/);
  assert.match(block, /localSessionKey !== undefined/);
  assert.match(block, /sessionBootId !== undefined/);
  assert.match(block, /publishSessionAssignment\(\{/);
  assert.match(block, /canonicalSessionId: String\(resolvedSessionId\)/);
  assert.match(block, /boundaryEvent !== 'started'/);
});
