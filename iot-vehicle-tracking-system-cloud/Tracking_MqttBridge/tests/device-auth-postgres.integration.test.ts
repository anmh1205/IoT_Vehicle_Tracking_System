import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

const integrationTest = process.env.IVTS_PG_INTEGRATION === '1' ? test : test.skip;

// Execute the actual MQTT Bridge SQL from both authentication paths rather than
// an approximation maintained separately from production code.
const readAuthQuery = (file: string, functionName: string): string => {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const at = source.indexOf(`export const ${functionName}`);
  assert.ok(at >= 0, `${functionName} not found`);
  const begin = source.indexOf('`SELECT id, device_id, vehicle_id, current_status', at);
  assert.ok(begin >= 0, `${functionName} query not found`);
  const end = source.indexOf('`', begin + 1);
  assert.ok(end > begin, `${functionName} SQL terminator missing`);
  return source.slice(begin + 1, end);
};

integrationTest('real PostgreSQL requires the raw device secret, never a stolen SHA-256 verifier', async () => {
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
    await client.query(`CREATE TEMP TABLE devices (
      id text PRIMARY KEY, device_id text, vehicle_id text, current_status text,
      last_seen_at timestamptz, state_updated_at timestamptz, payload_updated_at timestamptz,
      auth_token text, is_active boolean
    )`);
    const secret = 'raw-field-device-secret';
    const digest = createHash('sha256').update(secret).digest('hex');
    await client.query(
      "INSERT INTO devices(id,device_id,vehicle_id,auth_token,is_active) VALUES('1','DEV-1','V1',$1,TRUE)",
      [digest],
    );

    for (const [file, fn] of [
      ['../src/infrastructure/database.ts', 'validateDevice'],
      ['../src/services/device-auth.service.ts', 'verifyDeviceToken'],
    ]) {
      const sql = readAuthQuery(file, fn);
      assert.match(sql, /auth_token = encode\(sha256\(\$2::bytea\), 'hex'\)/);
      assert.doesNotMatch(sql, /OR\s+auth_token\s*=/i);
      assert.doesNotMatch(sql, /\$3\b/, 'query must bind only deviceId and raw token');
      assert.match(sql, /is_active\s*=\s*true/i);
      assert.equal((await client.query(sql, ['DEV-1', secret])).rowCount, 1);
      assert.equal((await client.query(sql, ['DEV-1', digest])).rowCount, 0);
      assert.equal((await client.query(sql, ['DEV-1', 'wrong-secret'])).rowCount, 0);
      assert.equal((await client.query(sql, ['DEV-unknown', secret])).rowCount, 0);
      await client.query("UPDATE devices SET is_active=FALSE WHERE device_id='DEV-1'");
      assert.equal((await client.query(sql, ['DEV-1', secret])).rowCount, 0);
      await client.query("UPDATE devices SET is_active=TRUE WHERE device_id='DEV-1'");
    }
  } finally {
    try { await client.query('ROLLBACK'); }
    finally { client.release(); await pool.end(); }
  }
});
