import { victoriaLogsConfig } from '@/config/env';

interface VlQueryResult {
  items: Array<Record<string, unknown>>;
  total: number;
}

export const query = async (logsql: string, limit?: number): Promise<VlQueryResult> => {
  const url = new URL('/select/logsql/query', victoriaLogsConfig.url);
  url.searchParams.set('query', logsql);
  if (limit) url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`VictoriaLogs query failed: ${response.statusText}`);
  }

  const text = await response.text();
  const items = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .map((entry) => ({
      ...entry,
      timestamp: String(entry._time ?? entry.timestamp ?? new Date().toISOString()),
      level: String(entry.level ?? 'info'),
      source: String(entry.service ?? entry.source ?? entry.context ?? 'system'),
      message: String(entry._msg ?? entry.message ?? entry.msg ?? ''),
    }));

  return {
    items,
    total: items.length,
  };
};
