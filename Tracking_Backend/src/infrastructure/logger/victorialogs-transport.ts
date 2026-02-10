import Transport from 'winston-transport';

interface VictoriaLogsTransportOptions extends Transport.TransportStreamOptions {
  url: string;
  batchSize: number;
  flushIntervalMs: number;
  maxBufferSize: number;
}

/** Winston log info shape */
interface LogInfo {
  level: string;
  message: string;
  timestamp?: string;
  [key: string]: unknown;
}

/** VictoriaLogs jsonline payload (uses _msg, _time fields) */
type VLEntry = Record<string, unknown>;

/**
 * Custom Winston transport that batches logs and sends them
 * to VictoriaLogs via HTTP POST /insert/jsonline.
 *
 * Circuit breaker: drops logs when buffer exceeds maxBufferSize
 * to prevent OOM in case VictoriaLogs is unreachable.
 */
export class VictoriaLogsTransport extends Transport {
  private readonly endpoint: string;
  private readonly batchSize: number;
  private readonly maxBufferSize: number;
  private buffer: VLEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;

  constructor(opts: VictoriaLogsTransportOptions) {
    super(opts);
    this.endpoint = `${opts.url.replace(/\/$/, '')}/insert/jsonline`;
    this.batchSize = opts.batchSize;
    this.maxBufferSize = opts.maxBufferSize;

    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {
        /* swallow — transport errors must not crash the app */
      });
    }, opts.flushIntervalMs);
  }

  log(info: LogInfo, callback: () => void): void {
    // Circuit breaker: drop if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      callback();
      return;
    }

    this.buffer.push({
      _msg: info.message,
      level: info.level,
      _time: info.timestamp ?? new Date().toISOString(),
      service: (info as Record<string, unknown>).service ?? 'tracking-backend',
      context: (info as Record<string, unknown>).context,
      ...this.extractMeta(info),
    });

    if (this.buffer.length >= this.batchSize) {
      this.flush().catch(() => {});
    }

    callback();
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) return;

    this.isFlushing = true;
    const batch = this.buffer.splice(0, this.batchSize);

    try {
      const body = batch.map((entry) => JSON.stringify(entry)).join('\n');
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/stream+json' },
        body,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        // Put entries back at the front (up to maxBufferSize)
        const remaining = this.maxBufferSize - this.buffer.length;
        if (remaining > 0) {
          this.buffer.unshift(...batch.slice(0, remaining));
        }
      }
    } catch {
      // Network error — put entries back if buffer has room
      const remaining = this.maxBufferSize - this.buffer.length;
      if (remaining > 0) {
        this.buffer.unshift(...batch.slice(0, remaining));
      }
    } finally {
      this.isFlushing = false;
    }
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  private extractMeta(info: LogInfo): Record<string, unknown> {
    const { level, message, timestamp, service, context, ...meta } = info as Record<string, unknown>;
    return meta;
  }
}
