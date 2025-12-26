## PHẦN XIII: FRONTEND DESIGN & IMPLEMENTATION PLAN

**File này đã được tách thành các file chi tiết:**

- [`part-02-01-setup-and-structure.md`](./part-02-01-setup-and-structure.md) - Setup project và cấu trúc thư mục
- [`part-02-02-theme-and-styling.md`](./part-02-02-theme-and-styling.md) - Theme, màu sắc, styling
- [`part-02-03-layout-components.md`](./part-02-03-layout-components.md) - Layout components (Sidebar, Header)
- [`part-02-04-ui-components.md`](./part-02-04-ui-components.md) - UI components (shadcn/ui)
- [`part-02-05-pages-and-features.md`](./part-02-05-pages-and-features.md) - Pages và features
- [`part-02-06-api-integration.md`](./part-02-06-api-integration.md) - API integration
- [`part-02-07-realtime-integration.md`](./part-02-07-realtime-integration.md) - Realtime integration
- [`part-02-08-implementation-steps/README.md`](./part-02-08-implementation-steps/README.md) - **Các bước copy template và phát triển**
- [`part-02-09-code-review-lessons/README.md`](./part-02-09-code-review-lessons/README.md) - **Code review và bài học từ example**

---

## Tổng Quan

**Tech Stack:** Next.js 16+ (App Router) + React 19 + TypeScript + Tailwind CSS v4

**UI Framework:** shadcn/ui (Radix UI + Tailwind CSS)

**State Management:** Zustand (auth), TanStack Query (server state)

**Realtime:** Socket.io Client

**Styling:** Tailwind CSS v4 với CSS Variables cho theme

**Inspiration:** Dựa trên cấu trúc và design patterns từ `Example/frontend_v2`

**Tech Stack:** Next.js 16+ (App Router) + React 19 + TypeScript + Tailwind CSS v4

**UI Framework:** shadcn/ui (Radix UI + Tailwind CSS)

**State Management:** Zustand (auth), TanStack Query (server state)

**Realtime:** Socket.io Client

**Styling:** Tailwind CSS v4 với CSS Variables cho theme

**Inspiration:** Dựa trên cấu trúc và design patterns từ `Example/frontend_v2`

---

### XIII.2 Cấu Trúc Thư Mục

