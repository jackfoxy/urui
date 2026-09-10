# Remaining work: Stage 5 onward

Recorded 2026-09-10. Supersedes the "not started" rows of
`w4.3-runtime-extraction.md`'s staging table (Stage 5–7) and everything from
W4.3's remainder through Phase 8 in
`~/FoxyLabs/urui/urui-extraction-plan.md` — both struck through in place,
pointing here. This is the live plan; edit here, not there.

## Why a new item comes first

Stages 1–4 landed real arms in `urui-js.hoon`, `urui-config.hoon`,
`sur/urui.hoon`, and the fixture lib without a matching documentation pass —
the working record (`w4.3-runtime-extraction.md`) is thorough, but the
in-file arm comments have not been audited since Stage 1. Doing that once,
now, before Stage 5 adds two more surfaces (`++files`, `++shortcuts`), is
cheaper than doing it after five more stages. Every item below carries the
same requirement forward: **an arm whose signature or behavior an item
changes gets its doc comment updated in the same commit** — that is part of
each item's done-when from here on, not a separate pass.

## WD.1 Bring core/arm documentation up to date

Files: `desk/sur/urui.hoon`, `desk/lib/urui-{js,config,shell,css,clay,http,
ace}.hoon`.
Change: apply `/hoon-style-guide` — one-line core header (already present in
all seven files), a blank `::` before every `++`, and a gap-indented
description only where the arm's purpose or a non-obvious constraint isn't
already legible from its name, mold, and `^-`. Match the density of
`~/gitrepos/obelisk/desk/lib/{readiness-state,obelisk-web-file}.hoon`: most
arms there carry no comment at all; the few that do explain a "why" (a
rejected case, an ordering constraint), never a restatement of the type.
Audit every section `++runtime` has grown since Stage 1 (theme/status/
layout/dialogs, document-tabs, explorer/docs/file-tree, session/slots) for a
missing description or one that now describes behavior that moved, plus the
whole of `sur/urui.hoon`'s `$app-config` record.
Verify: for each of the seven libs, list every top-level `++` and confirm
each either has a preceding `::` line or is genuinely self-explanatory (a
one-line wrapper with an unambiguous name); confirm no arm's comment
restates its `^-` type.
Done: no arm in the seven libs or `sur/urui.hoon` is under- or
over-documented relative to the obelisk exemplar; this is the baseline the
items below are held to.

## Stage 5 — Clay file operations + shortcut dispatcher

**Complete, 2026-09-10.**

(Runtime-extraction stage 5 of 7; see `w4.3-runtime-extraction.md` for
stages 1–4 as landed.)

