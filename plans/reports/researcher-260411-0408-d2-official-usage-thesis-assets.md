# Research Report: official D2 usage for thesis assets

- Conducted: 2026-04-11
- Scope: official D2 install/render/syntax/flags only
- Confidence rule: `Confirmed` = directly supported by official D2 docs/repo/release metadata. `Likely but unconfirmed` = plausible, but I did not find direct official text in fetched sources.

## Executive summary
D2 has an official Windows install path via release MSI, Scoop, Chocolatey, and `install.sh` under MSYS2/Git Bash. Official render usage is straightforward: `d2 input.d2 output.svg`; docs also show `d2 --watch in.d2 out.svg`.

An official Docker path exists in D2 install docs. I confirmed docs reference a D2 Docker repo and give a `docker run ... terrastruct/d2:<tag> --watch ...` example, but the fetched excerpt did not expose the full mount/path arguments. For thesis-grade deterministic assets, use fixed output format, fixed theme ID, fixed layout engine, explicit fonts, avoid sketch mode, and pin D2 version.

## Answers

### 1) Install D2 on Windows

#### Confirmed
Official sources support these Windows paths:

1. MSI installer from GitHub Releases
   - Latest release metadata I checked: `v0.7.1`
   - Windows assets include:
     - `d2-v0.7.1-windows-amd64.msi`
     - `d2-v0.7.1-windows-amd64.tar.gz`
     - `d2-v0.7.1-windows-arm64.tar.gz`
   - Install doc says MSI adds `d2` to `PATH`.

2. Scoop
```bash
scoop install main/d2
```

3. Chocolatey
```bash
choco install d2
```

4. `install.sh` via MSYS2 / Git Bash
```bash
curl -fsSL https://d2lang.com/install.sh | sh -s -- --dry-run
curl -fsSL https://d2lang.com/install.sh | sh -s --
```

5. Standalone release archive + install step
```bash
make install
```

#### Likely but unconfirmed
- `winget` package: I did not find it in official fetched docs. Do not assume.

### 2) CLI command to render `.d2` to SVG

#### Confirmed
Minimal render form implied by official docs:
```bash
d2 input.d2 output.svg
```

Official docs explicitly show watch mode rendering to SVG:
```bash
echo 'x -> y -> z' > in.d2
d2 --watch in.d2 out.svg
```

### 3) Official Docker image + recommended invocation

#### Confirmed
- Official install docs reference a D2 Docker repo/image.
- Docs say `amd64` and `arm64` images exist.
- Official example excerpt includes:
```bash
docker run --rm -it ... terrastruct/d2:v0.1.2 --watch helloworld.d2
```

#### Recommended safe invocation for implementation
Because Docker needs file mounts and working directory, use this pattern:
```bash
docker run --rm -it \
  -v "$PWD":/work \
  -w /work \
  terrastruct/d2:v0.7.1 \
  input.d2 output.svg
```

#### Likely but unconfirmed
- Exact official full `docker run` line with mount flags: not recovered from fetched excerpt. Pattern above is operationally correct, but treat it as derived recommendation, not quoted official text.
- `latest` tag policy: not confirmed. Prefer pinning explicit version.

### 4) Minimal syntax examples

#### A. Flowchart / layout boxes

Confirmed core edge syntax from official docs/examples:
```d2
x -> y -> z
```

Confirmed grouping/container syntax from official repo examples:
```d2
system: {
  api
  db
}
api -> db
```

Confirmed grid/layout-box style from official examples:
```d2
grid-rows: 2
grid-columns: 2

a
b: {
  b_child
}
c
d
```

Notes:
- Nested blocks use `{ ... }`
- Edges use `->`
- Grid-like dashboard layouts use `grid-rows`, `grid-columns`, `grid-gap`

#### B. Sequence-like interactions

#### Confirmed
- D2 officially has sequence-diagram support at engine/source level.
- Release notes mention fixes for actors in sequence diagrams.

#### Likely but unconfirmed
I did not recover an official minimal `.d2` sequence source snippet from fetched docs. For implementation planning, assume sequence support exists, but fetch exact syntax from current upstream docs/repo before baking examples into thesis assets.

### C. ER-style relationships

#### Confirmed
- Official README points to ecosystem tooling around DB schema to D2 (`Postgres importer`, `Database Schemas to D2`, `ent2d2`).

