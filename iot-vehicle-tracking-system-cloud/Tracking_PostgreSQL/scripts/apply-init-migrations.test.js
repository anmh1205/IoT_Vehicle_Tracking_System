const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'apply-init-migrations.js'), 'utf8');

function runScenario({
  sql = 'CREATE TABLE IF NOT EXISTS example (id integer);',
  dryRun = false,
  existingTables = [],
  recorded = [],
  failExecution = false,
  fileName = '01-example.sql',
  oldStaticCredential = false,
} = {}) {
  const writes = [];
  const errors = [];
  const logs = [];
  const tables = new Set(existingTables);
  const runner = {
    mode: 'mock',
    queryRows(query) {
      if (query.includes('SELECT filename, checksum, applied_mode')) return recorded;
      if (query.includes('SELECT username FROM users')) return oldStaticCredential ? [['admin']] : [];
      if (query.includes('information_schema.tables')) return [...tables].map((name) => [name]);
      return [];
    },
    execSql(text) {
      writes.push(text);
      if (failExecution && text.includes('BEGIN;')) throw new Error('simulated DDL failure');
    },
  };
  const fakeFs = {
    readdirSync: () => [fileName],
    readFileSync: () => sql,
  };
  const customRequire = (name) => {
    if (name === 'node:fs') return fakeFs;
    if (name === './postgres-env-loader') return { loadPostgresEnv: () => ({ values: {} }) };
    if (name === './postgres-command-runner') {
      return { createPostgresCommandRunner: () => runner };
    }
    return require(name);
  };
  const processStub = {
    argv: ['node', 'apply-init-migrations.js', ...(dryRun ? ['--dry-run'] : [])],
    exit(code) { throw Object.assign(new Error('process.exit'), { exitCode: code }); },
  };
  let failed = false;
  try {
    vm.runInNewContext(source, {
      require: customRequire,
      __dirname,
      process: processStub,
      console: { log: (...args) => logs.push(args.join(' ')), error: (...args) => errors.push(args.join(' ')) },
    }, { filename: 'apply-init-migrations.js' });
  } catch (error) {
    if (error.exitCode !== 1) throw error;
    failed = true;
  }
  return { writes, logs, errors, failed };
}

test('dry-run on an uninitialized DB performs no DDL or tracking-table writes', () => {
  const result = runScenario({ dryRun: true });
  assert.equal(result.failed, false);
  assert.deepEqual(result.writes, []);
  assert.match(result.logs.join(' '), /plan 01-example\.sql: executed/);
});

test('dry-run on a tracked database does not mutate it', () => {
  const sql = 'CREATE TABLE example (id integer);';
  const checksum = crypto.createHash('sha256').update(sql).digest('hex');
  const result = runScenario({
    sql, dryRun: true, existingTables: ['init_schema_migrations'],
    recorded: [['01-example.sql', checksum, 'executed']],
  });
  assert.equal(result.failed, false);
  assert.deepEqual(result.writes, []);
});

test('checksum drift fails instead of silently skipping an edited migration', () => {
  const result = runScenario({
    recorded: [['01-example.sql', 'bad-hash', 'executed']],
  });
  assert.equal(result.failed, true);
  assert.match(result.errors.join(' '), /Migration checksum drift/);
  assert.equal(result.writes.some((write) => write.includes('BEGIN;')), false);
});

test('partial legacy baseline fails without recording the incomplete schema', () => {
  const result = runScenario({
    sql: 'CREATE TABLE IF NOT EXISTS example (id integer); CREATE TABLE IF NOT EXISTS missing (id integer);',
    existingTables: ['example'],
  });
  assert.equal(result.failed, true);
  assert.match(result.errors.join(' '), /Cannot baseline incomplete migration/);
  assert.equal(result.writes.some((write) => write.includes("VALUES ('01-example.sql'")), false);
});

