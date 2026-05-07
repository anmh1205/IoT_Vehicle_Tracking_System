import { createMqttClientId } from './mqtt-client-id.util';

describe('mqtt-client-id.util', () => {
  it('creates unique client IDs for same process instance', () => {
    const first = createMqttClientId('backend-listener');
    const second = createMqttClientId('backend-listener');

    expect(first).toMatch(/^backend-listener-[a-zA-Z0-9_-]+-\d+-[a-f0-9]{8}$/);
    expect(second).toMatch(/^backend-listener-[a-zA-Z0-9_-]+-\d+-[a-f0-9]{8}$/);
    expect(first).not.toBe(second);
  });
});
