---
title: "CI/CD Implementation for IoT Vehicle Tracking System"
description: "GitHub Actions CI/CD pipelines for all services, based on IVM26 reference pattern"
status: pending
priority: P1
effort: 6h
branch: feature/coding
tags: [cicd, github-actions, docker, deployment]
created: 2026-02-27
---

# CI/CD Implementation Plan

## Overview

Triển khai GitHub Actions CI/CD cho IoT Vehicle Tracking System (monorepo), học hỏi pattern từ IVM26 và cải thiện: SSH key auth, lint/test gates, path filtering, không hardcode secrets.

## Decisions

| Item | Value |
|------|-------|
| Registry | Docker Hub |
| Deploy | Single VPS via SSH key |
| Branch | `uat` only triggers deploy |
| Path filter | Yes — per-service |
| Network | `tracking-network` (external) |
| Server base | `/opt/tracking/<SERVICE>/` |

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Foundation & Secrets | pending | 30m | [phase-01](./phase-01-foundation-and-secrets.md) |
| 2 | App Services CI/CD | pending | 2h | [phase-02](./phase-02-app-services-cicd.md) |
| 3 | Infra Services CI/CD | pending | 1.5h | [phase-03](./phase-03-infra-services-cicd.md) |
| 4 | Mobile CI/CD | pending | 1h | [phase-04](./phase-04-mobile-cicd.md) |
| 5 | Improvements | pending | 1h | [phase-05](./phase-05-improvements.md) |

## GitHub Secrets Required

| Secret | Purpose |
|--------|---------|
| `DOCKERHUB_USERNAME` | Docker Hub login |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `SSH_DEPLOY_IP` | VPS IP address |
| `SSH_DEPLOY_PORT` | SSH port (default 22) |
| `SSH_DEPLOY_USER` | SSH username |
| `SSH_PRIVATE_KEY` | SSH private key (ed25519) |
| `DISCORD_WEBHOOK_URL` | Deploy notifications |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend build arg |
| `NEXT_PUBLIC_WS_URL` | Frontend build arg |
| `NEXT_PUBLIC_WS_PATH` | Frontend build arg |
| `NEXT_PUBLIC_MQTT_HOST` | Frontend build arg |
| `NEXT_PUBLIC_MQTT_WS_PORT` | Frontend build arg |

## Workflow Files to Create

```
.github/workflows/
├── backend-uat.yml        # Backend: lint → test → build → push → deploy
├── frontend-uat.yml       # Frontend: lint → build → push → deploy
├── mqtt-bridge-uat.yml    # MqttBridge: typecheck → build → push → deploy
├── emqx-uat.yml           # EMQX: SSH deploy config
├── postgresql-uat.yml     # PostgreSQL: SSH deploy config
├── grafana-uat.yml        # Grafana: SSH deploy config
├── npm-uat.yml            # NPM: SSH deploy config
├── victoria-metrics-uat.yml # VictoriaMetrics: SSH deploy
├── victoria-logs-uat.yml  # VictoriaLogs: SSH deploy
└── mobile-uat.yml         # Flutter: Android + iOS parallel
```

## Dependencies

- Docker Hub account with access token
- VPS with Docker + Docker Compose installed
- SSH key pair (ed25519) configured on VPS
- Discord webhook URL
- `tracking-network` Docker network created on VPS
