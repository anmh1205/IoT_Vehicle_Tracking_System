# IoT Vehicle Tracking System — Codebase summary

_This note is derived from `repomix-output.xml` generated at the root of the repository, so it reflects the complete tree and file set captured during the latest compaction run._

## Primary components
- **Tracking_Backend**: TypeScript/Node service arranged in layered DDD modules (`src/api`, `src/domain`, `src/infrastructure`, `src/shared`). Controllers such as `auth.controller.ts` and the Zod validation suites enforce payload consistency, while shared configuration peers in `src/config/env.ts` keep secrets centralized.
- **Tracking_Frontend**: Next.js 16.1 app (React 19.2.3) rooted in the App Router. The dashboards now lean on shared UI atoms in `src/components/common` (e.g., `stat-card.tsx`, `data-table.tsx`, `empty-state.tsx`) while domain-specific pages under `src/app/dashboard/*` and `src/features/*` (notifications, statistics, devices, fuel analytics, maintenance, exports, geofences, trips, system-status) reuse the same layout, spacing, and helpers such as `src/lib/utils/date/format.ts` to normalize numbers and dates.
- **Tracking_Mobile**: Flutter screens, connectivity helpers, and notification flows remain in `lib/`, staying in sync with backend APIs and the MQTT bridge contracts.
- **Tracking_EMQX** / **Tracking_MqttBridge**: EMQX configuration (`docker-compose.yml`, `emqx.conf`) and a Node bridge (`src/handlers`, `src/validators`, `src/config/env.ts`) handle telemetry ingestion and broker authentication.
- **Tracking_Grafana**, **Tracking_VictoriaMetrics**, **Tracking_VictoriaLogs**, **Tracking_PostgreSQL**: Observability and persistence stacks defined via datasource YAMLs and Compose manifests.
- **Tracking_NPM**: Auxiliary compose helpers for testing npm-based services.

## Dashboard UX & data consistency
- Shared components in `Tracking_Frontend/src/components/common` define the new UX baseline: `StatCard` exposes icon, value, trend, and footer slots plus loading skeletons; `DataTable` wraps `@tanstack/react-table` with search, pagination, column visibility, and an `EmptyState` fallback that centralizes copy/CTA; empty-state actions now reuse the `Button` component.
- Feature-specific modules (e.g., `features/dashboard/components/overview-stats.tsx`, `features/devices/components/device-stats-bar.tsx`, `features/fuel-analytics/*`, `features/statistics/*`, `features/notifications/*`, `features/system-status/components/metric-card.tsx`) plug into the shared components and rely on the same formatting utilities to keep unit labels and percentage trends consistent across alerts, devices, trips, vehicles, and drivers pages.
- Tables across alerts, customers, devices, drivers, exports, geofences, maintenance, maps, system-status, trips, vehicles, and violations now reuse the DataTable wrapper and maintain a consistent empty/loading state that describes what data is expected and how to fetch it.

## Supporting flows

- **Firmware + hardware alignment:** The latest firmware revision now targets the SIMCom SIM7600CE-T LTE+GNSS modem (auto-mode `AT+CNMP=2`, APN `internet`, GNSS via `AT+CGNSINF`/`AT+CGNSTST`), simplifying the architecture by removing the legacy A7670C + u-blox NEO-M8N split while keeping the existing UART pin mapping on ESP32-S3.
- Backend and frontend each expose UAT-specific Docker Compose overrides plus Next.js middleware entry points (`Tracking_Frontend/next.config.ts`) that connect user sessions to the auth layer.
- Shared utility modules cover alerts (`components/ui/alert`), API clients, telemetry formatters, and auth state management (`src/lib/stores/auth-store.ts`). Localization changes continue to remain inside `Tracking_Frontend/src/**` and do not require backend or env updates.

## Documentation direction
1. Track new UI/UX plays in `docs/project-overview-pdr.md`, `docs/code-standards.md`, `docs/system-architecture.md`, `docs/project-changelog.md`, and `docs/development-roadmap.md` so future reviewers understand the dashboard baseline.
2. Refresh this summary whenever we reorganize the frontend component tree or add new shared utilities.
