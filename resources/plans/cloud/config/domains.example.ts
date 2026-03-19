# Domain Configuration Example

> Cấu hình domain entities cho các dự án IoT khác nhau

---

## 1. Domain Config Interface

```typescript
// config/domains.ts

export interface DomainConfig {
  // Entity naming
  entity: {
    singular: string;
    plural: string;
    idPrefix: string;
  };

  // Session tracking
  session: {
    enabled: boolean;
    name: {
      singular: string;
      plural: string;
    };
  };

  // Location tracking
  location: {
    enabled: boolean;
    mapProvider: 'leaflet' | 'mapbox' | 'google';
  };

  // Real-time features
  realtime: {
    enabled: boolean;
    updateInterval: number; // ms
  };

  // Alert types
  alertTypes: string[];

  // Status values
  statusValues: string[];
}
```

---

## 2. Vehicle Tracking Domain

```typescript
// config/domains.vehicle-tracking.ts

export const DOMAIN_CONFIG: DomainConfig = {
  entity: {
    singular: 'Vehicle',
    plural: 'Vehicles',
    idPrefix: 'VEH',
  },

  session: {
    enabled: true,
    name: {
      singular: 'Trip',
      plural: 'Trips',
    },
  },

  location: {
    enabled: true,
    mapProvider: 'leaflet',
  },

  realtime: {
    enabled: true,
    updateInterval: 2000,
  },

  alertTypes: [
    'high_vibration',
    'low_battery',
    'speeding',
    'geofence_exit',
    'geofence_enter',
    'sudden_stop',
    'long_idle',
  ],

  statusValues: ['running', 'stopped', 'disconnected'],
};
```

---

## 3. Smart Home Domain

```typescript
// config/domains.smart-home.ts

export const DOMAIN_CONFIG: DomainConfig = {
  entity: {
    singular: 'Sensor',
    plural: 'Sensors',
    idPrefix: 'SNS',
  },

  session: {
    enabled: false,
    name: {
      singular: 'Activity',
      plural: 'Activities',
    },
  },

  location: {
    enabled: false,
    mapProvider: 'leaflet',
  },

  realtime: {
    enabled: true,
    updateInterval: 5000,
  },

  alertTypes: [
    'temperature_high',
    'temperature_low',
    'humidity_high',
    'humidity_low',
    'motion_detected',
    'door_opened',
    'co2_high',
    'smoke_detected',
  ],

  statusValues: ['online', 'offline', 'low_battery'],
};
```

---

## 4. Industrial IoT Domain

```typescript
// config/domains.industrial.ts

export const DOMAIN_CONFIG: DomainConfig = {
  entity: {
    singular: 'Machine',
    plural: 'Machines',
    idPrefix: 'MCH',
  },

  session: {
    enabled: true,
    name: {
      singular: 'Shift',
      plural: 'Shifts',
    },
  },

  location: {
    enabled: false,
    mapProvider: 'leaflet',
  },

  realtime: {
    enabled: true,
    updateInterval: 1000,
  },

  alertTypes: [
    'pressure_high',
    'temperature_high',
    'vibration_abnormal',
    'power_surge',
    'maintenance_due',
    'efficiency_low',
    'quality_issue',
  ],

  statusValues: ['running', 'idle', 'maintenance', 'error', 'offline'],
};
```

---

## 5. Agriculture Domain

```typescript
// config/domains.agriculture.ts

export const DOMAIN_CONFIG: DomainConfig = {
  entity: {
    singular: 'Field Sensor',
    plural: 'Field Sensors',
    idPrefix: 'FLD',
  },

  session: {
    enabled: true,
    name: {
      singular: 'Growth Cycle',
      plural: 'Growth Cycles',
    },
  },

  location: {
    enabled: true,
    mapProvider: 'leaflet',
  },

  realtime: {
    enabled: true,
    updateInterval: 30000, // 30 seconds
  },

  alertTypes: [
    'soil_dry',
    'soil_wet',
    'frost_warning',
    'heat_warning',
    'ph_abnormal',
    'irrigation_needed',
    'pest_detected',
  ],

  statusValues: ['active', 'dormant', 'offline'],
};
```

---

## 6. Usage in Code

### API Response Transformation

```typescript
import { DOMAIN_CONFIG } from './domains';

// Dynamic API messages
function getNotFoundMessage(id: string): string {
  return `${DOMAIN_CONFIG.entity.singular} with ID ${id} not found`;
}

// Response field naming
function transformDeviceResponse(device: any) {
  return {
    [`${DOMAIN_CONFIG.entity.singular.toLowerCase()}Id`]: device.device_id,
    [`${DOMAIN_CONFIG.entity.singular.toLowerCase()}Name`]: device.device_name,
    // ...
  };
}
```

### Frontend Labels

```typescript
import { DOMAIN_CONFIG } from './domains';

// Dynamic page titles
const pageTitle = `${DOMAIN_CONFIG.entity.plural} List`;

// Dynamic table headers
const columns = [
  { header: `${DOMAIN_CONFIG.entity.singular} ID`, accessor: 'deviceId' },
  { header: `${DOMAIN_CONFIG.entity.singular} Name`, accessor: 'deviceName' },
  // ...
];

// Dynamic empty state
const emptyMessage = `No ${DOMAIN_CONFIG.entity.plural.toLowerCase()} found`;
```

### Session Feature Toggle

```typescript
import { DOMAIN_CONFIG } from './domains';

// Conditional rendering
{DOMAIN_CONFIG.session.enabled && (
  <Tab value="sessions">
    {DOMAIN_CONFIG.session.name.plural}
  </Tab>
)}

// Conditional API calls
async function getDeviceDetails(deviceId: string) {
  const device = await deviceRepo.findById(deviceId);

  if (DOMAIN_CONFIG.session.enabled) {
    device.sessions = await sessionRepo.findByDeviceId(deviceId);
  }

  return device;
}
```

### Map Feature Toggle

```typescript
import { DOMAIN_CONFIG } from './domains';

// Conditional map page
// app/dashboard/map/page.tsx
export default function MapPage() {
  if (!DOMAIN_CONFIG.location.enabled) {
    redirect('/dashboard');
  }

  return <DeviceMap provider={DOMAIN_CONFIG.location.mapProvider} />;
}
```
