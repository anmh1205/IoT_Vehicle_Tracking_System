## Code Review Summary

### Scope
- Files:
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/scripts/deploy/bootstrap-vps.sh`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/frontend-uat.yml`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/Dockerfile`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/providers/socket-provider.tsx`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/next.config.ts`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/docs/cicd-required-secrets-and-env.md`
- Focus: correctness, regressions, security, CI/CD behavior
- Scout findings: checked dependent usage of API/WS env vars and backend socket path `/ws`

### Overall Assessment
- Changes are directionally correct (frontend build-time env plumbing + VPS env reconcile).
- There is one deploy-time config mismatch that can silently ship wrong API endpoint wiring.

### Critical Issues
1. **Frontend workflow maps wrong secret key for `NEXT_PUBLIC_API_URL`**
   - File: `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/frontend-uat.yml`
   - Current:
     - `NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_BASE_URL }}`
   - Impact:
     - If ops sets only the new preferred secret (`NEXT_PUBLIC_API_URL`) per docs, build arg is empty/wrong and app may fallback to unintended backend URL at runtime.
     - This is a silent misconfiguration risk in UAT/CD.

### High Priority
- None.

### Medium Priority
1. **Docs and workflow are inconsistent on source-of-truth secret**
   - Files:
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/docs/cicd-required-secrets-and-env.md`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/frontend-uat.yml`
   - Impact: operators can follow docs correctly but pipeline still reads legacy secret, causing drift.

2. **`bootstrap-vps.sh` leaves stale backup forever and lacks fail-safe cleanup for temp files**
   - File: `/e/anmh1205/IoT_Vehicle_Tracking_System/scripts/deploy/bootstrap-vps.sh`
   - Impact: low operational noise; potential temp file leak on interrupted run.

3. **Discord step behavior in docs differs from actual workflow**
   - Files:
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/docs/cicd-required-secrets-and-env.md`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/frontend-uat.yml`
   - Docs state `continue-on-error: true`; workflow step does not set it.
   - Impact: notification failure can mark deploy job failed.

### Low Priority
1. **`SERVICE_ENV_CONTENT` parser does not normalize key whitespace in incoming lines**
   - File: `/e/anmh1205/IoT_Vehicle_Tracking_System/scripts/deploy/bootstrap-vps.sh`
   - Impact: malformed env payload like ` KEY =value` is not reliably reconciled.

### Edge Cases Found by Scout
- Backend socket server path is fixed at `/ws`; frontend now supports `NEXT_PUBLIC_WS_PATH` and defaults `/ws`, so default alignment is correct.
- Frontend API rewrite now tries `NEXT_PUBLIC_API_URL` then `NEXT_PUBLIC_API_BASE_URL`; fallback to `http://tracking-backend:4000` may fail outside expected Docker network topology if build args are missing.

### Recommended Actions
1. In workflow, map `NEXT_PUBLIC_API_URL` from `secrets.NEXT_PUBLIC_API_URL` (not base URL).
2. Keep legacy compatibility by also passing `NEXT_PUBLIC_API_BASE_URL` from its own secret (or fallback chain explicitly).
3. Align docs/workflow about Discord `continue-on-error` (either add it in workflow or remove the statement in docs).
4. Add a `trap` cleanup in `bootstrap-vps.sh` for temp files.

### Metrics
- Type Coverage: not measured in this review scope
- Test Coverage: not measured in this review scope
- Linting Issues: not measured in this review scope

### Unresolved Questions
1. Do operations intend to keep both `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_API_BASE_URL`, or deprecate one now?
2. Should Discord notification be non-blocking across all UAT workflows for consistency?
