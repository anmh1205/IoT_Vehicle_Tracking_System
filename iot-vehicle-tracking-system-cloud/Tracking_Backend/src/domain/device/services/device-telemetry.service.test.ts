vi.mock('@/infrastructure/database/queries');

import { findMany } from '@/infrastructure/database/queries';
import { getTelemetry } from './device-telemetry.service';

describe('device-telemetry.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('maps battery_top alias to the battery-top telemetry query', async () => {
    vi.mocked(findMany).mockResolvedValue([
      {
        server_timestamp: new Date('2026-04-23T00:00:00.000Z'),
        value: '12.45',
      },
    ]);

    const result = await getTelemetry('TRACKER_001', { metric: 'battery_top' });
    const [sql] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain("context->>'bt'");
    expect(result.metric).toBe('battery_top');
    expect(result.data).toEqual([
      {
        timestamp: '2026-04-23T00:00:00.000Z',
        value: 12.45,
      },
    ]);
  });

  it('supports rpm alias through diagnostic signal data', async () => {
    vi.mocked(findMany).mockResolvedValue([]);

    const result = await getTelemetry('TRACKER_001', { metric: 'rpm' });
    const [sql] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain("diagnostics,signals,rpm");
    expect(result.metric).toBe('rpm');
  });

  it('falls back to vibration for unsupported metrics', async () => {
    vi.mocked(findMany).mockResolvedValue([]);

    const result = await getTelemetry('TRACKER_001', { metric: 'unsupported_metric' });
    const [sql] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain("context->>'vib'");
    expect(result.metric).toBe('vib');
  });
});
