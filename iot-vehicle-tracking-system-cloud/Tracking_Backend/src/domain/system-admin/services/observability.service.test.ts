vi.mock('@/domain/system-admin/repositories/victoriametrics.repository', () => ({
  query: vi.fn(), queryRange: vi.fn(),
}));
vi.mock('@/domain/system-admin/repositories/victorialogs.repository', () => ({ query: vi.fn() }));

import * as vmRepo from '@/domain/system-admin/repositories/victoriametrics.repository';
import * as vlRepo from '@/domain/system-admin/repositories/victorialogs.repository';
import { queryMetrics, queryLogs } from './observability.service';

describe('system-admin observability use cases', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('rejects blank metric/log queries without invoking data sources', async () => {
    await expect(queryMetrics({ query: '  ' })).rejects.toThrow();
    await expect(queryLogs({ query: '  ' })).rejects.toThrow();
    expect(vmRepo.query).not.toHaveBeenCalled();
    expect(vlRepo.query).not.toHaveBeenCalled();
  });

  it('uses a 24-hour range with bounded resolution and preserves the public payload', async () => {
    vi.mocked(vmRepo.queryRange).mockResolvedValue({ status: 'success', series: [] });
    const result = await queryMetrics({ query: ' up ', time: '24h' });
    expect(vmRepo.queryRange).toHaveBeenCalledOnce();
    const [query, start, end, step] = vi.mocked(vmRepo.queryRange).mock.calls[0];
    expect(query).toBe('up');
    expect(Number(end) - Number(start)).toBe(86400);
    expect(step).toBe('360s');
    expect(result).toMatchObject({ query: 'up', time: '24h', rangeApplied: true, source: 'victoriametrics' });
  });

  it('queries instant metrics when the supplied time is not a duration', async () => {
    vi.mocked(vmRepo.query).mockResolvedValue({ status: 'success', data: [] });
    const result = await queryMetrics({ query: 'up', time: '2026-10-16T02:00:00Z' });
    expect(vmRepo.query).toHaveBeenCalledWith('up', '2026-10-16T02:00:00Z');
    expect(result.rangeApplied).toBe(false);
  });

  it('caps log pagination, normalizes levels and honors offset without leaking all rows', async () => {
    vi.mocked(vlRepo.query).mockResolvedValue({
      total: 3,
      items: [
        { id: 'one', level: 'error', message: 'a' },
        { id: 'two', level: 'unknown', message: 'b' },
        { id: 'three', level: 'warn', message: 'c' },
      ],
    });
    const result = await queryLogs({ query: ' test ', limit: 2, offset: 1 });
    expect(vlRepo.query).toHaveBeenCalledWith('test', 3);
    expect(result.items.map((x) => x.id)).toEqual(['two', 'three']);
    expect(result.items.map((x) => x.level)).toEqual(['info', 'warn']);
    expect(result.pagination).toMatchObject({ limit: 2, offset: 1, returned: 2, total: 3 });
  });
});
