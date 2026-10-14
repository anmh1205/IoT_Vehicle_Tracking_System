import test from 'node:test';
import assert from 'node:assert/strict';
import type { MqttClient } from 'mqtt';
import { DEVICE_TOPICS } from '../src/constants/topics';
import { subscribeToDeviceTopics } from '../src/mqtt/subscriptions';

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
