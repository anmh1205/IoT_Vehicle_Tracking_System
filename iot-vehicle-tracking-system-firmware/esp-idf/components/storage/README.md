# Storage

The storage task serializes writes to SD and owns the offline queue cursor. The app can copy the peek slot under its mutex. Configuration and versioned NVS records have synchronous APIs and may wait on flash. Mounting SD without formatting preserves an existing card when initialization fails.

| Folder | Responsibility |
| --- | --- |
| `include/storage` | Initialization, NVS records, SD logging and offline queue APIs |
| `src/nvs` | IVTS namespace, record header, version and CRC, config and boot counter |
| `src/sd` | SDMMC mount and log rotation |
| `src/queue` | Segment repair, frame codec, peek slot, cursor checkpoint and token-checked pop |

Add a typed NVS record in app `persist/app_records.c` with an explicit key and layout version. Use `storage_record_load/save` for its envelope. Change queue framing in `queue/queue_frame.c` and cover the serialized bytes before changing the on-disk format. Recovery and cursor behavior live in `queue_open.c` and `queue_cursor.c`.
