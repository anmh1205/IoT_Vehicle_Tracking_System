vi.mock('@/infrastructure/database/queries');

import { findMany } from '@/infrastructure/database/queries';
import { listErrors } from './device-error.service';

describe('device-error.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lists canonical ECU alerts instead of mqtt raw telemetry forward logs', async () => {
    vi.mocked(findMany)
      .mockResolvedValueOnce([
        {
          id: 475,
          title: 'OBD: DTC P0171',
          message: 'P0171 (stored, MIL on). Inspect intake and MAF.',
          severity: 'critical',
          status: 'active',
          created_at: new Date('2026-05-08T14:02:51.000Z'),
          resolved_at: null,
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const result = await listErrors('TRACKER_001', 1, 10);
    const [listSql, listParams] = vi.mocked(findMany).mock.calls[0] ?? [];
    const [countSql, countParams] = vi.mocked(findMany).mock.calls[1] ?? [];

    expect(listSql).toContain('FROM alerts');
    expect(listSql).not.toContain('event_logs');
    expect(listSql).not.toContain('mqtt_bridge_rawdata');
    expect(listParams).toEqual(['TRACKER_001', 10, 0]);
    expect(countSql).toContain('FROM alerts');
    expect(countParams).toEqual(['TRACKER_001']);
    expect(result.items).toEqual([
      {
        id: 475,
        errorCode: 500,
        errorName: 'P0171',
        description: 'P0171 (stored, MIL on). Inspect intake and MAF.',
        severity: 'critical',
        status: 'active',
        occurredAt: '2026-05-08T14:02:51.000Z',
        resolvedAt: null,
      },
    ]);
    expect(result.pagination.total).toBe(1);
  });
});
