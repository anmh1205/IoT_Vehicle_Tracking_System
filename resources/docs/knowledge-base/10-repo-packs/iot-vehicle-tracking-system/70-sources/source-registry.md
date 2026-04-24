# Source Registry

## Scan Groups

| Group | Paths | Source kind | Last modified signal | Use in bootstrap |
|---|---|---|---|---|
| `thesis-anchor` | `resources/reports/thesis/final/thesis-final-report.tex` | `thesis_tex` | `2026-04-21T15:34:05Z` | Design intent, rationale, structured claims |
| `thesis-anchor` | `resources/reports/thesis/final/thesis-final-report.toc` | `thesis_toc` | `2026-04-21T15:34:05Z` | Fast chapter decomposition |
| `thesis-anchor` | `resources/reports/thesis/final/thesis-final-report.md` | `thesis_md` | `2026-04-21T15:34:04Z` | Quick text lookup and appendix extraction |
| `thesis-assets` | `resources/reports/thesis/final/assets/uml/` | `thesis_asset` | directory | Canonical diagram sources mapped 1:1 to figures |
| `thesis-assets` | `resources/reports/thesis/final/assets/figures/` | `thesis_asset` | directory | Rendered figure outputs; support only |
| `thesis-assets` | `resources/reports/thesis/final/assets/schematic/` | `thesis_asset` | directory | Hardware netlist/PDF support |
| `repo-docs` | `README.md` | `repo_readme` | `2026-04-23T12:09:01Z` | Current onboarding, startup order, service catalog |
| `repo-docs` | `docs/system-architecture.md` | `repo_doc` | `2026-04-21T15:33:54Z` | Current architecture deltas and hardening notes |
| `repo-docs` | `resources/docs/firmware-source-code-reference/README.md` | `repo_doc` | `2026-04-15T16:54:26Z` | Validated firmware runtime reference pack |
| `repo-docs` | `resources/docs/hardware-datasheets/manifest.md` | `repo_doc` | current repo file | Hardware-vs-firmware verification support |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_Backend/docker-compose.yml` | `code_config` | `2026-03-26T02:54:39Z` | Backend container, port `4000`, network join |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_Frontend/docker-compose.yml` | `code_config` | `2026-03-30T20:51:03Z` | Frontend container, port `4001`, network join |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/docker-compose.yml` | `code_config` | `2026-02-24T02:26:16Z` | Bridge container, no host port exposure |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_EMQX/docker-compose.yml` | `code_config` | `2026-04-14T12:52:39Z` | Broker service and required secrets |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/docker-compose.yml` | `code_config` | `2026-04-15T21:14:56Z` | PostgreSQL port `5432`, init mount, healthcheck |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_Grafana/docker-compose.yml` | `code_config` | `2026-04-17T16:57:30Z` | Grafana port `4002`, provisioning, healthcheck |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_VictoriaMetrics/docker-compose.yml` | `code_config` | `2026-04-21T15:33:58Z` | Metrics store, retention, internal healthcheck |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_VictoriaLogs/docker-compose.yml` | `code_config` | `2026-03-03T10:03:28Z` | Logs store, port `9428`, healthcheck |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_Backend/package.json` | `code_config` | `2026-04-15T17:48:09Z` | Backend stack/version and commands |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_Frontend/package.json` | `code_config` | `2026-03-30T20:51:06Z` | Frontend stack/version and commands |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/package.json` | `code_config` | `2026-02-24T02:26:16Z` | Bridge stack/version and commands |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_Backend/.env.example` | `code_config` | `2026-04-21T15:33:54Z` | Current backend env contract |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/.env.example` | `code_config` | `2026-04-21T15:33:58Z` | Current bridge env contract |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_Mobile/.env.example` | `code_config` | `2026-03-24T02:01:35Z` | Mobile shell env contract |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/.env.example` | `code_config` | `2026-04-23T12:09:12Z` | Current Postgres bootstrap env |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/index.ts` | `code_config` | current repo file | Health, metrics, Swagger, realtime listener |
| `repo-truth` | `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/constants/topics.ts` | `code_config` | current repo file | Canonical external/internal topic map |
| `repo-truth` | `iot-vehicle-tracking-system-firmware/main/src/mqtt_topics.c` | `code_config` | current repo file | Firmware topic builders including `commands` |

## Taxonomy Used For Both Thesis And Repo Scan
- `hardware`
- `firmware`
- `mqtt-data-contract`
- `backend-cloud`
- `frontend`
- `observability`
- `deployment`
- `testing-measurements`
- `risks-hardening`
- `roadmap`

## Reserved But Not Used In This Batch
- `historical-support`: older plans, reports, and rendered PDFs beyond anchor-linked sections

