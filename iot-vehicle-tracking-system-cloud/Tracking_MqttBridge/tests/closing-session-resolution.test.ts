import test from 'node:test';
import assert from 'node:assert/strict';
import {
  closePool,
  findClosingDeviceSessionIdByIdentity,
  pool,
} from '../src/infrastructure/database';

const writablePool = pool as unknown as {
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
