# Domain Structure

> Every feature has a home. If you cannot name the domain, you have not understood the requirement.

## Top-Level Layout

```
src/
├── api/                    # HTTP boundary (inbound)
│   ├── controllers/        # Parse request, call service, format response
│   ├── routes/             # Express router definitions
│   ├── validators/         # Zod schemas for request validation
│   └── openapi/            # Swagger/OpenAPI spec files
│
├── domain/                 # Business logic (core)
│   ├── auth/               # Authentication, sessions, tokens
│   ├── device/             # Device CRUD, registration
│   ├── iot/                # Telemetry ingestion, processing
│   ├── firmware/           # OTA updates, deployment
│   ├── dashboard/          # Aggregated stats, summaries
│   ├── alert/              # Alert rules, triggers
│   ├── vehicle/            # Vehicle management
│   ├── customer/           # Multi-tenant customer data
│   ├── geofence/           # Geofence CRUD, violation detection
│   ├── trip/               # Trip recording, analysis
│   ├── export/             # Data export jobs
│   └── {new-feature}/      # Add new domains here
│
├── infrastructure/         # External integrations (outbound)
│   ├── database/           # PostgreSQL pool, connection
│   ├── realtime/           # Socket.IO server setup
│   ├── mqtt/               # MQTT client (if co-located)
│   └── victoria/           # VictoriaMetrics/Logs clients
│
├── middleware/             # Express middleware (auth, error, cors)
├── shared/                 # Cross-cutting utilities (logger, helpers)
├── config/                 # Environment, constants
├── types/                  # Global TypeScript types
└── index.ts                # App bootstrap
```

## Domain Folder Internals

```
domain/{feature}/
├── services/              # Business logic (1+ service files)
│   ├── {feature}-crud.service.ts
│   └── {feature}-{action}.service.ts
├── repositories/          # Database queries only
│   └── {feature}.repository.ts
└── types/                 # Domain-specific types and interfaces
    └── {feature}.types.ts
```

## Where Does a New Feature Belong?

```
New requirement arrives
│
├── Does it map to an existing domain concept?
│   ├── YES → Add to that domain (new service or extend existing)
│   └── NO  → Continue below
│
├── Does it have its own data model (database table)?
│   ├── YES → Create new domain folder
│   └── NO  → It is probably a service within an existing domain
│
├── Does it cross multiple domains?
│   ├── YES → Create orchestration service in the primary domain
│   │         Import types (not services) from other domains
│   └── NO  → Keep it in one domain
│
└── Is it infrastructure (external API, message queue)?
    ├── YES → Goes in infrastructure/, consumed by domain services
    └── NO  → It belongs in domain/
```

## When to Create a New Domain

| Signal | Decision |
|--------|----------|
| New database table with its own lifecycle | New domain |
| New REST resource with CRUD operations | New domain |
| Logic that only extends an existing entity | Extend existing domain |
| Shared utility (formatting, calculation) | `shared/` folder |
| External service integration | `infrastructure/` folder |

## Path Alias

```
@/* maps to src/*

Import examples:
├── @/domain/device/services/device-crud.service
├── @/api/validators/device.validator
├── @/infrastructure/database/pool
├── @/middleware/auth.middleware
└── @/config/env
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Business logic in controllers | Untestable, duplicated | Move to service layer |
| God service (500+ lines) | Too many responsibilities | Split by action (crud, deploy, process) |
| Domain A imports Domain B's service | Tight coupling | Import types only, use events or orchestrator |
| Flat src/ with no domain folders | No bounded contexts | Group by domain, not by file type |
| Validators inside controllers | Mixed concerns | Separate validators/ folder |
