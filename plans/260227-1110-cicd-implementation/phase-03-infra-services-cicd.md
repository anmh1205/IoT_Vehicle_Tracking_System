# Phase 3: Infra Services CI/CD

## Context
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1](./phase-01-foundation-and-secrets.md)
- Reference: IVM26 PostgreSQL/EMQX/NPM/Victoria* pattern

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** Create GitHub Actions workflows for config-based infra services — SSH into server, git pull, docker compose up

## Key Insights
- Infra services don't need Docker build/push — they use official images
- Deploy = SSH → git pull monorepo → docker compose up with updated config
- IVM26 pattern: single job, SSH directly, git pull + compose up
- Monorepo difference: all configs in one repo, git pull gets everything — but path filter ensures only relevant service workflow triggers

## Requirements
- 6 workflows: EMQX, PostgreSQL, Grafana, NPM, VictoriaMetrics, VictoriaLogs
- Each only triggers on path changes for its service directory
- Single job: SSH → navigate to service dir → git pull → docker compose up
- Discord notification

## Architecture

### Workflow Pattern (1 job)
```
Job: deploy-uat
  ├── SSH into server
  ├── cd /opt/tracking/<SERVICE>
  ├── git pull origin uat (or SCP compose + config files)
  ├── docker compose pull
  ├── docker compose up -d
  └── Discord notification
```

**Note:** Since this is a monorepo, we have 2 options:
- **Option A:** Git clone/pull monorepo on server, symlink service dirs
- **Option B (recommended):** SCP only the service directory to server — simpler, no git needed on server

## Related Code Files
- `.github/workflows/emqx-uat.yml` — create
- `.github/workflows/postgresql-uat.yml` — create
- `.github/workflows/grafana-uat.yml` — create
- `.github/workflows/npm-uat.yml` — create
- `.github/workflows/victoria-metrics-uat.yml` — create
- `.github/workflows/victoria-logs-uat.yml` — create

## Implementation Steps

### 1. Template pattern for all infra services

```yaml
name: "{Service} UAT Deploy"
on:
  push:
    branches: [uat]
    paths:
      - 'iot-vehicle-tracking-system/Tracking_{Service}/**'

jobs:
  deploy-uat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: SCP config files to server
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SSH_DEPLOY_IP }}
          port: ${{ secrets.SSH_DEPLOY_PORT }}
          username: ${{ secrets.SSH_DEPLOY_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: "iot-vehicle-tracking-system/Tracking_{Service}/*"
          target: /opt/tracking/
          strip_components: 1
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.SSH_DEPLOY_IP }}
          port: ${{ secrets.SSH_DEPLOY_PORT }}
          username: ${{ secrets.SSH_DEPLOY_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/tracking/Tracking_{Service}
            docker compose pull
            docker compose up -d
      - name: Discord Notification
        if: always()
        uses: sarisia/actions-status-discord@v1
        with:
          webhook: ${{ secrets.DISCORD_WEBHOOK_URL }}
          title: "{Service} UAT Deploy"
          status: ${{ job.status }}
```

### 2. Service-specific path mappings

| Workflow | Path filter | Server dir | Compose file |
|----------|------------|------------|-------------|
| emqx-uat.yml | `Tracking_EMQX/**` | `/opt/tracking/Tracking_EMQX/` | docker-compose.yml |
| postgresql-uat.yml | `Tracking_PostgreSQL/**` | `/opt/tracking/Tracking_PostgreSQL/` | docker-compose.yml |
| grafana-uat.yml | `Tracking_Grafana/**` | `/opt/tracking/Tracking_Grafana/` | docker-compose.yml |
| npm-uat.yml | `Tracking_NPM/**` | `/opt/tracking/Tracking_NPM/` | docker-compose.yml |
| victoria-metrics-uat.yml | `Tracking_VictoriaMetrics/**` | `/opt/tracking/Tracking_VictoriaMetrics/` | docker-compose.yml |
| victoria-logs-uat.yml | `Tracking_VictoriaLogs/**` | `/opt/tracking/Tracking_VictoriaLogs/` | docker-compose.yml |

## Todo List
- [ ] Create `emqx-uat.yml`
- [ ] Create `postgresql-uat.yml`
- [ ] Create `grafana-uat.yml`
- [ ] Create `npm-uat.yml`
- [ ] Create `victoria-metrics-uat.yml`
- [ ] Create `victoria-logs-uat.yml`

## Success Criteria
- Push config change to EMQX dir → only EMQX workflow runs
- Config files SCP'd to correct server path
- Docker compose pull + up -d succeeds
- Discord notification sent

## Risk Assessment
- **Medium:** `strip_components` in SCP — verify correct directory structure on server
- **Low:** Docker compose file references (volumes, networks) must be consistent with server setup
- **Low:** EMQX may need special handling for config reload vs full restart

## Security Considerations
- No secrets in config files committed to repo
- `.env` files managed separately on server (not in CI)
- SSH key auth only

## Next Steps
- Phase 4: Mobile CI/CD
