# Secrets Management

> A single leaked credential can compromise an entire system. Secrets are the keys to the kingdom. Manage them with paranoid discipline.

---

## 1. Core Principle

**NO default password fallbacks.** Required secrets must crash the application on startup if missing.

```
Secret handling decision:
|
+-- Is this secret REQUIRED for the application to function?
|   +-- YES (database password, session secret, MQTT credentials)
|   |   +-- No default value
|   |   +-- Application MUST crash with descriptive error if missing
|   |   +-- Error message: "POSTGRESQL_PASSWORD is required. Set it in .env"
|   |   +-- NEVER: process.env.PASSWORD || 'default123'
|   |
|   +-- NO (port number, log level, node environment)
|       +-- Safe default is acceptable
|       +-- PORT=3000, LOG_LEVEL=info, NODE_ENV=development
|       +-- Application starts with sensible defaults
```

---

## 2. Environment Variable Pattern

```
File strategy:
|
+-- .env.example (committed to git)
|   +-- Shows all required and optional variables
|   +-- Uses placeholder values: POSTGRESQL_PASSWORD=<required>
|   +-- Documents each variable with comments
|   +-- Acts as setup guide for new developers
|
+-- .env (gitignored, NEVER committed)
|   +-- Contains actual secret values
|   +-- Created by copying .env.example
|   +-- Developer fills in real values
|   +-- Different per environment and per developer
|
+-- .gitignore (committed to git)
    +-- Must include: .env, .env.local, .env.*.local
    +-- Must include: *.pem, *.key, *.cert
    +-- Must include: {Prefix}_Data/ (runtime data)
```

### Required vs Optional Variables

| Variable | Required? | Default | Reasoning |
|----------|-----------|---------|-----------|
| POSTGRESQL_PASSWORD | YES | (none, crash) | Security-critical, must be intentional |
| SESSION_SECRET | YES | (none, crash) | Token security depends on this |
| MQTT_PASSWORD | YES | (none, crash) | Device auth depends on this |
| PORT | NO | 3000 | Convenience, not security |
| LOG_LEVEL | NO | info | Convenience, not security |
| NODE_ENV | NO | development | Safe default behavior |
| CORS_ORIGIN | NO | http://localhost:3002 | Development default is safe |

---

## 3. Startup Validation

```
Application startup sequence:
|
+-- 1. Load environment variables (.env file)
+-- 2. Validate ALL required variables are present
|   +-- Check: is the value defined and non-empty?
|   +-- Check: does it meet minimum requirements? (length, format)
|   +-- If ANY required variable is missing:
|       +-- Log descriptive error (variable name, NOT value)
|       +-- Exit with code 1 (crash)
|       +-- NEVER start the application without required secrets
|
+-- 3. Validate optional variables have correct format
|   +-- PORT: must be a valid number
|   +-- LOG_LEVEL: must be one of: debug, info, warn, error
|   +-- If invalid format: warn and use default
|
+-- 4. Freeze configuration object
    +-- Config is read-only after startup
    +-- No runtime modification of secrets
```

---

## 4. Password Requirements

```
Password strength per service:
|
+-- PostgreSQL password
|   +-- Minimum: 16 characters
|   +-- Mix: uppercase, lowercase, numbers, symbols
|   +-- Unique: not reused from any other service
|   +-- Rotation: every 6-12 months in production
|
+-- EMQX dashboard password
|   +-- Change from factory default immediately
|   +-- Minimum: 12 characters
|   +-- Not the same as PostgreSQL password
|
+-- Session secret (backend)
|   +-- Minimum: 32 random characters
|   +-- Generated with: crypto.randomBytes(32).toString('hex')
|   +-- Used for: hashing session tokens
|   +-- Unique per environment (dev/staging/prod)
|
+-- Device auth tokens
|   +-- Minimum: 32 random characters (64 hex)
|   +-- Generated with: crypto.randomBytes(32).toString('hex')
|   +-- Unique per device (NEVER shared across devices)
|   +-- Stored: SHA-256 hashed in database
|
+-- User passwords (set by users)
    +-- Minimum: 8 characters (enforced by API validation)
    +-- Stored: bcrypt hashed (cost factor 12)
    +-- Never logged, never returned in API responses
```

---

## 5. What NOT to Commit

```
Files that must NEVER be in git:
|
+-- .env (actual secrets)
+-- .env.local, .env.production, .env.*.local
+-- *.pem (private keys, certificates)
+-- *.key (private keys)
+-- *.p12, *.pfx (certificate bundles)
+-- database dumps (*.sql with data, *.dump)
+-- {Prefix}_Data/ (runtime data volumes)
+-- node_modules/ (dependencies)
+-- .docker/ (local Docker state)
```

### .gitignore Verification

