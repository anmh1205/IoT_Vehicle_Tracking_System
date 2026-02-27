# IoT Vehicle Tracking System — Codebase summary

_This note is derived from `repomix-output.xml` generated at the root of the repository, so it reflects the full tree and file set as of the latest scan._

## Primary components
- **Tracking_Backend**: TypeScript/Node service following a layered DDD layout (see `src/api`, `src/domain`, `src/infrastructure`, `src/shared`). It exposes controllers such as `auth.controller.ts`, validates payloads with Zod schemas and centralizes session/env config in `src/config/env.ts`.
- **Tracking_Frontend**: Next.js 16.1 app powered by React 19.2.3. UI text, auth flows, dashboard widgets, and map helpers live under `src/app`, `src/features`, and `src/lib`. Localization-related work thus only touches this directory tree and the text-rich components within it.
- **Tracking_Mobile**: Flutter code in `lib/` (config, notification, connectivity helpers, screens) that aligns mobile UX with the backend APIs and MQTT bridge.
- **Tracking_EMQX** / **Tracking_MqttBridge**: EMQX broker configuration (`docker-compose.yml`, `emqx.conf`) plus a Node MQTT bridge (`src/handlers`, `src/validators`, `src/config/env.ts`) responsible for relaying telemetry to the backend.
- **Tracking_Grafana**, **Tracking_VictoriaMetrics**, **Tracking_VictoriaLogs**, **Tracking_PostgreSQL**: Infrastructure manifests (datasource YAML files and Docker Compose stacks) that document observability and persistence layers.
- **Tracking_NPM**: Helper compose artifacts for auxiliary services (primarily npm proxying/testing).

## Supporting flows
- The backend ships with Docker Compose overrides (e.g., `Tracking_Backend/docker-compose.uat.yml`), and the frontend also exposes a UAT-oriented compose file plus a `next.config.ts` entry point connecting Next middleware to auth state.
- Shared utilities cover alerts (`components/ui/alert`), API client wrappers, and authentication state management (`src/lib/stores/auth-store.ts`). The localization change alters the text inside these UI components and `src/config/nav-config.ts` but does not modify API contracts or deployment scripts.

## Localization context
- All localization edits reside inside `Tracking_Frontend/src/**` (dashboard pages, auth/login form, nav config). These are purely textual/UX refinements; no new environment variables, REST endpoints, or architectural pieces were added.
- Because the documented architecture, onboarding, and deployment guides live in infrastructure-level paths (`Tracking_Backend`, `Tracking_EMQX`, etc.), the localization effort does not force updates to the broader documentation set beyond the new summary here.

## Directions for future documentation work
1. Monitor whether localization opens new UI features or triggers new API responses, in which case the API/architecture docs (e.g., `docs/system-architecture.md` when created) should mention those flows.
2. Keep the codebase summary updated whenever major modules are restructured.
