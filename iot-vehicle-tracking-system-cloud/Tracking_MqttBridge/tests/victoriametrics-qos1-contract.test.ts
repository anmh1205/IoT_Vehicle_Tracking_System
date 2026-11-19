import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const handler = readFileSync(new URL('../src/handlers/rawdata.handler.ts', import.meta.url), 'utf8');
const writer = readFileSync(new URL('../src/infrastructure/victoriametrics.ts', import.meta.url), 'utf8');
const ingress = readFileSync(new URL('../src/mqtt/ingress.ts', import.meta.url), 'utf8');

test('replayed QoS1 telemetry defers PUBACK until VictoriaMetrics confirms the import', () => {
  assert.match(handler, /await writeDeviceTelemetry\(payload\.device_id, metricsData, timestampMs\)/);
  const writeBatch = writer.slice(writer.indexOf('export const writeDeviceTelemetry'));
  assert.match(writeBatch, /if \(!response\.ok\) \{[\s\S]*throw new Error/);
  assert.match(writeBatch, /catch \(err\) \{[\s\S]*throw err/);
  assert.match(ingress, /callback\(error instanceof Error/);
});
