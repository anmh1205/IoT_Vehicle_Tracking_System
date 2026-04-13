#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_SKILL_NAME = 'vps-control';

function parseEnvContent(content) {
  const parsed = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (!key) continue;

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return parseEnvContent(fs.readFileSync(filePath, 'utf8'));
}

function getEnvCandidates({ skillName = DEFAULT_SKILL_NAME, cwd = process.cwd(), home = os.homedir() } = {}) {
  return [
    path.join(cwd, '.claude', '.env'),
    path.join(cwd, '.claude', 'skills', '.env'),
    path.join(cwd, '.claude', 'skills', skillName, '.env'),
    path.join(home, '.claude', '.env'),
    path.join(home, '.claude', 'skills', '.env'),
    path.join(home, '.claude', 'skills', skillName, '.env'),
  ];
}

function buildRuntimeEnv({ skillName = DEFAULT_SKILL_NAME, cwd = process.cwd(), home = os.homedir(), processEnv = process.env } = {}) {
  const merged = {};
  const loadedFiles = [];

  for (const filePath of getEnvCandidates({ skillName, cwd, home })) {
    if (!fs.existsSync(filePath)) continue;
    Object.assign(merged, loadEnvFile(filePath));
    loadedFiles.push(filePath);
  }

  Object.assign(merged, processEnv);

  return { env: merged, loadedFiles };
}

module.exports = {
  DEFAULT_SKILL_NAME,
  parseEnvContent,
  loadEnvFile,
  getEnvCandidates,
  buildRuntimeEnv,
};
