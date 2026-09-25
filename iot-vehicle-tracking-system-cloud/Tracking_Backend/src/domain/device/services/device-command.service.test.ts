vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(),
  },
}));

vi.mock('@/domain/device/repositories/device-command.repository', () => ({
  MAX_OUTSTANDING_DEVICE_COMMANDS: 8,
  createCommand: vi.fn(),
  listPendingCommandsBefore: vi.fn(),
  updateCommandStatus: vi.fn(),
  listDeviceCommands: vi.fn(),
}));

vi.mock('@/infrastructure/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/infrastructure/mqtt-client-id.util', () => ({
  createMqttClientId: vi.fn(() => 'test-device-command-client'),
}));

import mqtt from 'mqtt';
import * as deviceCommandRepo from '@/domain/device/repositories/device-command.repository';
import { closeDeviceCommandDispatcher, initDeviceCommandDispatcher, sendCommand } from './device-command.service';

describe('device-command.service', () => {
  beforeEach(async () => {
    await closeDeviceCommandDispatcher();
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  afterEach(async () => {
    await closeDeviceCommandDispatcher();
    vi.useRealTimers();
  });

  it('replays pre-start pending commands with their original command id after MQTT connects', async () => {
    const handlers = new Map<string, (...args: any[]) => void>();
    const client = {
      connected: true,
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        handlers.set(event, handler);
        return client;
      }),
      publish: vi.fn((_topic: string, _message: string, _options: unknown, callback: (err?: Error) => void) => {
        callback();
        return client;
      }),
      end: vi.fn((_force: boolean, _options: unknown, callback: () => void) => callback()),
    } as any;
    vi.mocked(mqtt.connect).mockReturnValue(client);
    vi.mocked(deviceCommandRepo.listPendingCommandsBefore).mockResolvedValue([{
      id: 41,
      deviceId: 'TRACKER_OLD',
      command: 'reboot',
      params: { reason: 'recovery-test' },
      status: 'pending',
      sentAt: null,
      ackedAt: null,
      response: null,
      createdAt: new Date(Date.now() - 30_000).toISOString(),
    }]);
    vi.mocked(deviceCommandRepo.updateCommandStatus).mockResolvedValue(null);

    initDeviceCommandDispatcher();
    handlers.get('connect')?.();
    await vi.waitFor(() => {
      expect(client.publish).toHaveBeenCalledTimes(1);
    });

    const [topic, rawMessage, options] = client.publish.mock.calls[0];
    expect(topic).toBe('v1/TRACKER_OLD/commands');
    expect(JSON.parse(rawMessage)).toEqual({
      command_id: '41',
      command: 'reboot',
      params: { reason: 'recovery-test' },
    });
    expect(options).toMatchObject({
      qos: 1,
      retain: false,
      properties: {
        messageExpiryInterval: expect.any(Number),
      },
    });
    expect(options.properties.messageExpiryInterval).toBeLessThanOrEqual(300);
    expect(options.properties.messageExpiryInterval).toBeGreaterThan(0);
    expect(deviceCommandRepo.updateCommandStatus).toHaveBeenCalledWith(41, 'sent');
  });

  it('does not replay an expired transient command after restart', async () => {
    const handlers = new Map<string, (...args: any[]) => void>();
    const client = {
      connected: true,
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        handlers.set(event, handler);
        return client;
      }),
      publish: vi.fn(),
      end: vi.fn((_force: boolean, _options: unknown, callback: () => void) => callback()),
    } as any;
    vi.mocked(mqtt.connect).mockReturnValue(client);
    vi.mocked(deviceCommandRepo.listPendingCommandsBefore).mockResolvedValue([{
      id: 43,
      deviceId: 'TRACKER_OLD',
      command: 'reboot',
      params: {},
      status: 'pending',
      sentAt: null,
      ackedAt: null,
      response: null,
      createdAt: new Date(Date.now() - 301_000).toISOString(),
    }]);
    vi.mocked(deviceCommandRepo.updateCommandStatus).mockResolvedValue(null);

    initDeviceCommandDispatcher();
    handlers.get('connect')?.();
    await vi.waitFor(() => {
      expect(deviceCommandRepo.updateCommandStatus).toHaveBeenCalledWith(
        43,
        'failed',
        'command_expired_before_dispatch',
      );
    });

    expect(client.publish).not.toHaveBeenCalled();
  });

  it('keeps a recovery row pending when MQTT publish fails', async () => {
    const handlers = new Map<string, (...args: any[]) => void>();
    const client = {
      connected: true,
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        handlers.set(event, handler);
        return client;
      }),
      publish: vi.fn((_topic: string, _message: string, _options: unknown, callback: (err?: Error) => void) => {
        callback(new Error('broker unavailable'));
        return client;
      }),
      end: vi.fn((_force: boolean, _options: unknown, callback: () => void) => callback()),
    } as any;
    vi.mocked(mqtt.connect).mockReturnValue(client);
    vi.mocked(deviceCommandRepo.listPendingCommandsBefore).mockResolvedValue([{
      id: 42,
      deviceId: 'TRACKER_OLD',
      command: 'update_config',
      params: { tracking_interval_s: 10 },
      status: 'pending',
      sentAt: null,
      ackedAt: null,
      response: null,
      createdAt: new Date(Date.now() - 30_000).toISOString(),
    }]);

    initDeviceCommandDispatcher();
    handlers.get('connect')?.();
    await vi.waitFor(() => {
      expect(client.publish).toHaveBeenCalledTimes(1);
    });

    expect(deviceCommandRepo.updateCommandStatus).not.toHaveBeenCalled();
  });

  it('uses MQTT 5 message expiry for a live reboot command', async () => {
    const client = {
      connected: true,
      on: vi.fn(() => client),
      publish: vi.fn((_topic: string, _message: string, _options: unknown, callback: (err?: Error) => void) => {
        callback();
        return client;
      }),
      end: vi.fn((_force: boolean, _options: unknown, callback: () => void) => callback()),
    } as any;
    vi.mocked(mqtt.connect).mockReturnValue(client);
    vi.mocked(deviceCommandRepo.createCommand).mockResolvedValue({
      id: 51,
      deviceId: 'TRACKER_001',
      command: 'reboot',
      params: {},
      status: 'pending',
      sentAt: null,
      ackedAt: null,
      response: null,
    });
    vi.mocked(deviceCommandRepo.updateCommandStatus).mockResolvedValue(null);

    await sendCommand('TRACKER_001', { command: 'reboot' });

    expect(mqtt.connect).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ protocolVersion: 5 }),
    );
    const options = client.publish.mock.calls[0]?.[2];
    expect(options).toMatchObject({
      qos: 1,
      retain: false,
      properties: { messageExpiryInterval: 300 },
    });
  });

  it('keeps desired-state update_config without a short broker expiry', async () => {
    const client = {
      connected: true,
      on: vi.fn(() => client),
      publish: vi.fn((_topic: string, _message: string, _options: unknown, callback: (err?: Error) => void) => {
        callback();
        return client;
      }),
      end: vi.fn((_force: boolean, _options: unknown, callback: () => void) => callback()),
    } as any;
    vi.mocked(mqtt.connect).mockReturnValue(client);
    vi.mocked(deviceCommandRepo.createCommand).mockResolvedValue({
      id: 52,
      deviceId: 'TRACKER_001',
      command: 'update_config',
      params: { tracking_interval_s: 10 },
      status: 'pending',
      sentAt: null,
      ackedAt: null,
      response: null,
    });
    vi.mocked(deviceCommandRepo.updateCommandStatus).mockResolvedValue(null);

    await sendCommand('TRACKER_001', {
      command: 'update_config',
      params: { tracking_interval_s: 10 },
    });

    const options = client.publish.mock.calls[0]?.[2];
    expect(options).toMatchObject({ qos: 1, retain: false });
    expect(options.properties).toBeUndefined();
  });

  it('returns conflict before MQTT publish when per-device command capacity is exhausted', async () => {
    vi.mocked(deviceCommandRepo.createCommand).mockResolvedValue(null);

    await expect(
      sendCommand('TRACKER_001', { command: 'reboot' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      details: { code: 'CONFLICT' },
    });

    expect(mqtt.connect).not.toHaveBeenCalled();
    expect(deviceCommandRepo.updateCommandStatus).not.toHaveBeenCalled();
  });
});
