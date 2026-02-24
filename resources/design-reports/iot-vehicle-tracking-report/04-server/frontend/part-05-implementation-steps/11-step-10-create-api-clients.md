## PHẦN XIII.8.11: BƯỚC 10 - TẠO API CLIENTS

### XIII.8.11 Bước 10: Tạo API Clients

#### 10.1 Tạo Vehicle API

```typescript
// src/lib/api/vehicles.ts
import { http } from './http';
import type { Vehicle, CreateVehicleDto, UpdateVehicleDto } from '@/types/vehicle';

export const vehicleApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    http.get<{ data: Vehicle[]; meta: any }>('/vehicles', { params }),
  
  get: (id: number) =>
    http.get<Vehicle>(`/vehicles/${id}`),
  
  create: (data: CreateVehicleDto) =>
    http.post<Vehicle>('/vehicles', data),
  
  update: (id: number, data: UpdateVehicleDto) =>
    http.put<Vehicle>(`/vehicles/${id}`, data),
  
  delete: (id: number) =>
    http.delete(`/vehicles/${id}`),
  
  getStatus: (id: number) =>
    http.get<VehicleStatus>(`/vehicles/${id}/status`),
};
```

#### 10.2 Tạo các API Clients khác

Tương tự cho:

- `src/lib/api/customers.ts`
- `src/lib/api/trips.ts`
- `src/lib/api/alerts.ts`
- `src/lib/api/violations.ts`
- `src/lib/api/devices.ts`
- `src/lib/api/geofences.ts`
- `src/lib/api/maintenance.ts`
- `src/lib/api/notifications.ts`

---

