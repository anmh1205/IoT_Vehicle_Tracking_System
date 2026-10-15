import { it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const repoSource = readFileSync(
  new URL('../repositories/firmware.repository.ts', import.meta.url),
  'utf8',
);
const serviceSource = readFileSync(
  new URL('./firmware-deploy.service.ts', import.meta.url),
  'utf8',
);

it('OTA rollout mirrors only active or successfully dispatched targets', () => {
  assert.match(repoSource, /SET target_firmware_version = \$2/);
  assert.match(repoSource, /WHERE device_id = ANY\(\$1::text\[\]\)/);
  assert.match(
    serviceSource,
    /new Set\(\[\.\.\.dedupedByDevice\.keys\(\), \.\.\.dispatchedDeviceIds\]\)/,
  );
  assert.match(
    serviceSource,
    /setDeviceTargetFirmwareVersion\(targetedDeviceIds, firmware\.version\)/,
  );
  assert.equal(
    serviceSource.includes('...deviceIdsToCreate, ...dispatchedDeviceIds'),
    false,
  );
});
