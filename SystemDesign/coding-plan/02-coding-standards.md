# Coding Standards & Naming Conventions

> Tiêu chuẩn coding được áp dụng từ IVM26 cho dự án IoT Vehicle Tracking System

---

## 1. FILE NAMING CONVENTIONS

### 1.1 Backend Files

#### Domain Layer Structure
```
src/domain/{feature}/
├── repositories/
│   ├── {entity}.repository.ts          # user.repository.ts
│   ├── {entity-detail}.repository.ts   # user-session.repository.ts
│   └── index.ts                        # Barrel export
├── services/
│   ├── {feature-action}.service.ts     # auth-session.service.ts
│   ├── {entity-action}.service.ts      # device-ingestion.service.ts
│   └── index.ts
├── types/
│   ├── {feature}.types.ts              # auth.types.ts
│   └── index.ts
├── validators/
│   └── {feature}.validator.ts          # device.validator.ts
└── helpers/
    └── {feature}.helpers.ts            # auth.helpers.ts
```

#### API Layer Structure
```
src/api/
├── controllers/
│   └── {feature}.controller.ts         # auth.controller.ts
├── routes/
│   └── {feature}.routes.ts             # auth.routes.ts
├── validators/
│   └── {feature}.validator.ts          # auth.validator.ts
└── openapi/
    └── {feature}.openapi.ts            # Swagger specs
```

#### Naming Rules
| Type | Pattern | Example |
|------|---------|---------|
| Repository | `{entity}.repository.ts` | `user.repository.ts` |
| Service | `{feature-action}.service.ts` | `auth-session.service.ts` |
| Controller | `{feature}.controller.ts` | `auth.controller.ts` |
| Route | `{feature}.routes.ts` | `device.routes.ts` |
| Validator | `{feature}.validator.ts` | `iot.validator.ts` |
| Types | `{feature}.types.ts` | `device.types.ts` |
| Helpers | `{feature}.helpers.ts` | `dashboard.helpers.ts` |

### 1.2 Frontend Files

#### Features Structure
```
src/features/{feature}/
├── components/
│   ├── {component-name}.tsx            # device-filters.tsx
│   ├── {entity}-{action}-modal.tsx     # device-create-modal.tsx
│   ├── {component-name}-skeleton.tsx   # device-list-skeleton.tsx
│   └── index.ts
├── hooks/
│   ├── use-{feature}.ts                # use-device-filters.ts
│   └── index.ts
├── utils/
│   └── {purpose}.ts                    # form-schema.ts
├── constants/
│   └── {feature}-config.ts             # map-config.ts
└── types/
    └── {feature}.types.ts              # device.types.ts
```

### 1.3 Frontend Layout Components (IVM26 Pattern)

> **BẮT BUỘC:** Các layout components PHẢI follow đúng pattern từ IVM26 reference project.

#### Layout Components (from IVM26)
```
src/components/layout/
├── app-sidebar.tsx         # Collapsible sidebar (SidebarProvider pattern)
├── site-header.tsx         # Header: SidebarTrigger + Breadcrumbs + ThemeToggle + UserNav
├── page-container.tsx      # Page wrapper: ScrollArea + Heading + content
├── breadcrumbs.tsx         # Dynamic breadcrumbs from route
├── nav-main.tsx            # Main navigation items
├── nav-user.tsx            # User avatar + dropdown (logout, settings)
└── theme-toggle.tsx        # Light/Dark mode toggle
```

#### UI Components (shadcn/ui — install via `npx shadcn@latest add`)
| Category | Components | Install |
|----------|-----------|---------|
| Layout | `sidebar`, `scroll-area`, `breadcrumb`, `separator` | `npx shadcn@latest add sidebar scroll-area breadcrumb separator` |
| Data | `table`, `badge`, `avatar` | `npx shadcn@latest add table badge avatar` |
| Forms | `form`, `input`, `select`, `textarea`, `switch`, `checkbox`, `calendar`, `popover`, `command` | `npx shadcn@latest add form input select textarea switch checkbox calendar popover command` |
| Feedback | `dialog`, `sheet`, `alert`, `alert-dialog`, `skeleton`, `tooltip`, `sonner` | `npx shadcn@latest add dialog sheet alert alert-dialog skeleton tooltip sonner` |
| Navigation | `tabs`, `dropdown-menu` | `npx shadcn@latest add tabs dropdown-menu` |
| Display | `card`, `accordion`, `collapsible`, `progress` | `npx shadcn@latest add card accordion collapsible progress` |

