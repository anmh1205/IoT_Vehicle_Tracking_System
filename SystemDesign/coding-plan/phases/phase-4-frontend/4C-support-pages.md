# Sub-Phase 4C: Support Pages

> **Context:** ~3KB | **Max Files:** 10 | **Est. Time:** 1 session

## Summary
Implement Dashboard, Firmware management, Export jobs, và Settings pages.

## Tasks
| ID     | Description             | Files                                  |
| ------ | ----------------------- | -------------------------------------- |
| FE-020 | Dashboard page          | `app/(dashboard)/page.tsx`             |
| FE-021 | Dashboard widgets       | `components/dashboard/*.tsx`           |
| FE-022 | Firmware page           | `app/(dashboard)/firmware/page.tsx`    |
| FE-023 | Firmware components     | `components/firmware/*.tsx`            |
| FE-024 | Export page             | `app/(dashboard)/exports/page.tsx`     |
| FE-025 | Settings page           | `app/(dashboard)/settings/page.tsx`    |
| FE-026 | User management (admin) | `app/(dashboard)/admin/users/page.tsx` |

## Backend API Contract (Input từ BE Phase 2D)
### Dashboard
| Endpoint                         | Method | Response                                                |
| -------------------------------- | ------ | ------------------------------------------------------- |
| `GET /api/v1/dashboard/stats`    | GET    | `{ totalDevices, activeDevices, totalRuntime, alerts }` |
| `GET /api/v1/dashboard/activity` | GET    | `{ events: Event[], pagination }`                       |

### Firmware
| Endpoint                            | Method | Description                     |
| ----------------------------------- | ------ | ------------------------------- |
| `GET /api/v1/firmware`              | GET    | List firmware versions          |
| `POST /api/v1/firmware`             | POST   | Upload new firmware (multipart) |
| `PUT /api/v1/firmware/:id/activate` | PUT    | Activate/deactivate             |
| `POST /api/v1/firmware/:id/assign`  | POST   | Assign to devices               |

### Export
| Endpoint                           | Method | Description       |
| ---------------------------------- | ------ | ----------------- |
| `GET /api/v1/exports`              | GET    | List export jobs  |
| `POST /api/v1/exports`             | POST   | Create export job |
| `GET /api/v1/exports/:id/download` | GET    | Download file     |

## Dashboard Widget Types
```typescript
interface DashboardStats {
  totalDevices: number;
  activeDevices: number;
  offlineDevices: number;
  totalRuntimeToday: number;
  totalRuntimeWeek: number;
  alertsCount: number;
}

interface ActivityEvent {
  id: number;
  eventType: string;
  deviceId: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
}
```

## WebSocket Events (Dashboard real-time)
```typescript
// Namespace: /dashboard
socket.on('stats:update', (data: Partial<DashboardStats>) => {
  // Update dashboard widgets
});

socket.on('alert:new', (data: Alert) => {
  // Show alert notification
});

socket.on('activity:new', (data: ActivityEvent) => {
  // Prepend to activity feed
});
```

## Dashboard Layout
```
┌─────────────────────────────────────────────────────────┐
│  Dashboard                                               │
├──────────────┬──────────────┬──────────────┬────────────┤
│ Total Devices│ Active       │ Offline      │ Alerts     │
│     50       │    32        │     18       │    3       │
├──────────────┴──────────────┴──────────────┴────────────┤
│  ┌────────────────────────┐  ┌───────────────────────┐  │
│  │ Runtime Chart (7 days) │  │ Activity Feed          │  │
│  │ ██████████████████████ │  │ • Device X went offline│  │
│  │ ████████████████████   │  │ • Alert: High vibration│  │
│  │ ██████████████████████ │  │ • Session started      │  │
│  └────────────────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Firmware Upload Pattern
```typescript
// Multipart upload với progress
const formData = new FormData();
formData.append('file', file);
formData.append('version', version);
formData.append('description', description);

await axios.post('/api/v1/firmware', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total)),
});
```

## Dependencies
- ✅ Phase 4A-4B done (Auth, layout, API client)
- ✅ Phase 2D done (Dashboard, Firmware, Export APIs)
- ➡️ Phase 5 can run parallel

## Verification
- [ ] Dashboard: shows stats, activity feed updates real-time
- [ ] Firmware: upload, activate, assign to devices
- [ ] Export: create job, download when complete
- [ ] Settings: update user preferences

## Full Spec Reference
- [30-frontend-architecture.md](./../../30-frontend-architecture.md) — Frontend architecture