Files: `urui-js.hoon` gains `++files` (the `requestClayPath` flow: browse/
load/save/delete, prompts, confirms, conflict handling, tree refresh —
driven by `config.endpoints` and each kind's `leaf`) and `++shortcuts` (the
capture-phase dispatcher, `Esc` priority chain, Alt suppression, tab-strip/
divider keys, dispatching `config.shortcuts` entries by `when`). The
existing `options.browse`/`options.openFile` hooks (stage 3's escape hatch)
are deleted — `++files` replaces both.
Change: graph-viz deletes `requestClayPath` and the generic two-thirds of
`handleShortcut` (306 L), keeping only its 5 application chords registered
through `config.shortcuts`; `browseClayNode` goes with it, since `++files`
walks the browse endpoint itself.
Prereq: Stages 1–4 (done). WD.1 (so the new arms land documented, not as a
follow-up).
Verify: graph-viz Chromium suite green including file-tree and
shortcut-boundary cases; new Hoon arms `test-files-contract` /
`test-shortcut-contract`; `bin/hoon-test.js` green on all seven urui lib
suites; needle sweep on `gviz-web.hoon` reports zero problems; digests —
`page`/`css` unchanged, `javascript` re-recorded.
Done: `options.browse`/`options.openFile` no longer exist anywhere in
`urui-js.hoon`; `handleShortcut` in `gviz-web.hoon` is ≤ 40 lines (5 chords +
registration).


Completed: `urui-js ++files` owns browse/load/save/delete, conflict prompts,
context-menu actions and toolbar wiring; `++shortcuts` owns capture-phase
claims and Escape ordering. Graph-viz's `handleShortcut` is 9 lines,
registering its five configured commands. Its remaining file hooks supply
status/preview feedback and the SVG edit baseline. The fixture's obsolete
browse/open hooks are removed; editor mounting remains Stage 6.

Verified: Graph-viz Chromium **57 passed**, fixture Chromium **3 passed**;
urui's seven Hoon suites **70 arms passed**, including `test-files-contract`
and `test-shortcut-contract`; Graph-viz's **130 asset needles, zero problems**
and `test-web-error-json` passed. Both Node scenario suites and Graph-viz's
shortcut suites pass. New Node coverage exercises both endpoint transports,
recursive browse, load deduplication, overwrite retries, changed-copy
confirmation, delete cancellation, failures, shortcut contexts, Alt retention
and Escape priority. Page/CSS digests are unchanged for both consumers;
JavaScript digests are re-recorded. See `w4.3-runtime-extraction.md` for the
new runtime options and returned surfaces.

## Stage 6 — Fixture becomes a real consumer

**Complete, 2026-09-10.**

Files: `tests/fixture/lib/urui-fixture-web.hoon`.
Change: mount both Ace editors (the fixture's `%text`/`%note` kinds), expose
the editor test hooks (the fixture's equivalent of
`__GVIZ_EDITOR_TEST__`), serve `#editor-load-error` on adapter failure —
everything `urui-shell`/`urui-js` already support that the fixture has
stubbed past until now.
Prereq: Stage 5 (the fixture's file operations need `++files` to exercise
anything real).
Verify: fixture Chromium suite exercises both editors under the same specs
Stage 7 will retarget; `-test /=urui-fixture=/tests ~` green with new
editor-mount arms.
Done: the fixture is a complete second consumer — no generic behavior
remains provable only through graph-viz.

Completed: the fixture mounts independent `%text` and `%note` Ace adapters,
restores each tab's source and selection, exposes both editor test hooks, and
shows `#editor-load-error` while hiding both hosts when adapter setup fails.
Its Gall agent serves the complete Ace asset set used by the page.

Verified: fixture Chromium **6 passed**, including both editors, tab restore,
and adapter failure; fixture desk **80 arms, `ok=%.y`**, including three new
editor-mount arms; urui's seven shared Hoon suites plus the fixture web suite
**73 arms passed**; all 10 Node scenarios, core tests, and Ace config tests
passed. All touched Hoon parses, strict sync reports 24 files in sync, and
the graph-viz doubles smoke remains green. Fixture page, CSS, and JavaScript
digests are re-recorded.

## Stage 7 — W4.3 proper: move the specs

Files: 6 whole Ace specs (`ace-editing-navigation-shortcuts`,
`ace-remaining-shortcuts`, `ace-macros`, `ace-undo-redo`, `ace-smoke`,
`ace-editor-failure`) + the generic halves of `editor-surface.spec.js`,
`lifecycle.spec.js`, `tabs.spec.js`, `shortcut-boundaries.spec.js` + the
generic part of `ace-assets.spec.js` → `urui/tests/browser/real/`,
retargeted at the fixture (Stage 6). graph-viz keeps `visual-editing.
spec.js`, the app halves of the four split specs, and one `ace-assets` case.
Prereq: Stage 6.
Verify: `urui/tests/browser/run-real.sh` and `graph-viz/tests/browser/
run-real.sh` both green; combined executed-test count ≥ 54 (the W0.3
baseline).
Done: counts recorded in both READMEs; mark W4.3 complete in
`~/FoxyLabs/urui/urui-extraction-plan.md` with the usual completion note.

## W4.4 Shortcut manifest

Files: move `ace-win-linux-shortcuts.json` + its baseline test +
`ace-editor-baseline.md` to urui; sync the JSON back into graph-viz (§4.1 of
the extraction plan); graph-viz keeps `app-shortcuts.json` + its collision
test.
Prereq: Stage 7 (the baseline test now runs against the fixture's chord set,
not graph-viz's).
Verify: `npm --prefix urui run test:shortcuts` and `npm run test:shortcuts`
(graph-viz) both pass with the same accounting (100 rows, 102 executions,
97 bindings, 5 exclusions, 5 duplicates, 1 override).
Done: one source of truth for the baseline; `verify-sync.sh --strict`
reports the JSON in-sync.

## Phase 5 — graph-viz adoption complete

**W5.1 Reduced integration matrix.** Add I2, I4, I6 (§3.6 of the extraction
plan), including `session-compat.spec.js` seeded from the W0.2 fixture.
Verify: green. Done: the 6-item integration matrix is complete.

**W5.2 Docs.** `graph-viz/README.md` (install by copying `desk/` directly,
no staging; urui checkout needed only for `sync.sh`), `RELEASE.md`
(no-symlink check + sync verify + the urui revision recorded in release
notes), `urui/README.md` (contract, sync table, harness). Done: a
clean-clone reader can build, test, and release without this plan document.

## Phase 6 — Packaging and delivery verification

**W6.1 No-symlink gate.** Add `find graph-viz -type l` (must be empty) to
`verify-sync.sh --strict`. Verify: passes clean, fails on a planted symlink.

**W6.2 Clean-checkout drill.** Clone graph-viz alone, no `urui` sibling:
`check.sh verify`, both `run*.sh`, `|commit`, the installed smoke from
`RELEASE.md` all pass. Separately, both repos as siblings: `verify-sync.sh`
reports `in-sync`. Done: recorded with the commit SHAs used.

**W6.3 Sync-time missing-checkout drill.** Rename `../urui`; `sync.sh` and
`verify-sync.sh --strict` fail with the §4.2 diagnostic within seconds;
ordinary build/test/install commands do not need the sibling and still pass.
Done: no confusing Hoon error surfaces first.

**W6.4 Purity gate.** `grep -rniE 'graph-viz|gviz|obelisk|heathcliff|
dot-language' urui/desk` is empty, wired into `verify-sync.sh` or a new
`check-purity.sh`. Done: gate wired into urui's test script.

## Phase 7 — Consolidation

**W7.1** Delete dead code left in graph-viz (superseded helpers, the old
monolith runner, `graph-viz-config.js` remnants). Verify: full gate green.
Done: `git grep` finds no orphan.

## Phase 8 — obelisk adoption, increment 1

Prereq: Phases 0–7 complete and released.

**W8.1** Full read + inventory of `obelisk-web.hoon` (resolves assumption
A-OBELISK), producing the extraction plan's §1 table for obelisk.
**W8.2** `lib/obelisk-web-file.hoon` delegates path validation to
`urui-clay` with `transport=%body`, root `/data/obelisk` (verify the actual
root first), obelisk's own mark set.
**W8.3** CSS tokens: adopt `%tokens`/`%shell`/`%controls`; keep obelisk's
grid and schema-tree rules. Verify: obelisk's existing tests + visual check
in both themes.
**W8.4** Explorer: adopt `++explorer` + `++file-tree` for the Schemas/Files
strip, adding the resizer. Verify: obelisk browser checks.
**W8.5** Session: register obelisk's existing `storageKey` slots.
Done-when: obelisk builds, its tests pass, W6.4's purity gate still finds no
obelisk string in urui.

Phases 9+ (full shell — Ace, document tabs, dialogs, shortcuts, the area-3
grid as a slot) stay out of committed scope per decision 4; W8.1's inventory
is their input.

## Rollback points (carried forward unchanged)

| After | Rollback |
|---|---|
| Stage 5/6/7 | Single-stage revert in graph-viz + urui; the stage before stays verified |
| W4.4 | Tests only; revert per repo |
| Phase 6 | Tooling only |
| Phase 8 | obelisk-local; graph-viz and urui unaffected |
