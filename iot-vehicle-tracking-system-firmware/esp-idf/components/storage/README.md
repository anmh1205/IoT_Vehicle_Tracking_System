# Storage

The storage task serializes SD writes and owns the offline queue cursor. The app can copy the peek slot under its mutex. Synchronous versioned NVS APIs may wait on flash.

| Source | Responsibility |
| --- | --- |
| `include/storage` | Initialization, NVS records, SD logging and offline queue APIs |
| `src/storage_task.c` | Recovery before task creation, request queue and SD work |
| `src/nvs/nvs_store.c` | IVTS namespace, versioned record envelope, configuration and boot ID |
| `src/sd/` | SDMMC mount and log rotation |
| `src/queue/queue_store.c` | Segment discovery, open and recovery |
| `src/queue/queue_rw.c` | Disk frame, append, cursor checkpoint and token-checked pop |
| `src/queue/queue_peek.c` | File read, cached record and copy mutex |

Add a typed NVS wrapper in app `persist/app_records.c` with an explicit key and layout version, using `storage_record_load/save` for its envelope. Before changing the on-disk format, cover serialized bytes and upgrade recovery. Mounting SD without formatting preserves cards whose filesystems cannot be mounted.
