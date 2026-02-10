# Frontend Architecture

> Next.js 15 + React 19 + IVM26 Template Pattern (next-shadcn-dashboard-starter)
> This document is the single source of truth for building the frontend. An agent MUST be able to build the entire frontend from this document alone.

---

## 1. IVM26 Template Compliance (MANDATORY)

This frontend MUST follow the UI pattern from the IVM26 reference project (based on next-shadcn-dashboard-starter by Kiranism).

**Reference:** `E:\anmh1205\IVM26\IVM26_Frontend\frontend_v2\`

### 1.1 Required Pattern Elements

| #   | Element             | Description                                                                                         | Source            |
| --- | ------------------- | --------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | **Layout Shell**    | `SidebarProvider` + `AppSidebar` + `SidebarInset`                                                   | shadcn/ui sidebar |
| 2   | **Header**          | `SidebarTrigger` + `Separator` + `Breadcrumbs` + `ThemeSelector` + `ModeToggle`                     | IVM26 layout      |
| 3   | **Page Wrapper**    | `PageContainer` with `ScrollArea`, `pageTitle`, `pageDescription`, `pageHeaderAction`               | IVM26 layout      |
| 4   | **Data Tables**     | `DataTable` wrapper (TanStack Table + shadcn/ui Table) with columns, sorting, filtering, pagination | IVM26 common      |
| 5   | **Forms**           | shadcn/ui `Dialog` or `Sheet` + `Form` component (react-hook-form + zod)                            | shadcn/ui         |
| 6   | **Toasts**          | `Sonner` toast library                                                                              | sonner            |
| 7   | **Icons**           | `lucide-react` (primary) + `@tabler/icons-react` (secondary)                                        | IVM26             |
| 8   | **State**           | Zustand (global, NO persist) + TanStack Query (server) + nuqs (URL)                                 | IVM26             |
| 9   | **Charts**          | `recharts` (same as IVM26)                                                                          | IVM26             |
| 10  | **Command Palette** | `kbar` or `cmdk`                                                                                    | IVM26             |
| 11  | **Theme**           | `next-themes` with `ThemeProvider` + `ThemeSelector` + `ModeToggle`                                 | IVM26             |
| 12  | **Top Loader**      | `nextjs-toploader` with `color='var(--primary)'`                                                    | IVM26             |

### 1.2 PROHIBITION Rules (Agents MUST NOT)

```
AGENTS MUST NOT:
  1. Hand-roll Dropdown, Pagination, Modal, Table, Skeleton, Select, Form inputs
     -> USE shadcn/ui equivalents installed via `npx shadcn@latest add <component>`
  2. Leave ANY page as "Coming Soon", "TODO", "future update", or placeholder
     -> Every page listed in Section 10 MUST be fully functional
  3. Use different layout patterns than IVM26
     -> No custom sidebar, no custom header, no custom page wrapper
  4. Copy-paste UI logic across pages
     -> Extract into shared components in components/common/
  5. Store auth token in localStorage or sessionStorage
     -> Token lives in Zustand memory store ONLY (no persist middleware)
  6. Use ECharts, Chart.js, or any chart library other than recharts
     -> recharts is the ONLY chart library
  7. Use mqtt.js or any MQTT client in the frontend
     -> All real-time data comes via Socket.IO from Backend
  8. Create NEXT_PUBLIC_MQTT_* environment variables
     -> MQTT credentials must NEVER appear in client bundle
  9. Use useState for URL-driven state (search, filters, pagination, tabs)
     -> Use nuqs (useQueryState / useQueryStates) for URL state
  10. Skip KBar/cmdk command palette integration
     -> Command palette is REQUIRED for keyboard-first navigation
