import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const statusSource = readFileSync(
  new URL('../src/handlers/status.handler.ts', import.meta.url),
  'utf8',
);
const rawSource = readFileSync(
  new URL('../src/handlers/rawdata.handler.ts', import.meta.url),
  'utf8',
);
const lifecycleSource = readFileSync(
  new URL('../src/services/session-lifecycle.service.ts', import.meta.url),
  'utf8',
);

test('superseded sessions emit ended lifecycle before a replacement start', () => {
  const statusEnsure = statusSource.indexOf(
    'const ensuredSession = await ensureDeviceSession',
  );
  const statusRetired = statusSource.indexOf(
    'publishSupersededSessionEnds({',
    statusEnsure,
  );
  const statusStarted = statusSource.indexOf(
    "action: 'started'",
    statusRetired,
  );

  assert.ok(statusEnsure >= 0);
  assert.ok(statusRetired > statusEnsure);
  assert.ok(statusStarted > statusRetired);

  const rawEnsure = rawSource.indexOf(
    'const ensuredSession = await ensureDeviceSession',
  );
  const rawRetired = rawSource.indexOf(
    'publishSupersededSessionEnds({',
    rawEnsure,
  );
  const rawStarted = rawSource.indexOf(
    "action: 'started'",
    rawRetired,
  );

  assert.ok(rawEnsure >= 0);
  assert.ok(rawRetired > rawEnsure);
  assert.ok(rawStarted > rawRetired);
});

test('superseded lifecycle event never reuses replacement session identity', () => {
  assert.match(lifecycleSource, /boundary_source: 'bridge_superseded'/);
  assert.match(lifecycleSource, /end_reason: 'superseded'/);
  assert.match(lifecycleSource, /canonical_session_id: String\(sessionId\)/);
  assert.equal(lifecycleSource.includes('boot_id:'), false);
  assert.equal(lifecycleSource.includes('local_session_key:'), false);
});
