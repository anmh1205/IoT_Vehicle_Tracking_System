# Project Checklist

> "A new IoT project should be fully structured before the first line of application code is written."

---

## 1. Pre-Development Checklist

### Identity and Naming

```
[ ] Chosen project prefix?
│   ├── Short (3-12 chars): _______________
│   ├── Unique within org: YES / NO
│   ├── Descriptive: YES / NO
│   └── Format: PascalCase, no spaces
│
[ ] Defined project name?
│   └── Full name: _______________
│       Example: "IoT Vehicle Tracking System"
│
[ ] Listed all services?
    ├── Application services:
    │   ├── [ ] {Prefix}_Backend
    │   ├── [ ] {Prefix}_Frontend
    │   ├── [ ] {Prefix}_MqttBridge
    │   ├── [ ] {Prefix}_Mobile (if needed)
    │   └── [ ] {Prefix}_Worker (if needed)
    │
    └── Infrastructure services:
        ├── [ ] {Prefix}_PostgreSQL
        ├── [ ] {Prefix}_EMQX
        ├── [ ] {Prefix}_VictoriaMetrics
        ├── [ ] {Prefix}_VictoriaLogs
        ├── [ ] {Prefix}_Grafana
        └── [ ] {Prefix}_NPM
```

---

## 2. Architecture Checklist

### Domain Identification

```
[ ] Listed all business entities?
│   └── Example: Vehicle, Driver, Device, Alert, Trip, Geofence
│
[ ] Clustered entities into domains?
│   ├── Core domains (universal):
│   │   ├── [ ] auth
│   │   ├── [ ] device
│   │   ├── [ ] iot
│   │   ├── [ ] firmware
│   │   └── [ ] dashboard
│   │
│   └── Domain-specific:
│       ├── [ ] _______________
│       ├── [ ] _______________
│       ├── [ ] _______________
│       ├── [ ] _______________
│       └── [ ] _______________
│
[ ] Defined domain relationships?
    └── Which domains call which?
```

### Data Architecture

```
[ ] Designed database split?
│   ├── [ ] PostgreSQL: relational data (users, devices, config)
│   ├── [ ] VictoriaMetrics: time-series (telemetry, sensor readings)
│   └── [ ] VictoriaLogs: event logs (device events, audit trail)
│
[ ] Designed PostgreSQL schema?
│   ├── [ ] Tables listed with columns
│   ├── [ ] Foreign keys defined
│   ├── [ ] Indexes planned
│   └── [ ] Init scripts numbered (01-xxx.sql, 02-xxx.sql)
│
[ ] Defined VictoriaMetrics metrics?
│   ├── [ ] Metric names (e.g., device_gps_latitude)
│   ├── [ ] Labels (device_id, customer_id)
│   └── [ ] Retention period
│
[ ] Defined VictoriaLogs streams?
    ├── [ ] Log format (JSON structured)
    ├── [ ] Stream labels
    └── [ ] Retention period
```

---

## 3. MQTT Checklist

### Topic Structure

```
[ ] Defined MQTT topic hierarchy?
│   ├── [ ] {prefix}/devices/{device_id}/telemetry
│   ├── [ ] {prefix}/devices/{device_id}/status
│   ├── [ ] {prefix}/devices/{device_id}/command
│   ├── [ ] {prefix}/devices/{device_id}/ota
│   └── [ ] Custom topics: _______________
│
[ ] Defined message payload format?
│   ├── [ ] JSON schema for telemetry
│   ├── [ ] JSON schema for commands
│   └── [ ] JSON schema for status
│
[ ] Planned MQTT security?
│   ├── [ ] Device authentication (username/password or certificate)
│   ├── [ ] ACL rules (per-device topic access)
│   └── [ ] TLS for production
│
[ ] Chosen MQTT broker?
    ├── [ ] EMQX (recommended, feature-rich)
    ├── [ ] Mosquitto (lightweight)
    └── [ ] Other: _______________
```

---

## 4. Infrastructure Checklist

### Docker Setup

```
[ ] Created Docker network?
│   └── docker network create {prefix}-network
│
[ ] Created docker-compose.yml for each service?
│   ├── [ ] {Prefix}_PostgreSQL/docker-compose.yml
│   ├── [ ] {Prefix}_EMQX/docker-compose.yml
│   ├── [ ] {Prefix}_VictoriaMetrics/docker-compose.yml
│   ├── [ ] {Prefix}_VictoriaLogs/docker-compose.yml
│   ├── [ ] {Prefix}_Grafana/docker-compose.yml
│   ├── [ ] {Prefix}_NPM/docker-compose.yml
│   ├── [ ] {Prefix}_Backend/docker-compose.yml
│   └── [ ] {Prefix}_Frontend/docker-compose.yml
│
[ ] Created {Prefix}_Data/ directory?
│   └── Added to .gitignore
│
[ ] Verified all services start?
    └── Each service: docker-compose up -d → healthy
```

### Environment Variables