```

---

## 2. Directory Structure

```
Tracking_Frontend/src/
├── app/                                    # Next.js App Router (routing + layouts ONLY)
│   ├── layout.tsx                          # Root layout: fonts, ThemeProvider, Providers, Toaster
│   ├── page.tsx                            # Root redirect -> /login
│   ├── error.tsx                           # Global error boundary
│   ├── not-found.tsx                       # 404 page
│   │
│   ├── login/                              # Auth pages (no sidebar)
│   │   ├── layout.tsx                      # Centered auth layout
│   │   └── page.tsx                        # Login page
│   │
│   └── dashboard/                          # Dashboard pages (sidebar + header)
│       ├── layout.tsx                      # SidebarProvider + AppSidebar + SidebarInset + SiteHeader
│       ├── page.tsx                        # Overview dashboard
│       ├── devices/
│       │   └── page.tsx                    # Device management
│       ├── vehicles/
│       │   └── page.tsx                    # Vehicle management
│       ├── customers/
│       │   └── page.tsx                    # Customer management
│       ├── trips/
│       │   ├── page.tsx                    # Trip list
│       │   └── [id]/
│       │       └── page.tsx                # Trip detail + replay
│       ├── alerts/
│       │   └── page.tsx                    # Alert management
│       ├── geofences/
│       │   └── page.tsx                    # Geofence management (FULL, NOT placeholder)
│       ├── maintenance/
│       │   └── page.tsx                    # Maintenance management
│       ├── map/
│       │   └── page.tsx                    # Live tracking map
│       ├── firmware/
│       │   └── page.tsx                    # Firmware OTA management
│       ├── exports/
│       │   └── page.tsx                    # Data export
│       ├── notifications/
│       │   └── page.tsx                    # Notification center
│       ├── settings/
│       │   └── page.tsx                    # Settings (profile + password + preferences)
│       └── admin/
│           ├── users/
│           │   └── page.tsx                # User management (admin only)
│           └── system/
│               └── page.tsx                # System admin (metrics, logs, health)
│
├── components/
│   ├── layout/                             # IVM26 Layout Components (MANDATORY)
│   │   ├── app-sidebar.tsx                 # Collapsible sidebar with nav groups + user menu
│   │   ├── site-header.tsx                 # Header: trigger + separator + breadcrumbs + theme + mode
│   │   ├── page-container.tsx              # Page wrapper (ScrollArea + Heading + action)
│   │   ├── breadcrumbs.tsx                 # Dynamic breadcrumbs from pathname
│   │   ├── nav-main.tsx                    # Main navigation menu items
│   │   ├── nav-user.tsx                    # User avatar + dropdown (profile, settings, logout)
│   │   ├── mode-toggle.tsx                 # Light/Dark/System mode toggle
│   │   ├── theme-selector.tsx              # Color theme selector
│   │   └── providers.tsx                   # Combined providers: QueryClient, Socket, NuqsAdapter
│   │
│   ├── ui/                                 # shadcn/ui Components (install via npx shadcn@latest add)
│   │   ├── accordion.tsx
│   │   ├── alert.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── chart.tsx                       # recharts wrapper from shadcn/ui charts
│   │   ├── checkbox.tsx
│   │   ├── collapsible.tsx
│   │   ├── command.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── heading.tsx                     # Page heading (title + description)
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── popover.tsx
│   │   ├── progress.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── sidebar.tsx
│   │   ├── skeleton.tsx
│   │   ├── sonner.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   └── tooltip.tsx
│   │
│   ├── common/                             # Shared Business Components
│   │   ├── data-table.tsx                  # DataTable wrapper (TanStack Table + shadcn Table)
│   │   ├── data-table-pagination.tsx       # Pagination controls
│   │   ├── data-table-toolbar.tsx          # Search + filter toolbar
│   │   ├── data-table-column-header.tsx    # Sortable column header
│   │   ├── data-table-faceted-filter.tsx   # Faceted filter (multi-select)
│   │   ├── data-table-view-options.tsx     # Column visibility toggle
│   │   ├── confirm-dialog.tsx              # Reusable delete/action confirmation
│   │   ├── stat-card.tsx                   # Dashboard stat card
│   │   ├── empty-state.tsx                 # Empty state (icon + message + action)
│   │   └── loading-spinner.tsx             # Centered loading indicator
│   │
│   ├── kbar/                               # Command Palette
│   │   ├── kbar-provider.tsx               # KBar wrapper with actions
│   │   └── kbar-content.tsx                # KBar result renderer
│   │
│   ├── lazy/                               # Lazy-loaded heavy components
│   │   ├── map-container.tsx               # dynamic(() => import('...'), { ssr: false })
│   │   └── chart-container.tsx             # Lazy recharts wrapper
│   │
│   ├── auth/                               # Auth guard
│   │   └── session-guard.tsx               # Check auth state on mount
│   │
│   └── providers/                          # Context Providers
│       ├── query-provider.tsx              # TanStack Query provider + devtools
│       ├── socket-provider.tsx             # Socket.IO connection provider
│       └── theme-provider.tsx              # next-themes provider
│
├── features/                               # Feature Modules (Feature-Sliced Architecture)
│   ├── auth/
│   │   └── components/
│   │       ├── login-form.tsx              # Login form with validation
│   │       └── logout-button.tsx           # Logout action
│   │
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── overview-stats.tsx          # Stat cards grid
│   │   │   ├── vehicle-status-chart.tsx    # Recharts pie/bar chart
│   │   │   ├── activity-feed.tsx           # Recent activity list
│   │   │   ├── alerts-summary.tsx          # Active alerts summary
│   │   │   └── runtime-chart.tsx           # Fleet runtime area chart
│   │   └── hooks/
│   │       └── use-dashboard-stats.ts      # Dashboard data query
│   │
│   ├── devices/
│   │   ├── components/
│   │   │   ├── device-columns.tsx          # DataTable column definitions
│   │   │   ├── device-form.tsx             # Create/edit form dialog
│   │   │   ├── device-detail-sheet.tsx     # Detail side panel with tabs
│   │   │   ├── device-telemetry-tab.tsx    # Telemetry data tab
│   │   │   ├── device-sessions-tab.tsx     # Session history tab
│   │   │   └── device-commands-tab.tsx     # Remote commands tab
│   │   ├── hooks/
│   │   │   ├── use-devices.ts              # List query
│   │   │   ├── use-device-detail.ts        # Detail query
│   │   │   ├── use-create-device.ts        # Create mutation
│   │   │   ├── use-update-device.ts        # Update mutation
│   │   │   ├── use-delete-device.ts        # Delete mutation
│   │   │   └── use-device-realtime.ts      # Socket.IO updates
│   │   └── types/
│   │       └── device.types.ts
│   │
│   ├── vehicles/
│   │   ├── components/
│   │   │   ├── vehicle-columns.tsx
│   │   │   ├── vehicle-form.tsx
│   │   │   ├── vehicle-detail-sheet.tsx
│   │   │   └── vehicle-assign-device.tsx   # Assign device to vehicle
│   │   ├── hooks/
│   │   │   ├── use-vehicles.ts
│   │   │   ├── use-create-vehicle.ts
│   │   │   ├── use-update-vehicle.ts
│   │   │   └── use-delete-vehicle.ts
│   │   └── types/
│   │       └── vehicle.types.ts
│   │
│   ├── customers/
│   │   ├── components/
│   │   │   ├── customer-columns.tsx
│   │   │   ├── customer-form.tsx
│   │   │   └── customer-detail-sheet.tsx   # Detail with fleet overview
│   │   ├── hooks/
│   │   │   ├── use-customers.ts
│   │   │   ├── use-create-customer.ts
│   │   │   ├── use-update-customer.ts
│   │   │   └── use-delete-customer.ts
│   │   └── types/
│   │       └── customer.types.ts
│   │
│   ├── trips/
│   │   ├── components/
│   │   │   ├── trip-columns.tsx
│   │   │   ├── trip-detail.tsx             # Full trip detail view
│   │   │   ├── trip-route-map.tsx          # Route polyline on map
│   │   │   └── trip-replay-controls.tsx    # Playback speed, progress, play/pause
│   │   ├── hooks/
│   │   │   ├── use-trips.ts
│   │   │   ├── use-trip-detail.ts
│   │   │   └── use-trip-telemetry.ts       # Time-series data for replay
│   │   └── types/
│   │       └── trip.types.ts
│   │
│   ├── alerts/
│   │   ├── components/
│   │   │   ├── alert-columns.tsx
│   │   │   ├── alert-detail-sheet.tsx
│   │   │   └── alert-rules-config.tsx      # Alert rule CRUD
│   │   ├── hooks/
│   │   │   ├── use-alerts.ts
│   │   │   ├── use-acknowledge-alert.ts
│   │   │   ├── use-resolve-alert.ts
│   │   │   └── use-alert-realtime.ts       # Real-time new alerts
│   │   └── types/
│   │       └── alert.types.ts
│   │
│   ├── geofences/
│   │   ├── components/
│   │   │   ├── geofence-columns.tsx
│   │   │   ├── geofence-form.tsx
│   │   │   ├── geofence-map-editor.tsx     # Leaflet.Draw for circle/polygon
│   │   │   └── geofence-vehicle-binder.tsx # Bind vehicles to geofence
│   │   ├── hooks/
│   │   │   ├── use-geofences.ts
│   │   │   ├── use-create-geofence.ts
│   │   │   ├── use-update-geofence.ts
│   │   │   └── use-delete-geofence.ts
│   │   └── types/
│   │       └── geofence.types.ts
│   │
│   ├── maintenance/
│   │   ├── components/
│   │   │   ├── maintenance-columns.tsx
│   │   │   ├── maintenance-form.tsx
│   │   │   └── maintenance-calendar.tsx    # Calendar view of scheduled maintenance
│   │   ├── hooks/
│   │   │   ├── use-maintenance.ts
│   │   │   ├── use-create-maintenance.ts
│   │   │   └── use-update-maintenance.ts
│   │   └── types/
│   │       └── maintenance.types.ts
│   │
│   ├── map/
│   │   ├── components/
│   │   │   ├── tracking-map.tsx            # Main map with markers + clusters (16KB ref)
│   │   │   ├── device-list-panel.tsx       # Sidebar device list panel (8KB ref)
│   │   │   ├── device-list-item.tsx        # Single device in panel (6.5KB ref)
│   │   │   ├── device-search.tsx           # Search input with debounce (1.7KB ref)
│   │   │   ├── device-filter.tsx           # Desktop status filter (5.7KB ref)
│   │   │   ├── device-filter-compact.tsx   # Mobile compact filter (5.6KB ref)
│   │   │   ├── device-marker.tsx           # Custom device icon marker
│   │   │   ├── device-cluster.tsx          # Marker clustering wrapper (1.9KB ref)
│   │   │   ├── marker-icon.ts             # createDeviceMarkerIcon factory (6.5KB ref)
│   │   │   ├── selected-device-card.tsx    # Floating card for selected device (9.5KB ref)
│   │   │   ├── map-controls.tsx            # Zoom, layer, fullscreen controls (5.5KB ref)
│   │   │   ├── map-layer-switcher.tsx      # Street / Satellite toggle (2.7KB ref)
│   │   │   ├── mobile-device-drawer.tsx    # Mobile bottom sheet drawer (7.5KB ref)
│   │   │   └── geofence-layer.tsx          # Render geofence shapes
│   │   ├── hooks/
│   │   │   ├── use-device-positions.ts     # Real-time positions query
│   │   │   └── use-map-realtime.ts         # Socket.IO position updates + throttling
│   │   ├── constants/
│   │   │   └── map-config.ts               # Tile URLs, default center, zoom levels
│   │   └── types/
│   │       └── map.types.ts
│   │
│   ├── firmware/
│   │   ├── components/
│   │   │   ├── firmware-columns.tsx
│   │   │   ├── firmware-upload-form.tsx    # Upload new firmware
│   │   │   └── firmware-assign-dialog.tsx  # Assign firmware to devices
│   │   ├── hooks/
│   │   │   ├── use-firmwares.ts
│   │   │   ├── use-upload-firmware.ts
│   │   │   └── use-assign-firmware.ts
│   │   └── types/
│   │       └── firmware.types.ts
│   │
│   ├── exports/
│   │   ├── components/
│   │   │   ├── export-columns.tsx
│   │   │   └── export-create-form.tsx      # Create export job
│   │   ├── hooks/
│   │   │   ├── use-exports.ts
│   │   │   └── use-create-export.ts
│   │   └── types/
│   │       └── export.types.ts
│   │
│   ├── notifications/
│   │   ├── components/
│   │   │   ├── notification-list.tsx       # Notification list with filters
│   │   │   └── notification-item.tsx       # Single notification card
│   │   ├── hooks/
│   │   │   ├── use-notifications.ts
│   │   │   ├── use-mark-read.ts
│   │   │   └── use-notification-realtime.ts
│   │   └── types/
│   │       └── notification.types.ts
│   │
│   ├── settings/
│   │   ├── components/
│   │   │   ├── profile-form.tsx            # Edit profile (name, email, avatar)
│   │   │   ├── password-form.tsx           # Change password
│   │   │   ├── notification-prefs.tsx      # Notification preferences
│   │   │   └── appearance-settings.tsx     # Theme + language
│   │   ├── hooks/
│   │   │   ├── use-update-profile.ts
│   │   │   └── use-change-password.ts
│   │   └── types/
│   │       └── settings.types.ts
│   │
│   ├── users/                              # Admin user management
│   │   ├── components/
│   │   │   ├── user-columns.tsx
│   │   │   ├── user-form.tsx
│   │   │   └── user-role-select.tsx        # Role assignment select
│   │   ├── hooks/
│   │   │   ├── use-users.ts
│   │   │   ├── use-create-user.ts
│   │   │   ├── use-update-user.ts
│   │   │   └── use-delete-user.ts
│   │   └── types/
│   │       └── user.types.ts
│   │
│   ├── system-status/                      # System health monitoring
│   │   ├── components/
│   │   │   ├── health-card.tsx             # Service health card with status
│   │   │   ├── metric-card.tsx            # Metric with sparkline
│   │   │   ├── status-progress.tsx        # Resource usage bars
│   │   │   └── uptime-timeline.tsx        # 30-day uptime segments
│   │   ├── hooks/
│   │   │   ├── use-system-health-status.ts
│   │   │   ├── use-system-metrics.ts
│   │   │   └── use-system-uptime.ts
│   │   └── types/
│   │       └── system-status.types.ts
│   │
│   ├── simulator/                          # Device data simulator
│   │   ├── components/
│   │   │   ├── device-selector.tsx         # Select device for simulation
│   │   │   ├── data-configurator.tsx       # Simulation parameters form
│   │   │   ├── simulation-controls.tsx     # Start/pause/stop controls
│   │   │   └── simulation-preview.tsx      # Live preview with map + chart
│   │   ├── hooks/
│   │   │   ├── use-start-simulation.ts
│   │   │   ├── use-stop-simulation.ts
│   │   │   ├── use-simulation-status.ts
│   │   │   └── use-simulation-presets.ts
│   │   └── types/
│   │       └── simulator.types.ts
│   │
│   └── statistics/                         # Fleet statistics & reports
│       ├── components/
│       │   ├── statistics-summary.tsx      # Summary stats cards row
│       │   ├── fleet-utilization-chart.tsx # recharts bar chart
│       │   ├── device-uptime-chart.tsx     # recharts stacked bar chart
│       │   ├── trip-summary-chart.tsx      # recharts area chart
│       │   ├── alert-trend-chart.tsx       # recharts stacked bar chart
│       │   └── date-range-filter.tsx       # Date range picker for all charts
│       ├── hooks/
│       │   ├── use-statistics-summary.ts
│       │   ├── use-fleet-utilization.ts
│       │   ├── use-device-uptime.ts
│       │   ├── use-trip-summary.ts
│       │   └── use-alert-trend.ts
│       └── types/
│           └── statistics.types.ts
│
├── hooks/                                  # Global Hooks (cross-cutting only)
│   ├── use-debounce.ts                     # Debounce value hook
│   ├── use-mobile.ts                       # Mobile breakpoint detection
│   ├── use-socket.ts                       # Socket.IO context consumer
│   ├── use-role-access.ts                  # Role-based access check (canViewSystemInfo, canEditDevice)
│   ├── use-realtime-subscription.ts        # Generic Socket.IO event listener hook
│   ├── use-breadcrumbs.ts                  # Dynamic breadcrumb generation
│   └── use-device-status-realtime.ts       # Derive device status from socket events
│
├── lib/
│   ├── api/                                # API Client Layer
│   │   ├── client.ts                       # Axios instance + interceptors
│   │   ├── auth.ts                         # Auth API (login, logout, me)
│   │   ├── devices.ts                      # Device CRUD API
│   │   ├── vehicles.ts                     # Vehicle CRUD API
│   │   ├── customers.ts                    # Customer CRUD API
│   │   ├── trips.ts                        # Trip API
│   │   ├── alerts.ts                       # Alert API
│   │   ├── geofences.ts                    # Geofence API
│   │   ├── maintenance.ts                  # Maintenance API
│   │   ├── firmware.ts                     # Firmware API
│   │   ├── users.ts                        # User management API
│   │   ├── dashboard.ts                    # Dashboard stats API
│   │   ├── exports.ts                      # Export jobs API
│   │   ├── notifications.ts               # Notification API
│   │   ├── system-status.ts               # System health/metrics API
│   │   ├── simulator.ts                   # Simulator API
│   │   ├── statistics.ts                  # Statistics & reports API
│   │   └── system-admin.ts                # System admin logs/query/settings API
│   │
│   ├── store/                              # Zustand Stores
│   │   ├── auth-store.ts                   # User + token (MEMORY ONLY, no persist)
│   │   ├── ui-store.ts                     # Sidebar state, mobile menu
│   │   └── map-store.ts                    # Selected vehicle, zoom, center
│   │
│   ├── validations/                        # Zod Schemas for Forms
│   │   ├── auth.schema.ts
│   │   ├── device.schema.ts
│   │   ├── vehicle.schema.ts
│   │   ├── customer.schema.ts
│   │   ├── trip.schema.ts
│   │   ├── alert.schema.ts
│   │   ├── geofence.schema.ts
│   │   ├── maintenance.schema.ts
│   │   ├── firmware.schema.ts
│   │   ├── user.schema.ts
│   │   └── settings.schema.ts
│   │
│   ├── constants/
│   │   └── query-keys.ts                   # TanStack Query key constants
│   │
│   └── utils/
│       ├── cn.ts                           # clsx + tailwind-merge
│       ├── date.ts                         # date-fns with Vietnamese locale
│       └── format.ts                       # Number, currency, distance formatting
│
├── types/                                  # Global TypeScript Types
│   ├── index.ts                            # PaginatedResponse, ApiError, ApiResponse
│   └── nav.types.ts                        # NavItem type with RBAC
│
├── config/
│   └── nav-config.ts                       # Sidebar navigation items with RBAC
│
└── middleware.ts                           # Auth cookie check + route protection
```

---

## 3. Tech Stack

| Category              | Technology                     | Version        | Purpose                                  |
| --------------------- | ------------------------------ | -------------- | ---------------------------------------- |
| **Framework**         | Next.js                        | ^15.3.3        | App Router, RSC, Middleware              |
| **UI Library**        | React                          | ^19.2.0        | Component rendering                      |
| **Component Library** | shadcn/ui                      | latest         | Radix UI + Tailwind components           |
| **Styling**           | Tailwind CSS                   | ^4.0.0         | Utility-first CSS                        |
| **State (Global)**    | Zustand                        | ^5.0.2         | Auth, UI state (NO persist for auth)     |
| **State (Server)**    | TanStack Query                 | ^5.90.5        | API caching, mutations                   |
| **State (URL)**       | nuqs                           | ^2.4.1         | URL query state (search, filters, tabs)  |
| **Tables**            | TanStack Table                 | ^8.21.2        | Headless table logic                     |
| **Forms**             | react-hook-form                | ^7.54.1        | Form state management                    |
| **Form Resolvers**    | @hookform/resolvers            | ^5.2.1         | Zod integration                          |
| **Validation**        | zod                            | ^3.24.0        | Schema validation                        |
| **HTTP Client**       | Axios                          | ^1.7.9         | API requests + interceptors              |
| **Real-time**         | Socket.IO Client               | ^4.8.1         | WebSocket connection                     |
| **Maps**              | react-leaflet                  | ^5.0.0         | Map rendering                            |
| **Map Core**          | leaflet                        | ^1.9.4         | Map engine                               |
| **Map Clustering**    | react-leaflet-cluster          | ^4.0.0         | Marker clustering                        |
| **Map Drawing**       | @geoman-io/leaflet-geoman-free | ^2.17.0        | Geofence drawing (replaces leaflet-draw) |
| **Charts**            | recharts                       | ^2.15.1        | Data visualization (NOT echarts)         |
| **Icons**             | lucide-react                   | latest         | Primary icon library                     |
| **Icons (secondary)** | @tabler/icons-react            | ^3.31.0        | Additional icons                         |
| **Toast**             | sonner                         | ^1.7.1         | Toast notifications                      |
| **Theme**             | next-themes                    | ^0.4.6         | Dark/light/system mode                   |
| **Top Loader**        | nextjs-toploader               | ^3.7.15        | Page transition loader                   |
| **Date**              | date-fns                       | ^4.1.0         | Date formatting                          |
| **Command Palette**   | kbar                           | ^0.1.0-beta.45 | Keyboard-first navigation                |
| **CVA**               | class-variance-authority       | ^0.7.1         | Component variants                       |
| **Merge**             | tailwind-merge                 | ^3.0.2         | Tailwind class merging                   |
| **clsx**              | clsx                           | ^2.1.1         | Conditional classes                      |

---

## 4. Layout Architecture

### 4.1 Root Layout

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Providers } from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils/cn';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'IoT Vehicle Tracking',
  description: 'Hệ thống theo dõi phương tiện IoT',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={cn(
          'bg-background overflow-hidden overscroll-none font-sans antialiased',
          inter.variable
        )}
      >
        <NextTopLoader color="var(--primary)" showSpinner={false} />
        <NuqsAdapter>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            enableColorScheme
          >
            <Providers>
              <Toaster richColors position="top-right" />
              {children}
            </Providers>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
```

