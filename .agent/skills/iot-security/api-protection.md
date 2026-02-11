# API Protection

> Every HTTP endpoint is a door. Security headers, rate limiting, input validation, and CORS are the locks. Leave one open and attackers walk in.

---

## 1. Middleware Order

The order of middleware matters. Security controls must execute before business logic.

```
Request lifecycle (correct order):
|
+-- 1. Rate limiter (reject excessive requests early)
+-- 2. CORS (reject disallowed origins before processing)
+-- 3. Helmet (set security headers on every response)
+-- 4. Body parser (parse JSON/form body)
+-- 5. Request-ID (generate correlation ID)
+-- 6. Route matching
+-- 7. Input validation (Zod schema)
+-- 8. Authentication (requireAuth middleware)
+-- 9. Authorization (requireRole check)
+-- 10. Handler (business logic)
+-- 11. Error handler (catch-all, sanitize errors)
```

### Why This Order?

| Position | Middleware | Reasoning |
|----------|-----------|-----------|
| First | Rate limiter | Stop floods before any processing |
| Before parse | CORS | Reject bad origins before reading body |
| Before routes | Helmet | Security headers on every response, including errors |
| Before auth | Validation | Reject malformed input before database lookups |
| Before handler | Auth + authz | Verify identity and permissions before business logic |
| Last | Error handler | Never leak internal errors to client |

---

## 2. Security Headers (Helmet.js)

```
What Helmet provides:
|
+-- Content-Security-Policy (CSP)
|   +-- Controls which sources can load scripts, styles, images
|   +-- Prevents XSS by blocking inline scripts (unless nonce)
|   +-- Configuration: project-specific (allow your CDN, block rest)
|
+-- X-Content-Type-Options: nosniff
|   +-- Prevents MIME type sniffing
|   +-- Browser respects declared Content-Type
|
+-- X-Frame-Options: DENY (or SAMEORIGIN)
|   +-- Prevents clickjacking (embedding in iframe)
|
+-- Strict-Transport-Security (HSTS)
|   +-- Forces HTTPS for future requests
|   +-- Set only in production (breaks localhost HTTP)
|
+-- X-XSS-Protection: 0
|   +-- Disables legacy XSS filter (CSP is the modern replacement)
|
+-- Referrer-Policy: no-referrer
|   +-- Prevents leaking URL info to third parties
```

---

## 3. CORS Configuration

```
CORS decision:
|
+-- Development
|   +-- CORS_ORIGIN=http://localhost:3002
|   +-- Single specific origin
|   +-- Credentials: true (for cookies/auth headers)
|
+-- Production
|   +-- CORS_ORIGIN=https://your-domain.com
|   +-- Single specific origin (or comma-separated list)
|   +-- Credentials: true
|   +-- NEVER use: origin: '*' (wildcard)
|
+-- Why not wildcard?
    +-- Wildcard (*) cannot be used with credentials: true
    +-- Wildcard allows any website to make authenticated requests
    +-- Wildcard disables browser's same-origin protection
    +-- Even without credentials, it leaks API structure to attackers
```

### CORS Headers Summary

| Header | Development | Production |
|--------|-------------|------------|
| Access-Control-Allow-Origin | http://localhost:3002 | https://your-domain.com |
| Access-Control-Allow-Methods | GET, POST, PUT, PATCH, DELETE | Same (restrict if possible) |
| Access-Control-Allow-Headers | Content-Type, Authorization | Same |
| Access-Control-Allow-Credentials | true | true |
| Access-Control-Max-Age | 86400 | 86400 |

---

## 4. Rate Limiting

```
Rate limiting strategy:
|
+-- Global rate limit
|   +-- 100 requests per minute per IP
|   +-- Applies to all endpoints
|   +-- Protects against general abuse
|
+-- Auth endpoint rate limit (stricter)
|   +-- 5 attempts per 15 minutes per IP
|   +-- Applies to: POST /auth/login, POST /auth/register
|   +-- Protects against: brute force attacks
|   +-- Return: 429 Too Many Requests
|
+-- API endpoint rate limit (per user)
|   +-- 60 requests per minute per authenticated user
|   +-- Applies to: all authenticated endpoints
|   +-- Protects against: API abuse by legitimate users
|
+-- Decision: which algorithm?
    |
    +-- Fixed window
    |   +-- Simple, reset counter every N seconds
    |   +-- Problem: burst at window boundary (2x burst)
    |   +-- Use for: basic protection
    |
    +-- Sliding window
    |   +-- Weighted counter across two windows
    |   +-- Smoother rate enforcement
    |   +-- Use for: auth endpoints
    |
    +-- Token bucket
        +-- Tokens replenish at fixed rate
        +-- Allows controlled bursts
        +-- Use for: API endpoints with variable load
```

### Rate Limit Response