```
[ ] Created .env.example for each service?
│
[ ] Defined all required variables?
│   ├── [ ] Database credentials
│   ├── [ ] MQTT broker URL
│   ├── [ ] VictoriaMetrics URL
│   ├── [ ] VictoriaLogs URL
│   ├── [ ] Session/JWT secret
│   ├── [ ] CORS origins
│   └── [ ] Service ports
│
[ ] No default passwords in code?
│   └── All secrets REQUIRED, fail loudly if missing
│
[ ] .env files in .gitignore?
```

---

## 5. Project Setup Checklist

### Repository

```
[ ] Git repository initialized?
│
[ ] .gitignore configured?
│   ├── [ ] node_modules/
│   ├── [ ] {Prefix}_Data/
│   ├── [ ] .env files
│   ├── [ ] dist/ and build/
│   └── [ ] IDE files (.vscode/, .idea/)
│
[ ] CLAUDE.md created at root?
│   ├── [ ] Project overview
│   ├── [ ] Project structure
│   ├── [ ] Common commands
│   ├── [ ] Architecture description
│   ├── [ ] Service URLs
│   └── [ ] Environment setup guide
│
[ ] SystemDesign/ documentation created?
    ├── [ ] Database schema docs
    ├── [ ] API endpoint docs
    ├── [ ] MQTT topic docs
    └── [ ] Development phase plan
```

### Application Scaffolding

```
[ ] Backend scaffolded?
│   ├── [ ] package.json with scripts (dev, test, build)
│   ├── [ ] tsconfig.json
│   ├── [ ] src/ directory structure
│   ├── [ ] Entry point (src/index.ts)
│   ├── [ ] Error handling middleware
│   └── [ ] Health check endpoint
│
[ ] Frontend scaffolded?
│   ├── [ ] Next.js or React project initialized
│   ├── [ ] TypeScript configured
│   ├── [ ] Tailwind CSS configured
│   ├── [ ] API client configured
│   └── [ ] Auth flow stubbed
│
[ ] shared-types/ initialized?
│   ├── [ ] tsconfig.json
│   ├── [ ] Core type files
│   └── [ ] Path aliases in consuming services
│
[ ] npm run dev works in all services?
```

---

## 6. Development Phases Checklist

```
[ ] Planned development phases?
│   ├── [ ] Phase 1: Foundation (DB + Docker + Scaffold)
│   ├── [ ] Phase 2: Backend core (Auth → Device → IoT)
│   ├── [ ] Phase 3: MQTT Bridge + Real-time
│   ├── [ ] Phase 4: Frontend (Auth → Devices → Domains → Dashboard)
│   ├── [ ] Phase 5: Advanced (Maps, Alerts, Analytics, Reports)
│   └── [ ] Phase 6: Mobile (if applicable)
│
[ ] Identified parallel execution opportunities?
│   └── Phase 3 parallel with Phase 4A
│
[ ] Defined completion criteria per phase?
│
[ ] Assigned agents/developers per phase? (if multi-agent)
```

---

## 7. Quick Start Template

### Minimum Viable Project Structure

```
{Project_Root}/
├── {Prefix}_Backend/
│   ├── src/index.ts
│   ├── package.json
│   └── tsconfig.json
├── {Prefix}_Frontend/
│   ├── src/
│   ├── package.json
│   └── next.config.ts
├── {Prefix}_PostgreSQL/
│   ├── init/01-users.sql
│   └── docker-compose.yml
├── {Prefix}_EMQX/
│   └── docker-compose.yml
├── shared-types/
│   └── src/index.ts
├── CLAUDE.md
├── .gitignore
└── README.md
```

### First 10 Commands

```
1. mkdir {Project_Root} && cd {Project_Root}
2. git init
3. Create CLAUDE.md (project instructions)
4. Create .gitignore
5. mkdir {Prefix}_PostgreSQL && create docker-compose.yml + init/
6. mkdir {Prefix}_EMQX && create docker-compose.yml
7. docker network create {prefix}-network
8. cd {Prefix}_PostgreSQL && docker-compose up -d
9. npx create-next-app {Prefix}_Frontend
10. mkdir {Prefix}_Backend && npm init -y && npm i express typescript
```

---

## Decision: What to Prioritize

```
Limited time? Follow this priority:
│
├── MUST HAVE (Day 1):
│   ├── CLAUDE.md
│   ├── PostgreSQL with init scripts
│   ├── Backend scaffold with auth
│   └── Docker network
│
├── SHOULD HAVE (Week 1):
│   ├── All infrastructure docker-compose files
│   ├── Backend core domains (device, iot)
│   ├── MQTT Bridge connected
│   └── Frontend auth + navigation
│
└── NICE TO HAVE (Week 2+):
    ├── Grafana dashboards
    ├── Advanced features (maps, analytics)
    ├── Mobile app
    └── CI/CD pipeline
```

---

> **Rule:** Do not write application code until this checklist is at least 70% complete. Foundation shortcuts create exponential rework.
