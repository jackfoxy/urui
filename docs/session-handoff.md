# Project handoff — 2026-09-09

Read `/home/nativeplanet/FoxyLabs/urui/urui-extraction-plan.md` and the
project AGENTS instructions before continuing. Follow
`/home/nativeplanet/.codex/skills/hoon-style-guide/SKILL.md` for Hoon.
The user wants results and actionable questions only, with no running
commentary.

## Current state

W3.6 is complete and uncommitted. The next planned work item is W3.7.

- urui checkout: `/mnt/mars/gitrepos/urui`, HEAD `52ed776`
- Graph-viz checkout: `/mnt/mars/gitrepos/graph-viz`, HEAD `02aba94`
- plan and digest records: `/home/nativeplanet/FoxyLabs/urui/`
- shared-source sync is strict and clean across all 17 files

W3.6 fills `urui-config ++emit`, expands `urui-shell` to the complete shell,
and makes Graph-viz build `page:web` with `(build:shell spec)`. The reviewed
HTML comparison has 671 events on each side and preserves all existing
elements, IDs, roles, ARIA attributes, and text. Three specified `data-role`
attributes were added. Details are in `docs/w3.6-page-diff.md`.

The W3.6 plan predicted unchanged JavaScript digests, but filling an emitter
that W3.5 already composed necessarily changes both bundles. The accepted
digests and plan completion note record this resolution. CSS is unchanged.

## Verification completed

- Hoon: Graph-viz 165, urui 57, fixture 64; all `ok=%.y`
- Chromium: Graph-viz 57, fixture 3
- Graph-viz browser smoke: 10 scenarios
- Graph-viz shortcut suites passed
- urui runtime and Ace Node suites passed
- Python unittest suite: 10 passed
- `verify-sync.sh --strict`: 17 files in sync
- `check.sh verify`: 192/248, 77%, all checks passed
- both repositories pass `git diff --check`

## Uncommitted W3.6 files

urui:

```text
README.md
bin/asset-digest.sh
bin/assets-graph-viz.txt
desk/lib/urui-config.hoon
desk/lib/urui-shell.hoon
desk/tests/lib/urui-config.hoon
desk/tests/lib/urui-shell.hoon
docs/w3.6-page-diff.md
tests/browser/real/fixture-smoke.spec.js
```

Graph-viz:

```text
.urui-sync.json
desk/lib/gviz-web.hoon
desk/lib/urui-config.hoon
desk/lib/urui-shell.hoon
tests/browser/real/serve-app.js
```

The user performs builds, tests, and Git commits. Do not commit unless asked.
