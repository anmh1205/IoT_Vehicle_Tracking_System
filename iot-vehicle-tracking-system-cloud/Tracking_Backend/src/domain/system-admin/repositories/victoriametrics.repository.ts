import { victoriaMetricsConfig } from '@/config/env';

interface VmQueryResult {
  status: string;
  data: unknown;
}

/** Time-series values returned by range queries */
export interface VmRangeValue {
  timestamp: number;
  value: number;
}

/** A single series from a range query result */
export interface VmRangeSeries {
  metric: Record<string, string>;
  values: VmRangeValue[];
}

/** Parsed range query response */
export interface VmRangeResult {
  status: string;
  series: VmRangeSeries[];
}

/** Instant query (existing) */
export const query = async (promql: string, time?: string): Promise<VmQueryResult> => {
  const url = new URL('/api/v1/query', victoriaMetricsConfig.url);
  url.searchParams.set('query', promql);
  if (time) url.searchParams.set('time', time);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`VictoriaMetrics query failed: ${response.statusText}`);
  }

  return response.json() as Promise<VmQueryResult>;
};

/**
 * Range query — returns time-series data points between start and end.
 * Uses /api/v1/query_range endpoint.
 * @param promql - PromQL expression (e.g. tracker_telemetry_latitude{device_id="xxx"})
 * @param start  - ISO string or unix timestamp (seconds)
 * @param end    - ISO string or unix timestamp (seconds)
 * @param step   - Resolution step (e.g. "15s", "1m"). Defaults to "15s".
 */
export const queryRange = async (
  promql: string,
  start: string | number,
  end: string | number,
  step = '15s',
): Promise<VmRangeResult> => {
  const url = new URL('/api/v1/query_range', victoriaMetricsConfig.url);
  url.searchParams.set('query', promql);
  url.searchParams.set('start', String(start));
  url.searchParams.set('end', String(end));
  url.searchParams.set('step', step);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`VictoriaMetrics range query failed: ${response.statusText}`);
  }

  const json = (await response.json()) as {
    status: string;
    data?: { result?: Array<{ metric: Record<string, string>; values: [number, string][] }> };
  };

  // Parse raw [timestamp, "stringValue"] pairs into typed objects
  const series: VmRangeSeries[] = (json.data?.result ?? []).map((s) => ({
    metric: s.metric,
    values: s.values.map(([ts, val]) => ({ timestamp: ts, value: parseFloat(val) })),
  }));

  return { status: json.status, series };
};
