vi.mock('@/infrastructure/database/queries', () => ({
  findOne: vi.fn(),
  insertOne: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock('@/infrastructure/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { findOne, insertOne, updateOne } from '@/infrastructure/database/queries';
import { handleSessionBoundaryEvent } from '../trip-auto.service';

describe('trip-auto.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates one auto trip from a session start using the boundary timestamp', async () => {
    vi.mocked(findOne)
      .mockResolvedValueOnce({ vehicle_id: 'VEH-001' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    vi.mocked(insertOne).mockResolvedValue({ id: 1 } as never);

    await handleSessionBoundaryEvent({
      device_id: 'DEV-001',
      session_id: 42,
      action: 'started',
      occurred_at: '2026-09-25T01:02:03.000Z',
    });

    expect(insertOne).toHaveBeenCalledTimes(1);
    const [, params] = vi.mocked(insertOne).mock.calls[0];
    expect(params).toEqual([
      'AUTO-DEV-001-SESSION-42',
      'VEH-001',
      'DEV-001',
      '2026-09-25T01:02:03.000Z',
    ]);
  });

  it('reconstructs an older historical trip behind a newer active trip', async () => {
    vi.mocked(findOne)
      .mockResolvedValueOnce({ vehicle_id: 'VEH-001' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 99,
        trip_code: 'AUTO-DEV-001-SESSION-99',
        status: 'in_progress',
        actual_start: new Date('2026-09-25T10:00:00.000Z'),
      } as never);
    vi.mocked(insertOne).mockResolvedValue({ id: 98 } as never);

    await handleSessionBoundaryEvent({
      device_id: 'DEV-001',
      session_id: 42,
      action: 'started',
      occurred_at: '2026-09-24T10:00:00.000Z',
    });

    expect(insertOne).toHaveBeenCalledTimes(1);
  });

  it('still rejects a session start that overlaps an older active trip', async () => {
    vi.mocked(findOne)
      .mockResolvedValueOnce({ vehicle_id: 'VEH-001' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 99,
        trip_code: 'AUTO-DEV-001-SESSION-99',
        status: 'in_progress',
        actual_start: new Date('2026-09-25T09:00:00.000Z'),
      } as never);

    await handleSessionBoundaryEvent({
      device_id: 'DEV-001',
      session_id: 42,
      action: 'started',
      occurred_at: '2026-09-25T10:00:00.000Z',
    });

    expect(insertOne).not.toHaveBeenCalled();
  });

  it('is idempotent when the same session-start event is replayed', async () => {
    vi.mocked(findOne)
      .mockResolvedValueOnce({ vehicle_id: 'VEH-001' })
      .mockResolvedValueOnce({
        id: 9,
        trip_code: 'AUTO-DEV-001-SESSION-42',
        status: 'in_progress',
      } as never);

    await handleSessionBoundaryEvent({
      device_id: 'DEV-001',
      session_id: 42,
      action: 'started',
      occurred_at: '2026-09-25T01:02:03.000Z',
    });

    expect(insertOne).not.toHaveBeenCalled();
  });

  it('ends the exact session trip using the boundary timestamp', async () => {
    vi.mocked(findOne).mockResolvedValueOnce({
      id: 9,
      trip_code: 'AUTO-DEV-001-SESSION-42',
      status: 'in_progress',
      actual_start: new Date('2026-09-25T01:00:00.000Z'),
    } as never);
    vi.mocked(updateOne).mockResolvedValue({ id: 9 } as never);

    await handleSessionBoundaryEvent({
      device_id: 'DEV-001',
      session_id: 42,
      action: 'ended',
      occurred_at: '2026-09-25T02:00:00.000Z',
    });

    expect(updateOne).toHaveBeenCalledTimes(1);
    const [, params] = vi.mocked(updateOne).mock.calls[0];
    expect(params).toEqual([9, '2026-09-25T02:00:00.000Z']);
  });

  it('cancels the exact auto-trip when its source session is discarded', async () => {
    vi.mocked(findOne).mockResolvedValueOnce({
      id: 12,
      trip_code: 'AUTO-DEV-001-SESSION-42',
      status: 'in_progress',
      actual_start: new Date('2026-09-25T01:00:00.000Z'),
    } as never);
    vi.mocked(updateOne).mockResolvedValue({ id: 12 } as never);

    await handleSessionBoundaryEvent({
      device_id: 'DEV-001',
      session_id: 42,
      action: 'discarded',
      occurred_at: '2026-09-25T01:00:05.000Z',
    });

    expect(updateOne).toHaveBeenCalledTimes(1);
    const [sql, params] = vi.mocked(updateOne).mock.calls[0];
    expect(sql).toContain("status = 'cancelled'");
    expect(params).toEqual([12, '2026-09-25T01:00:05.000Z']);
  });

  it('does not close a different active trip when a delayed session-end arrives', async () => {
    vi.mocked(findOne).mockResolvedValueOnce(null);

    await handleSessionBoundaryEvent({
      device_id: 'DEV-001',
      session_id: 41,
      action: 'ended',
      occurred_at: '2026-09-25T02:00:00.000Z',
    });

    expect(updateOne).not.toHaveBeenCalled();
  });

  it('clamps an out-of-order end timestamp to actual_start', async () => {
    vi.mocked(findOne).mockResolvedValueOnce({
      id: 9,
      trip_code: 'AUTO-DEV-001-SESSION-42',
      status: 'in_progress',
      actual_start: new Date('2026-09-25T02:00:00.000Z'),
    } as never);
    vi.mocked(updateOne).mockResolvedValue({ id: 9 } as never);

    await handleSessionBoundaryEvent({
      device_id: 'DEV-001',
      session_id: 42,
      action: 'ended',
      occurred_at: '2026-09-25T01:59:00.000Z',
    });

    const [, params] = vi.mocked(updateOne).mock.calls[0];
    expect(params).toEqual([9, '2026-09-25T02:00:00.000Z']);
  });
});
