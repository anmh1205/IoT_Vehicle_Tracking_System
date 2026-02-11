# State Machine

> A device without explicit state management is a device you cannot control.

## Device States

```
Lifecycle states of an IoT device:
│
├── Registered
│   ├── Device record created in database
│   ├── No credentials generated yet (or just generated)
│   ├── Device has never connected
│   ├── How it gets here: admin creates device via API/UI
│   └── What can happen: generate credentials -> Provisioned
│
├── Provisioned
│   ├── Credentials generated and delivered
│   ├── Device hardware configured with credentials
│   ├── Waiting for first MQTT connection
│   ├── How it gets here: credentials generated for Registered device
│   └── What can happen: first MQTT connection -> Active
│
├── Active
│   ├── Device has connected at least once
│   ├── Device is part of the live fleet
│   ├── May be currently online or offline (connectivity != lifecycle state)
│   ├── How it gets here: first successful MQTT connection
│   └── What can happen: admin suspends -> Suspended, admin decommissions -> Decommissioned
│
├── Suspended
│   ├── Temporarily disabled
│   ├── MQTT connection rejected by ACL (credentials valid but access denied)
│   ├── Incoming data not processed
│   ├── Reasons: maintenance, billing issue, suspicious activity, temporary deactivation
│   ├── How it gets here: admin action or automatic rule
│   └── What can happen: admin reactivates -> Active, admin decommissions -> Decommissioned
│
└── Decommissioned
    ├── Permanently retired from active fleet
    ├── Credentials revoked (MQTT connection rejected at auth level)
    ├── No new data accepted
    ├── Historical data retained (soft delete)
    ├── How it gets here: admin decommissions from any state
    └── What can happen: nothing (terminal state), unless admin explicitly re-registers
```

## State Transition Diagram

```
                 +--------------+
                 |  Registered  |
                 +--------------+
                       |
              credentials generated
                       |
                       v
                 +--------------+
                 | Provisioned  |
                 +--------------+
                       |
               first MQTT connect
                       |
                       v
                 +--------------+
       +-------->|    Active    |<--------+
       |         +--------------+         |
       |           |          |           |
   reactivate    suspend   decommission   |
       |           |          |           |
       |           v          |           |
       |    +--------------+  |           |
       +----| Suspended    |  |           |
            +--------------+  |           |
                   |          |           |
              decommission    |           |
                   |          |           |
                   v          v           |
            +-------------------+         |
            | Decommissioned    |---------+
            +-------------------+     (re-register,
                                       rare/manual)
```

## Valid Transitions

| From | To | Trigger | Who |
|------|----|---------|-----|
| Registered | Provisioned | Credentials generated | System (automatic) |
| Provisioned | Active | First MQTT connection | System (automatic) |
| Active | Suspended | Admin action or automatic rule | Admin / System |
| Suspended | Active | Admin reactivates | Admin |
| Registered | Decommissioned | Admin decommissions | Admin |
| Provisioned | Decommissioned | Admin decommissions | Admin |
| Active | Decommissioned | Admin decommissions | Admin |
| Suspended | Decommissioned | Admin decommissions | Admin |

## Invalid Transitions (Enforce These)

| From | To | Why Not |
|------|----|---------|
| Active | Registered | Cannot un-connect a device |
| Active | Provisioned | Cannot revert to pre-connection state |
| Decommissioned | Active | Must go through re-registration process |
| Suspended | Provisioned | Suspend/reactivate, do not re-provision |

## Database Representation

```
devices table:
│
├── status column: enum
│   ├── 'registered'
│   ├── 'provisioned'
│   ├── 'active'
│   ├── 'suspended'
│   └── 'decommissioned'
│
├── status_changed_at: timestamp
│   └── When the last state transition occurred
│
├── suspended_reason: text (nullable)
│   └── Why device was suspended (for audit)
│
├── decommissioned_at: timestamp (nullable)
│   └── When device was permanently retired
│
└── device_status_log table (audit trail):
    ├── id
    ├── device_id
    ├── from_status
    ├── to_status
    ├── reason (text)
    ├── changed_by (user_id or 'system')
    └── created_at
```

## Behavior Per State

```
What does each state mean operationally?
│
├── Registered
│   ├── MQTT: connection rejected (no credentials yet)
│   ├── API: device visible in admin UI
│   ├── Data: no data expected or processed
│   └── Dashboard: shown as "pending setup"
│
├── Provisioned
│   ├── MQTT: connection accepted but device has not connected yet
│   ├── API: device visible, can be edited
│   ├── Data: no data expected yet
│   └── Dashboard: shown as "waiting for connection"
│
├── Active
│   ├── MQTT: connection accepted, data processed normally
│   ├── API: full access, all operations
│   ├── Data: processed, stored, alerts evaluated
│   └── Dashboard: shown with live status (online/offline)
│
├── Suspended
│   ├── MQTT: connection rejected at ACL level (or accepted but data discarded)
│   ├── API: visible but operations restricted (no commands, no config changes)
│   ├── Data: incoming data silently dropped
│   ├── Dashboard: shown as "suspended" with reason
│   └── Alerts: suppressed (do not trigger alerts for suspended devices)
│
└── Decommissioned
    ├── MQTT: connection rejected at auth level (credentials revoked)
    ├── API: visible in admin UI with "decommissioned" badge, read-only
    ├── Data: incoming data rejected
    ├── Dashboard: hidden from active fleet view, visible in archive
    └── Historical: all past data retained for reporting
```

## Suspension vs Decommissioning Decision

```
When to suspend vs decommission?
│
├── Suspend when:
│   ├── Temporary situation (will be resolved)
│   ├── Maintenance window
│   ├── Billing issue (customer will pay)
│   ├── Suspicious activity (under investigation)
│   ├── Customer requested temporary pause
│   └── Device may return to active use
│
└── Decommission when:
    ├── Device permanently retired from fleet
    ├── Device hardware returned or destroyed
    ├── Customer contract ended
    ├── Device replaced by new hardware
    └── Device will never be used again
```

## Soft Delete for Decommissioned Devices

```
Why soft delete?
│
├── Hard delete: DELETE FROM devices WHERE id = X
│   ├── Loses all references (FK constraints broken or cascaded)
│   ├── Historical reports break (device_id no longer exists)
│   ├── Audit trail incomplete
│   └── NEVER do this for production IoT systems
│
└── Soft delete: UPDATE devices SET status = 'decommissioned', decommissioned_at = NOW()
    ├── Device record preserved
    ├── Historical data intact (telemetry, trips, alerts still reference device)
    ├── Reports still work
    ├── Audit trail complete
    ├── Active queries filter: WHERE status != 'decommissioned'
    └── Can "undelete" in exceptional cases
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| No state tracking | Cannot tell if device is active, suspended, or retired | Explicit status enum column with transitions |
| Hard delete device data | Breaks historical reports, loses audit trail | Soft delete with status = 'decommissioned' |
| No way to reactivate | Suspended device requires re-provisioning | Implement Suspended -> Active transition |
| State changes without logging | Cannot audit who changed what and when | device_status_log table for every transition |
| Allowing any state transition | Invalid transitions create inconsistent data | Validate transitions in service layer |
| Suspended device still triggers alerts | Alert noise for devices intentionally paused | Skip alert evaluation for suspended devices |
| No suspended_reason | Admin later cannot remember why device was suspended | Require reason text on suspension |
| Online/offline confused with lifecycle state | Active device can be temporarily offline | Separate connectivity status from lifecycle status |
