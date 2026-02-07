# Security Implementation

> Helmet + Rate Limiting + CORS + Authentication Security cho IoT Vehicle Tracking System

---

## 1. Tổng Quan Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Request Flow:                                               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. CORS           - Origin validation               │    │
│  └───────────────────────────┬─────────────────────────┘    │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 2. Helmet         - Security headers                │    │
│  └───────────────────────────┬─────────────────────────┘    │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 3. Rate Limiting  - Request throttling              │    │
│  └───────────────────────────┬─────────────────────────┘    │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 4. Authentication - JWT validation                  │    │
│  └───────────────────────────┬─────────────────────────┘    │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 5. Authorization  - Role/Permission check           │    │
│  └───────────────────────────┬─────────────────────────┘    │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 6. Input Validation - Zod schema validation         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Dependencies

```json
{
  "dependencies": {
    "helmet": "^8.1.0",
    "express-rate-limit": "^8.2.1",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.23.8",
    "express-validator": "^7.0.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.6"
  }
}
```

---

## 3. Helmet Configuration

### 3.1 Security Headers Middleware

```typescript
// middleware/security.middleware.ts
import helmet from 'helmet';
import { Application } from 'express';

export function configureHelmet(app: Application): void {
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust for your needs
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'https:'],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },

      // Prevent XSS attacks
      xssFilter: true,

      // Prevent MIME type sniffing
      noSniff: true,

      // Prevent clickjacking
      frameguard: {
        action: 'deny',
      },

      // HTTP Strict Transport Security
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },

      // Hide X-Powered-By header
      hidePoweredBy: true,

      // Referrer Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },

      // Permissions Policy
      permittedCrossDomainPolicies: {
        permittedPolicies: 'none',
      },
    })
  );
}
```

### 3.2 Additional Security Headers

```typescript
// middleware/additional-headers.middleware.ts
import { Request, Response, NextFunction } from 'express';

export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent caching of sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Additional XSS protection
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent PDF/Flash embedding attacks
  res.setHeader('X-Download-Options', 'noopen');

  next();
}
```

---

## 4. Rate Limiting

### 4.1 Global Rate Limiter

```typescript
// middleware/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Global rate limiter
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: {
    status: 429,
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use X-Forwarded-For header if behind proxy
    return req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/metrics';
  },
});

// Strict rate limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window
  message: {
    status: 429,
    error: 'Too many login attempts',
    message: 'Account temporarily locked. Please try again in 15 minutes.',
  },
  skipSuccessfulRequests: true, // Don't count successful logins
});

// API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    status: 429,
    error: 'API rate limit exceeded',
    message: 'Too many API requests. Please slow down.',
  },
});

// IoT endpoint rate limiter (higher limit)
export const iotRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute (IoT devices send frequent data)
  keyGenerator: (req: Request) => {
    // Rate limit by device ID
    return req.params.deviceId || req.ip || 'unknown';
  },
});
```

### 4.2 Sliding Window Rate Limiter (Redis)

```typescript
// middleware/redis-rate-limit.middleware.ts
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export function createRedisRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `${config.keyPrefix}:${req.ip}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count requests in window
    const requestCount = await redis.zcard(key);

    if (requestCount >= config.maxRequests) {
      res.status(429).json({
        status: 429,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(config.windowMs / 1000),
      });
      return;
    }

    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, Math.ceil(config.windowMs / 1000));

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', config.maxRequests - requestCount - 1);
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + config.windowMs) / 1000));

    next();
  };
}
```

---

## 5. CORS Configuration

```typescript
// middleware/cors.middleware.ts
import cors from 'cors';
import { Application } from 'express';

export function configureCors(app: Application): void {
  const allowedOrigins = [
    process.env.CORS_ORIGIN || 'http://localhost:3002',
    // Add production domains
    'https://tracking.example.com',
    'https://www.tracking.example.com',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // In development, allow localhost with any port
        if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
          return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true, // Allow cookies
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Correlation-ID',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Correlation-ID',
      ],
      maxAge: 86400, // 24 hours
    })
  );
}
```

---

## 6. JWT Authentication (IVM26 Pattern - Session-Based with Sliding Expiration)

> ⚠️ **Pattern từ IVM26:** Sử dụng **Session-based tokens** (stored in database) thay vì stateless JWT. Hỗ trợ **sliding expiration** để extend session khi user active.

### 6.1 Auth Session Service (IVM26 Pattern)

```typescript
// domain/auth/services/auth-session.service.ts
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { addHours } from 'date-fns';
import { UserRepository } from '../repositories/user.repository';
import { UserSessionRepository } from '../repositories/user-session.repository';
import { AuditService } from '../../audit/services/audit.service';
import { createUnauthorizedError } from '@/shared/utils/errors.util';
import { logger } from '@/infrastructure/logger';

