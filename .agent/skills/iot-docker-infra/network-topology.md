# Network Topology

> All services share one Docker network. Service discovery by container name. Expose only what needs host access.

---

## Shared Network Pattern

```
{prefix}-network (e.g., tracking-network)
│
├── Created externally (not by any single compose file)
│   └── docker network create tracking-network
│
├── Referenced in every compose file as external
│   └── networks:
│         tracking-network:
│           external: true
│
└── All containers on this network can reach each other
    └── By container_name (DNS resolution)
```

### Why External Network

| Approach | Problem |
|----------|---------|
| **Default bridge per compose** | Services in different compose files cannot talk |
| **Shared external network** | All services discover each other by name |

---

## Service Discovery

### How It Works

```
Container A wants to reach Container B:
│
├── Same Docker network?
│   ├── YES --> Use container_name as hostname
│   │          e.g., postgresql://tracking-postgresql:5432
│   │
│   └── NO  --> Cannot reach (add to same network)
│
└── From host machine?
    └── Use localhost:{mapped_port}
       e.g., postgresql://localhost:5432
```

### Connection String Pattern

| Context | Host | Example |
|---------|------|---------|
| **Container-to-container** | `container_name` | `tracking-postgresql` |
| **Host-to-container** | `localhost` | `localhost:5432` |
| **External-to-container** | `server_ip` or domain | `api.example.com` |

---

## Port Mapping Strategy

### Decision: Expose to Host or Keep Internal?

```
Should this port be exposed to host?
│
├── Developer needs direct access? (DB client, browser, API testing)
│   └── YES --> Map to host port (development only)
│
├── Only other containers need access?
│   └── NO host mapping needed (internal only)
│
├── Reverse proxy handles external access?
│   └── NO host mapping needed (proxy routes traffic)
│
└── Monitoring/debugging tool?
    └── Map to host port (development), remove in prod
```

### Port Allocation Table (IoT Project)

| Service | Internal Port | Dev Host Port | UAT/Prod Host Port |
|---------|--------------|---------------|---------------------|
| **Backend API** | 3000 | 3000 | None (via proxy) |
| **Frontend** | 3000 | 3002 | None (via proxy) |
| **PostgreSQL** | 5432 | 5432 | None (internal) |
| **EMQX MQTT** | 1883 | 1883 | 1883 (devices connect) |
| **EMQX Dashboard** | 18083 | 18083 | None (internal) |
| **VictoriaMetrics** | 8428 | 8428 | None (internal) |
| **VictoriaLogs** | 9428 | 9428 | None (internal) |
| **Grafana** | 3000 | 3001 | None (via proxy) |
| **NPM HTTP** | 80 | 80 | 80 |
| **NPM HTTPS** | 443 | 443 | 443 |
| **NPM Admin** | 81 | 81 | None (internal) |

### Port Conflict Prevention

| Rule | Why |
|------|-----|
| **Document all host ports** | Prevent conflicts across services |
| **Use non-standard host ports** | Avoid clashes (Frontend 3000 internally, 3002 on host) |
| **Remove host ports in UAT/Prod** | Only proxy exposes 80/443 |

---

## Reverse Proxy Decision

```
When to add a reverse proxy (NPM/Nginx)?
│
├── Multiple HTTP services need external access?
│   └── YES --> Reverse proxy (route by domain/path)
│
├── Need TLS termination?
│   └── YES --> Reverse proxy with Let's Encrypt
│
├── Single service, direct access OK?
│   └── NO proxy needed
│
└── Development environment?
    └── Usually no proxy (direct port access)
```

### Proxy Routing Pattern

```
External Request
│
├── api.example.com --> NPM --> tracking-backend:3000
├── app.example.com --> NPM --> tracking-frontend:3000
├── grafana.example.com --> NPM --> tracking-grafana:3000
└── mqtt.example.com:1883 --> Direct to EMQX (TCP, not HTTP)
```

---

## Single Network vs Multiple Networks

```
How many Docker networks?
│
├── Small/Medium project (< 15 services)
│   └── Single shared network (simpler, sufficient)
│
├── Large project with security zones
│   ├── frontend-network (proxy + frontend)
│   ├── backend-network (API + databases)
│   └── iot-network (MQTT broker + bridge)
│   Services on multiple networks bridge zones
│
└── Multi-tenant or strict isolation needed
    └── Network per tenant or per zone
```

### IVM26 Recommendation

| Project Size | Strategy |
|-------------|----------|
| **< 15 services** | Single `{prefix}-network` |
| **15-30 services** | Consider 2-3 zone networks |
| **30+ services** | Kubernetes, not Docker Compose |

> **Principle for IoT projects:** Start with one shared network. Split only when you have a concrete security or isolation requirement, not preemptively.

---

## Network Troubleshooting

| Symptom | Check |
|---------|-------|
| Container cannot reach another | Both on same network? (`docker network inspect`) |
| Connection refused | Target container running? Port correct? |
| DNS resolution fails | Using container_name (not service name)? |
| Intermittent timeouts | Healthcheck passing? Service overloaded? |

---

> **Remember:** Docker networking is simple when you follow the pattern. One external network, container names for discovery, host ports only for development access.
