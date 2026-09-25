import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { firmwareStatusSchema } from '../src/validators/payload.validator';

test('firmware schema accepts normal-boot inventory with empty jobId', () => {
  const result = firmwareStatusSchema.safeParse({
    device_id: 'TRACKER_001',
    auth_token: 'token',
    jobId: '',
    status: 'success',
    progress: 100,
    targetVersion: '1.2.3',
    currentVersion: '1.2.3',
  });

  assert.equal(result.success, true);
});

test('firmware handler separates jobless inventory from deployment lifecycle', () => {
  const source = readFileSync(
    new URL('../src/handlers/firmware.handler.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /const jobId = payload\.jobId\.trim\(\)/);
  assert.match(source, /if \(!jobId\) \{/);
  assert.match(source, /if \(payload\.status !== 'success'\)/);
  assert.match(source, /SET firmware_version = \$2/);
  assert.match(source, /event: 'firmware_inventory_synced'/);
  assert.match(source, /if \(payload\.status === 'success'\)/);
  assert.match(source, /target_firmware_version = CASE/);
});
