
vi.mock('@/infrastructure/database/queries');
vi.mock('@/infrastructure/database/pool', () => ({ pool: {} }));

import { findOne, findMany } from '@/infrastructure/database/queries';
import { getVehicleStatus } from '../vehicle-status.service';

// -- Factories ----------------------------------------------------------------

const NOW = new Date('2026-01-15T10:00:00.000Z');

const makeVehicle = (overrides = {}) => ({
  id: 1,
  vehicle_id: 'VH-001',
  plate_number: '51A-12345',
  device_id: 'DEV-001',
  status: 'active',
  customer_id: null,
  vehicle_type: 'sedan',
  brand: 'Toyota',
  model: 'Camry',
  year: 2022,
  color: 'white',
  vin: null,
  seats: 5,
  transmission: 'automatic',
  fuel_type: 'gasoline',
  mileage_km: 10000,
  registration_number: null,
  insurance_expiry: null,
  icon_type: 'car',
  color_hex: '#FFFFFF',
  notes: null,
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

const makeDevice = (overrides = {}) => ({
  device_id: 'DEV-001',
  current_status: 'online',
  last_seen_at: NOW,
  last_latitude: 10.7769,
  last_longitude: 106.7009,
  last_speed: 45.5,
  ...overrides,
});

const makeTelemetry = (overrides = {}) => ({
  latitude: 10.7769,
  longitude: 106.7009,
  speed: 45.5,
  course: 90,
  device_battery: 85,
  server_timestamp: NOW,
  ...overrides,
});

const makeTrip = (overrides = {}) => ({
  id: 100,
  status: 'in_progress',
  actual_start: new Date('2026-01-15T08:00:00.000Z'),
  distance_km: 12.5,
  ...overrides,
});

const makeAlert = (overrides = {}) => ({
  id: 201,
  alert_type: 'geofence_exit',
  severity: 'medium',
  ...overrides,
});

// -- Tests --------------------------------------------------------------------

describe('vehicle-status.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return aggregated status when all data is available', async () => {
    const vehicle = makeVehicle();
    const device = makeDevice();
    const telemetry = makeTelemetry();
    const trip = makeTrip();
    const alert = makeAlert();

    vi.mocked(findOne)
      .mockResolvedValueOnce(vehicle)   // vehicle query
      .mockResolvedValueOnce(device)    // device query
      .mockResolvedValueOnce(telemetry) // telemetry query
      .mockResolvedValueOnce(trip);     // active trip query

    vi.mocked(findMany).mockResolvedValue([alert]);

    const result = await getVehicleStatus(1);

    expect(result.vehicleId).toBe('VH-001');
    expect(result.status).toBe('active');

    expect(result.device).toMatchObject({
      status: 'online',
      lastSeen: NOW.toISOString(),
      batteryLevel: 85,
    });

    expect(result.currentLocation).toMatchObject({
      lat: 10.7769,
      lon: 106.7009,
      speed: 45.5,
      course: 90,
    });

    expect(result.currentTrip).toMatchObject({
      id: 100,
      status: 'in_progress',
      distanceKm: 12.5,
    });

    expect(result.activeAlerts).toHaveLength(1);
    expect(result.activeAlerts[0]).toMatchObject({
      id: 201,
      alertType: 'geofence_exit',
      severity: 'medium',
    });
  });

  it('should return null fields when device is offline / no telemetry', async () => {
    const vehicle = makeVehicle();

    vi.mocked(findOne)
      .mockResolvedValueOnce(vehicle)   // vehicle
      .mockResolvedValueOnce(null)      // device not found
      .mockResolvedValueOnce(null)      // telemetry not found
      .mockResolvedValueOnce(null);     // no active trip

    vi.mocked(findMany).mockResolvedValue([]);

    const result = await getVehicleStatus(1);

    expect(result.device).toBeNull();
    expect(result.currentLocation).toBeNull();
    expect(result.currentTrip).toBeNull();
    expect(result.activeAlerts).toEqual([]);
  });

  it('should fall back to device snapshot when telemetry has null coordinates', async () => {
    const vehicle = makeVehicle();
    const device = makeDevice();
    const telemetry = makeTelemetry({ latitude: null, longitude: null });

    vi.mocked(findOne)
      .mockResolvedValueOnce(vehicle)
      .mockResolvedValueOnce(device)
      .mockResolvedValueOnce(telemetry)
      .mockResolvedValueOnce(null);

    vi.mocked(findMany).mockResolvedValue([]);

    const result = await getVehicleStatus(1);

    expect(result.currentLocation).toMatchObject({
      lat: 10.7769,
      lon: 106.7009,
      speed: 45.5,
    });
  });

  it('should skip device/telemetry queries when vehicle has no device_id', async () => {
    vi.mocked(findOne).mockClear();
    const vehicle = makeVehicle({ device_id: null });

    vi.mocked(findOne)
      .mockResolvedValueOnce(vehicle)   // vehicle
      .mockResolvedValueOnce(null);     // active trip

    vi.mocked(findMany).mockResolvedValue([]);

    const result = await getVehicleStatus(1);

    expect(result.device).toBeNull();
    expect(result.currentLocation).toBeNull();
    // findOne called only twice: vehicle + trip
    expect(findOne).toHaveBeenCalledTimes(2);
  });

  it('should throw 404 ApiError for invalid vehicle ID', async () => {
    vi.mocked(findOne).mockResolvedValueOnce(null);

    await expect(getVehicleStatus(9999)).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Vehicle with ID 9999 not found',
    });
  });

  it('should set distanceKm to 0 when trip distance_km is null', async () => {
    const vehicle = makeVehicle();
    const device = makeDevice();
    const trip = makeTrip({ distance_km: null });

    vi.mocked(findOne)
      .mockResolvedValueOnce(vehicle)
      .mockResolvedValueOnce(device)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(trip);

    vi.mocked(findMany).mockResolvedValue([]);

    const result = await getVehicleStatus(1);

    expect(result.currentTrip?.distanceKm).toBe(0);
  });
});
