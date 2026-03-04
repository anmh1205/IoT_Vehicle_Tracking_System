# Rule Engine Concept

> Data without rules is just noise. Rules turn raw telemetry into actionable alerts and automation.

## Core Idea

```
Rule engine principle:
│
├── Data arrives (telemetry, status change, timer)
│
├── Check rules (does this data match any rule condition?)
│
└── Execute actions (create alert, send notification, run command)
```

## Rule Types

```
Types of rules in IoT systems:
│
├── Threshold Rule
│   ├── Condition: value > max OR value < min
│   ├── Example: speed > 80 km/h -> overspeed alert
│   ├── Example: fuel_level < 15% -> low fuel warning
│   ├── Example: battery_voltage < 11.5V -> battery critical
│   └── Evaluation: on every telemetry message
│
├── State Change Rule
│   ├── Condition: state transitioned from A to B
│   ├── Example: ignition changed from "on" to "off" -> trip ended
│   ├── Example: device went from online to offline -> disconnect alert
│   ├── Example: door changed from "closed" to "open" -> unauthorized access
│   └── Evaluation: compare current state with previous state
│
├── Schedule / Absence Rule
│   ├── Condition: no data received for N minutes
│   ├── Example: no message for 30 minutes -> device unresponsive alert
│   ├── Example: no heartbeat for 2x keep-alive interval -> connection lost
│   └── Evaluation: periodic check (cron or timer), not on message arrival
│
└── Geofence Rule
    ├── Condition: device entered or exited a defined area
    ├── Example: truck entered warehouse zone -> "arrived at depot"
    ├── Example: vehicle left city boundary -> "left service area"
    ├── Requires: geofence polygons stored in database
    └── Evaluation: on every position update, point-in-polygon check
```

## Actions

```
What happens when a rule triggers?
│
├── Create Alert
│   ├── Insert row into alerts table
│   ├── Fields: device_id, alert_type, severity, message, data
│   ├── Emit Socket.IO event: "alert:new" to dashboard
│   └── Most common action
│
├── Send Notification
│   ├── Push notification via FCM (mobile app)
│   ├── Email via SMTP or transactional service (SendGrid, SES)
│   ├── SMS via Twilio or similar
│   ├── Webhook to external system
│   └── Requires: notification preferences per user/customer
│
├── Execute Command
│   ├── Publish MQTT command to device
│   ├── Example: overspeed -> send speed limiter command
│   ├── Example: unauthorized movement -> send immobilizer command
│   └── Caution: automated commands to physical devices need safety checks
│
└── Log Event
    ├── Write structured event to VictoriaLogs
    ├── Purpose: audit trail, compliance, historical analysis
    └── Every rule trigger should be logged regardless of other actions
```

## Implementation Approach Decision

```
How to implement the rule engine?
│
├── Simple: Hardcoded if/else (most IoT projects start here)
│   ├── Rules defined directly in telemetry processing service
│   ├── if (speed > config.maxSpeed) createAlert(...)
│   ├── if (fuelLevel < config.minFuel) createAlert(...)
│   ├── Pro: simple, debuggable, fast
│   ├── Con: adding rules requires code change and redeploy
│   ├── Good for: fixed business rules, small team
│   └── When: you know all rules at development time
│
├── Configurable: Database-driven rules
│   ├── Rules stored in database table: condition, threshold, action
│   ├── Telemetry service loads rules, evaluates dynamically
│   ├── Admin UI to create/edit/delete rules
│   ├── Pro: rules changed without code deploy
│   ├── Con: more complex evaluation engine, harder to debug
│   ├── Good for: multi-tenant, user-configurable alerts
│   └── When: different customers need different rules
│
└── Advanced: Dedicated rule engine service
    ├── Separate microservice for rule evaluation
    ├── Complex event processing (CEP), temporal rules
    ├── Consider existing platforms: ThingsBoard Rule Engine, Node-RED
    ├── Pro: most powerful, handles complex event chains
    ├── Con: significant complexity, operational overhead
    ├── Good for: platforms with hundreds of rule types
    └── When: building an IoT platform product (not a project)
```

