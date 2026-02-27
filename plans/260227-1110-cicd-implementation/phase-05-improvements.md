# Phase 5: Improvements

## Context
- Parent: [plan.md](./plan.md)
- Depends on: Phases 1–4

## Overview
- **Priority:** P3
- **Status:** pending
- **Description:** Polish CI/CD — add HEALTHCHECK to MqttBridge Dockerfile, verify all compose files, add workflow status badges to README

## Key Insights
- MqttBridge Dockerfile missing HEALTHCHECK — inconsistent with Backend/Frontend
- Current docker-compose.uat.yml files may need `image:` field with Docker Hub username variable
- README should show CI/CD status badges for quick visibility

## Requirements
- MqttBridge Dockerfile: add HEALTHCHECK
- Verify all docker-compose.uat.yml files are deployment-ready
- Add workflow status badges to README.md
- Document deployment guide (server setup prerequisites)

## Related Code Files
- `iot-vehicle-tracking-system/Tracking_MqttBridge/Dockerfile` — modify: add HEALTHCHECK
- `README.md` — modify: add badges
- All `docker-compose.uat.yml` files — verify

## Implementation Steps

### 1. Add HEALTHCHECK to MqttBridge Dockerfile
```dockerfile
# Add before CMD
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1
```
Note: MqttBridge may not have HTTP endpoint — use process check or add a health endpoint.

### 2. Add status badges to README
```markdown
## CI/CD Status
| Service | Status |
|---------|--------|
| Backend | ![Backend](https://github.com/{owner}/{repo}/actions/workflows/backend-uat.yml/badge.svg) |
| Frontend | ![Frontend](https://github.com/{owner}/{repo}/actions/workflows/frontend-uat.yml/badge.svg) |
| MQTT Bridge | ![MqttBridge](https://github.com/{owner}/{repo}/actions/workflows/mqtt-bridge-uat.yml/badge.svg) |
| Mobile | ![Mobile](https://github.com/{owner}/{repo}/actions/workflows/mobile-uat.yml/badge.svg) |
```

### 3. Verify deployment readiness checklist
- [ ] All compose files use correct Docker network name
- [ ] All compose files use `restart: always` or `unless-stopped`
- [ ] Resource limits set for app services
- [ ] Logging configured (json-file, max-size, max-file)
- [ ] env_file references correct path

### 4. Document server prerequisites
Create deployment section in README or docs:
- Docker + Docker Compose v2 installed
- `tracking-network` Docker network created
- SSH key configured for deploy user
- `.env` files placed in each service directory
- Directory structure: `/opt/tracking/Tracking_*/`

## Todo List
- [ ] Add HEALTHCHECK to MqttBridge Dockerfile
- [ ] Verify all docker-compose.uat.yml files
- [ ] Add CI/CD status badges to README
- [ ] Document server setup prerequisites

## Success Criteria
- All 3 app service Dockerfiles have HEALTHCHECK
- README shows live CI/CD status badges
- Server deployment directory structure documented

## Risk Assessment
- **Low:** HEALTHCHECK for MqttBridge depends on app having health endpoint
- **Low:** Badge URLs require correct repo owner/name

## Security Considerations
- Deployment docs must NOT include actual secrets/IPs
- Document secret setup process without exposing values

## Next Steps
- Future: PR check workflows (lint/test on PRs to main)
- Future: Production environment pipeline
- Future: Android signing for Play Store release
