import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexSource = readFileSync(
  new URL('../src/index.ts', import.meta.url),
  'utf8',
);
const publisherSource = readFileSync(
  new URL('../src/publishers/internal-event.publisher.ts', import.meta.url),
  'utf8',
);
const statusSource = readFileSync(
  new URL('../src/handlers/status.handler.ts', import.meta.url),
  'utf8',
);
const eventSource = readFileSync(
  new URL('../src/handlers/event.handler.ts', import.meta.url),
  'utf8',
);
const firmwareSource = readFileSync(
  new URL('../src/handlers/firmware.handler.ts', import.meta.url),
  'utf8',
);
const authSource = readFileSync(
  new URL('../src/services/device-auth.service.ts', import.meta.url),
  'utf8',
);
const victoriaLogsSource = readFileSync(
  new URL('../src/infrastructure/victorialogs.ts', import.meta.url),
  'utf8',
);

test('device QoS1 PUBACK waits for registered application work', () => {
  assert.match(indexSource, /const pendingMessageWork = new WeakMap/);
  assert.match(indexSource, /client\.handleMessage = \(packet, callback\) =>/);
  assert.match(indexSource, /pendingMessageWork\.get\(packet as object\)/);
  assert.match(indexSource, /packet\.qos === 1/);
  assert.match(indexSource, /pendingMessageWork\.set\(packet as object, trackedWork\)/);
  assert.match(indexSource, /\(error\) => callback\(error instanceof Error/);
});

test('critical device routes are awaited instead of fire-and-forget', () => {
  assert.match(indexSource, /await handleStatus\(deviceId, message\)/);
  assert.match(indexSource, /await handleEvent\(deviceId, message\)/);
  assert.match(indexSource, /await handleFirmware\(deviceId, message\)/);
  assert.match(indexSource, /await handleCommandAck\(deviceId, message\)/);
  assert.match(indexSource, /await publishInternalEventDurable\('command'/);
});

test('critical internal forwarding exposes MQTT completion to handlers', () => {
  assert.match(publisherSource, /export const publishInternalEventDurable/);
  assert.match(publisherSource, /return new Promise<void>/);
  assert.match(publisherSource, /client\.publish\(topic, JSON\.stringify\(envelope\), \{ qos \}, \(err\) =>/);
  assert.match(statusSource, /await publishInternalEventDurable\('status'/);
  assert.match(statusSource, /await publishInternalEventDurable\('session'/);
  assert.match(eventSource, /await publishInternalEventDurable\('alert'/);
  assert.match(firmwareSource, /await publishInternalEventDurable\('firmware'/);
});

test('transient dependency failures propagate instead of becoming successful QoS1 handling', () => {
  assert.match(authSource, /device_auth_verification_failed[\s\S]*throw err/);
  assert.match(victoriaLogsSource, /victorialogs_write_failed[\s\S]*throw err/);
  assert.match(victoriaLogsSource, /victorialogs_write_rejected[\s\S]*throw err/);
  assert.match(firmwareSource, /firmware_status_log_failed[\s\S]*throw err/);
});

test('firmware redelivery re-forwards a packet already committed before downstream failure', () => {
  assert.match(
    firmwareSource,
    /updateDecision\.reason === 'duplicate_message_id'[\s\S]*await publishInternalEventDurable\('firmware'/,
  );
});
