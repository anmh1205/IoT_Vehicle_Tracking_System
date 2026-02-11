# User Authentication

> Users are humans with browsers. Devices are machines with firmware. Never conflate their auth strategies.

---

## 1. Auth Strategy Selection

Two proven approaches from real IoT projects. The choice depends on architecture, not preference.

```
Which user auth strategy?
|
+-- How many backend services consume the token?
|   |
|   +-- ONE backend service (monolith or single API)
|   |   |
|   |   +-- Session-based (database-backed)
|   |   +-- Simpler implementation
|   |   +-- Instant revocation (delete row)
|   |   +-- No token decode complexity
|   |   +-- Used in: Vehicle Tracking System
|   |
|   +-- MULTIPLE backend services (microservices)
|       |
|       +-- JWT (JSON Web Token)
|       +-- No shared session store needed
|       +-- Each service verifies independently
|       +-- Stateless validation
|       +-- Used in: IVM26
|
+-- Do you need instant token revocation?
|   +-- YES --> Session-based (delete from DB = instant revoke)
|   +-- NO  --> JWT is acceptable (wait for expiry)
|
+-- Do you need offline token validation?
|   +-- YES --> JWT (verify signature without network call)
|   +-- NO  --> Session-based is fine
|
+-- Default recommendation for IoT projects?
    +-- Session-based
    +-- IoT backends are typically single services
    +-- Instant revocation is valuable for security incidents
    +-- Simpler to reason about and debug
```

---

## 2. Session-Based Authentication (Database-Backed)

The approach used in the Vehicle Tracking System.

```
Login flow:
|
+-- 1. User submits username + password
+-- 2. Server verifies password against bcrypt hash in users table
+-- 3. Server generates random token (crypto.randomBytes, 32+ bytes)
+-- 4. Server hashes token with SHA-256
+-- 5. Server stores hash in user_sessions table (with user_id, expiry)
+-- 6. Server returns plain token to client
+-- 7. Client stores token in Zustand memory (NOT localStorage)

Request flow:
|
+-- 1. Client sends: Authorization: Bearer {plain_token}
+-- 2. Server extracts token from header
+-- 3. Server hashes token with SHA-256
+-- 4. Server looks up hash in user_sessions table
+-- 5. Found + not expired --> attach user to request, extend expiry (sliding window)
+-- 6. Not found or expired --> 401 Unauthorized

Logout flow:
|
+-- 1. Client sends: DELETE /api/v1/auth/session
+-- 2. Server deletes session row from database
+-- 3. Token is instantly invalid (no waiting for expiry)
```

### Why SHA-256 the Token Before Storage?

| Scenario | Without Hashing | With Hashing |
|----------|----------------|--------------|
| Database breach | Attacker has plain tokens, can impersonate users | Attacker has hashes, cannot reconstruct tokens |
| SQL injection | Leaked tokens are directly usable | Leaked hashes are not usable as Bearer tokens |
| Insider threat | DBA can see and use tokens | DBA sees only hashes |

### Sliding Window Expiry

```
Token created at 14:00, expires at 22:00 (8 hours)
|
+-- Request at 15:00 --> valid, extend expiry to 23:00
+-- Request at 18:00 --> valid, extend expiry to 02:00
+-- No requests for 8 hours --> token expires
+-- Active users never get logged out unexpectedly
+-- Inactive users are automatically cleaned up
```

---

## 3. JWT Authentication

The approach used in IVM26.

```
Login flow:
|
+-- 1. User submits username + password
+-- 2. Server verifies password against bcrypt hash
+-- 3. Server creates JWT payload: { user_id, role, iat, exp }
+-- 4. Server signs JWT with secret (HS256) or private key (RS256)
+-- 5. Server returns JWT to client
+-- 6. Client stores JWT in memory

Request flow:
|
+-- 1. Client sends: Authorization: Bearer {jwt}
+-- 2. Server verifies signature
+-- 3. Server checks expiry (exp claim)
+-- 4. Server extracts payload --> attach user to request
+-- 5. Invalid signature or expired --> 401 Unauthorized
```

### JWT Considerations for IoT

| Factor | Implication |
|--------|-------------|
| **No DB lookup** | Faster per-request validation |
| **Cannot revoke** | Token valid until expiry (unless blacklist) |
| **Payload visible** | Do not store sensitive data in payload |
| **Clock skew** | Server clocks must be synchronized |
| **Token size** | Larger than session tokens (header overhead) |

