vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock('@/domain/firmware/repositories/firmware.repository', () => ({
  findById: vi.fn(),
  findByVersion: vi.fn(),
  findExistingDeviceIds: vi.fn(),
  createDeployments: vi.fn(),
  markDeploymentCommandDispatched: vi.fn(),
  markDeploymentDispatchFailed: vi.fn(),
  setDeviceTargetFirmwareVersion: vi.fn(),
  findActiveDeploymentsByDeviceAndTargetVersion: vi.fn(),
}));

vi.mock('@/domain/device/services/device-command.service', () => ({
  sendCommand: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  appConfig: { nodeEnv: 'test' },
  firmwareConfig: {
    publicBaseUrl: 'https://tracker.example/',
    assignedTimeoutSec: 300,
    inProgressTimeoutSec: 900,
  },
}));

vi.mock('@/infrastructure/realtime', () => ({
  publishEvent: vi.fn(),
}));

vi.mock('@/infrastructure/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import * as fs from 'node:fs';
import * as firmwareRepo from '@/domain/firmware/repositories/firmware.repository';
import * as deviceCommandService from '@/domain/device/services/device-command.service';
import { publishEvent } from '@/infrastructure/realtime';
import { deployFirmwareToDevice } from './firmware-deploy.service';

const firmware = {
  id: 7,
  version: '1.2.3',
  filename: 'tracker.bin',
  file_path: '/firmware/tracker.bin',
  size: 1024,
  sha256: 'a'.repeat(64),
  description: null,
  is_active: true,
  created_at: new Date('2026-09-25T00:00:00.000Z'),
  updated_at: new Date('2026-09-25T00:00:00.000Z'),
};

const deployment = {
  id: 91,
  job_id: 'ota_canonical_91',
  firmware_id: 7,
  device_id: 'TRACKER_001',
  status: 'assigned',
  progress: 0,
  target_version: '1.2.3',
  current_version: null,
  partition: null,
  started_at: null,
  completed_at: null,
  error_message: null,
  status_reason_code: null,
  first_assigned_at: new Date(),
  command_dispatched_at: null,
  last_seen_at: new Date(),
  last_message_id: null,
  last_seq_no: null,
  last_boot_id: null,
  confirm_timeout_sec: 240,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('firmware direct OTA deployment', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({
      isFile: () => true,
      size: 1024,
    } as ReturnType<typeof fs.statSync>);
    vi.mocked(firmwareRepo.findById).mockResolvedValue(firmware);
    vi.mocked(firmwareRepo.findExistingDeviceIds).mockResolvedValue(new Set(['TRACKER_001']));
    vi.mocked(firmwareRepo.createDeployments).mockResolvedValue([deployment]);
    vi.mocked(firmwareRepo.markDeploymentCommandDispatched).mockResolvedValue();
    vi.mocked(firmwareRepo.markDeploymentDispatchFailed).mockResolvedValue();
    vi.mocked(firmwareRepo.setDeviceTargetFirmwareVersion).mockResolvedValue();
  });

  it('creates canonical deployment before dispatch and reuses its job id', async () => {
    vi.mocked(deviceCommandService.sendCommand).mockResolvedValue({ id: 44 } as any);

    const result = await deployFirmwareToDevice(7, 'TRACKER_001', {
      force: true,
      confirmTimeoutSec: 240,
      actorUserId: 5,
      correlationId: 'corr-ota-1',
    });

    expect(firmwareRepo.createDeployments).toHaveBeenCalledWith(
      7,
      ['TRACKER_001'],
      '1.2.3',
      240,
    );
    expect(deviceCommandService.sendCommand).toHaveBeenCalledWith(
      'TRACKER_001',
      {
        command: 'ota_update',
        params: expect.objectContaining({
          jobId: 'ota_canonical_91',
          version: '1.2.3',
          size: 1024,
          sha256: 'a'.repeat(64),
          force: true,
          confirmTimeoutSec: 240,
        }),
      },
      { actorUserId: 5, correlationId: 'corr-ota-1' },
    );

    expect(
      vi.mocked(firmwareRepo.createDeployments).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(deviceCommandService.sendCommand).mock.invocationCallOrder[0],
    );
    expect(firmwareRepo.markDeploymentCommandDispatched).toHaveBeenCalledWith(91);
    expect(firmwareRepo.setDeviceTargetFirmwareVersion).toHaveBeenCalledWith(
      ['TRACKER_001'],
      '1.2.3',
    );
    expect(publishEvent).toHaveBeenCalledWith('firmware:assignment', {
      firmware_id: 7,
      device_ids: ['TRACKER_001'],
      status: 'assigned',
    });
    expect(result).toEqual({
      jobId: 'ota_canonical_91',
      status: 'assigned',
      targetVersion: '1.2.3',
      commandId: 44,
    });
  });

  it('marks only the canonical deployment failed when MQTT dispatch fails', async () => {
    vi.mocked(deviceCommandService.sendCommand).mockRejectedValue(
      new Error('mqtt unavailable'),
    );

    await expect(
      deployFirmwareToDevice(7, 'TRACKER_001', {
        confirmTimeoutSec: 240,
      }),
    ).rejects.toThrow('mqtt unavailable');

    expect(firmwareRepo.markDeploymentDispatchFailed).toHaveBeenCalledWith(
      91,
      'dispatch_failed',
      'mqtt unavailable',
    );
    expect(firmwareRepo.markDeploymentCommandDispatched).not.toHaveBeenCalled();
    expect(firmwareRepo.setDeviceTargetFirmwareVersion).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });
});
