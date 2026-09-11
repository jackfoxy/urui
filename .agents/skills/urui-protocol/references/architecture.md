# Architecture: ownership, order, and flow

Every claim here is traceable to a file and a named arm, section banner, or
function. Verify before relying on it; `lib/urui-js.hoon` in particular is one
Hoon core wrapping ~2,500 lines of emitted JavaScript, and the JavaScript is
organised by `// ---- name ----` banners, not by Hoon arms.

## 1. Ownership map

| Surface | Owner | Where |
| --- | --- | --- |
| `$app-config`, `$shell-spec`, and every mold they nest | urui | `sur/urui.hoon` |
| The json key names in `window.URUI_CONFIG` | urui | `++config-json` and its per-record arms, `lib/urui-config.hoon` |
| Document structure, pane frames, resizers, tab strips, help panel, context menu, Clay error modal | urui | `++full`, `++compact`, `++section`, `++workspace-area`, `lib/urui-shell.hoon` |
| Brand, toolbar, area controls, area bodies, help content, extra dialogs | consumer | marl slots in `$shell-spec` |
| `window.urui` (frozen facade) | urui | `++core`, `lib/urui-js.hoon` |
| Everything `window.urui.tabs/editor/explorer/session/files/shortcuts/layout/problem/status` *does* | consumer | the hook object passed to `urui.boot` |
| Tab stores, explorer views, docs tabs, ref tabs, file tree, session record, Clay requests, shortcut dispatch | urui | `++runtime` + `++files` + `++shortcuts`, `lib/urui-js.hoon` |
| Ace adapter mechanics | urui | `++editor-adapter`, `lib/urui-js.hoon` |
| Ace vendored asset routes and the `global` window property | consumer | `$ace-spec`, served by the consumer's agent |
| Shared css sections and their contents | urui | `lib/urui-css.hoon` |
| Cascade order and any application rules | consumer | the `(compose ...)` call and its own css |
| HTTP routes, auth policy, Clay reads/writes, storage root | consumer | its Gall agent; helpers in `lib/urui-http.hoon`, `lib/urui-clay.hoon` |

**Not owned by anyone yet:** `.pane-title`, `.pane-actions`, `.pane-body`
(emitted by `++section`, the compact frame) and `.editor-host` have no rule in
`lib/urui-css.hoon`. A compact-shell consumer must style them itself.

## 2. Build order, in Hoon

A consumer's web lib composes three assets. Order inside `++javascript` is a
hard requirement:

```hoon
++  javascript
  %+  rap  3
  :~  (emit:ucfg config)   ::  window.URUI_CONFIG = {...}
      core:ujs             ::  defines window.urui, reads URUI_CONFIG once
      app-js               ::  the consumer: runtime, editors, wire, boot
  ==
```

`++core` captures `window.URUI_CONFIG` into `api.config` at definition time,
so the config assignment must precede it. Consumer code must follow both.

The page comes from `(build:shell spec)`, which picks the frame by data:
`permanent-views` empty → `++compact` (three areas, no explorer); non-empty →
`++full` (explorer aside, workbench grid, both resizers, document tab strips,
help panel, context menu, Clay error modal).

## 3. Load order, in the browser

1. `<head>`: charset, viewport, title, then an **inline** script from
   `++theme-bootstrap` — it reads `localStorage[storageKey]`, checks
   `version === storageVersion`, and stamps `data-theme` and
   `data-effective-theme` on `<html>` before first paint. Then the
   `styles` list, in order (absolute path → `<link>`, anything else →
   inline `<style>`; see `++style-tag`).
2. `<body>`: the frame, then the `scripts` list in order. Conventionally Ace
   core, the Ace config script from `++config-js:urui-ace`, themes and
   extensions, then the application bundle last.
3. The bundle runs: `URUI_CONFIG` is assigned, `++core`'s IIFE freezes and
   publishes `window.urui`, then consumer code runs.

## 4. Startup order, in consumer code

Both existing consumers use this sequence; departures from it have specific
consequences.

| Step | Call | Why here |
| --- | --- | --- |
| 1 | `const runtime = window.urui.runtime({...})` | builds the element map and tab stores; must precede anything that touches them |
| 2 | `urui.editor.adapter(host, {assets, ...})` per editor | pass `editors: () => [...]` so adapters can be built after the runtime; an array would capture them before they exist |
| 3 | `runtime.wire()` | attaches every listener: capture-phase keydown, file controls, theme, help, error modal, context menu, resize |
| 4 | `runtime.session.load()` | validates the stored record, applies urui's slots, returns the whole record so the consumer can read its own |
| 5 | seed tabs, apply the consumer's own slots, `runtime.session.queue()` | a restored session only survives if the first state is written back |
| 6 | `runtime.shortcuts.register(command, handler)` per `config.shortcuts` entry | an unregistered command is silently skipped by the dispatcher |
| 7 | `window.urui.boot(hooks)` **last** | one-shot: a second call throws `urui.boot called more than once`; it sets the hook table and calls `onReady(api)` |

