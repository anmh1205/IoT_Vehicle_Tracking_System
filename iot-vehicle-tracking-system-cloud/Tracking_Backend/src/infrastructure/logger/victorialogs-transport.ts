import Transport from 'winston-transport';

interface VictoriaLogsTransportOptions extends Transport.TransportStreamOptions {
  url: string;
  batchSize: number;
  flushIntervalMs: number;
  maxBufferSize: number;
}

interface LogInfo {
  level: string;
  message: string;
  timestamp?: string;
  [key: string]: unknown;
}

type VLEntry = Record<string, unknown>;

export type VictoriaLogsTransportInstance = Transport & {
  flush: () => Promise<void>;
  close: () => Promise<void>;
};

export const createVictoriaLogsTransport = (
  opts: VictoriaLogsTransportOptions,
): VictoriaLogsTransportInstance => {
  const endpoint = `${opts.url.replace(/\/$/, '')}/insert/jsonline`;
  const batchSize = opts.batchSize;
  const maxBufferSize = opts.maxBufferSize;

  const buffer: VLEntry[] = [];
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let isFlushing = false;

  const extractMeta = (info: LogInfo): Record<string, unknown> => {
    const {
      level: _level,
      message: _message,
      timestamp: _timestamp,
      service: _service,
      context: _context,
      ...meta
    } = info as Record<string, unknown>;
    return meta;
  };

  const flush = async (): Promise<void> => {
    if (isFlushing || buffer.length === 0) return;

    isFlushing = true;
    const batch = buffer.splice(0, batchSize);

    try {
      const body = batch.map((entry) => JSON.stringify(entry)).join('\n');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/stream+json' },
        body,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        const remaining = maxBufferSize - buffer.length;
        if (remaining > 0) {
          buffer.unshift(...batch.slice(0, remaining));
        }
      }
    } catch {
      const remaining = maxBufferSize - buffer.length;
      if (remaining > 0) {
        buffer.unshift(...batch.slice(0, remaining));
      }
    } finally {
      isFlushing = false;
    }
  };

  const transport = new Transport({
    ...opts,
    log: (info: LogInfo, callback: () => void): void => {
      if (buffer.length >= maxBufferSize) {
        callback();
        return;
      }

      buffer.push({
        _msg: info.message,
        level: info.level,
        _time: info.timestamp ?? new Date().toISOString(),
        service: (info as Record<string, unknown>).service ?? 'tracking-backend',
        context: (info as Record<string, unknown>).context,
        ...extractMeta(info),
      });

      if (buffer.length >= batchSize) {
        void flush();
      }

      callback();
    },
  }) as VictoriaLogsTransportInstance;

  transport.flush = flush;
  transport.close = async (): Promise<void> => {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    await flush();
  };

  flushTimer = setInterval(() => {
    void flush();
  }, opts.flushIntervalMs);

  return transport;
};
