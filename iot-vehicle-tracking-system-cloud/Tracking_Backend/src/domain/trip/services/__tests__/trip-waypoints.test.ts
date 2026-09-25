import type { TripWaypoint } from '../trip-waypoints.service';

vi.mock('@/domain/system-admin/repositories/victoriametrics.repository');
vi.mock('@/infrastructure/database/queries', () => ({
  findMany: vi.fn(),
}));

import * as vmRepo from '@/domain/system-admin/repositories/victoriametrics.repository';
import { findMany } from '@/infrastructure/database/queries';
import { getWaypoints, computeRouteSummary } from '../trip-waypoints.service';

// -- Helpers ------------------------------------------------------------------

const makeWaypoint = (overrides: Partial<TripWaypoint> = {}): TripWaypoint => ({
  ts: 1700000000,
  timestamp: new Date(1700000000 * 1000).toISOString(),
  lat: 10.7769,
  lon: 106.7009,
  speed: 50,
  course: 90,
  ...overrides,
});

const makeVmResult = (values: { timestamp: number; value: number }[]) => ({
  series: [{ values }],
});

// -- Tests --------------------------------------------------------------------

describe('trip-waypoints.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findMany).mockResolvedValue([]);
  });

  // --- computeRouteSummary ---------------------------------------------------

  describe('computeRouteSummary', () => {
    it('should calculate correct distance, duration, max and avg speed', () => {
      // Two points: HCMC area roughly 1km apart
      const startTs = Date.parse('2026-01-15T08:00:00.000Z') / 1000;
      const waypoints: TripWaypoint[] = [
        makeWaypoint({ ts: startTs, lat: 10.7769, lon: 106.7009, speed: 40 }),
        makeWaypoint({ ts: startTs + 60, lat: 10.7860, lon: 106.7009, speed: 60 }),
        makeWaypoint({ ts: startTs + 120, lat: 10.7950, lon: 106.7009, speed: 50 }),
      ];
      const start = new Date('2026-01-15T08:00:00.000Z');
      const end = new Date('2026-01-15T08:30:00.000Z');

      const result = computeRouteSummary(waypoints, start, end);

      expect(result.durationMinutes).toBe(30);
      expect(result.maxSpeed).toBe(60);
      expect(result.avgSpeed).toBe(50); // (40+60+50)/3 = 50
      expect(result.distanceKm).toBeGreaterThan(0);
      expect(result.startLat).toBe(10.7769);
      expect(result.startLon).toBe(106.7009);
      expect(result.endLat).toBe(10.7950);
      expect(result.endLon).toBe(106.7009);
    });

    it('should return zeroed stats for single waypoint (no distance)', () => {
      const waypoints = [makeWaypoint({ speed: 30 })];
      const start = new Date('2026-01-15T08:00:00.000Z');
      const end = new Date('2026-01-15T08:10:00.000Z');

      const result = computeRouteSummary(waypoints, start, end);

      expect(result.distanceKm).toBe(0);
      expect(result.maxSpeed).toBe(30);
      expect(result.avgSpeed).toBe(30);
      expect(result.durationMinutes).toBe(10);
    });

    it('should return zero avgSpeed when all speed values are null', () => {
      const waypoints = [
        makeWaypoint({ speed: null }),
        makeWaypoint({ lat: 10.78, lon: 106.71, speed: null }),
      ];
      const start = new Date('2026-01-15T08:00:00.000Z');
      const end = new Date('2026-01-15T08:20:00.000Z');

      const result = computeRouteSummary(waypoints, start, end);

      expect(result.avgSpeed).toBe(0);
      expect(result.maxSpeed).toBe(0);
    });

    it('should return null start/end coordinates for empty waypoints', () => {
      const start = new Date('2026-01-15T08:00:00.000Z');
      const end = new Date('2026-01-15T08:30:00.000Z');

      const result = computeRouteSummary([], start, end);

      expect(result.startLat).toBeNull();
      expect(result.startLon).toBeNull();
      expect(result.endLat).toBeNull();
      expect(result.endLon).toBeNull();
      expect(result.distanceKm).toBe(0);
    });

    it('haversine accuracy: HCMC to Hanoi ~1147-1170 km', () => {
      // HCMC: 10.8231, 106.6297 — Hanoi: 21.0245, 105.8412
      const startTs = Date.parse('2026-01-15T08:00:00.000Z') / 1000;
      const waypoints: TripWaypoint[] = [
        makeWaypoint({ ts: startTs, lat: 10.8231, lon: 106.6297, speed: null }),
        makeWaypoint({ ts: startTs + 10 * 3600, lat: 21.0245, lon: 105.8412, speed: null }),
      ];
      const start = new Date('2026-01-15T08:00:00.000Z');
      const end = new Date('2026-01-15T18:00:00.000Z');

      const result = computeRouteSummary(waypoints, start, end);

      // Haversine HCMC→Hanoi is approximately 1147-1170 km and ~115 km/h over 10h
      expect(result.distanceKm).toBeGreaterThan(1100);
      expect(result.distanceKm).toBeLessThan(1200);
    });

    it('should ignore an isolated GPS ghost jump when calculating distance', () => {
      const startTs = Date.parse('2026-01-15T08:00:00.000Z') / 1000;
      const waypoints: TripWaypoint[] = [
        makeWaypoint({ ts: startTs, lat: 10.7769, lon: 106.7009, speed: 40 }),
        // Valid coordinate range, but physically impossible from the previous point in 15 seconds.
        makeWaypoint({ ts: startTs + 15, lat: 21.0245, lon: 105.8412, speed: 40 }),
        makeWaypoint({ ts: startTs + 30, lat: 10.7772, lon: 106.7012, speed: 42 }),
      ];
      const start = new Date('2026-01-15T08:00:00.000Z');
      const end = new Date('2026-01-15T08:00:30.000Z');

      const result = computeRouteSummary(waypoints, start, end);

      expect(result.distanceKm).toBeLessThan(0.1);
      expect(result.startLat).toBe(10.7769);
      expect(result.endLat).toBe(10.7772);
      expect(result.maxSpeed).toBe(42);
    });

    it('should ignore impossible reported speed samples in max and average speed', () => {
      const startTs = Date.parse('2026-01-15T08:00:00.000Z') / 1000;
      const waypoints: TripWaypoint[] = [
        makeWaypoint({ ts: startTs, speed: 40 }),
        makeWaypoint({ ts: startTs + 15, lat: 10.7770, lon: 106.7010, speed: 5000 }),
        makeWaypoint({ ts: startTs + 30, lat: 10.7771, lon: 106.7011, speed: 60 }),
      ];
      const start = new Date('2026-01-15T08:00:00.000Z');
      const end = new Date('2026-01-15T08:00:30.000Z');

      const result = computeRouteSummary(waypoints, start, end);

      expect(result.maxSpeed).toBe(60);
      expect(result.avgSpeed).toBe(50);
    });

    it('should round distanceKm to 2 decimal places', () => {
      const startTs = Date.parse('2026-01-15T08:00:00.000Z') / 1000;
      const waypoints: TripWaypoint[] = [
        makeWaypoint({ ts: startTs, lat: 10.7769, lon: 106.7009, speed: 50 }),
        makeWaypoint({ ts: startTs + 15, lat: 10.7772, lon: 106.7012, speed: 50 }),
      ];
      const start = new Date('2026-01-15T08:00:00.000Z');
      const end = new Date('2026-01-15T08:05:00.000Z');

      const result = computeRouteSummary(waypoints, start, end);

      const decimals = result.distanceKm.toString().split('.')[1];
      expect(decimals === undefined || decimals.length <= 2).toBe(true);
    });
  });

  // --- getWaypoints ----------------------------------------------------------

  describe('getWaypoints', () => {
    it('should use event log waypoints when rawdata GPS exists', async () => {
      vi.mocked(findMany).mockResolvedValue([
        {
          telemetry_timestamp: new Date('2026-01-15T08:00:00.000Z'),
          lat: '10.7769',
          lon: '106.7009',
          speed: '42.5',
          course: '90',
        },
        {
          telemetry_timestamp: new Date('2026-01-15T08:00:10.000Z'),
          lat: '10.7770',
          lon: '106.7010',
          speed: '43.5',
          course: '91',
        },
        {
          telemetry_timestamp: new Date('2026-01-15T08:00:16.000Z'),
          lat: '10.7771',
          lon: '106.7011',
          speed: '44.5',
          course: '92',
        },
      ]);

      const result = await getWaypoints(
        'DEV-001',
        new Date('2026-01-15T08:00:00.000Z'),
        new Date('2026-01-15T09:00:00.000Z'),
      );

      expect(vmRepo.queryRange).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        lat: 10.7769,
        lon: 106.7009,
        speed: 42.5,
        course: 90,
      });
      expect(result[1]).toMatchObject({
        lat: 10.7771,
        lon: 106.7011,
        speed: 44.5,
        course: 92,
      });

      const [sql] = vi.mocked(findMany).mock.calls[0];
      expect(sql).toContain('COALESCE(device_timestamp, server_timestamp) AS telemetry_timestamp');
      expect(sql).toContain('COALESCE(device_timestamp, server_timestamp) BETWEEN $2 AND $3');
      expect(sql).toContain('ORDER BY telemetry_timestamp ASC, server_timestamp ASC');
      expect(sql).toContain("context ? 'position_valid'");
      expect(sql).toContain("context->>'position_valid'");
    });

    it('should merge lat/lon values by timestamp into waypoints', async () => {
      const ts = 1700000000;
      vi.mocked(vmRepo.queryRange)
        .mockResolvedValueOnce(makeVmResult([{ timestamp: ts, value: 10.7769 }])) // lat
        .mockResolvedValueOnce(makeVmResult([{ timestamp: ts, value: 106.7009 }])) // lon
        .mockResolvedValueOnce(makeVmResult([{ timestamp: ts, value: 50 }]))       // speed
        .mockResolvedValueOnce(makeVmResult([{ timestamp: ts, value: 90 }]));      // course

      const result = await getWaypoints(
        'DEV-001',
        new Date('2026-01-15T08:00:00.000Z'),
        new Date('2026-01-15T09:00:00.000Z'),
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        ts,
        lat: 10.7769,
        lon: 106.7009,
        speed: 50,
        course: 90,
      });
    });

    it('should skip waypoints where lon is missing for the timestamp', async () => {
      const ts1 = 1700000000;
      const ts2 = 1700000015;
      vi.mocked(vmRepo.queryRange)
        .mockResolvedValueOnce(makeVmResult([
          { timestamp: ts1, value: 10.7769 },
          { timestamp: ts2, value: 10.7770 }, // no matching lon
        ]))
        .mockResolvedValueOnce(makeVmResult([{ timestamp: ts1, value: 106.7009 }])) // only ts1 lon
        .mockResolvedValueOnce(makeVmResult([]))
        .mockResolvedValueOnce(makeVmResult([]));

      const result = await getWaypoints(
        'DEV-001',
        new Date('2026-01-15T08:00:00.000Z'),
        new Date('2026-01-15T09:00:00.000Z'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].ts).toBe(ts1);
    });

    it('should skip (0, 0) coordinate pairs', async () => {
      const ts = 1700000000;
      vi.mocked(vmRepo.queryRange)
        .mockResolvedValueOnce(makeVmResult([{ timestamp: ts, value: 0 }]))
        .mockResolvedValueOnce(makeVmResult([{ timestamp: ts, value: 0 }]))
        .mockResolvedValueOnce(makeVmResult([]))
        .mockResolvedValueOnce(makeVmResult([]));

      const result = await getWaypoints(
        'DEV-001',
        new Date('2026-01-15T08:00:00.000Z'),
        new Date('2026-01-15T09:00:00.000Z'),
      );

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no lat series available', async () => {
      vi.mocked(vmRepo.queryRange)
        .mockResolvedValueOnce({ series: [] }) // no lat series
        .mockResolvedValueOnce({ series: [] })
        .mockResolvedValueOnce({ series: [] })
        .mockResolvedValueOnce({ series: [] });

      const result = await getWaypoints(
        'DEV-001',
        new Date('2026-01-15T08:00:00.000Z'),
        new Date('2026-01-15T09:00:00.000Z'),
      );

      expect(result).toEqual([]);
    });
  });
});
