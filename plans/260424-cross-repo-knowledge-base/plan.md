# Plan: Cross-Repo Knowledge Base For `E:/anmh1205`

Date: 2026-04-24  
Scope: scan current repos under `E:/anmh1205`, design a durable personal knowledge base in local Obsidian vault, define rollout and automation path.

## Executive Summary

You do not have a "single codebase knowledge" problem. You have a portfolio problem.

`E:/anmh1205` currently contains a mixed workspace:
- active internal product repos
- legacy or transitional repos
- upstream/reference repos cloned from others
- toolkit repos for agent workflows
- embedded/IoT repos with hardware + firmware + ops context

If you put all of that into one flat vault with tags and ad-hoc notes, retrieval quality will collapse fast. The base knowledge should be built as a cross-repo operating system, not as a notes dump.

The right first version is:
- core Obsidian only
- structured properties
- Bases views as the main index
- one canonical note per repo
- one canonical note per service/module only when it matters
- one ADR note per real decision
- one runbook per repeated operation
- one pattern note per reusable lesson

Do not start with:
- full code mirroring into Obsidian
- one note per source file
- plugin-heavy setup
- vector-search-first architecture

## What I Scanned

### Repo Landscape

| Group | Repo / Path | Type | Ownership signal | Freshness | Notes |
|---|---|---|---|---|---|
| IoT core | `IoT_Vehicle_Tracking_System` | monorepo | internal (`anmh1205`) | very active, last commit `2026-04-23` | strongest docs maturity |
| IoT legacy / branch-like fork | `IoT_Vehicle_Tracking_System_fw_remed` | monorepo | internal | active folder, likely remediation branch/workspace | high overlap with IoT core |
| IoT umbrella | `IVM26` | multi-repo umbrella, no root git | internal structure | mixed | has `resources`, `plans`, multiple nested repos |
| IoT dashboard | `IVM26_Dashboard` | app suite | internal (`anmh1205`) | last commit `2026-02-11` | medium docs maturity, multiple app surfaces |
| Embedded device | `MEHT-IVM26-ESP32S3` | firmware | internal org + upstream remote | older, last commit `2026-01-04` | needs hardware/firmware knowledge capture |
| Embedded reference | `OBD2-ECU-Simulator` | simulator/reference | upstream external | stale, `2020-05-22` | clearly reference-only |
| Embedded product | `WiDock` | hardware + firmware product | internal (`anmh1205`) | active, `2026-04-05` | good README, still early knowledge surface |
| Agent tooling | `claude-code-agents-ui` | UI app | upstream external | active, `2026-04-03` | reference / inspiration |
| Agent tooling | `claude_agent_teams_ui` | desktop/workspace app | upstream external | active, `2026-03-24` | reference / inspiration |
| Agent toolkit | `AgentKit/codex-kit` | reusable toolkit | local/private style | no remote shown | meta-tooling, high reuse value |
| Proxy / infra | `CLIProxyAPI` | upstream proxy | external | `2026-01-26` | reference / integration source |
| Proxy / infra | `LCSC_API_Proxy` | small internal infra repo | internal (`anmh1205`) | `2026-02-27` | docs thin, config-heavy |
| Product app | `QAQY/fe-lms` | Next.js app | external team (`QAQY-LAB`) | active, `2026-04-11` | product knowledge likely growing fast |
| Product app | `QAQY/Finance` | Next.js + .NET | external/team (`buigiayen`) | active, `2026-03-31` | backend docs exist, cross-stack |
| Legacy portfolio | `MNNA2024` | mixed archive/project | internal (`anmh1205`) | `2026-03-31` | likely thesis / historical value, not daily ops |

### Documentation Maturity

Strongest docs now:
- `IoT_Vehicle_Tracking_System`
- `WiDock`
- `claude-code-agents-ui`
- `claude_agent_teams_ui`
- parts of `IVM26`

Weak docs but likely important:
- `QAQY/fe-lms`
- `QAQY/Finance`
- `LCSC_API_Proxy`
- `MEHT-IVM26-ESP32S3`
- `MNNA2024`

### Vault Readiness

Current local vault:
- path: `C:\Users\Admin\Documents\Obsidian Vault`
- almost empty
- core plugins available, including `Bases`, `Templates`, `Daily notes`, `Canvas`
- no community plugins installed yet
- `obsidian-mcp` is already working against the local vault through filesystem mode
- `Local REST API` plugin is not installed yet

Implication:
- phase 1 should rely on core Obsidian only
- automation can start now
- advanced patch/update flows can wait

