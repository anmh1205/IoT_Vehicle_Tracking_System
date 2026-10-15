import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/domain/statistics/repositories/statistics.repository', () => ({
  getFleetTotalsLast30Days: vi.fn(),
}));

import { getFleetTotalsLast30Days } from '@/domain/statistics/repositories/statistics.repository';
import { getFleetStats } from './statistics.service';
import type { SessionUser } from '@/shared/types/common.types';

const actor: SessionUser = {
  id: 22, username: 'operator', role: 'operator', deviceAccessMode: 'assigned',
};

describe('fleet business metrics truthfulness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fabricate idle duration or score and distinguishes other alerts', async () => {
    vi.mocked(getFleetTotalsLast30Days).mockResolvedValue({
      distanceFuel: { total_distance_km: '1000', total_fuel_liters: '100' },
      runtime: { active_time_seconds: '3600' },
      violations: { speeding: '2', zone: '1', harsh_braking: '1', other: '15' },
    });
    const stats = await getFleetStats(actor);
    expect(getFleetTotalsLast30Days).toHaveBeenCalledWith(actor);
    expect(stats.totalDistanceKm).toBe(1000);
    expect(stats.avgEfficiency).toBe(10);
    expect(stats.activeTimeSeconds).toBe(3600);
    expect(stats.idleTimeSeconds).toBeNull();
    expect(stats.safetyScore).toBeNull();
    expect(stats.violations).toEqual({
      speeding: 2, zone: 1, harshBraking: 1, other: 15,
    });
  });

  it('preserves legitimate zero measurements without replacing them with estimates', async () => {
    vi.mocked(getFleetTotalsLast30Days).mockResolvedValue({
      distanceFuel: { total_distance_km: '0', total_fuel_liters: '0' },
      runtime: { active_time_seconds: '0' },
      violations: { speeding: '0', zone: '0', harsh_braking: '0', other: '0' },
    });
    const stats = await getFleetStats(actor);
    expect(stats.totalDistanceKm).toBe(0);
    expect(stats.avgEfficiency).toBe(0);
    expect(stats.activeTimeSeconds).toBe(0);
    expect(stats.idleTimeSeconds).toBeNull();
    expect(stats.safetyScore).toBeNull();
    expect(stats.violations.harshBraking).toBe(0);
  });
});
