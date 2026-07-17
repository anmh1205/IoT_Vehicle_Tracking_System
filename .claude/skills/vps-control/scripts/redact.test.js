#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');

const { collectSecretsFromEnv, redactText, createRedactor } = require('./redact');

test('collectSecretsFromEnv filters likely sensitive values', () => {
  const secrets = collectSecretsFromEnv({
    VPS_PASSWORD: 'abc12345',
    SESSION_SECRET: 'top-secret',
    AUTHORIZATION: 'Bearer super-token',
    VPS_KEY_PATH: '/home/user/.ssh/id_rsa',
    NORMAL_VALUE: 'hello',
  });

  assert.deepEqual(secrets, ['Bearer super-token', 'top-secret', 'abc12345']);
});

test('redactText replaces all secret occurrences', () => {
  const text = 'token=abc and again abc';
  const safe = redactText(text, ['abc']);
  assert.equal(safe, 'token=[REDACTED] and again [REDACTED]');
});

test('createRedactor merges env secrets with extra secrets', () => {
  const redactor = createRedactor({ API_TOKEN: 'abcd-efgh' }, ['manual-secret']);
  const safe = redactor.redact('a=abcd-efgh b=manual-secret');
  assert.equal(safe, 'a=[REDACTED] b=[REDACTED]');
});
