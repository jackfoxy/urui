# Project handoff — 2026-09-10

Read `/home/nativeplanet/FoxyLabs/urui/urui-extraction-plan.md` and the
project AGENTS instructions before continuing. Follow
`/home/nativeplanet/.codex/skills/hoon-style-guide/SKILL.md` for Hoon.
The user wants results and actionable questions only, with no running
commentary. The user performs Git commits. Do not commit unless asked.

## Current state

**Phase 7 is complete.** Continue with **W8.1** (the obelisk inventory)
in `docs/remaining-work-plan.md`, the live plan. Verification and contracts
for stages 5–7 are recorded in `docs/w4.3-runtime-extraction.md` and the plan.

W6.4 is committed in urui as `3dcbd87` and graph-viz as `1ba899b`.
**W7.1 is uncommitted in both repositories.**

W4.3 could not be done as written: it presumes the generic browser runtime
already lives in urui, and W3.5 as executed extracted only the contract. The
agreed answer (2026-09-10) was to extract the runtime first, in seven stages.
All seven are done:

| Stage | Content | State |
|---|---|---|
| 1 | theme, status lines, both resizers, explorer collapse, help panel, Clay error dialog | done, verified |
| 2 | document tabs, plus the `leaf` field `$doc-kind` needed | done, verified |
| 3 | explorer views, reference tabs, documentation tabs, `doc.toc`, the clay file tree and its context menu | done, verified |
| 4 | persistence: the slot registry, load/save, the shared validators, the shared-source url parameter | done, verified |
| 5 | clay file operations and the shortcut dispatcher | done, verified |
| 6 | the fixture becomes a real consumer: both Ace editors mounted, editor test hooks, `#editor-load-error` | done, verified |
| 7 | W4.3 proper: move the specs | done, verified |

`docs/w4.3-runtime-extraction.md` is the working record — the staging
table, what each landed stage owns, the runtime's option and return
surface, and the next step. **Read it before continuing.**

W4.3 is marked complete in `~/FoxyLabs/urui/urui-extraction-plan.md` and in
the live plan, with the executed-test counts recorded in both READMEs: urui
**50 Chromium cases**, graph-viz **14**.

W4.4 moves `ace-win-linux-shortcuts.json`, `ace-shortcuts.test.js`, and
`ace-editor-baseline.md` into urui. The manifest is synced back to graph-viz;
graph-viz retains only its application manifest and collision test. Strict
sync reports **25 files in sync**. The two `test:shortcuts` commands are owed.

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

## Verification, as of W4.3.7

- Chromium: urui **50 passed**, graph-viz **14 passed** (64 executed,
  against the 54-case W0.3 baseline)
- urui's seven shared suites plus fixture-web through `bin/hoon-test.js`:
  **73 arms ok**
- urui Node: 10 scenarios, the core tests, and the Ace config test pass
- graph-viz's asset needle sweep: **130 needles, zero problems**
- `verify-sync.sh --strict`: 24 files in sync; every touched Hoon file
  parses through `bin/hoon-parse.js`
- digests: graph-viz page and CSS unchanged, its JavaScript re-recorded;
  all three fixture assets re-recorded

**Owed:** `-test /=urui-fixture=/tests ~` on a ship — the fixture's app
suite now asserts that its emitted Ace config names `ace/mode/fixture`,
which only the desk runner can check — plus the standing
`-test /=graph-viz=/tests ~` and `-test /=urui=/tests ~`.

## Verification, as of Stage 6

- `-test /=urui-fixture=/tests ~` on a fresh disposable ship: **80 arms,
  `ok=%.y`**
- Chromium: fixture **6 passed**
- graph-viz: doubles smoke passed
- urui: 10 Node scenarios, core tests, and Ace config tests passed
- urui's seven shared suites plus fixture-web through `bin/hoon-test.js`:
  **73 arms**
- every touched Hoon file parses through `bin/hoon-parse.js`
- `verify-sync.sh --strict`: 24 files in sync
- both repositories pass `git diff --check`

**Owed:** `-test /=graph-viz=/tests ~` and `-test /=urui=/tests ~`. The
equivalent local check for `gviz-web.hoon` — compile once, sweep every
needle, positive and negative — reports zero problems.

Stage 6 changes all three fixture assets; their accepted values are in
`~/FoxyLabs/urui/fixture-digests.txt`. Graph-viz's Stage 5 values remain in
`baseline-digests.txt`.

## Uncommitted files

urui:

```text
docs/remaining-work-plan.md
docs/session-handoff.md
```

graph-viz:

```text
desk/lib/gviz-web.hoon
tests/browser/gviz-web.test.js  (renamed)
tests/browser/run-scenario.js
tests/browser/run-scenarios.js  (new name)
tests/browser/run.sh
tests/browser/real/ace-assets.spec.js
tests/browser/real/fixtures/legacy-ace-config.js  (deleted)
```

W7.1 removes graph-viz's extraction leftovers: unused DOM/runtime aliases,
the old monolith runner name, and the legacy static Ace-config fixture. No
build or test was run; the user owns verification and commits.

Records in `~/FoxyLabs/urui`: `baseline-digests.txt`, `fixture-digests.txt`.

The shared files in graph-viz are synced copies — change them in urui and
run `bin/sync.sh --dest /mnt/mars/gitrepos/graph-viz`.

## Staging the fixture desk

`%urui-fixture` is assembled, not checked in. `bin/stage-desk.sh
--fixture` merges three trees: `desk/` (urui's own sur/lib/mar/tests and
the vendored Ace), `tests/fixture/` (the agent, its web library, its app
test, `desk.bill`, `desk.docket-0`), and the `%base` libraries and marks
it borrows from `~/gitrepos/graph-viz/desk` (override with `--base` or
`URUI_BASE_DESK`).

The old `~/piers/urui-zod` loom proved corrupt during Stage 6 verification.
A fresh disposable fake ship at `/tmp/urui-stage6-zod` passed the full desk
suite and was shut down cleanly. To rebuild a mounted desk after a source
change:

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
