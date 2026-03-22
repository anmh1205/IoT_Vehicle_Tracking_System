# Phase 01: Business Model Alignment

## Objective
- Freeze one correct business glossary before code changes.

## Decisions to lock
- `driver` is not a primary actor.
- `customer` is the canonical external actor.
- `users` remain internal staff accounts.
- Trip wording moves from `driver` to renter/customer contact wording.

## Tasks
- Confirm final product wording:
- code term: `customer`
- UI term: `customer` or `renter`
- Decide the minimum merged field set from old driver records:
- `license_number`
- `license_type`
- `license_expiry`
- `date_of_birth`
- `avatar_url`
- possibly `address`, `phone`, `email` if customer data is missing
- Decide whether company customers can keep `contact_person` plus optional license info.
- Freeze migration rules for unresolved matches.
- Update docs first so implementation follows the corrected model.

## Deliverables
- Approved glossary
- Approved merged field list
- Approved migration rules
- Updated docs scope note

## Exit criteria
- No team member is still treating `driver` as a required module.
- The merged field set is final enough for schema work.

## Risks
- If wording is not frozen now, backend and frontend will rename different things.

## Unresolved questions
- For company rentals, do we store one primary renter/contact only, or do we need a later concept for additional authorized operators?
