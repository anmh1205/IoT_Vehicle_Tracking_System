# Phase 6: Target Layout And Component Boundaries

## Goal
Turn audit findings into a concrete target layout and ownership model.

## Tasks
1. Define the target desktop shell.
2. Define the target mobile shell.
3. Assign component ownership for:
   - route shell
   - map canvas
   - selection state
   - browse panel
   - inspect overlay
   - edit panels
   - shared state sync
4. Mark components to keep, refactor, merge, or delete.
5. Produce a stepwise refactor order that avoids regressions.

## Output
- target desktop layout
- target mobile layout
- ownership map by component
- keep/refactor/delete matrix
- refactor order

## Acceptance
- every major surface has a clear owner
- dead or duplicate map code has an explicit fate
