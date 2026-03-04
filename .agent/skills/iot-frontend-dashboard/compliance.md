# Compliance

> This file is the FINAL AUTHORITY on library choices, icon sets, and banned patterns. When in doubt, this file wins.

---

## Approved Libraries (MANDATORY)

```
Library decisions (non-negotiable):
│
├── Component Library:    shadcn/ui ONLY
│   ├── All UI primitives come from shadcn/ui
│   ├── Generated via CLI into components/ui/
│   ├── Customized via Tailwind, not forked
│   └── NO hand-rolled Button, Dialog, Select, etc.
│
├── Icons:                lucide-react ONLY
│   ├── All icons imported from lucide-react
│   ├── Consistent stroke width and sizing
│   └── NO mixing icon sets
│
├── Charts:               recharts ONLY
│   ├── LineChart, BarChart, PieChart, AreaChart
│   ├── Composable React components
│   └── Wrapped in ResponsiveContainer
│
├── Maps:                 Leaflet + react-leaflet ONLY
│   ├── MapContainer, TileLayer, Marker, Popup
│   └── Geofence editing: @geoman-io/leaflet-geoman-free
│
├── Forms:                react-hook-form + zod ONLY
│   ├── useForm with zodResolver
│   ├── shadcn/ui Form components for UI
│   └── Zod schemas for validation
│
├── State (Global):       Zustand ONLY
│   ├── No Redux, MobX, Jotai, Recoil
│   └── Token in memory only (no persist for auth)
│
├── State (Server):       TanStack Query ONLY
│   ├── No SWR, no manual fetch + useState
│   └── Query keys follow convention
│
├── State (URL):          nuqs ONLY
│   ├── URL search params for filters, pagination, tabs
│   └── No manual searchParams parsing
│
├── Toasts:               sonner ONLY
│   ├── toast.success(), toast.error()
│   └── No react-hot-toast, no custom toast system
│
├── Theme:                next-themes ONLY
│   ├── ThemeProvider wraps app
│   ├── useTheme hook for access
│   └── Supports system, light, dark
│
├── Real-time:            Socket.IO client ONLY
│   ├── socket.io-client package
│   └── NO MQTT.js, NO raw WebSocket
│
└── Styling:              Tailwind CSS 4 ONLY
    ├── Utility-first classes
    ├── CSS variables for theme tokens
    └── NO styled-components, NO CSS modules, NO Emotion
```

## Banned Libraries (NEVER USE)

```
Explicitly forbidden:
│
├── Icons:
│   ├── @tabler/icons-react         # Inconsistent with shadcn/ui
│   ├── @heroicons/react             # Different style
│   ├── react-icons                  # Bundle bloat, mixed styles
│   └── @fortawesome/react-fontawesome # Heavy, license issues
│
├── Charts:
│   ├── echarts / echarts-for-react  # 300KB+, imperative API
│   ├── chart.js / react-chartjs-2   # Canvas-based, not composable
│   └── nivo                         # Heavy, complex API
│
├── Maps:
│   ├── react-leaflet-draw           # Unmaintained, React 19 issues
│   ├── @react-google-maps/api       # Requires API key, billing
│   └── react-map-gl (Mapbox)        # Requires API key, billing
│
├── State:
│   ├── redux / @reduxjs/toolkit     # Overkill, boilerplate
│   ├── mobx                         # Different paradigm
│   ├── jotai / recoil               # Zustand is sufficient
│   └── zustand/persist (for auth)   # Token must NEVER be persisted
│
├── Forms:
│   ├── formik                       # Older, heavier than react-hook-form
│   └── Manual useState per field    # No validation, no dirty tracking
│
├── UI:
│   ├── @mui/material                # Opinionated styling, bundle bloat
│   ├── @chakra-ui/react             # Different design system
│   ├── antd                         # Heavy, Chinese-first
│   └── @mantine/core                # Different ecosystem
│
└── Styling:
    ├── styled-components            # Runtime CSS, not needed with Tailwind
    ├── @emotion/styled              # Same issue
    └── css-modules                  # Not needed with Tailwind
```

## Content Rules (ZERO TOLERANCE)

```
Placeholder text rules:
│
├── ZERO placeholder text in ANY page or component
│   ├── No "Coming Soon"
│   ├── No "TODO"
│   ├── No "Lorem ipsum"
│   ├── No "Work in Progress"
│   ├── No "This feature is not yet implemented"
│   └── No empty pages with just a title
│
├── Every page must be:
│   ├── 100% feature complete with real API integration
│   ├── Connected to actual backend endpoints
│   ├── Showing real data (or proper empty states if no data)
│   ├── Handling loading states (skeletons)
│   └── Handling error states (error boundaries or messages)
│
└── If a feature is not ready:
    ├── Do NOT create the page at all
    ├── Do NOT add it to the sidebar navigation
    └── Remove it from nav-config.ts until implemented
```

## Compliance Verification

```
Before marking ANY frontend task as complete:
│
├── Library check:
│   ├── grep for banned library imports
│   ├── Check package.json for unauthorized dependencies
│   └── Verify all icons are from lucide-react
│
├── Content check:
│   ├── grep for "Coming Soon", "TODO", "Lorem", "placeholder"
│   ├── Verify every page has real API calls
│   └── Verify loading and error states exist
│
├── Pattern check:
│   ├── Token not in localStorage (grep for localStorage + token)
│   ├── No MQTT imports in frontend
│   ├── No manual fetch without TanStack Query
│   └── Forms use react-hook-form + zod
│
└── Structure check:
    ├── Feature components in features/{name}/components/
    ├── Feature hooks in features/{name}/hooks/
    ├── Shared components in components/shared/
    └── shadcn/ui components in components/ui/
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Mixing icon libraries | Inconsistent visual style | lucide-react only, remove others |
| Adding ECharts "just for one chart" | 300KB added to bundle | recharts can do the same chart |
| Using react-leaflet-draw | Breaks on React 19, unmaintained | @geoman-io/leaflet-geoman-free |
| "Coming Soon" placeholder page | Incomplete product, poor UX | Remove page until feature is ready |
| Token in localStorage | XSS vulnerability | Zustand memory-only store |
| Installing @mui just for one component | Bundle bloat, style conflict | Build with shadcn/ui + Tailwind |
| Manual fetch + useState for API data | No cache, no dedup, race conditions | TanStack Query |