const SESSION_EXTENSION_HOURS = 4; // Sliding window

interface AuditContext {
  ip: string;
  userAgent?: string;
}

interface AuthenticatedUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
  deviceAccessMode: string;
  sessionExpiresAt: Date;
}

interface LoginResponse {
  user: AuthenticatedUser;
  session: { token: string; expiresAt: Date };
}

export class AuthSessionService {
  constructor(
    private userRepo: UserRepository,
    private userSessionRepo: UserSessionRepository,
    private auditService?: AuditService
  ) {}

  /**
   * Validates session token and extends expiry (sliding expiration)
   * Called on every authenticated request
   */
  async validateSessionToken(token: string): Promise<AuthenticatedUser | null> {
    if (!token) return null;

    // Find active session in database
    const session = await this.userSessionRepo.findActiveSessionByToken(token);
    if (!session) return null;

    // Check if session expired
    if (new Date() > session.expires_at) {
      await this.userSessionRepo.deactivateSession(token);
      return null;
    }

    // Extend session expiry (sliding window)
    const newExpiry = addHours(new Date(), SESSION_EXTENSION_HOURS);
    await this.userSessionRepo.updateExpiry(token, newExpiry);

    return {
      id: session.user_id,
      username: session.username,
      fullName: session.full_name,
      role: session.role,
      deviceAccessMode: session.device_access_mode,
      sessionExpiresAt: newExpiry,
    };
  }

  /**
   * Login user and create session
   */
  async loginUser(
    username: string,
    credential: string, // SHA-256 hashed password from client
    auditCtx?: AuditContext
  ): Promise<LoginResponse> {
    const user = await this.userRepo.findByUsername(username.trim());

    // Generic error to prevent username enumeration
    if (!user) {
      await this.auditService?.logLoginFailed(
        auditCtx?.ip || 'unknown',
        username,
        'User not found'
      );
      throw createUnauthorizedError('Invalid username or password');
    }

    // Check account status
    if (user.status !== 'active') {
      await this.auditService?.logLoginFailed(
        auditCtx?.ip || 'unknown',
        username,
        'Account inactive'
      );
      throw createUnauthorizedError('User account is inactive');
    }

    // Verify password with bcrypt
    const passwordMatches = await bcrypt.compare(credential, user.password_hash);
    if (!passwordMatches) {
      await this.auditService?.logLoginFailed(
        auditCtx?.ip || 'unknown',
        username,
        'Wrong password'
      );
      throw createUnauthorizedError('Invalid username or password');
    }

    // Generate session token (secure random)
    const sessionToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = addHours(new Date(), SESSION_EXTENSION_HOURS);

    // Store session in database
    await this.userSessionRepo.createSession({
      userId: user.id,
      sessionToken,
      expiresAt,
      ip: auditCtx?.ip,
      userAgent: auditCtx?.userAgent,
    });

    // Audit log
    await this.auditService?.logLoginSuccess({
      userId: user.id,
      username: user.username,
      ip: auditCtx?.ip,
      userAgent: auditCtx?.userAgent,
    });

    logger.info(`User ${username} logged in successfully`);

    return {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        deviceAccessMode: user.device_access_mode,
        sessionExpiresAt: expiresAt,
      },
      session: {
        token: sessionToken,
        expiresAt,
      },
    };
  }

  /**
   * Logout and invalidate session
   */
  async logoutSession(token: string, auditCtx?: AuditContext): Promise<boolean> {
    const result = await this.userSessionRepo.deactivateSession(token);
    if (result && auditCtx) {
      await this.auditService?.logLogout(auditCtx);
    }
    return result;
  }

  /**
   * Logout all sessions for a user (security: password change, etc.)
   */
  async logoutAllSessions(userId: number): Promise<void> {
    await this.userSessionRepo.deactivateAllUserSessions(userId);
    logger.info(`All sessions invalidated for user ${userId}`);
  }
}
```

### 6.2 Auth Middleware (IVM26 Pattern)

```typescript
// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AuthSessionService } from '@/domain/auth/services/auth-session.service';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { createUnauthorizedError, createForbiddenError } from '@/shared/utils/errors.util';