#### Likely but unconfirmed
- I did not recover an official minimal hand-written ER `.d2` example from fetched sources. So do not present any custom ER syntax as official without one more source pull.

### D. Container / dashboard-style grouping

#### Confirmed
Official examples show this style well:
```d2
classes: {
  grid: {
    grid-columns: 1
    label: ""
  }
}

panel: {
  class: grid
  header
  body
}
```

And nested dashboard-ish matrices:
```d2
matrix: {
  grid-rows: 4
  grid-gap: 0
  *.width: 100
  *.height: 100
  "0.41"
  "0.32"
  "0.92"
  "0.13"
}
```

This is enough for thesis assets that need grouped boxes, panels, matrices, legends, and dashboard blocks.

### 5) Useful font/theme/layout flags for deterministic thesis assets

#### Confirmed
From official docs/release notes:
- Themes are official and production-ready.
- Layout engines: `dagre` default, plus `ELK`, `TALA`.
- CLI supports monospace font flags in recent release notes:
  - `--font-mono`
  - `--font-mono-bold`
  - `--font-mono-italic`
  - `--font-mono-semibold`

#### Likely but unconfirmed
- I did not recover the full current CLI flag list for regular/italic/bold proportional fonts from fetched sources.
- I did not recover exact `--theme` / `--layout` flag spellings from fetched sources, even though docs clearly reference themes/layout engines.

#### Practical recommendation for deterministic thesis assets
Use these rules:
1. Pin D2 version, ideally exact release tag, e.g. `v0.7.1`.
2. Render only to SVG.
3. Fix one layout engine for all thesis diagrams.
4. Fix one theme for all thesis diagrams.
5. Fix fonts explicitly if CLI supports the exact flags in your installed version.
6. Avoid sketch mode.
7. Avoid auto/live watch in final build path.
8. Keep source order stable; recent release notes mention formatter/order preservation improvements.

Recommended command pattern once exact local flags are verified:
```bash
d2 input.d2 output.svg
```

If your installed version exposes layout/theme/font flags in `d2 --help`, standardize on one invocation template and reuse it everywhere.

## Implementation-ready baseline
If you want the least-risk baseline now:

1. Install on Windows with MSI or Scoop.
2. Pin `v0.7.1` if using Docker.
3. Render with plain CLI first:
```bash
d2 thesis-figure.d2 thesis-figure.svg
```
4. Use only:
   - block containers `{}`
   - edges `->`
   - grid props `grid-rows`, `grid-columns`, `grid-gap`
5. Delay sequence/ER specialized syntax until exact upstream examples are fetched.

## Sources
Official only:
- D2 homepage: https://d2lang.com
- Install doc: https://raw.githubusercontent.com/terrastruct/d2/master/docs/INSTALL.md
- README: https://raw.githubusercontent.com/terrastruct/d2/master/README.md
- Repo: https://github.com/terrastruct/d2
- Release checked: https://github.com/terrastruct/d2/releases/tag/v0.7.1
- Official example sources inspected:
  - https://raw.githubusercontent.com/terrastruct/d2/master/docs/flow.d2
  - https://github.com/terrastruct/d2/blob/master/docs/examples/vector-grid/vector-grid.d2
  - https://github.com/terrastruct/d2/blob/master/e2etests/testdata/files/simple_grid_edges.d2
  - https://github.com/terrastruct/d2/blob/master/e2etests/testdata/files/grid_nested.d2

## Bottom line
- Windows install: confirmed.
- `.d2` -> `.svg` CLI render: confirmed.
- Official Docker image exists: confirmed, but full official invocation not fully recovered.
- Flowchart/grouping/grid syntax: confirmed enough for implementation.
- Sequence/ER exact minimal syntax: not yet confirmed from fetched official examples.
- Deterministic thesis output strategy: pin version/theme/layout/fonts, avoid sketch, render SVG.

## Unresolved questions
1. Exact current official sequence-diagram `.d2` syntax example.
2. Exact current official ER/table syntax example, if any exists in core docs vs ecosystem tooling.
3. Exact current CLI flag names for theme/layout/proportional font selection in your target D2 version.
4. Exact official full Docker `docker run` example with mounts/workdir.