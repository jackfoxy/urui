# Validation and debugging

Two distinct sets of commands exist. **Which ones you have depends on the
checkout you are in.** Verify before quoting one to the user: `ls tests/
bin/ package.json`.

## 1. Commands that exist in a consumer desk

Confirmed for graph-viz; a newly adopting desk may have fewer.

| Boundary | Command | Notes |
| --- | --- | --- |
| Hoon compiles; desk-level suites | `|commit %<desk>` then `-test /=<desk>=/tests ~` on a fake ship | the only check that exercises `/*` imports, marks, and the agent |
| Emitted JavaScript is syntactically valid | `node --check <app.js>` | inside `tests/browser/run.sh` |
| Runtime behaviour against DOM doubles | `tests/browser/run.sh` (`GVIZ_URL=... tests/browser/run.sh` for an installed desk) | fast; no browser |
| Real browser, real Ace, keyboard | `tests/browser/run-real.sh`, or `npm run test:browser:real` | Chromium only |
| Application shortcut manifest | `npm run test:shortcuts` | |
| Application-specific reference check | `./check.sh verify` (graph-viz) | nothing to do with urui |

## 2. Commands that exist only in the urui source checkout

Useful when you have it beside the consumer; do not tell a user to run these
from a consumer desk.

| Command | Covers |
| --- | --- |
| `node bin/hoon-test.js <consumer-root> desk/tests/lib/urui-<lib>.hoon` | one shared lib's Hoon suite without a ship |
| `npm run test:browser` | the fixture's doubles suite: 10 scenarios plus core and Ace-config tests |
| `npm run test:browser:real` | 50 Chromium cases against the fixture |
| `npm run test:purity` (`bin/check-purity.sh`) | rejects consumer vocabulary under `desk/` |
| `bin/asset-digest.sh --consumer <dir> --spec <manifest>` | page / css / javascript sha-256 and byte counts |

## 3. What to run for what you changed

| Changed | Minimum meaningful check |
| --- | --- |
| a mold in `sur/urui.hoon` | every consumer's config arm compiles: `-test` on a ship, or `bin/hoon-test.js` per lib suite |
| `urui-config.hoon` | `desk/tests/lib/urui-config.hoon` — it asserts the exact json keys |
| `urui-shell.hoon` | `desk/tests/lib/urui-shell.hoon` (18 arms over both frames), then a browser run if the runtime binds the element |
| `urui-css.hoon` | `desk/tests/lib/urui-css.hoon`, then a real-browser run for anything layout- or theme-related |
| `urui-js.hoon` | `node --check`, the doubles suite, then Chromium for focus, Ace, or drag behaviour |
| `urui-ace.hoon` | `desk/tests/lib/urui-ace.hoon` plus the Ace-config test; the emitted names only matter on a ship |
| `urui-clay.hoon` / `urui-http.hoon` | their Hoon suites; the wire itself needs a ship |
| a persisted slot | doubles session scenario, then a real reload: write, reload, confirm restoration |
| a transport field | doubles `files` scenario for `%body`; a ship for `%header` |

Digests are a change-detection tool, not a test: page and css should be
byte-identical after a pure Hoon-comment change, while javascript moves
whenever an emitted cord does — comments inside `'''` blocks ship to the
browser.

## 4. Coverage that does not exist

State these as gaps rather than assuming a test protects you.

- **`%body` transport** is exercised only by the Node doubles scenario
  `tests/browser/scenarios/files.js`. No consumer uses it and no browser test
  covers it.
- **`++require-auth:urui-http`** has Hoon tests but no caller in any consumer.
- **Session migration** has no tests because it has no implementation.
- **The `%compact` frame** (`++section`, `++compact`) is covered by Hoon shell
  tests, but no consumer ships it and its css classes are unstyled, so no
  browser test exercises it.
- **Accessibility** is asserted structurally — roles, `aria-*`, focus
  restoration in `shortcut-boundaries.spec.js` — not by an audit tool.
- **Responsive layout** has one Hoon assertion
  (`test-responsive-shell`) and the media query; no viewport test.

## 5. Debugging entry points

| Symptom | Look first at |
| --- | --- |
| a config value has no effect | is it in `++config-json`? is the json key spelled the same in `urui-js.hoon`? read `window.URUI_CONFIG` in the console |
| a feature silently does nothing | a missing DOM id: the `elements` map at the shell-frame banner uses `?.` everywhere, so an absent node disables rather than throws. Check the consumer-supplied ids especially (`#theme`, `#help`, `#browse-{kind}`) |
| a layout arm throws | `#workbench` / `#workspace` / `#explorer-*` are *not* optional; the compact frame has none of them, so a compact consumer must not call those arms |
| `urui.boot called more than once` | two bundles, or a re-executed script tag |
| `urui.<method>()` returns undefined | no hook installed for it, or `boot` has not run yet |
| a saved session is ignored | `version !== storageVersion`; or a slot key that does not match `readSlot`'s list; or per-entry validation dropped it (bad id pattern, oversized source, duplicate path) |
| tabs and refs disagree | `syncRefFromParent` runs on capture and save; a consumer that mutates `tab.source` directly without `tabs.capture` desynchronises them |
| a file operation fails | is `endpoints[action]` present? does `{kind}` resolve? does the agent read the same transport? 409 means the file exists and `overwrite` was not sent |
| the file tree stays "Loading…" | the browse response must be `{file, children}`; `aria-busy` is cleared only by `renderFileTree` |
| a shortcut does nothing | no handler registered for that `command`; or the `when` context is false; or Ace claimed it first — the dispatcher is capture-phase, so urui sees the event first and only forwards what it does not claim |
| Ace never appears | the adapter throws when `window.ace`, `options.assets`, or the Beautify extension is missing; the consumer is expected to catch and show `#editor-load-error` |
| a Hoon type failure in a consumer's config | a tuple mold is positional: a field added upstream shifts everything after it. Also `++config` is an *arm* — bind it (`=/ cfg config`) before reaching into it, or the wing resolves against the arm |
