import test from 'node:test';
import assert from 'node:assert/strict';
import type { MqttClient } from 'mqtt';
import { DEVICE_TOPICS } from '../src/constants/topics';
import { subscribeToDeviceTopics } from '../src/mqtt/subscriptions';

test('subscribeToDeviceTopics subscribes to every device topic with expected QoS', async () => {
  let subscribedTopics: Record<string, { qos: 0 | 1 }> | null = null;

  const client = {
    subscribe(topics: Record<string, { qos: 0 | 1 }>, callback: (error: Error | null) => void) {
      subscribedTopics = topics;
      callback(null);
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
