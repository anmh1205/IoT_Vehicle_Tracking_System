# Execution Backlog

## Order of work
- [ ] Approve canonical external actor: `customer`
- [ ] Approve UI wording: `customer` vs `renter`
- [ ] Approve merged identity field list
- [ ] Update docs to reflect self-drive rental model
- [ ] Add merged fields to `customers`
- [ ] Add trip renter/customer-contact contract
- [ ] Update backend customer validator/types/repository/services/controller
- [ ] Update backend trip validator/types/repository/services/controller
- [ ] Deprecate then remove backend driver routes and OpenAPI paths
- [ ] Expand frontend customer form/detail screens
- [ ] Remove frontend driver page, feature files, API client, nav entry
- [ ] Update trip UI wording and payload fields
- [ ] Export `customers`, `drivers`, `trips` before migration
- [ ] Run driver-to-customer mapping script/process
- [ ] Review unresolved mappings manually
- [ ] Apply data migration in UAT
- [ ] Run backend lint and typecheck
- [ ] Run frontend lint and typecheck
- [ ] Run UAT smoke on customers, trips, vehicles, users
- [ ] Remove dead driver code and schema after rollback window

## Guardrails
- Never guess ambiguous customer-driver matches.
- Never ship UI cleanup before backend can represent merged customer fields.
- Never drop `drivers` before export, reconciliation report, and rollback window exist.

## Unresolved questions
- Is customer login intentionally excluded from this release?
