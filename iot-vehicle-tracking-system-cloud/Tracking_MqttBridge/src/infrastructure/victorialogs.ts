import { victoriaLogsConfig } from '../config/env';
import { logger } from './logger';

const INSERT_URL = `${victoriaLogsConfig.url}/insert/jsonline`;

interface LogEntry {
  _msg: string;
  _time: string;
  stream: string;
  device_id: string;
  [key: string]: unknown;
}

/**
 * Write a structured JSON log entry to VictoriaLogs via the jsonline endpoint.
 */
export const writeLog = async (entry: LogEntry): Promise<void> => {
  try {
    const response = await fetch(INSERT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/stream+json' },
      body: JSON.stringify(entry) + '\n',
    });

    if (!response.ok) {
      logger.error(`VictoriaLogs write failed: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    logger.error({ err }, 'VictoriaLogs write error');
  }
};

/**
 * Write a device event log entry.
 */
export const writeDeviceEvent = async (
  deviceId: string,
  eventType: string,
  message: string,
  extra: Record<string, unknown> = {},
): Promise<void> => {
  await writeLog({
    _msg: message,
    _time: new Date().toISOString(),
    stream: 'mqtt-bridge',
    device_id: deviceId,
    event_type: eventType,
    ...extra,
  });
};
