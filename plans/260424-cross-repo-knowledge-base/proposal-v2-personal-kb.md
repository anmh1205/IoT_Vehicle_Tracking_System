# Proposal V2: Personal Knowledge Base Built From Repos, Not Trapped In Repos

Date: 2026-04-24  
Context: follow-up proposal after re-framing goal from "repo inventory" to "personal knowledge system fed by repos".

## Goal Reset

You are not trying to document repos for their own sake.

You are trying to build:
- one personal engineering knowledge base
- many repo-specific knowledge packs
- one shared model that lets knowledge move upward from code into reusable understanding

That means the design target is not "repo note quality".

The design target is:
- durable understanding
- fast retrieval
- low drift from reality
- clean separation between evidence, interpretation, and action

## Core Thesis

Repos are evidence sources.  
Repo knowledge packs are the first distilled layer.  
Your personal knowledge base is the synthesis layer.

If you treat repos as the center, your vault becomes a nicer file explorer.  
If you treat knowledge as the center, repos become structured evidence feeders.

This is the right mental model:

```text
Repo / README / code / commit / run result
    ->
Repo knowledge pack
    ->
Domain / concept / system notes
    ->
Personal synthesis, patterns, decisions, runbooks
```

## What Changes From V1

This version intentionally moves away from a repo-first architecture.

What stays:
- one Obsidian vault is still the right default
- one canonical repo note per repo is still mandatory
- `Bases` should still be the main query surface
- `Properties` should still be the metadata backbone

What changes:
- repo notes are no longer the center of the model
- concept notes and pattern notes become first-class citizens
- each repo gets a "knowledge pack" instead of just one summary note
- the personal layer gets its own folder system and review rules
- knowledge quality is tracked with confidence, provenance, and validation

## Recommendation: One Main Engineering Vault, Not Many Separate Vaults

For your current situation, do not create one physical vault per repo.

Use:
- one main engineering vault
- one folder subtree per repo knowledge pack
- one global personal synthesis layer above them

Reason:
- cross-repo linking stays native
- search stays global
- `Bases` views can query everything
- rename/move operations remain safe with internal link updates
- maintenance cost stays low

Create separate physical vaults only if one of these becomes true:
- a repo has a different confidentiality boundary
- a repo is shared with another team and needs separate conventions
- one repo grows into hundreds of knowledge notes and starts polluting retrieval

For now, none of that justifies multiple vaults.

## Physical Information Architecture

### Top Level

```text
00-inbox/
01-home/
10-repo-packs/
20-domains/
30-concepts/
40-systems/
50-decisions/
60-runbooks/
70-patterns/
80-projects/
90-journal/
95-review/
99-archive/
_templates/
_assets/
_system/
```

### Meaning Of Each Layer

- `00-inbox/`
  Raw captures, scraps, URLs, quick findings, unprocessed notes.

- `01-home/`
  Entry points, dashboards, high-level navigation, Bases files, curated MOCs.

- `10-repo-packs/`
  One folder per repo. This is where repo-derived knowledge lives.

- `20-domains/`
  Stable problem spaces, such as `iot-fleet`, `industrial-monitoring`, `embedded-debugging`, `edtech`, `finance`.

- `30-concepts/`
  Durable technical concepts that transcend any one repo:
  `mqtt-topic-contract`, `offline-device-buffering`, `cmsis-dap-over-wifi`, `modem-reconnect-state-machine`, `rbac-nav-filtering`.

- `40-systems/`
  Cross-note system maps, architecture overviews, stack maps, lifecycle views.

- `50-decisions/`
  ADRs and decision logs.

- `60-runbooks/`
  Repeatable operational knowledge with validation dates.

- `70-patterns/`
  Reusable lessons and implementation patterns derived from actual work.

- `80-projects/`
  Cross-repo initiatives, audits, migrations, experiments.

- `90-journal/`
  Daily engineering log and discovery notes.

- `95-review/`
  Weekly and monthly review notes.

- `99-archive/`
  Stale, superseded, or historical material.

## The Two Knowledge Layers You Actually Need

### Layer A: Repo Knowledge Pack

Each important repo gets a folder, not just one note.

Example:

