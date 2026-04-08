## Code Review Summary

### Scope
- Files: `.github/workflows/emqx-uat.yml`
- Focus: recent cert sync block for `tracking-npm` -> `tracking-emqx`
- Scout findings: cert selection ambiguity, key material handling on host `/tmp`, missing 8883 verification

### Overall Assessment
- Change is mostly safe for missing `tracking-npm`/missing LE files (graceful fallback logs).
- Not ready to approve yet due to 1 correctness risk + 1 security risk + 1 CI reliability gap.

### Critical Issues
- None.

### High Priority
1. Wrong cert can be selected when multiple `npm-*` archives exist
   - File: `.github/workflows/emqx-uat.yml:91-95`
   - Impact: MQTTS can serve cert for wrong domain (handshake succeeds but hostname validation fails on clients).
   - Why: picks latest `npm-*` archive, not cert matching expected MQTT domain.
   - Fix: select by expected domain (env var), or validate selected cert subject/SAN before install.

2. Private key copied to VPS `/tmp` and not deleted
   - File: `.github/workflows/emqx-uat.yml:98-104`
   - Impact: key exposure window on host; persistent leftover sensitive file.
   - Fix: use secure temp dir + restrictive perms + cleanup trap, or stream copy directly container->container without host persistence.

### Medium Priority
1. CI does not verify 8883 TLS result after restart
   - File: `.github/workflows/emqx-uat.yml:119-127`
   - Impact: workflow can pass while dashboard API is healthy but MQTTS cert is invalid/mismatched.
   - Fix: add `openssl s_client` check to `127.0.0.1:8883` and assert CN/SAN/chain.

2. Always restarts EMQX when cert files are found
   - File: `.github/workflows/emqx-uat.yml:107-108`
   - Impact: unnecessary restart/downtime on every deploy even when cert unchanged.
   - Fix: compare fingerprint before restart and skip if unchanged.

### Low Priority
1. `/tmp/emqx-*.pem` artifacts not cleaned
   - File: `.github/workflows/emqx-uat.yml:98-104`
   - Impact: operational clutter and minor security hygiene issue.

### Edge Cases Found by Scout
- Multiple LE cert archives in NPM container (`npm-*`) with newest not for MQTT host.
- Certbot renewal race (file rotation between `ls` and `docker cp`) can cause intermittent copy failure.
- EMQX health endpoint (18083) green while TLS listener 8883 serves stale/wrong chain.

### Positive Observations
- Missing `tracking-npm` and missing cert files are handled gracefully with explicit fallback logs.
- Permissions inside EMQX are tightened (`key.pem` 600, certs 644).
- Flow remains mostly idempotent functionally (safe to rerun, no hard destructive steps).

### Recommended Actions
1. Bind cert selection to expected domain (not latest archive).
2. Remove host `/tmp` key persistence (secure temp + cleanup or stream copy).
3. Add post-deploy MQTTS verification (`openssl s_client` + hostname/chain checks).
4. Optional: restart EMQX only when cert fingerprint changed.

### Metrics
- Type Coverage: N/A (YAML/shell workflow)
- Test Coverage: N/A
- Linting Issues: not executed in this review

### Unresolved Questions
- Which exact MQTT hostname should be used for cert SAN/CN validation in CI?
- Is rootless Docker used on VPS (affects who can read files dropped in `/tmp`)?
