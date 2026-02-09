# Sub-Phase 2A: Auth Module

> **Context:** ~4KB | **Max Files:** 8 | **Est. Time:** 1 session

## Summary
Implement authentication module: login, logout, session management (database-backed tokens, NOT JWT), auth middleware, và user management service.

## Tasks
| ID     | Description                 | Files                                                                       |
| ------ | --------------------------- | --------------------------------------------------------------------------- |
| BE-001 | Auth controller + routes    | `api/controllers/auth.controller.ts`, `api/routes/auth.routes.ts`           |
| BE-002 | Auth session service        | `domain/auth/services/auth-session.service.ts`                              |
| BE-003 | Auth password service       | `domain/auth/services/auth-password.service.ts`                             |
| BE-004 | User management service     | `domain/auth/services/user-management.service.ts`                           |
| BE-005 | User + session repositories | `domain/auth/repositories/user.repository.ts`, `user-session.repository.ts` |
| BE-006 | Auth middleware             | `middleware/auth.middleware.ts`                                             |
| BE-007 | Auth types + validators     | `domain/auth/types/auth.types.ts`, `api/validators/auth.validator.ts`       |

## DB Schema (từ Phase 1A)
```sql
-- Tables cần dùng:
users (id, username, password_hash, role, device_access_mode, status, ...)
user_sessions (id, user_id, session_token, expires_at, is_active, ...)

-- Indexes:
idx_users_username ON users(username)
idx_user_sessions_token ON user_sessions(session_token)
```

## API Contract (Output cho Frontend)
| Endpoint                       | Method | Request                        | Response                     |
| ------------------------------ | ------ | ------------------------------ | ---------------------------- |
| `/api/v1/auth/login`           | POST   | `{ username, password }`       | `{ user, token, expiresAt }` |
| `/api/v1/auth/logout`          | POST   | —                              | `{ success: true }`          |
| `/api/v1/auth/me`              | GET    | —                              | `{ user }`                   |
| `/api/v1/auth/change-password` | POST   | `{ oldPassword, newPassword }` | `{ success: true }`          |

## Session Token Strategy (IVM26 Pattern)
```typescript
// ⚠️ Database-backed session tokens, NOT JWT
// Token stored as SHA-256 hash in DB

// Login flow:
1. Validate credentials → hash password, compare
2. Generate random session token (crypto.randomBytes)
3. Store SHA-256(token) in user_sessions table
4. Return plaintext token to client
5. Client sends token in Authorization: Bearer <token>

// Auth middleware flow:
1. Extract token from Authorization header
2. Hash token with SHA-256
3. Lookup in user_sessions by hashed token
4. Check is_active = true AND expires_at > NOW()
5. Extend session (sliding window)
6. Attach user to req.user
```

## Auth Middleware Pattern
```typescript
// Hai loại middleware:
export const requireAuth = async (req, res, next) => {
  // Token required, throw 401 if missing/invalid
};

export const attachUserIfAvailable = async (req, res, next) => {
  // Token optional, attach user if valid, continue if not
};
```

## Dependencies
- ✅ Phase 1 done (DB exists with users, user_sessions tables)
- ➡️ Phase 2B (Device) cần auth middleware
- ➡️ Phase 4A (FE Auth UI) sẽ dùng API này

## Verification
- [ ] `npx tsc --noEmit 2>&1 | head -20` — no errors
- [ ] Login API: `POST /api/v1/auth/login` returns token
- [ ] Auth middleware: protected routes return 401 without token
- [ ] Session expiry: expired sessions return 401

## Full Spec Reference
- [20-backend-architecture.md#section-3.1](./../../20-backend-architecture.md) — Auth domain
- [23-backend-security.md#session-tokens](./../../23-backend-security.md) — Security patterns