```text
10-repo-packs/
  iot-vehicle-tracking-system/
    00-home.md
    10-architecture.md
    20-services/
      backend-api.md
      mqtt-bridge.md
      frontend.md
      mobile.md
      firmware.md
    30-runbooks/
      bring-up-local-stack.md
      trace-mqtt-ingestion.md
    40-decisions/
      monorepo-service-split.md
    50-glossary.md
    60-open-questions.md
    70-sources.md
```

Use a full pack only for repos that matter operationally.

Recommended full packs now:
- `iot-vehicle-tracking-system`
- `widock`
- `qaqy-fe-lms`
- `qaqy-finance`
- `ivm26-dashboard`
- `meht-ivm26-esp32s3`

Use light packs now:
- `mnna2024`
- `lcsc-api-proxy`
- `iot-vehicle-tracking-system-fw-remed`

Use reference packs only:
- `cliproxyapi`
- `obd2-ecu-simulator`
- `claude-code-agents-ui`
- `claude-agent-teams-ui`

### Layer B: Personal Synthesis Layer

This is the actual "base knowledge of you".

It contains:
- concept notes
- mental models
- system notes
- pattern notes
- decisions
- long-lived heuristics
- "how I think about this domain now"

This layer should answer:
- What do I know that survives beyond one repo?
- What patterns recur across systems?
- What trade-offs do I repeatedly choose?
- What operating rules have proven true in my work?

## Knowledge Types

### 1. Repo Note

Purpose:
- canonical pointer to repo identity
- minimal operational snapshot
- hub for the repo pack

One per repo. Always.

### 2. Service Note

Purpose:
- describe a meaningful subsystem or runtime unit
- often linked from repo pack and domain notes

Examples:
- `mqtt-bridge`
- `backend-api`
- `firmware-runtime`
- `notification-pipeline`

### 3. Concept Note

Purpose:
- capture knowledge that transcends one repo
- turn implementation details into reusable understanding

Examples from your current workspace:
- `concept-mqtt-topic-contract`
- `concept-device-offline-flush`
- `concept-cmsis-dap-over-wifi`
- `concept-rs485-modbus-sensor-polling`
- `concept-nextjs-admin-template-adaptation`

### 4. Domain Note

Purpose:
- organize concepts and repos under a stable area of work

Suggested initial domains:
- `domain-iot-fleet-tracking`
- `domain-industrial-vibration-monitoring`
- `domain-embedded-debugging`
- `domain-edtech-platform`
- `domain-personal-finance-platform`
- `domain-api-proxy-and-integration`

### 5. System Note

Purpose:
- capture architecture spanning multiple concepts or repos

Examples:
- `system-iot-device-to-dashboard-data-flow`
- `system-notification-delivery-across-mobile-and-web`
- `system-wireless-debugger-transport-path`

### 6. Decision Note

Purpose:
- record important trade-offs and their consequences

Examples:
- filesystem-first vault automation
- one vault vs many vaults
- repo pack granularity rules
- USB FS retained for WiDock

### 7. Runbook

Purpose:
- make repeated work reliable

Examples:
- bring up IoT stack locally
- review repo drift weekly
- onboard a new repo into the vault
- validate a repo pack after major changes

### 8. Pattern Note

Purpose:
- capture reusable strategies backed by experience

Examples:
- "promote recurring fixes into runbooks"
- "keep external repos as thin references"
- "convert implementation detail into concept note only when it recurs"

### 9. Source Note

Purpose:
- preserve provenance when needed
- useful for dense systems where one note should point to key repo files, commits, docs, dashboards

Not every repo needs many source notes.  
High-value systems do.

## Knowledge Assurance Model

This is the most important addition in V2.

Without an assurance model, the vault will slowly fill with:
- true things
- outdated things
- guessed things
- things that were true in one environment only

You need to make those different classes explicit.

### Knowledge States

Use one `knowledge_state` property:

- `captured`
  Raw or early note. Minimal processing.

- `distilled`
  Summarized into coherent note form, but not fully checked.

- `validated`
  Backed by evidence and recently reviewed.

- `stale`
  Probably useful, but not reviewed in time.

- `deprecated`
  Superseded, should not guide new work.

### Confidence Levels

