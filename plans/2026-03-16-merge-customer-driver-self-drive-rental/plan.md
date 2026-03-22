# Plan: Merge Customer + Driver for Self-Drive Rental

## Goal
- Correct the business model so the system matches self-drive rental reality.
- Remove `driver` as a standalone business actor.
- Keep one canonical external actor: `customer`.
- Preserve internal staff accounts in `users`.
- Deliver the cleanup in safe phases so schema, API, UI, and data move together.

## Recommended decision

### Canonical model
- `users` = internal staff accounts
- `customers` = external renters / lessees
- `vehicles.customer_id` = current owner/tenant link, keep it
- `trips` = link to vehicle, keep renter contact snapshot, stop using driver wording

### Why this is the recommended path
- Lowest churn: `vehicles` already depend on `customer_id`
- Lowest migration risk: do not introduce a new root table unless necessary
- Best fit to current repo: only `driver` is detachable; `customer` is already embedded in core fleet flows
- Clearer business language: no fake driver CRUD in a self-drive product

## Rejected primary alternative

### Alternative: create a new `renters` domain and migrate both `customers` and `drivers` into it
- Pros:
- cleaner wording
- more semantically correct for rental
- Cons:
- much more churn in schema, backend, frontend, docs, and data migration
- no real value over reusing `customers`
- not YAGNI for the current correction

## Scope

### In scope
- Database model cleanup around customer vs driver
- Backend API/domain cleanup
- Frontend dashboard cleanup
- OpenAPI cleanup
- Trip field terminology cleanup
- Docs cleanup
- Data migration and rollback plan

### Out of scope for this plan
- Full customer self-service auth portal
- Pricing, booking, payment, contract management
- Mobile app feature redesign
- Large information architecture redesign beyond removing the wrong driver module

## Target end-state

### Data model
- `customers` stays the only external actor table
- Add optional self-drive identity fields to `customers` for the minimum legal/compliance need
- Remove `drivers` table after migration window
- Rename or replace trip fields:
- preferred target: `renter_name`, `renter_phone`
- acceptable transitional target: keep DB columns for one release, map API to new names

### Backend
- Remove `driver` domain modules and routes
- Expand `customer` validation/types/services with merged fields
- Update OpenAPI to remove `Drivers`
- Update trip validators/types/services to stop exposing driver terminology

### Frontend
- Remove `/dashboard/drivers`
- Merge useful driver fields into customer create/edit/detail screens
- Remove driver menu item and API client
- Update trip labels from driver to renter/customer contact

### Docs
- Remove language that frames the product as staffed-fleet driver management
- Document `users` vs `customers` clearly

## Delivery strategy
- Use a compatibility-first migration.
- Do not delete `drivers` on day one.
- First add merged fields and read paths.
- Then migrate data.
- Then switch UI/API.
- Then remove dead code and schema.

## Phase map
- `phase-01-business-model-alignment.md`
- `phase-02-schema-and-backend-alignment.md`
- `phase-03-frontend-and-api-consumer-alignment.md`
- `phase-04-data-migration-rollout-and-verification.md`

## Main risks
- No direct FK exists between `drivers` and `customers`, so merge quality depends on mapping rules.
- Some driver fields may be legally important and cannot be dropped blindly.
- Trip wording touches DB, backend, frontend, and reporting at once.
- If the team mixes business rename and customer-auth rollout in one pass, scope will blow up.

## Success criteria
- No standalone `driver` CRUD module remains in schema, backend, frontend, nav, or OpenAPI.
- `customer` is the only external actor used in fleet/rental flows.
- Vehicle ownership/tenant flows continue to work with no regression.
- Trip screens and APIs no longer say `driver`.
- Existing driver data is either migrated, manually resolved, or exported for audit.
- Docs explain the corrected model without ambiguity.

## References
- Audit: `reports/current-state-audit.md`
- Backlog: `execution-backlog.md`

## Unresolved questions
- Should UI say `customer` everywhere, or `customer` in code and `renter` in product copy?
- Which merged identity fields are mandatory vs optional?
- Is customer login a follow-up roadmap item or explicitly out of scope for the next release?
