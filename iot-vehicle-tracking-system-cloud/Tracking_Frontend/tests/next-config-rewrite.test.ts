import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseForRewrite } from '../next.config';

const withEnv = (env: Record<string, string | undefined>, fn: () => void): void => {
  const previous = {
    NEXT_SERVER_API_URL: process.env.NEXT_SERVER_API_URL,
    NEXT_INTERNAL_API_URL: process.env.NEXT_INTERNAL_API_URL,
    API_INTERNAL_URL: process.env.API_INTERNAL_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  };

  Object.assign(process.env, env);
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    }
  }

  try {
    fn();
  } finally {
    Object.assign(process.env, previous);
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      }
    }
  }
};

test('resolveApiBaseForRewrite avoids proxying UAT server traffic through public API domain', () => {
  withEnv(
    {
      NEXT_SERVER_API_URL: undefined,
      NEXT_INTERNAL_API_URL: undefined,
      API_INTERNAL_URL: undefined,
      NEXT_PUBLIC_API_URL: 'https://api.thingdock.dev',
      NEXT_PUBLIC_API_BASE_URL: undefined,
    },
    () => {
      assert.equal(resolveApiBaseForRewrite(), 'http://tracking-backend:4000');
    },
  );
});

test('resolveApiBaseForRewrite lets explicit server API base override public API base', () => {
  withEnv(
    {
      NEXT_SERVER_API_URL: 'http://backend.internal:4000',
      NEXT_PUBLIC_API_URL: 'https://api.thingdock.dev',
    },
    () => {
      assert.equal(resolveApiBaseForRewrite(), 'http://backend.internal:4000');
    },
  );
});