### 4.2 Dashboard Layout

```tsx
// app/dashboard/layout.tsx
import { cookies } from 'next/headers';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SiteHeader } from '@/components/layout/site-header';
import { KBarProvider } from '@/components/kbar/kbar-provider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <KBarProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </KBarProvider>
  );
}
```

### 4.3 Auth Layout

```tsx
// app/login/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
```

### 4.4 PageContainer Component

```tsx
// components/layout/page-container.tsx
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heading } from '@/components/ui/heading';

interface PageContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  pageTitle: string;
  pageDescription?: string;
  pageHeaderAction?: React.ReactNode;
}

export function PageContainer({
  children,
  scrollable = true,
  pageTitle,
  pageDescription,
  pageHeaderAction,
}: PageContainerProps) {
  const content = (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-start justify-between">
        <Heading title={pageTitle} description={pageDescription ?? ''} />
        {pageHeaderAction}
      </div>
      {children}
    </div>
  );

  if (scrollable) {
    return <ScrollArea className="h-[calc(100dvh-theme(spacing.16))]">{content}</ScrollArea>;
  }

  return content;
}
```

### 4.5 SiteHeader Component

```tsx
// components/layout/site-header.tsx
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ThemeSelector } from '@/components/layout/theme-selector';
import { ModeToggle } from '@/components/layout/mode-toggle';

export function SiteHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-2 px-4">
        <ThemeSelector />
        <ModeToggle />
      </div>
    </header>
  );
}
```