```
frontend/
├── public/
│   ├── assets/
│   │   ├── background/
│   │   └── logo.svg
│   └── favicon.ico
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Landing/Login page
│   │   ├── globals.css              # Global styles + Tailwind
│   │   ├── theme.css                # Theme variables
│   │   ├── login/
│   │   │   └── page.tsx             # Login page
│   │   ├── dashboard/               # Protected routes
│   │   │   ├── layout.tsx           # Dashboard layout (sidebar + header)
│   │   │   ├── page.tsx             # Dashboard overview
│   │   │   ├── vehicles/            # Vehicle management
│   │   │   │   ├── page.tsx         # Vehicle list
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx     # Vehicle detail
│   │   │   │   └── new/
│   │   │   │       └── page.tsx     # Create vehicle
│   │   │   ├── customers/           # Customer management
│   │   │   │   ├── page.tsx         # Customer list
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx     # Customer detail
│   │   │   │   └── new/
│   │   │   │       └── page.tsx     # Create customer
│   │   │   ├── trips/               # Trip management
│   │   │   │   ├── page.tsx         # Trip list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Trip detail + route map
│   │   │   ├── alerts/              # Alert management
│   │   │   │   ├── page.tsx         # Alert list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Alert detail
│   │   │   ├── violations/          # Violation management
│   │   │   │   ├── page.tsx         # Violation list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Violation detail
│   │   │   ├── devices/             # Device management
│   │   │   │   ├── page.tsx         # Device list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Device detail + config
│   │   │   ├── geofences/           # Geofence management
│   │   │   │   ├── page.tsx         # Geofence list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Geofence detail + map
│   │   │   ├── maintenance/         # Maintenance management
│   │   │   │   ├── page.tsx         # Maintenance list
│   │   │   │   └── new/
│   │   │   │       └── page.tsx     # Create maintenance
│   │   │   ├── map/                 # Real-time map view
│   │   │   │   └── page.tsx         # Map với tất cả vehicles
│   │   │   ├── notifications/       # Notification preferences
│   │   │   │   └── page.tsx         # Telegram + Email settings
│   │   │   ├── settings/            # System settings
│   │   │   │   ├── page.tsx         # General settings
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx     # User profile
│   │   │   │   └── users/
│   │   │   │       └── page.tsx     # User management
│   │   │   └── [Phase 2] bookings/ # Booking management
│   │   │       ├── page.tsx
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   │
│   │   └── not-found.tsx
│   │
│   ├── components/                   # Reusable components
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── select.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── chart.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/                   # Layout components
│   │   │   ├── app-sidebar.tsx       # Main sidebar navigation
│   │   │   ├── header.tsx            # Top header
│   │   │   ├── breadcrumbs.tsx       # Breadcrumb navigation
│   │   │   ├── user-nav.tsx          # User menu dropdown
│   │   │   ├── auth-guard.tsx        # Auth protection
│   │   │   ├── page-container.tsx    # Page wrapper
│   │   │   └── ThemeToggle/          # Theme switcher
│   │   │
│   │   ├── forms/                    # Form components
│   │   │   ├── form-input.tsx
│   │   │   ├── form-select.tsx
│   │   │   ├── form-date-picker.tsx
│   │   │   ├── form-checkbox.tsx
│   │   │   ├── form-switch.tsx
│   │   │   └── form-textarea.tsx
│   │   │
│   │   ├── dashboard/                # Dashboard-specific components
│   │   │   ├── stats-card.tsx       # Statistic cards
│   │   │   ├── vehicle-card.tsx     # Vehicle card component
│   │   │   ├── alert-card.tsx       # Alert card component
│   │   │   └── chart-card.tsx       # Chart wrapper
│   │   │
│   │   ├── map/                      # Map components
│   │   │   ├── vehicle-map.tsx      # Map với vehicles
│   │   │   ├── route-map.tsx        # Route visualization
│   │   │   ├── geofence-map.tsx     # Geofence editor
│   │   │   └── marker-popup.tsx     # Map marker popup
│   │   │
│   │   ├── charts/                   # Chart components
│   │   │   ├── speed-chart.tsx      # Speed over time
│   │   │   ├── location-chart.tsx   # Location heatmap
│   │   │   └── battery-chart.tsx    # Battery level chart
│   │   │
│   │   ├── providers/                # Context providers
│   │   │   ├── QueryProvider.tsx    # TanStack Query
│   │   │   ├── RealtimeProvider.tsx  # Socket.io
│   │   │   └── NotificationProvider.tsx # Toast notifications
│   │   │
│   │   └── common/                   # Common utilities
│   │       ├── confirm-dialog.tsx
│   │       ├── loading-spinner.tsx
│   │       ├── empty-state.tsx
│   │       └── error-boundary.tsx
│   │
│   ├── features/                     # Feature modules
│   │   ├── vehicles/
│   │   │   ├── components/
│   │   │   │   ├── vehicle-list.tsx
│   │   │   │   ├── vehicle-form.tsx
│   │   │   │   ├── vehicle-status.tsx
│   │   │   │   └── vehicle-detail.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useVehicles.ts
│   │   │   │   └── useVehicle.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── customers/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   │
│   │   ├── trips/
│   │   │   ├── components/
│   │   │   │   ├── trip-list.tsx
│   │   │   │   ├── trip-detail.tsx
│   │   │   │   └── trip-route.tsx
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   │
│   │   ├── alerts/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   │
│   │   ├── map/
│   │   │   ├── components/
│   │   │   │   ├── realtime-map.tsx
│   │   │   │   └── vehicle-markers.tsx
│   │   │   └── hooks/
│   │   │
│   │   └── [Phase 2] bookings/
│   │       ├── components/
│   │       └── hooks/
│   │
│   ├── lib/                          # Utilities & configs
│   │   ├── api/                      # API clients
│   │   │   ├── http.ts               # HTTP client (fetch wrapper)
│   │   │   ├── auth.ts               # Auth API
│   │   │   ├── vehicles.ts           # Vehicle API
│   │   │   ├── customers.ts          # Customer API
│   │   │   ├── trips.ts              # Trip API
│   │   │   ├── alerts.ts             # Alert API
│   │   │   ├── violations.ts        # Violation API
│   │   │   ├── devices.ts            # Device API
│   │   │   ├── geofences.ts          # Geofence API
│   │   │   ├── maintenance.ts        # Maintenance API
│   │   │   ├── notifications.ts      # Notification API
│   │   │   └── endpoints.ts          # API endpoints constants
│   │   │
│   │   ├── realtime/                 # Socket.io client
│   │   │   ├── client.ts             # Socket client
│   │   │   └── events.ts             # Event types
│   │   │
│   │   ├── store/                    # Zustand stores
│   │   │   ├── authStore.ts          # Auth state
│   │   │   └── uiStore.ts            # UI state (sidebar, theme)
│   │   │
│   │   ├── constants/                # Constants
│   │   │   ├── theme.ts              # Theme colors
│   │   │   └── routes.ts             # Route paths
│   │   │
│   │   ├── utils/                    # Utility functions
│   │   │   ├── cn.ts                 # className utility
│   │   │   ├── format.ts             # Format helpers
│   │   │   └── validation.ts         # Validation helpers
│   │   │
│   │   ├── hooks/                    # Shared hooks
│   │   │   ├── use-debounce.ts
│   │   │   ├── use-media-query.ts
│   │   │   └── use-mobile.ts
│   │   │
│   │   └── notification.ts          # Toast notification utils
│   │
│   ├── config/                       # Configuration
│   │   ├── nav-config.ts             # Navigation config
│   │   └── data-table.ts             # Table config
│   │
│   └── types/                        # TypeScript types
│       ├── auth.d.ts
│       ├── vehicle.d.ts
│       ├── customer.d.ts
│       ├── trip.d.ts
│       ├── alert.d.ts
│       └── index.ts
│
├── components.json                   # shadcn/ui config
├── tailwind.config.ts                # Tailwind config
├── next.config.ts                    # Next.js config
├── tsconfig.json                     # TypeScript config
├── package.json
└── Dockerfile
```

