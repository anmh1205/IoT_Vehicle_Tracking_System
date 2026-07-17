#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

function parseDotEnv(content) {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (!key) {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadPostgresEnv(baseDir) {
  const envPath = path.join(baseDir, '..', '.env');
  const fileValues = fs.existsSync(envPath) ? parseDotEnv(fs.readFileSync(envPath, 'utf8')) : {};

  return {
    envPath,
    values: {
      POSTGRES_USER: process.env.POSTGRES_USER || fileValues.POSTGRES_USER || 'postgres',
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || fileValues.POSTGRES_PASSWORD || '',
      POSTGRES_DB: process.env.POSTGRES_DB || fileValues.POSTGRES_DB || 'vehicle_tracking',
      POSTGRES_HOST: process.env.POSTGRES_HOST || fileValues.POSTGRES_HOST || '127.0.0.1',
      POSTGRES_PORT: process.env.POSTGRES_PORT || fileValues.POSTGRES_PORT || '5432',
      PG_CONTAINER_NAME:
        process.env.PG_CONTAINER_NAME || fileValues.PG_CONTAINER_NAME || 'tracking-postgres',
    },
  };
}

module.exports = {
  loadPostgresEnv,
  parseDotEnv,
};
