---
name: iot-project-pattern
description: IoT project architecture pattern. Monorepo layout, naming conventions, domain modeling, phase planning. Used when starting new IoT monitoring/tracking projects.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# IoT Project Pattern (IVM26)

> "Structure the project before writing a single line of code. Naming, layout, and phasing determine whether the system scales or collapses."

## Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

---

## Content Map

| File | Description | When to Read |
|------|-------------|--------------|
| `naming-convention.md` | {Prefix}_ naming pattern, service names, Docker networks | Starting a new IoT project, naming services |
| `monorepo-layout.md` | Flat monorepo structure, per-service isolation, shared-types | Setting up project structure |
| `domain-modeling.md` | Business entities to domains, core vs domain-specific modules | Designing backend architecture |
| `phase-planning.md` | 6-phase development order, parallel execution, phase skipping | Planning development roadmap |
| `project-checklist.md` | Complete startup checklist for new IoT projects | Kickoff, project review |

---

## Related Skills

| Need | Skill |
|------|-------|
| Docker per-service setup | `@[skills/iot-docker-infra]` |
| Backend domain-driven design | `@[skills/iot-backend-ddd]` |
| PostgreSQL + VictoriaMetrics + VictoriaLogs | `@[skills/iot-data-architecture]` |
| MQTT topic design and bridge | `@[skills/iot-mqtt-pipeline]` |
| API endpoint design | `@[skills/api-patterns]` |
| Database schema design | `@[skills/database-design]` |

---

## Core Principle

**"Convention over configuration, isolation over coupling."**

- Every service owns its own build, deploy, and config
- Naming is deterministic -- derive service names from the prefix
- Domains emerge from business entities, not from technical layers
- Phases are ordered by dependency, not by team preference

---

## Decision Checklist

Before starting a new IoT project:

- [ ] **Chosen a project prefix?** (short, unique, descriptive)
- [ ] **Listed all services?** (app services + infrastructure)
- [ ] **Defined flat monorepo layout?** (no nesting services inside src/)
- [ ] **Identified core domains?** (auth, device, iot, firmware)
- [ ] **Identified project-specific domains?** (vehicle, sensor, machine...)
- [ ] **Designed database split?** (relational vs time-series vs logs)
- [ ] **Created CLAUDE.md?** (AI agent instructions at root)
- [ ] **Planned development phases?** (foundation first, frontend last)

---

## Anti-Patterns

**DON'T:**
- Nest services inside a shared src/ directory
- Use a single docker-compose.yml for all services
- Use a single package.json for the entire monorepo
- Start coding frontend before backend APIs exist
- Create domains based on technical layers (controllers/, models/)
- Skip the naming convention and use ad-hoc folder names

**DO:**
- Keep every service at root level with its own config
- Give each service its own docker-compose.yml and Dockerfile
- Derive all names from the chosen prefix
- Build foundation (DB + Docker) before application code
- Create domains based on business entities
- Write CLAUDE.md before writing any code
