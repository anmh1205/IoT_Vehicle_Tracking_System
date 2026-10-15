# JavaScript dependency security baseline

GitHub Actions workflow `npm audit dependency evidence` uses **exact committed
package-lock.json versions** and collects both full and production-only
(`npm audit --omit=dev`) reports as 7-day artifacts. All results are advisory
metadata, not evidence that each entry is exploitable in the running product.

On 15 October 2026, the pre-upgrade baseline was:

| Workspace | All npm advisories | Production-only |
| --- | ---: | ---: |
| Tracking_Frontend | 43 (2 critical, 31 high, 7 moderate, 3 low) | See workflow artifacts |
| Tracking_MqttBridge | 5 (2 high, 2 moderate, 1 low) | 3 (2 high, 1 moderate) |

Remediation used normal compatible npm updates, `npm audit fix` without
`--force`, and an explicit Next 16.4.1 / eslint-config-next 16.4.1 /
Axios 1.20+ update. The temporary updater removed itself after committing
package manifests and lockfiles, so production CI does not need a privileged
auto-commit workflow. Node quality, `npm ci`, build and post-upgrade production
audit must pass before considering the dependency upgrade shippable.

Remaining advisories should be triaged separately by affected package,
runtime vs development-only reachability, available fix, and compatibility.
Avoid automatically applying breaking major versions or suppressing advisories.

## Verified post-upgrade audit and decision

The rebuilt package locks in PR #250 were installed using npm ci on Node 20,
passed frontend/backend/bridge CI and EMQX + PostgreSQL checks, and produced:

| Workspace | Full audit | Production-only audit |
| --- | --- | --- |
| Tracking_Frontend | 8 high (development toolchain) | **0** |
| Tracking_MqttBridge | **0** | **0** |

The frontend development-only reports concern
`@next/eslint-plugin-next`, `eslint-config-next`,
`@ts-morph/common`, `ts-morph`, `shadcn`, `fast-glob`,
`micromatch` and `braces`. The npm advisory engine reports
an unreviewed major/downgrade as the only fix for several of these; no
unrelated major downgrade has been applied. These packages were not present in
the production-only audit. **This is an accepted development-toolchain
exception, not a statement that the advisories are false or resolved.**

The audit workflow now fails on any newly detected *production* high or
critical advisory. npm update PRs are scheduled weekly through Dependabot.
Review development-only advisories at each weekly dependency review and use
a separately tested toolchain upgrade when a safe supported fix appears.
