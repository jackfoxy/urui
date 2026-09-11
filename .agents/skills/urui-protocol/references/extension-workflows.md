# Change impact by task

Every workflow below assumes the rules in `SKILL.md`: read the owning arm
first, keep `consumer → urui` one-way, change the smallest coherent set, and
validate every boundary the change crossed (see
[validation.md](validation.md)).

A shared shortcut for "find every reader", run from the desk root:

```bash
rg -n 'fieldName|jsonKey' desk/sur/urui.hoon desk/lib/urui-*.hoon desk/lib/<your>-web.hoon
```

`rg` over `desk/lib/urui-js.hoon` is the only reliable way to find a json key:
the JavaScript reads it as a property, so the Hoon field name will not appear.

---

## 1. Add or change an `$app-config` / `$shell-spec` field

**Files:** `sur/urui.hoon` → `lib/urui-config.hoon` (mold arm + `++config-json`
row) → `lib/urui-js.hoon` (the banner that will read it) → every consumer's
`++config` / `++spec`.

**Steps**

1. Add the field to the mold. A `(unit ...)` is the additive-safe shape; it
   emits json `null`, which the runtime can treat as absent.
2. Emit it: extend the record's `*-json` arm, or add a row to
   `++config-json`. Pick the json key deliberately — §1 of
   [contracts.md](contracts.md) — because it is the name the browser and the
   tests will use forever.
3. Read it in the runtime, with a default (`config.x ?? fallback`), inside the
   section that owns the behaviour.
4. Update **every** consumer's config arm in the same change: a tuple mold is
   positional, so a new field is a compile error in each of them, not a
   silent default.

**Hazards.** Adding a field mid-record shifts every positional `:*` in every
consumer. A field only urui reads is fine; a field only the consumer reads
(like `render-debounce`) is also fine, but say so in its doc comment or the
next reader will hunt for a nonexistent JavaScript use.

