# Layered Pattern

> Each layer has one job. Violation of layer boundaries is the root of most backend bugs.

## Request Flow

```
HTTP Request
│
├── Route (src/api/routes/)
│   ├── Defines URL pattern and HTTP method
│   ├── Attaches middleware (auth, validation)
│   └── Maps to controller method
│
├── Controller (src/api/controllers/)
│   ├── Extracts params, body, query from request
│   ├── Calls service method(s)
│   ├── Formats HTTP response (status code, envelope)
│   └── NOTHING ELSE - no business logic here
│
├── Service (src/domain/{feature}/services/)
│   ├── Contains ALL business logic
│   ├── Validates business rules (not HTTP input)
│   ├── Orchestrates multiple repository calls
│   ├── Throws custom errors for failure cases
│   └── Returns domain objects (not HTTP responses)
│
├── Repository (src/domain/{feature}/repositories/)
│   ├── Executes SQL queries (parameterized)
│   ├── Maps database rows to domain types
│   ├── Handles query building (filters, pagination)
│   └── NOTHING ELSE - no business rules here
│
└── Database (PostgreSQL / VictoriaMetrics)
```

## Layer Responsibilities

| Layer | Knows About | Does NOT Know About |
|-------|-------------|---------------------|
| **Route** | URL, HTTP method, middleware | Business logic, database |
| **Controller** | Request/Response, service interface | SQL, business rules |
| **Service** | Business rules, repository interface | HTTP, request objects |
| **Repository** | Database queries, table schema | HTTP, business rules |

## Dependency Direction

```
ALLOWED:
Controller → Service → Repository → Database
     │            │           │
     └── Types ←──┴── Types ←─┘

FORBIDDEN:
Repository → Service (reverse dependency)
Service → Controller (reverse dependency)
Controller → Repository (skipping service layer)
Domain A Service → Domain B Service (tight coupling)
```

## When to Skip Layers

```
Should I skip the service layer?
│
├── Is it truly just "pass data to database"?
│   ├── YES, and it will NEVER grow → OK to call repository from controller
│   └── YES, but it MIGHT grow → Add thin service now (save refactoring later)
│
├── Does it have any validation or transformation?
│   └── YES → Service layer required
│
└── Does it orchestrate multiple repositories?
    └── YES → Service layer required

Rule of thumb: When in doubt, add the service layer.
IoT projects always grow in complexity.
```

## Service Patterns

| Pattern | When | Example |
|---------|------|---------|
| **CRUD service** | Standard entity operations | `device-crud.service.ts` |
| **Action service** | Specific workflow or process | `firmware-deploy.service.ts` |
| **Query service** | Complex read operations | `dashboard-stats.service.ts` |
| **Orchestration service** | Cross-domain coordination | `export-job.service.ts` |

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Repository with `if` business logic | Wrong layer for decisions | Move logic to service |
| Service that imports `req`/`res` | HTTP leaked into domain | Accept plain objects, return plain objects |
| Controller with SQL queries | Skipped both layers | Move to repository, call through service |
| Circular dependency between services | Architecture smell | Extract shared logic or use events |
| Service returning HTTP status codes | Layer leak | Throw typed errors, let controller map to status |