### Refresh Token Pattern (Required for JWT)

```
Without refresh tokens:
+-- Short expiry (15 min) --> user re-logs in constantly (bad UX)
+-- Long expiry (24 hours) --> stolen token valid for 24 hours (bad security)

With refresh tokens:
+-- Access token: short-lived (15 min), used for API calls
+-- Refresh token: long-lived (7 days), stored in DB, used to get new access token
+-- Refresh token can be revoked instantly (delete from DB)
+-- Best of both: stateless validation + revocable sessions
```

---

## 4. Comparison Table

| Factor | Session-Based | JWT |
|--------|--------------|-----|
| **State** | Server-side (database) | Client-side (token) |
| **DB lookup per request** | Yes (session table) | No (signature verification) |
| **Instant revocation** | Yes (delete row) | No (wait for expiry or blacklist) |
| **Horizontal scaling** | Needs shared DB or sticky sessions | Any server can verify |
| **Token size** | Small (random string) | Larger (header + payload + signature) |
| **Implementation complexity** | Lower | Higher (refresh tokens, key management) |
| **Best for** | Single backend, IoT dashboards | Microservices, third-party integrations |

---

## 5. Password Hashing

```
Password storage decision:
|
+-- bcryptjs
|   +-- Cost factor: 12 (balances security and speed)
|   +-- Built-in salt generation
|   +-- Timing-safe comparison
|   +-- Pure JavaScript (no native dependencies)
|   +-- Use for: all user passwords
|
+-- Why not MD5/SHA-256 for passwords?
|   +-- No salt by default
|   +-- Too fast (GPU cracking)
|   +-- Not designed for password hashing
|   +-- SHA-256 is for tokens, NOT passwords
|
+-- Why not argon2?
    +-- Requires native compilation
    +-- Docker build complexity
    +-- bcrypt is sufficient for most IoT projects
    +-- Consider argon2 for high-security requirements
```

---

## 6. Auth Middleware Pattern

```
Middleware types:
|
+-- requireAuth
|   +-- Extract token from Authorization header
|   +-- Validate token (session lookup or JWT verify)
|   +-- If invalid --> 401 Unauthorized (stop request)
|   +-- If valid --> attach user to request, call next()
|   +-- Use on: all protected endpoints
|
+-- attachUserIfAvailable
|   +-- Same extraction and validation logic
|   +-- If invalid --> continue WITHOUT user (no 401)
|   +-- If valid --> attach user to request
|   +-- Use on: endpoints that behave differently for logged-in users
|
+-- requireRole(roles)
|   +-- Runs AFTER requireAuth
|   +-- Checks user.role against allowed roles
|   +-- If not authorized --> 403 Forbidden
|   +-- Use on: admin-only endpoints
```

---

## 7. Frontend Token Storage

| Storage Method | Security | Why |
|----------------|----------|-----|
| **Zustand (memory)** | Best | Lost on page refresh, not accessible to XSS scripts reading storage |
| **httpOnly cookie** | Good | Not accessible to JavaScript, but adds CSRF concerns |
| **localStorage** | Dangerous | Persists, accessible to any XSS script |
| **sessionStorage** | Bad | Accessible to XSS, lost on tab close (not page refresh) |

```
Recommended pattern (Vehicle Tracking):
|
+-- Login response returns token in JSON body
+-- Zustand store saves token in memory
+-- Every API request reads token from Zustand
+-- Page refresh --> token lost --> user must re-login
+-- Acceptable trade-off: security over convenience
+-- Alternative: httpOnly cookie with CSRF protection
```

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| JWT without refresh mechanism | Short expiry = bad UX, long expiry = bad security | Implement refresh token rotation |
| Token in localStorage | XSS attack reads token, impersonates user | Zustand memory only |
| Plain text passwords in DB | Database breach exposes all passwords | bcrypt with cost factor 12 |
| No session expiry | Tokens valid forever, stolen token = permanent access | Sliding window or fixed expiry |
| Same secret for all environments | Dev leak exposes production | Unique secret per environment |
| Password in URL or query string | Logged in server logs, browser history, proxies | Always in request body, POST only |
| No rate limit on login | Brute force attack | 5 attempts per 15 minutes per IP |

---

> **Principle:** User authentication is the front door to your IoT system. A compromised user account with admin privileges can reconfigure every device, disable every alert, and export every record. Treat it with the seriousness it deserves.