### 4.6 AppSidebar Component

```tsx
// components/layout/app-sidebar.tsx
'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { NavUser } from '@/components/layout/nav-user';
import { NavMain } from '@/components/layout/nav-main';
import { navConfig } from '@/config/nav-config';
import { useAuthStore } from '@/lib/store/auth-store';
import { Truck } from 'lucide-react';
import Link from 'next/link';

export function AppSidebar() {
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role ?? 'user';

  const filteredItems = navConfig.filter((item) => {
    if (!item.access) return true;
    if (item.access.role === 'admin') return userRole === 'admin' || userRole === 'root';
    if (item.access.role === 'root') return userRole === 'root';
    return true;
  });

  const mainItems = filteredItems.filter((item) => !item.section || item.section === 'main');
  const adminItems = filteredItems.filter((item) => item.section === 'admin');

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Truck className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Vehicle Tracking</span>
                  <span className="truncate text-xs text-muted-foreground">IoT Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mainItems} label="Menu" />
        {adminItems.length > 0 && <NavMain items={adminItems} label="Quản trị" />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
```

### 4.7 NavMain Component

```tsx
// components/layout/nav-main.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Icons } from '@/components/icons';
import type { NavItem } from '@/types/nav.types';

interface NavMainProps {
  items: NavItem[];
  label: string;
}

export function NavMain({ items, label }: NavMainProps) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = Icons[item.icon];
            const isActive =
              item.url === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.url);

            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link href={item.url}>
                    {Icon && <Icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
```

### 4.8 Navigation Configuration

```tsx
// config/nav-config.ts
import type { NavItem } from '@/types/nav.types';

export const navConfig: NavItem[] = [
  // Main section
  { title: 'Tong quan', url: '/dashboard', icon: 'dashboard', section: 'main' },
  { title: 'Thiet bi', url: '/dashboard/devices', icon: 'cpu', section: 'main' },
  { title: 'Phuong tien', url: '/dashboard/vehicles', icon: 'car', section: 'main' },
  { title: 'Khach hang', url: '/dashboard/customers', icon: 'users', section: 'main' },
  { title: 'Chuyen di', url: '/dashboard/trips', icon: 'route', section: 'main' },
  { title: 'Canh bao', url: '/dashboard/alerts', icon: 'bell', section: 'main' },
  { title: 'Vung dia ly', url: '/dashboard/geofences', icon: 'mapPin', section: 'main' },
  { title: 'Bao tri', url: '/dashboard/maintenance', icon: 'wrench', section: 'main' },
  { title: 'Ban do', url: '/dashboard/map', icon: 'map', section: 'main' },
  { title: 'Firmware', url: '/dashboard/firmware', icon: 'hardDrive', section: 'main', access: { role: 'admin' } },
  { title: 'Xuat du lieu', url: '/dashboard/exports', icon: 'fileDown', section: 'main' },
  { title: 'Thong bao', url: '/dashboard/notifications', icon: 'bellRing', section: 'main' },
  { title: 'Cai dat', url: '/dashboard/settings', icon: 'settings', section: 'main' },
  // Admin section
  { title: 'Nguoi dung', url: '/dashboard/admin/users', icon: 'userCog', section: 'admin', access: { role: 'admin' } },
  { title: 'He thong', url: '/dashboard/admin/system', icon: 'server', section: 'admin', access: { role: 'admin' } },
];
```

### 4.9 NavItem Type

```tsx
// types/nav.types.ts
export interface NavItem {
  title: string;
  url: string;
  icon: string;
  section?: 'main' | 'admin';
  access?: {
    role: 'user' | 'admin' | 'root';
  };
}
```

### 4.10 Icons Map

```tsx
// components/icons.tsx
import {
  LayoutDashboard,
  Cpu,
  Car,
  Users,
  Route,
  Bell,
  MapPin,
  Wrench,
  Map,
  HardDrive,
  FileDown,
  BellRing,
  Settings,
  UserCog,
  Server,
  type LucideIcon,
} from 'lucide-react';

export type Icon = LucideIcon;

export const Icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  cpu: Cpu,
  car: Car,
  users: Users,
  route: Route,
  bell: Bell,
  mapPin: MapPin,
  wrench: Wrench,
  map: Map,
  hardDrive: HardDrive,
  fileDown: FileDown,
  bellRing: BellRing,
  settings: Settings,
  userCog: UserCog,
  server: Server,
};
```

