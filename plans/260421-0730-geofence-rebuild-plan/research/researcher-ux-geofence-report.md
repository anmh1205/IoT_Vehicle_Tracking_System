# UX geofence redesign research

## Recommended flow
- Primary flow should live in Operations/Map.
- Secondary flow should start from Device Detail Modal and open the same shared setup experience prefilled for the selected vehicle.
- Mental model should be: one vehicle, one active allowed zone.

## Recommended UI structure
- Use one compact geofence setup sheet/modal instead of separate create/edit experiences.
- Header: vehicle identity + current zone status.
- Body section 1: center source (`current vehicle position` or `click on map`).
- Body section 2: radius control (slider + numeric input).
- Optional advanced section: alert mode/settings.
- Sticky footer: cancel + save/replace.

## Remove from current UX
- Remove polygon/rectangle editing from this operational flow.
- Remove long generic geofence forms with manual lat/lon as primary path.
- Remove separate binder-style workflow where user creates zone then binds multiple vehicles.
- Remove fragmented entry logic across pages that behave differently.

## Accessibility/mobile
- Map-click flow needs keyboard/manual fallback.
- Keep large touch targets and strong focus states.
- Use full-height mobile sheet with sticky actions.
- Keep validation inline and concise.

## Unresolved questions
- Whether replacing an existing active zone requires explicit confirmation every time.
- Whether advanced alert settings should be visible by default or collapsed.
- Whether device-detail entry should inline the UI or deep-link into map-focused mode.
