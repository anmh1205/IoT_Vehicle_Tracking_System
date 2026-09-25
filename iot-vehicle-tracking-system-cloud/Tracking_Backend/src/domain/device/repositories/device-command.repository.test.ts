vi.mock('@/infrastructure/database/pool', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

import { pool } from '@/infrastructure/database/pool';
import {
  createCommand,
  observeRuntimeBootAndMarkStaleAcceptedIndeterminate,
  listPendingCommandsBefore,
  updateCommandStatus,
} from './device-command.repository';

describe('device-command.repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('serializes admission and keeps sent_at null while a command is only pending', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ device_id: 'TRACKER_001' }] }) // row lock
      .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // outstanding count
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const release = vi.fn();
    vi.mocked(pool.connect).mockResolvedValue({ query, release } as any);

    const result = await createCommand({
      deviceId: 'TRACKER_001',
      command: 'reboot',
    });

    expect(query.mock.calls[1]?.[0]).toContain('FOR UPDATE');
    expect(query.mock.calls[2]?.[0]).toContain("status IN ('pending', 'sent', 'accepted')");
    expect(query.mock.calls[3]?.[0]).not.toContain("NOW(), $4, $5");
    expect(result?.sentAt).toBeNull();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rejects admission when the per-device non-terminal command cap is reached', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ device_id: 'TRACKER_001' }] })
      .mockResolvedValueOnce({ rows: [{ total: 8 }] })
      .mockResolvedValueOnce({ rows: [] });
    const release = vi.fn();
    vi.mocked(pool.connect).mockResolvedValue({ query, release } as any);

    const result = await createCommand({
      deviceId: 'TRACKER_001',
      command: 'reboot',
    });

    expect(result).toBeNull();
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO device_commands'))).toBe(false);
    expect(query.mock.calls.some(([sql]) => sql === 'ROLLBACK')).toBe(true);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('lists only durable pending commands older than the current process cutoff', async () => {
    vi.mocked(pool.query).mockResolvedValue({
      rows: [{
        id: 21,
        device_id: 'TRACKER_001',
        command: 'reboot',
        params: {},
        status: 'pending',
        sent_at: null,
        acked_at: null,
        response: null,
      }],
    } as any);

    const cutoff = new Date('2026-09-25T22:30:00.000Z');
    const rows = await listPendingCommandsBefore(cutoff, 25);

    const [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain("WHERE status = 'pending'");
    expect(sql).toContain('created_at < $1');
    expect(sql).toContain('ORDER BY created_at ASC, id ASC');
    expect(params).toEqual([cutoff.toISOString(), 25]);
    expect(rows[0]?.id).toBe(21);
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
    expect(params).toEqual([12, 'accepted', 'accepted', true, 'TRACKER_001', null]);
  });

  it('accepts an ACK from a new boot before authoritative boot telemetry arrives', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await updateCommandStatus(12, 'accepted', 'accepted', {
      markAcknowledged: true,
      expectedDeviceId: 'TRACKER_001',
      ackBootId: 'boot-18',
    });

    const [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).not.toContain('d.runtime_boot_id <> $6::varchar');
    expect(sql).not.toContain("THEN 'device_restarted_before_execution'");
    expect(sql).toContain('ack_boot_id');
    expect(params).toEqual([12, 'accepted', 'accepted', true, 'TRACKER_001', 'boot-18']);
  });

  it('keeps command lifecycle monotonic when older ACKs are replayed', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await updateCommandStatus(12, 'accepted', 'accepted', {
      markAcknowledged: true,
      expectedDeviceId: 'TRACKER_001',
    });

    const [sql] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain("status IN ('acknowledged', 'failed')");
    expect(sql).toContain("status = 'indeterminate'");
    expect(sql).toContain("$2::varchar NOT IN ('acknowledged', 'failed')");
    expect(sql).toContain("status = 'accepted' AND $2::varchar IN ('pending', 'sent')");
    expect(sql).toContain("status = 'sent' AND $2::varchar = 'pending'");
  });

  it('stores the firmware boot that accepted a deferred command', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await updateCommandStatus(12, 'accepted', 'accepted', {
      markAcknowledged: true,
      expectedDeviceId: 'TRACKER_001',
      ackBootId: 'boot-17',
    });

    const [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain('ack_boot_id');
    expect(params).toEqual([12, 'accepted', 'accepted', true, 'TRACKER_001', 'boot-17']);
  });

  it('marks only prior-boot accepted commands as indeterminate', async () => {
    vi.mocked(pool.query).mockResolvedValue({
      rows: [{
        id: 12,
        device_id: 'TRACKER_001',
        command: 'update_config',
        params: {},
        status: 'indeterminate',
        sent_at: new Date('2026-09-25T01:00:00Z'),
        acked_at: new Date('2026-09-25T01:00:01Z'),
        response: 'execution_outcome_unknown_after_restart',
      }],
    } as any);

    const rows = await observeRuntimeBootAndMarkStaleAcceptedIndeterminate('TRACKER_001', 'boot-18');

    const [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain('UPDATE devices');
    expect(sql).toContain('runtime_boot_id = $2');
    expect(sql).toContain("SET status = 'indeterminate'");
    expect(sql).toContain("response = 'execution_outcome_unknown_after_restart'");
    expect(sql).toContain("status = 'accepted'");
    expect(sql).toContain('ack_boot_id IS NOT NULL');
    expect(sql).toContain('ack_boot_id <> $2');
    expect(sql).not.toContain("status IN ('acknowledged', 'failed')");
    expect(params).toEqual(['TRACKER_001', 'boot-18']);
    expect(rows).toHaveLength(1);
  });

  it('allows a delayed final ACK to resolve an indeterminate command', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await updateCommandStatus(12, 'acknowledged', 'executed', {
      markAcknowledged: true,
      expectedDeviceId: 'TRACKER_001',
      ackBootId: 'boot-17',
    });

    const [sql] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain("status = 'indeterminate'");
    expect(sql).toContain("$2::varchar NOT IN ('acknowledged', 'failed')");
    expect(sql).toContain('ELSE $2::varchar');
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
    expect(params).toEqual([12, 'failed', 'device rejected command', true, 'TRACKER_001', null]);
  });

  it('leaves publish failures unacknowledged by default', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await updateCommandStatus(12, 'failed', 'publish_failed');

    const [, params] = vi.mocked(pool.query).mock.calls[0] ?? [];

    expect(params).toEqual([12, 'failed', 'publish_failed', false, null, null]);
  });
  it('returns null when an ACK does not match the originating device', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    const result = await updateCommandStatus(12, 'accepted', 'accepted', {
      markAcknowledged: true,
      expectedDeviceId: 'TRACKER_WRONG',
    });

    const [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain('device_id = $5::varchar');
    expect(params).toEqual([12, 'accepted', 'accepted', true, 'TRACKER_WRONG', null]);
    expect(result).toBeNull();
  });
});