**Consumer updates.** Their `++config`, plus any Hoon test that builds an
`$app-config` literal (`desk/tests/lib/urui-config.hoon` and the fixture's).

---

## 2. Add a stable `window.urui` method or hook group

**Files:** `++core` in `lib/urui-js.hoon` only, plus the consumer's `boot`
call.

`methods(group, names)` builds a frozen forwarder per name; adding a name to
an existing group is one array entry. A new group is one `api` entry plus a
freeze — the loop at the end of `++core` freezes every object value.

**Hazards.** The facade only forwards; it implements nothing. If the method
should *do* something without a hook, it belongs in the runtime instead
(workflow 3), or needs an explicit fallback like `dialog.confirm`'s. Adding a
method that every consumer must now implement is a breaking change in
disguise — consumers that do not implement it get `undefined`, silently.

**Validate:** `test-public-api` and `test-boot-contract` in
`desk/tests/lib/urui-js.hoon` enumerate the surface and will fail until
updated; `tests/browser/urui-core.test.js` checks forwarding and fallbacks.

---

## 3. Add runtime-only behaviour

**Files:** `++runtime` (or `++files` / `++shortcuts`) in `lib/urui-js.hoon`.

1. Put it under the section banner that owns the responsibility; add a banner
   if it is genuinely a new one.
2. Take policy from `config`, never from a literal that names a consumer.
3. If the consumer must react, add an `options.on*` callback and document it
   at that banner — the `++runtime` header promises exactly that.
4. If the consumer must call it, expose it in the returned object under the
   matching group.

**Hazards.** The runtime body is emitted JavaScript inside a Hoon cord: the
`'''` block must stay balanced, `\0a` and backslashes are Hoon escapes, and
anything you write ships to the browser — including comments. Keep lines
inside 80 characters for the Hoon file's sake.

---

## 4. Add a document kind, area, control, or shell element

| Adding | Touch |
| --- | --- |
| a `$doc-kind` | consumer `kinds`; a permanent view named `{kind}-files` if it needs a tree; slots `%tabs`/`%active`/`%next` for it; `#browse-/load-/save-{kind}` controls; endpoints answer `{kind}`; `options.tabs[kind]` and `options.files[kind]` hooks |
| an `$area` | the consumer's `areas` triple — `role` is a closed `?(%reference %editor %result)`, so a fourth area needs a mold change first |
| a control | consumer `controls` marl; wire it yourself, or name it `#browse-/load-/save-{kind}` and let `wire` find it |
| a shell element urui owns | the arm in `urui-shell.hoon`, the `elements` map in the runtime, a css rule in the right section, and a `test-shell-*` arm |

**Hazards.** A new kind without its slots persists nothing; with a
mismatched view name (`{kind}-files`) the tree never renders and nothing
throws. `++explorer-panels` labels trees positionally, so list
`permanent-views` in the same order as `kinds`.

---

## 5. Add or change an HTTP/Clay operation or transport field

**Files:** `sur/urui.hoon` `$endpoints` → `++endpoints-json` →
`clayFileRequest` in `++files` → the consumer's agent routes → the consumer's
`gviz-clay`-style wrapper over `lib/urui-clay.hoon`.

The four operations (`browse`, `load`, `save`, `delete`) are hard-coded in the
runtime; a fifth needs a mold field, an emitter row, a request function, and a
route on every consumer.

**Hazards.** `%header` and `%body` are not interchangeable at the agent: one
reads headers, the other parses a json body. Only the Node doubles suite
exercises `%body` — no real consumer and no browser test does, so treat any
`%body` change as unverified until you add coverage. The 409-then-confirm
retry and the save-time "changed in Clay" comparison both depend on `load`
answering the exact stored bytes.

---

## 6. Add or change a persisted slot or storage version

1. Decide the owner. `%app` slots are entirely the consumer's:
   `options.session.read` / `.validate`, applied by the consumer after
   `session.load()` returns the record.
2. A `%urui` slot only works if `readSlot` and `loadSession` know its **exact
   key**. A new urui slot key with no case falls through to `default:` and is
   round-tripped unvalidated.
3. Keep the key stable. The key is what is already on disk; renaming it
   silently drops that value for every existing user.
4. Bump `storage-version` only when a record cannot be read forward —
   `loadSession` discards a mismatched record whole, and `++theme-bootstrap`
   ignores it too, so the first paint loses the saved theme.

**Hazards.** `%tabs` slots need their `%active` and `%next` companions;
`highestId` recovers a counter from ids, so a hand-edited record cannot
collide. Migration code does not exist anywhere in urui: the only strategies
are "keep the key" or "discard by version".

---

## 7. Add a css section or change DOM/CSS coupling

**Files:** `+$section` (closed union) → the new arm → `++compose`'s `?-` →
every consumer's `(compose ...)` list → `test-sections-cover-shared-rules`.

`?-` is exhaustive, so a new section is a compile error in `++compose` until
handled, but consumers silently keep their old list — they must opt in.

**Hazards.** Selector ownership is not obvious: explorer *tabs* live in
`%tabs`, not `%explorer`. `--editor-width` / `--explorer-width` are declared
in `%tokens` and rewritten inline by the runtime's layout section; renaming
one breaks layout with no error. `%responsive`'s `760px` duplicates
`limits.narrow`. Anything the runtime toggles by class — `collapsed`,
`explorer-collapsed`, `inactive`, `active`, `is-dragging` — must keep working.

---

## 8. Make an intentional breaking change

There is no deprecation mechanism: no version negotiation in the config, no
shim layer, no migration hook. A break is therefore a coordinated edit.

1. Enumerate readers before editing: `rg` the Hoon field, the json key, the
   DOM id, and the storage key across `desk/` and every consumer you know of.
2. Change urui and every consumer in one change set.
3. If the break touches storage, decide explicitly between keeping the old key
   and bumping `storage-version` (workflow 6).
4. If it touches the wire, both sides must land together — a page served from
   a cached asset will talk to a new agent.
5. Record the break where the next reader will look: the arm's doc comment,
   and the consumer's release notes.

State plainly, in the summary you give the user, which consumers you could not
inspect. urui has no registry of them.
