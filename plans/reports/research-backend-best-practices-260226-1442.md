# Research: Backend best practices for NestJS/Node IoT telemetry

## Scope
- Validate/NestJS DTOs + auth, JWT, rate limiting for telemetry ingestion
- Harden MQTT bridges and clients before data hits HTTP/DB layers
- Align PostgreSQL time-series schema with telemetry semantics and observability
- Surface lightweight YAGNI/KISS/DRY improvements and anti-patterns to avoid

## Key findings
1. **Validation-first perimeter**: Apply a global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform` so every DTO enforces primitive types, lengths, nested rules, and sanitization before services run; this prevents injection, malformed telemetry, and reduces downstream defensive coding (define DTOs with decorators such as `@IsString`, `@ValidateNested`, `@Type`). Rejecting extra fields and logging rejection reasons also keeps schema drift visible and manageable, which aligns with KISS by keeping the validation layer simple and authoritative instead of duplicating checks later.[[1]](https://digiqt.com/blog/nestjs-security-best-practices/?utm_source=openai)
2. **JWT hardening + rate limits**: Guard every route with JWT strategies that validate issuer/audience, short-lived TTLs, and account for rotation (JWKS) so attackers cannot replay tokens; pair guards with role/scope decorators for RBAC and treat failed validation as telemetry events. Complement auth with token-bucket rate limits per tenant or device to throttle bursts—report `Retry-After` headers so clients back off gracefully and the backend avoids saturation during IoT storms while keeping defenders aware via metrics.[[2]](https://moldstud.com/articles/p-top-nestjs-security-best-practices-faq-for-developers-enhance-your-applications-safety?utm_source=openai)
3. **Structured logs + metrics**: Emit JSON logs with correlation IDs, traceparent/span IDs, tenant/device tags, and redacted secrets so queries in ELK/SIEMs are straightforward; instrument controllers with Prometheus/OpenTelemetry to collect RED/USE metrics, define SLOs per ingestion route, and expose `/metrics`, health, and readiness probes for deployment checks. This ensures observability without building bespoke logging layers, honoring DRY by reusing shared middleware/guards. [[1]](https://digiqt.com/blog/nestjs-security-best-practices/?utm_source=openai)
4. **Anti-pattern: trust-any payloads or uncontrolled DTOs**: Letting clients submit arbitrary JSON (without whitelist/forbid settings) or validating inside services invites polymorphic bugs and duplicates checks. Instead, centralize validation in pipes and keep DTOs narrowly focused per endpoint; fail-fast prevents payload-bloat and reduces the number of fields needing explanation in incident reviews, aligning with YAGNI/KISS.
5. **Secure MQTT bridge**: Terminate MQTT TLS 1.2+ with mutual TLS between the bridge and upstream broker, storing client certs in keystores and broker CA chains in truststores; enforce flow control (max publishes per second and windowed in-flight message caps) so a single IoT beacon cannot saturate the bridge before NestJS ever sees the payload. Certificate rotation and truststore updates keep the bridge aligned with PKI changes while network segmentation fences off lateral movement.[[4]](https://docs.hivemq.com/bridge/4.8/enterprise-bridge-extension/bridge-extension.html?utm_source=openai)
6. **PostgreSQL/time-series schema**: Model telemetry tables as hypertables, partitioned by timestamp (and optionally a frequently-filtered dimension such as `location` or `device_id`), using chunk sizes that keep each chunk < 25% of RAM; add composite indexes on `(device_id, time DESC)` and use partial indexes for sparse metrics so queries hitting recent telemetry stay fast without indexing every optional column. Apply compression policies (e.g., compress after seven days) and align metadata tables on the same partition keys to improve join locality, preventing spuriously complex schemas that break DRY by duplicating metadata across tables.[[3]](https://www.tigerdata.com/learn/best-practices-for-scaling-postgresql)
7. **Lightweight improvements**: Favor JSON schemas/DTOs for telemetry instead of heavyweight ORMs when only insert/select is required; reuse shared transformers for multiple DTOs (e.g., `CreateTelemetryDto` extends `PartialType(BaseTelemetryDto)`) to reduce duplication. Keep services stateless, use worker threads for CPU-bound processing, and rely on existing Nest modularization to avoid inventing bespoke pipelines—this keeps the stack simple and easier to audit.
8. **Anti-pattern: excessive indexing or redundant telemetry pipelines**: Avoid adding indexes on every telemetry column; each extra index slows writes, so only build indexes that support concrete query patterns (recent data, device+status). Also, resist duplicating logging/metrics solutions per module—centralize them so each new controller reuses the same logging service/API, adhering to DRY.

## Recommendations
- Maintain a strict validation pipe and DTO catalog; treat any new telemetry field as a change request, not a freeform object.
- Guard JWT issuance/usage with rotation, scopes, and rate limiting per tenant/device.
- Replace text logs with structured JSON plus trace/tenant tags to link telemetry flows to observability tools.
- Harden MQTT ingress with TLS/mTLS, keystore/truststore rotation, and bridge rate caps to stop floods before HTTP processing.
- Keep PostgreSQL hypertables lean: chunk sizing tuned to ingestion, composite/partial indexes, and timed compression.
- Use lightweight DTO reuse patterns and stateless services to honor YAGNI/KISS while keeping code easy to test.
- Avoid redundant indexes and logging implementations; rely on central utilities to stay DRY.
- Monitor RED/USE metrics, SLO burn rates, and health endpoints so deferred issues surface before they cascade.

## Unresolved questions
- None.

## Sources
- https://digiqt.com/blog/nestjs-security-best-practices/?utm_source=openai
- https://moldstud.com/articles/p-top-nestjs-security-best-practices-faq-for-developers-enhance-your-applications-safety?utm_source=openai
- https://www.tigerdata.com/learn/best-practices-for-scaling-postgresql
- https://docs.hivemq.com/bridge/4.8/enterprise-bridge-extension/bridge-extension.html?utm_source=openai
