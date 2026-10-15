import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

// Extract the actual parameterized SQL issued by the batch writer, so
// Postgres executes production query text instead of a rewritten approximation.
const source = readFileSync(new URL('../src/services/batch-writer.service.ts', import.meta.url), 'utf8');
const statementStart = source.indexOf('UPDATE device_sessions', source.indexOf('const persistBatch'));
const statementEnd = source.indexOf('`', statementStart);
const sql = statementStart < 0 || statementEnd < 0
  ? ''
  : source.slice(statementStart, statementEnd);
const integrationTest = process.env.IVTS_PG_INTEGRATION === '1' ? test : test.skip;

integrationTest('real PostgreSQL rejects delayed, closed and cross-device batch coordinates', async () => {
  assert.match(sql, /AND device_id = \$5/);
  assert.match(sql, /AND status = 'running'/);
  assert.match(sql, /to_timestamp\(\$6 \/ 1000\.0\) >=/);

  const pool = new Pool({
    host: process.env.PGHOST ?? '127.0.0.1',
    port: Number(process.env.PGPORT ?? '5432'),
    user: process.env.PGUSER ?? 'ivts_test',
    password: process.env.PGPASSWORD ?? 'ivts_test_password',
    database: process.env.PGDATABASE ?? 'ivts_test',
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TABLE device_sessions (
      id bigint PRIMARY KEY,
      device_id text NOT NULL,
      status text NOT NULL,
      last_update timestamptz,
      last_latitude double precision,
      last_longitude double precision,
      last_speed double precision,
      updated_at timestamptz
    )`);
    await client.query(
      `INSERT INTO device_sessions
       (id, device_id, status, last_update, last_latitude, last_longitude, last_speed)
       VALUES
       (1, 'DEV-A', 'running', '2026-10-15T10:00:00Z', 10, 20, 30),
       (2, 'DEV-A', 'completed', '2026-10-15T10:00:00Z', 40, 50, 60)`,
    );

    const update = async (id: number, deviceId: string, when: string, lat: number) =>
      client.query(sql, [id, lat, lat + 1, lat + 2, deviceId, Date.parse(when)]);

    assert.equal((await update(1, 'DEV-A', '2026-10-15T09:00:00Z', 99)).rowCount, 0);
    assert.equal((await update(1, 'DEV-B', '2026-10-15T11:00:00Z', 88)).rowCount, 0);
    assert.equal((await update(2, 'DEV-A', '2026-10-15T11:00:00Z', 77)).rowCount, 0);
    assert.equal((await update(1, 'DEV-A', '2026-10-15T10:00:00Z', 11)).rowCount, 1);

    let positions = await client.query('SELECT id, last_latitude, last_longitude, last_speed FROM device_sessions ORDER BY id');
    assert.deepEqual(positions.rows.map((x) => [Number(x.last_latitude), Number(x.last_longitude), Number(x.last_speed)]), [[11, 12, 13], [40, 50, 60]]);

    assert.equal((await update(1, 'DEV-A', '2026-10-15T12:00:00Z', 12)).rowCount, 1);
    positions = await client.query('SELECT last_latitude FROM device_sessions WHERE id = 1');
    assert.equal(Number(positions.rows[0].last_latitude), 12);
  } finally {
    try { await client.query('ROLLBACK'); } finally { client.release(); await pool.end(); }
  }
});
