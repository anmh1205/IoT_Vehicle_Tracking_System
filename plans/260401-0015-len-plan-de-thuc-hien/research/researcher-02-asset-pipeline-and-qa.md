# Research Report: Mermaid asset pipeline and QA workflow

**Timestamp:** 2026-04-01 00:15:58 Asia/Saigon
**Scope:** safe workflow for editing many Mermaid `.mmd` files and regenerating SVG assets; QA gates; rollback/blast-radius control; render risks and mitigations.

## Executive Summary

For bulk Mermaid work, the safest pattern is: edit in small batches, render deterministically from one pinned CLI version, review SVG diffs before merge, and fail fast on syntax or visual regressions. Do not regenerate everything blindly; isolate changes per domain and keep output paths stable so diffs stay readable.

The biggest risk is not syntax alone. Mermaid can render “valid” diagrams that are still unreadable, inconsistent in terminology, or unstable across versions/themes. The workflow must therefore gate on three layers: parse/render success, visual readability, and terminology consistency against the source text.

## Research Methodology

- Sources consulted: 3 primary sources from search results
- Date range of materials: current docs / repo references surfaced in search (2025-era docs accessible in 2026)
- Key search terms used:
  - Mermaid CLI SVG export
  - Mermaid best practices readability
  - Mermaid render limitations
  - Mermaid CLI CI workflow
  - terminology consistency diagrams

## Key Findings

### 1. Workflow model for bulk Mermaid edits

Recommended flow:
1. Collect all `.mmd` inputs for one scope only.
2. Edit source files first; keep one diagram = one responsibility.
3. Regenerate SVGs from the same Mermaid CLI version and same config.
4. Review SVG diff + source diff together.
5. Merge only after parse, visual, and terminology gates pass.

This keeps blast radius small and avoids “all diagrams changed because one config changed”.

### 2. Quality gates

#### A. Terminology consistency
Use a shared glossary for names like device, gateway, bridge, telemetry, event, alert, firmware job, etc. Check:
- same entity name used across all diagrams
- same arrow labels for same semantic flow
- no local synonym drift between files

Fail the batch if a term is renamed in one diagram but not the rest.

#### B. Visual readability
Check manually or via reviewer checklist:
- label length not excessive
- no node crowding / line crossings that obscure meaning
- left-to-right or top-to-bottom direction consistent per diagram family
- line styles/colors used consistently
- SVG still readable at typical doc zoom levels

#### C. Diff review
Review both:
- `.mmd` diff: logic and terminology changes
- `.svg` diff: visual impact, unexpected layout shifts, broken text wrapping, new overlaps

If SVG diff is huge but source diff is small, suspect renderer drift or config drift.

### 3. Rollback and blast-radius reduction

Use these controls:
- batch by folder/domain, not repo-wide
- keep generated SVGs next to their source, but regenerate only touched files
- commit source and generated assets together per batch
- pin Mermaid CLI and browser/render dependencies to avoid accidental layout churn
- store pre-regeneration backup via git branch/commit, not ad hoc copies
- if a batch fails, revert only that batch; do not continue cascading regeneration

Practical rule: one batch should be reversible with a single git revert.

### 4. Mermaid render risks and mitigations

| Risk | Symptom | Mitigation |
|---|---|---|
| Syntax drift | CLI parse failure | lint/render in CI before merge |
| Version drift | same `.mmd`, different SVG | pin `@mermaid-js/mermaid-cli` and lockfile |
| Layout instability | node positions shift unexpectedly | minimize config churn; regenerate only when needed |
| Long labels | unreadable SVG | shorten labels, split nodes, use aliases |
| Theme mismatch | colors/text look inconsistent | centralize theme config |
| Hidden overflow | cropped text or clipped shapes | inspect SVG at normal zoom, not only parse success |
| Large graph complexity | cluttered diagram | split into sub-diagrams; keep KISS |
| Cross-file terminology drift | inconsistent wording | glossary + reviewer checklist |

## Comparative Analysis

### Manual-only vs scripted regeneration
- Manual-only: too slow, inconsistent, easy to miss stale SVGs.
- Scripted regeneration: scalable, but dangerous without batching and diff gates.

Best option: scripted regeneration with strict scoping and human review on SVG diff.

### Full-repo regen vs scoped regen
- Full-repo regen: high blast radius, noisy diffs, hard to review.
- Scoped regen: easier rollback, clearer intent, safer CI.

Scoped regen is the default.

## Implementation Recommendations

### Quick Start Guide
1. Freeze Mermaid toolchain version.
2. Group diagrams by domain.
3. Edit `.mmd` sources only.
4. Regenerate SVGs for that domain.
5. Review source + SVG diffs.
6. Reject changes that hurt readability or terminology consistency.

### Practical QA Checklist
- [ ] All diagrams render without parse errors
- [ ] SVG diff reviewed for layout regressions
- [ ] Terms match glossary and sibling diagrams
- [ ] Labels fit without crowding
- [ ] Direction/style conventions are consistent
- [ ] Batch can be rolled back cleanly

### Common Pitfalls
- Regenerating everything because one file changed.
- Accepting “valid render” as “good diagram”.
- Letting terminology drift across files.
- Reviewing only `.mmd` and skipping SVG diff.
- Using unpinned Mermaid versions in CI.

## Resources & References

### Official Documentation
- [mermaid-js/mermaid](https://github.com/mermaid-js/mermaid)
- [Mermaid User Guide](https://mermaid.ai/open-source/intro/getting-started.html)
- [@mermaid-js/mermaid-cli on npm](https://www.npmjs.com/package/@mermaid-js/mermaid-cli?activeTab=readme)

### Notes from current sources
- Mermaid is a JS-based diagramming tool intended to keep docs aligned with development.
- Mermaid CLI (`mmdc`) is the standard local/CI renderer for image formats including SVG.
- The npm package name differs from the executable name; `npx -p @mermaid-js/mermaid-cli mmdc ...` is the documented usage pattern.

## Appendices

### A. Glossary
- **Blast radius**: how much of the repo is affected by one regeneration pass.
- **SVG diff**: visual artifact diff, not just source diff.
- **Terminology consistency**: same concept uses same label across all diagrams.

## Unresolved questions
- Which Mermaid CLI version is pinned in this repo’s current diagram pipeline?
- Are diagrams regenerated locally, in CI, or both?
- Is there an existing glossary/source-of-truth for diagram terminology?
