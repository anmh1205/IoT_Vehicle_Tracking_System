import fs from 'fs';
import path from 'path';
import {
  getBrowser,
  disconnectBrowser,
  outputJSON,
  outputError,
} from '../../skills/chrome-devtools/scripts/lib/browser.js';

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://thingdock.dev';
const USERNAME = process.env.AUDIT_USERNAME || 'admin';
const PASSWORD = process.env.AUDIT_PASSWORD || 'Admin@2026';
const OUTPUT_DIR = path.resolve('.codex/chrome-devtools/screenshots/mock-audit-round5');
const REPORT_PATH = path.resolve('.codex/chrome-devtools/screenshots/mock-audit-round5-report.json');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureDir = (target) => {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
};

const slug = (value) =>
  value
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

let requestSeq = 0;

const envelope = (data) => ({
  requestId: `mock-${Date.now()}-${++requestSeq}`,
  data,
});

const jsonOk = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const parseIntSafe = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const paginate = (items, searchParams, fallbackLimit = 20) => {
  const page = Math.max(1, parseIntSafe(searchParams.get('page'), 1));
  const limit = Math.max(1, parseIntSafe(searchParams.get('limit'), fallbackLimit));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    pagination: { page, limit, total, totalPages },
  };
};

const includesText = (value, keyword) =>
  String(value ?? '').toLowerCase().includes(String(keyword ?? '').toLowerCase());