## Approach Comparison

| Factor | Hardcoded | Database-driven | Dedicated Engine |
|--------|-----------|-----------------|-----------------|
| **Complexity** | Low | Medium | High |
| **Flexibility** | Fixed at build | Configurable at runtime | Fully dynamic |
| **Debugging** | Easy (breakpoints) | Moderate (log rule evaluation) | Hard (distributed) |
| **Performance** | Fastest | Fast (cache rules) | Overhead |
| **Multi-tenant** | Same rules for all | Per-customer rules | Per-customer complex rules |
| **Best for** | MVP, small projects | SaaS platforms | IoT platform products |

## Alert Debouncing

```
Why debounce?
│
├── Problem: device oscillates around threshold
│   ├── Speed: 79, 81, 79, 81, 79, 81 (around 80 limit)
│   ├── Without debounce: 3 alerts in 30 seconds
│   └── User gets alert fatigue, ignores real alerts
│
├── Debounce strategies:
│   ├── Cooldown period
│   │   ├── After alert triggers, suppress same alert for N minutes
│   │   ├── Example: overspeed cooldown = 5 minutes
│   │   └── Implementation: store last_alert_at per device+type in memory/Redis
│   │
│   ├── Sustained threshold
│   │   ├── Value must exceed threshold for N consecutive readings
│   │   ├── Example: speed > 80 for 3 consecutive messages -> alert
│   │   └── Implementation: counter per device+type, reset on below-threshold
│   │
│   └── Hysteresis
│       ├── Upper threshold to trigger, lower threshold to clear
│       ├── Example: alert when fuel < 15%, clear when fuel > 20%
│       └── Implementation: track alert state (active/cleared) per device
│
└── Recommendation: start with cooldown period (simplest)
```

## Rule Configuration Data Model

```
For database-driven approach:
│
├── alert_rules table:
│   ├── id                  # Primary key
│   ├── name                # Human-readable rule name
│   ├── customer_id         # Scope: null = global, FK = per-customer
│   ├── device_type         # Which device types this applies to (null = all)
│   ├── rule_type           # threshold | state_change | absence | geofence
│   ├── metric_name         # Which metric to evaluate (e.g., "speed", "fuel_level")
│   ├── condition           # gt | lt | eq | ne | enter | exit
│   ├── threshold_value     # Numeric threshold (null for non-threshold rules)
│   ├── duration_seconds    # For absence rules: how long without data
│   ├── geofence_id         # For geofence rules: FK to geofences table
│   ├── severity            # info | warning | critical
│   ├── cooldown_seconds    # Debounce period
│   ├── actions             # JSONB: [{type: "alert"}, {type: "email", to: "..."}, ...]
│   ├── is_enabled          # Boolean toggle
│   └── created_at          # When rule was created
│
└── Evaluation pseudocode:
    ├── Load rules for this device_type (cache in memory)
    ├── For each rule: evaluate condition against incoming data
    ├── If condition met AND cooldown expired: execute actions
    └── Log every evaluation for debugging (optional, verbose)
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Rules evaluated in frontend | Security bypass, inconsistent triggers | Always evaluate rules server-side |
| No debouncing on alerts | Alert storms, user fatigue | Cooldown period or sustained threshold |
| Blocking rules on MQTT thread | Slow rule evaluation delays all message processing | Evaluate async, or keep rules fast (< 1ms) |
| No logging of rule evaluations | Cannot debug why alert did or did not fire | Log rule match/miss at debug level |
| Building full CEP engine from scratch | Massive scope creep, years of work | Use hardcoded or database-driven, or adopt existing platform |
| Hardcoded notification targets | Cannot change alert recipients without code deploy | Store notification preferences in database |
| No alert acknowledgment | Dashboard fills with stale alerts | Add acknowledged/resolved status to alerts |
