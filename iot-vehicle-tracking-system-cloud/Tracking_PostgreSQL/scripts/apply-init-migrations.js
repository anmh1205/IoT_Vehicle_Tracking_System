#!/usr/bin/env node
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { loadPostgresEnv } = require('./postgres-env-loader');
const { createPostgresCommandRunner } = require('./postgres-command-runner');

const MIGRATION_TABLE = 'init_schema_migrations';

function parseArgs(argv) {
  const options = { dryRun: false, mode: '', target: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--mode') options.mode = argv[index + 1] || '';
    if (arg === '--target') options.target = argv[index + 1] || '';
    if (arg === '--mode' || arg === '--target') index += 1;
  }
  return options;
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function hashText(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function collectMatches(pattern, input) {
  return new Set(Array.from(input.matchAll(pattern), (match) => match[1]));
}

function extractColumnChecks(sql) {
  const columns = new Set();
  const tableBlocks = sql.matchAll(/ALTER TABLE\s+([a-zA-Z0-9_]+)([\s\S]*?);/gi);
  for (const [, tableName, block] of tableBlocks) {
    for (const match of block.matchAll(/ADD COLUMN(?: IF NOT EXISTS)?\s+([a-zA-Z0-9_]+)/gi)) {
      columns.add(`${tableName}.${match[1]}`);
    }
  }
  return columns;
}

function extractSignatures(sql) {
  return {
    tables: collectMatches(/CREATE TABLE(?: IF NOT EXISTS)?\s+([a-zA-Z0-9_]+)/gi, sql),
    indexes: collectMatches(/CREATE INDEX(?: IF NOT EXISTS)?\s+([a-zA-Z0-9_]+)/gi, sql),
    functions: collectMatches(/CREATE OR REPLACE FUNCTION\s+([a-zA-Z0-9_]+)/gi, sql),
    triggers: collectMatches(/CREATE TRIGGER\s+([a-zA-Z0-9_]+)/gi, sql),
    types: new Set([
      ...collectMatches(/CREATE TYPE\s+([a-zA-Z0-9_]+)/gi, sql),
      ...collectMatches(/typname\s*=\s*'([^']+)'/gi, sql),
    ]),
    columns: extractColumnChecks(sql),
  };
}

function hasAnySignature(signatures) {
  return Object.values(signatures).some((items) => items.size > 0);
}

function collectCatalog(runner) {
  const toSet = (sql, mapper = (row) => row[0]) => new Set(runner.queryRows(sql).map(mapper));
  return {
    tables: toSet("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"),
    indexes: toSet("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"),
    functions: toSet(
      "SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'",
    ),
    triggers: toSet("SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public'"),
    types: toSet(
      "SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public'",
    ),
    columns: toSet(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'",
      (row) => `${row[0]}.${row[1]}`,
    ),
  };
}

function hasAnyExistingSignature(signatures, catalog) {
  return Object.entries(signatures).some(([kind, items]) =>
    [...items].some((item) => catalog[kind].has(item)),
  );
}

function signaturesFullyExist(signatures, catalog) {
  return Object.entries(signatures).every(
    ([kind, items]) => items.size === 0 || [...items].every((item) => catalog[kind].has(item)),
  );
}

function ensureMigrationTable(runner) {
  runner.execSql(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      filename VARCHAR(255) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      applied_mode VARCHAR(16) NOT NULL CHECK (applied_mode IN ('executed', 'baseline')),
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function readRecordedMigrations(runner) {
  const rows = runner.queryRows(`SELECT filename, checksum, applied_mode FROM ${MIGRATION_TABLE} ORDER BY filename`);
  return new Map(rows.map(([filename, checksum, appliedMode]) => [filename, { checksum, appliedMode }]));
}

function recordMigration(runner, filename, checksum, appliedMode) {
  runner.execSql(`
    INSERT INTO ${MIGRATION_TABLE} (filename, checksum, applied_mode)
    VALUES (${sqlLiteral(filename)}, ${sqlLiteral(checksum)}, ${sqlLiteral(appliedMode)})
    ON CONFLICT (filename) DO UPDATE
      SET checksum = EXCLUDED.checksum,
          applied_mode = EXCLUDED.applied_mode,
          applied_at = NOW();
  `);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const baseDir = __dirname;
  const initDir = path.join(baseDir, '..', 'init');
  const { values: postgresEnv } = loadPostgresEnv(baseDir);
  const runner = createPostgresCommandRunner(postgresEnv, options.mode || undefined);

  ensureMigrationTable(runner);
  const recorded = readRecordedMigrations(runner);
  const legacyMode = recorded.size === 0;
  let catalog = collectCatalog(runner);
  let baselineCount = 0;
  let executedCount = 0;

  const files = fs
    .readdirSync(initDir)
    .filter((entry) => entry.endsWith('.sql') && (!options.target || entry === options.target))
    .sort((left, right) => left.localeCompare(right));

  console.log(`PostgreSQL init migration runner using ${runner.mode} mode.`);
  if (legacyMode) {
    console.log(
      'Legacy database detected: files with any existing schema object will be baselined conservatively.',
    );
  }

  for (const fileName of files) {
    const filePath = path.join(initDir, fileName);
    const sql = fs.readFileSync(filePath, 'utf8');
    const checksum = hashText(sql);
    const existing = recorded.get(fileName);
    if (existing) {
      const drift = existing.checksum !== checksum ? ' (checksum drift)' : '';
      console.log(`skip ${fileName}: already recorded as ${existing.appliedMode}${drift}`);
      continue;
    }

    const signatures = extractSignatures(sql);
    const appliedMode =
      legacyMode && hasAnySignature(signatures) && hasAnyExistingSignature(signatures, catalog)
        ? 'baseline'
        : 'executed';
    console.log(`${options.dryRun ? 'plan' : 'apply'} ${fileName}: ${appliedMode}`);
    if (legacyMode && appliedMode === 'baseline' && !signaturesFullyExist(signatures, catalog)) {
      console.log(
        `warn ${fileName}: partial legacy signature match detected, create a dedicated follow-up migration if missing objects matter.`,
      );
    }

    if (!options.dryRun && appliedMode === 'executed') {
      runner.execSql(sql);
      catalog = collectCatalog(runner);
    }

    if (!options.dryRun) {
      recordMigration(runner, fileName, checksum, appliedMode);
    }

    if (appliedMode === 'baseline') baselineCount += 1;
    if (appliedMode === 'executed') executedCount += 1;
  }

  console.log(
    `${options.dryRun ? 'planned' : 'completed'}: executed=${executedCount}, baselined=${baselineCount}, total=${files.length}`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
