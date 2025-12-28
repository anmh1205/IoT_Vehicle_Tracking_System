## XIII.2 Cấu Trúc Thư Mục

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
│   │   │   ├── violations.ts         # Violation API
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
│   │   └── notification.ts           # Toast notification utils
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