---

### XIII.3 Tech Stack Chi Tiết

#### XIII.3.1 Core Dependencies

```json
{
  "dependencies": {
    "next": "^16.0.7",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "typescript": "^5.7.2",
    
    // UI Framework
    "@radix-ui/react-*": "^1.x.x",      // Radix UI primitives
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "tailwindcss-animate": "^1.0.7",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.2",
    
    // State Management
    "zustand": "^5.0.2",
    "@tanstack/react-query": "^5.90.5",
    "@tanstack/react-query-devtools": "^5.90.2",
    
    // Forms
    "react-hook-form": "^7.54.1",
    "@hookform/resolvers": "^5.2.1",
    "zod": "^4.1.8",
    
    // Realtime
    "socket.io-client": "^4.8.1",
    
    // Maps
    "leaflet": "^1.9.4",
    "react-leaflet": "^5.0.0",
    
    // Charts
    "recharts": "^2.15.1",
    "chart.js": "^4.4.8",
    "react-chartjs-2": "^5.3.0",
    
    // Icons
    "lucide-react": "^0.476.0",
    "@tabler/icons-react": "^3.31.0",
    
    // Utils
    "date-fns": "^4.1.0",
    "dayjs": "^1.11.19",
    "sonner": "^1.7.1",                // Toast notifications
    "next-themes": "^0.4.6",           // Theme switching
    "nextjs-toploader": "^3.7.15"      // Page transition loader
  }
}
```

