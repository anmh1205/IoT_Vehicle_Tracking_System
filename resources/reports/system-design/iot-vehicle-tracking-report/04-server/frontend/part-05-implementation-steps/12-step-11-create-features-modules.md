## PHẦN XIII.8.12: BƯỚC 11 - TẠO FEATURES MODULES

### XIII.8.12 Bước 11: Tạo Features Modules

#### 11.1 Tạo Vehicle Feature

```bash
# Tạo vehicle feature structure
mkdir -p src/features/vehicles/components
mkdir -p src/features/vehicles/hooks
```

**Tạo hooks:**

```typescript
// src/features/vehicles/hooks/useVehicles.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '@/lib/api/vehicles';
import type { Vehicle, CreateVehicleDto, UpdateVehicleDto } from '@/types/vehicle';

export function useVehicles(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => vehicleApi.list(params),
  });
}

export function useVehicle(id: number) {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => vehicleApi.get(id),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVehicleDto }) =>
      vehicleApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', variables.id] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
```

**Tạo components:**

```typescript
// src/features/vehicles/components/vehicle-list.tsx
'use client';

import { useVehicles } from '../hooks/useVehicles';
import { DataTable } from '@/components/ui/data-table';

export function VehicleList() {
  const { data, isLoading } = useVehicles();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <DataTable
      data={data?.data || []}
      columns={[
        { accessorKey: 'plate_number', header: 'Biển số' },
        { accessorKey: 'brand', header: 'Hãng' },
        { accessorKey: 'model', header: 'Model' },
        { accessorKey: 'status', header: 'Trạng thái' },
      ]}
    />
  );
}
```

#### 11.2 Tạo các Features khác

Tương tự cho:

- `src/features/customers/`
- `src/features/trips/`
- `src/features/alerts/`
- `src/features/violations/`
- `src/features/devices/`
- `src/features/geofences/`
- `src/features/maintenance/`

---

