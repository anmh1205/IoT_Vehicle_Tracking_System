import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexSource = readFileSync(
  new URL('../src/index.ts', import.meta.url),
  'utf8',
);
const ingressSource = readFileSync(
  new URL('../src/mqtt/ingress.ts', import.meta.url),
  'utf8',
);
const clientSource = readFileSync(
  new URL('../src/mqtt/client.ts', import.meta.url),
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

test('device QoS1 PUBACK waits for application work installed before connect', () => {
  assert.match(ingressSource, /client\.handleMessage = \(packet, callback\) =>/);
  assert.match(ingressSource, /pending\.get\(packet as object\)/);
  assert.match(ingressSource, /pending\.set\(/);
  assert.match(ingressSource, /packet\.qos > 0/);
  assert.match(clientSource, /onClientCreated\?\.\(client\)/);
  const registration = indexSource.indexOf('installBridgeIngress(createdClient');
  const subscription = indexSource.indexOf('initialSubscriptions.ready = trackDeviceSubscriptions(createdClient');
  const initialReady = indexSource.indexOf('await initialSubscriptions.ready');
  assert.ok(registration > 0 && subscription > registration && initialReady > subscription);
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
