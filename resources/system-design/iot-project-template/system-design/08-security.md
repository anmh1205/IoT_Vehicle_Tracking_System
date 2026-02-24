# Security Design

> Bảo mật cho hệ thống IoT

---

## 1. Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Network Security                                   │
│  ├── TLS/SSL encryption                                      │
│  ├── Firewall rules                                          │
│  └── VPN for admin access                                    │
│                                                              │
│  Layer 2: Authentication                                     │
│  ├── User: JWT tokens                                        │
│  ├── Device: Auth tokens                                     │
│  └── API: Rate limiting                                      │
│                                                              │
│  Layer 3: Authorization                                      │
│  ├── Role-based access (RBAC)                                │
│  ├── Device-level permissions                                │
│  └── Resource ownership                                      │
│                                                              │
│  Layer 4: Data Security                                      │
│  ├── Password hashing                                        │
│  ├── Sensitive data encryption                               │
│  └── Audit logging                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication

### 2.1 User Authentication (JWT)

```typescript
// Token structure
{
  "sub": "user_id",
  "username": "admin",
  "role": "admin",
  "iat": 1704067200,
  "exp": 1704153600  // 24 hours
}

// Token settings
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET,
  expiresIn: '24h',
  algorithm: 'HS256'
};
```

### 2.2 Device Authentication

```typescript
// Device auth flow
1. Device sends: { deviceId, authToken }
2. Server validates token against database
3. If valid, allow MQTT connection / API access

// Token generation
const authToken = crypto.randomBytes(32).toString('hex');
// Store hashed version in database
const hashedToken = await bcrypt.hash(authToken, 10);
```

### 2.3 Password Security

```typescript
// Hashing
const BCRYPT_ROUNDS = 12;
const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

// Verification
const isValid = await bcrypt.compare(password, hashedPassword);

// Password requirements
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false
};
```

---

## 3. Authorization (RBAC)

### 3.1 Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| root | System admin | All access |
| admin | Manager | Device management, users |
| user | Regular user | View only, limited devices |

### 3.2 Permission Matrix

| Resource | root | admin | user |
|----------|------|-------|------|
| View devices | ✅ All | ✅ All | ✅ Assigned |
| Create device | ✅ | ✅ | ❌ |
| Update device | ✅ | ✅ | ❌ |
| Delete device | ✅ | ✅ | ❌ |
| View users | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ |
| Firmware upload | ✅ | ✅ | ❌ |

### 3.3 Implementation

```typescript
// Middleware
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' }
      });
    }
    next();
  };
}

// Usage
router.post('/device', requireRole('root', 'admin'), createDevice);
```

---

## 4. API Security

### 4.1 Rate Limiting

```typescript
const rateLimits = {
  // Authentication
  'POST /auth/login': {
    windowMs: 60 * 1000,  // 1 minute
    max: 5,
    message: 'Too many login attempts'
  },

  // IoT data (per device)
  'POST /iot/data': {
    windowMs: 1000,       // 1 second
    max: 100,
    keyGenerator: (req) => req.body.deviceId
  },

  // General API
  'default': {
    windowMs: 60 * 1000,  // 1 minute
    max: 100
  }
};
```

### 4.2 Input Validation

```typescript
// Zod schema validation
const deviceSchema = z.object({
  deviceId: z.string()
    .min(1)
    .max(50)
    .regex(/^[A-Z0-9_]+$/),
  deviceName: z.string()
    .min(1)
    .max(100)
    .trim(),
  config: z.record(z.unknown()).optional()
});

// SQL injection prevention - use parameterized queries
await pool.query(
  'SELECT * FROM devices WHERE device_id = $1',
  [deviceId]
);
```

### 4.3 CORS

```typescript
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

### 4.4 Security Headers

```typescript
// Helmet.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));
```

---

## 5. MQTT Security

### 5.1 Authentication

```yaml
# EMQX configuration
authentication:
  - mechanism: password_based
    backend: http
    method: post
    url: "http://backend:3000/api/v1/mqtt/auth"
    body:
      username: "${username}"
      password: "${password}"
```

### 5.2 ACL (Access Control List)

```typescript
// Devices can only publish to their own topics
POST /api/v1/mqtt/acl
{
  "username": "DEVICE_001",
  "topic": "v1/DEVICE_001/rawdata",
  "action": "publish"
}

// ACL rules
const aclRules = [
  {
    pattern: 'v1/{deviceId}/rawdata',
    action: 'publish',
    condition: (username, topic) => topic.includes(username)
  },
  {
    pattern: 'v1/{deviceId}/commands',
    action: 'subscribe',
    condition: (username, topic) => topic.includes(username)
  }
];
```

### 5.3 TLS for MQTT

```yaml
# EMQX TLS configuration
listeners:
  ssl:
    default:
      bind: "0.0.0.0:8883"
      ssl_options:
        certfile: /etc/emqx/certs/server.pem
        keyfile: /etc/emqx/certs/server.key
        cacertfile: /etc/emqx/certs/ca.pem
        verify: verify_peer
```

---

## 6. Data Security

### 6.1 Sensitive Data

| Data | Storage | Encryption |
|------|---------|------------|
| Passwords | bcrypt hash | Yes (one-way) |
| JWT secret | Environment | Not stored |
| Device tokens | bcrypt hash | Yes (one-way) |
| API keys | Environment | Not stored |
| User PII | Database | Optional |

### 6.2 Environment Variables

```bash
# Required secrets
JWT_SECRET=long_random_string_64_chars
POSTGRES_PASSWORD=strong_password
MQTT_PASSWORD=strong_password

# Never commit to git
.env
.env.local
.env.production
```

### 6.3 Audit Logging

```typescript
// Log security events
const securityEvents = [
  'user.login.success',
  'user.login.failed',
  'user.logout',
  'user.password.changed',
  'device.created',
  'device.deleted',
  'permission.denied',
  'rate.limit.exceeded'
];

// Log format
{
  timestamp: '2024-01-01T12:00:00Z',
  event: 'user.login.failed',
  actor: { type: 'user', id: 'admin' },
  ip: '192.168.1.1',
  details: { reason: 'invalid_password' }
}
```

---

## 7. Frontend Security

### 7.1 XSS Prevention

```typescript
// React automatically escapes
// But avoid dangerouslySetInnerHTML

// Sanitize if needed
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### 7.2 Token Storage

```typescript
// Store in httpOnly cookie (preferred)
// Or in memory (not localStorage)

// Cookie settings
{
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000
}
```

### 7.3 CSP

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  }
];
```

---

## 8. Security Checklist

### Development

- [ ] No secrets in code
- [ ] Input validation on all endpoints
- [ ] Parameterized database queries
- [ ] Error messages don't leak info
- [ ] Dependencies updated

### Deployment

- [ ] HTTPS enabled
- [ ] Strong passwords set
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] Firewall rules set
- [ ] Admin access restricted

### Monitoring

- [ ] Failed login alerts
- [ ] Rate limit alerts
- [ ] Unusual activity detection
- [ ] Audit logs enabled
- [ ] Log retention policy
