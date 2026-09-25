import test from 'node:test';
import assert from 'node:assert/strict';
import {
  closePool,
  completeDeviceSession,
  ensureHistoricalDeviceSession,
  findClosingDeviceSessionIdByIdentity,
  findDeviceSessionIdByIdentity,
  pool,
} from '../src/infrastructure/database';

const writablePool = pool as unknown as {
  connect: () => Promise<{
    query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number }>;
    release: () => void;
  }>;
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ id: number }> }>;
};

test.after(async () => {
  await closePool();
});

test('findClosingDeviceSessionIdByIdentity matches completed sessions near the close timestamp', async (t) => {
  const originalQuery = writablePool.query;
  let capturedSql = '';
  let capturedParams: unknown[] | undefined;

  writablePool.query = async (sql, params) => {
    capturedSql = sql;
    capturedParams = params;
    return { rows: [{ id: 215 }] };
  };

  t.after(() => {
    writablePool.query = originalQuery;
  });

  const sessionId = await findClosingDeviceSessionIdByIdentity(
    'TRACKER_001',
    { bootId: 'boot-1', localSessionKey: undefined },
    Date.parse('2026-05-10T10:44:04.000Z'),
    Date.parse('2026-05-10T10:44:05.000Z'),
  );

  assert.equal(sessionId, 215);
  assert.match(capturedSql, /status = 'completed'/);
  assert.match(capturedSql, /session_end/);
  assert.match(capturedSql, /server_session_end/);
  assert.match(capturedSql, /firmware_boot_id = \$5/);
  assert.equal(capturedParams?.[0], 'TRACKER_001');
  assert.equal(capturedParams?.[4], 'boot-1');
});

test('findClosingDeviceSessionIdByIdentity skips lookup without session identity', async (t) => {
  const originalQuery = writablePool.query;
  let called = false;

  writablePool.query = async () => {
    called = true;
    return { rows: [] };
  };

  t.after(() => {
    writablePool.query = originalQuery;
  });

  const sessionId = await findClosingDeviceSessionIdByIdentity(
    'TRACKER_001',
    {},
    Date.parse('2026-05-10T10:44:04.000Z'),
  );

  assert.equal(sessionId, null);
  assert.equal(called, false);
});

test('findDeviceSessionIdByIdentity skips ambiguous local session key without boot id', async (t) => {
  const originalQuery = writablePool.query;
  let called = false;

  writablePool.query = async () => {
    called = true;
    return { rows: [{ id: 999 }] };
  };

  t.after(() => {
    writablePool.query = originalQuery;
  });

  const sessionId = await findDeviceSessionIdByIdentity(
    'TRACKER_001',
    { localSessionKey: 1 },
  );

  assert.equal(sessionId, null);
  assert.equal(called, false);
});

test('completeDeviceSession discards completed sessions without telemetry points regardless of runtime', async (t) => {
  const originalConnect = writablePool.connect;
  const statements: string[] = [];

  writablePool.connect = async () => ({
    query: async (sql) => {
      statements.push(sql);

      if (/SELECT id, status, COALESCE\(data_points_count/.test(sql)) {
        return { rows: [{ id: 321, status: 'running', data_points_count: '0' }] };
      }

      if (/RETURNING COALESCE\(total_runtime_seconds/.test(sql)) {
        return { rows: [{ runtime_seconds: '999' }] };
      }

      return { rows: [] };
    },
    release: () => undefined,
  });

  t.after(() => {
    writablePool.connect = originalConnect;
  });

  const result = await completeDeviceSession(
    'TRACKER_001',
    Date.parse('2026-05-10T10:44:04.000Z'),
    321,
    Date.parse('2026-05-10T10:44:05.000Z'),
    'stopped',
  );

  assert.deepEqual(result, { sessionId: 321, discarded: true, completedNow: true });
  assert.ok(statements.some((sql) => /DELETE FROM device_sessions WHERE id = \$1/.test(sql)));
  assert.equal(statements.some((sql) => /SET total_runtime_seconds/.test(sql)), false);
});

test('completeDeviceSession reports duplicate completed boundaries as no-op', async (t) => {
  const originalConnect = writablePool.connect;
  const statements: string[] = [];

  writablePool.connect = async () => ({
    query: async (sql) => {
      statements.push(sql);
      if (/SELECT id, status, COALESCE\(data_points_count/.test(sql)) {
        return { rows: [{ id: 654, status: 'completed', data_points_count: '10' }] };
      }
      return { rows: [] };
    },
    release: () => undefined,
  });

  t.after(() => {
    writablePool.connect = originalConnect;
  });

  const result = await completeDeviceSession(
    'TRACKER_001',
    Date.parse('2026-05-10T10:44:04.000Z'),
    654,
    Date.parse('2026-05-10T10:44:04.000Z'),
    'stopped',
  );

  assert.deepEqual(result, { sessionId: 654, discarded: false, completedNow: false });
  assert.equal(statements.some((sql) => /UPDATE device_sessions\s+SET\s+status = 'completed'/.test(sql)), false);
});

test('ensureHistoricalDeviceSession never supersedes a newer running session', async (t) => {
  const originalConnect = writablePool.connect;
  const statements: string[] = [];

  writablePool.connect = async () => ({
    query: async (sql) => {
      statements.push(sql);
      if (/WHERE device_id = \$1\s+AND firmware_boot_id = \$2\s+AND local_session_key = \$3/.test(sql)) {
        return { rows: [] };
      }
      if (/INSERT INTO device_sessions/.test(sql)) {
        return { rows: [{ id: 777, status: 'running' }] };
      }
      return { rows: [] };
    },
    release: () => undefined,
  });

  t.after(() => {
    writablePool.connect = originalConnect;
  });

  const result = await ensureHistoricalDeviceSession(
    'TRACKER_001',
    Date.parse('2026-05-10T08:00:00.000Z'),
    { localSessionKey: 17, bootId: 'old-boot' },
  );

  assert.deepEqual(result, { sessionId: 777, isNew: true, status: 'running' });
  const insertSql = statements.find((sql) => /INSERT INTO device_sessions/.test(sql)) ?? '';
  assert.match(insertSql, /0, \$2, \$2, NOW\(\)/);
  assert.equal(
    statements.some((sql) => /end_reason = COALESCE\(end_reason, 'superseded'\)/.test(sql)),
    false,
  );
  assert.equal(
    statements.some((sql) => /UPDATE device_sessions[\s\S]+status = 'completed'/.test(sql)),
    false,
  );
});