---

## 5. Data Flow Architecture

### 5.1 State Management Strategy

```
STATE HIERARCHY (most preferred first):

1. URL State (nuqs)         -> search, filters, pagination, active tab
                               Shareable, bookmarkable, survives refresh
                               useQueryState('search'), useQueryStates({...})

2. Server State (TanStack)  -> All API data (devices, vehicles, trips, etc.)
                               Automatic caching, refetching, deduplication
                               useQuery, useMutation, invalidateQueries

3. Real-time State (Socket) -> Live positions, new alerts, status changes
                               Socket events -> setQueryData or invalidateQueries

4. Global State (Zustand)   -> Auth (user + token), UI preferences
                               Token in MEMORY ONLY (no persist middleware)

5. Local State (useState)   -> Modal open/close, form dirty state
                               Component-specific, ephemeral
```

### 5.2 API Client with Interceptors

```typescript
// lib/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/lib/store/auth-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Request interceptor: attach session token from memory
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap data, handle 401
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data ?? error);
  }
);
```

### 5.3 Auth Store (Token in MEMORY ONLY)

```typescript
// lib/store/auth-store.ts
import { create } from 'zustand';
// NOTE: NO persist middleware. Token lives in memory only.
// On page refresh, user must re-authenticate via cookie-based session validation.

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin' | 'root';
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: (user, token) =>
    set({ user, token, isAuthenticated: true, isLoading: false }),
  logout: () =>
    set({ user: null, token: null, isAuthenticated: false, isLoading: false }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

### 5.4 TanStack Query Provider

```tsx
// components/providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 5.5 Combined Providers

```tsx
// components/layout/providers.tsx
'use client';

import { QueryProvider } from '@/components/providers/query-provider';
import { SocketProvider } from '@/components/providers/socket-provider';
import { SessionGuard } from '@/components/auth/session-guard';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SocketProvider>
        <SessionGuard>{children}</SessionGuard>
      </SocketProvider>
    </QueryProvider>
  );
}
```

### 5.6 Query Key Constants

```typescript
// lib/constants/query-keys.ts
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  devices: {
    all: ['devices'] as const,
    list: (filters?: Record<string, unknown>) => ['devices', 'list', filters] as const,
    detail: (id: string) => ['devices', 'detail', id] as const,
  },
  vehicles: {
    all: ['vehicles'] as const,
    list: (filters?: Record<string, unknown>) => ['vehicles', 'list', filters] as const,
    detail: (id: string) => ['vehicles', 'detail', id] as const,
    positions: ['vehicles', 'positions'] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (filters?: Record<string, unknown>) => ['customers', 'list', filters] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },
  trips: {
    all: ['trips'] as const,
    list: (filters?: Record<string, unknown>) => ['trips', 'list', filters] as const,
    detail: (id: string) => ['trips', 'detail', id] as const,
    telemetry: (id: string) => ['trips', 'telemetry', id] as const,
  },
  alerts: {
    all: ['alerts'] as const,
    list: (filters?: Record<string, unknown>) => ['alerts', 'list', filters] as const,
    rules: ['alerts', 'rules'] as const,
  },
  geofences: {
    all: ['geofences'] as const,
    list: (filters?: Record<string, unknown>) => ['geofences', 'list', filters] as const,
    detail: (id: string) => ['geofences', 'detail', id] as const,
  },
  maintenance: {
    all: ['maintenance'] as const,
    list: (filters?: Record<string, unknown>) => ['maintenance', 'list', filters] as const,
  },
  firmware: {
    all: ['firmware'] as const,
    list: (filters?: Record<string, unknown>) => ['firmware', 'list', filters] as const,
  },
  exports: {
    all: ['exports'] as const,
    list: (filters?: Record<string, unknown>) => ['exports', 'list', filters] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: Record<string, unknown>) => ['notifications', 'list', filters] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters?: Record<string, unknown>) => ['users', 'list', filters] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    activity: ['dashboard', 'activity'] as const,
  },
} as const;
```

---

## 6. Component Patterns

### 6.1 Standard CRUD Page (FULL code)

```tsx
// app/dashboard/devices/page.tsx
'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { PageContainer } from '@/components/layout/page-container';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { columns } from '@/features/devices/components/device-columns';
import { DeviceForm } from '@/features/devices/components/device-form';
import { useDevices } from '@/features/devices/hooks/use-devices';
import { useState } from 'react';

export default function DevicesPage() {
  const [search] = useQueryState('search', parseAsString.withDefault(''));
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useDevices();

  return (
    <PageContainer
      pageTitle="Thiet bi"
      pageDescription="Quan ly thiet bi GPS/OBD2 va theo doi trang thai"
      pageHeaderAction={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Them thiet bi
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        searchKey="deviceName"
        searchPlaceholder="Tim kiem thiet bi..."
      />
      <DeviceForm open={createOpen} onOpenChange={setCreateOpen} />
    </PageContainer>
  );
}
```

### 6.2 DataTable Component (FULL code)

```tsx
// components/common/data-table.tsx
'use client';

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  searchKey,
  searchPlaceholder,
  pageSize = 20,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize } },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Khong co du lieu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
```

### 6.3 DataTable Column Header (Sortable)

```tsx
// components/common/data-table-column-header.tsx
import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent">
            <span>{title}</span>
            {column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Tang dan
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Giam dan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            An cot
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

### 6.4 DataTable Column Definition Pattern

```tsx
// features/devices/components/device-columns.tsx
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import type { Device } from '../types/device.types';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  running: { label: 'Dang chay', variant: 'default' },
  stopped: { label: 'Dung', variant: 'secondary' },
  disconnected: { label: 'Mat ket noi', variant: 'destructive' },
};

export const columns: ColumnDef<Device>[] = [
  {
    accessorKey: 'deviceId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ma thiet bi" />,
    cell: ({ row }) => <span className="font-mono text-sm">{row.getValue('deviceId')}</span>,
  },
  {
    accessorKey: 'deviceName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ten thiet bi" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue('deviceName')}</span>,
  },
  {
    accessorKey: 'deviceType',
    header: 'Loai',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('deviceType')}</Badge>,
  },
  {
    accessorKey: 'currentStatus',
    header: 'Trang thai',
    cell: ({ row }) => {
      const status = row.getValue('currentStatus') as string;
      const mapped = statusMap[status] ?? { label: status, variant: 'outline' as const };
      return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'lastSeenAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Lan cuoi" />,
    cell: ({ row }) => {
      const date = row.getValue('lastSeenAt') as string | null;
      if (!date) return <span className="text-muted-foreground">Chua ket noi</span>;
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi });
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const device = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Mo menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => (table.options.meta as any)?.onView?.(device)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Xem chi tiet
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => (table.options.meta as any)?.onEdit?.(device)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Chinh sua
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => (table.options.meta as any)?.onDelete?.(device)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xoa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
```

### 6.5 Form Dialog Pattern (FULL code)

```tsx
// features/devices/components/device-form.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateDevice } from '../hooks/use-create-device';
import { useUpdateDevice } from '../hooks/use-update-device';
import { useEffect } from 'react';
import type { Device } from '../types/device.types';

const deviceSchema = z.object({
  deviceId: z.string().min(1, 'Ma thiet bi la bat buoc').max(50),
  deviceName: z.string().min(1, 'Ten thiet bi la bat buoc').max(100),
  deviceType: z.enum(['gps_tracker', 'obd2', 'combined']),
  simNumber: z.string().max(20).optional().or(z.literal('')),
  firmwareVersion: z.string().max(20).optional().or(z.literal('')),
});

type DeviceFormValues = z.infer<typeof deviceSchema>;

interface DeviceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Device | null;
}