const buildMockData = () => {
  const now = Date.now();
  const iso = (minutesOffset) => new Date(now + minutesOffset * 60_000).toISOString();

  const customers = [
    {
      id: 301,
      customerCode: 'CUS-MINHAN',
      name: 'Công ty Vận tải Minh An',
      customerType: 'company',
      contactPerson: 'Nguyễn Văn An',
      phone: '0901234567',
      email: 'contact@minhan.vn',
      address: 'Quận 7, TP.HCM',
      status: 'active',
      isActive: true,
      createdAt: iso(-43200),
      updatedAt: iso(-90),
    },
    {
      id: 302,
      customerCode: 'CUS-DONGPHAT',
      name: 'Công ty Logistics Đông Phát',
      customerType: 'company',
      contactPerson: 'Trần Thị B',
      phone: '0912345678',
      email: 'ops@dongphat.vn',
      address: 'Biên Hòa, Đồng Nai',
      status: 'inactive',
      isActive: false,
      createdAt: iso(-32400),
      updatedAt: iso(-600),
    },
  ];

  const vehicles = [
    {
      id: 401,
      vehicleId: 'VEH-401',
      plateNumber: '51A-999.99',
      brand: 'Toyota',
      model: 'Fortuner',
      year: 2022,
      status: 'active',
      customerId: 301,
      deviceId: 'TRACKER_101',
      vehicleType: 'SUV',
      seats: 7,
      mileageKm: 38214,
      fuelType: 'Diesel',
      registrationNumber: 'REG-401',
      insuranceExpiry: iso(288000),
      createdAt: iso(-28800),
      updatedAt: iso(-20),
    },
    {
      id: 402,
      vehicleId: 'VEH-402',
      plateNumber: '51H-123.45',
      brand: 'Hyundai',
      model: 'Porter',
      year: 2021,
      status: 'maintenance',
      customerId: 302,
      deviceId: 'TRACKER_102',
      vehicleType: 'Truck',
      seats: 3,
      mileageKm: 76100,
      fuelType: 'Diesel',
      registrationNumber: 'REG-402',
      insuranceExpiry: iso(172800),
      createdAt: iso(-21600),
      updatedAt: iso(-180),
    },
  ];

  const drivers = [
    {
      id: 201,
      driverCode: 'DRV-201',
      fullName: 'Nguyễn Văn A',
      phone: '0901234567',
      email: 'nguyenvana@fleet.vn',
      licenseNumber: '79A123456',
      licenseType: 'B2',
      licenseExpiry: iso(240000),
      dateOfBirth: '1994-03-10T00:00:00.000Z',
      address: 'Thủ Đức, TP.HCM',
      status: 'active',
      createdAt: iso(-40000),
      updatedAt: iso(-60),
    },
    {
      id: 202,
      driverCode: 'DRV-202',
      fullName: 'Trần Thị B',
      phone: '0912345678',
      email: 'tranthib@fleet.vn',
      licenseNumber: '51B123456',
      licenseType: 'C',
      licenseExpiry: iso(18000),
      dateOfBirth: '1991-11-22T00:00:00.000Z',
      address: 'Biên Hòa, Đồng Nai',
      status: 'inactive',
      createdAt: iso(-30000),
      updatedAt: iso(-1440),
    },
  ];

  const devices = [
    {
      id: 101,
      deviceId: 'TRACKER_101',
      deviceName: 'Tracker 101',
      currentStatus: 'running',
      imei: '866931072334101',
      firmwareVersion: '1.6.0',
      vehiclePlate: '51A-999.99',
      customerName: customers[0].name,
      latitude: 10.77689,
      longitude: 106.7009,
      lastSeenAt: iso(-1),
      totalRuntimeSeconds: 168420,
      requestInterval: 30,
      vibrationThreshold: 1.4,
      lastErrorCode: 212,
      battery: 87,
      vibration: 1.92,
      temperature: 35,
      config: { heartbeatSec: 30, mqttQoS: 1 },
      currentSession: {
        id: 9001,
        status: 'running',
        serverSessionStart: iso(-95),
        serverSessionEnd: null,
        uptime: 5700,
        avgVibration: 1.98,
        dataPointsCount: 612,
      },
    },
    {
      id: 102,
      deviceId: 'TRACKER_102',
      deviceName: 'Tracker 102',
      currentStatus: 'stopped',
      imei: '866931072334102',
      firmwareVersion: '1.5.4',
      vehiclePlate: '51H-123.45',
      customerName: customers[1].name,
      latitude: 10.80333,
      longitude: 106.70889,
      lastSeenAt: iso(-8),
      totalRuntimeSeconds: 92140,
      requestInterval: 60,
      vibrationThreshold: 1.1,
      lastErrorCode: null,
      battery: 69,
      vibration: 0.54,
      temperature: 33,
      config: { heartbeatSec: 60, mqttQoS: 1 },
      currentSession: null,
    },
    {
      id: 103,
      deviceId: 'TRACKER_103',
      deviceName: 'Tracker 103',
      currentStatus: 'disconnected',
      imei: '866931072334103',
      firmwareVersion: '1.4.9',
      vehiclePlate: null,
      customerName: null,
      latitude: null,
      longitude: null,
      lastSeenAt: iso(-120),
      totalRuntimeSeconds: 22500,
      requestInterval: 120,
      vibrationThreshold: 1.0,
      lastErrorCode: 503,
      battery: null,
      vibration: null,
      temperature: null,
      config: { heartbeatSec: 120, mqttQoS: 0 },
      currentSession: null,
    },
  ];

  const deviceSessions = {
    101: [
      devices[0].currentSession,
      {
        id: 9000,
        status: 'completed',
        serverSessionStart: iso(-460),
        serverSessionEnd: iso(-300),
        uptime: 9600,
        avgVibration: 1.62,
        dataPointsCount: 1251,
      },
    ],
    102: [
      {
        id: 9101,
        status: 'completed',
        serverSessionStart: iso(-600),
        serverSessionEnd: iso(-520),
        uptime: 4800,
        avgVibration: 0.82,
        dataPointsCount: 454,
      },
    ],
    103: [],
  };

  const deviceErrors = {
    101: [
      {
        id: 7001,
        errorCode: 212,
        errorName: 'GPS tín hiệu yếu',
        description: 'Tín hiệu GNSS dao động bất thường.',
        occurredAt: iso(-210),
        resolvedAt: null,
      },
    ],
    102: [],
    103: [
      {
        id: 7301,
        errorCode: 503,
        errorName: 'Mất kết nối LTE',
        description: 'Thiết bị mất kết nối hơn 2 giờ.',
        occurredAt: iso(-180),
        resolvedAt: null,
      },
    ],
  };

  const deviceTelemetry = {
    101: Array.from({ length: 36 }).map((_, index) => ({
      timestamp: iso(-(36 - index) * 5),
      value: Number((1.2 + Math.sin(index / 4) * 0.4).toFixed(2)),
    })),
    102: Array.from({ length: 18 }).map((_, index) => ({
      timestamp: iso(-(18 - index) * 10),
      value: Number((0.6 + Math.cos(index / 3) * 0.2).toFixed(2)),
    })),
    103: [],
  };

  const trips = [
    {
      id: 501,
      tripCode: 'TRIP-501',
      vehicleId: 'VEH-401',
      deviceId: 'TRACKER_101',
      driverName: 'Nguyễn Văn A',
      status: 'in_progress',
      plannedStart: iso(-220),
      plannedEnd: iso(120),
      actualStart: iso(-180),
      actualEnd: null,
      distanceKm: 68.4,
      updatedAt: iso(-5),
      createdAt: iso(-360),
    },
    {
      id: 502,
      tripCode: 'TRIP-502',
      vehicleId: 'VEH-402',
      deviceId: 'TRACKER_102',
      driverName: 'Trần Thị B',
      status: 'completed',
      plannedStart: iso(-1440),
      plannedEnd: iso(-1320),
      actualStart: iso(-1430),
      actualEnd: iso(-1340),
      distanceKm: 31.2,
      updatedAt: iso(-1330),
      createdAt: iso(-1600),
    },
  ];

  const tripTelemetry = {
    501: {
      points: Array.from({ length: 30 }).map((_, index) => ({
        lat: 10.73 + index * 0.0016,
        lon: 106.64 + index * 0.0012,
        speed: Math.max(0, Math.round(26 + Math.sin(index / 3) * 24)),
        timestamp: iso(-(30 - index) * 5),
      })),
      summary: { distanceKm: 68.4, durationMinutes: 178, avgSpeed: 35.2, maxSpeed: 78 },
    },
  };

  const alerts = [
    {
      id: 601,
      title: 'Vượt tốc độ tại QL1A',
      alertType: 'speeding',
      severity: 'high',
      status: 'active',
      message: 'Xe 51A-999.99 vượt 18 km/h so với giới hạn.',
      latitude: 10.7822,
      longitude: 106.6951,
      createdAt: iso(-20),
      updatedAt: iso(-15),
    },
    {
      id: 602,
      title: 'Thiết bị mất kết nối',
      alertType: 'offline',
      severity: 'critical',
      status: 'acknowledged',
      message: 'TRACKER_103 không gửi dữ liệu hơn 2 giờ.',
      latitude: 10.75,
      longitude: 106.66,
      createdAt: iso(-120),
      updatedAt: iso(-100),
    },
  ];

  const violations = [
    {
      id: 801,
      alertId: 601,
      vehicleId: '51A-999.99',
      driverId: 201,
      violationType: 'speeding',
      severity: 'high',
      description: 'Vượt tốc độ 18 km/h',
      speedLimit: 60,
      actualSpeed: 78,
      locationLat: 10.7822,
      locationLon: 106.6951,
      acknowledged: false,
      createdAt: iso(-20),
      updatedAt: iso(-20),
    },
  ];

  const geofences = [
    {
      id: 701,
      name: 'Kho Bình Tân',
      description: 'Vùng giám sát xuất phát hàng hóa.',
      geofenceType: 'circle',
      centerLatitude: 10.7705,
      centerLongitude: 106.6084,
      radiusMeters: 800,
      triggerOn: 'both',
      isActive: true,
      vehicleIds: ['VEH-401', 'VEH-402'],
      notifyEmail: true,
      notifyPush: true,
      color: '#ef4444',
      createdAt: iso(-43200),
      updatedAt: iso(-300),
    },
  ];

  const maintenance = [
    {
      id: 901,
      taskCode: 'MNT-901',
      vehicleId: 'VEH-401',
      title: 'Thay dầu định kỳ',
      maintenanceType: 'oil_change',
      status: 'scheduled',
      scheduledDate: iso(2880),
      completedDate: null,
      nextServiceDate: iso(2880),
      nextServiceMileage: 40000,
      estimatedCost: 1200000,
      actualCost: null,
      odometerKm: 38214,
      notes: 'Chu kỳ 10.000 km.',
      createdAt: iso(-300),
      updatedAt: iso(-120),
    },
  ];

  return {
    customers,
    vehicles,
    drivers,
    devices,
    deviceSessions,
    deviceErrors,
    deviceTelemetry,
    trips,
    tripTelemetry,
    alerts,
    violations,
    geofences,
    maintenance,
  };
};
const createMockRouter = (mockData) => {
  const simulatorState = {
    running: false,
    paused: false,
    jobId: null,
    lastTickAt: null,
    intervalSec: 5,
    durationMin: 15,
    preview: mockData.devices
      .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
      .slice(0, 2)
      .map((item) => ({
        deviceId: item.deviceId,
        timestamp: item.lastSeenAt,
        lat: item.latitude,
        lon: item.longitude,
        speed: item.currentStatus === 'running' ? 48 : 0,
        heading: 120,
        vibration: item.vibration ?? 0,
        battery: item.battery ?? 0,
      })),
  };

  const byId = (rows, id) => rows.find((row) => Number(row.id) === Number(id)) ?? null;

  const querySearch = (rows, keyword, keys) => {
    if (!keyword) return rows;
    return rows.filter((row) => keys.some((key) => includesText(row?.[key], keyword)));
  };

  return async (request) => {
    const url = new URL(request.url());
    const pathName = url.pathname;
    const method = request.method().toUpperCase();
    const searchParams = url.searchParams;

    if (!pathName.includes('/api/v1/')) {
      return request.continue();
    }

    const respond = (data) => request.respond(jsonOk(envelope(data)));

    if (method === 'GET' && /\/api\/v1\/auth\/me$/.test(pathName)) {
      return respond({
        user: {
          id: 1501,
          username: 'admin',
          fullName: 'Nguyễn Quản Trị',
          role: 'admin',
          status: 'active',
          email: 'admin@thingdock.dev',
        },
        token: 'mock-token',
      });
    }

    if (method === 'POST' && /\/api\/v1\/auth\/refresh$/.test(pathName)) {
      return respond({
        user: {
          id: 1501,
          username: 'admin',
          fullName: 'Nguyễn Quản Trị',
          role: 'admin',
          status: 'active',
          email: 'admin@thingdock.dev',
        },
        token: 'mock-token',
      });
    }

    if (method === 'GET' && /\/api\/v1\/users\/notification-settings$/.test(pathName)) {
      return respond({ preferences: { emailAlerts: true, pushAlerts: true } });
    }

    if (method === 'PUT' && /\/api\/v1\/users\/notification-settings$/.test(pathName)) {
      return respond({ message: 'updated' });
    }

    if (method === 'GET' && /\/api\/v1\/dashboard\/stats$/.test(pathName)) {
      return respond({
        totalDevices: mockData.devices.length,
        activeDevices: mockData.devices.filter((item) => item.currentStatus === 'running').length,
        offlineDevices: mockData.devices.filter((item) => item.currentStatus === 'disconnected').length,
        alertsCount: mockData.alerts.length,
        totalRuntimeToday: 182,
        totalRuntimeWeek: 1087,
        sessionsToday: 27,
      });
    }

    if (method === 'GET' && /\/api\/v1\/dashboard\/activity$/.test(pathName)) {
      const limit = Math.max(1, parseIntSafe(searchParams.get('limit'), 20));
      return respond({ items: mockData.alerts.slice(0, limit) });
    }

    if (method === 'GET' && /\/api\/v1\/dashboard\/device-activity$/.test(pathName)) {
      return respond({
        items: [
          { label: 'T2', running: 8, idle: 2, offline: 1 },
          { label: 'T3', running: 7, idle: 3, offline: 1 },
          { label: 'T4', running: 9, idle: 1, offline: 1 },
          { label: 'T5', running: 8, idle: 2, offline: 1 },
          { label: 'T6', running: 7, idle: 2, offline: 2 },
          { label: 'T7', running: 6, idle: 3, offline: 2 },
          { label: 'CN', running: 5, idle: 4, offline: 2 },
        ],
      });
    }

    if (method === 'GET' && /\/api\/v1\/dashboard\/device-status$/.test(pathName)) {
      return respond({
        items: [
          { name: 'Đang chạy', value: 1, color: '#22c55e' },
          { name: 'Đã dừng', value: 1, color: '#64748b' },
          { name: 'Ngoại tuyến', value: 1, color: '#ef4444' },
        ],
      });
    }

    if (method === 'GET' && /\/api\/v1\/dashboard\/fleet-runtime$/.test(pathName)) {
      return respond({
        items: Array.from({ length: 10 }).map((_, index) => ({
          label: `04/${String(index + 1).padStart(2, '0')}`,
          runtime: 10 + index * 2,
        })),
      });
    }

    if (method === 'GET' && /\/api\/v1\/devices\/positions$/.test(pathName)) {
      return respond({
        items: mockData.devices.map((item) => ({
          deviceId: item.deviceId,
          deviceName: item.deviceName,
          vehiclePlate: item.vehiclePlate,
          lat: item.latitude,
          lon: item.longitude,
          speed: item.currentStatus === 'running' ? 48 : 0,
          heading: item.currentStatus === 'running' ? 122 : 32,
          status:
            item.currentStatus === 'running'
              ? 'running'
              : item.currentStatus === 'stopped'
                ? 'stopped'
                : 'disconnected',
          timestamp: item.lastSeenAt,
          battery: item.battery,
          vibration: item.vibration,
          temperature: item.temperature,
        })),
      });
    }

    if (method === 'GET' && /\/api\/v1\/devices$/.test(pathName)) {
      const status = searchParams.get('status');
      const search = searchParams.get('search')?.trim();
      let rows = [...mockData.devices];
      if (status) rows = rows.filter((item) => item.currentStatus === status);
      rows = querySearch(rows, search, ['deviceId', 'deviceName', 'vehiclePlate', 'customerName']);
      return respond(paginate(rows, searchParams, 20));
    }

    if (method === 'GET' && /\/api\/v1\/devices\/(\d+)\/runtime$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/devices\/(\d+)\/runtime$/)?.[1] ?? '0');
      const sessions = mockData.deviceSessions[id] ?? [];
      const totalRuntime = sessions.reduce((sum, row) => sum + Number(row.uptime ?? 0), 0);
      return respond({
        totalRuntime,
        totalSessions: sessions.length,
        avgSessionDuration: sessions.length > 0 ? Math.round(totalRuntime / sessions.length) : 0,
        avgVibration: 1.3,
        totalDataPoints: (mockData.deviceTelemetry[id] ?? []).length,
      });
    }

    if (method === 'GET' && /\/api\/v1\/devices\/(\d+)\/sessions$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/devices\/(\d+)\/sessions$/)?.[1] ?? '0');
      return respond(paginate(mockData.deviceSessions[id] ?? [], searchParams, 10));
    }

    if (method === 'GET' && /\/api\/v1\/devices\/(\d+)\/errors$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/devices\/(\d+)\/errors$/)?.[1] ?? '0');
      return respond(paginate(mockData.deviceErrors[id] ?? [], searchParams, 10));
    }

    if (method === 'GET' && /\/api\/v1\/devices\/(\d+)\/commands$/.test(pathName)) {
      return respond(paginate([{ id: 1, command: 'set_interval', status: 'success' }], searchParams, 10));
    }

    if (method === 'GET' && /\/api\/v1\/devices\/(\d+)\/telemetry$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/devices\/(\d+)\/telemetry$/)?.[1] ?? '0');
      return respond({ items: mockData.deviceTelemetry[id] ?? [] });
    }

    if (method === 'GET' && /\/api\/v1\/devices\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/devices\/(\d+)$/)?.[1] ?? '0');
      const row = byId(mockData.devices, id);
      return respond({
        ...(row ?? {}),
        recentSessions: mockData.deviceSessions[id] ?? [],
      });
    }

    if (method === 'GET' && /\/api\/v1\/vehicles$/.test(pathName)) {
      const search = searchParams.get('search')?.trim();
      const status = searchParams.get('status');
      let rows = [...mockData.vehicles];
      if (status) rows = rows.filter((item) => item.status === status);
      rows = querySearch(rows, search, ['vehicleId', 'plateNumber', 'brand', 'model']);
      return respond(paginate(rows, searchParams, 20));
    }

    if (method === 'GET' && /\/api\/v1\/vehicles\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/vehicles\/(\d+)$/)?.[1] ?? '0');
      return respond(byId(mockData.vehicles, id) ?? {});
    }

    if (method === 'GET' && /\/api\/v1\/drivers$/.test(pathName)) {
      const search = searchParams.get('search')?.trim();
      const status = searchParams.get('status');
      let rows = [...mockData.drivers];
      if (status) rows = rows.filter((item) => item.status === status);
      rows = querySearch(rows, search, ['driverCode', 'fullName', 'phone', 'licenseNumber']);
      return respond(paginate(rows, searchParams, 20));
    }

    if (method === 'GET' && /\/api\/v1\/drivers\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/drivers\/(\d+)$/)?.[1] ?? '0');
      return respond(byId(mockData.drivers, id) ?? {});
    }

    if (method === 'GET' && /\/api\/v1\/customers$/.test(pathName)) {
      const search = searchParams.get('search')?.trim();
      const status = searchParams.get('status');
      const customerType = searchParams.get('customerType');
      let rows = [...mockData.customers];
      if (status) rows = rows.filter((item) => item.status === status);
      if (customerType) rows = rows.filter((item) => item.customerType === customerType);
      rows = querySearch(rows, search, ['customerCode', 'name', 'email', 'contactPerson']);
      return respond(paginate(rows, searchParams, 20));
    }

    if (method === 'GET' && /\/api\/v1\/customers\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/customers\/(\d+)$/)?.[1] ?? '0');
      return respond(byId(mockData.customers, id) ?? {});
    }
    if (method === 'GET' && /\/api\/v1\/trips$/.test(pathName)) {
      const search = searchParams.get('search')?.trim();
      const status = searchParams.get('status');
      let rows = [...mockData.trips];
      if (status) rows = rows.filter((item) => item.status === status);
      rows = querySearch(rows, search, ['tripCode', 'vehicleId', 'driverName', 'deviceId']);
      rows.sort((a, b) => (Date.parse(b.actualStart ?? b.createdAt) || 0) - (Date.parse(a.actualStart ?? a.createdAt) || 0));
      return respond(paginate(rows, searchParams, 20));
    }

    if (method === 'GET' && /\/api\/v1\/trips\/(\d+)\/telemetry$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/trips\/(\d+)\/telemetry$/)?.[1] ?? '0');
      return respond(
        mockData.tripTelemetry[id] ?? {
          points: [],
          summary: { distanceKm: 0, durationMinutes: 0, avgSpeed: 0, maxSpeed: 0 },
        },
      );
    }

    if (method === 'GET' && /\/api\/v1\/trips\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/trips\/(\d+)$/)?.[1] ?? '0');
      return respond(byId(mockData.trips, id) ?? {});
    }

    if (method === 'GET' && /\/api\/v1\/alerts$/.test(pathName)) {
      const severity = searchParams.get('severity');
      const status = searchParams.get('status');
      let rows = [...mockData.alerts];
      if (severity) rows = rows.filter((item) => item.severity === severity);
      if (status) rows = rows.filter((item) => item.status === status);
      return respond(paginate(rows, searchParams, 50));
    }

    if (method === 'GET' && /\/api\/v1\/alerts\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/alerts\/(\d+)$/)?.[1] ?? '0');
      return respond(byId(mockData.alerts, id) ?? {});
    }

    if (method === 'PUT' && /\/api\/v1\/alerts\/(\d+)\/(acknowledge|resolve|dismiss)$/.test(pathName)) {
      return respond({ message: 'ok' });
    }

    if (method === 'GET' && /\/api\/v1\/violations$/.test(pathName)) {
      const violationType = searchParams.get('violationType');
      let rows = [...mockData.violations];
      if (violationType) rows = rows.filter((item) => item.violationType === violationType);
      return respond(paginate(rows, searchParams, 20));
    }

    if (method === 'GET' && /\/api\/v1\/violations\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/violations\/(\d+)$/)?.[1] ?? '0');
      return respond(byId(mockData.violations, id) ?? {});
    }

    if (method === 'PUT' && /\/api\/v1\/violations\/(\d+)\/acknowledge$/.test(pathName)) {
      return respond({ message: 'acknowledged' });
    }

    if (method === 'GET' && /\/api\/v1\/geofences$/.test(pathName)) {
      const search = searchParams.get('search')?.trim();
      const geofenceType = searchParams.get('geofenceType');
      const isActiveRaw = searchParams.get('isActive');
      let rows = [...mockData.geofences];
      if (geofenceType) rows = rows.filter((item) => item.geofenceType === geofenceType);
      if (isActiveRaw === 'true' || isActiveRaw === 'false') rows = rows.filter((item) => item.isActive === (isActiveRaw === 'true'));
      rows = querySearch(rows, search, ['name', 'description']);
      return respond(paginate(rows, searchParams, 20));
    }

    if (method === 'GET' && /\/api\/v1\/geofences\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/geofences\/(\d+)$/)?.[1] ?? '0');
      return respond(byId(mockData.geofences, id) ?? {});
    }

    if (method === 'GET' && /\/api\/v1\/geofences\/policy-violations$/.test(pathName)) {
      return respond(
        paginate(
          [
            { id: 9901, vehicleId: 'VEH-401', severity: 'high', status: 'open', detectedAt: new Date().toISOString(), violationKind: 'geofence_exit' },
            { id: 9902, vehicleId: 'VEH-402', severity: 'medium', status: 'acknowledged', detectedAt: new Date(Date.now() - 120 * 60_000).toISOString(), violationKind: 'geofence_enter' },
          ],
          searchParams,
          20,
        ),
      );
    }

    if (method === 'GET' && /\/api\/v1\/maintenance$/.test(pathName)) {
      const status = searchParams.get('status');
      const maintenanceType = searchParams.get('maintenanceType');
      const vehicleId = searchParams.get('vehicleId')?.trim();
      let rows = [...mockData.maintenance];
      if (status) rows = rows.filter((item) => item.status === status);
      if (maintenanceType) rows = rows.filter((item) => item.maintenanceType === maintenanceType);
      if (vehicleId) rows = rows.filter((item) => includesText(item.vehicleId, vehicleId));
      return respond(paginate(rows, searchParams, 50));
    }

    if (method === 'GET' && /\/api\/v1\/maintenance\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/maintenance\/(\d+)$/)?.[1] ?? '0');
      return respond(byId(mockData.maintenance, id) ?? {});
    }

    if (method === 'GET' && /\/api\/v1\/firmware$/.test(pathName)) {
      return respond({
        firmwares: [
          { id: 1, version: '1.6.0', filename: 'tracker-v1.6.0.bin', filePath: '/firmware/tracker-v1.6.0.bin', size: 2428112, description: 'Ổn định MQTT', isActive: true, createdAt: new Date(Date.now() - 20 * 24 * 60_000).toISOString() },
          { id: 2, version: '1.5.4', filename: 'tracker-v1.5.4.bin', filePath: '/firmware/tracker-v1.5.4.bin', size: 2205904, description: 'Bản cũ', isActive: false, createdAt: new Date(Date.now() - 70 * 24 * 60_000).toISOString() },
        ],
        total: 2,
        page: 1,
        limit: 100,
      });
    }

    if (method === 'GET' && /\/api\/v1\/firmware\/(\d+)\/deployments$/.test(pathName)) {
      return respond([
        { id: 1101, jobId: 'OTA-1101', deviceId: 'TRACKER_101', status: 'completed', progress: 100, targetVersion: '1.6.0', currentVersion: '1.6.0', partition: 'ota_1', startedAt: new Date(Date.now() - 240 * 60_000).toISOString(), completedAt: new Date(Date.now() - 210 * 60_000).toISOString(), errorMessage: null },
        { id: 1102, jobId: 'OTA-1102', deviceId: 'TRACKER_102', status: 'processing', progress: 68, targetVersion: '1.6.0', currentVersion: '1.5.4', partition: 'ota_0', startedAt: new Date(Date.now() - 60 * 60_000).toISOString(), completedAt: null, errorMessage: null },
      ]);
    }

    if (method === 'GET' && /\/api\/v1\/exports$/.test(pathName)) {
      return respond({
        items: [
          { id: 1301, exportType: 'statistics', status: 'completed', filters: { format: 'csv' }, filePath: '/exports/stats.csv', createdAt: new Date(Date.now() - 280 * 60_000).toISOString(), completedAt: new Date(Date.now() - 260 * 60_000).toISOString() },
          { id: 1302, exportType: 'alerts', status: 'processing', filters: { format: 'excel' }, filePath: null, createdAt: new Date(Date.now() - 80 * 60_000).toISOString(), completedAt: null },
          { id: 1303, exportType: 'devices', status: 'pending', filters: { format: 'csv' }, filePath: null, createdAt: new Date(Date.now() - 25 * 60_000).toISOString(), completedAt: null },
        ],
      });
    }

    if (method === 'GET' && /\/api\/v1\/notifications\/stats$/.test(pathName)) {
      return respond({ total: 5, unreadCount: 3, byType: { alert: 1, system: 1, export: 1, firmware: 1, geofence: 1 } });
    }

    if (method === 'GET' && /\/api\/v1\/notifications$/.test(pathName)) {
      return respond({
        items: [
          { id: 1401, type: 'alert', title: 'Cảnh báo vượt tốc độ', message: 'Xe 51A-999.99 vượt ngưỡng.', isRead: false, referenceId: 601, referenceType: 'alert', createdAt: new Date(Date.now() - 20 * 60_000).toISOString() },
          { id: 1402, type: 'firmware', title: 'OTA đang triển khai', message: 'TRACKER_102 đạt 68%.', isRead: false, referenceId: 1102, referenceType: 'deployment', createdAt: new Date(Date.now() - 55 * 60_000).toISOString() },
          { id: 1403, type: 'system', title: 'VictoriaMetrics độ trễ cao', message: 'Độ trễ tăng bất thường.', isRead: true, referenceId: null, referenceType: null, createdAt: new Date(Date.now() - 15 * 60_000).toISOString() },
        ],
        unreadCount: 2,
        total: 3,
        page: 1,
        limit: 20,
      });
    }

    if (method === 'GET' && /\/api\/v1\/users$/.test(pathName)) {
      return respond(
        paginate(
          [
            { id: 1501, username: 'admin', fullName: 'Nguyễn Quản Trị', email: 'admin@thingdock.dev', role: 'admin', status: 'active' },
            { id: 1502, username: 'operator.hcm', fullName: 'Trần Điều Hành', email: 'operator.hcm@thingdock.dev', role: 'operator', status: 'active' },
            { id: 1503, username: 'viewer.audit', fullName: 'Phạm Giám Sát', email: 'viewer.audit@thingdock.dev', role: 'viewer', status: 'suspended' },
          ],
          searchParams,
          20,
        ),
      );
    }

    if (method === 'POST' && /\/api\/v1\/users\/(\d+)\/reset-password$/.test(pathName)) {
      return respond({ temporaryPassword: 'Temp@2026!' });
    }

    if (method === 'GET' && /\/api\/v1\/statistics\/summary$/.test(pathName)) {
      return respond({ totalRuntimeHours: 1087, averageUptimePercent: 94.6, totalSessions: 143, totalAlerts: 37 });
    }

    if (method === 'GET' && /\/api\/v1\/statistics\/fleet-usage$/.test(pathName)) {
      return respond({
        labels: ['2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12', '2026-04-13', '2026-04-14', '2026-04-15'],
        activeVehicles: [18, 19, 18, 20, 20, 19, 21],
        inactiveVehicles: [4, 3, 4, 2, 2, 3, 1],
      });
    }

    if (method === 'GET' && /\/api\/v1\/statistics\/device-uptime$/.test(pathName)) {
      return respond({ devices: [{ deviceId: 'TRACKER_101', uptimePercent: 98.2 }, { deviceId: 'TRACKER_102', uptimePercent: 94.5 }, { deviceId: 'TRACKER_103', uptimePercent: 77.4 }] });
    }

    if (method === 'GET' && /\/api\/v1\/fuel-analytics\/summary$/.test(pathName)) {
      return respond({ totalFuelUsed: 3248, totalDistance: 28140, avgConsumption: 11.54, totalCost: 81200000, tripCount: 143 });
    }

    if (method === 'GET' && /\/api\/v1\/fuel-analytics\/by-vehicle$/.test(pathName)) {
      return respond({ vehicles: [{ vehicleId: 'VEH-401', plateNumber: '51A-999.99', totalFuel: 1120, totalDistance: 9520, avgConsumption: 11.76, tripCount: 48 }, { vehicleId: 'VEH-402', plateNumber: '51H-123.45', totalFuel: 1384, totalDistance: 12240, avgConsumption: 11.31, tripCount: 61 }] });
    }

    if (method === 'GET' && /\/api\/v1\/fuel-analytics\/trends$/.test(pathName)) {
      return respond({
        trends: Array.from({ length: 10 }).map((_, index) => ({
          date: new Date(Date.now() - (9 - index) * 24 * 60 * 60_000).toISOString().slice(0, 10),
          fuelUsed: 280 + index * 6,
          distance: 2320 + index * 30,
          consumption: Number((11.4 + Math.sin(index / 3) * 0.35).toFixed(2)),
        })),
      });
    }

    if (method === 'GET' && /\/api\/v1\/system\/health$/.test(pathName)) {
      return respond({
        status: 'up',
        checks: { database: { status: 'up', latencyMs: 12 }, emqx: { status: 'up', latencyMs: 9 }, victoriametrics: { status: 'degraded', latencyMs: 128, error: 'Độ trễ tăng cao' }, backend_ws: { status: 'up', latencyMs: 16 } },
      });
    }

    if (method === 'GET' && /\/api\/v1\/system\/metrics$/.test(pathName)) {
      return respond({ cpuUsage: 34, memoryUsage: 62, diskUsage: 48, activeConnections: 128 });
    }

    if (method === 'GET' && /\/api\/v1\/system-admin\/logs$/.test(pathName)) {
      return respond({ items: [{ id: 'log-1', timestamp: new Date(Date.now() - 3 * 60_000).toISOString(), level: 'info', source: 'backend', message: 'Ingest telemetry batch size=42', stack: null }, { id: 'log-2', timestamp: new Date(Date.now() - 8 * 60_000).toISOString(), level: 'warn', source: 'victoriametrics', message: 'Query latency spike detected', stack: null }], total: 2 });
    }

    if (method === 'GET' && /\/api\/v1\/system-admin\/tables$/.test(pathName)) {
      return respond(['devices', 'trips', 'alerts', 'violations', 'maintenance', 'users']);
    }

    if (method === 'GET' && /\/api\/v1\/system-admin\/tables\/([^/]+)\/columns$/.test(pathName)) {
      return respond([{ name: 'id' }, { name: 'status' }, { name: 'updated_at' }]);
    }

    if (method === 'GET' && /\/api\/v1\/system-admin\/tables\/([^/]+)$/.test(pathName)) {
      return respond(paginate([{ id: 1, status: 'active', updated_at: new Date().toISOString() }, { id: 2, status: 'inactive', updated_at: new Date().toISOString() }], searchParams, 20));
    }

    if (method === 'GET' && /\/api\/v1\/system-admin\/metrics$/.test(pathName)) {
      return respond({
        data: {
          result: [
            { metric: { __name__: 'vehicle_speed_avg' }, values: Array.from({ length: 12 }).map((_, index) => [Math.floor((Date.now() - (12 - index) * 60_000) / 1000), Number((42 + Math.sin(index / 2) * 8).toFixed(2))]) },
          ],
        },
      });
    }

    if (method === 'GET' && /\/api\/v1\/simulator\/status$/.test(pathName)) {
      return respond(simulatorState);
    }

    if (method === 'POST' && /\/api\/v1\/simulator\/start$/.test(pathName)) {
      simulatorState.running = true;
      simulatorState.paused = false;
      simulatorState.jobId = 'SIM-001';
      simulatorState.lastTickAt = new Date().toISOString();
      return respond(simulatorState);
    }

    if (method === 'POST' && /\/api\/v1\/simulator\/stop$/.test(pathName)) {
      simulatorState.running = false;
      simulatorState.paused = false;
      simulatorState.jobId = null;
      simulatorState.lastTickAt = new Date().toISOString();
      return respond(simulatorState);
    }

    return request.continue();
  };
};

