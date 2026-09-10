# Project handoff — 2026-09-10

Read `/home/nativeplanet/FoxyLabs/urui/urui-extraction-plan.md` and the
project AGENTS instructions before continuing. Follow
`/home/nativeplanet/.codex/skills/hoon-style-guide/SKILL.md` for Hoon.
The user wants results and actionable questions only, with no running
commentary. The user performs Git commits. Do not commit unless asked.

## Current state

Stage 5 completed after WD.1. Continue with **Stage 6** in
`docs/remaining-work-plan.md`, the live plan. Stage 5 verification and its
runtime contract are recorded in `docs/w4.3-runtime-extraction.md`.
The verification and uncommitted-file lists below describe the older
Stage 4 session; use `git status` for the current working tree.

W4.2 is committed in both repositories — urui `163df80`, graph-viz
`ac190d6`. Everything since is **uncommitted**.

**W4.3 is open.** It could not be done as written: it presumes the generic
browser runtime already lives in urui, and W3.5 as executed extracted only
the contract. The agreed answer (2026-09-10) was to extract the runtime
first, in seven stages. Five are done:

| Stage | Content | State |
|---|---|---|
| 1 | theme, status lines, both resizers, explorer collapse, help panel, Clay error dialog | done, verified |
| 2 | document tabs, plus the `leaf` field `$doc-kind` needed | done, verified |
| 3 | explorer views, reference tabs, documentation tabs, `doc.toc`, the clay file tree and its context menu | done, verified |
| 4 | persistence: the slot registry, load/save, the shared validators, the shared-source url parameter | done, verified |
| 5 | clay file operations and the shortcut dispatcher | done, verified |
| 6 | the fixture becomes a real consumer: both Ace editors mounted, editor test hooks, `#editor-load-error` | not started |
| 7 | W4.3 proper: move the specs | not started |

`docs/w4.3-runtime-extraction.md` is the working record — the staging
table, what each landed stage owns, the runtime's option and return
surface, and the next step. **Read it before continuing.**

**Mark W4.3 complete in the plan only when stage 7 lands**, with the usual
completion note and the executed-test counts recorded in both READMEs.
Nothing W4.3 itself asks for has been done yet: no spec has moved, and
`urui/tests/browser/real/` still holds only `ace-assets.spec.js` and
`fixture-smoke.spec.js`.

## Tooling added this session

- `bin/hoon-test.js CONSUMER TEST_FILE [arm ...]` — runs a `/tests/lib`
  suite through `vere eval`, no ship. Reports arms whose `tang` is not
  empty. Refuses suites that use `/*` (they read a corpus out of clay) and
  cannot build `/tests/app` suites.
- `bin/hoon-parse.js FILE ...` — `ream`s a file and says whether it
  parses. **The only local check that catches a syntax error.** Run it on
  every Hoon file an edit touches; a substring sweep cannot see one. The
  recurring trap is a tape carrying a literal brace: `{` opens
  interpolation, and the escape is `\{`.
- `graph-viz/desk/tests/lib/gviz-web.hoon` is now too slow for
  `hoon-test.js` — each of its nine arms recompiles all three assets and
  the runtime cord they embed is ~2,400 lines. It needs `-test` on a ship.
  Locally, compile once and sweep its needles instead.

## Verification, as of stage 4

- `-test /=urui-fixture=/tests ~` on `~/piers/urui-zod`: **74 arms,
  `ok=%.y`**
- Chromium: graph-viz **57 passed**, fixture **3 passed**
- graph-viz: 10 Node scenarios, 8 shortcut tests
- urui: 10 Node scenarios, 3 core tests, 1 Ace config test
- urui's seven `/tests/lib` suites through `bin/hoon-test.js`: 68 arms
- every touched Hoon file parses through `bin/hoon-parse.js`
- Python unittest: 10 passed
- `verify-sync.sh --strict`: 24 files in sync
- both repositories pass `git diff --check`

**Owed:** `-test /=graph-viz=/tests ~` and `-test /=urui=/tests ~`. The
equivalent local check for `gviz-web.hoon` — compile once, sweep every
needle, positive and negative — reports zero problems.

Digests: graph-viz `page` `0857e3fb…` and `css` `4e55a264…` are
**unchanged** through all four stages; only `javascript` moves. Current
values are in `~/FoxyLabs/urui/baseline-digests.txt` and
`fixture-digests.txt`, each with the note explaining what changed it.

## Uncommitted files

urui:

```text
bin/hoon-parse.js
bin/hoon-test.js
desk/lib/urui-config.hoon
desk/lib/urui-js.hoon
desk/sur/urui.hoon
desk/tests/lib/urui-config.hoon
desk/tests/lib/urui-js.hoon
desk/tests/lib/urui-shell.hoon
docs/session-handoff.md
docs/w4.3-runtime-extraction.md
tests/browser/doubles/dom.js
tests/browser/scenarios/index.js
tests/browser/scenarios/runtime.js
tests/browser/scenarios/session.js
tests/browser/urui-core.test.js
tests/fixture/lib/urui-fixture-web.hoon
```

graph-viz:

```text
.urui-sync.json
desk/lib/gviz-web.hoon
desk/lib/urui-config.hoon
desk/lib/urui-js.hoon
desk/sur/urui.hoon
desk/tests/lib/gviz-web.hoon
tests/browser/doubles/dom.js
```

Records in `~/FoxyLabs/urui`: `baseline-digests.txt`, `fixture-digests.txt`.

The five shared files in graph-viz are synced copies — change them in urui
and run `bin/sync.sh --dest /mnt/mars/gitrepos/graph-viz`.

## Staging the fixture desk

`%urui-fixture` is assembled, not checked in. `bin/stage-desk.sh
--fixture` merges three trees: `desk/` (urui's own sur/lib/mar/tests and
the vendored Ace), `tests/fixture/` (the agent, its web library, its app
test, `desk.bill`, `desk.docket-0`), and the `%base` libraries and marks
it borrows from `~/gitrepos/graph-viz/desk` (override with `--base` or
`URUI_BASE_DESK`).

It already exists and is committed on `~/piers/urui-zod`. To rebuild it
after a source change:

```
bin/stage-desk.sh --fixture --no-kelvin /tmp/urui-fixture
cp -r /tmp/urui-fixture/. ~/piers/urui-zod/urui-fixture/
```

then `|commit %urui-fixture` in the dojo. On a ship that does not have it
yet, `|new-desk %urui-fixture` and `|mount %urui-fixture` come first.

`--no-kelvin` matters: `|new-desk` gives the desk the ship's own
`sys.kelvin`, and `urui-zod` runs `[%zuse 408]` while the staged sources
carry `[%zuse 409]` first. Do not point `stage-desk.sh` straight at the
mount — it does `rm -rf` on its output directory.

Boot that pier with `--loom 32`.

## Historical: W3.6

W3.6 filled `urui-config ++emit`, expanded `urui-shell` to the complete
shell, and made graph-viz build `page:web` with `(build:shell spec)`. The
reviewed HTML comparison has 671 events on each side and preserves every
existing element, id, role, ARIA attribute and text; three specified
`data-role` attributes were added. Details are in `docs/w3.6-page-diff.md`,
and those `data-role` attributes are how the runtime finds the three panes.
