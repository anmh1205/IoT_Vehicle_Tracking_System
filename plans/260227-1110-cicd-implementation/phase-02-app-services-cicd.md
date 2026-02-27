# Phase 2: App Services CI/CD

## Context
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1](./phase-01-foundation-and-secrets.md)
- Reference: IVM26 Backend/Frontend workflow pattern

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Create GitHub Actions workflows for Backend, Frontend, MqttBridge — build Docker image, push Docker Hub, SSH deploy

## Key Insights
- IVM26 pattern: 2 jobs (build-and-push → deploy-uat) with artifact passing
- Improvement: add lint/typecheck/test gates before Docker build
- Monorepo path filter: each workflow only triggers on its service directory changes
- Frontend NEXT_PUBLIC_* vars must be baked at build time via build-args

## Requirements
- Backend workflow: lint → typecheck → test → docker build → push → deploy
- Frontend workflow: lint → typecheck → docker build (with build-args) → push → deploy
- MqttBridge workflow: typecheck → docker build → push → deploy
- All use path filters for monorepo efficiency
- Discord notification on deploy success/failure

## Architecture

### Workflow Pattern (2 jobs)
```
Job 1: quality-and-build
  ├── Checkout
  ├── Quality gates (lint, typecheck, test)
  ├── Docker Login (Docker Hub)
  ├── Setup Docker Buildx
  ├── Build + Push image (tagged :uat + :latest)
  └── Upload docker-compose.uat.yml as artifact

Job 2: deploy-uat (needs: quality-and-build)
  ├── Download artifact
  ├── SCP docker-compose.uat.yml to server
  ├── SSH: docker compose pull + up -d
  └── Discord notification
```

## Related Code Files
- `.github/workflows/backend-uat.yml` — create
- `.github/workflows/frontend-uat.yml` — create
- `.github/workflows/mqtt-bridge-uat.yml` — create
- `iot-vehicle-tracking-system/Tracking_Backend/Dockerfile` — read only
- `iot-vehicle-tracking-system/Tracking_Frontend/Dockerfile` — read only
- `iot-vehicle-tracking-system/Tracking_MqttBridge/Dockerfile` — read only

## Implementation Steps

### 1. Backend Workflow (`backend-uat.yml`)

```yaml
name: Backend UAT Deploy
on:
  push:
    branches: [uat]
    paths:
      - 'iot-vehicle-tracking-system/Tracking_Backend/**'

jobs:
  quality-and-build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: iot-vehicle-tracking-system/Tracking_Backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: iot-vehicle-tracking-system/Tracking_Backend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: iot-vehicle-tracking-system/Tracking_Backend
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/tracking-backend:uat
            ${{ secrets.DOCKERHUB_USERNAME }}/tracking-backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - uses: actions/upload-artifact@v4
        with:
          name: backend-compose
          path: iot-vehicle-tracking-system/Tracking_Backend/docker-compose.uat.yml

  deploy-uat:
    needs: quality-and-build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: backend-compose
      - name: SCP compose file to server
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SSH_DEPLOY_IP }}
          port: ${{ secrets.SSH_DEPLOY_PORT }}
          username: ${{ secrets.SSH_DEPLOY_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: docker-compose.uat.yml
          target: /opt/tracking/Tracking_Backend/
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.SSH_DEPLOY_IP }}
          port: ${{ secrets.SSH_DEPLOY_PORT }}
          username: ${{ secrets.SSH_DEPLOY_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/tracking/Tracking_Backend
            docker compose -f docker-compose.uat.yml pull
            docker compose -f docker-compose.uat.yml up -d
      - name: Discord Notification
        if: always()
        uses: sarisia/actions-status-discord@v1
        with:
          webhook: ${{ secrets.DISCORD_WEBHOOK_URL }}
          title: "Backend UAT Deploy"
          status: ${{ job.status }}
```

### 2. Frontend Workflow (`frontend-uat.yml`)
Same pattern but:
- Path filter: `iot-vehicle-tracking-system/Tracking_Frontend/**`
- Quality: lint + typecheck only (no test)
- Docker build-push with build-args for NEXT_PUBLIC_* from secrets
- Image: `tracking-frontend:uat`
- Server path: `/opt/tracking/Tracking_Frontend/`

### 3. MqttBridge Workflow (`mqtt-bridge-uat.yml`)
Same pattern but:
- Path filter: `iot-vehicle-tracking-system/Tracking_MqttBridge/**`
- Quality: typecheck only
- Image: `tracking-mqtt-bridge:uat`
- Server path: `/opt/tracking/Tracking_MqttBridge/`

## Todo List
- [ ] Create `backend-uat.yml` with lint → typecheck → test → build → push → deploy
- [ ] Create `frontend-uat.yml` with lint → typecheck → build (build-args) → push → deploy
- [ ] Create `mqtt-bridge-uat.yml` with typecheck → build → push → deploy
- [ ] Verify path filters work correctly for monorepo
- [ ] Test Docker build cache with GHA cache

## Success Criteria
- Push to `uat` branch with Backend changes → only backend workflow runs
- Backend: lint/typecheck/test pass → image pushed → deployed on VPS
- Frontend: NEXT_PUBLIC_* vars baked into image via build-args
- Discord notification sent on success/failure

## Risk Assessment
- **Medium:** Frontend build-args — NEXT_PUBLIC_* must be set as GitHub secrets correctly
- **Low:** Docker Buildx cache may miss on first run — subsequent runs faster
- **Low:** SSH key permissions — ensure key has correct format (no passphrase)

## Security Considerations
- SSH key auth (no password) — key stored as GitHub secret
- Docker Hub token (not password) — scoped access token recommended
- NEXT_PUBLIC_* vars in build-args — these are public-facing URLs, acceptable in image
- No `.env` files committed or passed through CI

## Next Steps
- Phase 3: Infra services CI/CD
