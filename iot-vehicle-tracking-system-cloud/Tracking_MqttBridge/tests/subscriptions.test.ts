import test from 'node:test';
import assert from 'node:assert/strict';
import type { MqttClient } from 'mqtt';
import { EventEmitter } from 'node:events';
import { DEVICE_TOPICS } from '../src/constants/topics';
import { subscribeToDeviceTopics, trackDeviceSubscriptions } from '../src/mqtt/subscriptions';

test('subscribeToDeviceTopics subscribes to every device topic with expected QoS', async () => {
  let subscribedTopics: Record<string, { qos: 0 | 1 }> | null = null;

  const client = {
    subscribe(topics: Record<string, { qos: 0 | 1 }>, callback: (error: Error | null, grants: unknown[]) => void) {
      subscribedTopics = topics;
      callback(null, Object.entries(topics).map(([topic, { qos }]) => ({ topic, qos })));
      return this;
    },
  } as unknown as MqttClient;

  await subscribeToDeviceTopics(client);

  assert.deepEqual(subscribedTopics, {
    [DEVICE_TOPICS.RAW_DATA]: { qos: 0 },
    [DEVICE_TOPICS.STATUS]: { qos: 1 },
    [DEVICE_TOPICS.EVENTS]: { qos: 1 },
    [DEVICE_TOPICS.FIRMWARE]: { qos: 1 },
    [DEVICE_TOPICS.COMMAND_ACK]: { qos: 1 },
  });
});


test('SUBACK denying a critical topic does not report subscriptions ready', async () => {
  const client = {
    subscribe(topics: Record<string, { qos: 0 | 1 }>, callback: (error: Error | null, grants: unknown[]) => void) {
      callback(null, Object.entries(topics).map(([topic, { qos }]) => ({
        topic,
        qos: topic === DEVICE_TOPICS.FIRMWARE ? 128 : qos,
      })));
      return this;
    },
  } as unknown as MqttClient;

  await assert.rejects(() => subscribeToDeviceTopics(client), /MQTT subscribe not granted/);
});

test('a QoS1 topic downgraded to QoS0 is not accepted', async () => {
  const client = {
    subscribe(topics: Record<string, { qos: 0 | 1 }>, callback: (error: Error | null, grants: unknown[]) => void) {
      callback(null, Object.entries(topics).map(([topic, { qos }]) => ({
        topic,
        qos: topic === DEVICE_TOPICS.COMMAND_ACK ? 0 : qos,
      })));
      return this;
    },
  } as unknown as MqttClient;

  await assert.rejects(() => subscribeToDeviceTopics(client), /requested=1 granted=0/);
});

test('missing SUBACK grants are treated as a startup failure', async () => {
  const client = {
    subscribe(_topics: unknown, callback: (error: Error | null, grants: unknown[]) => void) {
      callback(null, []);
      return this;
    },
  } as unknown as MqttClient;

  await assert.rejects(() => subscribeToDeviceTopics(client), /granted=missing/);
});


const createControllableMqttClient = () => {
  type Grant = { topic: string; qos: number };
  const pending: Array<{ reply: (error: Error | null, grants: Grant[]) => void; grants: Grant[] }> = [];
  const emitter = Object.assign(new EventEmitter(), {
    subscribe(
      topics: Record<string, { qos: 0 | 1 }>,
      reply: (error: Error | null, grants: Grant[]) => void,
    ) {
      pending.push({
        reply,
        grants: Object.entries(topics).map(([topic, { qos }]) => ({ topic, qos })),
      });
      return this;
    },
  });
  return { emitter, pending, client: emitter as unknown as MqttClient };
};

test('reconnect invalidates healthy state until a fresh valid SUBACK', async () => {
  const { emitter, pending, client } = createControllableMqttClient();
  const history: Array<{ ready: boolean; error?: string }> = [];
  const initial = trackDeviceSubscriptions(client, (ready, error) => {
    history.push({ ready, error: error?.message });
  });

  emitter.emit('connect');
  pending[0].reply(null, pending[0].grants);
  await initial;
  assert.equal(history.at(-1)?.ready, true);

  emitter.emit('close');
  assert.equal(history.at(-1)?.ready, false);
  emitter.emit('connect');
  assert.equal(history.at(-1)?.ready, false);
  pending[1].reply(null, pending[1].grants.map((grant) =>
    grant.topic === DEVICE_TOPICS.EVENTS ? { ...grant, qos: 128 } : grant,
  ));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(history.at(-1)?.ready, false);
  assert.match(history.at(-1)?.error ?? '', /MQTT subscribe not granted/);

  emitter.emit('close');
  emitter.emit('connect');
  pending[2].reply(null, pending[2].grants);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(history.at(-1)?.ready, true);
  assert.equal(history.at(-1)?.error, undefined);
});

test('late SUBACK from disconnected socket cannot mark bridge ready', async () => {
  const { emitter, pending, client } = createControllableMqttClient();
  const readyStates: boolean[] = [];
  const initial = trackDeviceSubscriptions(client, (ready) => readyStates.push(ready));

  emitter.emit('connect');
  emitter.emit('close');
  emitter.emit('connect');
  pending[0].reply(null, pending[0].grants);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(readyStates.at(-1), false);

  pending[1].reply(null, pending[1].grants);
  await initial;
  assert.equal(readyStates.at(-1), true);
});
