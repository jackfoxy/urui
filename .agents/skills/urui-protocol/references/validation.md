# Validation and debugging

Two sets of commands exist. **Which ones you have depends on the checkout you
are in.** Verify before quoting one to the user: `ls tests/ bin/
package.json`.

## 1. Commands in a consumer desk

Confirmed for graph-viz; obelisk and a newly adopting desk may have fewer.

| Boundary | Command | Notes |
| --- | --- | --- |
| Hoon compiles; desk suites | `|commit %<desk>` then `-test /=<desk>=/tests ~` on a fake ship | the only check that exercises `/*` imports, marks, and the agent |
| Emitted JavaScript is valid | `node --check <app.js>` | inside `tests/browser/run.sh` |
| Runtime behaviour against DOM doubles | `tests/browser/run.sh` (fetches `app.js` from `GVIZ_URL`, default a local ship) | fast; no browser |
| Real browser, real Ace, keyboard | `tests/browser/run-real.sh` | Chromium only; compiles the page with `vere eval`, no ship |
| Shared files match urui | `bin/verify-sync.sh`, or `bin/sync.py verify --dest <desk>` from urui | `stale` means a sync is due; `modified-locally` means someone edited a shared copy |

## 2. Commands in the urui checkout

Useful beside a consumer; do not tell a user to run these from a consumer
desk.

| Command | Covers |
| --- | --- |
| `node bin/hoon-test.js <root> desk/tests/lib/<suite>.hoon` | one Hoon suite through `vere eval`, no ship; `<root>` is urui itself or a consumer checkout with the `desk/lib` layout; a suite that uses `/*` needs a ship |
| `tests/browser/run.sh` (`npm run test:browser`) | purity check; the `urui-fixture-web` bundle's core tests and 11 shell scenarios; the `documents` scenario against `urui-fixture-docs`; the Ace config test |
| `tests/browser/run-real.sh` (`npm run test:browser:real`) | the Chromium suite against `urui-fixture-web`, served by `tests/browser/serve-app.js` with a Playwright double of the file wire (`real/fixtures/backend.js`) |
| `bin/check-purity.sh` (`npm run test:purity`) | rejects consumer vocabulary under `desk/` |
| `bin/sync.sh --dest <consumer>` | copies the shared files in and records their hashes |
| `bin/asset-digest.sh --consumer <dir> --spec <manifest>` | page / css / javascript sha-256 and byte counts |

## 3. What to run for what you changed

| Changed | Minimum meaningful check |
| --- | --- |
| a mold in `sur/urui.hoon` | every consumer's config arm compiles: `-test` on a ship, or `bin/hoon-test.js` per suite |
| `urui-config.hoon` | `desk/tests/lib/urui-config.hoon` — it asserts the exact json keys |
| `urui-shell.hoon` | `desk/tests/lib/urui-shell.hoon` (both frames, store Sail), then a browser run if the runtime binds the element |
| `urui-css.hoon` | `desk/tests/lib/urui-css.hoon`, then a real-browser run for layout or theme |
| `urui-js.hoon` | `node --check`, `desk/tests/lib/urui-js.hoon`, the doubles suite, then Chromium for focus, Ace, dialogs, or drag behaviour |
| `++documents` | the `documents` scenario first; then the real suite, which drives two stores through the file wire |
| `urui-files.hoon` | `desk/tests/lib/urui-files.hoon` (pure arms, no ship); a consumer agent's route tests; the verified-write path needs a ship for a true round trip |
| `urui-ace.hoon` / `urui-http.hoon` | their Hoon suites |
| a persisted slot | the doubles `runtime` and `documents` scenarios, then a real reload: write, reload, confirm restoration |

Digests are a change-detection tool, not a test: page and css are
byte-identical after a pure Hoon-comment change, while javascript moves
whenever an emitted cord does — comments inside `'''` blocks ship to the
browser.

## 4. Coverage that does not exist

State these as gaps rather than assuming a test protects you.

- **Verified Clay writes end to end.** `urui-files` plans and takes are
  unit-tested, and the browser suites use a double of the wire; only a ship
  exercises a real `%warp`/`%info`/`%wait` round trip.
- **The fixture agent's file route.** `tests/fixture/app/urui-fixture.hoon`
  does not serve `/apps/urui-fixture/files`; on a ship its trees show an
  error toast.
- **`++require-auth:urui-http`** has Hoon tests but no caller.
- **Session migration** has no tests because it has no implementation.
- **The compact frame** is covered by Hoon shell tests only; no consumer
  ships it.
- **Accessibility** is asserted structurally — roles, `aria-*`, focus
  restoration — not by an audit tool.

## 5. Debugging entry points

| Symptom | Look first at |
| --- | --- |
| a config value has no effect | is it in `++config-json`? is the json key spelled the same in `urui-js.hoon`? read `window.URUI_CONFIG` in the console |
| a feature silently does nothing | a missing DOM id: the element map uses `?.` everywhere, so an absent node disables rather than throws |
| a store has no strip, or an empty one | its `%documents` level's `kind` must equal the store `name`, and `files` must be set |
| a store's tree never fills | the `$tree`'s `view` must be a `%views` `fixed` name; the browse reply must be `{ok: true, entries}`; errors show as a toast |
| the editor never appears | the pane's `%panel` band needs a `host`; the adapter throws when `window.ace`, the assets at `ace-spec.global`, or Beautify is missing, and `docMount` then shows `{host}-load-error` |
| a save asks to overwrite every time | the agent must answer `load` with the same text it hashes; `changed` means the stored hash differs from the tab's `base` |
| a save never answers | with `verify`, the agent must forward signs on `/urui-files` wires to `++take`; `unavailable` means another change is still pending |
| `urui.boot called more than once` | two bundles, or a re-executed script tag |
| `urui.<method>()` returns undefined | no hook installed for it, or `boot` has not run yet |
| a saved session is ignored | `version !== storageVersion`; or a slot key `readSlot` does not know; or per-entry validation dropped it (bad id pattern, oversized text, duplicate path) |
| a reference does not follow its tab | only store tabs with `refs=&` sync; an app reference kind updates through `runtime.explorer.refs.update` |
| a shortcut does nothing | no handler registered for that `command`; or the `when` context is false; an open file or confirm dialog takes Escape first |
| a Hoon type failure in a consumer's config | `$app-config` is positional: a field added or removed upstream shifts everything after it. Bind an arm (`=/ cfg config`) before reaching into it |
