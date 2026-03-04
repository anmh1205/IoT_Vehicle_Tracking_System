# Volume Strategy

> Persistent data lives in `{Prefix}_Data/`. Gitignored. Backed up. Never inside containers.

---

## Data Directory Structure

```
{Prefix}_Data/                    # Gitignored, persistent runtime data
│
├── postgresql/                   # Database files
│   └── data/                     # PG data directory
│
├── victoriametrics/              # Time-series data
│   └── data/
│
├── victorialogs/                 # Log storage
│   └── data/
│
├── emqx/                        # MQTT broker state
│   ├── data/
│   └── log/
│
├── grafana/                      # Dashboard definitions, plugins
│   └── data/
│
└── npm/                          # Nginx Proxy Manager
    ├── data/
    └── letsencrypt/
```

### Naming Convention

| Component | Pattern | Example |
|-----------|---------|---------|
| **Root directory** | `{Prefix}_Data/` | `Tracking_Data/` |
| **Service subdirectory** | lowercase service name | `postgresql/` |
| **Data subdirectory** | `data/`, `log/`, `config/` | `emqx/data/` |

---

## Volume Type Decision

```
Which volume type?
│
├── Development
│   └── Bind mount (host path --> container path)
│       ├── Easy to inspect from host
│       ├── Easy to delete and recreate
│       └── Visible in file explorer
│
├── Production
│   ├── Named volume (Docker manages location)
│   │   ├── Better performance on some platforms
│   │   ├── Managed by Docker
│   │   └── Harder to inspect directly
│   │
│   └── Bind mount (explicit path control)
│       ├── When you need backup scripts to find files
│       └── When sysadmin needs direct access
│
└── Ephemeral (no volume needed)
    ├── Application containers (stateless)
    ├── Build caches
    └── Temporary processing
```

### Comparison

| Factor | Bind Mount | Named Volume |
|--------|-----------|--------------|
| **Path control** | Explicit | Docker decides |
| **Inspect from host** | Easy | `docker volume inspect` |
| **Backup** | Standard file tools | Docker commands |
| **Performance (Linux)** | Native | Native |
| **Performance (macOS/Win)** | Slower (filesystem bridging) | Faster |
| **Portability** | Path-dependent | Path-independent |

---

## What Needs Persistence

```
Does this data need a volume?
│
├── Database files (PostgreSQL, VictoriaMetrics)
│   └── YES --> Data is irreplaceable
│
├── Broker state (EMQX sessions, retained messages)
│   └── YES --> Clients depend on session continuity
│
├── Configuration generated at runtime (Grafana dashboards)
│   └── YES --> User-created config should survive restarts
│
├── TLS certificates (Let's Encrypt via NPM)
│   └── YES --> Renewal state must persist
│
├── Application code (Backend, Frontend)
│   └── NO --> Rebuilt from source, stateless
│
├── Build artifacts (node_modules, .next)
│   └── NO --> Recreated by build process
│
└── Logs (application stdout)
    └── USUALLY NO --> Use Docker log driver or external log system
```

### Persistence Matrix

| Service | Data to Persist | Can Recreate? |
|---------|----------------|---------------|
| **PostgreSQL** | Database files | NO (data loss) |
| **VictoriaMetrics** | Time-series data | NO (historical loss) |
| **VictoriaLogs** | Log entries | Partial (recent logs recoverable) |
| **EMQX** | Sessions, retained msgs | Partial (clients reconnect) |
| **Grafana** | Dashboards, datasources | YES if provisioned via config files |
| **NPM** | Proxy config, TLS certs | NO (reconfiguration needed) |
| **Backend** | Nothing | YES (stateless) |
| **Frontend** | Nothing | YES (stateless) |
| **MQTT Bridge** | Nothing | YES (stateless) |

---

## Backup Strategy

### What to Back Up

```
Backup priority:
│
├── CRITICAL (daily backup)
│   ├── PostgreSQL (pg_dump, not raw files)
│   └── Application .env files (secrets)
│
├── IMPORTANT (weekly backup)
│   ├── VictoriaMetrics data
│   ├── Grafana dashboards (export JSON)
│   └── NPM proxy configuration
│
├── LOW PRIORITY (monthly or on-change)
│   ├── EMQX broker config
│   └── VictoriaLogs (if retention matters)
│
└── NO BACKUP NEEDED
    ├── Application containers (rebuild from git)
    ├── node_modules (npm install)
    └── Docker images (pull from registry)
```

### Backup Methods

| Service | Method | Reason |
|---------|--------|--------|
| **PostgreSQL** | `pg_dump` (logical) | Consistent, portable |
| **PostgreSQL** | NOT raw file copy | Files may be inconsistent mid-write |
| **VictoriaMetrics** | Snapshot API | Built-in backup mechanism |
| **Grafana** | Export dashboards JSON | Version-controllable |
| **NPM** | Copy `data/` directory | SQLite + config files |

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|----|
| **Data inside container** | Lost on `docker rm` | Mount volume to `{Prefix}_Data/` |
| **Not gitignoring `{Prefix}_Data/`** | Huge repo, secrets in git | Add `{Prefix}_Data/` to `.gitignore` |
| **Raw file copy for DB backup** | Inconsistent state | Use `pg_dump` or database tools |
| **Sharing volumes between services** | Write conflicts, coupling | Each service gets its own subdirectory |
| **No volume for database** | Data loss on container recreate | Always mount database data |
| **Mounting `node_modules` from host** | Platform-specific binaries break | Let container install its own `node_modules` |

---

## Development vs Production Volumes

| Aspect | Development | Production |
|--------|------------|------------|
| **Source code** | Bind mount for hot-reload | Copied into image at build |
| **Database** | Bind mount to `{Prefix}_Data/` | Named volume or managed DB |
| **Logs** | Docker stdout | External log driver |
| **Config** | `.env` file on host | Secrets manager or env injection |

---

> **Remember:** If the data matters, mount a volume. If you can rebuild it, skip the volume. Never store irreplaceable data inside a container.