// Initialize services (dependency injection in production)
const authSessionService = new AuthSessionService(
  new UserRepository(),
  new UserSessionRepository(),
  new AuditService()
);

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        fullName: string;
        role: string;
        deviceAccessMode: string;
        sessionExpiresAt: Date;
      };
    }
  }
}

/**
 * Middleware: Attach user if token present (optional auth)
 * Use for endpoints that work both with and without auth
 */
export const attachUserIfAvailable = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await authSessionService.validateSessionToken(token);
      if (user) {
        req.user = user;
      }
    }

    next();
  }
);

/**
 * Middleware: Require authentication (throws if no user)
 */
export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw createUnauthorizedError('Authentication required');
    }
    next();
  }
);

/**
 * Middleware: Require specific roles
 */
export function requireRoles(roles: string[]) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw createUnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw createForbiddenError(
        `This action requires one of these roles: ${roles.join(', ')}`
      );
    }

    next();
  });
}

/**
 * Helper: Get audit context from request
 */
export function getAuditContext(req: Request) {
  return {
    ip: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    username: req.user?.username,
  };
}
```

### 6.3 Route Pattern (IVM26)

```typescript
// api/routes/auth.routes.ts
import { Router } from 'express';
import { asyncHandler, attachUserIfAvailable, requireAuth, requireRoles } from '@/middleware/auth';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

// Initialize controller with dependencies
const authController = new AuthController(/* services */);

// Apply optional auth to all routes first
router.use(asyncHandler(attachUserIfAvailable));

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);

// Protected routes
router.get('/me', asyncHandler(requireAuth), authController.getCurrentUser);
router.post('/logout', asyncHandler(requireAuth), authController.logout);
router.put('/password', asyncHandler(requireAuth), authController.changePassword);

// Admin routes
router.get('/users', asyncHandler(requireRoles(['admin', 'root'])), authController.listUsers);
router.post('/users', asyncHandler(requireRoles(['admin', 'root'])), authController.createUser);
router.put('/users/:id', asyncHandler(requireRoles(['admin', 'root'])), authController.updateUser);
router.delete('/users/:id', asyncHandler(requireRoles(['root'])), authController.deleteUser);

export default router;
```

### 6.4 User Session Repository

```typescript
// domain/auth/repositories/user-session.repository.ts
import { getPool } from '@/infrastructure/database/pool';

interface CreateSessionInput {
  userId: number;
  sessionToken: string;
  expiresAt: Date;
  ip?: string;
  userAgent?: string;
}

export class UserSessionRepository {
  async createSession(input: CreateSessionInput): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.userId, input.sessionToken, input.expiresAt, input.ip, input.userAgent]
    );
  }

  async findActiveSessionByToken(token: string) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT us.*, u.username, u.full_name, u.role, u.device_access_mode
       FROM user_sessions us
       JOIN users u ON us.user_id = u.id
       WHERE us.session_token = $1
         AND us.is_active = true
         AND us.expires_at > NOW()`,
      [token]
    );
    return result.rows[0] || null;
  }

  async updateExpiry(token: string, newExpiry: Date): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE user_sessions SET expires_at = $1, updated_at = NOW() WHERE session_token = $2`,
      [newExpiry, token]
    );
  }

  async deactivateSession(token: string): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE user_sessions SET is_active = false, updated_at = NOW() WHERE session_token = $1`,
      [token]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deactivateAllUserSessions(userId: number): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE user_sessions SET is_active = false, updated_at = NOW() WHERE user_id = $1`,
      [userId]
    );
  }
}
```

---

## 7. Password Security

```typescript
// domain/auth/services/password.service.ts
import bcrypt from 'bcryptjs';

