## PHẦN XIII.8.13: BƯỚC 12 - TẠO PAGES

### XIII.8.13 Bước 12: Tạo Pages

#### 12.1 Tạo Dashboard Overview Page

```typescript
// src/app/dashboard/page.tsx
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentAlerts } from '@/components/dashboard/recent-alerts';
import { ActiveVehiclesMap } from '@/components/dashboard/active-vehicles-map';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tổng quan</h1>
        <p className="text-muted-foreground">Thống kê và theo dõi hệ thống</p>
      </div>
      
      <StatsCards />
      <RecentAlerts />
      <ActiveVehiclesMap />
    </div>
  );
}
```

#### 12.2 Tạo Vehicle Pages

```typescript
// src/app/dashboard/vehicles/page.tsx
import { VehicleList } from '@/features/vehicles/components/vehicle-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function VehiclesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý xe</h1>
          <p className="text-muted-foreground">Danh sách tất cả phương tiện</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/vehicles/new">Thêm xe mới</Link>
        </Button>
      </div>
      
      <VehicleList />
    </div>
  );
}
```

```typescript
// src/app/dashboard/vehicles/[id]/page.tsx
import { useVehicle } from '@/features/vehicles/hooks/useVehicle';
import { VehicleDetail } from '@/features/vehicles/components/vehicle-detail';

export default function VehicleDetailPage({ params }: { params: { id: string } }) {
  const { data: vehicle, isLoading } = useVehicle(Number(params.id));
  
  if (isLoading) return <div>Loading...</div>;
  if (!vehicle) return <div>Not found</div>;
  
  return <VehicleDetail vehicle={vehicle} />;
}
```

#### 12.3 Tạo các Pages khác

Tương tự cho:

- `/dashboard/customers`
- `/dashboard/trips`
- `/dashboard/alerts`
- `/dashboard/violations`
- `/dashboard/devices`
- `/dashboard/geofences`
- `/dashboard/maintenance`
- `/dashboard/map`
- `/dashboard/notifications`
- `/dashboard/settings`

---

