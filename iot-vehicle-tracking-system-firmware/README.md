# IVTS tracker firmware

| Project | Scope |
| --- | --- |
| [esp-idf](esp-idf/) | Primary ESP32-S3 source. Imported from [anti-vibe at 1c71eb8](https://github.com/anmh1205/anti-vibe/commit/1c71eb8d4fa057e922f0c965ae81e1765e1720a8). |
| [esp-idf-legacy](esp-idf-legacy/) | Previous ESP32-S3 firmware, with its original host tests, configuration and documentation. |
| [zephyr](zephyr/) | Reserved for a future Zephyr implementation. |

From either ESP-IDF project, run `python -m pytest tests -q` for host tests and `idf.py build` in an ESP-IDF environment. CI builds the primary project with ESP-IDF 5.5.3 and the legacy project with 5.4.1.

Verify PCB revision, flash capacity, SIM7600 CA provisioning, persistent device configuration, SD queue migration and OTA rollback on a bench tracker before upgrading devices running the legacy firmware. See the [primary hardware and deployment notes](esp-idf/IVTS.md).
