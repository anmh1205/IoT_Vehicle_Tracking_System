#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parseEnvContent, buildRuntimeEnv } = require('./env-loader');

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

test('parseEnvContent parses quoted values and ignores comments', () => {
  const parsed = parseEnvContent(`\n# comment\nA=1\nB="two"\nC='three'\nINVALID\n`);
  assert.equal(parsed.A, '1');
  assert.equal(parsed.B, 'two');
  assert.equal(parsed.C, 'three');
  assert.equal(parsed.INVALID, undefined);
});

test('buildRuntimeEnv respects precedence and process.env override', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vps-control-env-'));
  const cwd = path.join(base, 'cwd');
  const home = path.join(base, 'home');

  try {
    writeFile(path.join(cwd, '.claude', '.env'), 'KEY=cwd-root\n');
    writeFile(path.join(cwd, '.claude', 'skills', '.env'), 'KEY=cwd-skills\n');
    writeFile(path.join(cwd, '.claude', 'skills', 'vps-control', '.env'), 'KEY=cwd-skill\n');
    writeFile(path.join(home, '.claude', '.env'), 'KEY=home-root\n');
    writeFile(path.join(home, '.claude', 'skills', '.env'), 'KEY=home-skills\n');
    writeFile(path.join(home, '.claude', 'skills', 'vps-control', '.env'), 'KEY=home-skill\n');

    const result = buildRuntimeEnv({
      cwd,
      home,
      processEnv: { KEY: 'process' },
    });

    assert.equal(result.env.KEY, 'process');
    assert.equal(result.loadedFiles.length, 6);
    assert.equal(result.envSources.KEY, undefined);
    assert.match(result.loadedFiles[0], /cwd[\\/]\.claude[\\/]\.env$/);
    assert.match(result.loadedFiles[5], /home[\\/]\.claude[\\/]skills[\\/]vps-control[\\/]\.env$/);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('buildRuntimeEnv tracks the source file for env-backed keys', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vps-control-env-source-'));
  const cwd = path.join(base, 'cwd');
  const home = path.join(base, 'home');

  try {
    const skillEnvPath = path.join(cwd, '.claude', 'skills', 'vps-control', '.env');
    writeFile(skillEnvPath, 'VPS_KEY_PATH=..\\keys\\id_ed25519_vps_control\n');

    const result = buildRuntimeEnv({
      cwd,
      home,
      processEnv: {},
    });

    assert.equal(result.env.VPS_KEY_PATH, '..\\keys\\id_ed25519_vps_control');
    assert.equal(result.envSources.VPS_KEY_PATH, skillEnvPath);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
