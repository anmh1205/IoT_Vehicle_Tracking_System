import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/handlers/rawdata.handler.ts', import.meta.url),
  'utf8',
);

const start = source.indexOf('const normalizeGnssLocation');
const end = source.indexOf('const isLikelyActiveSessionTelemetry', start);
const normalizeSource = source.slice(start, end);

test('explicit GNSS fix loss invalidates non-zero cached coordinates', () => {
  assert.ok(start >= 0 && end > start);
  assert.match(normalizeSource, /if \(fixValid === false\)/);
  assert.match(
    normalizeSource,
    /fixValid === false[\s\S]*latitude: undefined,[\s\S]*longitude: undefined,[\s\S]*speedAllowed: false/,
  );
});

test('legacy payload fallback still keeps zero-axis coordinates distinguishable from no-fix 0,0', () => {
  assert.match(
    normalizeSource,
    /latitude === 0[\s\S]*longitude === 0[\s\S]*fixValid !== true[\s\S]*satellites/,
  );
});
