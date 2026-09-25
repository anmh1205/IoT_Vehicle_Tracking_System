vi.mock('@/infrastructure/database/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { pool } from '@/infrastructure/database/pool';
import { updateCommandStatus } from './device-command.repository';

describe('device-command.repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

    const result = await updateCommandStatus(12, 'acknowledged', 'accepted', {
      markAcknowledged: true,
      expectedDeviceId: 'TRACKER_WRONG',
    });

    const [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain('device_id = $5::varchar');
    expect(params).toEqual([12, 'acknowledged', 'accepted', true, 'TRACKER_WRONG']);
    expect(result).toBeNull();
  });
});
