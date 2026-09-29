vi.mock('@/infrastructure/database/queries', () => ({
  findMany: vi.fn(),
}));

vi.mock('@/infrastructure/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../trip-auto.service', () => ({
  handleSessionBoundaryEvent: vi.fn(),
}));

import { findMany } from '@/infrastructure/database/queries';
import { handleSessionBoundaryEvent } from '../trip-auto.service';
import { runAutoTripReconciliation } from '../trip-auto-reconciler.service';

describe('trip-auto-reconciler.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reconstructs and completes a missing historical auto-trip from a completed session', async () => {
    vi.mocked(findMany)
      .mockResolvedValueOnce([
        {
          id: 42,
          device_id: 'DEV-001',
          status: 'completed',
          start_at: new Date('2026-09-28T01:00:00.000Z'),
          end_at: new Date('2026-09-28T02:00:00.000Z'),
          trip_status: null,
        },
      ] as never)
      .mockResolvedValueOnce([]);

    await runAutoTripReconciliation();

    expect(handleSessionBoundaryEvent).toHaveBeenCalledTimes(2);
    expect(vi.mocked(handleSessionBoundaryEvent).mock.calls[0]?.[0]).toEqual({
      device_id: 'DEV-001',
      session_id: 42,
      action: 'started',
      occurred_at: '2026-09-28T01:00:00.000Z',
    });
    expect(vi.mocked(handleSessionBoundaryEvent).mock.calls[1]?.[0]).toEqual({
      device_id: 'DEV-001',
      session_id: 42,
      action: 'ended',
      occurred_at: '2026-09-28T02:00:00.000Z',
    });
  });

  it('only closes a completed session whose auto-trip already exists in progress', async () => {
    vi.mocked(findMany)
      .mockResolvedValueOnce([
        {
          id: 43,
          device_id: 'DEV-001',
          status: 'completed',
          start_at: '2026-09-28T03:00:00.000Z',
          end_at: '2026-09-28T04:00:00.000Z',
          trip_status: 'in_progress',
        },
      ] as never)
      .mockResolvedValueOnce([]);

    await runAutoTripReconciliation();

    expect(handleSessionBoundaryEvent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(handleSessionBoundaryEvent).mock.calls[0]?.[0]).toEqual({
      device_id: 'DEV-001',
      session_id: 43,
      action: 'ended',
      occurred_at: '2026-09-28T04:00:00.000Z',
    });
  });

  it('creates the missing auto-trip for a running durable session', async () => {
    vi.mocked(findMany)
      .mockResolvedValueOnce([
        {
          id: 44,
          device_id: 'DEV-002',
          status: 'running',
          start_at: '2026-09-28T05:00:00.000Z',
          end_at: null,
          trip_status: null,
        },
      ] as never)
      .mockResolvedValueOnce([]);

    await runAutoTripReconciliation();

    expect(handleSessionBoundaryEvent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(handleSessionBoundaryEvent).mock.calls[0]?.[0]).toEqual({
      device_id: 'DEV-002',
      session_id: 44,
      action: 'started',
      occurred_at: '2026-09-28T05:00:00.000Z',
    });
  });

  it('cancels an in-progress auto-trip whose source session no longer exists', async () => {
    vi.mocked(findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          trip_code: 'AUTO-DEV-003-SESSION-45',
          device_id: 'DEV-003',
          occurred_at: '2026-09-28T06:00:00.000Z',
        },
      ] as never);

    await runAutoTripReconciliation();

    expect(handleSessionBoundaryEvent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(handleSessionBoundaryEvent).mock.calls[0]?.[0]).toEqual({
      device_id: 'DEV-003',
      session_id: 45,
      action: 'discarded',
      occurred_at: '2026-09-28T06:00:00.000Z',
    });
  });

  it('ignores malformed automatic trip codes instead of cancelling an unrelated trip', async () => {
    vi.mocked(findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          trip_code: 'AUTO-OTHER-SESSION-45',
          device_id: 'DEV-003',
          occurred_at: '2026-09-28T06:00:00.000Z',
        },
      ] as never);

    await runAutoTripReconciliation();

    expect(handleSessionBoundaryEvent).not.toHaveBeenCalled();
  });
});
