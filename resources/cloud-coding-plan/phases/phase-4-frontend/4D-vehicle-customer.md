# Phase 4D — Vehicle & Customer Management

> Vehicle CRUD (assign device, detail modal), Customer CRUD (fleet overview, cascading suspension).
> FSD: `features/vehicles/` and `features/customers/`

---

## CRITICAL RULES

```
1. Both modules follow EXACT same Page + DataTable + Form + ConfirmDialog pattern as Devices (4B)
2. Vehicle ↔ Device assignment: Select dropdown in VehicleForm
3. Customer deactivation: warn about cascading suspension to linked vehicles/devices
4. All text Vietnamese
```

---

## Task List

| ID     | Description           | Files                                                     |
| ------ | --------------------- | --------------------------------------------------------- |
| FE-060 | Vehicle types         | `features/vehicles/types/index.ts`                        |
| FE-061 | Vehicle schema        | `lib/validations/vehicle.schema.ts`                       |
| FE-062 | Vehicle API           | `lib/api/vehicles.ts`                                     |
| FE-063 | Vehicle hooks (5)     | `features/vehicles/hooks/*.ts`                            |
| FE-064 | Vehicle page          | `app/dashboard/vehicles/page.tsx`                         |
| FE-065 | Vehicle columns       | `features/vehicles/components/vehicle-columns.tsx`        |
| FE-066 | Vehicle form          | `features/vehicles/components/vehicle-form.tsx`           |
| FE-067 | Vehicle detail modal  | `features/vehicles/components/vehicle-detail-modal.tsx`   |
| FE-068 | AssignDeviceDialog    | `features/vehicles/components/assign-device-dialog.tsx`   |
| FE-070 | Customer types        | `features/customers/types/index.ts`                       |
| FE-071 | Customer schema       | `lib/validations/customer.schema.ts`                      |
| FE-072 | Customer API          | `lib/api/customers.ts`                                    |
| FE-073 | Customer hooks (5)    | `features/customers/hooks/*.ts`                           |
| FE-074 | Customer page         | `app/dashboard/customers/page.tsx`                        |
| FE-075 | Customer columns      | `features/customers/components/customer-columns.tsx`      |
| FE-076 | Customer form         | `features/customers/components/customer-form.tsx`         |
| FE-077 | Customer detail modal | `features/customers/components/customer-detail-modal.tsx` |

---

## Backend API Contract

```
# Vehicles
GET    /api/v1/vehicles           ?page&limit&status&search&customerId
GET    /api/v1/vehicles/:id
POST   /api/v1/vehicles           { plateNumber, make, model, year, vin, customerId, deviceId? }
PUT    /api/v1/vehicles/:id       { plateNumber, make, model, year, status }
DELETE /api/v1/vehicles/:id
PUT    /api/v1/vehicles/:id/device { deviceId }   # assign/unassign device

# Customers
GET    /api/v1/customers          ?page&limit&search&isActive
GET    /api/v1/customers/:id
POST   /api/v1/customers          { name, contactPerson, phone, email, address }
PUT    /api/v1/customers/:id      { name, contactPerson, phone, email, address, isActive }
DELETE /api/v1/customers/:id
```

---

## FE-060: Vehicle Types

```typescript
// features/vehicles/types/index.ts
export interface Vehicle {
  id: number;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  deviceId: string | null;
  deviceName: string | null;
  customerId: number | null;
  customerName: string | null;
  currentMileage: number;
  lastServiceDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  customerId?: number;
}
```

---

## FE-061: Vehicle Schema

```typescript
// lib/validations/vehicle.schema.ts
import { z } from 'zod';

export const vehicleSchema = z.object({
  plateNumber: z.string().min(1, 'Biển số là bắt buộc').max(20),
  make: z.string().min(1, 'Hãng xe là bắt buộc'),
  model: z.string().min(1, 'Dòng xe là bắt buộc'),
  year: z.coerce.number().min(1990).max(new Date().getFullYear() + 1),
  vin: z.string().max(17).optional().or(z.literal('')),
  customerId: z.coerce.number().optional(),
  deviceId: z.string().optional().or(z.literal('')),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;
```

---

## FE-062: Vehicle API

```typescript
// lib/api/vehicles.ts
import { apiClient } from './client';

export const vehicleServices = {
  getList: (params?: any) => apiClient.get('/vehicles', { params }).then((r) => r.data),
  getById: (id: number) => apiClient.get(`/vehicles/${id}`).then((r) => r.data),
  create: (data: any) => apiClient.post('/vehicles', data).then((r) => r.data),
  update: (data: { id: number } & Record<string, any>) => {
    const { id, ...body } = data;
    return apiClient.put(`/vehicles/${id}`, body).then((r) => r.data);
  },
  delete: (id: number) => apiClient.delete(`/vehicles/${id}`).then((r) => r.data),
  assignDevice: (vehicleId: number, deviceId: string | null) =>
    apiClient.put(`/vehicles/${vehicleId}/device`, { deviceId }).then((r) => r.data),
};
```

