Plan summary

- Scope: fix missing horizontal row separators in thesis LaTeX tables with minimal edits.
- Inspect first: `tabular`, `longtable`, `tabularx`, plus any `booktabs` commands (`\toprule`, `\midrule`, `\bottomrule`).
- Current evidence: many `longtable` blocks already use `\\\hline`; likely outliers are tables without pipe borders or without per-row rule commands, e.g. abbreviation table near line ~723.
- Safe strategy: audit all table families, patch only affected tables locally, preserve existing style per family, avoid global newline/macro changes unless one isolated helper clearly owns the broken pattern.
- Validation: rebuild thesis PDF, inspect representative single-page and multipage tables, watch for doubled rules and broken `endhead/endlastfoot` behavior.

Unresolved questions
- Should the abbreviation longtable use full row dividers, or stay lighter than data tables?