test('fresh migration and receipt commit in one transaction', () => {
  const result = runScenario();
  assert.equal(result.failed, false);
  const apply = result.writes.find((write) => write.includes('BEGIN;'));
  assert.ok(apply);
  assert.match(apply, /CREATE TABLE IF NOT EXISTS example/);
  assert.match(apply, /INSERT INTO init_schema_migrations/);
  assert.match(apply, /COMMIT;/);
  assert.equal(result.writes.filter((write) => write.includes("VALUES ('01-example.sql'")).length, 1);
});

test('failed migration never writes a standalone success receipt', () => {
  const result = runScenario({ failExecution: true });
  assert.equal(result.failed, true);
  assert.match(result.errors.join(' '), /simulated DDL failure/);
  assert.equal(result.writes.filter((write) => write.includes("VALUES ('01-example.sql'")).length, 1);
});

test('fully present legacy schema baselines without re-executing DDL', () => {
  const result = runScenario({ existingTables: ['example'] });
  assert.equal(result.failed, false);
  assert.equal(result.writes.filter((write) => write.includes('BEGIN;')).length, 0);
  assert.equal(result.writes.filter((write) => write.includes("VALUES ('01-example.sql'")).length, 1);
});

const secureUsersSql = fs.readFileSync(path.join(__dirname, '../init/01-users.sql'), 'utf8');
const historicalUsersChecksum = '7e58d1f34242bd92a259725607e4f75193a733d73ad5bf3fc01111a74200fe55';
const secureUsersChecksum = 'd4f55f77e2ee06e83ef1e46e0a43638c907a22d1199f6e7daa9045d1bfc11014';

test('only the pinned seed-removal SQL is accepted as a historical reconciliation', () => {
  assert.equal(crypto.createHash('sha256').update(secureUsersSql).digest('hex'), secureUsersChecksum);
  const result = runScenario({
    fileName: '01-users.sql',
    sql: secureUsersSql,
    recorded: [['01-users.sql', historicalUsersChecksum, 'executed']],
  });
  assert.equal(result.failed, false);
  assert.match(result.logs.join(' '), /reconcile 01-users.sql/);
  assert.equal(result.writes.some((write) => write.includes('BEGIN;')), false);
  assert.equal(result.writes.filter((write) => write.includes(secureUsersChecksum)).length, 1);
});

test('known privileged seed blocks existing installation until operator rotates password', () => {
  const result = runScenario({
    fileName: '01-users.sql',
    sql: secureUsersSql,
    recorded: [['01-users.sql', historicalUsersChecksum, 'executed']],
    oldStaticCredential: true,
  });
  assert.equal(result.failed, true);
  assert.match(result.errors.join(' '), /Rotate the admin password/);
  assert.equal(result.writes.some((write) => write.includes(secureUsersChecksum)), false);
});

test('dry-run reports planned seed reconciliation without writes', () => {
  const result = runScenario({
    fileName: '01-users.sql',
    sql: secureUsersSql,
    recorded: [['01-users.sql', historicalUsersChecksum, 'baseline']],
    dryRun: true,
  });
  assert.equal(result.failed, false);
  assert.match(result.logs.join(' '), /plan 01-users.sql/);
  assert.deepEqual(result.writes, []);
});

test('even 01-users.sql does not permit arbitrary checksum drift', () => {
  const result = runScenario({
    fileName: '01-users.sql',
    sql: secureUsersSql + '\n-- unexpected modification',
    recorded: [['01-users.sql', historicalUsersChecksum, 'executed']],
  });
  assert.equal(result.failed, true);
  assert.match(result.errors.join(' '), /Migration checksum drift/);
});

test('legacy database without receipts also refuses the old default admin', () => {
  const result = runScenario({
    fileName: '01-users.sql',
    sql: secureUsersSql,
    existingTables: ['users'],
    oldStaticCredential: true,
  });
  assert.equal(result.failed, true);
  assert.match(result.errors.join(' '), /Rotate the admin password/);
  assert.equal(result.writes.some((write) => write.includes("VALUES ('01-users.sql'")), false);
});
