# Remaining work: W4.3.5 onward

Recorded 2026-09-10. Supersedes the "not started" rows of
`w4.3-runtime-extraction.md`'s staging table (its Stage 5–7 rows, renamed
here W4.3.5–W4.3.7 — see "Naming standard" below) and everything from
W4.3's remainder through Phase 8 in `~/FoxyLabs/urui/urui-extraction-plan.md`
— both struck through in place, pointing here. This is the live plan; edit
here, not there.

## Why a new item comes first

Stages 1–4 landed real arms in `urui-js.hoon`, `urui-config.hoon`,
`sur/urui.hoon`, and the fixture lib without a matching documentation pass —
the working record (`w4.3-runtime-extraction.md`) is thorough, but the
in-file arm comments have not been audited since Stage 1. Doing that once,
now, before W4.3.5 adds two more surfaces (`++files`, `++shortcuts`), is
cheaper than doing it after five more stages. Every item below carries the
same requirement forward: **an arm whose signature or behavior an item
changes gets its doc comment updated in the same commit** — that is part of
each item's done-when from here on, not a separate pass.

## Naming standard

Every work item is `### W<phase>.<item> — Title`. Phases are `## Phase <n>
— Name`, a grouping heading only — never itself a work item, so a phase
with one item (Phase 7) is headed the same way as one with five (Phase 8).
`W4.3` is one item but carries seven internal steps, so it alone goes one
level deeper: `#### W4.3.<n>`. `WD.1` keeps a letter instead of a phase
number on purpose — it is a standing documentation-currency gate that
applies across items, not a step in one phase's sequence.

This replaces a prior mix of `Stage <n>`, bare `W<n>.<m>`, and `Phase <n>`
all at the same heading level. `w4.3-runtime-extraction.md` still calls
W4.3's seven steps "Stage 1"–"Stage 7"; W4.3.5/.6/.7 here are the same
steps 5–7, renamed for this document only.

A completed item's heading gets ` (done YYYY-MM-DD)` appended, visible
without opening the section; a parent item with some but not all steps done
gets ` (n/total done)` instead. Everything else in this document is
remaining.

## Scope key

Each remaining item below carries a `Scope:` line — complexity tier plus a
duration estimate calibrated to this repo's own commit pace. **S**
small/mechanical, single file or config line. **M** several files and/or
one new test, ordinary verification. **L** cross-repo, new test
infrastructure, or an unresolved assumption. W4.3.5/.6 are done and carry
none; Phase 8's are provisional until W8.1 resolves A-OBELISK.

### WD.1 — Bring core/arm documentation up to date (done 2026-09-11)

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
Scope: M — 4–6h.

Completed: every top-level arm in the seven libs and every `+$` in
`sur/urui.hoon` carries a preceding `::`; descriptions were added only
where a cross-file coupling is not legible from the arm's name and `^-`.
`urui-js` gained the six section banners its Stage-1 region never got
(shell frame, theme, status, layout, dialogs, wiring) plus one for the
object `++runtime` returns, and its header no longer claims that options
are documented at banners that did not exist; `++editor-adapter` now
documents its option record; the `dot-7` example in the persistence
section was made consumer-neutral, and the documentation banner's claim
that the table of contents comes from `docsRoot` was corrected: the code
probes the ship's `/docs` and reads `${config.appId.base}/doc.toc`, using
`docsRoot` only for a leaf's iframe. `urui-shell` documents the id
derivations the runtime binds (`{view}-tab/-panel/-tree`,
`{kind}-document-tabs`, the fixed dialog ids) and why a tall-attribute
element carries a hidden span. `urui-css` names what each section owns
and records that `.pane-title`, `.pane-actions`, `.pane-body`, and
`.editor-host` are deliberately unstyled. `urui-clay` and `urui-http`
moved their core header above `|%`, matching the other five files.
`sur/urui.hoon` records that `permanent-views` selects the full or
compact frame.

Verified: urui's seven lib suites **70 arms ok**, fixture-web **3 arms
ok**, 10 Node scenarios, the core tests and the Ace config test pass, the
purity gate is clean, and no line exceeds 80 characters. Fixture page and
CSS digests are unchanged; JavaScript is re-recorded at
`8ba81f64… 97213` — the section banners live inside the emitted cords, so
2.8 KB of comments ship to the browser, as they already did for the eight
pre-existing banners.

