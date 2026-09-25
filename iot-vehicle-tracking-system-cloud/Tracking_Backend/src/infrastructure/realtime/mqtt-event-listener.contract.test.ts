import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('./mqtt-event-listener.ts', import.meta.url),
  'utf8',
);

describe('mqtt internal event listener session contract', () => {
  it('uses a persistent MQTT session for critical QoS1 internal events', () => {
    expect(source).toContain("clientId: createMqttClientId('backend-listener')");
    expect(source).toContain('clean: false');
    expect(source).toContain("subscribe('internal/events/#', { qos: 1 }");
    expect(source).not.toContain('clean: true');
  });
});
