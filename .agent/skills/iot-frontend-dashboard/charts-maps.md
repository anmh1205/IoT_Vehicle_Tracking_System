# Charts and Maps

> Charts reveal trends. Maps reveal location. Together they tell the story of a fleet in motion.

---

## Chart Library Decision

```
Chart library (CHOSEN: recharts):
│
├── recharts (CHOSEN)
│   ├── React-native components (composable)
│   ├── ~45KB gzipped (reasonable)
│   ├── Declarative API (<LineChart>, <Bar>, <Tooltip>)
│   ├── Responsive via ResponsiveContainer
│   ├── Good TypeScript support
│   └── Active maintenance
│
├── ECharts (REJECTED)
│   ├── ~300KB+ gzipped (massive bundle)
│   ├── Imperative API (not React-idiomatic)
│   ├── Options object is deeply nested and complex
│   └── Overkill for dashboard charts
│
├── Chart.js (REJECTED)
│   ├── Canvas-based (not composable with React)
│   ├── react-chartjs-2 wrapper is thin
│   └── Less flexible for custom layouts
│
└── Tremor (ALTERNATIVE if using)
    ├── Built on recharts
    ├── Pre-styled dashboard components
    └── Less control but faster to build
```

## Which Chart Type for Which Data

```
Data type --> Chart selection:
│
├── Time-series (telemetry over time)?
│   ├── Single metric:  LineChart (speed, fuel level, temperature)
│   ├── Range/band:     AreaChart (min/max range over time)
│   └── Multiple metrics: LineChart with multiple Line children
│
├── Comparison across categories?
│   ├── Few categories (< 10):  BarChart (vertical)
│   ├── Long labels:             BarChart (horizontal)
│   └── Grouped comparison:      BarChart with grouped bars
│
├── Part of a whole (distribution)?
│   ├── Few segments (< 6):     PieChart or RadialBarChart
│   ├── Many segments:          BarChart (pie becomes unreadable)
│   └── With center stat:       PieChart (donut variant)
│
├── Cumulative trend?
│   └── AreaChart (filled area shows accumulation)
│
├── IoT-specific charts:
│   ├── Speed over time:         LineChart
│   ├── Fuel consumption:        AreaChart
│   ├── Device status distribution: PieChart (online/offline/idle)
│   ├── Alerts by type:          BarChart
│   ├── Daily distance:          BarChart
│   └── Fleet utilization:       BarChart (horizontal, per vehicle)
│
└── Dashboard summary cards:
    ├── Single big number:       Stat card (no chart library needed)
    ├── Number with sparkline:   Tiny LineChart (no axes, no labels)
    └── Number with trend arrow: Stat card with percentage change
```

## Chart Best Practices

```
Chart implementation principles:
│
├── Always wrap in ResponsiveContainer
│   ├── width="100%" height={300}
│   └── Chart fills parent container
│
├── Tooltips are mandatory
│   ├── Show formatted value on hover
│   ├── Include unit (km/h, liters, celsius)
│   └── Custom tooltip component for complex data
│
├── Axes formatting
│   ├── X-axis: readable time labels (not raw timestamps)
│   ├── Y-axis: abbreviated numbers (1.5K not 1500)
│   └── Grid lines: subtle, not distracting
│
├── Colors
│   ├── Use CSS variables from theme (--chart-1 through --chart-5)
│   ├── Accessible contrast between series
│   └── Consistent color meaning across dashboard
│
├── Loading state
│   ├── Skeleton with chart-shaped placeholder
│   └── Same dimensions as loaded chart (no layout shift)
│
└── Empty state
    ├── "No data for selected period"
    └── Suggest adjusting date range
```

## Map Library Decision

```
Map library:
│
├── Leaflet + react-leaflet (CHOSEN)
│   ├── Open-source, no API key for base tiles
│   ├── react-leaflet provides React components
│   ├── Large plugin ecosystem
│   └── Well-suited for vehicle tracking maps
│
├── Geofence editing:
│   ├── @geoman-io/leaflet-geoman-free (CHOSEN)
│   │   ├── Draw polygons, circles, rectangles
│   │   ├── Edit existing shapes
│   │   ├── Actively maintained
│   │   └── Better API than alternatives
│   │
│   └── react-leaflet-draw (REJECTED)
│       ├── Unmaintained (last update years ago)
│       ├── React 18/19 compatibility issues
│       └── Limited shape editing capabilities
│
└── Google Maps / Mapbox (NOT CHOSEN)
    ├── Requires API key and billing
    ├── Usage limits
    └── Overkill for fleet tracking use case
```

## Map Features

```
Map capabilities for IoT vehicle tracking:
│
├── Device markers
│   ├── Custom icon per device type
│   ├── Color indicates status (green=online, red=offline, yellow=idle)
│   ├── Tooltip on hover: device name, speed, last update
│   ├── Popup on click: detailed device info
│   └── Clustered markers when zoomed out (Leaflet.markercluster)
│
├── Live tracking
│   ├── Marker position updates from Zustand store
│   ├── Smooth animation between positions
│   ├── Trail line showing recent path
│   └── Auto-center on selected vehicle (optional)
│
├── Geofence visualization
│   ├── Polygon, circle, rectangle shapes
│   ├── Semi-transparent fill with colored border
│   ├── Click geofence to see details
│   └── Draw/edit mode via geoman
│
├── Trip replay
│   ├── Polyline showing trip route
│   ├── Start/end markers
│   ├── Speed color gradient on route line
│   └── Playback controls (play, pause, speed)
│
├── Heatmap
│   ├── Density of stops or alerts
│   ├── Leaflet.heat plugin
│   └── Toggle on/off via layer control
│
└── Tile layers
    ├── OpenStreetMap (default, free)
    ├── Satellite view (if available)
    └── Layer switcher control
```

## Chart vs Map vs Table Decision

```
Which visualization for this data?
│
├── Does the data have geographic coordinates?
│   ├── YES --> Map (primary) + Table (secondary list)
│   └── NO  --> Chart or Table
│
├── Is it time-series data (values over time)?
│   ├── YES --> Chart (LineChart or AreaChart)
│   └── NO  --> Continue below
│
├── Is it a list of entities with multiple attributes?
│   ├── YES --> Table (sortable, filterable)
│   └── NO  --> Continue below
│
├── Is it a single summary metric?
│   ├── YES --> Stat card (big number + trend)
│   └── NO  --> Continue below
│
├── Is it a distribution or comparison?
│   ├── YES --> Chart (PieChart or BarChart)
│   └── NO  --> Table as fallback
│
└── IoT dashboard typical layout:
    ├── Overview page:  Stat cards + small charts + map
    ├── Device list:    Table + map (split or toggle)
    ├── Device detail:  Map (single device) + charts (telemetry)
    ├── Alerts:         Table (primary) + map (location context)
    ├── Trips:          Map (route) + chart (speed/fuel over time)
    └── Analytics:      Charts (primary) + tables (drill-down)
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| ECharts in IoT dashboard | 300KB+ bundle, imperative API | recharts (composable, lighter) |
| react-leaflet-draw for geofences | Unmaintained, React 19 issues | @geoman-io/leaflet-geoman-free |
| Charts without ResponsiveContainer | Fixed size, breaks on resize | Always wrap in ResponsiveContainer |
| Raw timestamps on chart axes | Unreadable (1706745600000) | Format to human-readable dates |
| Map without marker clustering | Thousands of markers = frozen browser | Leaflet.markercluster plugin |
| Chart without loading skeleton | Layout shift when data arrives | Skeleton matching chart dimensions |
| Map initialized on every render | Memory leak, performance hit | Initialize once, update markers via refs |
