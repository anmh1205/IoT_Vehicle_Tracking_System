import { victoriaMetricsConfig } from '../config/env';
import { logger } from './logger';

const IMPORT_URL = `${victoriaMetricsConfig.url}/api/v1/import/prometheus`;

/**
 * Sanitize a label value to prevent Prometheus label injection.
 * Removes characters that could break the line protocol format.
 */
const sanitizeLabel = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9_\-]/g, '_');
};

/**
 * Write a single metric line to VictoriaMetrics in Prometheus exposition format.
 */
export const writeMetric = async (
  metricName: string,
  labels: Record<string, string>,
  value: number,
  timestampMs: number,
): Promise<void> => {
  const sanitizedLabels = Object.entries(labels)
    .map(([k, v]) => `${sanitizeLabel(k)}="${sanitizeLabel(v)}"`)
    .join(',');

  const line = `${metricName}{${sanitizedLabels}} ${value} ${timestampMs}`;

  try {
    const response = await fetch(IMPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: line + '\n',
    });

    if (!response.ok) {
      logger.error(`VictoriaMetrics write failed: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    logger.error({ err }, 'VictoriaMetrics write error');
  }
};

/**
 * Write multiple metrics for a device telemetry payload.
 */
export const writeDeviceTelemetry = async (
  deviceId: string,
  data: Record<string, number | undefined>,
  timestampMs: number,
): Promise<void> => {
  const sanitizedDeviceId = sanitizeLabel(deviceId);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const metricName = `tracker_telemetry_${sanitizeLabel(key)}`;
    lines.push(`${metricName}{device_id="${sanitizedDeviceId}"} ${value} ${timestampMs}`);
  }

  if (lines.length === 0) return;

  try {
    const response = await fetch(IMPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: lines.join('\n') + '\n',
    });

    if (!response.ok) {
      logger.error(`VictoriaMetrics batch write failed: ${response.status}`);
    }
  } catch (err) {
    logger.error({ err }, 'VictoriaMetrics batch write error');
  }
};