#### DataTable Pattern (Custom wrapper over TanStack Table + shadcn/ui Table)
```typescript
// components/common/data-table.tsx
// Wrapper component combining:
// - @tanstack/react-table for logic (sorting, filtering, pagination)
// - shadcn/ui Table for rendering
// - Built-in search, column visibility, pagination controls

// Usage pattern:
<DataTable
  columns={columns}           // ColumnDef[] from @tanstack/react-table
  data={data}                 // T[]
  searchKey="deviceName"      // Column to search
  pagination                  // Enable pagination
  pageSize={20}              // Items per page
/>
```

#### Component Suffixes
| Suffix | Usage | Example |
|--------|-------|---------|
| `*Modal` | Modal dialogs | `DeviceCreateModal` |
| `*Skeleton` | Loading states | `DeviceListSkeleton` |
| `*Tab` | Tab panels | `SecurityTab` |
| `*List` | List components | `AlertsList` |
| `*Card` | Card components | `StatCard` |
| `*Form` | Form components | `DeviceForm` |

---

## 2. VARIABLE & FUNCTION NAMING

### 2.1 General Rules

| Category | Convention | Example |
|----------|------------|---------|
| **Files** | kebab-case | `auth-session.service.ts` |
| **Classes** | PascalCase | `UserRepository` |
| **Functions** | camelCase | `findByUsername()` |
| **Variables** | camelCase | `deviceList` |
| **Constants** | UPPER_SNAKE_CASE | `SESSION_TIMEOUT_HOURS` |
| **Types/Interfaces** | PascalCase | `DeviceRow` |
| **Enums** | PascalCase | `DeviceStatus` |

### 2.2 Backend Naming

#### Repository Methods
```typescript
// CRUD verbs
async findById(id: number): Promise<Entity | null>
async findByUsername(username: string): Promise<Entity | null>
async findAll(): Promise<Entity[]>
async exists(id: number): Promise<boolean>
async create(data: CreateDto): Promise<number>  // Returns ID
async update(id: number, data: UpdateDto): Promise<void>
async delete(id: number): Promise<void>
```

#### Service Methods
```typescript
// Business logic verbs
async validateSessionToken(token: string): Promise<AuthUser | null>
async loginUser(username: string, password: string): Promise<Session>
async processIoTData(deviceId: string, data: SensorData): Promise<void>
async getDeviceStatus(deviceId: string): Promise<DeviceStatus>
async buildDashboardStats(): Promise<DashboardStats>
```

#### Method Prefixes
| Prefix | Usage | Example |
|--------|-------|---------|
| `find*` | Retrieve operations | `findById`, `findByUsername` |
| `exists` | Boolean checks | `exists(id)` |
| `create` | Insert operations | `create(data)` |
| `update` | Modify operations | `update(id, data)` |
| `delete` | Remove operations | `delete(id)` |
| `validate*` | Validation | `validateToken()` |
| `process*` | Data processing | `processIoTData()` |
| `get*` | Get with business logic | `getDeviceStatus()` |
| `build*` | Construction | `buildDashboardStats()` |

### 2.3 Frontend Naming

#### Hook Names
```typescript
// Simple hooks
export function useDebounce<T>(value: T, delay: number): T
export function useMobile(): boolean

// Feature hooks
export function useDeviceFilters()
export function useSimulator()

// Query hooks (TanStack Query)
export function useDeviceDetail(deviceId: string)
export function useInfiniteDeviceSessions(params)

// Mutation hooks
export function useCreateDevice()
export function useUpdateDevice()

// Realtime hooks
export function useDeviceRealtime(deviceId: string)
export function useAlertNotifications()
```

#### Callback Props
```typescript
// Prefix with 'on'
interface FilterProps {
  search: string;
  onSearch: (value: string) => void;
  onReset: () => void;
  onExport: () => void;
}
```

---

## 3. CODE PATTERNS

### 3.1 Repository Pattern (Backend)

```typescript
// device.repository.ts
import { pool } from '@/infrastructure/database';

export class DeviceRepository {
  /**
   * Find device by device_id
   * @returns Device row or null if not found
   */
  async findByDeviceId(deviceId: string): Promise<DeviceRow | null> {
    const result = await pool.query<DeviceRow>(
      'SELECT * FROM devices WHERE device_id = $1',
      [deviceId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get all devices with optional filtering
   */
  async findAll(filter?: DeviceFilter): Promise<DeviceRow[]> {
    const result = await pool.query<DeviceRow>(
      'SELECT * FROM devices WHERE ($1::text IS NULL OR current_status = $1)',
      [filter?.status ?? null]
    );
    return result.rows;
  }

  /**
   * Create new device
   * @returns The new device ID
   */
  async create(data: CreateDeviceDto): Promise<number> {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO devices (device_id, device_name, auth_token)
       VALUES ($1, $2, $3) RETURNING id`,
      [data.deviceId, data.deviceName, data.authToken]
    );
    return result.rows[0].id;
  }
}
```

### 3.2 Service Pattern (Backend)

```typescript
// device-list.service.ts
export class DeviceListService {
  constructor(
    private deviceRepo: DeviceRepository,
    private sessionRepo: DeviceSessionRepository
  ) {}