export function DeviceForm({ open, onOpenChange, device }: DeviceFormProps) {
  const isEdit = !!device;
  const createMutation = useCreateDevice();
  const updateMutation = useUpdateDevice();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      deviceId: '',
      deviceName: '',
      deviceType: 'gps_tracker',
      simNumber: '',
      firmwareVersion: '',
    },
  });

  useEffect(() => {
    if (device) {
      form.reset({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType as DeviceFormValues['deviceType'],
        simNumber: device.simNumber ?? '',
        firmwareVersion: device.firmwareVersion ?? '',
      });
    } else {
      form.reset({
        deviceId: '',
        deviceName: '',
        deviceType: 'gps_tracker',
        simNumber: '',
        firmwareVersion: '',
      });
    }
  }, [device, form]);

  function onSubmit(values: DeviceFormValues) {
    const mutation = isEdit ? updateMutation : createMutation;
    const payload = isEdit ? { id: device!.id, ...values } : values;

    mutation.mutate(payload as any, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Chinh sua thiet bi' : 'Them thiet bi moi'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Cap nhat thong tin thiet bi.'
              : 'Dien thong tin de them thiet bi moi vao he thong.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="deviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ma thiet bi</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="VD: TRACKER_001"
                      disabled={isEdit}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ten thiet bi</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: GPS Tracker #1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loai thiet bi</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chon loai thiet bi" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gps_tracker">GPS Tracker</SelectItem>
                      <SelectItem value="obd2">OBD2</SelectItem>
                      <SelectItem value="combined">GPS + OBD2</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="simNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>So SIM</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: 0912345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="firmwareVersion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phien ban firmware</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: 1.0.0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Huy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Dang luu...' : isEdit ? 'Cap nhat' : 'Them moi'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### 6.6 Confirm Dialog

```tsx
// components/common/confirm-dialog.tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  isPending?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Xac nhan',
  cancelLabel = 'Huy',
  variant = 'default',
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {isPending ? 'Dang xu ly...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 6.7 Empty State

```tsx
// components/common/empty-state.tsx
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-muted rounded-full p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

### 6.8 Stat Card

```tsx
// components/common/stat-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
}

export function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}% so voi thang truoc
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### 6.9 Query Hook Pattern

```typescript
// features/devices/hooks/use-devices.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/constants/query-keys';

interface DeviceListParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useDevices(params?: DeviceListParams) {
  return useQuery({
    queryKey: queryKeys.devices.list(params),
    queryFn: () => apiClient.get('/devices', { params }),
    staleTime: 30_000,
  });
}
```

### 6.10 Mutation Hook Pattern

```typescript
// features/devices/hooks/use-create-device.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/constants/query-keys';
import { toast } from 'sonner';

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post('/devices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devices.all });
      toast.success('Them thiet bi thanh cong');
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Khong the them thiet bi');
    },
  });
}
```

---

## 7. Real-time Architecture (Socket.IO)

### 7.1 Socket Provider (FULL code)

```tsx
// components/providers/socket-provider.tsx
'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store/auth-store';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
```

### 7.2 MQTT in Frontend: PROHIBITED

```
The frontend does NOT connect directly to EMQX.
All real-time data is received via Socket.IO from the Backend.

Reasons:
1. Exposing MQTT broker credentials in browser is a security risk
2. NEXT_PUBLIC_MQTT_* env vars MUST NOT exist in the frontend
3. Socket.IO provides sufficient real-time capability with auth
4. Single real-time channel simplifies client-side state management
```

### 7.3 Real-time Hook Pattern

```typescript
// features/devices/hooks/use-device-realtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/components/providers/socket-provider';
import { queryKeys } from '@/lib/constants/query-keys';

export function useDeviceRealtime() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleStatusChanged = (data: { deviceId: string; status: string }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devices.all });
    };

    const handleLocationUpdated = (data: {
      deviceId: string;
      latitude: number;
      longitude: number;
      speed: number;
      heading: number;
      timestamp: string;
    }) => {
      queryClient.setQueryData(queryKeys.vehicles.positions, (old: any[]) =>
        old?.map((v) =>
          v.deviceId === data.deviceId ? { ...v, ...data } : v
        ) ?? [data]
      );
    };

    socket.on('device.status.changed', handleStatusChanged);
    socket.on('device.location.updated', handleLocationUpdated);

    return () => {
      socket.off('device.status.changed', handleStatusChanged);
      socket.off('device.location.updated', handleLocationUpdated);
    };
  }, [socket, isConnected, queryClient]);
}
```

### 7.4 Socket Events Table

| Event Name                | Direction        | Page(s)            | Action                           |
| ------------------------- | ---------------- | ------------------ | -------------------------------- |
| `device.status.changed`   | Server -> Client | Devices, Dashboard | invalidateQueries devices        |
| `device.location.updated` | Server -> Client | Map, Trips         | setQueryData positions           |
| `alert.new`               | Server -> Client | Alerts, Dashboard  | toast + invalidateQueries alerts |
| `alert.acknowledged`      | Server -> Client | Alerts             | invalidateQueries alerts         |
| `notification.new`        | Server -> Client | All (header badge) | invalidateQueries notifications  |
| `trip.started`            | Server -> Client | Trips, Map         | invalidateQueries trips          |
| `trip.ended`              | Server -> Client | Trips, Map         | invalidateQueries trips          |
| `geofence.entered`        | Server -> Client | Map, Alerts        | toast + highlight geofence       |
| `geofence.exited`         | Server -> Client | Map, Alerts        | toast + unhighlight geofence     |
| `firmware.progress`       | Server -> Client | Firmware           | setQueryData firmware progress   |

---

## 8. Map Strategy (Leaflet)

### 8.1 Dynamic Import Pattern (SSR-safe)

```tsx
// components/lazy/map-container.tsx
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

export const LazyMap = dynamic(
  () => import('@/features/map/components/live-map').then((m) => m.LiveMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[calc(100dvh-theme(spacing.16))] w-full" />,
  }
);
```

### 8.2 Live Map Component

```tsx
// features/map/components/live-map.tsx
'use client';

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { VehicleMarker } from './vehicle-marker';
import { GeofenceLayer } from './geofence-layer';
import { MAP_CONFIG } from '../constants/map-config';
import { useVehiclePositions } from '../hooks/use-vehicle-positions';
import { useMapRealtime } from '../hooks/use-map-realtime';
import 'leaflet/dist/leaflet.css';

export function LiveMap() {
  const { data: positions } = useVehiclePositions();
  useMapRealtime();

  return (
    <MapContainer
      center={MAP_CONFIG.defaultCenter}
      zoom={MAP_CONFIG.defaultZoom}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url={MAP_CONFIG.tileUrl}
      />
      <MarkerClusterGroup chunkedLoading>
        {positions?.map((pos) => (
          <VehicleMarker key={pos.deviceId} position={pos} />
        ))}
      </MarkerClusterGroup>
      <GeofenceLayer />
    </MapContainer>
  );
}
```

### 8.3 Map Configuration

```typescript
// features/map/constants/map-config.ts
export const MAP_CONFIG = {
  defaultCenter: [10.8231, 106.6297] as [number, number], // Ho Chi Minh City
  defaultZoom: 12,
  minZoom: 5,
  maxZoom: 18,
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  clusterThreshold: 14, // cluster below this zoom
  updateThrottleMs: 500, // throttle Socket updates to 2Hz
} as const;
```

### 8.4 Vehicle Marker with Custom Icons

```tsx
// features/map/components/vehicle-marker.tsx
'use client';

import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { VehiclePosition } from '../types/map.types';

