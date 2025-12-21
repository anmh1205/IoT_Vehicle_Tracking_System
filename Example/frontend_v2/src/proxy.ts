// This file previously configured Clerk middleware to protect routes.
// We no longer use Clerk for authentication in frontend_v2.
// Auth is handled by the legacy backend v1 (JWT) and this middleware is now a no-op.

export const config = {
  // Keep matcher empty so no middleware runs.
  matcher: []
};

export default function noopMiddleware() {
  // No-op middleware – all requests pass through without auth checks here.
}
