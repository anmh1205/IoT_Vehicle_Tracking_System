import test from 'node:test';
import assert from 'node:assert/strict';
import {
  closePool,
  completeDeviceSession,
  ensureDeviceSession,
  ensureHistoricalDeviceSession,
  findClosingDeviceSessionIdByIdentity,
  findDeviceSessionIdByIdentity,
  pool,
  touchDeviceSession,
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

test('touchDeviceSession claims message identity in the same transaction as aggregates', async (t) => {
  const originalConnect = writablePool.connect;
  const statements: string[] = [];
  const paramsSeen: Array<unknown[] | undefined> = [];

  writablePool.connect = async () => ({
    query: async (sql, params) => {
      statements.push(sql);
      paramsSeen.push(params);
      if (/INSERT INTO device_session_telemetry_receipts/.test(sql)) {
        return { rows: [{ '?column?': 1 }], rowCount: 1 };
      }
      if (/UPDATE device_sessions/.test(sql)) {
        return { rows: [{ id: 123 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release: () => undefined,
  });

  t.after(() => {
    writablePool.connect = originalConnect;
  });

  await touchDeviceSession({
    deviceId: 'TRACKER_001',
    sessionId: 123,
    messageId: 'boot-1-42',
    deviceTimestampMs: Date.parse('2026-05-10T10:00:00.000Z'),
    serverTimestampMs: Date.parse('2026-05-10T10:00:01.000Z'),
    imuAccelDeltaMps2: 1.5,
    vehicleBattery: 13.4,
    deviceBattery: 4.1,
    updateDeviceState: false,
  });

  assert.equal(statements[0], 'BEGIN');
  const receiptIndex = statements.findIndex((sql) => /INSERT INTO device_session_telemetry_receipts/.test(sql));
  const aggregateIndex = statements.findIndex((sql) => /UPDATE device_sessions/.test(sql));
  assert.ok(receiptIndex > 0);
  assert.ok(aggregateIndex > receiptIndex);
  assert.deepEqual(paramsSeen[receiptIndex], [123, 'boot-1-42']);
  assert.match(statements[receiptIndex], /ON CONFLICT \(session_id, message_id\) DO NOTHING/);

  const sql = statements[aggregateIndex] ?? '';
  assert.match(sql, /imu_accel_samples_count/);
  assert.match(sql, /vehicle_battery_samples_count/);
  assert.match(sql, /device_battery_samples_count/);
  assert.match(sql, /avg_imu_accel_delta_mps2 \* imu_accel_samples_count/);
  assert.match(sql, /min_imu_accel_delta_mps2 = CASE/);
  assert.match(sql, /max_imu_accel_delta_mps2 = CASE/);
  assert.equal(statements.at(-1), 'COMMIT');
});

test('touchDeviceSession ignores a duplicate message without mutating aggregates', async (t) => {
  const originalConnect = writablePool.connect;
  const statements: string[] = [];

  writablePool.connect = async () => ({
    query: async (sql) => {
      statements.push(sql);
      if (/INSERT INTO device_session_telemetry_receipts/.test(sql)) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    },
    release: () => undefined,
  });

  t.after(() => {
    writablePool.connect = originalConnect;
  });

  await touchDeviceSession({
    deviceId: 'TRACKER_001',
    sessionId: 123,
    messageId: 'boot-1-42',
    deviceTimestampMs: Date.parse('2026-05-10T10:00:00.000Z'),
    serverTimestampMs: Date.parse('2026-05-10T10:00:01.000Z'),
    updateDeviceState: false,
  });

  assert.equal(statements.some((sql) => /UPDATE device_sessions/.test(sql)), false);
  assert.equal(statements.some((sql) => /UPDATE devices/.test(sql)), false);
  assert.equal(statements.at(-1), 'COMMIT');
});

test('ensureDeviceSession returns sessions atomically retired by a replacement identity', async (t) => {
  const originalConnect = writablePool.connect;
  const statements: string[] = [];
  const paramsSeen: Array<unknown[] | undefined> = [];

  writablePool.connect = async () => ({
    query: async (sql, params) => {
      statements.push(sql);
      paramsSeen.push(params);

      if (
        /FROM device_sessions\s+WHERE device_id = \$1\s+AND firmware_boot_id = \$2\s+AND local_session_key = \$3/.test(sql)
      ) {
        return { rows: [], rowCount: 0 };
      }

      if (
        /FROM device_sessions\s+WHERE device_id = \$1 AND status = 'running'\s+ORDER BY created_at DESC/.test(sql)
      ) {
        return {
          rows: [{
            id: 321,
            status: 'running',
            local_session_key: '4',
            firmware_boot_id: 'old-boot',
            boundary_source: 'firmware',
          }],
          rowCount: 1,
        };
      }

      if (/UPDATE device_sessions[\s\S]+end_reason = COALESCE\(end_reason, 'superseded'\)/.test(sql)) {
        assert.match(sql, /RETURNING id, COALESCE\(total_runtime_seconds, uptime, 0\)::text AS runtime_seconds/);
        return { rows: [{ id: 321, runtime_seconds: '123' }], rowCount: 1 };
      }

      if (/UPDATE devices[\s\S]+total_runtime_seconds/.test(sql)) {
        return { rows: [], rowCount: 1 };
      }

      if (/INSERT INTO device_sessions/.test(sql)) {
        return { rows: [{ id: 654, status: 'running' }], rowCount: 1 };
      }

      return { rows: [], rowCount: 0 };
    },
    release: () => undefined,
  });

  t.after(() => {
    writablePool.connect = originalConnect;
  });

  const result = await ensureDeviceSession(
    'TRACKER_001',
    Date.parse('2026-05-10T10:00:00.000Z'),
    Date.parse('2026-05-10T10:00:01.000Z'),
    {
      localSessionKey: 5,
      bootId: 'new-boot',
      canonicalSource: 'server',
      boundarySource: 'firmware',
      startReason: 'ignition_on',
    },
  );

  assert.equal(result.sessionId, 654);
  assert.equal(result.isNew, true);
  assert.deepEqual(result.retiredSessionIds, [321]);
  assert.ok(
    statements.some(
      (sql) =>
        /UPDATE device_sessions/.test(sql)
        && /status = 'completed'/.test(sql)
        && /RETURNING id/.test(sql),
    ),
  );

  const runtimeUpdateIndex = statements.findIndex(
    (sql) => /UPDATE devices[\s\S]+total_runtime_seconds/.test(sql),
  );
  assert.ok(runtimeUpdateIndex >= 0);
  assert.deepEqual(paramsSeen[runtimeUpdateIndex], ['TRACKER_001', 123]);
});
