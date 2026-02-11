# Error Handling

> Errors are data, not surprises. Design for them like you design for success.

## Centralized Error Flow

```
Any layer throws custom error
│
├── Service throws NotFoundError("Device", deviceId)
├── Validator throws ValidationError(zodErrors)
├── Middleware throws AuthError("Session expired")
│
└── Error middleware catches ALL (src/middleware/error.middleware.ts)
    ├── Identifies error type
    ├── Maps to HTTP status code
    ├── Formats response envelope
    ├── Attaches request-ID
    ├── Logs with context (no sensitive data)
    └── Sends response to client
```

## Custom Error Classes

```
Error hierarchy:
│
├── AppError (base class)
│   ├── statusCode: number
│   ├── code: string (machine-readable)
│   ├── message: string (human-readable)
│   └── details?: any (field-level or extra context)
│
├── ValidationError extends AppError
│   ├── statusCode: 400 or 422
│   └── details: field-level errors from Zod
│
├── NotFoundError extends AppError
│   ├── statusCode: 404
│   └── code: "{RESOURCE}_NOT_FOUND"
│
├── AuthError extends AppError
│   ├── statusCode: 401
│   └── code: "UNAUTHORIZED" | "SESSION_EXPIRED"
│
├── ForbiddenError extends AppError
│   ├── statusCode: 403
│   └── code: "FORBIDDEN" | "INSUFFICIENT_ROLE"
│
└── ConflictError extends AppError
    ├── statusCode: 409
    └── code: "DUPLICATE" | "STATE_CONFLICT"
```

## Error Response Format

```
Client receives:
{
  "success": false,
  "error": {
    "code": "DEVICE_NOT_FOUND",        // Machine-readable
    "message": "Device not found",      // Human-readable
    "details": [...],                   // Optional field errors
    "requestId": "req-a1b2c3d4"        // For support/debugging
  }
}

Server logs:
{
  "level": "error",
  "requestId": "req-a1b2c3d4",
  "userId": "usr-123",
  "method": "GET",
  "path": "/api/v1/devices/999",
  "statusCode": 404,
  "code": "DEVICE_NOT_FOUND",
  "stack": "...",                       // Full stack trace (logs only)
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## Request-ID Correlation

```
Request lifecycle:
│
├── Middleware generates unique ID (uuid or nanoid)
├── Attaches to req.requestId
├── Passes through all layers
│   ├── Service logs include requestId
│   ├── Repository logs include requestId
│   └── External calls include requestId in headers
├── Error responses include requestId
└── Success responses include requestId in headers (X-Request-ID)
```

## Zod Validation Error Transformation

```
Zod error output (raw):
├── Complex nested structure
├── Not user-friendly
└── Inconsistent format

Transform to:
[
  { "field": "email", "message": "Invalid email format" },
  { "field": "name", "message": "Required" }
]

Where: In validation middleware, before controller
```

## Throw vs Return

```
When to THROW:
├── Unexpected condition (not found, unauthorized)
├── Business rule violation
├── Infrastructure failure (database down)
└── Input that passed validation but fails business logic

When to RETURN error result:
├── Expected alternative outcomes (user may or may not exist)
├── Partial success (batch operation: 8/10 succeeded)
├── Validation that needs to collect multiple errors
└── When the caller needs to decide what to do
```

## Logging Principles

| Log Level | When | Example |
|-----------|------|---------|
| **error** | Unexpected failure, needs attention | Database connection failed |
| **warn** | Recoverable issue, might need attention | Rate limit approaching |
| **info** | Normal operations, audit trail | User logged in, device registered |
| **debug** | Development, troubleshooting | Query parameters, service input |

```
Logging rules:
├── NEVER log passwords, tokens, or secrets
├── NEVER log full request bodies (may contain PII)
├── ALWAYS include requestId
├── ALWAYS use structured JSON format
├── Log at the BOUNDARY (entry/exit), not every line
└── Use appropriate level (not everything is "error")
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| `try/catch` in every controller | Duplicated error handling | Centralized error middleware |
| `res.status(500).json({...})` in service | HTTP leaked into domain | Throw AppError, middleware handles |
| `console.log(error)` | Unstructured, missing context | Structured logger with requestId |
| Stack trace in API response | Security risk | Log stack server-side only |
| Swallowing errors with empty `catch {}` | Silent failures | Log or rethrow, never swallow |
| Generic "Something went wrong" for all errors | Unhelpful for debugging | Specific error codes per failure type |