```
Before every commit, verify:
|
+-- Is .env in .gitignore?
|   +-- YES --> safe to commit
|   +-- NO --> STOP, add it before committing anything
|
+-- Does the commit contain secrets?
|   +-- Run: git diff --staged | grep -i "password\|secret\|token\|key"
|   +-- Any matches? --> Review carefully, likely a mistake
|
+-- Is .env.example up to date?
    +-- New env var added? --> Add placeholder to .env.example
    +-- Env var removed? --> Remove from .env.example
```

---

## 6. Secret Storage Strategy

```
Where to store secrets (by deployment complexity):
|
+-- Simple deployment (single server)
|   +-- .env files on the server
|   +-- Protected by file permissions (chmod 600)
|   +-- Backed up securely (encrypted)
|   +-- Used in: Vehicle Tracking System
|
+-- Docker Swarm / Kubernetes
|   +-- Docker secrets (docker secret create)
|   +-- Kubernetes secrets (kubectl create secret)
|   +-- Mounted as files, not environment variables
|   +-- Encrypted at rest by orchestrator
|
+-- Enterprise / Regulated
    +-- HashiCorp Vault
    +-- AWS Secrets Manager
    +-- Azure Key Vault
    +-- GCP Secret Manager
    +-- Dynamic secrets with TTL
    +-- Audit trail for every access
```

---

## 7. The Seven Absolute Rules

These rules have no exceptions. Violating any one of them is a security incident.

| # | Rule | Violation Consequence |
|---|------|----------------------|
| 1 | Never commit .env files | Secrets in git history forever (even after delete) |
| 2 | Never hardcode passwords in source code | Code review, git history, build artifacts all expose them |
| 3 | Never use default passwords in production | First attack vector tried by any attacker |
| 4 | Never log secret values | Log aggregators, monitoring tools, support staff see them |
| 5 | Always hash passwords with bcrypt | Database breach exposes all user accounts |
| 6 | Always hash tokens before storing (SHA-256) | Database breach gives attacker usable session tokens |
| 7 | Always use TLS in production | Network sniffers capture credentials in transit |

---

## 8. Rotation Strategy

```
When and how to rotate secrets:
|
+-- Scheduled rotation (proactive)
|   +-- Session secret: every 6 months
|   +-- Database password: every 12 months
|   +-- Device tokens: annually or on firmware update cycle
|   +-- Process: update secret, restart services, verify
|
+-- Incident-driven rotation (reactive)
|   +-- Suspected breach: rotate ALL secrets immediately
|   +-- Employee departure: rotate secrets they had access to
|   +-- Credential leak in logs: rotate leaked credential
|   +-- Process: rotate, verify, audit for unauthorized access
|
+-- Rotation procedure:
    +-- 1. Generate new secret
    +-- 2. Update .env on server (or secret manager)
    +-- 3. Restart affected services
    +-- 4. Verify services are healthy
    +-- 5. Invalidate old sessions (for session secret rotation)
    +-- 6. Document rotation in audit log
```

---

## 9. Secret Leak Response

```
If a secret is leaked (committed to git, logged, exposed):
|
+-- 1. IMMEDIATE: rotate the compromised secret
|   +-- Do not wait for investigation
|   +-- Assume it has been captured
|
+-- 2. ASSESS: determine exposure scope
|   +-- Was it in a public repo? (critical: anyone could have it)
|   +-- Was it in server logs? (who has log access?)
|   +-- Was it in a private repo? (team members only)
|
+-- 3. REMEDIATE: remove from history
|   +-- Git: git filter-branch or BFG Repo-Cleaner
|   +-- Logs: purge from log aggregator
|   +-- Note: once pushed to public, assume permanent exposure
|
+-- 4. PREVENT: add safeguards
    +-- Pre-commit hook to detect secrets
    +-- Automated scanning (gitleaks, trufflehog)
    +-- Review .gitignore coverage
```

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Default password fallbacks | App starts with weak credentials, deployed to production | Crash on missing required secrets |
| Secrets in source code | Exposed in git, code review, build artifacts | .env files, environment variables |
| .env committed to git | Secrets in history forever | .gitignore from project creation |
| Same password everywhere | One breach compromises everything | Unique password per service |
| Logging secret values | Secrets visible in log aggregators | Log variable names, never values |
| No startup validation | App runs with missing config, fails later with unclear errors | Validate all required vars at startup |
| Plain tokens in database | Database breach gives usable tokens | SHA-256 hash before storing |
| No rotation plan | Credentials valid indefinitely, risk increases over time | Scheduled and incident-driven rotation |
| Secrets in Docker image | Image registry exposes secrets | Runtime environment variables, not build-time |

---

> **Principle:** Secrets management is not glamorous work, but it is the foundation of every other security control. Authentication, encryption, and access control all depend on secrets being properly generated, stored, transmitted, and rotated. One shortcut in secrets management can unravel every other security measure in the system.
