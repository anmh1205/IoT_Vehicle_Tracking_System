# Research synthesis - rapid IoT infra bootstrap

Date: 2026-03-25  
Scope: EMQX + MQTT Bridge + PostgreSQL + VictoriaMetrics + VictoriaLogs with config-driven payload-to-storage.

## Core findings
1. EMQX Data Integration supports Sink/Source, rule SQL transform, async/batch/buffer/fallback; good fit for declarative routing layer.
2. EMQX MQTT bridge supports topic/QoS mapping via placeholders and shared subscription patterns for cluster mode.
3. EMQX PostgreSQL sink supports preprocessed/prepared SQL template style; practical for generated SQL mappings.
4. VictoriaMetrics accepts push protocols (remote_write, OpenTelemetry, Influx, import APIs); suitable for flexible metric ingest.
5. VictoriaMetrics docs stress cardinality control; avoid volatile labels.
6. VictoriaLogs supports multiple ingestion protocols and HTTP params (`_msg_field`, `_time_field`, `_stream_fields`), ideal for declarative log projection.
7. PostgreSQL docs support JSONB-first modeling, generated columns, partitioning; useful for raw+typed hybrid schema.

## Implications for this plan
1. Use contract-first model, then generate EMQX rules + bridge dispatch + SQL + observability mappings.
2. Keep bridge logic thin: enrichment + side effects; avoid hard-coded field routing.
3. Keep one cardinality policy in contract for both metrics labels and logs stream fields.
4. Use Postgres hybrid strategy:
   - raw JSONB append table for replay/debug
   - typed projection tables for query/API
   - generated columns/indexes for frequent filters.

## Constraints observed in current repo
1. Current bridge handlers are explicit and hard-coded per message family.
2. Current stack split by compose service already aligns with profile-based bootstrap.
3. Existing Postgres init structure is migration-friendly and can host generated DDL.

## Source links
- EMQX Data Integration: https://docs.emqx.com/en/emqx/latest/data-integration/data-bridges.html
- EMQX MQTT bridge: https://docs.emqx.com/en/emqx/latest/data-integration/data-bridge-mqtt.html
- EMQX PostgreSQL sink: https://docs.emqx.com/en/emqx/latest/data-integration/data-bridge-pgsql.html
- EMQX Rules (Cloud docs): https://docs.emqx.com/en/cloud/latest/data_integration/rules.html
- VictoriaMetrics ingest: https://docs.victoriametrics.com/victoriametrics/index.html
- VictoriaMetrics key concepts: https://docs.victoriametrics.com/keyconcepts/
- VictoriaLogs ingest: https://docs.victoriametrics.com/victorialogs/data-ingestion/readme/
- PostgreSQL JSON types: https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL generated columns: https://www.postgresql.org/docs/18/ddl-generated-columns.html
- PostgreSQL partitioning: https://www.postgresql.org/docs/current/ddl-partitioning.html

## Unresolved questions
1. Throughput/latency target numbers for default profile are not finalized.
2. Decision boundary between EMQX-first transform vs Bridge-first transform still needs owner sign-off.
