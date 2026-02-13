import { victoriaMetricsConfig } from '@/config/env';

interface VmQueryResult {
  status: string;
  data: unknown;
}

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