export class PasswordService {
  private readonly saltRounds = 12;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  validateStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain a lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain an uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain a number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain a special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

---

## 8. Input Validation with Zod

```typescript
// api/validators/schemas.ts
import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password too short'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
  name: z.string().min(2, 'Name too short').max(100, 'Name too long'),
});

// Device schemas
export const createDeviceSchema = z.object({
  deviceId: z
    .string()
    .min(1, 'Device ID required')
    .max(50, 'Device ID too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Device ID contains invalid characters'),
  name: z.string().min(1).max(100),
  location: z.string().optional(),
  vibrationThreshold: z.number().min(0).max(10).optional(),
});

// Query schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
  sortBy: z.string().optional(),
});

// IoT data schema
export const iotDataSchema = z.object({
  deviceId: z.string(),
  timestamp: z.number().int().positive(),
  data: z.object({
    vibration: z.number().min(0).max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    speed: z.number().min(0).max(500).optional(),
    batteryTop: z.number().min(0).max(5).optional(),
    batteryBot: z.number().min(0).max(5).optional(),
  }),
});
```

### 8.1 Validation Middleware

```typescript
// middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const parsed = schema.parse(data);
      req[target] = parsed; // Replace with parsed (and possibly transformed) data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: 400,
          error: 'Validation Error',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}
```

---

## 9. SQL Injection Prevention

```typescript
// infrastructure/database/queries.ts
import { Pool } from 'pg';

// ALWAYS use parameterized queries
export class SafeQueryBuilder {
  static async findById(pool: Pool, table: string, id: string) {
    // Whitelist allowed tables
    const allowedTables = ['users', 'devices', 'device_sessions'];
    if (!allowedTables.includes(table)) {
      throw new Error(`Invalid table: ${table}`);
    }

    // Use parameterized query
    const result = await pool.query(
      `SELECT * FROM ${table} WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  }

  static async search(
    pool: Pool,
    table: string,
    conditions: Record<string, any>
  ) {
    const allowedTables = ['devices', 'users'];
    if (!allowedTables.includes(table)) {
      throw new Error(`Invalid table: ${table}`);
    }

    const keys = Object.keys(conditions);
    const values = Object.values(conditions);

    const whereClause = keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(' AND ');

    const result = await pool.query(
      `SELECT * FROM ${table} WHERE ${whereClause}`,
      values
    );

    return result.rows;
  }
}
```

---

## 10. Middleware Chain Order

```typescript
// index.ts
import express from 'express';
import { initSentry, Sentry } from './config/sentry';

const app = express();

// 1. Sentry request handler (FIRST)
initSentry();
app.use(Sentry.Handlers.requestHandler());

// 2. Security headers
configureHelmet(app);
app.use(additionalSecurityHeaders);

// 3. Compression
app.use(compression());

// 4. CORS
configureCors(app);

// 5. Body parsing
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 6. Request logging
app.use(requestLoggerMiddleware);

// 7. Metrics
app.use(httpMetricsMiddleware);

// 8. Global rate limiting
app.use(globalRateLimiter);

// 9. Routes with specific rate limiting
app.use('/api/v1/auth', authRateLimiter, authRoutes);
app.use('/api/v1/iot', iotRateLimiter, iotRoutes);
app.use('/api/v1', apiRateLimiter, authMiddleware, apiRoutes);

// 10. Health/metrics (no auth)
app.use('/health', healthRoutes);
app.use('/metrics', metricsRoutes);

// 11. 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 404, error: 'Not Found' });
});

// 12. Error handler (LAST before Sentry)
app.use(errorHandler);

// 13. Sentry error handler (LAST)
app.use(Sentry.Handlers.errorHandler());
```

---

## 11. Environment Variables

```bash
# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://tracking.example.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Redis (for distributed rate limiting)
REDIS_URL=redis://localhost:6379
```

---

## 12. Security Checklist

### Pre-Deployment
- [ ] All secrets in environment variables (not in code)
- [ ] JWT secret is at least 32 characters
- [ ] HTTPS enforced in production
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] Password hashing with bcrypt (cost factor >= 12)

### Headers
- [ ] Helmet configured
- [ ] HSTS enabled
- [ ] CSP configured
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff

### Authentication
- [ ] JWT expiration set (short-lived access tokens)
- [ ] Refresh token rotation
- [ ] Secure password requirements
- [ ] Account lockout after failed attempts
- [ ] Session invalidation on logout

### Logging & Monitoring
- [ ] Failed login attempts logged
- [ ] Sensitive data not logged
- [ ] Error tracking (Sentry) configured
- [ ] Security alerts configured
