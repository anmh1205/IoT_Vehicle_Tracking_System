# IVTS fleet dashboard

This is the **Next.js web frontend** for the IoT Vehicle Tracking System. It is not the unmodified `create-next-app` starter. The backend API, MQTT Bridge, EMQX and PostgreSQL run as separate services; see the [monorepo README](../../README.md) and [architecture](../../docs/system-architecture.md) for the complete system.

## Local development

Prerequisites: Node.js 20 (or a compatible newer version), npm, and an accessible IVTS Backend. The development server uses **port 4001**.

```bash
cd iot-vehicle-tracking-system-cloud/Tracking_Frontend
npm ci
# Configure this component's .env / .env.example for the API origin.
npm run dev
```

Open `http://localhost:4001`. API base URL handling lives in `src/lib/api/base-url.ts` and `src/lib/api/client.ts`. Do not hardcode API hostnames or credentials in UI components.

## Code map

- `src/app/`: application routes and layouts, including the fleet dashboard.
- `src/features/`: feature-specific screens, hooks and presentation logic.
- `src/lib/api/`: API clients, response envelopes, error handling and auth refresh.
- `src/lib/stores/`: client state.
- `src/components/`: reusable interface components.
- `tests/`: Node/TypeScript unit and contract tests.

Keep data permissions on the server; hiding UI controls is not authorization. Statistics must distinguish genuine zero counts, no observations and API errors. Do not display fabricated historical metrics when a query fails. The Flutter WebView shell has a separate native auth/notification bridge that requires explicit origin and token-lifecycle handling.

## Checks before opening a PR

```bash
npm run lint
npm run typecheck
npm test
npm run build
# Or: npm run verify
```

UAT image building and deployment are defined in the repository-root workflow `.github/workflows/frontend-uat.yml`. The frontend Docker and Compose files live in this directory; the primary runtime services are independently deployed. Follow the monorepo's environment and CI documentation rather than using generic Vercel starter instructions.
