vi.mock('@/domain/alert/repositories/alert.repository', () => ({
  create: vi.fn(),
}));

vi.mock('@/infrastructure/realtime', () => ({
  publishEvent: vi.fn(),
}));

vi.mock('@/domain/audit/services/audit-log.service', () => ({
  record: vi.fn(),
}));

import * as alertRepo from '@/domain/alert/repositories/alert.repository';
import { publishEvent } from '@/infrastructure/realtime';
import { createAlert } from './alert-crud.service';

const alert = {
  id: 41,
  vehicle_id: null,
  device_id: 'TRACKER_001',
  trip_id: null,
  geofence_id: null,
  alert_type: 'maintenance_due',
  source: 'device',
  severity: 'medium',
  status: 'active',
  title: 'Device warning',
  message: null,
  latitude: null,
  longitude: null,
  speed: null,
  threshold_value: null,
  actual_value: null,
  source_message_id: 'boot-1-event-9',
  acknowledged_by: null,
  acknowledged_at: null,
  resolved_by: null,
  resolved_at: null,
  resolution_notes: null,
  created_at: new Date('2026-09-26T00:00:00.000Z'),
  updated_at: new Date('2026-09-26T00:00:00.000Z'),
} as any;

describe('alert-crud idempotency', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('does not emit duplicate realtime/notification/activity events', async () => {
    vi.mocked(alertRepo.create).mockResolvedValue({ alert, created: false });

    const result = await createAlert({
      deviceId: 'TRACKER_001',
      alertType: 'maintenance_due',
      severity: 'medium',
      title: 'Device warning',
      sourceMessageId: 'boot-1-event-9',
    });

    expect(result.id).toBe(41);
    expect(publishEvent).not.toHaveBeenCalled();
  });
});
