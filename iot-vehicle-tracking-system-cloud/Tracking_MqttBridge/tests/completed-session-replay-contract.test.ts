import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const databaseSource = readFileSync(
  new URL('../src/infrastructure/database.ts', import.meta.url),
  'utf8',
);

const touchStart = databaseSource.indexOf('export const touchDeviceSession');
const touchEnd = databaseSource.indexOf('export const completeDeviceSession', touchStart);
const touchSource = databaseSource.slice(touchStart, touchEnd);

test('historical append never moves completed-session boundaries', () => {
  assert.ok(touchStart >= 0 && touchEnd > touchStart);
  assert.equal(touchSource.includes("WHEN $10::boolean AND status = 'completed'"), false);
  assert.equal(touchSource.includes('THEN GREATEST(COALESCE(server_session_end'), false);
  assert.equal(touchSource.includes('THEN GREATEST(COALESCE(session_end'), false);
});

test('historical append never recomputes completed-session runtime from replay receive time', () => {
  assert.match(touchSource, /uptime = CASE\s+WHEN status = 'running' THEN GREATEST/);
  assert.match(
    touchSource,
    /total_runtime_seconds = CASE\s+WHEN status = 'running' THEN GREATEST/,
  );
  assert.match(touchSource, /ELSE uptime\s+END/);
  assert.match(touchSource, /ELSE total_runtime_seconds\s+END/);
});