Before `boot`, every `window.urui.*` method is a no-op returning `undefined`
(`invoke` finds no hook), except `config`, `runtime`, `editor.adapter`, and
`dialog.confirm`/`dialog.prompt`, which fall back to `window.confirm` and
`window.prompt`.

## 5. Data and event flow

```
$app-config ──emit:urui-config──> window.URUI_CONFIG ──> createRuntime
                                                          │
$shell-spec ──build:urui-shell──> DOM (ids, data-role) ───┤
                                                          ▼
user event ──> runtime listener ──> runtime state ──> DOM + localStorage
                                          │
                                          └──> options.<hook> ──> consumer
consumer ──> window.urui.<method> ──> installed hook ──> consumer
consumer ──> runtime.<group>.<method> ──> runtime state
runtime.files.* ──fetch──> consumer HTTP route ──> Clay
```

Two distinct consumer seams, easy to confuse:

- **`options.*`** (passed to `createRuntime`): urui calling *out* to the
  application when its own state moves.
- **`hooks.*`** (passed to `urui.boot`): the application's implementation of
  `window.urui.*`, for code that only has the facade — test harnesses, other
  scripts on the page. urui itself never calls these.

## 6. Naming invariants the runtime resolves literally

These are string matches in `lib/urui-js.hoon`, not conventions:

| Pattern | Built by | Resolved by |
| --- | --- | --- |
| `{view}-tab`, `{view}-panel`, `{view}-tree` | `++explorer-tabs`, `++explorer-panels` | `setExplorerView`, `treeForKind` |
| `{kind}-files` — a permanent view's name **must** be the kind name plus `-files` | consumer `permanent-views` | `viewForKind` (explorer banner) |
| `{kind}-document-tabs` | `++document-strip` | `tabContainer` (document tabs banner) |
| `{kind}-{n}` tab ids, `docs-{n}`, `ref-{n}` | `createTab`, docs/ref sections | `idPattern` on session load |
| `#browse-{kind}`, `#load-{kind}`, `#save-{kind}` | consumer controls | `wire` |
| `{kind}` inside an endpoint route | consumer `endpoints` | `clayFileRequest` (`replaceAll`) |
| Slot keys `paneWidth`, `explorerWidth`, `explorerOpen`, `explorerView`, `explorerOrder`, `docsTabs`, `nextDocs`, `refTabs`, `nextRef`, `preferences.theme` | consumer `slots` | `readSlot` / `loadSession`, by exact key |

`++explorer-panels` labels each tree from `kinds` **positionally** while the
runtime resolves it **by name**. List `permanent-views` in the same order as
`kinds`, or the label and the tree disagree.

## 7. Public, seam, or internal

| Tier | What | Stability |
| --- | --- | --- |
| **Public data contract** | every mold in `sur/urui.hoon`; the json keys `urui-config.hoon` emits | changing a key name breaks every consumer and every saved session that stores it |
| **Public browser api** | `window.urui`: `config`, `boot`, `runtime`, `editor.adapter`, and the frozen dispatch groups | frozen object; groups frozen individually |
| **Consumer seam (in)** | the hook object given to `boot`; `options` given to `createRuntime` and `createAceEditorAdapter` | additive is safe; a renamed option silently becomes a no-op |
| **Consumer seam (out)** | marl slots, `config.shortcuts` commands, per-kind `options.tabs`/`options.files` hooks, `options.session` | |
| **DOM coupling** | every id in §6 plus `#workbench`, `#workspace`, `#splitter`, `#explorer-*`, `#help-panel`, `#close-help`, `#clay-error-*`, `#file-context-*`, and the consumer-supplied `#theme`, `#help`, `#fallback-help-content`, `#docs-help-content`, `#docs-help-nav` | a missing id is usually silent: `?.` and `?.()` guards make the feature disappear rather than throw |
| **Wire contract** | request shape per `transport`, the browse json `{file, children}`, status codes 409 and non-2xx | shared with the consumer's agent |
| **Storage contract** | `storageKey`, `storageVersion`, slot keys, per-shape validation | a version bump discards every stored record |
| **Internal** | everything in the object `createRuntime` returns, the emitted function names, css selector internals | unfrozen and unversioned; a consumer may use it, but it is not a promise |
