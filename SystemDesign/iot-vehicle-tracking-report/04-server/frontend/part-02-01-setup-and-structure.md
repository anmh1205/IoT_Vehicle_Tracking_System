## PHẦN XIII.1: FRONTEND SETUP & PROJECT STRUCTURE

### XIII.1.1 Tổng Quan

**Tech Stack:** Next.js 16+ (App Router) + React 19 + TypeScript + Tailwind CSS v4

**UI Framework:** shadcn/ui (Radix UI + Tailwind CSS)

**State Management:** Zustand (auth), TanStack Query (server state)

**Realtime:** Socket.io Client

**Styling:** Tailwind CSS v4 với CSS Variables cho theme

**Inspiration:** Dựa trên cấu trúc và design patterns từ `Example/frontend_v2`

---

### XIII.1.2 Cấu Trúc Thư Mục Chi Tiết

```
frontend/
├── public/
│   ├── assets/
│   │   ├── background/
│   │   │   └── LoginBackground.png
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
│   │   │   └── validation.ts        # Validation helpers
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

### XIII.1.3 Tech Stack Chi Tiết

#### Core Dependencies

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

#### Dev Dependencies

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

### XIII.1.4 Configuration Files

#### `next.config.ts`

```typescript
import type { NextConfig } from 'next';

const normalizeUrl = (url?: string) => url?.trim().replace(/\/$/, '') ?? '';

const resolveApiBaseUrl = () => {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_API_BASE_URL;
  if (apiBase && apiBase.trim()) return normalizeUrl(apiBase);
  return normalizeUrl('http://localhost:3000');
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      }
    ]
  },
  async rewrites() {
    const apiBase = resolveApiBaseUrl();
    if (!apiBase) return [];

    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ]
      }
    ];
  }
};

export default nextConfig;
```

#### `components.json` (shadcn/ui)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

#### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

### XIII.1.5 Environment Variables

#### `.env.local`

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=http://localhost:3000

# App Configuration
NEXT_PUBLIC_APP_NAME=Vehicle Tracking System
NEXT_PUBLIC_APP_VERSION=1.0.0
```

---

### XIII.1.6 Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start -p 3002",
    "lint": "next lint",
    "lint:fix": "eslint src --fix && prettier --write .",
    "format": "prettier --write .",
    "format:check": "prettier -c -w ."
  }
}
```

---

### XIII.1.7 Summary

**Cấu trúc:**
- ✅ App Router structure
- ✅ Feature-based organization
- ✅ Component library structure
- ✅ API client organization
- ✅ Type definitions

**Tech Stack:**
- ✅ Next.js 16+ với App Router
- ✅ TypeScript
- ✅ Tailwind CSS v4
- ✅ shadcn/ui
- ✅ TanStack Query
- ✅ Zustand
- ✅ Socket.io Client

**Next Steps:**
- Xem [`part-02-02-theme-and-styling.md`](./part-02-02-theme-and-styling.md) cho theme configuration
- Xem [`part-02-08-implementation-steps.md`](./part-02-08-implementation-steps.md) cho các bước setup và copy template