---

## FE-063: Vehicle Hooks

5 hooks following same pattern as devices: `useVehicles`, `useVehicleDetail`, `useCreateVehicle`, `useUpdateVehicle`, `useDeleteVehicle`. All with toast success/error Vietnamese messages.

---

## FE-064: Vehicle Page

Same pattern as DevicesPage. PageContainer + DataTable + VehicleForm + ConfirmDialog.
- pageTitle: "Phương tiện"
- pageDescription: "Quản lý các phương tiện trong hệ thống"
- searchKey: "plateNumber"
- emptyTitle: "Chưa có phương tiện"
- emptyAction: "Thêm phương tiện"

---

## FE-065: Vehicle Columns

| Column       | Description                                                                         |
| ------------ | ----------------------------------------------------------------------------------- |
| plateNumber  | Sortable, header "Biển số"                                                          |
| make + model | Combined "Hãng / Dòng"                                                              |
| year         | "Năm SX"                                                                            |
| status       | Badge: active=green "Hoạt động", inactive=gray "Ngừng", maintenance=amber "Bảo trì" |
| deviceName   | "Thiết bị" — show or "—"                                                            |
| customerName | "Khách hàng" — show or "—"                                                          |
| actions      | View / Edit / Assign Device / Delete                                                |

---

## FE-066: Vehicle Form

Dialog + react-hook-form + zodResolver(vehicleSchema):
- plateNumber (Input), make (Input), model (Input), year (Input type=number)
- vin (Input, optional)
- customerId (Select — fetch customer list via useQuery)
- deviceId (Select — fetch unassigned devices via useQuery)
- Submit: useCreateVehicle / useUpdateVehicle

---

## FE-067: Vehicle Detail Modal

Dialog with vehicle info + 2 tabs:
1. **Thông tin**: Grid of fields (plate, make/model, year, VIN, mileage, last service, device, customer)
2. **Chuyến đi gần đây**: Mini DataTable showing recent trips for this vehicle (useQuery `/trips?vehicleId=X`)

---

## FE-068: AssignDeviceDialog

Dialog triggered from vehicle actions menu:
- Title: "Gán thiết bị cho {plateNumber}"
- Select dropdown of unassigned devices (useQuery `/devices?unassigned=true`)
- "Gỡ thiết bị" button if already assigned
- useMutation `vehicleServices.assignDevice`

---

## FE-070: Customer Types

```typescript
// features/customers/types/index.ts
export interface Customer {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
  vehicleCount: number;
  deviceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}
```

---

## FE-071: Customer Schema

```typescript
// lib/validations/customer.schema.ts
import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1, 'Tên khách hàng là bắt buộc').max(200),
  contactPerson: z.string().min(1, 'Người liên hệ là bắt buộc'),
  phone: z.string().min(1, 'Số điện thoại là bắt buộc').max(20),
  email: z.string().email('Email không hợp lệ'),
  address: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
```

---

## FE-074: Customer Page

Same DataTable + CRUD pattern. searchKey: "name", emptyTitle: "Chưa có khách hàng".

---

## FE-075: Customer Columns

| Column        | Description                                                                        |
| ------------- | ---------------------------------------------------------------------------------- |
| name          | Sortable, "Tên khách hàng"                                                         |
| contactPerson | "Người liên hệ"                                                                    |
| phone         | "SĐT"                                                                              |
| email         | "Email"                                                                            |
| isActive      | Switch toggle (inline) — calls `updateMutation.mutate({ id, isActive: !current })` |
| vehicleCount  | "Phương tiện" — number badge                                                       |
| deviceCount   | "Thiết bị" — number badge                                                          |
| actions       | View / Edit / Delete                                                               |

### Cascading Suspension Warning

When toggling isActive to `false`, show ConfirmDialog:
```
Title: "Tạm ngưng khách hàng"
Description: "Khách hàng {name} có {vehicleCount} phương tiện và {deviceCount} thiết bị.
Tạm ngưng sẽ ảnh hưởng đến tất cả phương tiện và thiết bị liên quan."
Variant: destructive
```

---

## FE-077: Customer Detail Modal

Dialog with customer info + 2 tabs:
1. **Thông tin**: Grid (name, contact, phone, email, address, active status, created date)
2. **Đội xe**: Mini DataTable of vehicles belonging to this customer (useQuery `/vehicles?customerId=X`)

---

## Verification Checklist

- [ ] Vehicle list: DataTable, search by plate, status filter, pagination
- [ ] Vehicle CRUD: create/edit/delete with validation + toast
- [ ] Vehicle detail: 2 tabs (info + recent trips)
- [ ] Assign device dialog: select unassigned devices, unassign button
- [ ] Customer list: DataTable, search, isActive filter
- [ ] Customer CRUD: create/edit/delete with validation + toast
- [ ] Customer isActive inline toggle with cascading warning
- [ ] Customer detail: 2 tabs (info + fleet vehicles)
- [ ] Cross-reference: vehicles show customer name, devices show vehicle plate
- [ ] All text Vietnamese
