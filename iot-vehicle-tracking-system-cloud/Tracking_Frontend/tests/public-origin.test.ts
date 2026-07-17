import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePublicApiOrigin } from '../src/lib/runtime/public-origin';

test('resolvePublicApiOrigin keeps public origin when env is valid', () => {
  assert.equal(
    resolvePublicApiOrigin('https://api.thingdock.dev', {
      hostname: 'thingdock.dev',
      origin: 'https://thingdock.dev',
      protocol: 'https:',
    }),
    'https://api.thingdock.dev',
  );
});

test('resolvePublicApiOrigin ignores loopback env on production host', () => {
  assert.equal(
    resolvePublicApiOrigin('http://localhost:4000', {
      hostname: 'thingdock.dev',
      origin: 'https://thingdock.dev',
      protocol: 'https:',
    }),
    'https://api.thingdock.dev',
  );
});

test('resolvePublicApiOrigin keeps loopback env when browser also runs locally', () => {
  assert.equal(
    resolvePublicApiOrigin('http://localhost:4000', {
      hostname: 'localhost',
      origin: 'http://localhost:4001',
      protocol: 'http:',
    }),
    'http://localhost:4000',
  );
});
