#!/usr/bin/env node
function collectSecretsFromEnv(env) {
  const sensitiveKeyPattern = /(PASSWORD|PASS|TOKEN|SECRET|PRIVATE_KEY|API_KEY|ACCESS_KEY|AUTHORIZATION|COOKIE|SESSION|JWT|BEARER|CREDENTIAL)/i;
  const ignoredKeyPattern = /(KEY_PATH|FILE_PATH|PATH)$/i;

  return Object.entries(env)
    .filter(([key, value]) => {
      if (!value || typeof value !== 'string') return false;
      if (value.length < 4) return false;
      if (!sensitiveKeyPattern.test(key)) return false;
      if (ignoredKeyPattern.test(key)) return false;
      return true;
    })
    .map(([, value]) => value)
    .sort((a, b) => b.length - a.length);
}

function redactText(text, secrets = []) {
  if (typeof text !== 'string' || !text) return text;

  let out = text;
  for (const secret of secrets) {
    if (!secret) continue;
    out = out.split(secret).join('[REDACTED]');
  }

  return out;
}

function createRedactor(env, extraSecrets = []) {
  const fromEnv = collectSecretsFromEnv(env || {});
  const secrets = [...new Set([...fromEnv, ...extraSecrets].filter(Boolean))].sort((a, b) => b.length - a.length);
  return {
    secrets,
    redact: (text) => redactText(text, secrets),
  };
}

module.exports = {
  collectSecretsFromEnv,
  redactText,
  createRedactor,
};