## Design Goal

Build one personal knowledge base that answers 5 questions fast:

1. What repos exist, and which ones matter now?
2. For a repo, what is the architecture, stack, owner context, and operational status?
3. For a problem, what prior decision, runbook, or pattern already exists?
4. For a domain, what codebases, hardware, flows, and business contexts are related?
5. What changed recently, and what remains unresolved?

## Architecture Proposal

### Principle

The vault should be a semantic layer above repos, not a copy of repos.

Repo files remain source of truth for code and low-level docs.  
Obsidian becomes source of truth for:
- cross-repo relationships
- distilled architecture
- decisions
- runbooks
- lessons learned
- open questions
- active focus

### Top-Level Vault Structure

```text
00-inbox/
01-dashboard/
10-repos/
20-domains/
30-architecture/
40-decisions/
50-runbooks/
60-patterns/
70-projects/
80-daily/
90-review/
99-archive/
_assets/
_templates/
_system/
```

### What Each Folder Means

- `00-inbox/`: raw captures, quick notes, unprocessed findings
- `01-dashboard/`: MOCs, Bases entry points, priority views
- `10-repos/`: one canonical note per repo
- `20-domains/`: domain notes like `iot-fleet`, `embedded-debugging`, `agent-tooling`, `edtech`, `personal-finance`
- `30-architecture/`: system maps, data flow notes, shared architecture concepts
- `40-decisions/`: ADR-style notes
- `50-runbooks/`: operational procedures you repeat
- `60-patterns/`: reusable lessons and implementation patterns
- `70-projects/`: cross-repo initiatives, audits, migrations, experiments
- `80-daily/`: daily engineering log and capture
- `90-review/`: weekly / monthly review notes
- `99-archive/`: retired notes, dead repos, stale experiments
- `_assets/`: diagrams, screenshots, exports
- `_templates/`: note templates
- `_system/`: schema docs, automation notes, sync rules, naming rules

## Knowledge Objects

Do not model everything as "notes". Model explicit note types.

### 1. Repo Note

One note per repo. Mandatory.

Suggested filename:
- `repo-iot-vehicle-tracking-system.md`
- `repo-widock.md`
- `repo-qaqy-fe-lms.md`

Suggested properties:

```yaml
type: repo
name: IoT_Vehicle_Tracking_System
path: E:/anmh1205/IoT_Vehicle_Tracking_System
git_remote: https://github.com/anmh1205/IoT_Vehicle_Tracking_System.git
ownership: internal
status: active
domain:
  - iot
  - fleet-tracking
stack:
  - esp32
  - nodejs
  - nextjs
  - flutter
  - mqtt
  - postgresql
priority: p1
docs_maturity: high
last_reviewed: 2026-04-24
related_repos:
  - repo-ivm26
  - repo-meht-ivm26-esp32s3
  - repo-odb2-ecu-simulator
```

Sections inside each repo note:
- What this repo is
- Why it exists
- Current status
- Architecture summary
- Main services/modules
- How to run
- Common failure modes
- Key docs
- Key decisions
- Related repos
- Open questions

### 2. Domain Note

One note per stable domain, not per random tag.

Initial domain candidates:
- `domain-iot-fleet-tracking`
- `domain-industrial-vibration-monitoring`
- `domain-embedded-debugging`
- `domain-agent-tooling`
- `domain-api-proxying`
- `domain-edtech-lms`
- `domain-personal-finance-app`

Purpose:
- tie multiple repos to one domain
- keep glossary, constraints, external references, and recurring patterns together

### 3. Service / Module Note

Create only when module complexity is high or cross-repo relevance exists.

Examples:
- `service-mqtt-bridge`
- `service-backend-api`
- `module-simcom-a7677s-driver`
- `module-obsidian-mcp-sync`

Do not create module notes for trivial UI components.

### 4. Decision Note

Use ADR style. Mandatory for choices with long-tail impact.

Examples:
- USB FS vs HS in WiDock
- filesystem-first vs REST-first for vault sync
- monorepo vs multi-repo for IoT platform
- core-only Obsidian phase vs plugin-heavy phase

### 5. Runbook Note

Use for repeated actions.

Examples:
- bring up full IoT stack locally
- flash ESP32-S3 and inspect serial
- onboard a new repo into the vault
- update repo inventory
- troubleshoot MQTT ingestion path

### 6. Pattern Note

Use for reusable lessons.

