# Change impact by task

Every workflow below assumes the rules in `SKILL.md`: read the owning arm
first, keep `consumer → urui` one-way, keep UI behaviour in urui, change the
smallest coherent set, and validate every boundary the change crossed (see
[validation.md](validation.md)).

A shared shortcut for "find every reader", run from the desk root:

```bash
rg -n 'fieldName|jsonKey' desk/sur/urui.hoon desk/lib/urui-*.hoon desk/lib/<your>-web.hoon
```

`rg` over `desk/lib/urui-js.hoon` is the only reliable way to find a json key:
the JavaScript reads it as a property, so the Hoon field name will not appear.

Shared files change in the urui checkout, never in a consumer's copy; sync
them afterwards with `bin/sync.sh --dest <consumer>` from urui. A sync copies
the libraries, `sur/urui.hoon`, the Ace assets, and the browser doubles, and
deletes a library urui dropped. It does not copy urui's own Hoon tests.

---

## 1. Add or change an `$app-config` / `$shell-spec` field

**Files:** `sur/urui.hoon` → `lib/urui-config.hoon` (mold arm + `++config-json`
row) → `lib/urui-js.hoon` (the banner that will read it) → every consumer's
`++config` / `++spec`.

1. Add the field to the mold. A `(unit ...)` is the additive-safe shape; it
   emits json `null`, which the runtime can treat as absent.
2. Emit it, picking the json key deliberately — it is the name the browser
   and the tests will use forever.
3. Read it in the runtime, with a default (`config.x ?? fallback`), inside the
   section that owns the behaviour.
4. Update **every** consumer's config arm in the same change: `$app-config` is
   a positional tuple, so a new field is a compile error in each of them, not
   a silent default. A consumer that builds its config with `%*` over a bunt
   (urui's docs fixture does) is unaffected.

**Consumer updates.** Their `++config`, plus any Hoon test that builds an
`$app-config` literal (`desk/tests/lib/urui-config.hoon`, the fixtures).

---

## 2. Add a document store, root, action, or previewer

A document kind is data, not code:

| Adding | Touch |
| --- | --- |
| a `$store` | the consumer's `files.stores`; a `%documents` tab level whose `kind` names it; a `%panel` band with an `$editor` host in the same pane; `%tabs`/`%active`/`%next` slots with `kind` set to the store, plus `fileTrees`; `open:/save:/save-as:{store}` in `shortcuts` if you want keys |
| a `$root` | the store's `roots`; the agent's policy follows automatically through `++make-policy`, but a mark without a stock codec needs one added to the policy |
| a tree | a `%views` level `fixed` entry and a `$tree` naming that view |
| an action | the store's `actions` list — urui emits and wires `{store}-{action}` |
| a previewer for a mark | `runtime.documents.previews.register(mark, {mount, show, hide, render})` in the consumer; urui shows the view toggle for any tab whose mark has one |
| domain reaction | `options.documents[store]`: `activate`, `afterActivate`, `loaded`, `saved`, and `fields` for app data on a tab |

**Hazards.** A store with no slots persists nothing. A `$tree` whose `view`
is not a `%views` `fixed` name has no element to render into, silently. A
level `kind` that names no store renders an empty strip. Do not add a hook
that changes *how* tabs, files, dialogs, or previews behave: that is urui's
rule, the same for every app — change the rule in `++documents` instead.

---

## 3. Change a document behaviour

**Files:** `++documents` in `lib/urui-js.hoon`, its Sail in
`lib/urui-shell.hoon` if markup changes, its css in the matching section.

The change applies to every consumer at once. Update the `documents`
scenario (`tests/browser/scenarios/documents.js`, against
`tests/fixture/lib/urui-fixture-docs.hoon`) and, where a real browser
matters, `tests/browser/real` against `urui-fixture-web`. Keep the rule list
in the `++documents` banner comment in step with what the code does.

---

## 4. Add a stable `window.urui` method or hook group

**Files:** `++core` in `lib/urui-js.hoon` only, plus the consumer's `boot`
call. `methods(group, names)` builds a frozen forwarder per name.

**Hazards.** The facade only forwards; it implements nothing. If the method
should *do* something without a hook, it belongs in the runtime instead.

**Validate:** `test-public-api` and `test-boot-contract` in
`desk/tests/lib/urui-js.hoon`; `tests/browser/urui-core.test.js`.

---

## 5. Add runtime-only behaviour

**Files:** `++runtime` (or `++shortcuts` / `++documents`) in
`lib/urui-js.hoon`.

1. Put it under the section banner that owns the responsibility.
2. Take policy from `config`, never from a literal that names a consumer.
3. If the consumer must react, add an `options.*` callback and document it at
   that banner.
4. If the consumer must call it, expose it in the returned object.

**Hazards.** The runtime is emitted JavaScript inside Hoon cords: the `'''`
blocks must stay balanced, backslashes are Hoon escapes, and comments ship to
the browser. Keep lines inside 80 characters.

---

## 6. Change the file wire

**Files:** `docJsonTransport` and the open/save/remove flow in `++documents`
→ `++parse-request`, `++plan-save` / `++plan-delete`, and the reply arms in
`lib/urui-files.hoon` → every consumer agent's route and `on-arvo` (they only
call `++handle` and `++take`, so most wire changes need no consumer edit).

**Hazards.** Both halves must land together: a page served from a cached
asset will talk to a new agent. A save's conflict check depends on `load`
answering exactly the text the hash was computed over. Error codes are
contract: the client asks before overwriting on `exists` and `changed`.

---

## 7. Add or change a persisted slot or storage version

1. Decide the owner. `%app` slots are the consumer's: `options.session.read`
   / `.validate`, applied by the consumer after `session.load()` returns.
2. A `%urui` slot only works if `readSlot`, `loadSession`, and
   `applySession` know its **exact key** (or its `kind` names a store). An
   unknown key round-trips unvalidated.
3. Keep keys stable; renaming one silently drops it for every existing user.
4. Bump `storage-version` when a record cannot be read forward. There is no
   migration: a mismatched record is discarded whole, and
   `++theme-bootstrap` ignores it too, so the first paint loses the saved
   theme.

---

## 8. Add a css section or change DOM/CSS coupling

**Files:** `+$section` (closed union) → the new arm → `++compose`'s `?-` →
every consumer's `(compose ...)` list → `test-sections-cover-shared-rules`.

**Hazards.** Consumers keep their old section list until they opt in.
`--editor-width` / `--explorer-width` are declared in `%tokens` and
rewritten inline by the layout section. `%responsive`'s `760px` duplicates
`limits.narrow`. Classes the runtime toggles — `collapsed`,
`explorer-collapsed`, `inactive`, `active`, `is-dragging` — must keep
working.

---

## 9. Make an intentional breaking change

There is no deprecation mechanism: no version negotiation, no shim layer, no
migration hook. A break is a coordinated edit.

1. Enumerate readers first: `rg` the Hoon field, the json key, the DOM id,
   and the storage key across `desk/` and every consumer you know of.
2. Change urui and every consumer in one change set; sync, then build each.
3. If the break touches storage, choose between keeping the key and bumping
   `storage-version`.
4. If it touches the wire, both sides land together.
5. Record the break at the arm's doc comment and in the consumers' notes.

State plainly which consumers you could not inspect; urui has no registry of
them.
