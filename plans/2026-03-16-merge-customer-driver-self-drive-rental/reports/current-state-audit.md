# Current-State Audit: Customer + Driver in Self-Drive Rental

## Business correction
- This product is a self-drive rental system, not a staffed fleet system.
- `driver` should not stay as a first-class business actor.
- The external actor should be one canonical entity: `customer` as renter/lessee.
- `users` should stay the internal actor for admin, manager, operator, viewer.

## What the codebase does today

### 1. Customer is already the stronger canonical root
- `Tracking_PostgreSQL/init/06-vehicles.sql` creates `customers` first, then `vehicles.customer_id`.
- `Tracking_Backend/src/domain/vehicle/types/vehicle.types.ts` and `vehicle.repository.ts` already treat `customerId` as the vehicle owner/tenant link.
- This means the current database already trusts `customer`, not `driver`, as the entity attached to the fleet.

### 2. Driver is a parallel CRUD domain with weak real linkage
- `Tracking_PostgreSQL/init/11-drivers.sql` defines a standalone `drivers` table.
- `Tracking_Backend/src/domain/driver/*`, `src/api/controllers/driver.controller.ts`, `src/api/routes/driver.routes.ts`, and `src/api/validators/driver.validator.ts` expose full driver CRUD.
- `Tracking_Frontend/src/app/dashboard/drivers/page.tsx`, `src/features/drivers/*`, and `src/lib/api/drivers.ts` add a full dashboard module for drivers.
- But no core rental workflow uses `drivers` as the real source of truth.

### 3. Trips still speak "driver", but only as free text
- `Tracking_PostgreSQL/init/07-trips-alerts.sql` stores `driver_name` and `driver_phone` inside `trips`.
- `Tracking_Backend/src/domain/trip/types/trip.types.ts`, `trip.repository.ts`, and `src/api/validators/trip.validator.ts` keep the same fields.
- `Tracking_Frontend/src/features/trips/components/trip-form.tsx` and `trip-columns.tsx` still expose driver labels.
- So the system does not really model a reusable driver entity for trips. It only snapshots driver-like text.

### 4. Driver is inconsistent with the rest of the system
- `Tracking_PostgreSQL/init/12-violations.sql` uses `driver_id INT REFERENCES users(id)`, not `drivers(id)`.
- This is a strong signal that the current `driver` model is not trusted consistently even inside the schema.

### 5. Auth and roles are internal-only
- `Tracking_Backend/src/shared/types/common.types.ts` only accepts `root`, `admin`, `manager`, `operator`, `viewer`.
- `Tracking_Backend/src/api/validators/auth.validator.ts` uses the same role set.
- `Tracking_Frontend/src/app/dashboard/users/page.tsx` manages only those internal roles.
- If the business later wants true customer self-service login, that is a separate auth expansion. It is not solved by deleting the `drivers` table alone.

### 6. Frontend information architecture still teaches the wrong business model
- `Tracking_Frontend/src/config/nav-config.ts` shows both `Khach hang` and `Tai xe`.
- The dashboard therefore teaches operators that customer and driver are different core business actors, which is wrong for self-drive rental.

### 7. Mobile impact is low
- `Tracking_Mobile/lib` has no obvious customer/driver-specific modules.
- The migration blast radius is mainly PostgreSQL, backend, frontend dashboard, OpenAPI, and docs.

## Main problems created by the current model
- Duplicate actor model: customer and driver represent the same real-world renter in a self-drive flow.
- Wrong UI mental model: operators are pushed to maintain a fake driver master-data module.
- Schema inconsistency: `vehicles` trust customer, `trips` store driver text, `violations` point to users.
- No safe automatic merge path: `drivers` and `customers` have no FK relationship, so existing records cannot be merged perfectly without mapping rules.

## Recommended direction
- Keep `customer` as the canonical external entity because the schema already anchors fleet ownership there.
- Retire `driver` as a standalone domain, API, page, menu item, and OpenAPI tag.
- Move only legally needed driver-like attributes into the customer model.
- Rename trip language from `driver_*` to renter/customer contact terminology.
- Keep `users` as internal staff accounts.
- Treat customer self-service authentication as optional follow-up scope, not part of the first cleanup.

## Data migration reality
- Automatic merge is only safe when a `driver` record can be matched to exactly one `customer` by agreed rules.
- Practical match candidates:
- exact email
- exact phone
- normalized personal/company contact name
- manual CSV review for unresolved records
- If no strong match exists, export unresolved drivers for manual triage instead of guessing.

## Files with direct first-wave impact
- `iot-vehicle-tracking-system/Tracking_PostgreSQL/init/06-vehicles.sql`
- `iot-vehicle-tracking-system/Tracking_PostgreSQL/init/07-trips-alerts.sql`
- `iot-vehicle-tracking-system/Tracking_PostgreSQL/init/11-drivers.sql`
- `iot-vehicle-tracking-system/Tracking_Backend/src/api/openapi/spec.ts`
- `iot-vehicle-tracking-system/Tracking_Backend/src/api/routes/index.ts`
- `iot-vehicle-tracking-system/Tracking_Backend/src/api/controllers/customer.controller.ts`
- `iot-vehicle-tracking-system/Tracking_Backend/src/api/controllers/driver.controller.ts`
- `iot-vehicle-tracking-system/Tracking_Backend/src/domain/customer/*`
- `iot-vehicle-tracking-system/Tracking_Backend/src/domain/driver/*`
- `iot-vehicle-tracking-system/Tracking_Backend/src/domain/trip/*`
- `iot-vehicle-tracking-system/Tracking_Frontend/src/config/nav-config.ts`
- `iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/customers/*`
- `iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/drivers/page.tsx`
- `iot-vehicle-tracking-system/Tracking_Frontend/src/features/drivers/*`
- `iot-vehicle-tracking-system/Tracking_Frontend/src/features/trips/*`
- `iot-vehicle-tracking-system/Tracking_Frontend/src/lib/api/customers.ts`
- `iot-vehicle-tracking-system/Tracking_Frontend/src/lib/api/drivers.ts`
- `iot-vehicle-tracking-system/Tracking_Frontend/src/lib/validations/customer.schema.ts`
- `docs/codebase-summary.md`
- `docs/project-overview-pdr.md`
- `docs/system-architecture.md`

## Unresolved questions
- Should the canonical label stay `customer`, or should UI text move to `renter` / `lessee` while table names stay `customers`?
- Which driver fields are legally required after the merge: license number, license type, license expiry, date of birth, avatar, all, or only a subset?
- Do company customers still need one primary renter/contact, or can company rentals exist without a named self-drive operator?
- Does the product need true customer login later, or is this system still staff-operated only?
