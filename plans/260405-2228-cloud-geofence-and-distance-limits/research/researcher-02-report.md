# Research Report: Boundary datasets and cloud geofence integration

Date: 2026-04-05 22:28 (Asia/Saigon)

## Executive Summary
Need 2-layer strategy.
- Vietnam-first authoritative source: official Vietnam mapping portal (`vnsdi.mae.gov.vn`) if you can extract the 2025 admin boundary service; best authority, but direct downloadable SHP/GeoJSON not clearly exposed in search.
- Open fallback: geoBoundaries for clean GeoJSON/zip and permissive licensing; GADM only if non-commercial license is acceptable.

For MVP, do this: store province-level boundaries in PostGIS as `MULTIPOLYGON`, SRID 4326, indexed with GiST, validate geometry on ingest, and query with `ST_Contains`/`ST_Intersects`. Keep a normalized boundary import pipeline so you can swap source datasets later without changing app logic.

## Research Methodology
- Sources consulted: 10+
- Date range: 2023-2026
- Key search terms: Vietnam province boundary dataset, GeoJSON, shapefile, license, update cadence, geoBoundaries, GADM, PostGIS ST_Contains, spatial index, Turf booleanPointInPolygon, official Vietnam mapping portal

## Key Findings

### 1. Best boundary sources
**Vietnam official / highest authority**
- `vnsdi.mae.gov.vn` is the strongest source for legal/admin correctness.
- Search results show the 2025 administrative boundary service and a broader ArcGIS service that supports `JSON, geoJSON, PBF` query formats.
- Direct SHP/GeoJSON download not confirmed from indexed search; likely REST-query based export.
- Use this when legal accuracy matters more than convenience. 

**Open / practical source**
- geoBoundaries has Vietnam ADM1 current API endpoint and provides official GeoJSON download URL and zip bundle.
- Metadata seen in search: Vietnam ADM1 `boundaryYearRepresented=2008`, `boundaryLicense=Public Domain`, `sourceDataUpdateDate=2023-01-19`, `buildDate=2023-12-12`.
- geoBoundaries platform license is CC BY 4.0; per-layer license may differ.
- Cadence: weekly-ish builds, moving toward faster releases.

**Global fallback**
- GADM version 4.1 is current in the docs; version 5 planned for Jan 2026.
- Formats: shapefile, GeoJSON, GeoPackage.
- License is restrictive: academic/non-commercial only; no redistribution/commercial use without permission.
- Good for internal analysis, not ideal for SaaS redistribution unless legal review approves.

### 2. Data format / normalization strategy
- Normalize everything to WGS84 `SRID 4326`.
- Prefer `MULTIPOLYGON` geometry in DB, even if source has single polygons.
- Simplify only a derived display copy, not the canonical query geometry.
- Use `ST_MakeValid` on ingest; reject invalid geometries.
- Keep canonical raw source artifact + cleaned DB geometry + simplified cache geometry.
- Index geometry with GiST. If you need fast text lookup, also index province code/name separately.

### 3. Backend point-in-polygon options
**Best MVP choice**
- PostGIS on backend.
- Query path:
  1. prefilter with bounding box / indexed predicate
  2. exact `ST_Contains` or `ST_Intersects`
- This is safer and simpler than implementing polygon logic in Node.

**Node/TS-only option**
- Turf `booleanPointInPolygon` supports Polygon/MultiPolygon and holes, with `ignoreBoundary` option.
- Good for small in-memory checks or client-side validation.
- Not ideal as the main geofence engine if you already have PostGIS.

**Practical recommendation**
- Use PostGIS as source of truth.
- Use Turf only for unit tests or fallback local validation.

### 4. Boundary correctness testing
Must test these cases:
- point strictly inside polygon
- point clearly outside
- point exactly on boundary
- point inside a hole
- point in a multipolygon member
- point near shared borders between provinces

Rules to verify:
- `ST_Contains` excludes boundary points in strict semantics; if your product wants boundary-inclusive behavior, compare with `ST_Covers` or handle boundary separately.
- Turf has explicit `ignoreBoundary` toggle; keep semantics documented and aligned with backend.

### 5. MVP vs later
**MVP**
- Use geoBoundaries ADM1 or official Vietnam service export if easy to obtain.
- Ingest once, store cleaned polygons in PostGIS.
- Query by `lat/lng` against province boundaries.
- Cache computed province lookup result per device location event.