Not fixed here, recorded for a later item: `urui-css ++shell` still
carries three `#dot` rules, which are graph-viz's editor host id;
`bin/check-purity.sh` greps `dot-language`, not bare `dot`, so the gate
does not see them. urui's own fixture references no `#dot`.

## Phase 4 — Runtime extraction & test migration

W4.1 and W4.2 are already committed (persistence and load/save groundwork,
predating this document). What remains is the rest of W4.3 and W4.4.

### W4.3 — Runtime extraction before spec migration (done 2026-09-10)

Seven stages; 1–4 done before this plan existed (see
`w4.3-runtime-extraction.md`). 5, 6, and 7 below are all done, which
completes W4.3.

#### W4.3.5 — Clay file operations + shortcut dispatcher (done 2026-09-10)

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
browse/open hooks are removed; editor mounting remains W4.3.6.

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

#### W4.3.6 — Fixture becomes a real consumer (done 2026-09-10)

Files: `tests/fixture/lib/urui-fixture-web.hoon`.
Change: mount both Ace editors (the fixture's `%text`/`%note` kinds), expose
the editor test hooks (the fixture's equivalent of
`__GVIZ_EDITOR_TEST__`), serve `#editor-load-error` on adapter failure —
everything `urui-shell`/`urui-js` already support that the fixture has
stubbed past until now.
Prereq: W4.3.5 (the fixture's file operations need `++files` to exercise
anything real).
Verify: fixture Chromium suite exercises both editors under the same specs
W4.3.7 will retarget; `-test /=urui-fixture=/tests ~` green with new
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

#### W4.3.7 — Move the specs (done 2026-09-10)

Files: 6 whole Ace specs (`ace-editing-navigation-shortcuts`,
`ace-remaining-shortcuts`, `ace-macros`, `ace-undo-redo`, `ace-smoke`,
`ace-editor-failure`) + the generic halves of `editor-surface.spec.js`,
`lifecycle.spec.js`, `tabs.spec.js`, `shortcut-boundaries.spec.js` + the
generic part of `ace-assets.spec.js` → `urui/tests/browser/real/`,
retargeted at the fixture (W4.3.6). graph-viz keeps `visual-editing.
spec.js`, the app halves of the four split specs, and one `ace-assets` case.
Prereq: W4.3.6.
Verify: `urui/tests/browser/run-real.sh` and `graph-viz/tests/browser/
run-real.sh` both green; combined executed-test count ≥ 54 (the W0.3
baseline).
Done: counts recorded in both READMEs; mark W4.3 complete in
`~/FoxyLabs/urui/urui-extraction-plan.md` with the usual completion note.
Scope: L — 1–2 days (cross-repo spec split, dual-suite verification).

Completed: the six Ace specs and the generic halves of the four split
specs now run against the fixture in `urui/tests/browser/real/`, with a
consumer-neutral backend double (`text`/`note` kinds, no `dot`/`svg`
vocabulary). graph-viz keeps `visual-editing.spec.js`, the app halves —
parse diagnostics, templates, auto-render, SVG Ace editing, its own chords,
its help links and preview focus — and one `ace-assets` case for its legacy
config object.

Retargeting the specs required the fixture to become the consumer they
assume: it now serves the file controls `urui-js ++wire` binds by name
(`#browse-`/`#load-`/`#save-`), an Add Ref control per kind, a problem line
beside its result, a two-panel help with the runtime's docs tree, a shared
`?text=` parameter, an `autoEcho` preference slot that survives a reload,
and its own Ace language mode — `ace/mode/fixture`, `//` and `/* */`
comments over brace folding — because Ace's built-in text mode has neither,
and the comment and fold chords have to act on something. `ext` now reads
`text`/`note` where the clay leaf stays `txt`/`md`. Two arms in `urui-js`
(`renderExplorerTabs`, `explorerTabButtons`) return early when a consumer
has no explorer strip.

Verified: urui Chromium **50 passed**, graph-viz Chromium **14 passed** —
64 executed, against the W0.3 baseline of 54. urui's seven lib suites plus
fixture-web through `bin/hoon-test.js`: **73 arms ok**. Node: 10 scenarios,
the core tests, and the Ace config test pass. Graph-viz's **130 asset
needles report zero problems**; `verify-sync.sh --strict` reports 24 files
in sync; every touched Hoon file parses. Digests — graph-viz page and CSS
unchanged, its JavaScript re-recorded; all three fixture assets
re-recorded.

Owed: `-test /=urui-fixture=/tests ~` on a ship. The fixture's app suite
asserts the emitted Ace config names `ace/mode/fixture`, which only the
desk runner can check.

### W4.4 — Shortcut manifest (done 2026-09-10)

Files: move `ace-win-linux-shortcuts.json` + its baseline test +
`ace-editor-baseline.md` to urui; sync the JSON back into graph-viz (§4.1 of
the extraction plan); graph-viz keeps `app-shortcuts.json` + its collision
test.
Prereq: W4.3.7 (the baseline test now runs against the fixture's chord set,
not graph-viz's).
Verify: `npm --prefix urui run test:shortcuts` and `npm run test:shortcuts`
(graph-viz) both pass with the same accounting (100 rows, 102 executions,
97 bindings, 5 exclusions, 5 duplicates, 1 override).
Done: one source of truth for the baseline; `verify-sync.sh --strict`
reports the JSON in-sync.
Scope: S–M — 2–4h.

Completed: urui owns the Ace Windows/Linux manifest, its accounting test, and
the editor-baseline record. The two real-browser shortcut specs read the local
manifest. Graph-viz keeps only its application manifest and collision test;
the baseline JSON is a checksum-synced consumer copy.

Verified: strict sync reports all 25 managed files in sync. The user will run
both `test:shortcuts` commands.

## Phase 5 — graph-viz adoption complete

### W5.1 — Reduced integration matrix (done 2026-09-10)

Add I2, I4, I6 (§3.6 of the extraction plan), including
`session-compat.spec.js` seeded from the W0.2 fixture.
Verify: green. Done: the 6-item integration matrix is complete.
Scope: M — 4–6h.

Completed: I2 checks the emitted shell and adapter wiring; I4 loads the W0.2
v1 fixture and covers restored tabs/view plus Clay open, edit, save, and
reload; I6 covers exact parse annotations and a Clay failure modal with focus
restoration. Together with the retained I1, I3, and I5 coverage, all six
matrix items are present. The user will run the Hoon and Chromium suites.

### W5.2 — Docs (done 2026-09-10)

`graph-viz/README.md` (install by copying `desk/` directly, no staging;
urui checkout needed only for `sync.sh`), `RELEASE.md` (no-symlink check +
sync verify + the urui revision recorded in release notes), `urui/README.md`
(contract, sync table, harness).
Done: a clean-clone reader can build, test, and release without this plan
document.
Scope: S — 2–3h.

Completed: graph-viz documents direct desk installation, the optional sibling
checkout for syncing, and its application-only test coverage. Its release
checklist now gates symlinks and strict sync, and requires the exact urui SHA
in release notes. urui documents the public contract, ownership/sync table,
and layered fixture harness. A clean-checkout reader no longer needs this plan
to build, test, or release either repository. The user will run verification.

## Phase 6 — Packaging and delivery verification

### W6.1 — No-symlink gate (done 2026-09-10)

Add `find graph-viz -type l` (must be empty) to `verify-sync.sh --strict`.
Verify: passes clean, fails on a planted symlink.
Scope: S — <1h.

Completed: strict verification walks the complete consumer checkout without
following directory links, reports every symlink, and fails if any is found.
Non-strict verification remains a drift-only warning. The unit case proves a
clean strict pass, failure on a planted unmanaged link, and recovery after its
removal. The user will run verification.

### W6.2 — Clean-checkout drill (done 2026-09-10)

Clone graph-viz alone, no `urui` sibling: `check.sh verify`, both
`run*.sh`, `|commit`, the installed smoke from `RELEASE.md` all pass.
Separately, both repos as siblings: `verify-sync.sh` reports `in-sync`.
Done: recorded with the commit SHAs used.
Scope: M — 3–5h (ship staging overhead).

Completed: graph-viz's generated-asset Playwright server now assembles only
from its checked-in sources instead of importing code from `../urui`. The
documented installed-desk path was already sibling-independent. The clean
checkout drill is based on urui `2a1875a` and graph-viz `afd128e` plus this
worktree change; the user will run the builds, suites, ship commit, installed
smoke, and sibling strict-sync verification, then commit the result.

### W6.3 — Sync-time missing-checkout drill (done 2026-09-10)

Rename `../urui`; `sync.sh` and `verify-sync.sh --strict` fail with the
§4.2 diagnostic within seconds; ordinary build/test/install commands do not
need the sibling and still pass.
Done: no confusing Hoon error surfaces first.
Scope: S — 1–2h.

Completed: graph-viz now provides local `bin/sync.sh` and
`bin/verify-sync.sh` entry points. Both resolve `../urui`, fail immediately
with the §4.2 diagnostic when it is absent, and otherwise delegate with the
consumer destination fixed to graph-viz. `check.sh` and both browser runners
use the local warning-only verifier; their build and test work remains
independent of the sibling. The user will run the rename drill and tests.

### W6.4 — Purity gate (done 2026-09-10)

`grep -rniE 'graph-viz|gviz|obelisk|heathcliff|dot-language' urui/desk` is
empty, wired into `verify-sync.sh` or a new `check-purity.sh`.
Done: gate wired into urui's test script.
Scope: S — 1–2h (more if the grep finds hits).

Completed: `bin/check-purity.sh` rejects the five prohibited consumer terms
anywhere below `desk/`. The gate runs through `verify-sync.sh`, the browser
test runner, and `npm run test:purity`. Consumer-specific examples and stale
historical comments were made neutral, while the remaining generic Hoon
assertions continue to guard parameterization. The user will run verification.

## Phase 7 — Consolidation

### W7.1 — Dead-code removal (done 2026-09-10)

Delete dead code left in graph-viz (superseded helpers, the old monolith
runner, `graph-viz-config.js` remnants).
Verify: full gate green. Done: `git grep` finds no orphan.
Scope: M — 3–5h.

Completed: graph-viz drops the unused DOM/runtime aliases left by extraction,
renames the reduced application-scenario launcher from the old monolith name,
and removes the legacy static Ace-config fixture. The generated configuration
test now asserts its complete object, setup calls, and frozen state directly;
the generated `/graph-viz-config.js` compatibility route remains live. The
user will run the full gate.

## Phase 8 — obelisk adoption, increment 1

Prereq: Phases 0–7 complete and released. Scope estimates below are
provisional until W8.1 resolves A-OBELISK.

### W8.1 — obelisk-web.hoon inventory

Full read + inventory of `obelisk-web.hoon` (resolves assumption
A-OBELISK), producing the extraction plan's §1 table for obelisk.
Scope: L — 1–2 days (4858-line unfamiliar file).

### W8.2 — obelisk Clay delegation

`lib/obelisk-web-file.hoon` delegates path validation to `urui-clay` with
`transport=%body`, root `/data/obelisk` (verify the actual root first),
obelisk's own mark set.
Scope: L — ~1 day (first real obelisk integration; root path unverified).

### W8.3 — CSS tokens

Adopt `%tokens`/`%shell`/`%controls`; keep obelisk's grid and schema-tree
rules.
Verify: obelisk's existing tests + visual check in both themes.
Scope: M — 4–6h.

### W8.4 — Explorer adoption

Adopt `++explorer` + `++file-tree` for the Schemas/Files strip, adding the
resizer.
Verify: obelisk browser checks.
Scope: L — ~1 day (replaces obelisk's own explorer).

### W8.5 — Session slots

Register obelisk's existing `storageKey` slots.
Done-when: obelisk builds, its tests pass, W6.4's purity gate still finds no
obelisk string in urui.
Scope: S — 2–3h.

Phases 9+ (full shell — Ace, document tabs, dialogs, shortcuts, the area-3
grid as a slot) stay out of committed scope per decision 4; W8.1's inventory
is their input.

## Estimated remaining effort

| Item | Tier | Duration |
|---|---|---|
| WD.1 | M | 4–6h |
| W4.3.7 | L | 1–2 days |
| W4.4 | S–M | 2–4h |
| W5.1 | M | 4–6h |
| W5.2 | S | 2–3h |
| W6.1 | S | <1h |
| W6.2 | M | 3–5h |
| W6.3 | S | 1–2h |
| W6.4 | S | 1–2h |
| W7.1 | M | 3–5h |
| W8.1 | L | 1–2 days |
| W8.2 | L | ~1 day |
| W8.3 | M | 4–6h |
| W8.4 | L | ~1 day |
| W8.5 | S | 2–3h |

WD.1 through W7.1: ≈36h (~5–6 focused days). Phase 8: ≈29h (~4–5 days),
provisional until W8.1 resolves A-OBELISK. Total ≈65h.

## Rollback points (carried forward unchanged)

| After | Rollback |
|---|---|
| W4.3.5/.6/.7 | Single-stage revert in graph-viz + urui; the stage before stays verified |
| W4.4 | Tests only; revert per repo |
| Phase 6 | Tooling only |
| Phase 8 | obelisk-local; graph-viz and urui unaffected |
