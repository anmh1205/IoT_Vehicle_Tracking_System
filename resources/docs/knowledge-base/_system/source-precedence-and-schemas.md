# Source Precedence And Schemas

## Source Precedence
1. `code/config/runtime contract`
2. `repo docs`
3. `thesis source package`
4. `rendered image/PDF assets`
5. `manual inference`

## Evidence Card Schema

```yaml
type: evidence_card
id:
domain:
subdomain:
source_kind:
source_path:
source_anchor:
statement:
evidence_excerpt:
status: captured|validated|conflict|historical-design|current-only
confidence: low|medium|high
validated_against:
reviewer_agent:
last_reviewed:
```

Allowed `source_kind` values:
- `thesis_tex`
- `thesis_toc`
- `thesis_md`
- `thesis_asset`
- `repo_readme`
- `repo_doc`
- `code_config`
- `runtime_output`
- `manual_inference`

## Official Note Metadata

```yaml
type:
repo:
domain:
knowledge_state: distilled|validated|stale|deprecated
confidence: low|medium|high
source_refs:
review_due:
owner_scope: owned|collaborative|reference|personal
```

## Conflict Queue Schema

```yaml
type: conflict_item
topic:
thesis_claim_ref:
repo_claim_ref:
suspected_scope:
resolution_needed:
priority: p1|p2|p3
```

## Promotion Rules
- Promote only claims that land in `validated` or `current-only`.
- Keep `historical-design` notes clearly marked as intent/history, not current runtime truth.
- Keep `conflict` items out of official operational notes until resolved.
- Do not promote image-only interpretations when equivalent text sources already exist.