**Later**
- Add ADM2/admin-hierarchy support.
- Add source versioning and delta refresh.
- Add boundary QA pipeline and automated regression tests with known edge points.
- Add fallback source selection: official VN > geoBoundaries > GADM.

## Comparative Analysis
| Source | Authority | License | Format | Update cadence | Fit for cloud geofence |
|---|---|---|---|---|---|
| Vietnam official portal | Highest | Portal/service-specific | ArcGIS REST, likely JSON/GeoJSON export | Event-driven by legal changes | Best for correctness, harder to ingest |
| geoBoundaries | High-ish | CC BY 4.0 platform; layer-specific metadata | GeoJSON/zip | Frequent / weekly-ish | Best open-source MVP choice |
| GADM | Medium | Academic/non-commercial | SHP/GPKG/JSON | Versioned releases | Good fallback, license restricts SaaS use |
| OSM | Low for legal admin authority | ODbL | Exports via tooling | Very fresh | Good freshness, weak authority |

## Implementation Recommendations

### Quick Start Guide
1. Pick source:
   - Vietnam official portal if you can export clean admin polygons.
   - Otherwise geoBoundaries Vietnam ADM1.
2. Ingest to PostGIS with SRID 4326.
3. Run geometry validation and normalization.
4. Build GiST index on geometry.
5. Query with backend geofence service.

### Code-shape recommendation
- Keep one canonical table for boundaries.
- Keep one service for ingestion/refresh.
- Keep one geofence query function.
- Keep one test suite with boundary-edge fixtures.

### Common Pitfalls
- Mixing source licenses without checking redistribution rights.
- Treating boundary points inconsistently across tools.
- Simplifying canonical geometry and losing accuracy.
- Using Node-only point-in-polygon for large province datasets.
- Forgetting multipolygon and holes.

## Resources & References

### Official Documentation
- [geoBoundaries API docs](https://www.geoboundaries.org/api.html)
- [geoBoundaries current Vietnam ADM1 metadata](https://www.geoboundaries.org/api/current/gbOpen/VNM/ADM1/)
- [GADM data page](https://gadm.org/data.html)
- [GADM license](https://gadm.org/license.html)
- [GADM formats](https://gadm.org/formats.html)
- [Vietnam mapping portal](https://vnsdi.mae.gov.vn/)
- [Vietnam 2025 boundary service entry](https://vnsdi.mae.gov.vn/basemap/rest/services/34DVHC2025/MapServer/info)
- [Vietnam ArcGIS service supporting JSON/geoJSON/PBF](https://vnsdi.mae.gov.vn/server/rest/services/BDHCVN/BanDoHanhChinhVietNam/MapServer/layers)
- [PostGIS ST_Contains](https://postgis.net/docs/ST_Contains.html)
- [PostGIS spatial index FAQ](https://postgis.net/documentation/faq/spatial-indexes/)
- [PostGIS ST_Intersects](https://postgis.net/docs/en/ST_Intersects.html)
- [Turf booleanPointInPolygon](https://turfjs.org/docs/7.2.0/api/booleanPointInPolygon)

### Further Reading
- GeoJSON export from ArcGIS REST services
- PostGIS `ST_Covers` vs `ST_Contains` semantics
- Boundary QA with known border fixtures

## Appendices

### A. Glossary
- **ADM1**: first-level administrative boundary, usually province/state.
- **WGS84 / SRID 4326**: standard lat/lng coordinate system.
- **GiST**: PostgreSQL spatial index type used by PostGIS.
- **Multipolygon**: one boundary made of multiple polygon parts.
- **Boundary point**: point lying exactly on polygon edge.

### B. Version Compatibility Matrix
| Component | Recommendation |
|---|---|
| DB | Postgres + PostGIS latest stable |
| Geometry SRID | 4326 |
| Source format | GeoJSON preferred for import |
| Runtime | Node/TS backend |

### C. Raw Research Notes
- Official Vietnam source is best, but search results did not expose a direct shapefile download.
- geoBoundaries gives the most convenient open ADM1 path for Vietnam.
- GADM is usable only if the license fits your deployment model.
- PostGIS should be source of truth for server-side geofence checks.

## Unresolved questions
- Can the Vietnam official portal expose a stable GeoJSON export endpoint for 2025 ADM1?
- Which license terms apply to any specific downloadable artifact from the Vietnam portal?
- Do we need ADM2 now or only province-level ADM1 for the MVP?
