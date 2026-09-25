import { readFileSync } from 'node:fs';

const listenerSource = readFileSync(
  new URL('./mqtt-event-listener.ts', import.meta.url),
  'utf8',
);
const envSource = readFileSync(
  new URL('../../config/env.ts', import.meta.url),
  'utf8',
);

describe('mqtt internal event listener session contract', () => {
  it('uses a stable client id with a persistent MQTT session', () => {
    expect(listenerSource).toContain('clientId: mqttConfig.listenerClientId');
    expect(listenerSource).toContain('clean: false');
    expect(listenerSource).toContain("subscribe('internal/events/#', { qos: 1 }");
    expect(listenerSource).not.toContain("createMqttClientId('backend-listener')");
    expect(listenerSource).not.toContain('clean: true');
  });

  it('holds QoS1 acknowledgement behind critical application work', () => {
    expect(listenerSource).toContain('client.handleMessage = (packet, callback) => {');
    expect(listenerSource).toContain('const work = pendingMessageWork.get(packet as object)');
    expect(listenerSource).toContain('Promise.all(criticalTasks)');
    expect(listenerSource).toContain('criticalTasks.push(');
    expect(listenerSource).toContain('processCommandAck(envelopePayload, data.timestamp)');
    expect(listenerSource).toContain('handleSessionBoundaryEvent({');
    expect(listenerSource).toContain('alertCrudService.createAlert({');
    expect(listenerSource).toContain('throw error;');
  });

  it('deduplicates rawdata event-log persistence by firmware message identity', () => {
    expect(listenerSource).toContain("'mqtt_bridge_rawdata'");
    expect(listenerSource).toContain('ON CONFLICT DO NOTHING');
  });

  it('provides a stable single-instance default', () => {
    expect(envSource).toContain("fromEnv('MQTT_LISTENER_CLIENT_ID')");
    expect(envSource).toContain("'tracking-backend-listener'");
  });
});
