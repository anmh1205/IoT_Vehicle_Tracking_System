# Phase 3: Error Handler traceId

**Priority:** 🟡 Trung bình
**Status:** Pending
**Estimated effort:** 30 min

## Context

- Error handler exists, uses correlationId internally for logs
- Missing: `traceId` field in JSON response body per API spec
- Report yêu cầu: `{ error: { code, message, status, path, details, traceId }, timestamp }`

## Related Code Files

**Modify:**
- `Tracking_Backend/src/middleware/error-handler.middleware.ts` — add `traceId: req.correlationId` to response

## Implementation Steps

1. Read current error handler middleware
2. Add `traceId: req.correlationId ?? null` to error response JSON
3. Compile check

## Success Criteria

- [ ] Error responses include `traceId` field
- [ ] traceId matches log correlation ID for debugging
