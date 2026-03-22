# Phase 03: Frontend and API Consumer Alignment

## Objective
- Remove the wrong driver module from operator UX and merge useful fields into customer flows.

## Frontend changes

### Navigation
- Remove `Tai xe` from `Tracking_Frontend/src/config/nav-config.ts`.
- Keep `Khach hang` as the only external actor menu entry.

### Customer module
- Expand customer form in `src/app/dashboard/customers/page.tsx`.
- Add merged self-drive identity fields decided in Phase 01.
- Update customer detail page to show the merged identity/compliance view when present.

### Driver module removal
- Delete `/dashboard/drivers/page.tsx`.
- Delete `src/features/drivers/*`.
- Delete `src/lib/api/drivers.ts`.
- Remove any breadcrumbs, route aliases, or dead imports.

### Trip module cleanup
- Change labels from `driver` to renter/customer contact wording in:
- `src/features/trips/components/trip-form.tsx`
- `src/features/trips/components/trip-columns.tsx`
- any trip detail or replay surfaces

### Vehicle surfaces
- Ensure vehicle detail and assignment surfaces still show the right external actor terminology.
- If the UI needs a linked customer summary, show `customer.name` or the new renter label, not driver.

## Frontend validation changes
- Update `src/lib/validations/customer.schema.ts`.
- Remove any driver-only validation schema usage from dashboard forms.

## UX rules
- Do not replace `driver` with a vague label like `user`.
- Use business-true wording:
- `customer` if talking about the account/entity
- `renter contact` if talking about the person attached to a trip

## Test plan
- Dashboard smoke:
- customer list
- customer create
- customer update
- customer detail
- trip create/update
- no broken `/dashboard/drivers` links
- frontend lint and typecheck

## Exit criteria
- Operators can no longer create or manage fake drivers.
- The dashboard teaches one consistent self-drive rental model.

## Unresolved questions
- Should the customer page title stay `Khach hang`, or become `Khach thue` for stronger business clarity?