  /**
   * Get device list with runtime statistics
   */
  async getDeviceList(filter?: DeviceFilter): Promise<DeviceListItem[]> {
    // 1. Get raw data from repository
    const devices = await this.deviceRepo.findAll(filter);

    // 2. Apply business logic
    const enrichedDevices = await Promise.all(
      devices.map(async (device) => {
        const sessions = await this.sessionRepo.findByDeviceId(device.device_id);
        return this.enrichWithRuntime(device, sessions);
      })
    );

    // 3. Return transformed data
    return enrichedDevices;
  }

  private enrichWithRuntime(device: DeviceRow, sessions: SessionRow[]): DeviceListItem {
    const totalRuntime = sessions.reduce((sum, s) => sum + (s.uptime || 0), 0);
    return {
      deviceId: device.device_id,
      deviceName: device.device_name,
      status: device.current_status,
      totalRuntime,
    };
  }
}
```

### 3.3 Zod Validation (Backend)

```typescript
// device.validator.ts
import { z } from 'zod';

// Request body schemas
export const createDeviceSchema = z.object({
  deviceId: z.string().min(1).max(50),
  deviceName: z.string().min(1).max(100),
  vibrationThreshold: z.number().min(0).max(10).optional().default(1.0),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const updateDeviceSchema = createDeviceSchema.partial();

// Query parameter schemas
export const deviceListQuerySchema = z.object({
  status: z.enum(['running', 'stopped', 'disconnected']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'status', 'runtime']).optional().default('name'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// URL parameter schemas
export const deviceIdParamSchema = z.object({
  deviceId: z.string().min(1),
});

// Type inference
export type CreateDeviceDto = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceDto = z.infer<typeof updateDeviceSchema>;
export type DeviceListQuery = z.infer<typeof deviceListQuerySchema>;
```

### 3.4 Route Pattern (Backend)

```typescript
// device.routes.ts
import { Router } from 'express';
import { asyncHandler } from '@/middleware/async-handler';
import { requireAuth, requireRoles } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { deviceListQuerySchema, createDeviceSchema } from '@/api/validators/device.validator';

const router = Router();

// Initialize dependencies
const deviceRepo = new DeviceRepository();
const sessionRepo = new DeviceSessionRepository();
const deviceListService = new DeviceListService(deviceRepo, sessionRepo);
const deviceController = new DeviceController(deviceListService);

// Routes
router.get(
  '/list',
  asyncHandler(requireAuth),
  validate(deviceListQuerySchema, 'query'),
  asyncHandler(deviceController.getList)
);

router.post(
  '/manage',
  asyncHandler(requireAuth),
  asyncHandler(requireRoles(['admin', 'root'])),
  validate(createDeviceSchema, 'body'),
  asyncHandler(deviceController.create)
);

export default router;
```

### 3.5 Component Pattern (Frontend)

```typescript
// device-filters.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type SortBy = 'name' | 'status' | 'runtime';

interface DeviceFiltersProps {
  search: string;
  status: string;
  sortBy: SortBy;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onSort: (value: SortBy) => void;
  onReset: () => void;
  onAdd?: () => void;
}

export function DeviceFilters({
  search,
  status,
  sortBy,
  onSearch,
  onStatus,
  onSort,
  onReset,
  onAdd,
}: DeviceFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <Input
        placeholder="Search devices..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <Select value={status} onValueChange={onStatus}>
        {/* options */}
      </Select>
      <Button variant="outline" onClick={onReset}>
        Reset
      </Button>
      {onAdd && (
        <Button onClick={onAdd}>Add Device</Button>
      )}
    </div>
  );
}
```

### 3.6 Hook Pattern (Frontend)

```typescript
// use-device-detail.ts
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/device';

export function useDeviceDetail(deviceId: string) {
  return useQuery({
    queryKey: ['device', 'detail', deviceId],
    queryFn: () => deviceServices.getDetail(deviceId),
    enabled: !!deviceId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// use-create-device.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/device';
import { toast } from 'sonner';

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceServices.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device', 'list'] });
      toast.success('Device created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create device: ${error.message}`);
    },
  });
}
```

### 3.7 API Service Pattern (Frontend)

```typescript
// lib/api/device.ts
import { http } from './http';
import { API } from '@/lib/constants/api';

export const deviceServices = {
  getList: (params?: DeviceListQuery) =>
    http.get<DeviceListResponse>(API.DEVICE.LIST, { params }),

  getDetail: (deviceId: string) =>
    http.get<DeviceDetail>(`${API.DEVICE.DETAILS}?deviceId=${deviceId}`),

  create: (data: CreateDeviceDto) =>
    http.post<{ id: number }>(API.DEVICE.MANAGE, data),

  update: (data: UpdateDeviceDto) =>
    http.put<void>(API.DEVICE.MANAGE, data),

  delete: (deviceId: string) =>
    http.delete<void>(API.DEVICE.MANAGE, { data: { deviceId } }),
};
```

---

## 4. TYPESCRIPT PATTERNS

### 4.1 Type Definitions Location

```
Backend:
src/domain/{feature}/types/{feature}.types.ts  # Domain types
src/types/                                      # Global types

Frontend:
src/features/{feature}/types/{feature}.types.ts # Feature types
src/types/                                       # Global types
```

### 4.2 Interface vs Type

```typescript
// Use INTERFACE for:
// 1. Database rows (extensible)
export interface DeviceRow {
  id: number;
  device_id: string;
  device_name: string;
  current_status: string | null;
}

// 2. API responses
export interface DeviceListItem {
  deviceId: string;
  deviceName: string;
  status: string;
}

// 3. Props (can be extended)
export interface ButtonProps {
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

// Use TYPE for:
// 1. Union types
type DeviceStatus = 'running' | 'stopped' | 'disconnected';

// 2. Function signatures
type OnSearch = (value: string) => void;

// 3. Mapped/utility types
type Nullable<T> = T | null;
```

### 4.3 Null vs Undefined

```typescript
// Use NULL for database values
export interface DeviceRow {
  latitude: number | null;      // Can be NULL in DB
  longitude: number | null;
}

// Use UNDEFINED for optional parameters
async function createDevice(data: {
  deviceId: string;
  deviceName: string;
  latitude?: number;            // Optional parameter
  longitude?: number;
}): Promise<number>
```

---

## 5. IMPORT/EXPORT PATTERNS

### 5.1 Backend Imports

```typescript
// Infrastructure imports (absolute)
import { pool, query } from '@/infrastructure/database';
import { logger } from '@/infrastructure/logger';

// Domain imports (relative within domain)
import { UserRepository } from '../repositories';
import type { UserRow } from '../types';

// Shared imports
import { SESSION_TIMEOUT_HOURS } from '@/shared/constants';
```

### 5.2 Frontend Imports

```typescript
// UI components (alias)
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Feature imports (relative)
import { DeviceFilters } from './components/device-filters';
import { useDeviceList } from './hooks/use-device-list';

// Lib imports (alias)
import { deviceServices } from '@/lib/api/device';
import { cn } from '@/lib/utils';
```

### 5.3 Barrel Exports

```typescript
// domain/device/repositories/index.ts
export { DeviceRepository } from './device.repository';
export { DeviceSessionRepository } from './device-session.repository';

// features/devices/components/index.ts
export { DeviceFilters } from './device-filters';
export { DeviceCreateModal } from './device-create-modal';
export { DeviceListSkeleton } from './device-list-skeleton';
```

---

## 6. DOCUMENTATION STANDARDS

### 6.1 File Header (Optional)

```typescript
/**
 * Device Repository
 *
 * Handles all database operations for devices table.
 *
 * @module domain/device/repositories/device.repository
 */
```

### 6.2 Function Documentation

```typescript
/**
 * Find device by device_id
 *
 * @param deviceId - The unique device identifier
 * @returns Device row or null if not found
 *
 * @example
 * const device = await deviceRepo.findByDeviceId('TRACKER_001');
 */
async findByDeviceId(deviceId: string): Promise<DeviceRow | null> {
  // ...
}
```

### 6.3 Inline Comments

```typescript
// Return null if not found (don't throw error)
if (!device) {
  return null;
}

// Extend session expiry (sliding expiration)
const newExpiry = addHours(now(), SESSION_TIMEOUT_HOURS);
```

---

## 7. SUMMARY TABLE

| Category | Backend | Frontend |
|----------|---------|----------|
| **Files** | `kebab-case.ts` | `kebab-case.tsx` |
| **Classes** | `PascalCase` | `PascalCase` |
| **Functions** | `camelCase` | `camelCase` |
| **Hooks** | N/A | `use{Feature}` |
| **Constants** | `UPPER_SNAKE_CASE` | `UPPER_SNAKE_CASE` |
| **Types** | `PascalCase` | `PascalCase` |
| **Props callbacks** | N/A | `on{Action}` |
| **Repositories** | `{Entity}Repository` | N/A |
| **Services** | `{Feature}{Action}Service` | `{feature}Services` |
| **Components** | N/A | `{Feature}{Suffix}` |