Examples:
- "How I structure active monorepo docs"
- "Firmware + cloud repos should be linked by contract notes"
- "When to keep upstream repo as reference-only"
- "How to write repo notes without duplicating README"

### 7. Project / Initiative Note

For work spanning multiple repos.

Examples:
- map audit across IoT frontend + backend
- migration from IVM26 legacy surfaces to new stack
- personal knowledge base rollout itself

## Minimal Metadata Schema

Use a tight shared schema. Too many fields will die quickly.

Mandatory fields across most note types:

```yaml
type:
status:
domain:
repo:
priority:
last_reviewed:
source_of_truth:
```

Enumerations:
- `type`: `repo`, `domain`, `service`, `decision`, `runbook`, `pattern`, `project`, `daily`, `review`
- `status`: `active`, `legacy`, `reference`, `draft`, `archived`
- `priority`: `p1`, `p2`, `p3`

## Bases To Build First

Since `Bases` is already enabled in your vault, use it as the primary retrieval surface.

### Base 1: Repo Inventory

Source: `10-repos/`

Columns:
- name
- status
- ownership
- domain
- stack
- docs_maturity
- priority
- last_reviewed
- git_remote

Views:
- all repos
- active internal repos
- external reference repos
- docs debt queue

### Base 2: Decisions

Source: `40-decisions/`

Columns:
- title
- repo
- domain
- status
- date
- impact

Views:
- active decisions
- unresolved decisions
- by repo

### Base 3: Runbooks

Source: `50-runbooks/`

Columns:
- title
- repo
- domain
- frequency
- owner
- last_validated

Views:
- operational runbooks
- onboarding runbooks
- stale runbooks

### Base 4: Active Projects

Source: `70-projects/`

Columns:
- title
- repos
- status
- next_action
- blocker
- updated

### Base 5: Pattern Library

Source: `60-patterns/`

Columns:
- title
- domain
- applicable_repos
- confidence
- last_used

## Repo Prioritization For Onboarding

Do not ingest all repos evenly.

### Tier 1: Seed Immediately

These should become first-class repo notes in day 1:
- `IoT_Vehicle_Tracking_System`
- `WiDock`
- `QAQY/fe-lms`
- `QAQY/Finance`
- `IVM26_Dashboard`
- `MEHT-IVM26-ESP32S3`
- `AgentKit/codex-kit`

Why:
- either active now
- or strategically reusable
- or likely to generate recurring questions

### Tier 2: Add After Core Stabilizes

- `IoT_Vehicle_Tracking_System_fw_remed`
- `IVM26` umbrella note
- `MNNA2024`
- `LCSC_API_Proxy`

Why:
- useful, but not critical for day-1 retrieval
- some are legacy / umbrella / sparse docs

### Tier 3: Reference-Only

- `CLIProxyAPI`
- `claude-code-agents-ui`
- `claude_agent_teams_ui`
- `OBD2-ECU-Simulator`

Why:
- keep a repo note + distilled lessons
- do not mirror their internals unless actively modifying them

## Proposed Repo Classification

### Internal Active

- `IoT_Vehicle_Tracking_System`
- `WiDock`
- `QAQY/fe-lms`
- `QAQY/Finance`

### Internal Active But Transitional / Legacy-Adjacent

- `IVM26_Dashboard`
- `MEHT-IVM26-ESP32S3`
- `MNNA2024`
- `IoT_Vehicle_Tracking_System_fw_remed`

### Internal Meta / Tooling

- `AgentKit/codex-kit`
- `LCSC_API_Proxy`

### External / Upstream / Reference

- `CLIProxyAPI`
- `claude-code-agents-ui`
- `claude_agent_teams_ui`
- `OBD2-ECU-Simulator`

### Umbrella Container, Not Primary Repo

- `IVM26`

`IVM26` should have one umbrella note linking nested repos, not be treated like a normal repo note.

## Capture And Update Workflow

### Daily Flow

1. Capture raw findings into `00-inbox/`
2. Link the item to a repo note or domain note the same day
3. If the finding changes architecture or operational behavior, promote it into:
   - repo summary update
   - ADR
   - runbook
   - pattern

### Weekly Flow

1. Review commits from Tier 1 repos
2. Update `last_reviewed`
3. Promote repeated fixes into runbooks/patterns
4. Close or carry forward open questions

### Monthly Flow

1. Review stale notes
2. Demote dead work to `99-archive/`
3. Re-rank active repos
4. Refactor schema only if retrieval pain is real

## Automation Path

### Phase A: Manual + MCP Light

