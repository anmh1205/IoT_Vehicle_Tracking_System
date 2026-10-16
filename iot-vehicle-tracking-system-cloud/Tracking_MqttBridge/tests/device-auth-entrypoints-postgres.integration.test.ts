import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { pool } from '../src/infrastructure/pool';
import { validateDevice } from '../src/infrastructure/database';
import { verifyDeviceToken } from '../src/services/device-auth.service';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? test : test.skip;

integration('rawdata and event/status/firmware auth entrypoints reject stored SHA-256 verifier', {
  timeout: 30_000,
}, async () => {
  // This suite creates a real PUBLIC table visible to the application pool.
  // Never run it against a shared/staging/production database.
  assert.equal(process.env.PGDATABASE, 'ivts_test');
  assert.equal(process.env.POSTGRESQL_DATABASE, 'ivts_test');
  assert.equal(process.env.IVTS_AUTH_ISOLATED_DATABASE, '1');

  const deviceId = 'IVTS_AUTH_TEST_DEVICE';
  const token = 'ivts-raw-token-not-a-hash';
  const storedHash = createHash('sha256').update(token, 'utf8').digest('hex');

  try {
    await pool.query(`CREATE TABLE devices (
      id text PRIMARY KEY,
      device_id text UNIQUE NOT NULL,
      vehicle_id text,
      current_status text,
      last_seen_at timestamptz,
      state_updated_at timestamptz,
      payload_updated_at timestamptz,
      auth_token text NOT NULL,
      is_active boolean NOT NULL
    )`);
    await pool.query(
      `INSERT INTO devices (id, device_id, auth_token, is_active)
       VALUES ('1', $1, $2, TRUE)`,
      [deviceId, storedHash],
    );

    // Run the actual entrypoints that telemetry, status, events and firmware use.
    for (const authenticate of [validateDevice, verifyDeviceToken]) {
      assert.equal((await authenticate(deviceId, token))?.device_id, deviceId);
      assert.equal(await authenticate(deviceId, storedHash), null,
        'Database verifier must not authenticate as a bearer secret');
      assert.equal(await authenticate(deviceId, 'another-invalid-raw-token'), null);
      assert.equal(await authenticate('UNPROVISIONED_DEVICE', token), null);
    }

    await pool.query('UPDATE devices SET is_active = FALSE WHERE device_id = $1', [deviceId]);
    assert.equal(await validateDevice(deviceId, token), null);
    assert.equal(await verifyDeviceToken(deviceId, token), null);

    // Exercise true DB failure, not a fake throwing repository.
    // Raw telemetry has a fail-closed null contract; the other path rethrows
    // for ingress retry/error handling. Both must refuse authentication.
    await pool.query('ALTER TABLE devices RENAME COLUMN auth_token TO auth_disabled');
    assert.equal(await validateDevice(deviceId, token), null,
      'A database error must never become a successful rawdata login');
    await assert.rejects(() => verifyDeviceToken(deviceId, token),
      'An unavailable verifier must never authorize non-raw telemetry');
  } finally {
    try { await pool.query('DROP TABLE IF EXISTS devices'); }
    finally { await pool.end(); }
  }
});