#### XIII.3.2 Dev Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "@types/leaflet": "^1.9.21",
    "eslint": "^8.48.0",
    "eslint-config-next": "^16.0.7",
    "prettier": "^3.4.2",
    "prettier-plugin-tailwindcss": "^0.6.11"
  }
}
```

---

### XIII.4 Theme & Màu Sắc

#### XIII.4.1 Color Scheme (Dựa trên Example)

**Light Theme:**

```css
:root {
  --background: oklch(1 0 0);              /* White */
  --foreground: oklch(0.145 0 0);          /* Dark gray */
  --card: oklch(1 0 0);                    /* White */
  --card-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);             /* Dark gray/black */
  --primary-foreground: oklch(0.985 0 0);  /* White */
  --secondary: oklch(0.97 0 0);            /* Light gray */
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325); /* Red */
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  
  /* Sidebar */
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  
  /* Chart colors */
  --chart-1: oklch(0.646 0.222 41.116);    /* Blue */
  --chart-2: oklch(0.6 0.118 184.704);     /* Green */
  --chart-3: oklch(0.398 0.07 227.392);   /* Purple */
  --chart-4: oklch(0.828 0.189 84.429);   /* Yellow */
  --chart-5: oklch(0.769 0.188 70.08);    /* Orange */
}
```

**Dark Theme:**

```css
.dark {
  --background: oklch(0.145 0 0);           /* Dark gray */
  --foreground: oklch(0.985 0 0);          /* White */
  --card: oklch(0.205 0 0);                 /* Darker gray */
  --card-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);              /* Light gray */
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.371 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216); /* Red */
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  
  /* Sidebar */
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376); /* Blue */
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  
  /* Chart colors */
  --chart-1: oklch(0.488 0.243 264.376);  /* Blue */
  --chart-2: oklch(0.696 0.17 162.48);     /* Green */
  --chart-3: oklch(0.769 0.188 70.08);     /* Orange */
  --chart-4: oklch(0.627 0.265 303.9);     /* Purple */
  --chart-5: oklch(0.645 0.246 16.439);     /* Red */
}
```

#### XIII.4.2 Status Colors

```typescript
// src/lib/constants/status-colors.ts
export const STATUS_COLORS = {
  // Vehicle status
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  maintenance: 'bg-yellow-500',
  retired: 'bg-red-500',
  
  // Alert severity
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
  
  // Trip status
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-500',
  
  // Device status
  online: 'bg-green-500',
  offline: 'bg-red-500',
  error: 'bg-red-600',
} as const;
```

#### XIII.4.3 Theme Variants (Optional)

```css
/* src/app/theme.css */
.theme-blue {
  --primary: var(--color-blue-600);
  --primary-foreground: var(--color-blue-50);
}

.theme-green {
  --primary: var(--color-lime-600);
  --primary-foreground: var(--color-lime-50);
}

