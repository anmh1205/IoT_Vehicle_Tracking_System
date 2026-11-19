import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? test : test.skip;

/**
 * A real disposable PostgreSQL database plus a local VictoriaMetrics HTTP
 * stand-in proves that QoS1 staging survives a VM error and drains only on 2xx.
 */
integration('durable telemetry outbox survives VM outage and drains on recovery', async () => {
  assert.equal(process.env.PGDATABASE, 'ivts_test');
  assert.equal(process.env.POSTGRESQL_DATABASE, 'ivts_test');
  let vmStatus = 503;
  const vmBodies: string[] = [];
  const server = createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => { body += chunk; });
    req.on('end', () => {
      vmBodies.push(body);
      res.writeHead(vmStatus);
      res.end('');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  process.env.VICTORIAMETRICS_URL = `http://127.0.0.1:${address.port}`;

  const { pool } = await import('../src/infrastructure/pool');
  const { writeDeviceTelemetry, flushTelemetryMetricOutbox } =
    await import('../src/infrastructure/victoriametrics');

  try {
    const migration = readFileSync(
      new URL('../../Tracking_PostgreSQL/init/31-telemetry-metric-outbox.sql', import.meta.url),
      'utf8',
    );
    await pool.query(migration);

    const id = 'ivts-outbox-replay-1';
    const metric = { latitude: 21.0, speed: 15.5 };
    await assert.rejects(() => writeDeviceTelemetry('IVTS_OB_TEST', metric, 1790000000000, id),
      /VictoriaMetrics rejected telemetry import/);
    const row = await pool.query(
      'SELECT message_id,line_payload FROM telemetry_metric_outbox WHERE device_id=$1',
      ['IVTS_OB_TEST'],
    );
    assert.equal(row.rowCount, 1);
    assert.equal(row.rows[0].message_id, id);
    assert.match(row.rows[0].line_payload, /tracker_telemetry_speed/);

    await assert.rejects(() => writeDeviceTelemetry('IVTS_OB_TEST', metric, 1790000000000, id),
      /VictoriaMetrics rejected telemetry import/);
    const duplicate = await pool.query(
      'SELECT count(*)::int AS count FROM telemetry_metric_outbox WHERE device_id=$1',
      ['IVTS_OB_TEST'],
    );
    assert.equal(duplicate.rows[0].count, 1, 'MQTT redelivery must not stage duplicate rows');

    vmStatus = 204;
    assert.equal(await flushTelemetryMetricOutbox(), 1);
    assert.ok(vmBodies.at(-1)?.includes('tracker_telemetry_latitude'));
    const drained = await pool.query('SELECT count(*)::int AS count FROM telemetry_metric_outbox');
    assert.equal(drained.rows[0].count, 0);
    assert.equal(await flushTelemetryMetricOutbox(), 0);
  } finally {
    try { await pool.query('DROP TABLE IF EXISTS telemetry_metric_outbox'); }
    finally {
      await pool.end();
      await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    }
  }
});