const clickFirst = async (page, selectors) => {
  for (const selector of selectors) {
    const node = await page.$(selector);
    if (node) {
      await node.click().catch(() => null);
      return selector;
    }
  }
  return null;
};

const clickByText = async (page, labels, selector = 'button,[role="tab"],a') =>
  page.evaluate(
    ({ labels: targetLabels, selector: targetSelector }) => {
      const nodes = Array.from(document.querySelectorAll(targetSelector));
      for (const label of targetLabels) {
        const hit = nodes.find((node) =>
          String(node.textContent ?? '').toLowerCase().includes(String(label).toLowerCase()),
        );
        if (hit) {
          hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return label;
        }
      }
      return null;
    },
    { labels, selector },
  );

const scenarios = [
  { name: 'mock-dashboard-overview', route: '/dashboard' },
  {
    name: 'mock-map-with-selection',
    route: '/dashboard/map',
    actions: async (page) => {
      await page.waitForSelector('aside', { timeout: 15000 }).catch(() => null);
      await clickFirst(page, ['aside button', 'aside [role="button"]']);
      await delay(900);
    },
  },
  {
    name: 'mock-devices-modal',
    route: '/dashboard/devices',
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickFirst(page, ['table tbody tr']);
      await page.waitForSelector('[role="dialog"]', { timeout: 12000 }).catch(() => null);
      for (const label of ['Phiên chạy', 'Mã lỗi', 'Runtime', 'Biểu đồ rung', 'Tổng quan']) {
        await clickByText(page, [label]).catch(() => null);
        await delay(220);
      }
    },
  },
  {
    name: 'mock-vehicles-sheet',
    route: '/dashboard/vehicles',
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickFirst(page, ['table tbody tr']);
      await page.waitForSelector('[data-slot="sheet-content"]', { timeout: 8000 }).catch(() => null);
      await delay(600);
    },
  },
  {
    name: 'mock-drivers-modal',
    route: '/dashboard/drivers',
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickFirst(page, ['table tbody tr']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(600);
    },
  },
  { name: 'mock-customers-list', route: '/dashboard/customers' },
  { name: 'mock-customer-detail', route: '/dashboard/customers/301' },
  { name: 'mock-trips-list', route: '/dashboard/trips' },
  { name: 'mock-trip-detail', route: '/dashboard/trips/501' },
  {
    name: 'mock-alerts-modal',
    route: '/dashboard/alerts',
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByText(page, ['Chi tiết']).catch(() => null);
      await page.waitForSelector('[role="dialog"]', { timeout: 8000 }).catch(() => null);
      await delay(600);
    },
  },
  {
    name: 'mock-violations-modal',
    route: '/dashboard/violations',
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByText(page, ['Chi tiết']).catch(() => null);
      await page.waitForSelector('[role="dialog"]', { timeout: 8000 }).catch(() => null);
      await delay(600);
    },
  },
  { name: 'mock-geofences-list', route: '/dashboard/geofences' },
  { name: 'mock-geofence-detail', route: '/dashboard/geofences/701' },
  { name: 'mock-maintenance-list', route: '/dashboard/maintenance' },
  { name: 'mock-maintenance-detail', route: '/dashboard/maintenance/901' },
  {
    name: 'mock-firmware-deploy-dialog',
    route: '/dashboard/firmware',
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 20000 }).catch(() => null);
      await clickByText(page, ['Triển khai']).catch(() => null);
      await page.waitForSelector('[role="dialog"]', { timeout: 8000 }).catch(() => null);
      await delay(700);
    },
  },
  { name: 'mock-exports-page', route: '/dashboard/exports' },
  { name: 'mock-notifications-page', route: '/dashboard/notifications' },
  { name: 'mock-statistics-page', route: '/dashboard/statistics' },
  { name: 'mock-fuel-page', route: '/dashboard/fuel' },
  { name: 'mock-system-status-page', route: '/dashboard/system-status' },
  {
    name: 'mock-system-admin-tabs',
    route: '/dashboard/system-admin',
    actions: async (page) => {
      for (const tab of ['Truy vấn', 'Chỉ số', 'Nhật ký']) {
        await clickByText(page, [tab]).catch(() => null);
        await delay(350);
      }
    },
  },
  { name: 'mock-users-page', route: '/dashboard/users' },
  { name: 'mock-settings-page', route: '/dashboard/settings' },
  { name: 'mock-simulator-page', route: '/dashboard/simulator' },
];
const login = async (browser) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 45000 });

  const usernameInput = await page.$('#username');
  const passwordInput = await page.$('#password');
  if (usernameInput && passwordInput) {
    await page.type('#username', USERNAME, { delay: 8 });
    await page.type('#password', PASSWORD, { delay: 8 });
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => null),
    ]);
  }

  await page.close();
};

