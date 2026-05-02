# Bash wrapper quote failure investigation

## Executive summary
- Scope: Claude Code Bash tool in this session, not repo app code.
- Symptom reproduced: every Bash call fails with `/usr/bin/bash: -c: line 174: unexpected EOF while looking for matching '"'`.
- Most likely root cause: Claude Code shell snapshot / wrapper behavior on Windows Git Bash/MSYS2, not the user command and not the repo npm scripts.
- Repo-local hooks are unlikely root cause. PreToolUse hooks completed and only emitted non-fatal `scout-block` warnings.
- Safe workaround: do typecheck/build outside Claude Code Bash for this session, or relaunch Claude Code with a minimal Git Bash profile that skips git-completion/custom shell state.

## What I checked
1. Reproduced failure with trivial Bash commands via tool:
   - `pwd`
   - `npm --version`
   - `npm --prefix "/e/.../Tracking_MqttBridge" run typecheck`
   All failed with same parse error.
2. Read user/project Claude settings:
   - `C:\Users\Admin\.claude\settings.json`
   - `E:\anmh1205\IoT_Vehicle_Tracking_System\.claude\settings.json`
3. Read relevant shell startup files:
   - `C:\Users\Admin\.bash_profile`
   - `C:\Users\Admin\.bashrc`
   - `C:\Program Files\Git\etc\profile`
   - `C:\Program Files\Git\etc\profile.d\git-prompt.sh`
   - `C:\Program Files\Git\etc\bash.bashrc`
4. Read a generated shell snapshot:
   - `C:\Users\Admin\.claude\shell-snapshots\snapshot-bash-1777631802577-vamt6s.sh`
5. Checked transcript hook attachments around failing Bash calls.
6. Looked up related Claude Code issues for shell snapshot failures.

## Evidence
### 1) Not command quoting
- `pwd` fails.
- `npm --version` fails.
- `npm --prefix ... run typecheck` fails with identical error.
- Therefore failure happens before the requested command is evaluated.

### 2) Not repo npm/build logic
- Same failure occurs for commands with no repo dependency.
- Error is shell parse-time, not npm/runtime/typecheck output.

### 3) Repo hooks probably not root cause
- Transcript shows `PreToolUse:Bash` hooks completed.
- Only stderr was non-fatal warning from `scout-block.cjs`:
  - `WARN: Hook error, allowing operation - path should be a path.relative()d string ...`
- Hook output says `allowing operation`; no evidence hook blocked or rewrote command into invalid shell.

### 4) Strong evidence for Claude Code shell snapshot/wrapper issue
- Local snapshots exist under `C:\Users\Admin\.claude\shell-snapshots\`.
- Snapshot file contains large serialized shell state from Git Bash, especially git-completion functions sourced from `C:\Program Files\Git\etc\profile.d\git-prompt.sh`.
- The snapshot also contains tool-injected helper/function state, aliases, and shell options.
- This matches known Claude Code bug class where shell snapshot restoration breaks all Bash calls before the user command runs.

### 5) Git Bash environment is noisy enough to trigger wrapper bugs
- `C:\Program Files\Git\etc\profile` always sources `profile.d/*.sh` for login shells.
- `git-prompt.sh` loads `git-completion.bash` when available.
- Generated snapshot shows many base64-serialized functions from git completion and helper state.
- Snapshot line count is high enough that the reported parse failure at `line 174` is plausible inside wrapper-generated shell code, not in the user command.

### 6) User `.bashrc` is custom, but not enough to explain all evidence alone
- `C:\Users\Admin\.bashrc` defines a custom `idf.py()` wrapper.
- That file could contribute shell state complexity.
- But because failures also align with known Claude Code snapshot bugs and because generated snapshots clearly capture lots of Git Bash state, the higher-confidence diagnosis is wrapper/snapshot fragility, with custom profile content as a possible amplifier.

## Related upstream patterns
Relevant public issues found:
- `anthropics/claude-code#4999` — malformed shell snapshot causes every Bash command to fail before user command runs.
- `anthropics/claude-code#29103` — Windows Git Bash shell snapshots capture huge git-completion functions; restore logic becomes fragile/broken.
- `anthropics/claude-code#14775` — exported shell functions can break Claude Code Bash wrapper quoting and cause unmatched-quote parse errors.

These issues strengthen the conclusion that this is a Claude Code shell wrapper/snapshot problem class, not project code.

## Likely root cause ranking
1. Claude Code Bash wrapper restores a malformed or incompatibly quoted shell snapshot on Windows Git Bash/MSYS2.
2. Git Bash login-shell startup (`/etc/profile` -> `git-prompt.sh` -> `git-completion.bash`) inflates shell state and increases snapshot fragility.
3. Custom user shell additions (`C:\Users\Admin\.bashrc`) may amplify the problem.
4. Repo hooks are low-likelihood contributors; current evidence does not implicate them as primary cause.
5. User command quoting is very low likelihood; trivial commands fail the same way.

## Safe workarounds
### Immediate, safest
Run build/typecheck in an external terminal, not via Claude Code Bash in this session:
- PowerShell/CMD/Git Bash manually:
  - `npm --prefix "E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge" run typecheck`
  - `npm --prefix "E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge" run build`

### Better for future Claude sessions
Launch Claude Code from a minimal shell environment that avoids loading git-completion/custom shell state.
Options:
1. Start Git Bash with a minimal profile (`--noprofile --norc`) before launching Claude Code.
2. Guard shell customizations for Claude sessions, e.g. skip git-completion / heavy prompt logic / custom functions when `CLAUDECODE=1`.
3. Add a custom `~/.config/git/git-prompt.sh` that avoids loading `git-completion.bash` when running under Claude Code.

### Not effective here
- Re-quoting the npm command differently inside Bash tool is unlikely to help.
- Changing repo files is not indicated.

## Practical recommendation
- Treat Bash tool as unusable in this session.
- Run quality gates manually outside Claude Code.
- If you want Claude Code Bash to work again, fix it at shell environment level first: minimal startup, skip git-completion for Claude, then relaunch session and retry with `pwd` before any npm command.

## Relevant files
- `C:\Users\Admin\.claude\settings.json`
- `E:\anmh1205\IoT_Vehicle_Tracking_System\.claude\settings.json`
- `C:\Users\Admin\.bash_profile`
- `C:\Users\Admin\.bashrc`
- `C:\Program Files\Git\etc\profile`
- `C:\Program Files\Git\etc\profile.d\git-prompt.sh`
- `C:\Program Files\Git\etc\bash.bashrc`
- `C:\Users\Admin\.claude\shell-snapshots\snapshot-bash-1777631802577-vamt6s.sh`

## Unresolved questions
- Which exact generated wrapper line 174 is breaking in this session: a snapshot fragment, an exported env/function, or another wrapper-generated line?
- Whether the custom `idf.py()` shell function materially contributes, or the Git Bash snapshot alone is sufficient.
