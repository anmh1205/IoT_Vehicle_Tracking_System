vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(),
  },
}));

vi.mock('@/domain/device/repositories/device-command.repository', () => ({
  MAX_OUTSTANDING_DEVICE_COMMANDS: 8,
  createCommand: vi.fn(),
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
import { sendCommand } from './device-command.service';

describe('device-command.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