const runScenario = async (browser, scenario) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      consoleErrors.push({ type, text: message.text() });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) =>
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText ?? 'unknown',
    }),
  );

  const router = createMockRouter(buildMockData());
  await page.setRequestInterception(true);
  page.on('request', router);

  try {
    await page.goto(`${BASE_URL}${scenario.route}`, {
      waitUntil: 'networkidle2',
      timeout: 70000,
    });
    await delay(1200);

    let actionError = null;
    if (typeof scenario.actions === 'function') {
      try {
        await scenario.actions(page);
      } catch (error) {
        actionError = error instanceof Error ? error.message : String(error);
      }
    }

    const screenshotPath = path.join(OUTPUT_DIR, `${slug(scenario.name)}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png',
    });

    return {
      name: scenario.name,
      route: scenario.route,
      finalUrl: page.url(),
      title: await page.title(),
      screenshotPath,
      actionError,
      consoleErrors,
      pageErrors,
      failedRequests,
    };
  } finally {
    await page.close();
  }
};

const run = async () => {
  ensureDir(OUTPUT_DIR);

  try {
    const browser = await getBrowser({ headless: true });
    await login(browser);

    const results = [];
    for (const scenario of scenarios) {
      results.push(await runScenario(browser, scenario));
    }

    fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2), 'utf8');
    outputJSON({
      success: true,
      baseUrl: BASE_URL,
      reportPath: REPORT_PATH,
      totalScenarios: results.length,
      screenshots: results.map((item) => item.screenshotPath),
    });

    await disconnectBrowser();
  } catch (error) {
    outputError(error);
  }
};

void run();