| Header | Purpose |
|--------|---------|
| X-RateLimit-Limit | Maximum requests allowed |
| X-RateLimit-Remaining | Requests remaining in window |
| X-RateLimit-Reset | Timestamp when window resets |
| Retry-After | Seconds to wait (on 429 response) |

---

## 5. Input Validation (Zod)

```
Validation strategy:
|
+-- Every endpoint validates:
|   +-- Request body (POST, PUT, PATCH)
|   +-- URL parameters (GET /devices/:id)
|   +-- Query parameters (GET /devices?page=1&limit=10)
|
+-- Validation happens BEFORE auth:
|   +-- Reject malformed requests without wasting auth lookups
|   +-- Parse and transform input to expected types
|   +-- Strip unknown fields (prevent mass assignment)
|
+-- Zod principles:
    +-- Define schema per endpoint
    +-- Use .strict() to reject unknown keys
    +-- Use .transform() for type coercion (string "10" to number 10)
    +-- Return descriptive validation errors (field name + issue)
    +-- Never pass raw req.body to business logic
```

### Validation Error Response

```
Standard validation error format:
|
+-- Status: 400 Bad Request
+-- Body:
    +-- success: false
    +-- error:
        +-- code: "VALIDATION_ERROR"
        +-- message: "Request validation failed"
        +-- details: array of field-level errors
            +-- field: "email"
            +-- message: "Invalid email format"
```

---

## 6. SQL Injection Prevention

```
SQL injection decision:
|
+-- String concatenation (NEVER DO THIS)
|   +-- "SELECT * FROM users WHERE id = '" + userId + "'"
|   +-- Attacker sends: userId = "'; DROP TABLE users; --"
|   +-- Result: database destroyed
|
+-- Parameterized queries (ALWAYS DO THIS)
|   +-- "SELECT * FROM users WHERE id = $1", [userId]
|   +-- Driver escapes and types the parameter
|   +-- Attacker input treated as data, never as SQL
|
+-- ORM queries
    +-- Prisma, TypeORM, Drizzle handle parameterization
    +-- Still validate input BEFORE passing to ORM
    +-- Watch for: raw query methods that bypass parameterization
```

### Injection Pattern Recognition

| Red Flag | Risk | Fix |
|----------|------|-----|
| `"SELECT * FROM " + table` | Table injection | Whitelist table names |
| `` `WHERE name = '${name}'` `` | Value injection | Parameterized query |
| `query(req.body.sql)` | Arbitrary SQL execution | Never accept SQL from client |
| `ORDER BY ` + sortField | Column injection | Whitelist allowed columns |

---

## 7. XSS Prevention

```
XSS prevention layers:
|
+-- Content-Security-Policy (primary defense)
|   +-- Block inline scripts unless nonce-based
|   +-- Restrict script sources to trusted domains
|
+-- Output encoding (secondary defense)
|   +-- React: auto-escapes by default in JSX
|   +-- NEVER use: dangerouslySetInnerHTML
|   +-- If raw HTML needed: sanitize with DOMPurify
|
+-- Input validation (tertiary defense)
    +-- Reject or strip HTML tags in text fields
    +-- Zod: .string().max(255) for bounded text
    +-- Never store raw HTML from user input
```

---

## 8. Request-ID Correlation

```
Request-ID flow:
|
+-- 1. Request arrives at backend
+-- 2. Middleware generates UUID v4 (or reads X-Request-ID header)
+-- 3. ID attached to request context
+-- 4. All log entries include request_id
+-- 5. All downstream service calls include X-Request-ID header
+-- 6. Error responses include request_id
+-- 7. Result: any error can be traced across all logs
```

### Why Request-ID Matters for Security

| Scenario | Without Request-ID | With Request-ID |
|----------|-------------------|-----------------|
| Suspicious request | Search logs by timestamp (unreliable) | Search logs by exact ID |
| Attack investigation | Correlate events manually | Single ID links all related events |
| Error reporting | User says "something broke" | User provides request_id from error response |

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| CORS origin: '*' | Any website can call your API | Whitelist specific origins |
| No rate limiting | Brute force, DoS, API abuse | Rate limit per IP and per user |
| String-concatenated SQL | SQL injection | Parameterized queries exclusively |
| No input validation | Unexpected data types, injection | Zod schema on every endpoint |
| Raw error messages to client | Stack traces leak internals | Sanitize errors, include request_id only |
| Missing security headers | XSS, clickjacking, MIME attacks | Helmet.js with proper configuration |
| Auth check after handler | Business logic runs before permission check | Auth middleware before route handler |
| No request-ID | Cannot trace requests across logs | Generate UUID per request |
| dangerouslySetInnerHTML | XSS via stored malicious content | DOMPurify or avoid raw HTML entirely |

---

> **Principle:** API protection is defense in depth applied to every HTTP request. No single control is sufficient. Headers prevent browser-based attacks, rate limiting prevents abuse, validation prevents injection, and authentication prevents unauthorized access. Together, they form a wall that attackers must breach at every layer.