Use `obsidian-mcp` now for:
- creating repo notes
- reading/updating note content
- generating initial index notes

Use filesystem mode only.  
Reason: it already works, and your vault has no plugin dependency yet.

### Phase B: Controlled Structured Sync

Add a simple script or Codex command that:
- scans known repos
- extracts README, manifest, remote URL, last commit
- updates a canonical repo note block only
- never overwrites your human-written sections

Recommended split inside repo notes:
- autogenerated block
- analyst summary block
- open questions block

### Phase C: Optional REST Upgrade

Only after phase A/B is stable:
- install Obsidian Local REST API plugin
- add `OBSIDIAN_API_TOKEN`
- enable patch-based updates for finer-grain automation

Reason:
- better note patch precision
- lower risk of accidental overwrite
- cleaner automation later

Not needed for day 1.

## Suggested Templates

### Repo Template

Sections:
- Snapshot
- Why it exists
- Architecture
- Services / Modules
- Run / Deploy
- Risks
- Related decisions
- Related runbooks
- Open questions

### Decision Template

Sections:
- Context
- Decision
- Alternatives considered
- Consequences
- Follow-up

### Runbook Template

Sections:
- Purpose
- Preconditions
- Steps
- Validation
- Failure modes
- Last validated

### Pattern Template

Sections:
- Problem
- Pattern
- When to use
- When not to use
- Repo examples

## Anti-Goals

Avoid these explicitly:
- storing full source code in vault notes
- copying README wholesale into repo notes
- using tags as the main information architecture
- building automation before schema stabilizes
- treating external repos like internal products
- creating one note per class/file/component

## Rollout Plan

### Phase 0: Foundation

Target time: 0.5 day

- create folder skeleton
- create templates
- create `Repo Inventory` base
- create 1 dashboard note

### Phase 1: Seed Tier 1

Target time: 1 to 2 days

- create repo notes for Tier 1 repos
- create 4 to 6 domain notes
- create first 5 ADR notes from existing known decisions
- create first 5 runbooks

Success condition:
- you can answer "what is this repo, why it exists, how to run it, and what is risky" for each Tier 1 repo in under 2 minutes

### Phase 2: Add Structure For Cross-Repo Work

Target time: 1 day

- add project notes
- add pattern notes
- link related repos
- create umbrella note for `IVM26`

Success condition:
- a cross-repo initiative can be navigated from one dashboard note

### Phase 3: Lightweight Automation

Target time: 0.5 to 1 day

- automate repo metadata refresh
- automate stale note detection
- automate weekly review checklist generation

Success condition:
- no manual repo inventory drift

### Phase 4: REST Automation Optional

Target time: only if justified

- install Local REST API plugin
- add token-based precise patch flow
- refine automation granularity

Success condition:
- automation saves time without damaging notes

## Immediate Deliverables I Recommend

If you want to implement this next, start with these files in the vault:

1. `01-dashboard/home.md`
2. `10-repos/repo-iot-vehicle-tracking-system.md`
3. `10-repos/repo-widock.md`
4. `10-repos/repo-qaqy-fe-lms.md`
5. `10-repos/repo-qaqy-finance.md`
6. `20-domains/domain-iot-fleet-tracking.md`
7. `20-domains/domain-agent-tooling.md`
8. `50-runbooks/runbook-onboard-new-repo-into-vault.md`
9. `40-decisions/adr-001-core-only-obsidian-phase.md`

## Recommended Rules For Long-Term Quality

- Every active repo must have exactly one canonical repo note.
- Repo notes summarize and link; they do not duplicate code docs.
- If a note is not reviewed in 30 to 45 days and the repo is active, mark it stale.
- Every repeated fix or repeated command sequence should become a runbook.
- Every high-impact trade-off should become a decision note.
- Every external reference repo should have a short "why I keep this repo" section.

## References

- Obsidian official docs: Bases, Properties, Templates, Canvas  
  https://help.obsidian.md/
- `obsidian-mcp` repo  
  https://github.com/newtype-01/obsidian-mcp
- Obsidian Local REST API plugin  
  https://github.com/coddingtonbear/obsidian-local-rest-api

## Unresolved Questions

- Do you want one single personal vault for all domains, or a dedicated engineering vault plus a personal vault?
- Which repos are truly "owned by you" vs "repos you work in but do not own"?
- Do you want task tracking inside Obsidian, or keep tasks in repo-native systems and store only distilled knowledge in the vault?
- Do you want me to implement phase 0 and phase 1 directly in the current local vault next?
