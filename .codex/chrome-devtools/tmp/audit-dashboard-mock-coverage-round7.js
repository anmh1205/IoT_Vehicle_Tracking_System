import fs from 'fs';
import path from 'path';
import {
  getBrowser,
  closeBrowser,
  outputJSON,
  outputError,
} from '../../skills/chrome-devtools/scripts/lib/browser.js';

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://thingdock.dev';
const USERNAME = process.env.AUDIT_USERNAME || 'admin';
const PASSWORD = process.env.AUDIT_PASSWORD || 'Admin@2026';
const OUTPUT_DIR = path.resolve('.codex/chrome-devtools/screenshots/mock-audit-round7');
const REPORT_PATH = path.resolve('.codex/chrome-devtools/screenshots/mock-audit-round7-report.json');
const SESSION_FILE = path.resolve('.codex/skills/chrome-devtools/scripts/.browser-session.json');
const SCENARIO_FILTER_RAW = process.env.AUDIT_SCENARIOS || process.env.AUDIT_SCENARIO || '';
const SCENARIO_FILTERS = SCENARIO_FILTER_RAW
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const SKIP_LOGIN = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.AUDIT_SKIP_LOGIN ?? '').toLowerCase(),
);
const DEBUG_NAV = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.AUDIT_DEBUG_NAV ?? '').toLowerCase(),
);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureDir = (target) => {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
};

