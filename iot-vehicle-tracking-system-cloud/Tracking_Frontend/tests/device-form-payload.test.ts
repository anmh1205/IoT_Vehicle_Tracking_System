import test from 'node:test';
import assert from 'node:assert/strict';
import * as deviceFormModule from '../src/features/devices/components/device-form';

const { buildDeviceFormPayload } = ((deviceFormModule as any).default ?? deviceFormModule) as {
  buildDeviceFormPayload: (values: {
    deviceId: string;
    deviceName: string;
    imei?: string;
    requestInterval: number;
    imuAccelDeltaThresholdMps2?: number;
  }, isUpdate?: boolean) => Record<string, unknown>;
};

test('buildDeviceFormPayload trims identifiers and keeps edited IMU threshold', () => {
  const payload = buildDeviceFormPayload(
    {
      deviceId: ' TD-01 ',
      deviceName: ' Main tracker ',
      imei: ' 123456789 ',
      requestInterval: 15,
      imuAccelDeltaThresholdMps2: 8.5,
    },
    true,
  );

  assert.equal(payload.deviceId, 'TD-01');
  assert.equal(payload.deviceName, 'Main tracker');
  assert.equal(payload.imei, '123456789');
  assert.equal(payload.imuAccelDeltaThresholdMps2, 8.5);
});

test('buildDeviceFormPayload clears blank IMEI on update but omits it on create', () => {
  const baseValues = {
    deviceId: 'TD-02',
    deviceName: 'Backup tracker',
    imei: '   ',
    requestInterval: 60,
    imuAccelDeltaThresholdMps2: undefined,
  };

  assert.equal(buildDeviceFormPayload(baseValues, true).imei, null);
  assert.equal(buildDeviceFormPayload(baseValues, false).imei, undefined);
});