Use one `confidence` property:

- `low`
- `medium`
- `high`

Rule:
- `high` requires explicit source references and recent review.
- `validated` + `high` is the standard for runbooks and important concept notes.

### Provenance Rules

Every note above `captured` should link to evidence.

Use:
- `source_of_truth`
- `source_refs`
- `validated_on`

Examples of evidence:
- repo README
- specific code path
- compose file
- API spec
- actual command output
- successful manual run
- commit introducing the behavior

### Operational Validation Rules

For runbooks:
- must include last successful validation date
- must include environment used
- must include expected success signal

For concept notes:
- must cite at least one repo or system note
- ideally two or more if the concept is cross-repo

For pattern notes:
- should be derived from at least two separate occurrences

### Suggested Universal Properties

```yaml
type:
knowledge_state:
confidence:
repo:
domain:
source_of_truth:
source_refs:
last_reviewed:
review_due:
owner_scope:
```

Suggested values:
- `owner_scope`: `personal`, `owned`, `collaborative`, `reference`

## Properties Schema By Note Type

### Repo Note

```yaml
type: repo
knowledge_state: validated
confidence: high
repo: iot-vehicle-tracking-system
path: E:/anmh1205/IoT_Vehicle_Tracking_System
git_remote: https://github.com/anmh1205/IoT_Vehicle_Tracking_System.git
status: active
owner_scope: owned
domain:
  - iot-fleet-tracking
stack:
  - esp32
  - nodejs
  - nextjs
  - flutter
  - mqtt
last_reviewed: 2026-04-24
review_due: 2026-05-08
```

### Concept Note

```yaml
type: concept
knowledge_state: distilled
confidence: medium
domain:
  - iot-fleet-tracking
repo:
  - iot-vehicle-tracking-system
  - meht-ivm26-esp32s3
source_refs:
  - [[repo-iot-vehicle-tracking-system]]
  - [[repo-meht-ivm26-esp32s3]]
last_reviewed: 2026-04-24
review_due: 2026-05-24
```

### Runbook

```yaml
type: runbook
knowledge_state: validated
confidence: high
repo:
  - iot-vehicle-tracking-system
domain:
  - iot-fleet-tracking
validated_on: 2026-04-24
review_due: 2026-05-24
success_signal: frontend at 4001, backend health 200, mqtt bridge connected
source_refs:
  - [[repo-iot-vehicle-tracking-system]]
```

## Naming Rules

Use boring, stable names.

Good:
- `repo-iot-vehicle-tracking-system`
- `concept-mqtt-topic-contract`
- `system-wireless-debugger-transport-path`
- `runbook-onboard-repo-into-vault`

Bad:
- `iot ideas`
- `new dashboard thoughts`
- `mqtt stuff`

### Aliases

Use aliases aggressively for human-friendly lookup:
- repo name
- acronym
- Vietnamese variant if useful
- old product names

Examples:

```yaml
aliases:
  - IVM26
  - Industrial Vibration Monitor
```

This matters because Obsidian supports linking via aliases and keeps links stable across note names.

## How Repo Knowledge Becomes Personal Knowledge

This is the transformation pipeline:

```text
Observed fact in repo
    ->
repo note or service note
    ->
if repeated or important:
    concept note or runbook
    ->
if cross-repo or strategic:
    pattern note or system note
    ->
if it changes how you choose:
    decision note
```

### Promotion Rules

Promote a repo fact into a concept note when:
- it appears in more than one repo
- it explains a recurring class of behavior
- it will matter again even if the repo disappears

Promote a concept into a pattern note when:
- it has proven useful more than once
- it contains an actionable recommendation

Promote anything into a runbook when:
- you have executed it more than twice
- missing a step causes failure

## Recommended Global Dashboards

### 1. Home Dashboard

Purpose:
- daily entry point
- links to active projects, review queue, and hot repos

### 2. Repo Registry Base

Source:
- all repo home notes

Columns:
- repo
- status
- owner_scope
- domain
- knowledge_state
- confidence
- last_reviewed
- review_due

Views:
- owned + active
- collaborative + active
- reference only
- stale review queue

### 3. Concept Index Base

Columns:
- concept
- domain
- linked repos
- knowledge_state
- confidence
- review_due