const removeFileIfExists = (target) => {
  if (!fs.existsSync(target)) {
    return false;
  }
  fs.unlinkSync(target);
  return true;
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

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const samePath = (expectedPath, actualUrl) => {
  try {
    const actualPath = new URL(actualUrl).pathname.replace(/\/+$/, '') || '/';
    const targetPath = String(expectedPath ?? '').replace(/\/+$/, '') || '/';
    return actualPath === targetPath;
  } catch {
    return false;
  }
};

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

  customers.push(
    {
      id: 303,
      customerCode: 'CUS-HUONGNAM',
      name: 'Hop tac xa Huong Nam',
      customerType: 'company',
      contactPerson: 'Le Thi Huong',
      phone: '0933555777',
      email: 'ops@huongnam.vn',
      address: 'Thu Duc, TP.HCM',
      status: 'active',
      isActive: true,
      createdAt: iso(-22100),
      updatedAt: iso(-30),
    },
    {
      id: 304,
      customerCode: 'CUS-HAIYEN',
      name: 'Dich vu Hai Yen',
      customerType: 'individual',
      contactPerson: 'Pham Hai Yen',
      phone: '0977888999',
      email: 'haiyen@fleet.vn',
      address: 'Can Tho',
      status: 'active',
      isActive: true,
      createdAt: iso(-18000),
      updatedAt: iso(-120),
    },
  );

  vehicles.push(
    {
      id: 403,
      vehicleId: 'VEH-403',
      plateNumber: '60C-456.78',
      brand: 'Ford',
      model: 'Ranger',
      year: 2023,
      status: 'active',
      customerId: 303,
      deviceId: 'TRACKER_104',
      vehicleType: 'Pickup',
      seats: 5,
      mileageKm: 16450,
      fuelType: 'Diesel',
      registrationNumber: 'REG-403',
      insuranceExpiry: iso(120000),
      createdAt: iso(-20000),
      updatedAt: iso(-10),
    },
    {
      id: 404,
      vehicleId: 'VEH-404',
      plateNumber: '65A-111.22',
      brand: 'Kia',
      model: 'Soluto',
      year: 2020,
      status: 'active',
      customerId: 304,
      deviceId: 'TRACKER_105',
      vehicleType: 'Sedan',
      seats: 5,
      mileageKm: 52410,
      fuelType: 'Gasoline',
      registrationNumber: 'REG-404',
      insuranceExpiry: iso(96000),
      createdAt: iso(-18000),
      updatedAt: iso(-25),
    },
    {
      id: 405,
      vehicleId: 'VEH-405',
      plateNumber: '51D-909.88',
      brand: 'Isuzu',
      model: 'N-Series',
      year: 2019,
      status: 'inactive',
      customerId: 301,
      deviceId: 'TRACKER_106',
      vehicleType: 'Truck',
      seats: 2,
      mileageKm: 109220,
      fuelType: 'Diesel',
      registrationNumber: 'REG-405',
      insuranceExpiry: iso(72000),
      createdAt: iso(-24000),
      updatedAt: iso(-220),
    },
  );

  drivers.push(
    {
      id: 203,
      driverCode: 'DRV-203',
      fullName: 'Le Quoc Thai',
      phone: '0987000222',
      email: 'thai.le@fleet.vn',
      licenseNumber: '50C234567',
      licenseType: 'C',
      licenseExpiry: iso(220000),
      dateOfBirth: '1989-09-18T00:00:00.000Z',
      address: 'Go Vap, TP.HCM',
      status: 'active',
      createdAt: iso(-25000),
      updatedAt: iso(-18),
    },
    {
      id: 204,
      driverCode: 'DRV-204',
      fullName: 'Vu Thi Mai',
      phone: '0939000333',
      email: 'mai.vu@fleet.vn',
      licenseNumber: '92B555888',
      licenseType: 'B2',
      licenseExpiry: iso(120000),
      dateOfBirth: '1996-04-04T00:00:00.000Z',
      address: 'Da Nang',
      status: 'active',
      createdAt: iso(-21000),
      updatedAt: iso(-40),
    },
  );

  devices.push(
    {
      id: 104,
      deviceId: 'TRACKER_104',
      deviceName: 'Tracker 104',
      currentStatus: 'running',
      imei: '866931072334104',
      firmwareVersion: '1.6.0',
      vehiclePlate: '60C-456.78',
      customerName: customers[2].name,
      latitude: 10.81931,
      longitude: 106.6752,
      lastSeenAt: iso(-2),
      totalRuntimeSeconds: 130400,
      requestInterval: 30,
      vibrationThreshold: 1.5,
      lastErrorCode: null,
      battery: 81,
      vibration: 1.71,
      temperature: 34,
      config: { heartbeatSec: 30, mqttQoS: 1 },
      currentSession: {
        id: 9201,
        status: 'running',
        serverSessionStart: iso(-130),
        serverSessionEnd: null,
        uptime: 7860,
        avgVibration: 1.67,
        dataPointsCount: 742,
      },
    },
    {
      id: 105,
      deviceId: 'TRACKER_105',
      deviceName: 'Tracker 105',
      currentStatus: 'stopped',
      imei: '866931072334105',
      firmwareVersion: '1.6.0',
      vehiclePlate: '65A-111.22',
      customerName: customers[3].name,
      latitude: 10.0362,
      longitude: 105.7889,
      lastSeenAt: iso(-15),
      totalRuntimeSeconds: 48820,
      requestInterval: 45,
      vibrationThreshold: 1.2,
      lastErrorCode: null,
      battery: 74,
      vibration: 0.48,
      temperature: 31,
      config: { heartbeatSec: 45, mqttQoS: 1 },
      currentSession: null,
    },
    {
      id: 106,
      deviceId: 'TRACKER_106',
      deviceName: 'Tracker 106',
      currentStatus: 'disconnected',
      imei: '866931072334106',
      firmwareVersion: '1.5.4',
      vehiclePlate: '51D-909.88',
      customerName: customers[0].name,
      latitude: 11.0124,
      longitude: 106.635,
      lastSeenAt: iso(-230),
      totalRuntimeSeconds: 19710,
      requestInterval: 120,
      vibrationThreshold: 1.0,
      lastErrorCode: 408,
      battery: 42,
      vibration: null,
      temperature: null,
      config: { heartbeatSec: 120, mqttQoS: 0 },
      currentSession: null,
    },
  );

  deviceSessions[104] = [
    devices[3].currentSession,
    {
      id: 9200,
      status: 'completed',
      serverSessionStart: iso(-420),
      serverSessionEnd: iso(-260),
      uptime: 9600,
      avgVibration: 1.33,
      dataPointsCount: 1002,
    },
  ];
  deviceSessions[105] = [
    {
      id: 9301,
      status: 'completed',
      serverSessionStart: iso(-780),
      serverSessionEnd: iso(-640),
      uptime: 8400,
      avgVibration: 0.75,
      dataPointsCount: 631,
    },
  ];
  deviceSessions[106] = [];

  deviceErrors[104] = [];
  deviceErrors[105] = [];
  deviceErrors[106] = [
    {
      id: 7601,
      errorCode: 408,
      errorName: 'Mat ket noi backend',
      description: 'Khong nhan duoc ACK tu backend qua nguong timeout.',
      occurredAt: iso(-260),
      resolvedAt: null,
    },
  ];

  deviceTelemetry[104] = Array.from({ length: 24 }).map((_, index) => ({
    timestamp: iso(-(24 - index) * 6),
    value: Number((1.1 + Math.sin(index / 3) * 0.35).toFixed(2)),
  }));
  deviceTelemetry[105] = Array.from({ length: 20 }).map((_, index) => ({
    timestamp: iso(-(20 - index) * 8),
    value: Number((0.8 + Math.cos(index / 4) * 0.2).toFixed(2)),
  }));
  deviceTelemetry[106] = [];

  trips.push(
    {
      id: 503,
      tripCode: 'TRIP-503',
      vehicleId: 'VEH-403',
      deviceId: 'TRACKER_104',
      driverName: 'Le Quoc Thai',
      status: 'planned',
      plannedStart: iso(90),
      plannedEnd: iso(360),
      actualStart: null,
      actualEnd: null,
      distanceKm: 55.1,
      updatedAt: iso(-12),
      createdAt: iso(-160),
    },
    {
      id: 504,
      tripCode: 'TRIP-504',
      vehicleId: 'VEH-405',
      deviceId: 'TRACKER_106',
      driverName: 'Vu Thi Mai',
      status: 'cancelled',
      plannedStart: iso(-500),
      plannedEnd: iso(-420),
      actualStart: null,
      actualEnd: null,
      distanceKm: 0,
      updatedAt: iso(-410),
      createdAt: iso(-650),
    },
  );

  tripTelemetry[503] = {
    points: Array.from({ length: 16 }).map((_, index) => ({
      lat: 10.81 + index * 0.0009,
      lon: 106.67 + index * 0.0011,
      speed: Math.max(0, Math.round(24 + Math.sin(index / 2) * 12)),
      timestamp: iso(-(16 - index) * 4),
    })),
    summary: { distanceKm: 44.8, durationMinutes: 88, avgSpeed: 30.6, maxSpeed: 62 },
  };
  tripTelemetry[504] = {
    points: [],
    summary: { distanceKm: 0, durationMinutes: 0, avgSpeed: 0, maxSpeed: 0 },
  };

  alerts.push(
    {
      id: 603,
      title: 'Roi khoi geofence Kho Binh Tan',
      alertType: 'geofence_exit',
      severity: 'medium',
      status: 'resolved',
      message: 'VEH-403 roi khoi khu vuc duoc gan geofence.',
      latitude: 10.7815,
      longitude: 106.6114,
      createdAt: iso(-95),
      updatedAt: iso(-70),
    },
    {
      id: 604,
      title: 'Pin thap tren TRACKER_106',
      alertType: 'battery',
      severity: 'high',
      status: 'active',
      message: 'Muc pin xuong duoi 45%.',
      latitude: 11.0124,
      longitude: 106.635,
      createdAt: iso(-180),
      updatedAt: iso(-170),
    },
  );

  violations.push(
    {
      id: 802,
      alertId: 603,
      vehicleId: '60C-456.78',
      driverId: 203,
      violationType: 'geofence',
      severity: 'medium',
      description: 'Ra khoi geofence ngoai khung gio cho phep',
      speedLimit: null,
      actualSpeed: 41,
      locationLat: 10.7815,
      locationLon: 106.6114,
      acknowledged: true,
      createdAt: iso(-90),
      updatedAt: iso(-80),
    },
    {
      id: 803,
      alertId: 604,
      vehicleId: '51D-909.88',
      driverId: 204,
      violationType: 'battery',
      severity: 'high',
      description: 'Pin duoi nguong van hanh',
      speedLimit: null,
      actualSpeed: 0,
      locationLat: 11.0124,
      locationLon: 106.635,
      acknowledged: false,
      createdAt: iso(-175),
      updatedAt: iso(-165),
    },
  );

  geofences.push({
    id: 702,
    name: 'Ben xe Mien Dong moi',
    description: 'Vung trung chuyen khach theo ca.',
    geofenceType: 'polygon',
    centerLatitude: 10.8415,
    centerLongitude: 106.8075,
    radiusMeters: 620,
    triggerOn: 'enter',
    isActive: true,
    vehicleIds: ['VEH-403'],
    notifyEmail: true,
    notifyPush: false,
    color: '#2563eb',
    createdAt: iso(-32000),
    updatedAt: iso(-90),
  });

  maintenance.push(
    {
      id: 902,
      taskCode: 'MNT-902',
      vehicleId: 'VEH-402',
      title: 'Can chinh lop truoc',
      maintenanceType: 'inspection',
      status: 'in_progress',
      scheduledDate: iso(-240),
      completedDate: null,
      nextServiceDate: iso(7200),
      nextServiceMileage: 82000,
      estimatedCost: 650000,
      actualCost: null,
      odometerKm: 76100,
      notes: 'Can tra phet va bo roi.',
      createdAt: iso(-600),
      updatedAt: iso(-55),
    },
    {
      id: 903,
      taskCode: 'MNT-903',
      vehicleId: 'VEH-404',
      title: 'Bao duong dieu hoa',
      maintenanceType: 'repair',
      status: 'completed',
      scheduledDate: iso(-4800),
      completedDate: iso(-4680),
      nextServiceDate: iso(14400),
      nextServiceMileage: 60000,
      estimatedCost: 2100000,
      actualCost: 1980000,
      odometerKm: 52410,
      notes: 'Da thay loc va bo tri ga.',
      createdAt: iso(-5200),
      updatedAt: iso(-4600),
    },
  );

  const firmwares = [
    {
      id: 1,
      version: '1.6.0',
      filename: 'tracker-v1.6.0.bin',
      filePath: '/firmware/tracker-v1.6.0.bin',
      size: 2428112,
      description: 'On dinh MQTT va dong bo OTA',
      isActive: true,
      createdAt: iso(-28800),
    },
    {
      id: 2,
      version: '1.5.4',
      filename: 'tracker-v1.5.4.bin',
      filePath: '/firmware/tracker-v1.5.4.bin',
      size: 2205904,
      description: 'Ban on dinh cu',
      isActive: false,
      createdAt: iso(-76000),
    },
  ];

  const firmwareDeployments = {
    1: [
      {
        id: 1101,
        jobId: 'OTA-1101',
        deviceId: 'TRACKER_101',
        status: 'completed',
        summaryStatus: 'success',
        progress: 100,
        targetVersion: '1.6.0',
        currentVersion: '1.6.0',
        partition: 'ota_1',
        startedAt: iso(-420),
        completedAt: iso(-360),
        updatedAt: iso(-360),
        firstAssignedAt: iso(-435),
        commandDispatchedAt: iso(-430),
        lastSeenAt: iso(-350),
        lastSeqNo: 52,
        lastMessageId: 'msg-1101',
        lastBootId: 'boot-1101',
        isStuck: false,
        stuckReason: null,
        errorCode: null,
        errorMessage: null,
      },
      {
        id: 1102,
        jobId: 'OTA-1102',
        deviceId: 'TRACKER_102',
        status: 'processing',
        summaryStatus: 'running',
        progress: 68,
        targetVersion: '1.6.0',
        currentVersion: '1.5.4',
        partition: 'ota_0',
        startedAt: iso(-95),
        completedAt: null,
        updatedAt: iso(-4),
        firstAssignedAt: iso(-110),
        commandDispatchedAt: iso(-108),
        lastSeenAt: iso(-3),
        lastSeqNo: 31,
        lastMessageId: 'msg-1102',
        lastBootId: 'boot-1102',
        isStuck: false,
        stuckReason: null,
        errorCode: null,
        errorMessage: null,
      },
    ],
    2: [],
  };

  const exportJobs = [
    {
      id: 1301,
      exportType: 'statistics',
      status: 'completed',
      filters: { format: 'csv' },
      filePath: '/exports/stats.csv',
      createdAt: iso(-280),
      completedAt: iso(-260),
    },
    {
      id: 1302,
      exportType: 'alerts',
      status: 'processing',
      filters: { format: 'excel' },
      filePath: null,
      createdAt: iso(-80),
      completedAt: null,
    },
    {
      id: 1303,
      exportType: 'devices',
      status: 'pending',
      filters: { format: 'csv' },
      filePath: null,
      createdAt: iso(-25),
      completedAt: null,
    },
  ];

  const notifications = [
    {
      id: 1401,
      type: 'alert',
      title: 'Canh bao vuot toc do',
      message: 'Xe 51A-999.99 vuot nguong.',
      isRead: false,
      referenceId: 601,
      referenceType: 'alert',
      createdAt: iso(-20),
    },
    {
      id: 1402,
      type: 'firmware',
      title: 'OTA dang trien khai',
      message: 'TRACKER_102 dat 68%.',
      isRead: false,
      referenceId: 1102,
      referenceType: 'deployment',
      createdAt: iso(-55),
    },
    {
      id: 1403,
      type: 'system',
      title: 'Victoriametrics do tre cao',
      message: 'Do tre tang bat thuong.',
      isRead: true,
      referenceId: null,
      referenceType: null,
      createdAt: iso(-15),
    },
    {
      id: 1404,
      type: 'geofence',
      title: 'Ra khoi geofence',
      message: 'VEH-403 roi khoi khu vuc giam sat.',
      isRead: false,
      referenceId: 603,
      referenceType: 'alert',
      createdAt: iso(-75),
    },
  ];

  const users = [
    {
      id: 1501,
      username: 'admin',
      fullName: 'Nguyen Quan Tri',
      email: 'admin@thingdock.dev',
      role: 'admin',
      status: 'active',
    },
    {
      id: 1502,
      username: 'operator.hcm',
      fullName: 'Tran Dieu Hanh',
      email: 'operator.hcm@thingdock.dev',
      role: 'operator',
      status: 'active',
    },
    {
      id: 1503,
      username: 'viewer.audit',
      fullName: 'Pham Giam Sat',
      email: 'viewer.audit@thingdock.dev',
      role: 'viewer',
      status: 'suspended',
    },
    {
      id: 1504,
      username: 'manager.west',
      fullName: 'Le Khu Vuc',
      email: 'manager.west@thingdock.dev',
      role: 'manager',
      status: 'inactive',
    },
  ];

  const systemSettings = {
    realtimeIntervalMs: 2000,
    mqttTopicPrefix: 'vehicle/',
    alertEscalationMinutes: 15,
  };

  const auditLogs = [
    {
      id: 'audit-1',
      actor: 'admin',
      action: 'update_setting',
      target: 'mqttTopicPrefix',
      createdAt: iso(-45),
    },
    {
      id: 'audit-2',
      actor: 'operator.hcm',
      action: 'acknowledge_alert',
      target: 'alert:601',
      createdAt: iso(-70),
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
    firmwares,
    firmwareDeployments,
    exportJobs,
    notifications,
    users,
    systemSettings,
    auditLogs,
  };
};
const createMockRouter = (mockData, coverage) => {
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

  const readPayload = (req) => {
    try {
      const raw = req.postData();
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const pickSettings = (payload) => ({
    preferences: {
      emailAlerts: Boolean(payload?.emailAlerts ?? true),
      pushAlerts: Boolean(payload?.pushAlerts ?? true),
      alertTypes: Array.isArray(payload?.alertTypes) ? payload.alertTypes : ['alert', 'system'],
    },
  });

  return async (request) => {
    const url = new URL(request.url());
    const pathName = url.pathname;
    const method = request.method().toUpperCase();
    const searchParams = url.searchParams;

    if (!pathName.includes('/api/v1/')) {
      return request.continue();
    }

    coverage.requests.push({ method, pathName, query: url.search });

    const respond = (data, tag = pathName) => {
      coverage.handled.push({ method, pathName, tag });
      return request.respond(jsonOk(envelope(data)));
    };

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

    if (method === 'PUT' && /\/api\/v1\/auth\/profile$/.test(pathName)) {
      return respond({
        ...mockData.users[0],
      });
    }

    if (method === 'POST' && /\/api\/v1\/auth\/change-password$/.test(pathName)) {
      return respond({ message: 'password-updated' });
    }

    if (method === 'PUT' && /\/api\/v1\/auth\/notifications$/.test(pathName)) {
      return respond({
        ...mockData.users[0],
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

    if (method === 'PUT' && /\/api\/v1\/vehicles\/(\d+)\/device$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/vehicles\/(\d+)\/device$/)?.[1] ?? '0');
      const target = byId(mockData.vehicles, id);
      const payload = readPayload(request);
      if (target) {
        target.deviceId = payload?.deviceId ?? null;
      }
      return respond(target ?? { id, deviceId: payload?.deviceId ?? null });
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

    if (method === 'GET' && /\/api\/v1\/geofences\/vehicles\/([^/]+)\/policy-states$/.test(pathName)) {
      const vehicleId = pathName.match(/\/api\/v1\/geofences\/vehicles\/([^/]+)\/policy-states$/)?.[1] ?? '';
      return respond(
        mockData.geofences.map((item) => ({
          geofenceId: item.id,
          geofenceName: item.name,
          vehicleId,
          state: item.vehicleIds.includes(vehicleId) ? 'inside' : 'outside',
          updatedAt: new Date().toISOString(),
        })),
      );
    }

    if (method === 'POST' && /\/api\/v1\/geofences\/(\d+)\/vehicles$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/geofences\/(\d+)\/vehicles$/)?.[1] ?? '0');
      const payload = readPayload(request);
      const vehicleId = String(payload?.vehicleId ?? '');
      const target = byId(mockData.geofences, id);
      if (target && vehicleId && !target.vehicleIds.includes(vehicleId)) {
        target.vehicleIds.push(vehicleId);
      }
      return respond(target ?? { id, vehicleIds: vehicleId ? [vehicleId] : [] });
    }

    if (method === 'DELETE' && /\/api\/v1\/geofences\/(\d+)\/vehicles\/([^/]+)$/.test(pathName)) {
      const match = pathName.match(/\/api\/v1\/geofences\/(\d+)\/vehicles\/([^/]+)$/);
      const id = Number(match?.[1] ?? '0');
      const vehicleId = String(match?.[2] ?? '');
      const target = byId(mockData.geofences, id);
      if (target) {
        target.vehicleIds = target.vehicleIds.filter((item) => item !== vehicleId);
      }
      return respond(target ?? { id, vehicleIds: [] });
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

    if (method === 'GET' && /\/api\/v1\/firmware\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/firmware\/(\d+)$/)?.[1] ?? '0');
      return respond(byId(mockData.firmwares ?? [], id) ?? {});
    }

    if (method === 'POST' && /\/api\/v1\/firmware\/(\d+)\/deploy$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/firmware\/(\d+)\/deploy$/)?.[1] ?? '0');
      const payload = readPayload(request);
      return respond({
        id,
        strategy: payload?.strategy ?? 'rolling',
        deviceIds: Array.isArray(payload?.deviceIds) ? payload.deviceIds : [],
        message: 'deployment-created',
      });
    }

    if (method === 'POST' && /\/api\/v1\/firmware\/(\d+)\/activate$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/firmware\/(\d+)\/activate$/)?.[1] ?? '0');
      return respond({ ...(byId(mockData.firmwares ?? [], id) ?? {}), isActive: true });
    }

    if (method === 'POST' && /\/api\/v1\/firmware\/(\d+)\/deactivate$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/firmware\/(\d+)\/deactivate$/)?.[1] ?? '0');
      return respond({ ...(byId(mockData.firmwares ?? [], id) ?? {}), isActive: false });
    }

    if (method === 'DELETE' && /\/api\/v1\/firmware\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/firmware\/(\d+)$/)?.[1] ?? '0');
      return respond({ message: 'deleted', id });
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

    if (method === 'GET' && /\/api\/v1\/exports\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/exports\/(\d+)$/)?.[1] ?? '0');
      const item =
        (mockData.exportJobs ?? []).find((row) => Number(row.id) === id) ?? {
          id,
          exportType: 'custom',
          status: 'pending',
          filters: {},
          filePath: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
        };
      return respond(item);
    }

    if (method === 'POST' && /\/api\/v1\/exports$/.test(pathName)) {
      const payload = readPayload(request);
      return respond({
        id: 1399,
        exportType: String(payload?.exportType ?? 'statistics'),
        status: 'processing',
        filters: payload?.filters ?? {},
        filePath: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      });
    }

    if (method === 'PUT' && /\/api\/v1\/notifications\/mark-all-read$/.test(pathName)) {
      for (const row of mockData.notifications ?? []) {
        row.isRead = true;
      }
      return respond({ message: 'all-read' });
    }

    if (method === 'PUT' && /\/api\/v1\/notifications\/(\d+)\/read$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/notifications\/(\d+)\/read$/)?.[1] ?? '0');
      const target = (mockData.notifications ?? []).find((row) => Number(row.id) === id);
      if (target) {
        target.isRead = true;
      }
      return respond(target ?? { id, isRead: true });
    }

    if (method === 'DELETE' && /\/api\/v1\/notifications\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/notifications\/(\d+)$/)?.[1] ?? '0');
      mockData.notifications = (mockData.notifications ?? []).filter((row) => Number(row.id) !== id);
      return respond({ message: 'deleted', id });
    }

    if (method === 'GET' && /\/api\/v1\/notifications\/stats$/.test(pathName)) {
      const notifications = mockData.notifications ?? [];
      const total = notifications.length;
      const unreadCount = notifications.filter((row) => !row.isRead).length;
      const byType = { alert: 0, system: 0, export: 0, firmware: 0, geofence: 0 };
      for (const row of notifications) {
        if (row.type in byType) {
          byType[row.type] += 1;
        }
      }
      return respond({ total, unreadCount, byType });
    }

    if (method === 'GET' && /\/api\/v1\/notifications$/.test(pathName)) {
      const rows = [...(mockData.notifications ?? [])];
      const search = searchParams.get('search')?.trim();
      const type = searchParams.get('type');
      const isReadRaw = searchParams.get('isRead');
      let filtered = rows;
      if (type) {
        filtered = filtered.filter((row) => String(row.type) === String(type));
      }
      if (isReadRaw === 'true' || isReadRaw === 'false') {
        filtered = filtered.filter((row) => row.isRead === (isReadRaw === 'true'));
      }
      if (search) {
        filtered = filtered.filter((row) =>
          includesText(`${row.title} ${row.message} ${row.type}`, search),
        );
      }
      filtered.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
      const paged = paginate(filtered, searchParams, 20);
      return respond({
        ...paged,
        unreadCount: filtered.filter((row) => !row.isRead).length,
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

    if (method === 'GET' && /\/api\/v1\/users\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/users\/(\d+)$/)?.[1] ?? '0');
      return respond(byId(mockData.users ?? [], id) ?? {});
    }

    if (method === 'POST' && /\/api\/v1\/users$/.test(pathName)) {
      const payload = readPayload(request);
      return respond({
        id: 1999,
        username: String(payload?.username ?? 'new.user'),
        fullName: String(payload?.fullName ?? 'Nguoi dung moi'),
        email: payload?.email ?? null,
        role: payload?.role ?? 'viewer',
        status: 'active',
      });
    }

    if (method === 'PATCH' && /\/api\/v1\/users\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/users\/(\d+)$/)?.[1] ?? '0');
      const payload = readPayload(request);
      const existing = byId(mockData.users ?? [], id) ?? { id };
      return respond({ ...existing, ...payload, id });
    }

    if (method === 'DELETE' && /\/api\/v1\/users\/(\d+)$/.test(pathName)) {
      const id = Number(pathName.match(/\/api\/v1\/users\/(\d+)$/)?.[1] ?? '0');
      mockData.users = (mockData.users ?? []).filter((row) => Number(row.id) !== id);
      return respond({ message: 'deleted', id });
    }

    if (method === 'GET' && /\/api\/v1\/users$/.test(pathName)) {
      const search = searchParams.get('search')?.trim();
      const role = searchParams.get('role');
      const status = searchParams.get('status');
      let rows = [...(mockData.users ?? [])];
      if (role) {
        rows = rows.filter((item) => String(item.role) === String(role));
      }
      if (status) {
        rows = rows.filter((item) => String(item.status) === String(status));
      }
      if (search) {
        rows = rows.filter((item) =>
          includesText(`${item.username} ${item.fullName} ${item.email ?? ''}`, search),
        );
      }
      return respond(paginate(rows, searchParams, 20));
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

    if (method === 'GET' && /\/api\/v1\/statistics\/alert-frequency$/.test(pathName)) {
      return respond({
        labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
        series: {
          high: [3, 2, 4, 3, 5, 2, 1],
          medium: [6, 5, 4, 5, 4, 6, 5],
          low: [2, 3, 2, 2, 1, 3, 2],
        },
      });
    }

    if (method === 'GET' && /\/api\/v1\/statistics\/trip-summary$/.test(pathName)) {
      return respond({
        labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
        totalTrips: [12, 13, 11, 14, 15, 10, 9],
      });
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

    if (method === 'GET' && /\/api\/v1\/system-admin\/health$/.test(pathName)) {
      return respond({
        status: 'up',
        checks: {
          postgres: { status: 'up', latencyMs: 14 },
          redis: { status: 'up', latencyMs: 3 },
          emqx: { status: 'up', latencyMs: 10 },
        },
      });
    }

    if (method === 'GET' && /\/api\/v1\/system-admin\/audit$/.test(pathName)) {
      return respond(
        paginate(
          [...(mockData.auditLogs ?? [])].sort(
            (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
          ),
          searchParams,
          20,
        ),
      );
    }

    if (method === 'GET' && /\/api\/v1\/system-admin\/settings$/.test(pathName)) {
      return respond(mockData.systemSettings ?? {});
    }

    if (method === 'PUT' && /\/api\/v1\/system-admin\/settings\/([^/]+)$/.test(pathName)) {
      const key = pathName.match(/\/api\/v1\/system-admin\/settings\/([^/]+)$/)?.[1] ?? '';
      const payload = readPayload(request);
      if (key) {
        mockData.systemSettings[key] = payload?.value;
      }
      return respond({ key, value: payload?.value ?? null });
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
      const payload = readPayload(request);
      simulatorState.running = true;
      simulatorState.paused = false;
      simulatorState.jobId = 'SIM-001';
      simulatorState.lastTickAt = new Date().toISOString();
      if (Number.isFinite(Number(payload?.intervalSec))) {
        simulatorState.intervalSec = Number(payload.intervalSec);
      }
      if (Number.isFinite(Number(payload?.durationMin))) {
        simulatorState.durationMin = Number(payload.durationMin);
      }
      return respond(simulatorState);
    }

    if (method === 'POST' && /\/api\/v1\/simulator\/pause$/.test(pathName)) {
      simulatorState.running = true;
      simulatorState.paused = true;
      simulatorState.lastTickAt = new Date().toISOString();
      return respond(simulatorState);
    }

    if (method === 'POST' && /\/api\/v1\/simulator\/resume$/.test(pathName)) {
      simulatorState.running = true;
      simulatorState.paused = false;
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

    coverage.unhandled.push({ method, pathName, query: url.search });
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

const clickByText = async (
  page,
  labels,
  {
    selector = 'button,[role="tab"],a',
    rootSelector = null,
    exact = false,
  } = {},
) =>
  page.evaluate(
    ({ labels: targetLabels, selector: targetSelector, rootSelector: scope, exact: strict }) => {
      const normalize = (value) =>
        String(value ?? '')
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase()
          .trim();
      const root = scope ? document.querySelector(scope) : document;
      const nodes = root ? Array.from(root.querySelectorAll(targetSelector)) : [];
      for (const label of targetLabels) {
        const normalizedLabel = normalize(label);
        const hit = nodes.find((node) => {
          const text = normalize(node.textContent ?? '');
          if (!text) return false;
          return strict ? text === normalizedLabel : text.includes(normalizedLabel);
        });
        if (hit) {
          hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return label;
        }
      }
      return null;
    },
    { labels, selector, rootSelector, exact },
  );

const clickByTextWithSelectors = async (page, labels, selectors = []) => {
  for (const selector of selectors) {
    const hit = await clickByText(page, labels, { selector }).catch(() => null);
    if (hit) {
      return hit;
    }
  }
  return null;
};

const openFirstRowMenu = async (page) => {
  await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
  const clicked = await clickFirst(page, [
    'table tbody tr td:last-child button[aria-haspopup="menu"]',
    'table tbody tr td:last-child button',
    'table tbody tr button[aria-haspopup="menu"]',
    'table tbody tr button',
  ]);
  if (clicked) {
    await delay(220);
  }
  return clicked;
};

const clickNth = async (page, selector, index = 0) => {
  const nodes = await page.$$(selector);
  const target = nodes[index];
  if (!target) {
    return false;
  }
  await target.click().catch(() => null);
  return true;
};

const runProbes = async (page, probes = []) =>
  page.evaluate((probeItems) => {
    const normalize = (value) =>
      String(value ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();

    const bodyText = normalize(document.body?.innerText ?? '');
    return probeItems.map((probe) => {
      const selectorCount = probe.selector
        ? document.querySelectorAll(probe.selector).length
        : 0;
      const textMatched = probe.text ? bodyText.includes(normalize(probe.text)) : true;
      const min = Number.isFinite(Number(probe.min)) ? Number(probe.min) : 1;
      const ok = (probe.selector ? selectorCount >= min : true) && textMatched;
      return {
        label: probe.label ?? probe.selector ?? probe.text ?? 'probe',
        selector: probe.selector ?? null,
        text: probe.text ?? null,
        min,
        count: selectorCount,
        ok,
      };
    });
  }, probes);

const waitForLeafletSettled = async (page, timeout = 7000) => {
  await page
    .waitForFunction(
      () => {
        const mapContainers = document.querySelectorAll('.leaflet-container');
        if (mapContainers.length === 0) {
          return true;
        }
        const loadedTiles = document.querySelectorAll('.leaflet-tile-loaded').length;
        const loadingTiles = document.querySelectorAll('.leaflet-tile-loading').length;
        return loadedTiles > 0 && loadingTiles === 0;
      },
      { timeout },
    )
    .catch(() => null);
  await delay(260);
};

const shouldIgnoreFailedRequest = (request) => {
  const failure = request.failure()?.errorText ?? '';
  if (failure !== 'net::ERR_ABORTED') {
    return false;
  }
  const url = request.url();
  return url.includes('_rsc=');
};

const scenarios = [
  {
    name: 'mock-dashboard-overview',
    route: '/dashboard',
    probes: [{ label: 'dashboard-chart', selector: 'svg.recharts-surface', min: 1 }],
  },
  {
    name: 'mock-map-with-selection',
    route: '/dashboard/map',
    probes: [{ label: 'map-markers', selector: '.leaflet-marker-icon', min: 1 }],
    actions: async (page) => {
      await page.waitForSelector('aside', { timeout: 15000 }).catch(() => null);
      await clickFirst(page, ['aside button', 'aside [role="button"]']);
      await delay(900);
    },
  },
  {
    name: 'mock-devices-modal',
    route: '/dashboard/devices',
    probes: [
      { label: 'devices-rows', selector: 'table tbody tr', min: 1 },
      { label: 'devices-dialog', selector: '[role=\"dialog\"]', min: 1 },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickFirst(page, ['table tbody tr']);
      await page.waitForSelector('[role="dialog"]', { timeout: 12000 }).catch(() => null);
      for (const label of ['Phiên chạy', 'Mã lỗi', 'Runtime', 'Biểu đồ rung', 'Tổng quan']) {
        await clickByText(page, [label], {
          selector: '[role="dialog"] button,[role="dialog"] [role="tab"]',
          rootSelector: '[role="dialog"]',
        }).catch(() => null);
        await delay(220);
      }
    },
  },
  {
    name: 'mock-vehicles-sheet',
    route: '/dashboard/vehicles',
    probes: [
      { label: 'vehicles-rows', selector: 'table tbody tr', min: 1 },
      { label: 'vehicles-sheet', selector: '[data-slot=\"sheet-content\"]', min: 1 },
    ],
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
    probes: [
      { label: 'drivers-rows', selector: 'table tbody tr', min: 1 },
      { label: 'drivers-dialog', selector: '[role=\"dialog\"]', min: 1 },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickFirst(page, ['table tbody tr']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(600);
    },
  },
  {
    name: 'mock-customers-list',
    route: '/dashboard/customers',
    probes: [{ label: 'customers-rows', selector: 'table tbody tr', min: 1 }],
  },
  {
    name: 'mock-customer-detail',
    route: '/dashboard/customers/301',
    probes: [{ label: 'customer-detail-card', selector: '[data-slot=\"card\"]', min: 1 }],
  },
  {
    name: 'mock-trips-list',
    route: '/dashboard/trips',
    probes: [{ label: 'trips-rows', selector: 'table tbody tr', min: 1 }],
  },
  {
    name: 'mock-trip-detail',
    route: '/dashboard/trips/501',
    probes: [{ label: 'trip-map', selector: '.leaflet-pane svg path', min: 1 }],
  },
  {
    name: 'mock-alerts-modal',
    route: '/dashboard/alerts',
    probes: [
      { label: 'alerts-rows', selector: 'table tbody tr', min: 1 },
      { label: 'alerts-dialog', selector: '[role=\"dialog\"]', min: 1 },
    ],
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
    probes: [
      { label: 'violations-rows', selector: 'table tbody tr', min: 1 },
      { label: 'violations-dialog', selector: '[role=\"dialog\"]', min: 1 },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByText(page, ['Chi tiết']).catch(() => null);
      await page.waitForSelector('[role="dialog"]', { timeout: 8000 }).catch(() => null);
      await delay(600);
    },
  },
  {
    name: 'mock-geofences-list',
    route: '/dashboard/geofences',
    probes: [{ label: 'geofences-rows', selector: 'table tbody tr', min: 1 }],
  },
  {
    name: 'mock-geofence-detail',
    route: '/dashboard/geofences/701',
    probes: [{ label: 'geofence-detail-card', selector: '[data-slot=\"card\"]', min: 1 }],
  },
  {
    name: 'mock-maintenance-list',
    route: '/dashboard/maintenance',
    probes: [{ label: 'maintenance-rows', selector: 'table tbody tr', min: 1 }],
  },
  {
    name: 'mock-maintenance-detail',
    route: '/dashboard/maintenance/901',
    probes: [{ label: 'maintenance-detail-card', selector: '[data-slot=\"card\"]', min: 1 }],
  },
  {
    name: 'mock-firmware-deploy-dialog',
    route: '/dashboard/firmware',
    probes: [
      { label: 'firmware-rows', selector: 'table tbody tr', min: 1 },
      { label: 'firmware-dialog', selector: '[role=\"dialog\"]', min: 1 },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 20000 }).catch(() => null);
      await clickByText(page, ['Triển khai']).catch(() => null);
      await page.waitForSelector('[role="dialog"]', { timeout: 8000 }).catch(() => null);
      await delay(700);
    },
  },
  {
    name: 'mock-exports-page',
    route: '/dashboard/exports',
    probes: [{ label: 'exports-rows', selector: 'table tbody tr', min: 1 }],
  },
  {
    name: 'mock-notifications-page',
    route: '/dashboard/notifications',
    probes: [{ label: 'notifications-card', selector: '[data-slot=\"card\"]', min: 1 }],
    actions: async (page) => {
      await clickByText(page, ['danh dau tat ca da doc']).catch(() => null);
      await delay(450);
    },
  },
  {
    name: 'mock-statistics-page',
    route: '/dashboard/statistics',
    probes: [{ label: 'statistics-charts', selector: 'svg.recharts-surface', min: 1 }],
  },
  {
    name: 'mock-fuel-page',
    route: '/dashboard/fuel',
    probes: [{ label: 'fuel-cards', selector: '[data-slot=\"card\"]', min: 1 }],
  },
  {
    name: 'mock-system-status-page',
    route: '/dashboard/system-status',
    probes: [{ label: 'system-cards', selector: '[data-slot=\"card\"]', min: 1 }],
  },
  {
    name: 'mock-system-admin-tabs',
    route: '/dashboard/system-admin',
    probes: [{ label: 'system-admin-cards', selector: '[data-slot=\"card\"]', min: 1 }],
    actions: async (page) => {
      for (const tab of ['Truy vấn', 'Chỉ số', 'Nhật ký']) {
        await clickByText(page, [tab]).catch(() => null);
        await delay(350);
      }
    },
  },
  {
    name: 'mock-users-page',
    route: '/dashboard/users',
    probes: [{ label: 'users-rows', selector: 'table tbody tr', min: 1 }],
    actions: async (page) => {
      await clickByText(page, ['dat lai mat khau']).catch(() => null);
      await delay(300);
    },
  },
  {
    name: 'mock-settings-page',
    route: '/dashboard/settings',
    probes: [{ label: 'settings-tabs', selector: '[role=\"tab\"]', min: 4 }],
    actions: async (page) => {
      for (const tab of ['mat khau', 'thong bao', 'giao dien', 'ho so']) {
        await clickByText(page, [tab]).catch(() => null);
        await delay(260);
      }
    },
  },
  {
    name: 'mock-simulator-page',
    route: '/dashboard/simulator',
    probes: [{ label: 'simulator-cards', selector: '[data-slot=\"card\"]', min: 3 }],
    actions: async (page) => {
      await page.waitForSelector('input[type=\"checkbox\"]', { timeout: 10000 }).catch(() => null);
      await clickFirst(page, ['input[type=\"checkbox\"]']);
      await delay(260);
      await clickByText(page, ['bat dau']).catch(() => null);
      await delay(320);
      await clickByText(page, ['tam dung']).catch(() => null);
      await delay(320);
      await clickByText(page, ['tiep tuc']).catch(() => null);
      await delay(320);
      await clickByText(page, ['dung']).catch(() => null);
      await delay(320);
    },
  },
  {
    name: 'mock-devices-create-modal',
    route: '/dashboard/devices',
    probes: [
      { label: 'devices-create-dialog', selector: '[role=\"dialog\"]', min: 1 },
      { label: 'devices-create-form', selector: '[role=\"dialog\"] form', min: 1 },
    ],
    actions: async (page) => {
      await clickByTextWithSelectors(page, ['them thiet bi'], ['button,a,[role="menuitem"]']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(450);
    },
  },
  {
    name: 'mock-devices-edit-modal',
    route: '/dashboard/devices',
    probes: [
      { label: 'devices-edit-dialog', selector: '[role=\"dialog\"]', min: 1 },
      { label: 'devices-edit-device-id', selector: '[role=\"dialog\"] input', min: 3 },
    ],
    actions: async (page) => {
      await openFirstRowMenu(page);
      await clickByTextWithSelectors(page, ['chinh sua', 'sua'], [
        '[role="menuitem"]',
        'button',
        'a',
      ]);
      await page.waitForSelector('[role="dialog"]', { timeout: 12000 }).catch(() => null);
      await delay(450);
    },
  },
  {
    name: 'mock-devices-delete-dialog',
    route: '/dashboard/devices',
    probes: [
      { label: 'devices-delete-dialog', selector: '[role=\"dialog\"],[role=\"alertdialog\"]', min: 1 },
      { label: 'devices-delete-text', text: 'xoa thiet bi' },
    ],
    actions: async (page) => {
      await openFirstRowMenu(page);
      await clickByTextWithSelectors(page, ['xoa'], ['[role="menuitem"]', 'button', 'a']);
      await page.waitForSelector('[role="dialog"]', { timeout: 12000 }).catch(() => null);
      await delay(450);
    },
  },
  {
    name: 'mock-devices-session-chart-dialog',
    route: '/dashboard/devices',
    probes: [
      {
        label: 'devices-detail-and-chart-dialogs',
        selector: '[role=\"dialog\"],[role=\"alertdialog\"]',
        min: 2,
      },
      { label: 'devices-session-actions', selector: '[role=\"dialog\"] button', min: 3 },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickFirst(page, ['table tbody tr']);
      await page.waitForSelector('[role="dialog"]', { timeout: 12000 }).catch(() => null);
      await clickNth(page, '[role="dialog"] [role="tab"]', 1).catch(() => null);
      await delay(260);
      await clickByTextWithSelectors(page, ['xem bieu do rung', 'xem'], [
        '[role="dialog"] button',
        'button',
      ]);
      await delay(500);
    },
  },
  {
    name: 'mock-devices-export-dialog',
    route: '/dashboard/devices',
    probes: [
      { label: 'devices-export-dialogs', selector: '[role=\"dialog\"]', min: 2 },
      { label: 'devices-export-form', text: 'xuat du lieu thiet bi' },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickFirst(page, ['table tbody tr']);
      await page.waitForSelector('[role="dialog"]', { timeout: 12000 }).catch(() => null);
      await clickFirst(page, [
        '[role="dialog"] button[aria-haspopup="menu"]',
        '[role="dialog"] button[aria-label]',
      ]);
      await delay(240);
      await clickByTextWithSelectors(
        page,
        ['xuat du lieu thiet bi', 'xuat theo khoang thoi gian'],
        ['[role="menuitem"]', 'button', 'a'],
      );
      await delay(500);
    },
  },
  {
    name: 'mock-vehicles-create-dialog',
    route: '/dashboard/vehicles',
    probes: [
      { label: 'vehicles-create-dialog', selector: '[role=\"dialog\"]', min: 1 },
      { label: 'vehicles-create-inputs', selector: '[role=\"dialog\"] input', min: 4 },
    ],
    actions: async (page) => {
      await clickByTextWithSelectors(page, ['them phuong tien'], ['button,a']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-vehicles-edit-dialog',
    route: '/dashboard/vehicles',
    probes: [{ label: 'vehicles-edit-dialog', selector: '[role=\"dialog\"]', min: 1 }],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByTextWithSelectors(page, ['sua'], ['table tbody tr button', 'button']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-vehicles-assign-dialog',
    route: '/dashboard/vehicles',
    probes: [
      { label: 'vehicles-assign-dialog', selector: '[role=\"dialog\"]', min: 1 },
      { label: 'vehicles-assign-select', selector: '[role=\"dialog\"] [role=\"combobox\"]', min: 1 },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByTextWithSelectors(page, ['gan thiet bi'], ['table tbody tr button', 'button']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-vehicles-delete-dialog',
    route: '/dashboard/vehicles',
    probes: [
      { label: 'vehicles-delete-dialog', selector: '[role=\"dialog\"],[role=\"alertdialog\"]', min: 1 },
      { label: 'vehicles-delete-text', text: 'xoa phuong tien' },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByTextWithSelectors(page, ['xoa'], ['table tbody tr button', 'button']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-drivers-create-dialog',
    route: '/dashboard/drivers',
    probes: [{ label: 'drivers-create-dialog', selector: '[role=\"dialog\"]', min: 1 }],
    actions: async (page) => {
      await clickByTextWithSelectors(page, ['them tai xe'], ['button,a']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(400);
    },
  },
  {
    name: 'mock-drivers-edit-dialog',
    route: '/dashboard/drivers',
    probes: [{ label: 'drivers-edit-dialog', selector: '[role=\"dialog\"]', min: 1 }],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByTextWithSelectors(page, ['sua'], ['table tbody tr button', 'button']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(400);
    },
  },
  {
    name: 'mock-drivers-delete-dialog',
    route: '/dashboard/drivers',
    probes: [
      { label: 'drivers-delete-dialog', selector: '[role=\"dialog\"],[role=\"alertdialog\"]', min: 1 },
      { label: 'drivers-delete-text', text: 'xoa tai xe' },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByTextWithSelectors(page, ['xoa'], ['table tbody tr button', 'button']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(400);
    },
  },
  {
    name: 'mock-customers-create-dialog',
    route: '/dashboard/customers',
    probes: [{ label: 'customers-create-dialog', selector: '[role=\"dialog\"]', min: 1 }],
    actions: async (page) => {
      await clickByTextWithSelectors(page, ['them khach hang'], ['button,a']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-customers-edit-dialog',
    route: '/dashboard/customers',
    probes: [{ label: 'customers-edit-dialog', selector: '[role=\"dialog\"]', min: 1 }],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByTextWithSelectors(page, ['sua'], ['table tbody tr button', 'button']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-customers-delete-dialog',
    route: '/dashboard/customers',
    probes: [
      {
        label: 'customers-delete-dialog',
        selector: '[role=\"dialog\"],[role=\"alertdialog\"]',
        min: 1,
      },
      { label: 'customers-delete-text', text: 'xoa khach hang' },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByTextWithSelectors(page, ['xoa'], ['table tbody tr button', 'button']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-trips-create-dialog',
    route: '/dashboard/trips',
    probes: [{ label: 'trips-create-dialog', selector: '[role=\"dialog\"]', min: 1 }],
    actions: async (page) => {
      await clickByTextWithSelectors(page, ['them chuyen di', 'them'], ['button,a']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-trips-edit-dialog',
    route: '/dashboard/trips',
    probes: [{ label: 'trips-edit-dialog', selector: '[role=\"dialog\"]', min: 1 }],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByTextWithSelectors(page, ['sua'], ['table tbody tr button', 'button']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-trips-delete-dialog',
    route: '/dashboard/trips',
    probes: [{ label: 'trips-delete-dialog', selector: '[role=\"dialog\"],[role=\"alertdialog\"]', min: 1 }],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickFirst(page, [
        'table tbody tr td:last-child button:last-child',
        'table tbody tr button:last-child',
      ]);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-geofences-create-dialog',
    route: '/dashboard/geofences',
    probes: [{ label: 'geofences-create-dialog', selector: '[role=\"dialog\"]', min: 1 }],
    actions: async (page) => {
      await clickByTextWithSelectors(page, ['them vung giam sat'], ['button,a']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-geofences-edit-dialog',
    route: '/dashboard/geofences',
    probes: [{ label: 'geofences-edit-dialog', selector: '[role=\"dialog\"]', min: 1 }],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByTextWithSelectors(page, ['sua'], ['table tbody tr button', 'button']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-geofences-manage-vehicles-panel',
    route: '/dashboard/geofences',
    probes: [
      { label: 'geofences-manage-panel', text: 'quan ly phuong tien trong vung' },
      { label: 'geofences-manage-checkbox', selector: '[role=\"checkbox\"]', min: 1 },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByTextWithSelectors(page, ['quan ly xe'], ['table tbody tr button', 'button']);
      await delay(550);
    },
  },
  {
    name: 'mock-geofences-delete-dialog',
    route: '/dashboard/geofences',
    probes: [
      {
        label: 'geofences-delete-dialog',
        selector: '[role=\"dialog\"],[role=\"alertdialog\"]',
        min: 1,
      },
      { label: 'geofences-delete-text', text: 'xoa vung giam sat' },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByTextWithSelectors(page, ['xoa'], ['table tbody tr button', 'button']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-maintenance-tabs',
    route: '/dashboard/maintenance',
    probes: [{ label: 'maintenance-tabs', selector: '[role=\"tab\"]', min: 3 }],
    actions: async (page) => {
      for (const tab of ['lich', 'du bao km', 'danh sach']) {
        await clickByText(page, [tab], { selector: '[role="tab"],button' }).catch(() => null);
        await delay(280);
      }
    },
  },
  {
    name: 'mock-firmware-upload-dialog',
    route: '/dashboard/firmware',
    probes: [{ label: 'firmware-upload-dialog', selector: '[role=\"dialog\"]', min: 1 }],
    actions: async (page) => {
      await clickByTextWithSelectors(page, ['tai len firmware'], ['button,a']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-exports-create-dialog',
    route: '/dashboard/exports',
    probes: [{ label: 'exports-create-dialog', selector: '[role=\"dialog\"]', min: 1 }],
    actions: async (page) => {
      await clickByTextWithSelectors(page, ['tao yeu cau xuat'], ['button,a']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-notifications-item-actions',
    route: '/dashboard/notifications',
    probes: [
      { label: 'notifications-list', selector: '[data-slot=\"card\"]', min: 1 },
      { label: 'notifications-actions-buttons', selector: 'button', min: 4 },
    ],
    actions: async (page) => {
      await clickByTextWithSelectors(page, ['doc'], ['button']);
      await delay(240);
      await clickByTextWithSelectors(page, ['an'], ['button']);
      await delay(240);
    },
  },
  {
    name: 'mock-users-create-dialog',
    route: '/dashboard/users',
    probes: [{ label: 'users-create-dialog', selector: '[role=\"dialog\"]', min: 1 }],
    actions: async (page) => {
      await clickByTextWithSelectors(page, ['them nguoi dung'], ['button,a']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-users-edit-dialog',
    route: '/dashboard/users',
    probes: [{ label: 'users-edit-dialog', selector: '[role=\"dialog\"]', min: 1 }],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByTextWithSelectors(page, ['sua'], ['table tbody tr button', 'button']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-users-delete-dialog',
    route: '/dashboard/users',
    probes: [
      { label: 'users-delete-dialog', selector: '[role=\"dialog\"],[role=\"alertdialog\"]', min: 1 },
      { label: 'users-delete-text', text: 'xoa nguoi dung' },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      await clickByTextWithSelectors(page, ['xoa'], ['table tbody tr button', 'button']);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(420);
    },
  },
  {
    name: 'mock-system-admin-query-builder',
    route: '/dashboard/system-admin',
    probes: [
      { label: 'system-admin-query-form', selector: 'datalist#query-builder-columns', min: 1 },
      { label: 'system-admin-query-table', selector: 'table tbody tr', min: 1 },
    ],
    actions: async (page) => {
      await clickNth(page, '[role="tab"]', 1).catch(() => null);
      await delay(250);
      await clickByTextWithSelectors(page, ['them dieu kien'], ['button']);
      await delay(180);
      await clickByTextWithSelectors(page, ['chay truy van'], ['button']);
      await delay(480);
    },
  },
  {
    name: 'mock-system-admin-metrics-run',
    route: '/dashboard/system-admin',
    probes: [
      { label: 'system-admin-metrics-chart', selector: 'svg.recharts-surface', min: 1 },
      { label: 'system-admin-metrics-card', text: 'kham pha chi so' },
    ],
    actions: async (page) => {
      await clickNth(page, '[role="tab"]', 2).catch(() => null);
      await delay(260);
      await clickByTextWithSelectors(page, ['chay'], ['button']);
      await delay(400);
    },
  },
  {
    name: 'mock-map-controls-state',
    route: '/dashboard/map',
    probes: [
      { label: 'map-sidebar-items', selector: 'aside button', min: 3 },
      { label: 'map-markers', selector: '.leaflet-marker-icon', min: 1 },
    ],
    actions: async (page) => {
      await page.waitForSelector('aside', { timeout: 15000 }).catch(() => null);
      await clickFirst(page, ['aside button']);
      await delay(260);
      await clickByTextWithSelectors(page, ['theo doi'], ['button']);
      await delay(220);
      await clickByTextWithSelectors(page, ['vung dia ly'], ['button']);
      await delay(220);
    },
  },
  {
    name: 'mock-map-mobile-drawer',
    route: '/dashboard/map',
    viewport: { width: 390, height: 844 },
    probes: [
      {
        label: 'map-mobile-sheet',
        selector: '[data-slot=\"sheet-content\"][data-state=\"open\"][class*=\"88dvh\"]',
        min: 1,
      },
      {
        label: 'map-mobile-search',
        selector:
          '[data-slot=\"sheet-content\"][data-state=\"open\"][class*=\"88dvh\"] [data-slot=\"scroll-area\"]',
        min: 1,
      },
    ],
    actions: async (page) => {
      await page.waitForSelector('button', { timeout: 10000 }).catch(() => null);
      await page.mouse.click(90, 118, { delay: 30 });
      await delay(120);
      await page
        .waitForSelector('[data-slot="sheet-content"][data-state="open"][class*="88dvh"]', {
          timeout: 8000,
        })
        .catch(() => null);
      await delay(350);
    },
  },
  {
    name: 'mock-simulator-running-state',
    route: '/dashboard/simulator',
    probes: [
      { label: 'simulator-running-buttons', selector: 'button', min: 4 },
      { label: 'simulator-status-text', text: 'trang thai' },
    ],
    actions: async (page) => {
      await page.waitForSelector('input[type=\"checkbox\"]', { timeout: 10000 }).catch(() => null);
      await clickFirst(page, ['input[type=\"checkbox\"]']);
      await delay(220);
      await clickByTextWithSelectors(page, ['bat dau'], ['button']);
      await delay(260);
      await clickByTextWithSelectors(page, ['tam dung'], ['button']);
      await delay(260);
    },
  },
];
const login = async (browser) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  if (SKIP_LOGIN) {
    await page.setCookie({
      name: 'session_token',
      value: 'mock-session',
      url: BASE_URL,
    });
    await page.close();
    return;
  }

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
  const viewport = scenario.viewport ?? { width: 1440, height: 900 };
  await page.setViewport(viewport);
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const navigationTrace = [];
  const coverage = { requests: [], handled: [], unhandled: [] };

  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      consoleErrors.push({ type, text: message.text() });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) {
      return;
    }
    navigationTrace.push({
      url: frame.url(),
      ts: new Date().toISOString(),
    });
  });
  page.on('requestfailed', (request) => {
    if (shouldIgnoreFailedRequest(request)) {
      return;
    }
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText ?? 'unknown',
    });
  });

  const router = createMockRouter(buildMockData(), coverage);
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
    await delay(450);
    await waitForLeafletSettled(page);

    const probeResults = await runProbes(page, scenario.probes ?? []);
    const failedProbes = probeResults.filter((item) => !item.ok);

    const screenshotPath = path.join(OUTPUT_DIR, `${slug(scenario.name)}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png',
    });

    const finalUrl = page.url();
    const unhandledApiRequests = coverage.unhandled.filter(
      (item) => !item.pathName.includes('/api/v1/auth/refresh'),
    );
    const uniqueHandledPaths = Array.from(
      new Map(
        coverage.handled.map((item) => [
          `${item.method} ${item.pathName}`,
          { method: item.method, pathName: item.pathName },
        ]),
      ).values(),
    );

    return {
      name: scenario.name,
      route: scenario.route,
      finalUrl,
      routeMatched: samePath(scenario.expectedPath ?? scenario.route, finalUrl),
      navigationTrace: DEBUG_NAV ? navigationTrace : undefined,
      title: await page.title(),
      screenshotPath,
      actionError,
      consoleErrors,
      pageErrors,
      failedRequests,
      probes: probeResults,
      failedProbes,
      apiCoverage: {
        totalRequests: coverage.requests.length,
        handledRequests: coverage.handled.length,
        unhandledRequests: unhandledApiRequests.length,
        uniqueHandledPaths,
      },
      unhandledApiRequests,
    };
  } finally {
    await page.close();
  }
};

const run = async () => {
  ensureDir(OUTPUT_DIR);

  try {
    removeFileIfExists(SESSION_FILE);
    const browser = await getBrowser({ headless: true });
    await login(browser);

    const selectedScenarios =
      SCENARIO_FILTERS.length === 0
        ? scenarios
        : scenarios.filter((scenario) =>
            SCENARIO_FILTERS.some((filter) => scenario.name.includes(filter)),
          );

    if (selectedScenarios.length === 0) {
      outputJSON({
        success: false,
        message: 'No scenarios matched filters',
        filters: SCENARIO_FILTERS,
        availableScenarios: scenarios.map((scenario) => scenario.name),
      });
      await closeBrowser();
      return;
    }

    const results = [];
    for (const scenario of selectedScenarios) {
      results.push(await runScenario(browser, scenario));
    }

    const routeMismatches = results
      .filter((item) => !item.routeMatched)
      .map((item) => ({ name: item.name, route: item.route, finalUrl: item.finalUrl }));
    const scenarioProbeFailures = results
      .filter((item) => (item.failedProbes?.length ?? 0) > 0)
      .map((item) => ({ name: item.name, failedProbes: item.failedProbes }));
    const allUnhandledApiRequests = results.flatMap((item) =>
      (item.unhandledApiRequests ?? []).map((entry) => ({ scenario: item.name, ...entry })),
    );
    const uniqueUnhandledApiRequests = Array.from(
      new Map(
        allUnhandledApiRequests.map((entry) => [
          `${entry.method} ${entry.pathName}`,
          { method: entry.method, pathName: entry.pathName },
        ]),
      ).values(),
    );
    const totalHandledRequests = results.reduce(
      (sum, item) => sum + Number(item.apiCoverage?.handledRequests ?? 0),
      0,
    );
    const totalApiRequests = results.reduce(
      (sum, item) => sum + Number(item.apiCoverage?.totalRequests ?? 0),
      0,
    );
    const probeHitCount = results.reduce(
      (sum, item) =>
        sum +
        (item.probes ?? []).reduce((acc, probe) => acc + Number(probe.count ?? 0), 0),
      0,
    );
    const uniqueHandledApiPaths = Array.from(
      new Map(
        results
          .flatMap((item) => item.apiCoverage?.uniqueHandledPaths ?? [])
          .map((entry) => [`${entry.method} ${entry.pathName}`, entry]),
      ).values(),
    );

    fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2), 'utf8');
    outputJSON({
      success: true,
      baseUrl: BASE_URL,
      reportPath: REPORT_PATH,
      totalScenarios: results.length,
      selectedScenarios: selectedScenarios.map((scenario) => scenario.name),
      routeMismatchCount: routeMismatches.length,
      routeMismatches,
      scenariosWithFailedProbes: scenarioProbeFailures.length,
      scenarioProbeFailures,
      totalApiRequests,
      totalHandledRequests,
      uniqueHandledApiPathsCount: uniqueHandledApiPaths.length,
      uniqueHandledApiPaths,
      totalUnhandledApiRequests: allUnhandledApiRequests.length,
      uniqueUnhandledApiRequests,
      probeHitCount,
      screenshots: results.map((item) => item.screenshotPath),
    });

    await closeBrowser();
  } catch (error) {
    outputError(error);
  }
};

void run();
