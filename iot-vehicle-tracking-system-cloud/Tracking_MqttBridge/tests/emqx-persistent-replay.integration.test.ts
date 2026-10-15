import assert from 'node:assert/strict';
import { test } from 'node:test';
import mqtt, { type MqttClient } from 'mqtt';
import { installBridgeIngress } from '../src/mqtt/ingress';
import { subscribeToDeviceTopics } from '../src/mqtt/subscriptions';

const integrationTest =
  process.env.IVTS_EMQX_INTEGRATION === '1' ? test : test.skip;

const connectionOptions = (clientId: string, clean: boolean) => ({
  clientId,
  clean,
  reconnectPeriod: 0,
  connectTimeout: 10_000,
  keepalive: 15,
});

const connected = (client: MqttClient): Promise<{ sessionPresent: boolean }> =>
  new Promise((resolve, reject) => {
    client.once('connect', (packet) => resolve({ sessionPresent: packet.sessionPresent }));
    client.once('error', reject);
  });

const end = (client: MqttClient | null): Promise<void> =>
  new Promise((resolve) => {
    if (client === null) return resolve();
    client.end(true, {}, resolve);
  });

integrationTest('EMQX replays QoS1 while MQTT Bridge handlers are already registered', {
  timeout: 45_000,
}, async () => {
  const brokerUrl = 'mqtt://127.0.0.1:1883';
  const suffix = process.env.GITHUB_RUN_ID ?? String(process.pid);
  const subscriptionId = `ivts-ci-replay-${suffix}`;
  const deviceId = `IVTS_CI_${suffix}`;
  const topic = `v1/${deviceId}/events`;
  let subscriber: MqttClient | null = null;
  let publisher: MqttClient | null = null;
  let resumed: MqttClient | null = null;

  try {
    subscriber = mqtt.connect(brokerUrl, connectionOptions(subscriptionId, false));
    const first = await connected(subscriber);
    assert.equal(first.sessionPresent, false, 'fresh EMQX broker should not have prior test session');
    await subscribeToDeviceTopics(subscriber);
    // Normal disconnect with clean:false leaves the subscription/session
    // registered at the broker, without any MQTT Bridge process running.
    await new Promise<void>((resolve) => subscriber!.end(false, {}, resolve));
    subscriber = null;

    publisher = mqtt.connect(brokerUrl, connectionOptions(`ivts-ci-pub-${suffix}`, true));
    await connected(publisher);
    await new Promise<void>((resolve, reject) =>
      publisher!.publish(topic, Buffer.from('{"event":"queued_during_disconnect"}'), { qos: 1 }, (error) =>
        error ? reject(error) : resolve(),
      ),
    );
    await end(publisher);
    publisher = null;

    let deliveredTopic: string | null = null;
    let deliveredMessage: string | null = null;
    let complete!: () => void;
    const delivered = new Promise<void>((resolve) => { complete = resolve; });

    resumed = mqtt.connect(brokerUrl, connectionOptions(subscriptionId, false));
    // Install handler before waiting for the MQTT CONNACK. A persisted QoS1
    // packet can arrive immediately after MQTT session resumption.
    installBridgeIngress(resumed, async (receivedTopic, message) => {
      deliveredTopic = receivedTopic;
      deliveredMessage = message.toString('utf8');
      await new Promise((resolve) => setTimeout(resolve, 30));
      complete();
    });
    const resumedSession = await connected(resumed);
    assert.equal(resumedSession.sessionPresent, true, 'broker did not resume the persistent session');

    await Promise.race([
      delivered,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('EMQX did not replay queued QoS1 event')), 12_000),
      ),
    ]);
    assert.equal(deliveredTopic, topic);
    assert.equal(deliveredMessage, '{"event":"queued_during_disconnect"}');
  } finally {
    await Promise.allSettled([end(subscriber), end(publisher), end(resumed)]);
  }
});
