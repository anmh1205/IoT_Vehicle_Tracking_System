/**
 * In-memory queue for best-effort live-state snapshots.
 *
 * An in-flight batch is kept separate until its transaction commits. A failed
 * write returns to the front of the queue and is retried after backoff, so a
 * transient database outage cannot permanently open the writer circuit.
 *
 * Memory is bounded; overflow is deliberately reported. This is not a durable
 * outbox and cannot guarantee persistence across a process crash.
 */
export interface RetryableBatchQueue<T> {
  enqueue(value: T): boolean;
  flush(force?: boolean): Promise<boolean>;
  pendingCount(): number;
}

export interface RetryableBatchQueueOptions<T> {
  capacity: number;
  batchSize: number;
  writeBatch: (values: readonly T[]) => Promise<void>;
  onDropped: (value: T) => void;
  onFailure: (error: unknown, failures: number, retryMs: number) => void;
  onRecovered?: (previousFailures: number) => void;
  now?: () => number;
}

export const createRetryableBatchQueue = <T>(
  options: RetryableBatchQueueOptions<T>,
): RetryableBatchQueue<T> => {
  if (
    !Number.isSafeInteger(options.capacity) ||
    !Number.isSafeInteger(options.batchSize) ||
    options.capacity < 1 ||
    options.batchSize < 1 ||
    options.batchSize > options.capacity
  ) {
    throw new Error('Invalid retryable batch queue capacity');
  }

  const now = options.now ?? Date.now;
  const pending: T[] = [];
  let inFlight: Promise<boolean> | null = null;
  let inFlightSize = 0;
  let failures = 0;
  let nextRetryAt = 0;

  return {
    pendingCount: () => pending.length + inFlightSize,

    enqueue(value: T): boolean {
      if (pending.length + inFlightSize >= options.capacity) {
        if (pending.length === 0) {
          options.onDropped(value);
          return false;
        }
        // Prefer the newer live snapshot when a prolonged outage exhausts RAM.
        options.onDropped(pending.shift()!);
      }
      pending.push(value);
      return true;
    },

    flush(force = false): Promise<boolean> {
      if (inFlight) {
        return inFlight;
      }
      if (pending.length === 0) {
        return Promise.resolve(true);
      }
      if (!force && now() < nextRetryAt) {
        return Promise.resolve(false);
      }

      const batch = pending.splice(0, options.batchSize);
      inFlightSize = batch.length;

      const job = (async (): Promise<boolean> => {
        try {
          await options.writeBatch(batch);
          const previousFailures = failures;
          failures = 0;
          nextRetryAt = 0;
          if (previousFailures) {
            try {
              options.onRecovered?.(previousFailures);
            } catch {
              // A failed observer must not classify a committed write as failed
              // or replay the same batch after it has already been committed.
            }
          }
          return true;
        } catch (error) {
          pending.unshift(...batch);
          failures += 1;
          const retryMs = Math.min(30_000, 1000 * (2 ** Math.min(failures - 1, 5)));
          nextRetryAt = now() + retryMs;
          options.onFailure(error, failures, retryMs);
          return false;
        } finally {
          inFlightSize = 0;
          inFlight = null;
        }
      })();

      inFlight = job;
      return job;
    },
  };
};
