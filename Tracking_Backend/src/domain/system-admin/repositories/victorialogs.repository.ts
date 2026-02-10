import { victoriaLogsConfig } from '@/config/env';

interface VlQueryResult {
  status: string;
  data: unknown;
}

export const query = async (logsql: string, limit?: number): Promise<VlQueryResult> => {
  const url = new URL('/select/logsql/query', victoriaLogsConfig.url);
  url.searchParams.set('query', logsql);
  if (limit) url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`VictoriaLogs query failed: ${response.statusText}`);
  }

  return response.json() as Promise<VlQueryResult>;
};
