# API Design

> URLs name resources. HTTP methods name actions. Together they form a contract.

## URL Convention

```
Base pattern: /api/v1/{resources}
│
├── Plural nouns: /api/v1/devices (not /device)
├── Lowercase: /api/v1/firmware-updates (not /firmwareUpdates)
├── Hyphens for multi-word: /api/v1/device-sessions (not /device_sessions)
├── Nesting for ownership: /api/v1/vehicles/{id}/trips
└── Max 2 levels deep: /api/v1/customers/{id}/vehicles (stop here)
```

## URL Examples (IoT Context)

| Resource | GET (list) | GET (one) | POST | PATCH | DELETE |
|----------|-----------|-----------|------|-------|--------|
| Devices | `/devices` | `/devices/:id` | `/devices` | `/devices/:id` | `/devices/:id` |
| Firmware | `/firmware-updates` | `/firmware-updates/:id` | `/firmware-updates` | - | - |
| Alerts | `/alerts` | `/alerts/:id` | `/alerts` | `/alerts/:id/acknowledge` | `/alerts/:id` |
| Trips | `/vehicles/:id/trips` | `/trips/:id` | - | - | - |
| Telemetry | `/devices/:id/telemetry` | - | - | - | - |

## Path Params vs Query Params

```
When to use path params (/resources/:id):
├── Identifies a specific resource
├── Required for the request to make sense
└── Part of the resource hierarchy

When to use query params (?key=value):
├── Filtering a collection (?status=active)
├── Pagination (?page=1&limit=20 or ?cursor=abc)
├── Sorting (?sort=created_at&order=desc)
├── Optional parameters (?include=telemetry)
└── Search (?q=search+term)
```

## Request Validation

```
Validation flow:
│
├── Route defines which validator to use
├── Validator (src/api/validators/) contains Zod schemas
│   ├── params schema (path parameters)
│   ├── query schema (query string)
│   └── body schema (request body)
├── Middleware runs Zod parse before controller
└── Controller receives validated, typed data

File naming: {feature}.validator.ts
Location: src/api/validators/
```

## Response Envelope

```
Success response:
{
  "success": true,
  "data": { ... },          // Single object or array
  "meta": {                  // Optional, for lists
    "total": 100,
    "page": 1,
    "limit": 20
  }
}

Error response:
{
  "success": false,
  "error": {
    "code": "DEVICE_NOT_FOUND",
    "message": "Device with ID 123 not found",
    "details": [],           // Optional, field-level errors
    "requestId": "req-abc"
  }
}
```

## Pagination Strategy

| Type | When | Implementation |
|------|------|----------------|
| **Offset** | Small datasets, admin panels | `?page=1&limit=20` |
| **Cursor** | Large datasets, feeds, telemetry | `?cursor=abc&limit=50` |

```
Decision:
├── Dataset < 10K rows and rarely changes → Offset
├── Dataset grows continuously (telemetry, logs) → Cursor
├── User needs "jump to page 5" → Offset
└── Real-time feed, infinite scroll → Cursor
```

## Filtering Convention

```
Query params for filtering:
├── Exact match: ?status=active
├── Multiple values: ?status=active,inactive
├── Range: ?created_from=2025-01-01&created_to=2025-12-31
├── Foreign key: ?customer_id=123
└── Search: ?q=keyword
```

## OpenAPI Documentation

```
Documentation strategy:
├── Zod schemas are the source of truth
├── Generate OpenAPI spec from Zod (zod-to-openapi)
├── Serve at /api-docs (Swagger UI)
├── Spec files in src/api/openapi/
└── Keep spec in sync with validators (automated, not manual)
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| `/api/v1/getDevices` | Verb in URL | `/api/v1/devices` (GET) |
| `/api/v1/device` | Singular resource | `/api/v1/devices` (plural) |
| `/api/v1/Device` | Uppercase | `/api/v1/devices` (lowercase) |
| Different response shapes per endpoint | Client confusion | Use envelope consistently |
| Validation in controller body | Mixed concerns | Zod schema in validators/ |
| Returning raw database rows | Leaking internals | Map to response type in controller |
