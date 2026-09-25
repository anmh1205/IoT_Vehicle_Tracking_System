vi.mock('@/infrastructure/database/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { pool } from '@/infrastructure/database/pool';
import { createCommand, updateCommandStatus } from './device-command.repository';

describe('device-command.repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('keeps sent_at null while a command is only pending', async () => {
    vi.mocked(pool.query).mockResolvedValue({
      rows: [{
        id: 11,
        device_id: 'TRACKER_001',
        command: 'reboot',
        params: {},
        status: 'pending',
        sent_at: null,
        acked_at: null,
        response: null,
      }],
    } as any);

    const result = await createCommand({
      deviceId: 'TRACKER_001',
      command: 'reboot',
    });

    const [sql] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).not.toContain("NOW(), $4, $5");
    expect(result.sentAt).toBeNull();
  });

  it('sets sent_at only when publish transitions the command to sent', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await updateCommandStatus(12, 'sent');

    const [sql] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain("WHEN $2::varchar = 'sent' AND sent_at IS NULL THEN NOW()");
  });

  it('stores device acceptance separately from execution acknowledgement', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await updateCommandStatus(12, 'accepted', 'accepted', {
      markAcknowledged: true,
      expectedDeviceId: 'TRACKER_001',
    });

    const [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain('$4::boolean = TRUE');
    expect(params).toEqual([12, 'accepted', 'accepted', true, 'TRACKER_001']);
  });

  it('keeps command lifecycle monotonic when older ACKs are replayed', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await updateCommandStatus(12, 'accepted', 'accepted', {
      markAcknowledged: true,
      expectedDeviceId: 'TRACKER_001',
    });

    const [sql] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain("status IN ('acknowledged', 'failed')");
    expect(sql).toContain("status = 'accepted' AND $2::varchar IN ('pending', 'sent')");
    expect(sql).toContain("status = 'sent' AND $2::varchar = 'pending'");
  });

  it('can mark failed device ACKs as acknowledged without treating publish failures as ACKs', async () => {
    vi.mocked(pool.query).mockResolvedValue({
      rows: [{
        id: 12,
        device_id: 'TRACKER_001',
        command: 'update_config',
        params: {},
        status: 'failed',
        sent_at: new Date('2026-05-04T00:00:00Z'),
        acked_at: new Date('2026-05-04T00:01:00Z'),
        response: 'device rejected command',
      }],
    } as any);

    await updateCommandStatus(12, 'failed', 'device rejected command', {
      markAcknowledged: true,
      expectedDeviceId: 'TRACKER_001',
    });

    const [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];

    expect(sql).toContain('$4::boolean = TRUE');
    expect(sql).toContain('device_id = $5::varchar');
    expect(params).toEqual([12, 'failed', 'device rejected command', true, 'TRACKER_001']);
  });

  it('leaves publish failures unacknowledged by default', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await updateCommandStatus(12, 'failed', 'publish_failed');

    const [, params] = vi.mocked(pool.query).mock.calls[0] ?? [];

    expect(params).toEqual([12, 'failed', 'publish_failed', false, null]);
  });
  it('returns null when an ACK does not match the originating device', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    const result = await updateCommandStatus(12, 'accepted', 'accepted', {
      markAcknowledged: true,
      expectedDeviceId: 'TRACKER_WRONG',
    });

    const [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain('device_id = $5::varchar');
    expect(params).toEqual([12, 'accepted', 'accepted', true, 'TRACKER_WRONG']);
    expect(result).toBeNull();
  });
});
