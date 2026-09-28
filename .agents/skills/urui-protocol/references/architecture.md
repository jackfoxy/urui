# Architecture: ownership, order, and flow

Every claim here is traceable to a file and a named arm, section banner, or
function. Verify before relying on it; `lib/urui-js.hoon` is a Hoon core of
cords wrapping several thousand lines of emitted JavaScript, organised by
`// ---- name ----` banners inside the `++runtime`, `++shortcuts`, and
`++documents` arms.

## 1. Ownership map

| Surface | Owner | Where |
| --- | --- | --- |
| `$app-config`, `$shell-spec`, and every mold they nest | urui | `sur/urui.hoon` |
| The json key names in `window.URUI_CONFIG` | urui | `++config-json` and its per-record arms, `lib/urui-config.hoon` |
| Document frame, pane sections, bands, reveal toggles, depth-0 tab strips, resizers, settings modal, help panel, file context menu | urui | `++build`, `++full`, `++compact`, `++pane`, `++band-nodes`, `lib/urui-shell.hoon` |
| A store's heading actions and view toggle, its editor host, load-error notice, and preview host; the file dialog, confirm dialog, and toast | urui | `++store-actions`, `++panel-band`, `++store-hosts`, `++document-dialogs`, `lib/urui-shell.hoon` |
| Brand, toolbar, head extras, heading actions, controls and panel marl, help content, extra dialogs | consumer | marl slots in `$shell-spec` and its bands |
| `window.urui` (frozen facade) | urui | `++core`, `lib/urui-js.hoon` |
| What `window.urui.tabs/editor/explorer/session/files/…` *do* | consumer | the hook object passed to `urui.boot` |
| Panes and tab levels, explorer views, docs and ref tabs, session record, shortcut dispatch | urui | `++runtime` + `++shortcuts`, `lib/urui-js.hoon` |
| Document stores: tabs, labels, dirtiness, editors, files, tree, file dialog, conflicts, previews, references, toast | urui | `++documents`, `lib/urui-js.hoon` |
| Domain reactions to a document switch, app fields on a tab, previewers for app marks | consumer | `options.documents[store]`, `runtime.documents.previews.register` |
| Ace adapter mechanics | urui | `++editor-adapter`, `lib/urui-js.hoon` |
| Ace vendored asset routes and the `global` window property | consumer | `$ace-spec`, served by the consumer's agent |
| Shared css sections and their contents | urui | `lib/urui-css.hoon` |
| Cascade order and any application rules | consumer | the `(compose ...)` call and its own css |
| File wire: request validation, path policy, codecs, verified Clay writes, error envelope | urui | `lib/urui-files.hoon` (`++handle`, `++write`, `++take`) |
| The file route, its auth check, the file root, `strict`, extra codecs, the agent's `pending` state | consumer | its Gall agent, calling `urui-files` |

## 2. Build order, in Hoon

A consumer's web lib composes the page, the css, and the javascript. Order
inside `++javascript` is a hard requirement:

```hoon
++  javascript
  %+  rap  3
  :~  (emit:ucfg spec)     ::  window.URUI_CONFIG = {...}
      core:ujs             ::  defines window.urui, reads URUI_CONFIG once
      app-js               ::  the consumer: runtime, hooks, boot
  ==
```

`++core` captures `window.URUI_CONFIG` into `api.config` at definition time,
so the config assignment must precede it. `core:ujs` already contains the
runtime, the shortcuts, the documents module, and the Ace adapter.

The page comes from `(build:shell spec)`. `++has-views` picks the frame: a
reference pane whose `%tabs` band carries a `%views` level gets `++full`
(explorer aside, workspace, both resizers, settings, help, context menu);
anything else gets `++compact`. With `files` set, `++document-dialogs` adds
the file dialog, confirm dialog, and toast. `++compact` is presentation
only: a spec with `files` set and no `%views` level crashes in `++build`.
Both frames append `head` marl (favicon, meta) after the styles.

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

Both consumers follow these constraints; the exact placement of `boot`
differs (Obelisk calls it last, Graph Viz runs its startup inside `onReady`).

| Step | Call | Why here |
| --- | --- | --- |
| 1 | `const runtime = window.urui.runtime({...})` | builds the element map, panes, and stores; `options.documents` hooks are read later, so they may name functions defined below |
| 2 | `runtime.wire()` | attaches every listener: capture-phase keydown, store actions and view toggles, theme, help, settings, context menu, drags, resize |
| 3 | `runtime.session.load()` | validates the stored record, applies urui's slots (store tabs included), returns the whole record so the consumer can read its own |
| 4 | `runtime.documents.start()` once | mounts each store's editor, adds a shared-link tab, gives every store a tab, shows each active one (`activate` with `restore: true`), and browses the trees |
| 5 | `docs.editor(store)` | the adapter urui mounted, or a stand-in if Ace failed; bind domain `onChange` listeners here |
| 6 | `runtime.shortcuts.register(command, handler)` | an unregistered command is skipped; urui registers `open:{store}`, `save:{store}`, `save-as:{store}` itself |
| 7 | `window.urui.boot(hooks)` once | a second call throws `urui.boot called more than once`; it installs the hook table and calls `onReady(api)` synchronously |