Views:
- cross-repo concepts
- high-confidence concepts
- stale concepts

### 4. Runbook Base

Columns:
- runbook
- repo
- validated_on
- review_due
- confidence

Views:
- overdue validation
- by repo
- by domain

### 5. Open Questions Base

Backed by notes with:
- `type: question`
- or `status: open`

This becomes your "knowledge debt" queue.

## Workspaces And Bookmarks

Use Obsidian core features here. They are worth the effort.

### Workspaces

Recommended saved workspaces:
- `home`
- `repo-deep-dive`
- `concept-synthesis`
- `weekly-review`

Why:
- repo deep dives need side-by-side notes + backlinks + search
- review needs Bases + daily/weekly notes

### Bookmarks

Create bookmark groups:
- `Active Repos`
- `Hot Concepts`
- `Runbooks`
- `Review Queues`
- `Current Projects`

Bookmark not just files:
- bookmark searches
- headings
- specific blocks

## Search Strategy

Do not rely on titles only.

Use 3 search modes:

### 1. Exact Retrieval

Use canonical names, aliases, repo slugs.

### 2. Metadata Retrieval

Use property-based search for:
- stale notes
- low confidence
- repo-specific notes
- unresolved items

### 3. Embedded Search Notes

For recurring review surfaces, embed query blocks in notes instead of rerunning manual search.

Examples:
- stale notes
- active repo questions
- all runbooks due this month

## Suggested Repo Pack Templates

### `00-home.md`

Must contain:
- what repo is
- why it exists
- active status
- links to architecture, services, decisions, runbooks
- top risks

### `10-architecture.md`

Must contain:
- system shape
- boundaries
- data flow
- external dependencies
- major contracts

### `50-glossary.md`

Important for:
- IoT
- embedded
- hardware terms
- app-domain terms

### `60-open-questions.md`

One place for unresolved things.  
Do not scatter uncertainty across many notes.

### `70-sources.md`

List:
- README
- key paths
- important scripts
- key commits
- external docs

## Suggested Personal Knowledge Templates

### Concept Template

Sections:
- Definition
- Why it matters
- Where I saw it
- Concrete examples
- Failure modes
- Related concepts
- Open questions

### Pattern Template

Sections:
- Problem
- Pattern
- Preconditions
- Anti-pattern
- Repo evidence
- Confidence

### System Template

Sections:
- Scope
- Components
- Data flow
- Control flow
- Bottlenecks
- Failure points
- Related runbooks

## Security And Hygiene Rules

Do not store:
- raw secrets
- private keys
- `.env` contents
- full tokens

Store instead:
- secret location
- owner
- rotation rule
- which system depends on it

This makes the vault operationally useful without making it dangerous.

## What To Exclude On Purpose

Do not create knowledge notes for:
- every component
- every page
- every DTO
- every config file
- every third-party library

Create notes only when at least one is true:
- operationally important
- conceptually reusable
- decision-heavy
- failure-prone
- cross-repo relevant

## Repo-Specific Recommendations For Your Workspace

### `IoT_Vehicle_Tracking_System`

Needs deepest pack.

Must have:
- repo home
- architecture
- service notes for backend, frontend, mqtt bridge, firmware, mobile
- runbooks for bring-up and troubleshooting
- concept notes extracted from MQTT contract, telemetry flow, offline buffering

### `WiDock`

Needs deep pack with strong system and concept layer.

Must have:
- transport path system note
- concept notes for CMSIS-DAP over Wi-Fi
- decision notes for USB mode and latency strategy
- runbook for product KPI validation

### `QAQY/fe-lms`

Do not over-document starter-template surface.

Focus on:
- business-specific flows
- realtime path via SignalR
- role model
- app-specific architecture delta from plain Next.js starter

### `QAQY/Finance`

Needs dual-stack pack.

Focus on:
- backend clean architecture map
- frontend app map
- auth flow
- data model concepts
- cross-cutting concept notes for finance domain terms

### `IVM26_Dashboard`

Treat as transitional system.

Focus on:
- what still matters
- what is legacy
- what concepts should migrate upward into domain notes

### `MEHT-IVM26-ESP32S3`

