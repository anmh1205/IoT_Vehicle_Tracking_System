# Phase 1: Foundation & Secrets

## Context
- Parent: [plan.md](./plan.md)
- Reference: IVM26 workflow patterns

## Overview
- **Priority:** P0 — blocks all other phases
- **Status:** pending
- **Description:** Create `.github/workflows/` directory, prepare docker-compose.uat.yml files for deployment, document secrets setup

## Key Insights
- Current docker-compose.uat.yml files use `build:` context — need separate deploy versions using `image:` for CI/CD pull-based deploy
- MqttBridge has no docker-compose.uat.yml — need to create
- IVM26 pattern: upload docker-compose as artifact → SCP to server → docker compose pull + up

## Requirements
- `.github/workflows/` directory created
- docker-compose.uat.yml files updated for image-based deploy (not build-based)
- MqttBridge docker-compose.uat.yml created
- Infra services have docker-compose.uat.yml (or reuse existing docker-compose.yml)

## Related Code Files
- `iot-vehicle-tracking-system/Tracking_Backend/docker-compose.uat.yml` — modify: change `build:` to `image:`
- `iot-vehicle-tracking-system/Tracking_Frontend/docker-compose.uat.yml` — modify: change `build:` to `image:`
- `iot-vehicle-tracking-system/Tracking_MqttBridge/docker-compose.yml` — reference for creating uat version
- `.github/workflows/` — create directory

## Implementation Steps

### 1. Create workflows directory
```bash
mkdir -p .github/workflows
```

### 2. Update Backend docker-compose.uat.yml
Change from build-based to image-based:
```yaml
services:
  backend:
    image: ${DOCKERHUB_USERNAME}/tracking-backend:uat
    container_name: tracking-backend
    ports:
      - '3000:3000'
    env_file: .env
    restart: always
    networks:
      - tracking-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.25'
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'
networks:
  tracking-network:
    external: true
```

### 3. Update Frontend docker-compose.uat.yml
Same pattern — `image:` instead of `build:`

### 4. Create MqttBridge docker-compose.uat.yml
```yaml
services:
  mqtt-bridge:
    image: ${DOCKERHUB_USERNAME}/tracking-mqtt-bridge:uat
    container_name: tracking-mqtt-bridge
    env_file: .env
    restart: always
    networks:
      - tracking-network
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'
networks:
  tracking-network:
    external: true
```

### 5. Verify infra services docker-compose.yml files
Ensure EMQX, PostgreSQL, Grafana, NPM, VictoriaMetrics, VictoriaLogs all have usable compose files for deploy.

## Todo List
- [ ] Create `.github/workflows/` directory
- [ ] Update Backend docker-compose.uat.yml (build → image)
- [ ] Update Frontend docker-compose.uat.yml (build → image)
- [ ] Create MqttBridge docker-compose.uat.yml
- [ ] Verify all infra docker-compose.yml files are deploy-ready

## Success Criteria
- All docker-compose.uat.yml files use `image:` not `build:`
- `.github/workflows/` directory exists
- All compose files reference `tracking-network` (external)

## Risk Assessment
- Low: straightforward file creation/modification

## Security Considerations
- docker-compose.uat.yml must NOT contain hardcoded secrets
- Use `env_file: .env` for runtime secrets (managed on server)
- `${DOCKERHUB_USERNAME}` in image name avoids hardcoding

## Next Steps
- Phase 2: Create app service workflows
