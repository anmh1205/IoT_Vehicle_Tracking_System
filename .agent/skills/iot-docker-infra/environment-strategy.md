# Environment Strategy

> `.env.example` committed. `.env` gitignored. Required secrets crash on missing. No silent defaults.

---

## The .env Pattern

```
Every service folder:
│
├── .env.example          # Committed to git
│   ├── Documents ALL variables
│   ├── Shows format and expected values
│   ├── Placeholder values (not real secrets)
│   └── Comments explaining each variable
│
├── .env                  # Gitignored, never committed
│   ├── Actual values for current environment
│   ├── Real passwords and secrets
│   └── Created by copying .env.example
│
└── .gitignore            # Must include .env
    └── .env
```

### .env.example Conventions

| Convention | Rule |
|-----------|------|
| **Required secrets** | Leave blank with `# REQUIRED` comment |
| **Optional with defaults** | Show default value |
| **Format hint** | Comment with expected format |
| **Group by concern** | Sections with header comments |

---

## Required vs Optional Variables

```
How to handle a variable:
│
├── Is it a SECRET? (password, token, API key)
│   └── REQUIRED, no default
│       ├── App MUST crash if missing
│       └── Error message: "Missing required: SESSION_SECRET"
│
├── Is it environment-specific? (host, port, URL)
│   └── REQUIRED for production, default OK for dev
│       └── e.g., DB_HOST defaults to "localhost" in dev
│
├── Is it a feature flag or tuning parameter?
│   └── OPTIONAL with sensible default
│       └── e.g., LOG_LEVEL defaults to "info"
│
└── Is it a connection string with credentials?
    └── REQUIRED, no default
        └── Build from individual REQUIRED vars
```

### Validation at Startup

| Variable Type | Behavior on Missing |
|---------------|---------------------|
| **Secrets** | CRASH immediately with clear error |
| **Required config** | CRASH with error showing which var |
| **Optional config** | Use default, log a warning |
| **Feature flags** | Use default (usually off) |

> **Principle:** Fail loudly at startup, not silently at runtime. A missing secret discovered during a 3 AM API call is far worse than a clear crash at deploy time.

---

## Environment Tiers

```
Three tiers, different concerns:
│
├── DEV (localhost)
│   ├── Services run on host machine (npm run dev)
│   ├── Infrastructure in Docker (PostgreSQL, EMQX, etc.)
│   ├── Ports exposed to localhost
│   ├── Hot-reload enabled
│   ├── Debug logging
│   └── docker-compose.yml
│
├── UAT (Docker, staging)
│   ├── ALL services in Docker
│   ├── Internal network, reverse proxy for access
│   ├── No ports exposed except proxy (80/443)
│   ├── Production-like configuration
│   ├── Seeded test data
│   └── docker-compose.uat.yml
│
└── PROD (server, production)
    ├── Same as UAT, plus:
    ├── TLS certificates (Let's Encrypt)
    ├── Real domain names
    ├── Monitoring and alerting
    ├── Backup automation
    ├── Rate limiting
    └── docker-compose.uat.yml + production overrides
```

---

## What Changes Between Environments

| Variable | DEV | UAT | PROD |
|----------|-----|-----|------|
| **DB_HOST** | `localhost` | `tracking-postgresql` | `tracking-postgresql` |
| **DB_PORT** | `5432` | `5432` | `5432` |
| **DB_PASSWORD** | Simple dev password | Stronger password | Generated, rotated |
| **API_URL** | `http://localhost:3000` | `http://tracking-backend:3000` | `https://api.example.com` |
| **CORS_ORIGIN** | `http://localhost:3002` | `http://tracking-frontend:3000` | `https://app.example.com` |
| **LOG_LEVEL** | `debug` | `info` | `warn` |
| **NODE_ENV** | `development` | `production` | `production` |
| **TLS** | None | Optional | Required |
| **SESSION_SECRET** | Dev value | Different value | Strong, rotated |

### Decision: How Does This Variable Change?

```
For each variable, ask:
│
├── Same across all environments?
│   └── Hardcode in app config (not .env)
│
├── Changes per environment?
│   └── Put in .env, document in .env.example
│
├── Is a secret?
│   └── Put in .env, NEVER in code or compose file
│
└── Changes at runtime (not deploy time)?
    └── Use config service or feature flags
```

---

## Compose File Per Environment

```
Tracking_Backend/
│
├── docker-compose.yml            # DEV overrides (port mapping, hot-reload)
│   └── Used with: docker-compose up
│
├── docker-compose.uat.yml        # UAT/PROD (no host ports, production build)
│   └── Used with: docker-compose -f docker-compose.uat.yml up
│
└── .env                          # Values change per tier
    └── Different file contents for dev vs uat vs prod
```

### Key Differences Between Compose Files

| Aspect | docker-compose.yml (DEV) | docker-compose.uat.yml (UAT/PROD) |
|--------|--------------------------|-------------------------------------|
| **Ports** | Mapped to host | Internal only (or via proxy) |
| **Build** | May use hot-reload volumes | Multi-stage production build |
| **Restart** | `unless-stopped` | `always` |
| **Logging** | Default (stdout) | Log driver configured |
| **Resources** | No limits | CPU/memory limits set |

---

## Security Rules

### Absolute Rules (No Exceptions)

| Rule | Reason |
|------|--------|
| **No default passwords** | `DB_PASSWORD=` not `DB_PASSWORD=postgres` |
| **No fallback secrets** | `SESSION_SECRET` must be provided, no hardcoded fallback |
| **No secrets in compose files** | Use `env_file` or `environment` referencing .env |
| **No secrets in Dockerfile** | Use build args only for non-sensitive values |
| **No secrets in git** | `.env` in `.gitignore`, always |
| **No secrets in logs** | Redact sensitive values in application logging |

### Secret Rotation Pattern

```
When rotating a secret:
│
├── Generate new value
├── Update .env file
├── Restart affected service(s)
├── Verify service health
└── Document rotation date
```

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|----|
| **`DB_PASSWORD=postgres`** | Default password in .env.example | Leave blank: `DB_PASSWORD=` with `# REQUIRED` |
| **`secret \|\| "fallback"`** | Silent fallback masks missing config | Crash: `throw new Error("Missing DB_PASSWORD")` |
| **Secrets in docker-compose.yml** | Committed to git, visible in `docker inspect` | Use `env_file: .env` instead |
| **Same .env for all environments** | Dev secrets in production | Separate .env per deployment |
| **`.env` committed to git** | Secrets in version history forever | Add to `.gitignore` before first commit |
| **Interpolation in .env** | `URL=$HOST:$PORT` does not work in Docker | Use full values: `URL=localhost:5432` |
| **`ARG SECRET` in Dockerfile** | Cached in image layers | Pass at runtime via environment |

---

## Environment Validation Checklist

Before deploying to a new environment:

- [ ] `.env` file exists with all required variables?
- [ ] No placeholder values left from `.env.example`?
- [ ] Secrets are unique to this environment (not shared with dev)?
- [ ] Database connection string correct for this tier?
- [ ] CORS origin matches the frontend URL for this tier?
- [ ] Log level appropriate for this tier?
- [ ] TLS configured for production?

---

> **Remember:** Environment management is security management. Every default password is a vulnerability. Every missing validation is a 3 AM incident waiting to happen.
