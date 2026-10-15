import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionUser } from '@/shared/types/common.types';

vi.mock('@/infrastructure/database/pool', () => ({ pool: { query: vi.fn() } }));

import { pool } from '@/infrastructure/database/pool';
import * as statistics from './statistics.repository';

const assigned: SessionUser = {
  id: 17, username: 'assigned', role: 'operator', deviceAccessMode: 'assigned',
};
const globalActor: SessionUser = {
  id: 1, username: 'admin', role: 'admin', deviceAccessMode: 'all',
};
const range = {
  from: new Date('2026-09-01T00:00:00.000Z'),
  to: new Date('2026-09-30T23:59:59.000Z'),
};
const query = vi.mocked(pool.query);
const calls = () => query.mock.calls.map(([sql, params]) => ({
  sql: String(sql), params: params as unknown[],
}));

describe('statistics SQL assigned-device authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.mockImplementation(async (sql) => {
      if (String(sql).includes('information_schema.columns')) {
        return { rows: [{ exists: true }] } as never;
      }
      if (String(sql).includes('COUNT(*)::text AS total FROM vehicles')) {
        return { rows: [{ total: '0' }] } as never;
      }
      return { rows: [] } as never;
    });
  });

  it('filters both total vehicle count and usage series in SQL, not after aggregation', async () => {
    await statistics.getFleetUsage(range, 'day', assigned);
    expect(calls()).toHaveLength(2);
    for (const { sql, params } of calls()) {
      expect(sql).toContain('user_device_access');
      expect(params).toContain(17);
    }
    expect(calls()[0].sql).toContain('uda.user_id = $1');
    expect(calls()[1].sql).toContain('uda.user_id = $4');
  });

  it('never returns an unassigned device ID in the uptime query', async () => {
    await statistics.getDeviceUptime(range, assigned);
    expect(calls()).toHaveLength(1);
    expect(calls()[0].sql).toContain('uda.device_id = d.device_id');
    expect(calls()[0].sql).toContain('uda.user_id = $3');
    expect(calls()[0].params).toContain(17);
  });

  it('scopes alert frequency to device grants, including vehicle-only alerts', async () => {
    await statistics.getAlertFrequency(range, 'day', assigned);
    expect(calls()).toHaveLength(1);
    expect(calls()[0].sql).toContain('uda.device_id = alerts.device_id');
    expect(calls()[0].sql).toContain('av.vehicle_id = alerts.vehicle_id');
    expect(calls()[0].params).toEqual([range.from, range.to, '1 day', 17]);
  });

  it('scopes trip summary, preserving vehicle-only legacy records', async () => {
    await statistics.getTripSummary(range, 'day', assigned);
    expect(calls()[0].sql).toContain('uda.device_id = trips.device_id');
    expect(calls()[0].sql).toContain('ad.vehicle_id = trips.vehicle_id');
    expect(calls()[0].params).toContain(17);
  });

  it('scopes both session totals and alert totals in the combined summary query', async () => {
    await statistics.getSummaryTotals(range, assigned);
    expect(calls()).toHaveLength(1);
    const summary = calls()[0];
    expect(summary.sql).toContain('JOIN eligible e ON e.device_id = s.device_id');
    expect(summary.sql).toContain('MAX(end_at) OVER');
    expect(summary.sql).toContain('FROM durations');
    expect(summary.sql).toContain('uda.device_id = alerts.device_id');
    expect(summary.sql).toContain('uda.user_id = $3');
    expect(summary.params).toEqual([range.from, range.to, 17]);
  });

  it('scopes policy quotas and prevents unauthorized plate/maintenance disclosures', async () => {
    await statistics.getPolicyLimitsSummary(assigned);
    expect(calls()[0].sql).toContain('av.vehicle_id = s.vehicle_id');
    expect(calls()[0].params).toEqual([17]);
    vi.clearAllMocks();
    await statistics.getMaintenanceTotalsAndVehicles(assigned);
    expect(calls()).toHaveLength(2);
    for (const { sql, params } of calls()) {
      expect(sql).toContain('user_device_access');
      expect(params).toEqual([17]);
    }
  });

  it('scopes every component of 30-day fleet stats before totals are computed', async () => {
    await statistics.getFleetTotalsLast30Days(assigned);
    expect(calls()).toHaveLength(3);
    const [trips, sessions, alerts] = calls();
    expect(trips.sql).toContain('uda.user_id = $1');
    expect(trips.params).toEqual([17]);
    expect(sessions.sql).toContain('uda.user_id = $3');
    expect(sessions.sql).toContain('MAX(end_at) OVER');
    expect(sessions.params).toHaveLength(3);
    expect(sessions.params[2]).toBe(17);
    expect(alerts.sql).toContain('uda.user_id = $1');
    expect(alerts.sql).toContain("alert_type::text = 'harsh_braking'");
    expect(alerts.params).toEqual([17]);
  });

  it('computes device coverage only over clipped intervals with overlap union', async () => {
    await statistics.getDeviceUptime(range, assigned);
    const sql = calls()[0].sql;
    expect(sql).toContain('GREATEST(COALESCE(s.server_session_start, s.created_at), $1::timestamptz)');
    expect(sql).toContain('LEAST(COALESCE(s.server_session_end, NOW()), $2::timestamptz)');
    expect(sql).toContain('MAX(end_at) OVER');
    expect(sql).toContain('ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING');
    expect(sql).toContain('GREATEST(start_at, COALESCE(previous_end, start_at))');
    expect(sql).toContain('FROM eligible e');
    expect(sql).toContain('user_device_access');
  });

  it('does not allow a malformed legacy uptime total to exceed the selected window', async () => {
    query.mockResolvedValueOnce({ rows: [{ device_id: 'DEV-1', up_seconds: '999999999' }] } as never);
    const result = await statistics.getDeviceUptime(range, assigned);
    expect(result[0].uptimePercent).toBe(100);
    expect(result[0].downHours).toBe(0);
  });

  it('allows root/admin global statistics without injecting artificial device grants', async () => {
    await statistics.getFleetUsage(range, 'day', globalActor);
    await statistics.getDeviceUptime(range, globalActor);
    await statistics.getAlertFrequency(range, 'day', globalActor);
    await statistics.getTripSummary(range, 'day', globalActor);
    await statistics.getSummaryTotals(range, globalActor);
    await statistics.getPolicyLimitsSummary(globalActor);
    await statistics.getFleetTotalsLast30Days(globalActor);
    await statistics.getMaintenanceTotalsAndVehicles(globalActor);
    for (const { sql, params } of calls()) {
      expect(sql).not.toContain('user_device_access');
      expect(params ?? []).not.toContain(17);
    }
  });
});