.theme-amber {
  --primary: var(--color-amber-600);
  --primary-foreground: var(--color-amber-50);
}
```

---

### XIII.5 UI/UX Patterns

#### XIII.5.1 Layout Structure

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────┐
│ Header (Breadcrumbs, User Nav, Theme Toggle)   │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Sidebar  │  Main Content Area                   │
│ (Nav)    │  - Page Header                      │
│          │  - Filters/Search                   │
│          │  - Data Table/Cards                 │
│          │  - Pagination                       │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

**Sidebar Features:**
- Collapsible (icon-only mode)
- Persistent state (cookie/localStorage)
- Active route highlighting
- Nested navigation support
- Mobile responsive (drawer)

**Header Features:**
- Breadcrumb navigation
- Search (Cmd+K)
- User menu dropdown
- Theme toggle
- Notifications bell

#### XIII.5.2 Component Patterns

**Data Tables:**
- Sortable columns
- Filterable rows
- Pagination
- Row selection
- Actions dropdown
- Export functionality

**Cards:**
- Stat cards với icons
- Vehicle cards với status badges
- Alert cards với severity indicators
- Chart cards với tooltips

**Forms:**
- React Hook Form + Zod validation
- Inline error messages
- Loading states
- Success/error toasts

**Maps:**
- Leaflet với custom markers
- Real-time position updates
- Route visualization
- Geofence drawing
- Popup với vehicle info

#### XIII.5.3 Responsive Design

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Adaptations:**
- Sidebar → Drawer
- Table → Card list
- Filters → Bottom sheet
- Map → Full screen

---

### XIII.6 Navigation Structure

```typescript
// src/config/nav-config.ts
export const navItems: NavItem[] = [
  {
    title: 'Tổng quan',
    url: '/dashboard',
    icon: 'dashboard',
    shortcut: ['d', 'd'],
  },
  {
    title: 'Xe',
    url: '/dashboard/vehicles',
    icon: 'car',
    items: [
      { title: 'Danh sách xe', url: '/dashboard/vehicles' },
      { title: 'Thêm xe mới', url: '/dashboard/vehicles/new' },
    ],
  },
  {
    title: 'Khách hàng',
    url: '/dashboard/customers',
    icon: 'users',
  },
  {
    title: 'Chuyến đi',
    url: '/dashboard/trips',
    icon: 'route',
  },
  {
    title: 'Cảnh báo',
    url: '/dashboard/alerts',
    icon: 'bell',
    badge: 'count', // Dynamic badge với số alerts chưa xử lý
  },
  {
    title: 'Vi phạm',
    url: '/dashboard/violations',
    icon: 'alert-triangle',
  },
  {
    title: 'Bản đồ',
    url: '/dashboard/map',
    icon: 'map',
  },
  {
    title: 'Thiết bị',
    url: '/dashboard/devices',
    icon: 'device',
  },
  {
    title: 'Vùng địa lý',
    url: '/dashboard/geofences',
    icon: 'map-pin',
  },
  {
    title: 'Bảo trì',
    url: '/dashboard/maintenance',
    icon: 'wrench',
  },
  {
    title: 'Thông báo',
    url: '/dashboard/notifications',
    icon: 'notification',
  },
  {
    title: 'Cài đặt',
    url: '/dashboard/settings',
    icon: 'settings',
    items: [
      { title: 'Chung', url: '/dashboard/settings' },
      { title: 'Hồ sơ', url: '/dashboard/settings/profile' },
      { title: 'Người dùng', url: '/dashboard/settings/users' },
    ],
  },
  // [Phase 2]
  {
    title: 'Đặt xe',
    url: '/dashboard/bookings',
    icon: 'calendar',
    phase: 2,
  },
];
```

---

### XIII.7 Key Pages & Features

#### XIII.7.1 Dashboard Overview (`/dashboard`)

**Components:**
- Stats cards: Tổng số xe, chuyến đi hôm nay, cảnh báo chưa xử lý, vi phạm
- Recent alerts table
- Active vehicles map (mini)
- Recent trips list
- Charts: Trips per day, alerts by type

#### XIII.7.2 Vehicle Management (`/dashboard/vehicles`)

**List Page:**
- Data table với columns: Biển số, Brand/Model, Status, Device, Last seen, Actions
- Filters: Status, Vehicle type, Search
- Actions: View, Edit, Delete, View on map

**Detail Page:**
- Vehicle info card
- Current location map
- Device status
- Active alerts
- Recent trips
- Maintenance history
- [Phase 2] Current booking info

#### XIII.7.3 Trip Management (`/dashboard/trips`)

**List Page:**
- Data table: Trip ID, Vehicle, Customer, Start/End time, Distance, Duration, Status
- Filters: Vehicle, Customer, Date range, Status

**Detail Page:**
- Trip info card
- Route map với stops
- Speed chart
- Violations list
- Events timeline

#### XIII.7.4 Real-time Map (`/dashboard/map`)

**Features:**
- All vehicles markers
- Real-time position updates (WebSocket)
- Vehicle popup với status
- Filter by vehicle/status
- Geofence visualization
- Route replay

#### XIII.7.5 Alert Management (`/dashboard/alerts`)

**List Page:**
- Data table với severity badges
- Filters: Type, Severity, Vehicle, Date range
- Bulk actions: Acknowledge, Resolve

**Detail Page:**
- Alert info
- Location map
- Related vehicle/customer
- Actions: Acknowledge, Resolve

#### XIII.7.6 Notification Settings (`/dashboard/notifications`)

**Features:**
- Telegram connection (connect/disconnect)
- Email settings
- Alert type preferences
- Severity filter
- Vehicle filter
- Test notification button

---

### XIII.8 API Integration

#### XIII.8.1 HTTP Client

```typescript
// src/lib/api/http.ts
// Dựa trên Example/frontend_v2/src/lib/api/http.ts
// - Retry logic với exponential backoff
// - Timeout handling
// - 401 auto logout
// - Error notifications
```

#### XIII.8.2 API Modules

```typescript
// src/lib/api/vehicles.ts
export const vehicleApi = {
  list: (params?: VehicleListParams) => 
    http.get<VehicleListResponse>('/vehicles', { params }),
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

#### XIII.8.3 React Query Hooks

```typescript
// src/features/vehicles/hooks/useVehicles.ts
export function useVehicles(params?: VehicleListParams) {
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
```

---

### XIII.9 Realtime Integration

#### XIII.9.1 Socket.io Client

```typescript
// src/lib/realtime/client.ts
// Dựa trên Example/frontend_v2/src/lib/realtime/client.ts
// - Namespace support
// - Auto-reconnect
// - Token authentication
// - Connection state management
```

#### XIII.9.2 Realtime Hooks

```typescript
// src/hooks/useVehicleRealtime.ts
export function useVehicleRealtime(vehicleId: number) {
  const [location, setLocation] = useState<Location | null>(null);
  const socket = useRealtimeSocket('dashboard');
  
  useEffect(() => {
    socket.on(`vehicle:${vehicleId}:location`, setLocation);
    socket.emit('subscribe', { vehicleId });
    
    return () => {
      socket.off(`vehicle:${vehicleId}:location`);
      socket.emit('unsubscribe', { vehicleId });
    };
  }, [vehicleId, socket]);
  
  return location;
}
```

---

### XIII.10 Authentication

#### XIII.10.1 Auth Store (Zustand)

```typescript
// src/lib/store/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}
```

#### XIII.10.2 Auth Guard

```typescript
// src/components/layout/auth-guard.tsx
// Redirect to /login nếu chưa authenticated
// Check token expiry
// Auto refresh token
```

---

### XIII.11 Form Handling

#### XIII.11.1 Form Pattern

```typescript
// src/features/vehicles/components/vehicle-form.tsx
export function VehicleForm({ vehicleId }: { vehicleId?: number }) {
  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: async () => {
      if (vehicleId) {
        const vehicle = await vehicleApi.get(vehicleId);
        return vehicle;
      }
      return defaultValues;
    },
  });
  
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  
  const onSubmit = (data: VehicleFormData) => {
    if (vehicleId) {
      updateMutation.mutate({ id: vehicleId, data });
    } else {
      createMutation.mutate(data);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

---

### XIII.12 Implementation Phases

#### Phase 1: Core Setup
1. ✅ Next.js project setup
2. ✅ Tailwind CSS + shadcn/ui
3. ✅ Theme system
4. ✅ Layout components (Sidebar, Header)
5. ✅ Auth system
6. ✅ API client
7. ✅ React Query setup

#### Phase 2: Core Features
1. ✅ Dashboard overview
2. ✅ Vehicle management (CRUD)
3. ✅ Customer management (CRUD)
4. ✅ Trip management (List, Detail)
5. ✅ Alert management (List, Detail)
6. ✅ Violation management
7. ✅ Device management
8. ✅ Real-time map

#### Phase 3: Advanced Features
1. ✅ Geofence management
2. ✅ Maintenance management
3. ✅ Notification settings (Telegram + Email)
4. ✅ User management
5. ✅ Settings pages

#### Phase 4: [Phase 2] Booking Features
1. ⏸️ Booking management
2. ⏸️ Contract management
3. ⏸️ Payment management
4. ⏸️ Damage reports
5. ⏸️ Reviews

---

### XIII.13 Docker Configuration

```dockerfile
# Dockerfile (dựa trên Example/frontend_v2/Dockerfile)
ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --legacy-peer-deps

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
ARG NEXT_PUBLIC_WS_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3002
CMD ["node", "server.js"]
```

---

### XIII.14 Summary

**Tech Stack:**
- ✅ Next.js 16+ (App Router)
- ✅ React 19 + TypeScript
- ✅ Tailwind CSS v4
- ✅ shadcn/ui (Radix UI)
- ✅ TanStack Query
- ✅ Zustand
- ✅ Socket.io Client
- ✅ React Hook Form + Zod
- ✅ Leaflet (Maps)
- ✅ Recharts (Charts)

**Key Features:**
- ✅ Responsive design (Mobile, Tablet, Desktop)
- ✅ Dark/Light theme
- ✅ Real-time updates (WebSocket)
- ✅ Form validation
- ✅ Error handling
- ✅ Loading states
- ✅ Toast notifications

**Pages:**
- ✅ Dashboard overview
- ✅ Vehicle management
- ✅ Customer management
- ✅ Trip management
- ✅ Alert management
- ✅ Violation management
- ✅ Real-time map
- ✅ Device management
- ✅ Geofence management
- ✅ Maintenance management
- ✅ Notification settings
- ✅ User settings

**Phase 2:**
- ⏸️ Booking management
- ⏸️ Contract management
- ⏸️ Payment management
- ⏸️ Damage reports
- ⏸️ Reviews

