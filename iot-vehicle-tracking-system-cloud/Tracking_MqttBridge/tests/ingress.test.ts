import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { MqttClient } from 'mqtt';
import { installBridgeIngress } from '../src/mqtt/ingress';

const createFakeClient = (): MqttClient => new EventEmitter() as unknown as MqttClient;
type InboundPacket = Parameters<MqttClient['handleMessage']>[0];
const packet = (qos: 0 | 1, id: number): InboundPacket =>
  ({ qos, messageId: id }) as InboundPacket;

test('QoS1 packet arriving before subscription completion waits for application work', async () => {
  const client = createFakeClient();
  let finishWork!: () => void;
  const work = new Promise<void>((resolve) => { finishWork = resolve; });
  const observed: string[] = [];
  installBridgeIngress(client, async (topic) => {
    observed.push(topic);
    await work;
  });

  const incoming = packet(1, 73);
  client.emit('message', 'v1/A/status', Buffer.from('{}'), incoming);
  let acked = false;
  const ack = new Promise<void>((resolve, reject) =>
    client.handleMessage(incoming, (error?: Error) => {
      if (error) reject(error);
      else { acked = true; resolve(); }
    }),
  );
  await Promise.resolve();
  assert.deepEqual(observed, ['v1/A/status']);
  assert.equal(acked, false);
  finishWork();
  await ack;
  assert.equal(acked, true);
});

test('critical handler rejection propagates to PUBACK gate', async () => {
  const client = createFakeClient();
  installBridgeIngress(client, async () => { throw new Error('database unavailable'); });
  const incoming = packet(1, 74);
  client.emit('message', 'v1/A/events', Buffer.from('{}'), incoming);
  await assert.rejects(
    () => new Promise<void>((resolve, reject) =>
      client.handleMessage(incoming, (error?: Error) => error ? reject(error) : resolve()),
    ),
    /database unavailable/,
  );
});

test('an untracked QoS1 packet is rejected rather than silently acknowledged', async () => {
  const client = createFakeClient();
  installBridgeIngress(client, async () => {});
  await assert.rejects(
    () => new Promise<void>((resolve, reject) =>
      client.handleMessage(packet(1, 75), (error?: Error) => error ? reject(error) : resolve()),
    ),
    /no registered application work/,
  );
});

test('QoS0 remains best effort and failures are observable', async () => {
  const client = createFakeClient();
  const errors: string[] = [];
  installBridgeIngress(client, async () => { throw new Error('metrics offline'); }, {
    onError: (err) => errors.push(String(err)),
  });
  const incoming = packet(0, 76);
  client.emit('message', 'v1/A/rawdata', Buffer.from('{}'), incoming);
  await new Promise<void>((resolve, reject) =>
    client.handleMessage(incoming, (error?: Error) => error ? reject(error) : resolve()),
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(errors.join(' '), /metrics offline/);
});
