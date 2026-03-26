# Phase 02 - Bootstrap Infra Runtime Profiles

## Context links
- Plan: [plan.md](./plan.md)
- Previous phase: [phase-01-define-canonical-contract-and-mapping-dsl.md](./phase-01-define-canonical-contract-and-mapping-dsl.md)

## Overview
- Priority: P0
- Status: pending
- Description: Tạo profile deployment chuẩn cho local/uat/prod để agent có thể spin-up infra trong 1 lệnh.

## Key insights
- Repo đã tách compose theo service, phù hợp mô hình ghép profile.
- EMQX data integration support sink/source, async, batch, buffer queue; cần cấu hình theo profile.
- VictoriaMetrics/VictoriaLogs cần profile retention + resource limits theo environment.

## Requirements
- Functional:
1. Có `infra-profile.yaml` cho local, uat, prod.
2. Sinh compose override từ profile (ports, retention, resources, auth, tls).
3. Có healthcheck matrix cho EMQX/Postgres/VM/VL.
4. Có startup order + dependency check script.
- Non-functional:
1. Bootstrap local <= 10 phút.
2. Không hard-code credential; dùng `.env` + secret refs.

## Architecture
- Profile layers:
1. `base` (common stack contract)
2. `env/local|uat|prod`
3. `site overrides` (tenant/project specific)
- Bootstrap flow:
1. Validate profile
2. Render compose/env templates
3. Bring up infra
4. Run health gate

## Related code files
- Files to modify:
1. `iot-vehicle-tracking-system-cloud/Tracking_EMQX/docker-compose.yml`
2. `iot-vehicle-tracking-system-cloud/Tracking_VictoriaMetrics/docker-compose.yml`
3. `iot-vehicle-tracking-system-cloud/Tracking_VictoriaLogs/docker-compose.yml`
- Files to create:
1. `resources/templates/iot-infra/infra-profile.yaml`
2. `tools/iot-infra-codegen/src/render-compose.ts`
3. `tools/iot-infra-codegen/src/render-env.ts`
4. `tools/iot-infra-codegen/src/health-gate.ts`
- Files to delete: none

## Implementation steps
1. Define profile schema (retention, resources, ports, tls, auth, networks).
2. Build template renderer cho compose/env.
3. Add bootstrap command: `iot-infra bootstrap --profile uat`.
4. Add health gate command: `iot-infra healthcheck`.
5. Add rollback command: `iot-infra down --safe`.

## Todo list
- [ ] Hoàn tất profile schema v1.
- [ ] Hoàn tất compose/env renderer.
- [ ] Hoàn tất bootstrap + health gate scripts.
- [ ] Hoàn tất runbook startup order.

## Success criteria
- Agent dựng stack local/uat bằng 1 command và pass health gate.
- Profile đổi retention/resource không cần sửa compose tay.

## Risk assessment
- Risk: profile drift giữa environments.
- Mitigation: locked schema + generated files + CI diff check.

## Security considerations
- Bắt buộc TLS và auth config cho prod profile.
- Không expose admin ports ra public mặc định.

## Next steps
- Đưa generated runtime vào Phase 03 để gắn routing/storage pipelines từ contract.
