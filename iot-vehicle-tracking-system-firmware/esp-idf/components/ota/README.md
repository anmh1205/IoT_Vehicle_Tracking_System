# OTA

The app starts one OTA task through `include/ota/ota.h`. App wiring supplies the HTTPS byte source and preparation callback. The task downloads, hashes and writes the image while reporting progress to the app.

| Source | Responsibility |
| --- | --- |
| `src/ota_task.c` | Task creation and command lifetime, configuration, progress and running image or rollback APIs |
| `src/ota_job.c` | Download retries, image checks, cleanup and boot partition selection |
| `src/ota_internal.h` | Private job, configuration and event interface |

The job verifies SHA-256 and the finalized image version, then persists the confirmation context before selecting the new partition. The app confirms the image and delivers the final report in app `src/fw_update.c`.
