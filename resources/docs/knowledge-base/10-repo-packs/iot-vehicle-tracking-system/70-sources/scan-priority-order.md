# Scan Priority Order

1. Read thesis structure first:
   - `thesis-final-report.toc`
   - `thesis-final-report.md`
2. Read thesis deep sections only where needed:
   - Ch1 intent and scope
   - Ch2 requirements and constraints
   - Ch3 firmware, cloud, frontend design
   - Ch4 deployment, implementation, observability, hardening
   - Ch5 evaluation, risk, roadmap
   - Ch6 lessons learned
   - Appendix sections for API, env, install/run
3. Read current repo docs:
   - `README.md`
   - `docs/system-architecture.md`
   - `resources/docs/firmware-source-code-reference/README.md`
   - `resources/docs/hardware-datasheets/manifest.md` when hardware claims need support
4. Read current repo truth:
   - compose manifests
   - package manifests
   - env examples
   - backend health/realtime entrypoints
   - MQTT Bridge topic constants and health server
   - firmware MQTT topic builders
5. Use thesis assets only after text-section linkage exists:
   - `.mmd` source before `.svg`/`.png`
   - `schematic/` only for hardware support, not as first-pass source
6. Use inference last and keep it out of promoted notes unless corroborated

