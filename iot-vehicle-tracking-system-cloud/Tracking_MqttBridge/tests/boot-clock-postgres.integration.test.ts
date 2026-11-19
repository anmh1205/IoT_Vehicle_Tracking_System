import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? test : test.skip;

integration('boot-specific GNSS clock anchor reconstructs untrusted uptime replay only for same boot', async () => {
  assert.equal(process.env.PGDATABASE, 'ivts_test');
  const { pool } = await import('../src/infrastructure/pool');
  const { resolveBootClockTimestamp } = await import('../src/utils/boot-clock.util');
  try {
    const sql = readFileSync(
      new URL('../../Tracking_PostgreSQL/init/32-device-boot-clock-anchor.sql', import.meta.url),
      'utf8',
    );
    await pool.query(sql);
    const receivedAtMs = Date.UTC(2026, 10, 19, 12, 0);
    const trusted = await resolveBootClockTimestamp({
      deviceId: 'IVTS_CLOCK_TEST', bootId: 'boot-1', uptimeMs: 8000,
      timestampTrusted: true, timestampMs: receivedAtMs - 1000,
      timestampSource: 'payload', receivedAtMs,
    });
    assert.equal(trusted.source, 'payload');
    const untrusted = await resolveBootClockTimestamp({
      deviceId: 'IVTS_CLOCK_TEST', bootId: 'boot-1', uptimeMs: 3000,
      timestampTrusted: false, timestampMs: 3000,
      timestampSource: 'server_now', receivedAtMs,
    });
    assert.equal(untrusted.source, 'boot_anchor');
    assert.equal(untrusted.timestampMs, receivedAtMs - 6000);
    const otherBoot = await resolveBootClockTimestamp({
      deviceId: 'IVTS_CLOCK_TEST', bootId: 'boot-2', uptimeMs: 3000,
      timestampTrusted: false, timestampMs: 3000,
      timestampSource: 'server_now', receivedAtMs,
    });
    assert.equal(otherBoot.source, 'untrusted_receive_time');
    assert.equal(otherBoot.timestampMs, receivedAtMs);
  } finally {
    try { await pool.query('DROP TABLE IF EXISTS device_boot_clock_anchors'); }
    finally { await pool.end(); }
  }
});
