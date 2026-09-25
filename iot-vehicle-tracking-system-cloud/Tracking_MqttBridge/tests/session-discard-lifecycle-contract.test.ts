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

test('discarded lifecycle is still emitted only for newly completed sessions', () => {
  const closeGuards = source.match(/if \(sessionId && completedSession\.completedNow\)/g) ?? [];
  assert.ok(closeGuards.length >= 2);
  assert.match(source, /if \(completedSession\.completedNow\)/);
});
