# Per-Service Compose

> Every service owns its own compose file. Independent scaling, independent deployment, clear ownership.

---

## Why Per-Service, Not Monolithic

| Factor | Monolithic (1 file) | Per-Service (IVM26) |
|--------|---------------------|---------------------|
| **Deployment** | All-or-nothing | Deploy one service |
| **Scaling** | Scale everything | Scale what needs it |
| **Ownership** | Unclear boundaries | Each folder = one owner |
| **Complexity** | One 500-line file | Many small focused files |
| **CI/CD** | Rebuild all | Rebuild changed service |
| **Onboarding** | Read entire file | Read only your service |

---

## Service Categories

```
IoT Project Services
│
├── Application Services (your code)
│   ├── Backend API         (Tracking_Backend/)
│   ├── Frontend            (Tracking_Frontend/)
│   ├── MQTT Bridge         (Tracking_MqttBridge/)
│   └── Mobile BFF          (Tracking_Mobile/)
│
└── Infrastructure Services (third-party)
    ├── PostgreSQL           (Tracking_PostgreSQL/)
    ├── EMQX Broker          (Tracking_EMQX/)
    ├── VictoriaMetrics      (Tracking_VictoriaMetrics/)
    ├── VictoriaLogs         (Tracking_VictoriaLogs/)
    ├── Grafana              (Tracking_Grafana/)
    └── Nginx Proxy Manager  (Tracking_NPM/)
```

### Key Difference

| Aspect | Application Service | Infrastructure Service |
|--------|--------------------|-----------------------|
| **Dockerfile** | Yes (custom build) | No (use official image) |
| **Build context** | `build: .` | `image: postgres:16` |
| **Config files** | Source code | Config in `etc/` or `init/` |
| **Update cycle** | Every sprint | Rarely, version bumps |

---

## File Structure Per Service

```
Tracking_{ServiceName}/
│
├── docker-compose.yml          # Development (ports exposed to host)
├── docker-compose.uat.yml      # Staging (internal network, proxy)
├── Dockerfile                  # Only for application services
├── .dockerignore               # Only for application services
├── .env.example                # Committed, documents required vars
├── .env                        # Gitignored, actual values
│
├── init/                       # Infrastructure: init scripts (SQL, etc.)
├── etc/                        # Infrastructure: config files
└── src/                        # Application: source code
```

---

## When to Split vs Merge Compose Files

```
Decision: Should this be its own compose file?
│
├── Does it have its own folder (Tracking_{Name}/)?
│   └── YES --> Own compose file
│
├── Is it a sidecar tightly coupled to another service?
│   └── YES --> Same compose file (e.g., log collector with app)
│
├── Can it be deployed independently?
│   └── YES --> Own compose file
│
└── Is it a development-only tool (mailhog, adminer)?
    └── YES --> Own compose file OR a shared dev-tools.yml
```

---

## Compose File Conventions

### Service Naming

| Convention | Rule | Example |
|------------|------|---------|
| **service name** | lowercase, hyphenated | `tracking-backend` |
| **container_name** | match service name | `tracking-backend` |
| **image tag** | `{project}-{service}:latest` | `tracking-backend:latest` |

### Standard Fields (Every Service)

| Field | Required | Purpose |
|-------|----------|---------|
| `container_name` | Yes | Predictable name for service discovery |
| `restart` | Yes | `unless-stopped` (dev), `always` (prod) |
| `networks` | Yes | Shared project network |
| `healthcheck` | Yes | Verify service is ready |
| `env_file` | Yes | Load `.env` file |
| `ports` | Dev only | Expose to host for local development |
| `volumes` | If stateful | Persist data outside container |

### Restart Policy Selection

```
Which restart policy?
│
├── Development
│   └── unless-stopped (survives reboot, not manual stop)
│
├── Production / UAT
│   └── always (always restart, including after reboot)
│
└── One-shot tasks (migrations, seeds)
    └── no (run once, exit)
```

### Healthcheck Patterns

| Service Type | Healthcheck |
|-------------|-------------|
| **HTTP API** | `curl -f http://localhost:{port}/health` |
| **PostgreSQL** | `pg_isready -U {user}` |
| **MQTT Broker** | `emqx_ctl status` or TCP check |
| **Redis** | `redis-cli ping` |
| **VictoriaMetrics** | `curl -f http://localhost:8428/-/healthy` |

---

## Startup Order

```
Infrastructure FIRST, then Application:
│
│  Phase 1: Databases
│  ├── PostgreSQL
│  ├── VictoriaMetrics
│  └── VictoriaLogs
│
│  Phase 2: Message Brokers
│  └── EMQX
│
│  Phase 3: Application Services
│  ├── Backend API (depends on PostgreSQL, VictoriaMetrics)
│  ├── MQTT Bridge (depends on EMQX, VictoriaMetrics)
│  └── Frontend (depends on Backend API)
│
│  Phase 4: Monitoring / Proxy
│  ├── Grafana
│  └── Nginx Proxy Manager
```

### Handling Dependencies Across Compose Files

Per-service compose files cannot use `depends_on` across files. Instead:

| Strategy | When |
|----------|------|
| **Startup script** | `start-all.sh` that starts services in order |
| **Healthcheck + retry** | App retries connection until dependency is ready |
| **Connection pooling** | Pool handles reconnection automatically |

> **Principle:** Applications MUST handle dependency unavailability gracefully. Never assume infrastructure is ready at startup. Retry with backoff.

---

> **Remember:** Per-service compose is about ownership and independence. Each folder is a deployable unit.
