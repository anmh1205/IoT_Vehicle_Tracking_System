vi.mock('@/infrastructure/database/queries', () => ({
  findOne: vi.fn(),
  updateOne: vi.fn(),
}));
vi.mock('@/infrastructure/database/pool', () => ({
  pool: { connect: vi.fn() },
}));
vi.mock('@/infrastructure/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { findOne, updateOne } from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import { handleSessionBoundaryEvent } from '../trip-auto.service';

const clientQuery = vi.fn();
const release = vi.fn();
const rows = (values: unknown[]) => ({ rows: values });

const started = (sessionId = 42, deviceId = 'DEV-001', occurredAt = '2026-09-25T01:02:03.000Z') => ({
  device_id: deviceId, session_id: sessionId, action: 'started' as const, occurred_at: occurredAt,
});
const boundary = (action: 'ended' | 'discarded', sessionId = 42, occurredAt = '2026-09-25T02:00:00.000Z') => ({
  device_id: 'DEV-001', session_id: sessionId, action, occurred_at: occurredAt,
});
const setTripQueryResults = ({
  existing = null,
  active = null,
  insert = { id: 1 },
}: { existing?: unknown; active?: unknown; insert?: unknown } = {}) => {
  clientQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('WHERE trip_code = $1')) return rows(existing ? [existing] : []);
    if (sql.includes("status = 'in_progress'")) return rows(active ? [active] : []);
    if (sql.includes('INSERT INTO trips')) return rows(insert ? [insert] : []);
    return rows([]);
  });
};

describe('trip-auto.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pool.connect).mockResolvedValue({ query: clientQuery, release } as never);
    setTripQueryResults();
  });

  it('creates one auto-trip with per-vehicle advisory lock and boundary timestamp', async () => {
    vi.mocked(findOne).mockResolvedValueOnce({ vehicle_id: 'VEH-001' });
    await handleSessionBoundaryEvent(started());

    const sqls = clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls.some((sql) => sql.includes('pg_advisory_xact_lock'))).toBe(true);
    const [insertSql, params] = clientQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO trips'));
    expect(insertSql).toContain('ON CONFLICT (trip_code) DO NOTHING');
    expect(params).toEqual([
      'AUTO-DEV-001-SESSION-42', 'VEH-001', 'DEV-001', '2026-09-25T01:02:03.000Z',
    ]);
    expect(sqls.at(-1)).toBe('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  it('reconstructs older history behind a newer trip inside the same lock', async () => {
    vi.mocked(findOne).mockResolvedValueOnce({ vehicle_id: 'VEH-001' });
    setTripQueryResults({
      active: {
        id: 99, trip_code: 'AUTO-DEV-001-SESSION-99', status: 'in_progress',
        actual_start: new Date('2026-09-25T10:00:00.000Z'),
      },
    });
    await handleSessionBoundaryEvent(started(42, 'DEV-001', '2026-09-24T10:00:00.000Z'));
    expect(clientQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO trips'))).toBe(true);
  });

  it('rejects an overlapping new trip and commits a read-only transaction', async () => {
    vi.mocked(findOne).mockResolvedValueOnce({ vehicle_id: 'VEH-001' });
    setTripQueryResults({
      active: {
        id: 99, trip_code: 'AUTO-DEV-001-SESSION-99', status: 'in_progress',
        actual_start: new Date('2026-09-25T00:00:00.000Z'),
      },
    });
    await handleSessionBoundaryEvent(started());
    expect(clientQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO trips'))).toBe(false);
    expect(clientQuery.mock.calls.at(-1)?.[0]).toBe('COMMIT');
  });

  it('deduplicates a replayed session start after acquiring the per-vehicle lock', async () => {
    vi.mocked(findOne).mockResolvedValueOnce({ vehicle_id: 'VEH-001' });
    setTripQueryResults({ existing: { id: 1, trip_code: 'AUTO-DEV-001-SESSION-42' } });
    await handleSessionBoundaryEvent(started());
    expect(clientQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO trips'))).toBe(false);
    expect(clientQuery.mock.calls.at(-1)?.[0]).toBe('COMMIT');
  });

  it('treats competing ON CONFLICT insert as successful idempotent no-op', async () => {
    vi.mocked(findOne).mockResolvedValueOnce({ vehicle_id: 'VEH-001' });
    setTripQueryResults({ insert: null });
    await expect(handleSessionBoundaryEvent(started())).resolves.toBeUndefined();
    expect(clientQuery.mock.calls.at(-1)?.[0]).toBe('COMMIT');
  });

  it('rolls back and releases a connection if insertion fails', async () => {
    vi.mocked(findOne).mockResolvedValueOnce({ vehicle_id: 'VEH-001' });
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO trips')) throw new Error('database unavailable');
      return rows([]);
    });
    await expect(handleSessionBoundaryEvent(started())).rejects.toThrow('database unavailable');
    expect(clientQuery.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });

  it('handles a maximum-length device ID without overflowing trip_code VARCHAR(50)', async () => {
    const longDeviceId = 'TRACKER-'.padEnd(50, 'Z');
    vi.mocked(findOne).mockResolvedValueOnce({ vehicle_id: 'VEH-001' });
    await handleSessionBoundaryEvent(started(90001, longDeviceId));
    const [, params] = clientQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO trips'));
    expect(String(params[0])).toMatch(/^AUTO-[a-f0-9]{40}$/);
    expect(String(params[0]).length).toBeLessThanOrEqual(50);
  });

  it('completes only the session-matched running trip', async () => {
    vi.mocked(findOne).mockResolvedValueOnce({
      id: 9, trip_code: 'AUTO-DEV-001-SESSION-42',
      status: 'in_progress', actual_start: new Date('2026-09-25T01:00:00.000Z'),
    });
    vi.mocked(updateOne).mockResolvedValue({ id: 9 } as never);
    await handleSessionBoundaryEvent(boundary('ended'));
    expect(updateOne).toHaveBeenCalledOnce();
    const [, params] = vi.mocked(updateOne).mock.calls[0];
    expect(params).toEqual([9, 'completed', '2026-09-25T02:00:00.000Z']);
  });

  it('cancels only the auto-trip of a discarded session', async () => {
    vi.mocked(findOne).mockResolvedValueOnce({
      id: 12, trip_code: 'AUTO-DEV-001-SESSION-42',
      status: 'in_progress', actual_start: new Date('2026-09-25T01:00:00.000Z'),
    });
    vi.mocked(updateOne).mockResolvedValue({ id: 12 } as never);
    await handleSessionBoundaryEvent(boundary('discarded'));
    expect(String(vi.mocked(updateOne).mock.calls[0][0])).toContain('status = $2');
    expect(vi.mocked(updateOne).mock.calls[0][1]?.[1]).toBe('cancelled');
  });

  it('does not close an unrelated trip for delayed session-end', async () => {
    vi.mocked(findOne).mockResolvedValueOnce(null);
    await handleSessionBoundaryEvent(boundary('ended', 41));
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('clamps session end timestamp to the start of the matched trip', async () => {
    vi.mocked(findOne).mockResolvedValueOnce({
      id: 9, trip_code: 'AUTO-DEV-001-SESSION-42',
      status: 'in_progress', actual_start: new Date('2026-09-25T02:00:00.000Z'),
    });
    vi.mocked(updateOne).mockResolvedValue({ id: 9 } as never);
    await handleSessionBoundaryEvent(boundary('ended', 42, '2026-09-25T01:59:00.000Z'));
    expect(vi.mocked(updateOne).mock.calls[0][1]).toEqual([9, 'completed', '2026-09-25T02:00:00.000Z']);
  });
});
