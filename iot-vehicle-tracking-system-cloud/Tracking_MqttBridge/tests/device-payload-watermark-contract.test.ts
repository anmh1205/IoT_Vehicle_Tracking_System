import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const raw = readFileSync(new URL('../src/handlers/rawdata.handler.ts', import.meta.url), 'utf8');
const status = readFileSync(new URL('../src/handlers/status.handler.ts', import.meta.url), 'utf8');
const database = readFileSync(new URL('../src/infrastructure/database.ts', import.meta.url), 'utf8');

test('live mutation watermark uses device payload time, not server receive time', () => {
  assert.match(raw, /persistedWatermarkMs = parseIsoTimestampMs\(device\.payload_updated_at\)/);
  assert.match(status, /persistedWatermarkMs = parseIsoTimestampMs\(device\.payload_updated_at\)/);
  assert.doesNotMatch(raw, /persistedWatermarkMs = maxTimestampMs/);
  assert.doesNotMatch(status, /persistedWatermarkMs = maxTimestampMs/);
});

test('accepted live status writes advance the persisted payload watermark', () => {
  assert.match(
    status,
    /updateDeviceStatus\(payload\.device_id, 'running', receivedAtMs, runtimeState, timestampMs\)/,
  );
  assert.match(
    status,
    /updateDeviceStatus\(payload\.device_id, 'stopped', receivedAtMs, runtimeState, timestampMs\)/,
  );
  assert.match(database, /payload_updated_at = CASE/);
});
