# Internal Response Baseline

## Current Pattern
- `response.util.ts` defines 3 helpers: `sendOk`, `sendCreated`, `sendNoContent`.
- Success payload shape is consistent for JSON responses:
  - `success: true`
  - `data`
  - `timestamp`
- Error payload shape is also explicit:
  - `success: false`
  - `error.code`, `error.message`, `error.status`, `error.path`, `error.details?`
  - `timestamp`
- `errors.util.ts` centralizes domain/API error creation:
  - `createApiError`, `isApiError`
  - typed factories for validation/unauthorized/forbidden/not-found/conflict
- Controller style (example `auth.controller.ts`):
  - validate input via schema
  - throw API errors for bad input/auth failures
  - return via `sendOk`/`sendCreated`
- HTTP session handling is mixed into controllers in some flows:
  - cookie set/clear in login/logout
  - token extraction from header/cookie in controller helper
- Representative controller pattern is mostly “thin controller, service-backed logic”.

## Strengths
- Single response utility gives a clear baseline contract.
- Error factory helpers reduce ad-hoc status/message handling.
- `isApiError` enables safe runtime discrimination.
- Timestamps present on both success and error responses.
- Controllers already normalize validation failures into structured API errors.
- Cookie/token handling exists and is consistent enough to standardize further.

## Gaps
- No visible shared envelope for non-JSON cases beyond `204`.
- Error `code` is only derived from `details.code`; fallback is generic `ERROR`.
- Success responses do not include a stable `meta` block or request correlation id.
- Error response path is caller-supplied, not sourced centrally from middleware.
- Middleware files requested were not found at the provided path, suggesting path drift or naming mismatch in the codebase.
- Controllers still repeat validation/error mapping boilerplate.
- No explicit contract types exported for consumers/tests beyond local interfaces.

## Reusable Assets
- `sendOk`, `sendCreated`, `sendNoContent`, `sendError` in `response.util.ts`.
- `createApiError` and typed error factories in `errors.util.ts`.
- `isApiError` for middleware-level branching.
- Existing controller validation pattern using schema parsing + `createValidationError`.
- `auth.controller.ts` as a concrete reference for response normalization, cookie handling, and auth/session flows.

## Unresolved Questions
- Where are the actual `error-handler.middleware.ts` and `request-id.middleware.ts` files located? Provided paths did not resolve.
- Should the future contract keep `path` inside the error payload, or move it to middleware metadata?
- Is `request-id` intended to be required in every response envelope?
- Do we need a unified success envelope for all controllers, including create/update/delete acknowledgements?
- Should `sendError` own status-to-code normalization instead of trusting `details.code`?