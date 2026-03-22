# Phase 04: Data Migration, Rollout, and Verification

## Objective
- Merge existing data safely, cut over, then remove dead schema/code.

## Migration sequence

### Step 1. Backup and export
- Export `customers`
- Export `drivers`
- Export `trips`
- Save a pre-migration audit CSV/SQL snapshot

### Step 2. Mapping pass
- Attempt exact-match merge by:
- email
- phone
- normalized name/contact
- Build a review file for unresolved rows.
- Do not auto-merge ambiguous rows.

### Step 3. Apply merged customer updates
- Populate new customer fields from matched driver records.
- Record which driver rows were matched, skipped, or unresolved.

### Step 4. Cutover
- Deploy backend changes that stop writing to `drivers`.
- Deploy frontend changes that remove driver UI.
- Run contract smoke on customers, trips, vehicles.

### Step 5. Cleanup
- Delete dead driver code from backend and frontend.
- Drop `drivers` table only after rollback window ends.
- Remove deprecated routes and docs references.

## Rollback plan
- If migration quality is poor:
- keep extended `customers`
- restore frontend/backend compatibility path
- do not drop `drivers`
- restore from exported snapshots if needed

## Verification checklist
- Customer records still load and save correctly
- Vehicle ownership links still resolve
- Trip forms and trip list no longer show driver wording
- No frontend route or menu points to drivers
- OpenAPI no longer exposes driver resources
- Docs match shipped behavior

## Exit criteria
- Production or UAT behaves correctly with the corrected model.
- The team has evidence for matched, skipped, and unresolved driver records.
- `drivers` is fully retired after the rollback window.

## Unresolved questions
- How long should the rollback window be before dropping `drivers`?
- Do unresolved driver records need permanent archive storage after retirement?
