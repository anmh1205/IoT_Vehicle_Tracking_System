# Code Standards

## Accessibility Standards (Web + Mobile)
- Use semantic landmarks and landmarks-first navigation (for example, skip links to `#main-content`).
- Every non-text control should have an explicit accessible name (`aria-label` when icon-only).
- Error and status feedback affecting user action should use appropriate live regions (`role="alert"` with `aria-live` where applicable).
- Keyboard interaction must be supported for custom interactive elements using Enter and Space handlers.
- Pressed state for toggle buttons should be explicit via `aria-pressed`.
- Decorative icons inside buttons should be marked with `aria-hidden="true"`.
- For high-touch targets, set minimum target size near WCAG AAA touch guidance (targeting 44px equivalent).
- Mobile-first components should keep explicit hit areas larger than compact defaults for frequent actions.

## Layout / Viewport Standards
- Use `100dvh` for full-height panels that depend on viewport size, especially when mobile browser UI changes can distort `100vh`.
- Wrap viewport-root content with a stable element id to support keyboard skip navigation.

## Flutter Accessibility Standards
- Use semantics-aware Flutter widgets for key loading/error state surfaces and set `liveRegion: true` for status messages.
- Keep retry/load actions with clear Vietnamese/locale-aware labels.
- Maintain touch targets >=48dp where possible for full-screen action buttons.

## Cross-File Conventions
- Keep Vietnamese UI strings in feature modules consistent (UI copy should match locale style used in parent feature).
- Keep accessibility changes minimal and local to impacted components to reduce regression risk.
- Update project docs (`docs/development-roadmap.md`, `docs/project-changelog.md`, `docs/system-architecture.md`, `docs/codebase-summary.md`) whenever accessibility standards change or are adopted.