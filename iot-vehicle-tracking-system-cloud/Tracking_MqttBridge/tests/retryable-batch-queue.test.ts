import test from 'node:test';
import assert from 'node:assert/strict';
import { createRetryableBatchQueue } from '../src/services/retryable-batch-queue';

test('a PostgreSQL failure retains original batch and recovers after backoff', async () => {
  let nowMs = 1000;
  let attempts = 0;
  const accepted: number[] = [];
  const failures: number[] = [];
  const recovered: number[] = [];

  const queue = createRetryableBatchQueue<number>({
    capacity: 10,
    batchSize: 2,
    now: () => nowMs,
    writeBatch: async (values) => {
      attempts += 1;
      if (attempts < 3) throw new Error('postgres unavailable');
      accepted.push(...values);
    },
    onDropped: () => assert.fail('unexpected loss'),
    onFailure: (_error, count) => failures.push(count),
    onRecovered: (count) => recovered.push(count),
  });

  queue.enqueue(1);
  queue.enqueue(2);
  assert.equal(await queue.flush(), false);
  assert.equal(queue.pendingCount(), 2);
  assert.equal(await queue.flush(), false); // not due yet
  assert.equal(attempts, 1);
  nowMs += 1000;
  assert.equal(await queue.flush(), false);
  assert.equal(queue.pendingCount(), 2);
  nowMs += 2000;
  assert.equal(await queue.flush(), true);
  assert.deepEqual(accepted, [1, 2]);
  assert.deepEqual(failures, [1, 2]);
  assert.deepEqual(recovered, [2]);
  assert.equal(queue.pendingCount(), 0);
});

test('overlapping flush requests share the same transaction and preserve later updates', async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  const saved: number[][] = [];
  const queue = createRetryableBatchQueue<number>({
    capacity: 4,
    batchSize: 2,
    writeBatch: async (values) => {
      saved.push([...values]);
      if (saved.length === 1) await blocked;
    },
    onDropped: () => assert.fail('unexpected drop'),
    onFailure: () => assert.fail('unexpected failure'),
  });

  queue.enqueue(1);
  queue.enqueue(2);
  const first = queue.flush();
  const second = queue.flush();
  assert.equal(first, second);
  queue.enqueue(3);
  assert.equal(queue.pendingCount(), 3);
  release();
  assert.equal(await first, true);
  assert.equal(queue.pendingCount(), 1);
  assert.equal(await queue.flush(), true);
  assert.deepEqual(saved, [[1, 2], [3]]);
});

test('at full capacity, evict an older queued snapshot, never an in-flight transaction', async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  const dropped: number[] = [];
  const saved: number[][] = [];
  const queue = createRetryableBatchQueue<number>({
    capacity: 3,
    batchSize: 1,
    writeBatch: async (batch) => {
      saved.push([...batch]);
      if (saved.length === 1) await blocked;
    },
    onDropped: (value) => dropped.push(value),
    onFailure: () => assert.fail('unexpected failure'),
  });

  queue.enqueue(1);
  const writing = queue.flush();
  queue.enqueue(2);
  queue.enqueue(3);
  queue.enqueue(4);
  assert.deepEqual(dropped, [2]);
  release();
  await writing;
  await queue.flush();
  await queue.flush();
  assert.deepEqual(saved, [[1], [3], [4]]);
  assert.equal(queue.pendingCount(), 0);
});

test('a failed in-flight transaction is put back ahead of more recent arrivals', async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  const saved: number[][] = [];
  let fail = true;
  const queue = createRetryableBatchQueue<number>({
    capacity: 4,
    batchSize: 2,
    now: () => 0,
    writeBatch: async (values) => {
      if (fail) {
        await blocked;
        throw new Error('rollback');
      }
      saved.push([...values]);
    },
    onDropped: () => assert.fail('unexpected drop'),
    onFailure: () => {},
  });

  queue.enqueue(1);
  queue.enqueue(2);
  const first = queue.flush();
  queue.enqueue(3);
  release();
  assert.equal(await first, false);
  assert.equal(queue.pendingCount(), 3);
  fail = false;
  assert.equal(await queue.flush(true), true);
  assert.equal(await queue.flush(true), true);
  assert.deepEqual(saved, [[1, 2], [3]]);
});

test('invalid capacity is rejected before starting the queue', () => {
  assert.throws(() => createRetryableBatchQueue<number>({
    capacity: 0, batchSize: 1, writeBatch: async () => {},
    onFailure: () => {}, onDropped: () => {},
  }), /Invalid retryable batch queue capacity/);
});


test('a recovery observer failure must never replay a committed batch', async () => {
  let attempts = 0;
  let nowMs = 0;
  const queue = createRetryableBatchQueue<number>({
    capacity: 4,
    batchSize: 2,
    now: () => nowMs,
    writeBatch: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('database outage');
    },
    onDropped: () => assert.fail('unexpected drop'),
    onFailure: () => {},
    onRecovered: () => { throw new Error('logger unavailable'); },
  });
  queue.enqueue(12);
  assert.equal(await queue.flush(), false);
  nowMs = 1000;
  assert.equal(await queue.flush(), true);
  assert.equal(queue.pendingCount(), 0);
  assert.equal(attempts, 2);
});
