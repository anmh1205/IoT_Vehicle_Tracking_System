---
name: iot-docker-infra
description: Docker infrastructure patterns for IoT projects. Per-service compose, network topology, volume strategy, environment management. Used when setting up or modifying project infrastructure.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# IoT Docker Infrastructure

> Docker infrastructure principles for IoT projects following the IVM26 pattern.
> **Each service owns its own compose file. No monoliths.**

## Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

---

## Content Map

| File | Description | When to Read |
|------|-------------|--------------|
| `per-service-compose.md` | Per-service compose pattern, service categories, file conventions | Setting up new service, adding compose file |
| `network-topology.md` | Shared network, service discovery, port mapping, reverse proxy | Configuring networking, exposing services |
| `volume-strategy.md` | Data directory, bind mounts vs named volumes, backup strategy | Configuring persistence, data management |
| `environment-strategy.md` | .env patterns, environment tiers, secret management | Setting up env vars, multi-environment config |

---

## Related Skills

| Need | Skill |
|------|-------|
| Deployment workflows | `@[skills/deployment-procedures]` |
| Server management | `@[skills/server-management]` |
| Backend architecture | `@[skills/nodejs-best-practices]` |
| Database setup | `@[skills/database-design]` |

---

## Decision Checklist

Before modifying infrastructure:

- [ ] **Identified service category?** (Application vs Infrastructure)
- [ ] **Compose file per service?** (NOT one giant file)
- [ ] **Network configured?** (Shared `{prefix}-network`)
- [ ] **Volumes mapped?** (Persistent data in `{Prefix}_Data/`)
- [ ] **Environment strategy?** (.env.example committed, .env gitignored)
- [ ] **Secrets secured?** (No defaults, crash on missing)
- [ ] **Healthcheck defined?** (Every service)
- [ ] **Port conflicts checked?** (No overlapping host ports)

---

## Anti-Patterns

**DON'T:**
- Use one giant docker-compose.yml for all services
- Hardcode credentials in compose files
- Store runtime data inside containers
- Commit `.env` files with real secrets
- Provide default fallback passwords for secrets
- Expose all ports to host when only internal access is needed
- Skip healthchecks

**DO:**
- One compose file per service folder
- Use environment variables for all configuration
- Persist data via volumes to `{Prefix}_Data/`
- Crash loudly on missing required secrets
- Use shared Docker network for service discovery
- Define healthchecks for every service
- Separate dev, UAT, and prod configurations
