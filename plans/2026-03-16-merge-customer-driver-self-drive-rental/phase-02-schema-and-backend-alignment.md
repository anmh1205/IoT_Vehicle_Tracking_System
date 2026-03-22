# Phase 02: Schema and Backend Alignment

## Objective
- Make the backend speak the corrected model without breaking rollout safety.

## Schema plan

### Step 1. Extend customers
- Add optional merged fields to `customers`.
- Recommended first-pass columns:
- `license_number`
- `license_type`
- `license_expiry`
- `date_of_birth`
- `avatar_url`
- Keep current customer fields:
- `customer_code`
- `customer_type`
- `name`
- `contact_person`
- `email`
- `phone`
- `address`
- `tax_code`

### Step 2. Prepare trip terminology migration
- Add new trip contact columns or rename API contract in a compatibility layer.
- Recommended contract target:
- `renterName`
- `renterPhone`
- Transitional option:
- keep DB `driver_name`, `driver_phone` for one release
- map backend public type to renter wording
- later rename DB columns in a cleanup migration

### Step 3. Driver deprecation window
- Keep `drivers` table read-only during migration rehearsal if needed.
- Stop adding new business behavior to `driver`.
- Mark driver routes as deprecated before deletion.

## Backend code changes
- Expand `customer` types, validator, repository, services, and controller.
- Add any missing conflict checks for merged identity fields if required.
- Remove `driver` routes from `src/api/routes/index.ts` after the switchover.
- Remove `driver` tag and paths from `src/api/openapi/spec.ts`.
- Update trip validator, types, repository, services, and controller to renter wording.
- Audit any report/export/service code that still says `driver`.

## Compatibility rules
- Prefer additive change first, destructive change second.
- Do not drop `drivers` before data reconciliation is complete.
- If API consumers still depend on `/drivers`, keep a short-lived compatibility route that returns a deprecation error with migration guidance.

## Test plan
- Backend unit tests for customer create/update/list with merged fields
- Backend tests for duplicate-code and invalid-field scenarios
- Backend tests for trip create/update/list with renter wording
- Contract smoke for `/customers`, `/trips`, removed/deprecated `/drivers`

## Exit criteria
- Backend can represent the new model with no dependency on active `driver` CRUD.
- OpenAPI no longer teaches the wrong business model.

## Unresolved questions
- Do we want a short compatibility window for `/drivers`, or a hard removal in the same release?
