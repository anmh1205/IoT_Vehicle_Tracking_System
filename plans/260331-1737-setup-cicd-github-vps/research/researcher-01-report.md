# Research Report: GitHub Actions CI/CD for IoT Monorepo

**Context**: E:/anmh1205/IoT_Vehicle_Tracking_System  
**Scope**: CI (build/test/lint/security gate) + CD trigger strategy for Backend / Frontend / MQTT Bridge / Mobile + infra compose validation  
**Date**: 2026-03-31

## 1) Pipeline matrix theo service

| Service | CI steps | Release artifact | Notes |
|---|---|---|---|
| Backend | `npm ci` → lint → `tsc --noEmit` → test → build | Docker image + `docker-compose.uat.yml` | Current workflow already does quality + image push + deploy on `uat` |
| Frontend | `npm ci` → lint → typecheck → build | Docker image | Add PR CI to catch Next.js regressions before merge |
| MQTT Bridge | `npm ci` → typecheck → build → test(if present) | Docker image | Keep same gate as backend, but lighter if no unit tests yet |
| Mobile | `flutter pub get` → analyze/test → build apk/appbundle on release | APK/AAB | CI PR gate should stop at analyze/test; build artifacts only on tag/release |
| Infra compose validation | `docker compose config` + optional health smoke | None / compose bundle artifact | Validate backend/frontend/mqtt/emqx/postgres/victoria/grafana compose files in PR |

## 2) Trigger strategy

- **PR**: main gate. Run per-path CI only, no deploy. Use `paths-filter` to isolate service jobs.
- **push to feature branches**: optional fast CI for changed service only; good for early feedback.
- **push to `uat`**: deploy trigger for runtime services after CI passes.
- **manual `workflow_dispatch`**: for hotfix/redeploy, compose validation, and release promotion.
- **release tags**: `v*` or `backend-v*`, `frontend-v*`, etc. for immutable production artifacts.
- **path filters**: required, because repo is monorepo and current workflows already show per-service path-scoped triggers.

## 3) Cache/build acceleration

- **npm**: `actions/setup-node@v4` cache + lockfile key. Expected save: **25-45%** on warm runs.
- **Flutter**: cache `~/.pub-cache`, `~/.gradle`, and Flutter SDK via setup action. Expected save: **20-35%**.
- **Docker layer cache**: Buildx `cache-from/cache-to: type=gha`. Expected save: **30-60%** on repeat image builds.
- **Compose validation**: no build cache needed; keep it cheap by using config-only checks.

## 4) Security/compliance gates

- **Secret scan**: gitleaks or GitHub secret scanning in PR and push.
- **Dependency audit**: npm audit / `pnpm audit` equivalent for JS services; Flutter `pub outdated`/dependency review if available.
- **SBOM**: generate SBOM for Docker images and release artifacts (Syft or GitHub artifact attestation flow).
- **Container scan**: Trivy on built images before push/deploy.
- **Policy**: block merge/deploy on high/critical findings; allow documented exceptions only.

## 5) Artifact/release strategy

- Tag images with **immutable version** + **service** + **git SHA**.
- Keep `uat` and `latest` only for staging convenience; never as sole production pointer.
- Store compose file / release manifest as artifact for each deploy.
- Rollback-friendly convention: deploy by exact image digest or semver tag, not mutable latest.
- Prefer one release bundle per service; avoid cross-service monolithic releases unless a migration requires it.

## 6) Risk table

| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Over-triggered workflows | High | Medium | Use path filters + split workflows per service |
| Slow CI on monorepo | High | High | Cache aggressively; separate quick PR gates from deploy jobs |
| Secret leak in PR | Medium | High | Secret scan + branch protection + required checks |
| Broken compose after image push | Medium | High | `docker compose config` + smoke validation before deploy |
| Rollback ambiguity | Medium | High | Immutable tags/digests, no deploy from `latest` alone |
| Mobile build time too long | Medium | Medium | CI analyze/test only on PR; release build on tags only |

## 7) Architecture options

### A. Đơn giản
- 1 workflow per service, PR + `uat` push only.
- Pros: easy to understand, low setup cost.
- Cons: duplicated logic, harder to maintain at scale.

### B. Cân bằng
- Reusable workflow templates + per-service path filters + shared security job.
- Pros: good DRY, easier to add services, still readable.
- Cons: slightly more YAML indirection.

### C. Enterprise-lite
- Reusable workflows + matrix + environments + required security gates + release promotion workflow.
- Pros: best governance, clear promotion path, rollback-friendly.
- Cons: more moving parts, more initial setup.

## Recommendation cuối cùng

Chọn **B. Cân bằng** cho repo này.
- Phù hợp monorepo đa service, không over-engineer.
- Dễ ghép với hiện trạng workflow `uat` theo path filter.
- Đủ tốt cho CI gate + deploy promotion + security scan.
- Sau đó chỉ nâng lên C khi số service hoặc yêu cầu compliance tăng rõ rệt.

## Unresolved questions

- Quy ước release tag muốn theo `vX.Y.Z` toàn repo hay theo từng service?
- Có cần tách workflow cho infra compose-only validation thành required check riêng không?
