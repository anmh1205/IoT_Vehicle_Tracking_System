import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAlertStatusLabel,
  isObdMaintenanceAlert,
} from '../src/lib/api/alerts';

test('getAlertStatusLabel includes dismissed alerts consistently', () => {
  assert.equal(getAlertStatusLabel('dismissed'), 'Đã bỏ qua');
});

test('isObdMaintenanceAlert does not treat generic maintenance text as OBD', () => {
  assert.equal(
    isObdMaintenanceAlert({
      alertType: 'maintenance_due',
      source: 'device',
      title: 'Maintenance due',
      message: 'Mileage crossed warning threshold',
    }),
    false,
  );
});

test('isObdMaintenanceAlert accepts ECU-backed maintenance recommendations', () => {
  assert.equal(
    isObdMaintenanceAlert({
      alertType: 'maintenance_due',
      source: 'ecu',
      title: 'Maintenance recommendation',
      message: 'Pending DTC P0500',
    }),
    true,
  );
});
