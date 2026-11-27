# OTA

The app starts one OTA task through `include/ota/ota.h`. The task reads an HTTPS byte source supplied by app wiring, hashes and writes the image, and reports progress to the app. The job verifies SHA-256 and the installed image version before persisting the confirmation context and selecting the new partition.

| File | Responsibility |
| --- | --- |
| `src/ota.c` | Configuration, progress delivery, running image and rollback APIs |
| `src/ota_task.c` | Single active task and command lifetime |
| `src/ota_job.c` | Download retries, image checks, cleanup and boot partition selection |

Download and flash behavior live in `ota_job.c`. App-side confirmation and final report delivery live in app `fw_update/`.
