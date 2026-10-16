import assert from 'node:assert/strict';
import test from 'node:test';
import mqtt, { type MqttClient } from 'mqtt';
import { Pool } from 'pg';
import { installBridgeIngress } from '../src/mqtt/ingress';

const integration = process.env.IVTS_EMQX_INTEGRATION === '1'
  && process.env.IVTS_PG_INTEGRATION === '1' ? test : test.skip;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const connect = (client: MqttClient): Promise<void> => new Promise((resolve, reject) => {
  client.once('connect', () => resolve());
  client.once('error', reject);
});
const disconnect = (client: MqttClient | null): Promise<void> => new Promise((resolve) => {
  if (!client) { resolve(); return; }
  client.end(true, {}, resolve);
});

integration('EMQX PUBACK follows real committed PostgreSQL handler work, never an uncommitted INSERT', {
  timeout: 45_000,
}, async () => {
  // The test deliberately creates/clears a public table, NEVER target a real DB.
  assert.equal(process.env.PGDATABASE, 'ivts_test_ingress');
  assert.equal(process.env.IVTS_INGRESS_TEST_ISOLATED, '1');
  const pool = new Pool({
    host: process.env.PGHOST ?? '127.0.0.1',
    port: Number(process.env.PGPORT ?? '5432'),
    user: process.env.PGUSER ?? 'ivts_test',
    password: process.env.PGPASSWORD ?? 'ivts_test_password',
    database: process.env.PGDATABASE,
    max: 3,
  });
  let subscriber: MqttClient | null = null;
  let publisher: MqttClient | null = null;
  const clientId = `ivts-pg-ack-${process.env.GITHUB_RUN_ID ?? process.pid}`;
  const topic = `v1/IVTS_PG_ACK_${process.env.GITHUB_RUN_ID ?? process.pid}/events`;
  const receiptTable = 'ivts_qos1_commit_receipts';

  try {
    await pool.query(`CREATE TABLE ${receiptTable} (
      message_id integer PRIMARY KEY, topic text NOT NULL, committed_at timestamptz NOT NULL DEFAULT now()
    )`);

    subscriber = mqtt.connect('mqtt://127.0.0.1:1883', {
      clientId, clean: false, reconnectPeriod: 0, connectTimeout: 10_000,
    });

    let releaseCommit!: () => void;
    const allowCommit = new Promise<void>((resolve) => { releaseCommit = resolve; });
    let processingStarted!: () => void;
    const entered = new Promise<void>((resolve) => { processingStarted = resolve; });
    let inboundId: number | null = null;
    let pubacked = false;
    let ackReceived!: () => void;
    const ack = new Promise<void>((resolve) => { ackReceived = resolve; });

    // Actual MQTT Bridge ingress installer and its handleMessage PUBACK gate.
    installBridgeIngress(subscriber, async (receivedTopic, message) => {
      const parsed = JSON.parse(message.toString()) as { message_id: number };
      assert.equal(receivedTopic, topic);
      const writer = await pool.connect();
      try {
        await writer.query('BEGIN');
        await writer.query(`INSERT INTO ${receiptTable}(message_id, topic) VALUES ($1, $2)`,
          [parsed.message_id, receivedTopic]);
        processingStarted();
        await allowCommit; // No committed row and no PUBACK before this gate opens.
        await writer.query('COMMIT');
      } catch (error) {
        await writer.query('ROLLBACK');
        throw error;
      } finally {
        writer.release();
      }
    });

    subscriber.on('packetreceive', (packet) => {
      if (packet.cmd === 'publish' && packet.qos === 1 && packet.topic === topic) {
        inboundId = packet.messageId;
      }
    });
    subscriber.on('packetsend', (packet) => {
      if (packet.cmd === 'puback' && inboundId !== null && packet.messageId === inboundId) {
        pubacked = true;
        ackReceived();
      }
    });

    await connect(subscriber);
    await new Promise<void>((resolve, reject) =>
      subscriber!.subscribe(topic, { qos: 1 }, (err) => err ? reject(err) : resolve()));

    publisher = mqtt.connect('mqtt://127.0.0.1:1883', {
      clientId: `ivts-pg-publisher-${process.env.GITHUB_RUN_ID ?? process.pid}`,
      clean: true, reconnectPeriod: 0, connectTimeout: 10_000,
    });
    await connect(publisher);
    await new Promise<void>((resolve, reject) =>
      publisher!.publish(topic, Buffer.from('{"message_id":101}'), { qos: 1 },
        (err) => err ? reject(err) : resolve()));

    await Promise.race([entered, wait(10_000).then(() => {
      throw new Error('QoS1 message did not enter the SQL transaction');
    })]);
    assert.ok(inboundId !== null, 'broker did not assign a QoS1 packet id');

    // We hold the transaction open long enough to inspect another DB connection.
    await wait(250);
    assert.equal(pubacked, false, 'bridge ACKed before database transaction committed');
    const before = await pool.query(`SELECT count(*)::int AS total FROM ${receiptTable}`);
    assert.equal(before.rows[0].total, 0, 'uncommitted insert cannot be observed');

    releaseCommit();
    await Promise.race([ack, wait(10_000).then(() => {
      throw new Error('PUBACK not sent after SQL COMMIT');
    })]);
    const after = await pool.query(`SELECT message_id, topic FROM ${receiptTable}`);
    assert.deepEqual(after.rows, [{ message_id: 101, topic }]);
    assert.equal(pubacked, true);
  } finally {
    await Promise.allSettled([disconnect(subscriber), disconnect(publisher)]);
    try { await pool.query(`DROP TABLE IF EXISTS ${receiptTable}`); }
    finally { await pool.end(); }
  }
});
