# Planner report: firmware programming docs module-oriented rewrite

## Summary
Defined concise rewrite plan for `iot-vehicle-tracking-system-firmware/documents/programming-knowledge` from part-centric notes to module-oriented ESP-IDF guides grounded in `main/inc` + `main/src`.

## Key decisions
- Keep 8 main guides + 2 consolidated reference docs.
- Prioritize runtime map + ESP-IDF workflow first, then data path, then power/OBD/control.
- Enforce one shared per-doc template to keep docs consistent and maintainable.
- Explicitly de-scope unused hardware docs into a decision log to avoid fake implementation detail.

## Output
- Plan file created with mapping, sequence, required sections, and validation checklist.

## Unresolved questions
1. File rename policy vs preserving old filenames.
2. Placement of storage/time content (standalone vs appendix).
3. Target reader depth (beginner vs maintainer).