Before `boot`, every `window.urui.*` dispatch method returns `undefined`
(`invoke` finds no hook), except `config`, `runtime`, `editor.adapter`, and
`dialog.confirm`/`dialog.prompt`, which fall back to `window.confirm` and
`window.prompt`.

## 5. Data and event flow

```
$app-config ──emit:urui-config──> window.URUI_CONFIG ──> createRuntime
                                                          │
$shell-spec ──build:urui-shell──> DOM (ids, data-role) ───┤
                                                          ▼
user event ──> runtime listener ──> runtime / store state ──> DOM + localStorage
                                          │
                                          └──> options.documents[store].* ──> consumer
store file op ──fetch json──> config.files.url ──> agent ──handle:urui-files──> Clay
Clay sign ──> agent on-arvo ──take:urui-files──> http response ──> store
consumer ──> runtime.documents.* / runtime.<group>.* ──> runtime state
consumer ──> window.urui.<method> ──> installed hook ──> consumer
```

Two consumer seams, easy to confuse:

- **`options.*`** (passed to `createRuntime`): urui calling *out* to the
  application — domain hooks per store, pane callbacks, session slots.
- **`hooks.*`** (passed to `urui.boot`): the application's implementation of
  `window.urui.*`, for code that only has the facade — test harnesses, other
  scripts on the page. urui itself never calls these.

## 6. Naming invariants the runtime resolves literally

| Pattern | Built by | Resolved by |
| --- | --- | --- |
| `{pane}-{band}`, `{pane}-{band}-toggle` | `++band-nodes`, `++band-toggle` | panes banner, `wire` |
| `{pane}-{level}-tabs` (depth-0 strip) | `++tab-strip`, `++strip-id` | `stripFor`; a store's strip via `tabContainer` |
| `{view}-tab`, `{view}-panel`, `{view}-tree` | `++explorer-tabs`, `++explorer-panels` | `setExplorerView`; a store tree via `docRefreshTree` (`#${tree.view}-tree`) |
| `{store}-{action}`, `{store}-display`, `{store}-preview` | `++store-actions`, `++store-hosts` | `documentsWire`, `docApplyActions`, `docApplyDisplay` |
| `{host}-load-error` | `++store-hosts` | `docMount` |
| `{kind}-source-heading` (editor pane with a kind and a title) | `++heading-band` | `docMount` labels the host with it |
| `urui-file-dialog…`, `urui-confirm…`, `urui-toast…` | `++file-dialog`, `++confirm-dialog`, `++toast` | `docFileDialog`, `confirmDialog`, `notify` |
| `{store}-{n}` tab ids, `docs-{n}`, `ref-{n}` | `docCreate`, docs and ref sections | `idPattern` on session load |
| urui slot keys (`paneWidth`, `explorerView`, `refTabs`, `fileTrees`, …) | consumer `slots` | `readSlot` / `loadSession`, by exact key |

A `%documents` tab level's `kind` must name a store in `config.files.stores`;
any other `kind` gives an empty level. A `$tree`'s `view` must be one of the
`%views` level's `fixed` names, or its tree has no element to render into.

## 7. Public, seam, or internal

| Tier | What | Stability |
| --- | --- | --- |
| **Public data contract** | every mold in `sur/urui.hoon`; the json keys `urui-config.hoon` emits | changing a key breaks every consumer and every saved record that stores it |
| **Public browser api** | `window.urui`: `config`, `boot`, `runtime`, `editor.adapter`, and the frozen dispatch groups | frozen object; groups frozen individually |
| **Consumer seam (in)** | `createRuntime` options (`documents`, `refs`, `panes`, `session`, `shortcuts`, …); the hook object given to `boot` | additive is safe; a misspelled option is a silent no-op |
| **Consumer seam (out)** | `runtime.documents` (`start`, `create`, `update`, `select`, `open`, `save`, `pickPath`, `previews`, `trees`, …), `runtime.notify/confirm/copy` | documented at the `++documents` banner and the design report |
| **DOM coupling** | every id in §6 plus `#workbench`, `#workspace`, `#splitter`, `#explorer-*`, `#settings*`, `#help-panel`, `#close-help`, `#file-context-*`, and the consumer-supplied `#help`, `#fallback-help-content`, `#docs-help-content`, `#docs-help-nav` | a missing id is usually silent: `?.` guards make the feature disappear rather than throw |
| **Wire contract** | the json ops, the error envelope and its codes, the `hash` token | shared between `++documents` and `urui-files`; both land together |
| **Storage contract** | `storageKey`, `storageVersion`, slot keys, per-shape validation | a version bump discards every stored record; there is no migration |
| **Internal** | everything else in the object `createRuntime` returns, emitted function names, css selector internals | unfrozen and unversioned |
