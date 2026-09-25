import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/publishers/internal-event.publisher.ts', import.meta.url),
  'utf8',
);

test('critical QoS1 events are not skipped solely because MQTT is reconnecting', () => {
  assert.equal(source.includes('if (!client?.connected)'), false);
  assert.match(source, /if \(!client\.connected && qos === 0\)/);
  assert.match(source, /internal_event_publish_queued/);
  assert.match(source, /client\.publish\(topic/);
});

test('publisher still drops low-value QoS0 events while offline', () => {
  assert.match(source, /reason: 'qos0_offline_drop'/);
});

test('publisher distinguishes an absent client from a transient disconnect', () => {
  assert.match(source, /if \(!client\)/);
  assert.match(source, /reason: 'client_missing'/);
});
