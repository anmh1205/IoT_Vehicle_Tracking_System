## PHẦN XIII.8.10: BƯỚC 9 - SETUP TYPESCRIPT TYPES

### XIII.8.10 Bước 9: Setup TypeScript Types

#### 9.1 Copy Types từ Example

```bash
# Copy types
mkdir -p src/types
cp Example/frontend_v2/src/types/auth.d.ts src/types/auth.d.ts
cp Example/frontend_v2/src/types/index.ts src/types/index.ts
```

#### 9.2 Tạo Types mới cho Vehicle Tracking

```typescript
// src/types/vehicle.d.ts
export interface Vehicle {
  id: number;
  vehicle_id: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  vehicle_type: string;
  status: 'active' | 'inactive' | 'maintenance' | 'retired';
  mileage_km: number;
  device?: Device;
  created_at: string;
  updated_at: string;
}

export interface CreateVehicleDto {
  vehicle_id: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  vehicle_type: string;
}

export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {
  status?: Vehicle['status'];
  mileage_km?: number;
}
```

```typescript
// src/types/customer.d.ts
export interface Customer {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_type: string;
  status: 'active' | 'suspended' | 'blacklisted';
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  updated_at: string;
}
```

```typescript
// src/types/trip.d.ts
export interface Trip {
  id: number;
  trip_id: string;
  vehicle_id: number;
  customer_id: number;
  start_time: string;
  end_time: string | null;
  start_location: Location;
  end_location: Location | null;
  distance_km: number;
  duration_minutes: number;
  max_speed: number;
  avg_speed: number;
  status: 'in_progress' | 'completed' | 'cancelled';
}

export interface Location {
  lat: number;
  lon: number;
  address?: string;
}
```

```typescript
// src/types/alert.d.ts
export interface Alert {
  id: number;
  vehicle_id: number;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  location: Location;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}
```

---