Treat as firmware knowledge feeder.

Focus on:
- hardware interfaces
- modem and sensor drivers
- state machine behavior
- deployment and recovery runbooks

### `MNNA2024`

Treat as historical archive with selective extraction.

Use it to pull:
- concepts
- old design decisions
- experiment history

Do not deeply note every folder.

## Rollout Plan

### Phase 1: Skeleton + Schema

Target: 0.5 day

- create folder skeleton
- create templates
- create repo registry base
- create concept base
- create runbook base

### Phase 2: Seed Personal Layer

Target: 0.5 to 1 day

- create `home`
- create 5 to 8 domain notes
- create 10 to 15 concept seeds
- create review and journal templates

### Phase 3: Build Tier-1 Repo Packs

Target: 1 to 2 days

- `iot-vehicle-tracking-system`
- `widock`
- `qaqy-fe-lms`
- `qaqy-finance`
- `ivm26-dashboard`
- `meht-ivm26-esp32s3`

### Phase 4: Add Assurance

Target: 0.5 day

- add confidence
- add knowledge_state
- add review_due
- add validation rules

### Phase 5: Automation

Target: 0.5 to 1 day

- filesystem + MCP metadata refresh
- optional CLI later
- optional Local REST API after that

## Automation Recommendation

### Current Best Stack On Your Machine

Use now:
- Obsidian local vault
- `obsidian-mcp`
- filesystem updates

Do not depend on now:
- Obsidian CLI, because it is not installed locally yet
- Local REST API, because the plugin is not installed in the vault yet

### Future Optional Stack

Later, if you want more control:
- install Obsidian CLI
- install Local REST API plugin
- feed `obsidian-mcp` with token-enabled patch operations

That improves precision, but it is not required for a good phase 1.

## My Strongest Recommendation

Start with one main engineering vault and implement:

1. a global personal knowledge layer
2. repo knowledge packs for Tier-1 repos
3. a strict assurance model

Do not start by making everything a repo note.  
Do not start by creating separate vaults per repo.  
Do not start by automating too much.

The personal layer is where your actual advantage compounds.

## Immediate Next Files To Create

Global:
- `01-home/home.md`
- `01-home/repo-registry.base`
- `01-home/concept-index.base`
- `20-domains/domain-iot-fleet-tracking.md`
- `20-domains/domain-embedded-debugging.md`
- `20-domains/domain-edtech-platform.md`
- `30-concepts/concept-mqtt-topic-contract.md`
- `30-concepts/concept-device-offline-buffering.md`
- `70-patterns/pattern-promote-repeated-fixes-into-runbooks.md`

Repo packs:
- `10-repo-packs/iot-vehicle-tracking-system/00-home.md`
- `10-repo-packs/widock/00-home.md`
- `10-repo-packs/qaqy-fe-lms/00-home.md`
- `10-repo-packs/qaqy-finance/00-home.md`

## Sources

- Obsidian Help home  
  https://help.obsidian.md/
- Obsidian Bases  
  https://help.obsidian.md/bases
- Obsidian Properties  
  https://help.obsidian.md/properties
- Obsidian Internal links  
  https://help.obsidian.md/Linking%20notes%20and%20files/Internal%20links
- Obsidian Search  
  https://help.obsidian.md/plugins/search
- Obsidian Bookmarks  
  https://help.obsidian.md/plugins/bookmarks
- Obsidian Workspaces  
  https://help.obsidian.md/plugins/workspaces
- Obsidian Daily notes  
  https://help.obsidian.md/plugins/daily-notes
- Obsidian Templates  
  https://help.obsidian.md/Plugins/Templates
- Obsidian CLI  
  https://help.obsidian.md/cli
- Obsidian MCP  
  https://github.com/newtype-01/obsidian-mcp
- Obsidian Local REST API  
  https://github.com/coddingtonbear/obsidian-local-rest-api

## Unresolved Questions

- Do you want the personal layer to cover only engineering knowledge, or broader life/project knowledge too?
- Which 4 repos do you want treated as Tier-1 from day one?
- Do you want question tracking to live as notes, or as tasks embedded inside notes?
- Do you want me to implement the actual vault skeleton and first Tier-1 packs next?
