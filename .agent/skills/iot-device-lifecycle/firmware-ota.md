# Firmware OTA

> Ship updates safely. One bad firmware push can brick an entire fleet.

## OTA Flow Overview

```
End-to-end firmware update flow:
│
├── 1. Upload firmware
│   ├── Admin uploads firmware binary via API
│   ├── System stores file, computes SHA-256 checksum
│   ├── Metadata: version, file_size, checksum, release_notes
│   └── Status: uploaded (not yet active)
│
├── 2. Activate version
│   ├── Admin marks firmware as "active" (current recommended version)
│   ├── Only one version active per device_type at a time
│   ├── Previous active version becomes "archived"
│   └── Activation does NOT deploy (separate step)
│
├── 3. Deploy to devices
│   ├── Admin selects target: single device, device group, or full fleet
│   ├── System publishes MQTT command to each target device
│   │   └── Topic: v1/{device_id}/command/firmware
│   │   └── Payload: { version, download_url, checksum, file_size }
│   ├── Create firmware_update_log entry: status = "pending"
│   └── Device begins download process
│
├── 4. Device applies update
│   ├── Device downloads firmware binary from download_url
│   ├── Device verifies checksum (SHA-256 match)
│   ├── Device writes to flash partition (A/B partition if supported)
│   ├── Device reboots to new firmware
│   └── Device reports new version on next MQTT message
│
├── 5. Verify
│   ├── Backend compares reported version with expected version
│   ├── If match: update firmware_update_log status = "success"
│   ├── If mismatch after timeout: status = "failed"
│   └── Dashboard shows deployment progress (success/pending/failed)
│
└── 6. Rollback (if needed)
    ├── If device supports A/B partitions: automatic rollback on boot failure
    ├── If not: admin deploys previous version as new update
    └── Mark failed version as "recalled" to prevent further deployment
```

## Firmware Data Model

```
firmwares table:
├── id                  # Primary key (UUID)
├── version             # Semantic version string (e.g., "1.2.3")
├── device_type         # Which device type this firmware is for
├── filename            # Original upload filename
├── file_path           # Storage path on server or object storage
├── file_size           # Size in bytes
├── checksum            # SHA-256 hash of binary
├── release_notes       # What changed in this version
├── is_active           # Boolean, only one active per device_type
├── status              # uploaded | active | archived | recalled
├── uploaded_by         # User who uploaded (FK to users)
├── created_at          # Upload timestamp
└── activated_at        # When marked as active (null if never)

firmware_update_logs table:
├── id                  # Primary key
├── device_id           # FK to devices
├── firmware_id         # FK to firmwares
├── status              # pending | downloading | applying | success | failed | timeout
├── command_sent_at     # When MQTT command was published
├── started_at          # When device acknowledged / started download
├── completed_at        # When device reported success or failure
├── error_message       # Failure reason (if status = failed)
└── created_at          # Row creation timestamp
```

## Deployment Strategy Decision

```
Which deployment strategy?
│
├── Single Device
│   ├── Deploy to one specific device
│   ├── Use for: testing new firmware before wider rollout
│   ├── Risk: minimal (one device affected)
│   ├── Monitoring: watch single device logs
│   └── When: always do this first for new firmware versions
│
├── Staged Rollout
│   ├── Deploy in waves: 10% -> 30% -> 100%
│   ├── Wait period between waves (e.g., 24 hours)
│   ├── Monitor success rate between waves
│   ├── Abort if failure rate exceeds threshold (e.g., > 5%)
│   ├── Use for: production updates to large fleet
│   ├── Risk: controlled, can stop at any wave
│   └── When: default strategy for production
│
└── Full Fleet
    ├── Deploy to all devices at once
    ├── Use for: critical security patches that cannot wait
    ├── Risk: highest (if firmware is bad, entire fleet affected)
    ├── Requires: proven firmware (already tested on subset)
    └── When: emergency patches only, after single-device test
```

## Staged Rollout Process

```
Staged rollout execution:
│
├── Wave 1: Canary (5-10%)
│   ├── Select random subset or designated test devices
│   ├── Deploy and monitor for 24-48 hours
│   ├── Check: success rate, error logs, device stability
│   ├── Gate: success rate > 95% -> proceed to wave 2
│   └── If gate fails: abort, investigate, rollback
│
├── Wave 2: Early Majority (30%)
│   ├── Deploy to 30% of fleet
│   ├── Monitor for 24 hours
│   ├── Gate: success rate > 98% -> proceed to wave 3
│   └── If gate fails: abort, rollback affected devices
│
└── Wave 3: Full Fleet (100%)
    ├── Deploy to remaining devices
    ├── Monitor for anomalies
    └── Mark firmware version as "proven"
```

## Download URL Strategy

```
How does the device download the firmware binary?
│
├── Direct from backend API
│   ├── URL: GET /api/v1/firmwares/{id}/download
│   ├── Auth: device auth token in header or query param
│   ├── Pro: simple, single server
│   ├── Con: backend serves large files, bandwidth bottleneck
│   └── Good for: small fleets (< 100 devices)
│
├── Object storage with signed URL
│   ├── Backend generates time-limited signed URL (S3, MinIO, GCS)
│   ├── Device downloads directly from storage
│   ├── Pro: offloads bandwidth from backend
│   ├── Con: requires object storage setup
│   └── Good for: large fleets, large firmware files
│
└── CDN or local mirror
    ├── Firmware cached at edge locations
    ├── Device downloads from nearest mirror
    ├── Pro: fastest download, minimal bandwidth cost
    ├── Con: most complex setup
    └── Good for: globally distributed fleets
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| No checksum verification | Corrupted firmware applied, device bricked | Always SHA-256 verify before applying |
| No rollback plan | Bad firmware permanently disables device | A/B partitions or manual rollback via previous version |
| Deploy to all without testing | One bug bricks entire fleet | Always test on single device first, then staged rollout |
| No update log tracking | Cannot tell which devices updated successfully | Track status per device in firmware_update_logs |
| Firmware download over plain HTTP | Binary can be tampered with in transit | Use HTTPS or signed URLs |
| No timeout on pending updates | "Pending" entries accumulate forever | Set timeout (e.g., 24h), mark as "timeout" if no response |
| Blocking device during update | Device stops sending data during long update | Download in background, apply during scheduled window |
