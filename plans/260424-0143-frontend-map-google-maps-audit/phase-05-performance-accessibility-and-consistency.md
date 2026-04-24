# Phase 5: Performance Accessibility And Consistency

## Goal
Prevent UI debt and keep map interactions stable.

## Tasks
1. Audit duplicate map component paths and decide ownership.
2. Audit device list scalability and virtualization threshold.
3. Audit focus behavior, keyboard access, and aria labels.
4. Audit z-index and overlay stacking rules.
5. Audit safe-area and viewport constraints on mobile.
6. Audit loading, empty, and error states for consistency.

## Output
- cleanup list for duplicate components
- list-scaling strategy
- accessibility checklist
- stacking and viewport rules

## Acceptance
- one active component tree owns each map concern
- accessibility and loading states are no longer ad hoc
