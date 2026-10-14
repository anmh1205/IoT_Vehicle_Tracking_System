import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/handlers/status.handler.ts', import.meta.url),
  'utf8',
);

test('all completed session close paths can publish discarded lifecycle events', () => {
  assert.equal(
    source.includes('completedSession.completedNow && !completedSession.discarded'),
    false,
  );

  const actionMatches =
    source.match(/action: completedSession\.discarded \? 'discarded' : 'ended'/g) ?? [];

  assert.ok(actionMatches.length >= 3);
});

test('discarded lifecycle is emitted only on new completion; ended may replay', () => {
  const closeGuards = source.match(
    /if \(sessionId && \(completedSession\.completedNow \|\| !completedSession\.discarded\)\)/g,
  ) ?? [];
  assert.ok(closeGuards.length >= 2);
});
