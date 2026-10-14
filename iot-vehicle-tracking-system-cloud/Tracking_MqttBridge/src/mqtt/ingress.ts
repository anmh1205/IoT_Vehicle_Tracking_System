import type { MqttClient } from 'mqtt';

export interface IngressCallbacks {
  onReceived?: () => void;
  onError?: (error: unknown, topic: string, qos: number, messageId?: number) => void;
}

/**
 * Install ingress synchronously before MQTT connects. A broker may replay
 * persistent-session QoS1 packets as soon as the network connection opens.
 * Application work must exist before MQTT.js invokes handleMessage/PUBACK.
 */
export const installBridgeIngress = (
  client: MqttClient,
  routeMessage: (topic: string, message: Buffer) => Promise<void>,
  callbacks: IngressCallbacks = {},
): void => {
  const pending = new WeakMap<object, Promise<void>>();

  client.handleMessage = (packet, callback) => {
    if (packet.qos === 0) {
      callback();
      return;
    }

    const work = pending.get(packet as object);
    if (!work) {
      callback(new Error('MQTT packet has no registered application work'));
      return;
    }

    void work.then(
      () => {
        pending.delete(packet as object);
        callback();
      },
      (error) => {
        pending.delete(packet as object);
        callback(error instanceof Error ? error : new Error(String(error)));
      },
    );
  };

  client.on('message', (topic, message, packet) => {
    callbacks.onReceived?.();
    const work = Promise.resolve().then(() => routeMessage(topic, message));

    if (packet.qos > 0) {
      pending.set(
        packet as object,
        work.catch((error) => {
          callbacks.onError?.(error, topic, packet.qos, packet.messageId);
          throw error;
        }),
      );
      return;
    }

    void work.catch((error) => callbacks.onError?.(error, topic, packet.qos, packet.messageId));
  });
};
