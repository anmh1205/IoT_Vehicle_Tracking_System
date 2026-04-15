# Thesis longtable `\ext@none` root cause

## Executive summary
- Symptom reproduced with `xelatex -interaction=nonstopmode -halt-on-error -file-line-error thesis-final-report.tex` in `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final`.
- Failing site: `resources/reports/thesis/final/thesis-final-report.tex:1271` at `\end{longtable}` of the first migrated criteria block after hardware.
- Actual root cause: `longtable` is trying to write a caption entry with `\LTcaptype=none`, so it expands `\@nameuse{ext@\LTcaptype}` to `\ext@none`, which is undefined.
- Why `none` is still active there: the front-matter block starting at line 474 has leaked grouping. It opens `\def\LTcaptype{none}` plus 6 nested `\thesissettableid` groups, but only one `}` closes at line 495. That leaves the `none` scope alive far past front matter.

## Evidence
1. Direct failure:
   - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.log`
   - Lines 894-897:
     ```tex
     ! Undefined control sequence.
     <write> \@writefile{\ext@none
     l.1271 \end{longtable}
     ```
2. `longtable.sty` behavior:
   - File: `C:/Users/Admin/AppData/Local/Programs/MiKTeX/tex/latex/tools/longtable.sty`
   - Lines 465-468 call:
     ```tex
     \addcontentsline
       {\@nameuse{ext@\LTcaptype}}
       {\LTcaptype}
     ```
   - So `\LTcaptype=none` necessarily yields `\ext@none`.
3. Leaked scope in thesis source:
   - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`
   - Front-matter block opens at 474, then extra nested groups at 476/478/480/482/484/486, but only one closing brace at 495.
   - Brace trace confirms 6 groups remain open after line 495.
4. Why this surfaces only when migrated captioned longtables start:
   - The earlier front-matter `longtable`s using `\def\LTcaptype{none}` have no `\caption`, so no `\addcontentsline` call.
   - The migrated criteria tables do have `\caption`, which triggers the `\ext@none` path once the leaked `none` state is observed.

## Minimal code change to make compile pass
1. Fix the leaked front-matter group at lines 474-495.
2. Smallest safe change:
   - remove the stray nested wrapper lines
     - `\thesissettableid{1.1}{...}`
     - `\thesissettableid{1.3}{...}`
     - `\thesissettableid{2.1}{...}`
     - `\thesissettableid{2.2}{...}`
     - `\thesissettableid{2.3}{...}`
     - `\thesissettableid{2.4}{...}`
   - keep only one local wrapper:
     ```tex
     {\def\LTcaptype{}
     \begin{longtable}{...}
     ...
     \end{longtable}
     }
     ```
3. Important detail: for non-captioned longtables, prefer empty `\LTcaptype` (`\def\LTcaptype{}`) not `none`. `longtable` treats empty as “no caption type”; `none` is interpreted as a real caption type name.

## Recommendation
- Primary fix: close/remove the leaked front-matter wrapper block at 474-495.
- Defensive follow-up: replace remaining `\def\LTcaptype{none}` occurrences used to suppress numbering with `\def\LTcaptype{}`. This aligns with current `longtable.sty` semantics and avoids future `\ext@none` regressions.

## Status
- DONE_WITH_CONCERNS

## Unresolved questions
- None for root cause. The only open item is whether you want the absolute minimal patch (front-matter wrapper cleanup only) or the safer cleanup that also replaces all `LTcaptype=none` sentinels with empty values.