function createVehicleIcon(status: string, heading: number) {
  const color = status === 'running' ? '#22c55e' : status === 'stopped' ? '#eab308' : '#ef4444';
  return L.divIcon({
    className: 'vehicle-marker',
    html: `<div style="transform: rotate(${heading}deg); color: ${color};">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L4 20h16L12 2z"/>
      </svg>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

interface VehicleMarkerProps {
  position: VehiclePosition;
}

export function VehicleMarker({ position }: VehicleMarkerProps) {
  const icon = createVehicleIcon(position.status, position.heading);

  return (
    <Marker position={[position.latitude, position.longitude]} icon={icon}>
      <Popup>
        <div className="min-w-[200px]">
          <p className="font-semibold">{position.vehicleName}</p>
          <p className="text-sm text-muted-foreground">{position.licensePlate}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>Toc do: {position.speed} km/h</p>
            <p>Trang thai: {position.status}</p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
```

### 8.5 Geofence Editor

```tsx
// features/geofences/components/geofence-map-editor.tsx
'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import { MAP_CONFIG } from '@/features/map/constants/map-config';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

// NOTE: @geoman-io/leaflet-geoman-free is imported dynamically
// because it modifies the Leaflet prototype and requires browser environment

interface GeofenceMapEditorProps {
  onShapeCreated: (shape: { type: 'circle' | 'polygon'; coordinates: any; radius?: number }) => void;
  initialShape?: { type: string; coordinates: any; radius?: number };
}

export function GeofenceMapEditor({ onShapeCreated, initialShape }: GeofenceMapEditorProps) {
  return (
    <MapContainer
      center={MAP_CONFIG.defaultCenter}
      zoom={MAP_CONFIG.defaultZoom}
      className="h-[400px] w-full rounded-md border"
    >
      <TileLayer url={MAP_CONFIG.tileUrl} />
      <GeomanControls onShapeCreated={onShapeCreated} />
    </MapContainer>
  );
}

function GeomanControls({ onShapeCreated }: { onShapeCreated: GeofenceMapEditorProps['onShapeCreated'] }) {
  const map = useMap();

  useEffect(() => {
    import('@geoman-io/leaflet-geoman-free').then(() => {
      map.pm.addControls({
        position: 'topleft',
        drawCircle: true,
        drawPolygon: true,
        drawMarker: false,
        drawPolyline: false,
        drawRectangle: false,
        drawCircleMarker: false,
        drawText: false,
        editMode: true,
        dragMode: false,
        cutPolygon: false,
        removalMode: true,
      });

      map.on('pm:create', (e) => {
        const layer = e.layer as any;
        if (e.shape === 'Circle') {
          onShapeCreated({
            type: 'circle',
            coordinates: [layer.getLatLng().lat, layer.getLatLng().lng],
            radius: layer.getRadius(),
          });
        } else if (e.shape === 'Polygon') {
          onShapeCreated({
            type: 'polygon',
            coordinates: layer.getLatLngs()[0].map((ll: any) => [ll.lat, ll.lng]),
          });
        }
      });
    });

    return () => {
      map.pm.removeControls();
    };
  }, [map, onShapeCreated]);

  return null;
}
```

### 8.6 Trip Replay with Polyline

```tsx
// features/trips/components/trip-route-map.tsx
'use client';

import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { MAP_CONFIG } from '@/features/map/constants/map-config';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface TripPoint {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

interface TripRouteMapProps {
  points: TripPoint[];
}

export function TripRouteMap({ points }: TripRouteMapProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const positions = points.map((p) => [p.latitude, p.longitude] as [number, number]);
  const currentPoint = points[currentIndex];

  useEffect(() => {
    if (isPlaying && currentIndex < points.length - 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= points.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed, points.length, currentIndex]);

  return (
    <div className="space-y-4">
      <MapContainer
        center={positions[0] ?? MAP_CONFIG.defaultCenter}
        zoom={14}
        className="h-[400px] w-full rounded-md border"
      >
        <TileLayer url={MAP_CONFIG.tileUrl} />
        <Polyline positions={positions} pathOptions={{ color: '#3b82f6', weight: 3 }} />
        {currentPoint && (
          <Marker position={[currentPoint.latitude, currentPoint.longitude]}>
            <Popup>
              <p>Toc do: {currentPoint.speed} km/h</p>
              <p>{new Date(currentPoint.timestamp).toLocaleString('vi-VN')}</p>
            </Popup>
          </Marker>
        )}
        <FitBounds positions={positions} />
      </MapContainer>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => { setCurrentIndex(0); setIsPlaying(false); }}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Slider
          value={[currentIndex]}
          max={points.length - 1}
          step={1}
          onValueChange={([v]) => setCurrentIndex(v)}
          className="flex-1"
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {currentIndex + 1} / {points.length}
        </span>
      </div>
    </div>
  );
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions);
    }
  }, [map, positions]);
  return null;
}
```

---

## 9. Authentication Architecture

### 9.1 Auth Flow

```
1. User enters credentials on /login
2. POST /api/v1/auth/login -> { user, token }
3. Backend sets httpOnly cookie (session identifier for middleware)
4. Frontend stores token in Zustand memory (NOT localStorage)
5. Axios interceptor attaches Bearer token to all API requests
6. Next.js middleware checks cookie -> allow or redirect to /login
7. On page refresh: cookie is present -> middleware allows -> SessionGuard calls GET /auth/me -> restores auth state
8. On logout: DELETE /api/v1/auth/logout -> clear cookie + clear Zustand store -> redirect to /login
```

### 9.2 Middleware (Route Protection)

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = ['/login'];
const publicPrefixes = ['/api', '/_next', '/favicon.ico'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public prefixes
  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session_token')?.value;
  const isPublicRoute = publicRoutes.includes(pathname);

  // Not authenticated + private route -> redirect to login
  if (!sessionCookie && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated + login page -> redirect to dashboard
  if (sessionCookie && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Root path -> redirect to dashboard or login
  if (pathname === '/') {
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 9.3 Session Guard (Restore Auth on Refresh)

```tsx
// components/auth/session-guard.tsx
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { apiClient } from '@/lib/api/client';
import { usePathname } from 'next/navigation';

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, login, setLoading, logout } = useAuthStore();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login');

  useEffect(() => {
    if (isAuthenticated || isAuthPage) {
      setLoading(false);
      return;
    }

    async function validateSession() {
      try {
        const data: any = await apiClient.get('/auth/me');
        login(data.user, data.token);
      } catch {
        logout();
      }
    }

    validateSession();
  }, [isAuthenticated, isAuthPage, login, logout, setLoading]);

  if (isLoading && !isAuthPage) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
```

### 9.4 Login Form

```tsx
// features/auth/components/login-form.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/auth-store';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { Truck } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Ten dang nhap la bat buoc'),
  password: z.string().min(1, 'Mat khau la bat buoc'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const login = useAuthStore((s) => s.login);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsPending(true);
    try {
      const data: any = await apiClient.post('/auth/login', values);
      login(data.user, data.token);
      router.push(callbackUrl);
    } catch (error: any) {
      toast.error(error?.message ?? 'Dang nhap that bai');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Truck className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">Dang nhap</CardTitle>
        <CardDescription>He thong theo doi phuong tien IoT</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ten dang nhap</FormLabel>
                  <FormControl>
                    <Input placeholder="admin" autoComplete="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mat khau</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Dang xu ly...' : 'Dang nhap'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

---

## 10. Page List (Complete -- ALL Required)

| #   | Route                      | Page                 | Vietnamese Title   | Status Requirement                                                                    |
| --- | -------------------------- | -------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| 1   | `/login`                   | Login                | Dang nhap          | FULL: form + zod validation + error handling + redirect                               |
| 2   | `/dashboard`               | Overview             | Tong quan          | FULL: stat cards (recharts) + vehicle status chart + activity feed + alerts summary   |
| 3   | `/dashboard/devices`       | Device Management    | Thiet bi           | FULL: DataTable + CRUD + detail sheet (telemetry, sessions, commands tabs)            |
| 4   | `/dashboard/vehicles`      | Vehicle Management   | Phuong tien        | FULL: DataTable + CRUD + device assignment + status tracking                          |
| 5   | `/dashboard/customers`     | Customer Management  | Khach hang         | FULL: DataTable + CRUD + fleet overview per customer                                  |
| 6   | `/dashboard/trips`         | Trip Management      | Chuyen di          | FULL: DataTable + filters (date range, vehicle, status)                               |
| 7   | `/dashboard/trips/[id]`    | Trip Detail + Replay | Chi tiet chuyen di | FULL: route map + telemetry chart + playback controls (play/pause/speed)              |
| 8   | `/dashboard/alerts`        | Alert Management     | Canh bao           | FULL: DataTable + detail sheet + acknowledge/resolve actions + alert rules config     |
| 9   | `/dashboard/geofences`     | Geofence Management  | Vung dia ly        | FULL: DataTable + map editor (Leaflet draw circle/polygon) + vehicle binding          |
| 10  | `/dashboard/maintenance`   | Maintenance          | Bao tri            | FULL: DataTable + CRUD + calendar view of scheduled maintenance                       |
| 11  | `/dashboard/map`           | Live Tracking        | Ban do             | FULL: real-time GPS markers + clustering + geofence overlay + vehicle sidebar + flyTo |
| 12  | `/dashboard/firmware`      | Firmware OTA         | Firmware           | FULL: upload + list + activate/deactivate + assign to devices + progress tracking     |
| 13  | `/dashboard/exports`       | Data Export          | Xuat du lieu       | FULL: create export job (date range, type, format) + list + download links            |
| 14  | `/dashboard/notifications` | Notifications        | Thong bao          | FULL: list + mark read/unread + filter (type, read status) + real-time badge          |
| 15  | `/dashboard/settings`      | Settings             | Cai dat            | FULL: tabs (profile form, password form, notification prefs, appearance)              |
| 16  | `/dashboard/admin/users`   | User Management      | Nguoi dung         | FULL: DataTable + CRUD + role assignment (user/admin/root)                            |
| 17  | `/dashboard/admin/system`  | System Admin         | Quan tri he thong  | FULL: system metrics cards + service health + recent logs viewer                      |

> **ZERO PLACEHOLDER PAGES.** Every page above MUST be fully functional. No "Coming Soon", no "TODO", no "future phase".

---

## 11. Dependencies (package.json)

```json
{
  "name": "tracking-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start -p 3002",
    "lint": "next lint",
    "lint:fix": "eslint src --fix",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.3.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",

    "@radix-ui/react-accordion": "^1.2.2",
    "@radix-ui/react-alert-dialog": "^1.1.4",
    "@radix-ui/react-avatar": "^1.1.2",
    "@radix-ui/react-checkbox": "^1.1.3",
    "@radix-ui/react-collapsible": "^1.1.2",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-popover": "^1.1.4",
    "@radix-ui/react-progress": "^1.1.1",
    "@radix-ui/react-scroll-area": "^1.2.2",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-separator": "^1.1.1",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-switch": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-tooltip": "^1.1.6",

    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.2",

    "zustand": "^5.0.2",
    "@tanstack/react-query": "^5.90.5",
    "@tanstack/react-query-devtools": "^5.90.2",
    "@tanstack/react-table": "^8.21.2",

    "react-hook-form": "^7.54.1",
    "@hookform/resolvers": "^5.2.1",
    "zod": "^3.24.0",

    "axios": "^1.7.9",
    "socket.io-client": "^4.8.1",

    "leaflet": "^1.9.4",
    "react-leaflet": "^5.0.0",
    "react-leaflet-cluster": "^4.0.0",
    "@geoman-io/leaflet-geoman-free": "^2.17.0",

    "recharts": "^2.15.1",

    "lucide-react": "^0.476.0",
    "@tabler/icons-react": "^3.31.0",

    "nuqs": "^2.4.1",
    "kbar": "^0.1.0-beta.45",

    "date-fns": "^4.1.0",
    "sonner": "^1.7.1",
    "next-themes": "^0.4.6",
    "nextjs-toploader": "^3.7.15",
    "cmdk": "^1.0.4"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/leaflet": "^1.9.15",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.3.3",
    "@eslint/eslintrc": "^3.2.0",
    "postcss": "^8.4.49"
  }
}
```

---

## 12. Environment Variables

```bash
# Tracking_Frontend/.env.local

# API endpoint
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# WebSocket endpoint (Socket.IO)
NEXT_PUBLIC_WS_URL=http://localhost:3000

# App metadata
NEXT_PUBLIC_APP_NAME="IoT Vehicle Tracking"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# Map tile provider (optional, defaults to OpenStreetMap)
NEXT_PUBLIC_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png

# NOTE: NO MQTT variables in frontend - all real-time data via Socket.IO
# NOTE: NO secrets or tokens - only NEXT_PUBLIC_ prefixed vars allowed
# NOTE: Auth token stored in Zustand memory, NOT in any browser storage
```

---

## 13. Key Architectural Decisions

| #   | Decision               | Choice                                                   | Rationale                                                                                                          |
| --- | ---------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Auth token storage     | Memory (Zustand, NO persist)                             | XSS protection: token never in localStorage/sessionStorage. On refresh, restored via httpOnly cookie session check |
| 2   | Cookie for middleware  | httpOnly cookie set by backend                           | Route protection at edge (Next.js middleware) without exposing token to JS                                         |
| 3   | Real-time transport    | Socket.IO only (no MQTT in browser)                      | Security: MQTT credentials must never appear in client bundle                                                      |
| 4   | Chart library          | recharts (NOT echarts)                                   | Matches IVM26 reference. React-native integration. Smaller bundle than echarts                                     |
| 5   | URL state              | nuqs (NOT useState for filters)                          | Shareable URLs, browser back/forward works, SSR-compatible, survives refresh                                       |
| 6   | HTTP client            | Axios (NOT native fetch)                                 | Interceptors for auth token injection, 401 handling, request/response transforms                                   |
| 7   | Table library          | TanStack Table + shadcn/ui Table                         | Full control: sorting, filtering, pagination, column visibility. No opinionated UI                                 |
| 8   | Form library           | react-hook-form + zod                                    | Uncontrolled (performant), type-safe validation, zodResolver integration                                           |
| 9   | Layout pattern         | IVM26 (SidebarProvider + AppSidebar + SidebarInset)      | Consistent with reference project. Collapsible sidebar with cookie persistence                                     |
| 10  | Map rendering          | react-leaflet with dynamic import                        | SSR-safe. Free tiles (OpenStreetMap). Extensible with clustering and drawing plugins                               |
| 11  | Styling                | Tailwind CSS 4 + shadcn/ui                               | Utility-first, CSS-native config (v4). shadcn provides accessible, unstyled Radix primitives                       |
| 12  | Command palette        | kbar                                                     | Keyboard-first navigation (Cmd+K). IVM26 pattern                                                                   |
| 13  | Icons                  | lucide-react (primary) + @tabler/icons-react (secondary) | Tree-shakeable. Consistent stroke width. Same as IVM26                                                             |
| 14  | Toast notifications    | Sonner                                                   | Stacked toasts, richColors, promise toast support. Same as IVM26                                                   |
| 15  | Theme system           | next-themes                                              | System/light/dark modes. class strategy with disableTransitionOnChange                                             |
| 16  | Component installation | `npx shadcn@latest add <name>`                           | Components are copied into project (not imported from node_modules). Full control                                  |
| 17  | Geofence drawing       | @geoman-io/leaflet-geoman-free                           | Replaces deprecated leaflet-draw. Circle + polygon drawing + editing                                               |
| 18  | Feature architecture   | Feature-Sliced Design (features/)                        | Feature-scoped components, hooks, types. Prevents cross-feature coupling                                           |
| 19  | Barrel exports         | Index files in features/*/components/                    | Clean imports within features. No barrel exports at app/ level (avoid bundle bloat)                                |
| 20  | Map marker clustering  | react-leaflet-cluster                                    | Mandatory when markers > 100. Performance: maintains 60fps on map interactions                                     |
