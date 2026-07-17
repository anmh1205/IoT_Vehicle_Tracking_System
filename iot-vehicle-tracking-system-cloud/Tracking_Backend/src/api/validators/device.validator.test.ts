import { sendDeviceCommandSchema } from './device.validator';

describe('device.validator', () => {
  it('accepts supported update_config params', () => {
    const parsed = sendDeviceCommandSchema.parse({
      command: 'update_config',
      params: {
        tracking_interval_s: 60,
        heartbeat_interval_s: 120,
        sleep_enabled: true,
      },
    });

    expect(parsed.command).toBe('update_config');
    expect(parsed.params).toMatchObject({
      tracking_interval_s: 60,
      heartbeat_interval_s: 120,
      sleep_enabled: true,
    });
  });

  it('rejects unsupported update_config params', () => {
    const result = sendDeviceCommandSchema.safeParse({
      command: 'update_config',
      params: {
        parking_interval_s: 300,
        overspeed_kph: 80,
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.flatten().fieldErrors).toMatchObject({
      params: [expect.stringContaining('parking_interval_s')],
    });
    expect(result.error.flatten().fieldErrors.params?.[0]).toContain('overspeed_kph');
  });
});
