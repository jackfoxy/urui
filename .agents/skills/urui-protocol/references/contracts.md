# Contract inventory

Column key: **Hoon** = the mold field in `sur/urui.hoon`; **json** = the key
`lib/urui-config.hoon` emits; **read by** = the function or banner in
`lib/urui-js.hoon` (or the arm in another lib) that consumes it.

## 1. `$app-config`

| Hoon | json | Emitter arm | Read by | Effect |
| --- | --- | --- | --- | --- |
| `app-id.name` | `appId.name` | `++app-id-json` | `++compact` only, as `data-app` | nothing reads it in urui |
| `app-id.title` | `appId.title` | ″ | `<title>`; docs tab label cleanup | |
| `app-id.base` | `appId.base` | ″ | `loadDocsTree` fetches `${base}/doc.toc` | also the consumer's own route prefix |
| `app-id.storage-key` | `appId.storageKey` | ″ | `++theme-bootstrap`, persistence banner | the localStorage key |
| `app-id.storage-version` | `appId.storageVersion` | ″ | ″ | a record whose `version` differs is discarded whole |
| `kinds` | `kinds` | `++doc-kind-json` | document-tabs banner, files banner | one tab store per entry |
| `endpoints` | `endpoints` | `++endpoints-json` | `clayFileRequest` | §3 |
| `limits` | `limits` | `++limits-json` | §4 | |
| `slots` | `slots` | `++slot-json` | persistence banner | §5 |
| `shortcuts` | `shortcuts` | `++shortcut-json` | `dispatchShortcut` | §6 |
| `statuses` | `statuses` | `++status-json` | `setStatus`; `++initial-status` | name → label map |
| `docs-root` | `docsRoot` | `++unit-text-json` (`~` → json null) | documentation banner | prefixes the iframe src of a docs leaf **only** |
| `share-param` | `shareParam` | `++share-json` | shared-source banner | absent ⇒ `decodeSource` throws |
| `permanent-views` | `permanentViews` | `++view-json` | explorer banner | empty ⇒ compact frame, no explorer |
| `ace-spec` | `ace` | `++ace-json` | `++config-js:urui-ace` only | the runtime never reads it |

`++number` emits `@ud` with `scot`'s dot separators stripped — json numbers
cannot carry them. A `(unit @t)` becomes json `null`, never an empty string.

`statuses` is positional in one place: `++initial-status:urui-shell` renders
the **first** entry's label in the editor pane and the **third** in every
other pane. Fewer than three entries silently collapses to the first.

## 2. `$doc-kind`

| Field | json | Used for |
| --- | --- | --- |
| `name` | `name` | store key, tab-id prefix, `{kind}` in routes, `{kind}-document-tabs`, `{kind}-files`, `#save-{kind}` |
| `label` | `label` | prompts, confirms, tree aria-label, fallback strip label |
| `untitled` | `untitled` | label for a tab with no path |
| `ext` | `ext` | the suffix shown in a tab label |
| `leaf` | `leaf` | the Clay extension actually stored; `tabLabel` turns `left/txt` into `left.dot` when the last segment equals `leaf` |
| `mime` | `mime` | nothing in urui — for the consumer's HTTP response |
| `tabs` | `tabs` | whether `++document-strip` emits a strip |
| `refs` | `refs` | whether an Add Ref control is enabled (`#add-{kind}-ref`) |

`ext` and `leaf` differ whenever a mark is reused: DOT stored as `%txt`,
labelled `.dot`.

## 3. `$endpoints` and the wire

Routes take `{kind}`, replaced with the kind name. Every request is `POST`;
the response body is read as text.

| `transport` | Path travels as | Body | Overwrite flag |
| --- | --- | --- | --- |
| `%header` | `path-header` header (omitted for a root browse: empty path + `browse`) | raw source, `text/plain; charset=utf-8`, absent for `browse` | `flag-header: 'true'` |
| `%body` | json `path` array of segments (`[]` for root) | `{"path": [...], "source": "...", "overwrite": bool}`, `application/json` | `overwrite` field |

| Response | Meaning to the runtime |
| --- | --- |
| 2xx | body is the result: file text for `load`, the browse json for `browse`, anything for `save`/`delete` |
| 409 on `save` without `overwrite` | prompts `confirm`, retries once with the flag set |
| any other non-2xx | throws with the response body, or `Clay request failed (<status>)` |

`browse` must answer `{"file": <bool>, "children": ["name", ...]}` —
`++browse-json:urui-clay` builds exactly that. `browseClayNode` recurses over
`children`, rejecting any child that is empty or contains `/`.

Client-side paths pass `normalizeClayPath`: leading slashes stripped, no empty
/ `.` / `..` segments, and `^[A-Za-z0-9._~/-]+$`. Server-side,
`++relative-path:urui-clay` repeats the check in Hoon with `stab`, and
`++file-path:urui-clay` appends the first extension unless an allowed one is
already present. Neither side trusts the other.

Auth is entirely the consumer's: `++require-auth:urui-http` exists and is
tested, but **neither existing consumer calls it** — both inline their own
401. Treat it as available, not as the established pattern.

## 4. `$limits`

| Field | json | Default in JS | Used by |
| --- | --- | --- | --- |
| `render-debounce` | `renderDebounce` | — | **nothing in urui**; emitted for the consumer |
| `save-debounce` | `saveDebounce` | 150 | `queueSaveSession` |
| `min-explorer` | `minExplorer` | 180 | explorer width clamp |
| `divider` | `divider` | 10 | `maxExplorerWidth` |
| `pane-min` / `pane-max` | `paneMin` / `paneMax` | 25 / 70 | `--editor-width` clamp, percent |
| `narrow` | `narrow` | 760 | `matchMedia` in the runtime — **duplicated** as a literal `760px` in `++responsive:urui-css`; change both |
| `max-source` | `maxSource` | 262144 | `validateSource`, every load/save/session/share path |

## 5. Session record and slots

One localStorage record: `{version: storageVersion, ...slots}`. A slot key
containing `.` writes a nested object (`preferences.theme`).

| `owner` | Read on save | Validated on load |
| --- | --- | --- |
| `%urui` | `readSlot`, by `kind`+`shape` then by **exact key** | per-key rules below |
| `%app` | `options.session.read(key)` | `options.session.validate(key, raw)`; result handed back in the returned record, never applied |

| `shape` | With `kind` | Without `kind` |
| --- | --- | --- |
| `%tabs` | the kind's tab list; each entry must match `{kind}-{n}`, carry a valid source and path, and be unique by id and by path; `options.tabs[kind].validate(candidate, base, seen)` may extend or veto | only the literal keys `docsTabs` and `refTabs` are recognised |
| `%active` | the kind's active id; kept only if it is one of the accepted ids, else the first tab | — |
| `%next` | the kind's counter, raised to `highestId(tabs)` | `nextDocs` / `nextRef`, same rule |
| `%scalar` | — | dispatched by key: `paneWidth` (clamped), `explorerWidth` (floored), `explorerOpen` (anything but `false` is open), `explorerView` (must be an available view), `explorerOrder` (filtered and completed), `preferences.theme` (`validTheme`) |
| `%record` | — | no urui meaning; for `%app` slots |

A `%urui` slot whose key is not in that list falls through to `default:` and
is stored and restored verbatim, unvalidated. Document tabs are validated
first because `%active` and `refTabs` point at their ids.

Order of restoration inside `loadSession`: document tabs → docs tabs → ref
tabs → everything else → `applySession` (urui's keys only) → return the whole
record.

## 6. Shortcuts

`config.shortcuts` entries are `[binding command when]`. Binding is parsed by
lowercasing and splitting on `-`: the last part is the key, `ctrl`/`meta` are
one primary modifier, `shift` and `alt` must match exactly.

| `when` | True when |
| --- | --- |
| `%always` | always |
| `%editor` | an adapter reports `isFocused(target)` |
| `%no-editor` | no adapter does |
| `%preview` | `options.shortcuts.preview(event)` returns true — consumer-defined, independent of Ace focus |

Dispatch is capture-phase on `document`. `Escape` is handled before any
binding, in order: help panel → Clay error modal → context menu. A binding
with no registered handler is skipped and the event continues. If nothing
matched and focus is not in an editor, `options.shortcuts.onKeydown(event)`
runs; returning `true` consumes the event.

## 7. `$shell-spec`, areas, and the DOM

`$shell-spec` = `$app-config` + `brand`, `toolbar`, `areas`
(`reference`/`editor`/`result`), `help`, `dialogs`, `styles`, `scripts`. Every
marl slot is spliced without interpretation.

`$area`: `role` (`%reference`/`%editor`/`%result`) becomes `data-role` — the
runtime finds panes with it; `id`, `label`, `heading`, `status-id`, `kind`
(names the `$doc-kind` for the tab strip and the `{kind}-source-heading` id),
`strip`, `controls`, `body`, `secondary` (an `$editor` → `.editor-host`).

Ids the runtime queries. **urui emits** unless marked:

| Id | Emitted by | Missing ⇒ |
| --- | --- | --- |
| `#workbench`, `#workspace`, `#splitter` | `++full` | layout arms throw on first use |
| `#explorer-resizer`, `#explorer-collapse` | `++full`, `++explorer` | `applyExplorerLayout` throws |
| `#explorer-tabs` | `++explorer` | tab queries return `[]`; `setExplorerView(…, true)` throws on focus |
| `{view}-tab` / `-panel` / `-tree` | `++explorer-tabs`, `++explorer-panels` | that view silently does nothing |
| `{kind}-document-tabs` | `++document-strip` | tabs never render (guarded) |
| `#help-panel`, `#close-help` | `++help-panel` | help arms throw |
| `#clay-error-modal`, `#clay-error-message`, `#close-clay-error` | `++error-dialog` | every error path throws instead of showing |
| `#file-context-menu`, `#file-context-open`, `#file-context-delete` | `++context-menu` | guarded, menu disabled |
| `#theme`, `#help` | **consumer** toolbar | theme falls back to `data-theme`; help never opens |
| `#fallback-help-content`, `#docs-help-content`, `#docs-help-nav` | **consumer** help marl | docs nav silently absent |
| `#browse-{kind}`, `#load-{kind}`, `#save-{kind}`, `#add-{kind}-ref` | **consumer** controls | that control is simply not wired |

`options.elements` is merged over the map after the queries, so a consumer can
supply or replace any node — including `editorStatus` / `resultStatus`, which
`statusNode` prefers over its `.status, .pane-status` fallback.

Two structural quirks: a tall-attribute Sail element must have children, so
`++document-strip` and `++secondary-host` emit a hidden `<span>`; and
`++section` (compact) and `++workspace-area` (full) emit *different* pane
markup for the same `$area`.

## 8. `window.urui`

Frozen; each group frozen individually. `boot` may be called once.

| Member | Implemented by | Fallback |
| --- | --- | --- |
| `config` | urui: frozen `window.URUI_CONFIG` | `{}` |
| `boot(hooks)` | urui: installs hooks, calls `hooks.onReady(api)` | throws on a second call or a non-object |
| `runtime(options)` | urui: `createRuntime` | — |
| `editor.adapter(host, options)` | urui: `createAceEditorAdapter` | — |
| `status(...)`, `tabs.{create,close,select,update,list,active}`, `editor.{primary,secondary}`, `explorer.{show,refreshTree,addRef,openDocs}`, `session.{save,queue,get,set}`, `files.{browse,load,save,delete}`, `shortcuts.register`, `layout.{paneWidth,explorerWidth}`, `problem.{show,clear}` | **the consumer's hook object** | absent hook ⇒ `undefined` |
| `dialog.help`, `dialog.error` | consumer hook | `undefined` |
| `dialog.confirm`, `dialog.prompt` | consumer hook | `window.confirm` / `window.prompt` when the hook returns `undefined` |

The facade is a dispatch table, not an implementation. `urui.tabs.create` does
nothing unless the consumer implemented `hooks.tabs.create` — usually by
delegating to `runtime.tabs.create`.

## 9. `createRuntime(options)`

| Option | Read at | Contract |
| --- | --- | --- |
| `elements` | shell-frame banner | merged over the queried node map |
| `editors` | `editors()` | array or function returning one; each item may implement `refresh`, `setTheme`, `isFocused` |
| `onChange` | `changed()` | replaces the queued session save entirely |
| `onTheme(effective, selected)` | `applyTheme` | after every theme change |
| `onHelpOpen()` | `setHelpOpen` | before help takes focus |
| `onTabsRendered(name)` | `renderTabs` | after a strip re-renders |
| `onResize()` | `wire` | on window resize, before editors refresh |
| `tabs[kind]` | document-tabs banner | `defaults`, `dirty`, `onCapture`, `onActivate`, `afterActivate`, `onClose`, `empty`, `add`, plus `validate` used by session load |
| `files[kind]` | Clay files banner | `validate`, `canSave`, `status`, `loaded`, `saved`, `error` |
| `session` | persistence banner | `read(key)`, `validate(key, raw)` for `%app` slots |
| `shortcuts` | shortcuts banner | `preview(event)`, `onKeydown(event)` |

Unknown options are ignored; a misspelled one is a silent no-op.

## 10. The runtime object

Internal but the real working surface. Groups: `elements`, `clamp`,
`refreshEditors`, `files`, `shortcuts`, `tabs`, `theme`, `status`, `layout`,
`explorer` (with `docs`, `refs`, `tree`, `context`), `session`, `dialogs`,
`wire`. Read the `// ---- the runtime object ----` banner at the end of
`++runtime` for the exact members — it is unfrozen and unversioned, so cite
the banner rather than memory.

Note `runtime.files.browse` is `refreshFileTree`, not the raw browse request,
and `runtime.tabs.setList`/`explorer.docs.setList` splice in place because a
consumer may hold the array by reference.

## 11. `createAceEditorAdapter(host, options)`

Throws if `window.ace` is missing, if `options.assets` is absent, or if the
Beautify extension did not load — a consumer is expected to catch and show
its own `#editor-load-error`.

| Option | Effect |
| --- | --- |
| `assets` | **required**; the frozen object `++config-js:urui-ace` publishes at `window[ace-spec.global]` |
| `mode` | overrides `assets.mode` |
| `platform` | overrides Ace's keyboard platform (`win` / `mac`) |
| `label`, `labelledBy`, `describedBy` | accessible name and description on the hidden textarea |

The adapter returns `getSource`, `setSource`, `replaceRange`, `getSelection`,
`setSelection`, `selectRange`, `offsetToPosition`, `positionToOffset`,
`focus`, `onChange` (returns an unsubscribe), `isFocused`, `setDiagnostic`,
`setTheme`, `refresh`. `setTheme`, `refresh`, and `isFocused` are the three the
runtime itself calls, so anything passed as `options.editors` must implement
them.

Per-call option records are separate: `setSource(source, {history, selection,
notify})` where `history` is `undoable` (the default) or `reset` and any other
value throws, `replaceRange(start, end, text, {selection, notify})` where
`selection` is a range object, `'select'`, `'start'`, or omitted (cursor after
the replacement), and `selectRange(start, end, {focus, reveal})`. All offsets
are absolute character offsets, converted to Ace rows internally. A mutation
suppresses Ace's own change events and then fires the adapter's listeners
once, unless `notify` is exactly `false`.

## 12. CSS sections

`++compose` welds the named sections in the order given; `+$section` is the
closed set `%tokens %shell %explorer %tabs %dialogs %controls %responsive`.

| Section | Owns |
| --- | --- |
| `%tokens` | every custom property on `:root` and the `data-effective-theme='dark'` override, including `--editor-width` and `--explorer-width` |
| `%shell` | reset, header/toolbar, workbench and workspace grids, panes, status, splitter, state panel, `.sr-only` |
| `%explorer` | the aside, panels, file-tree rows, resizer, context menu |
| `%tabs` | all three strips: explorer, docs, document |
| `%dialogs` | help panel and card, docs nav; the Clay modal reuses `.help-card` |
| `%controls` | base button/select/input metrics, theme control, icon buttons, drawn icons |
| `%responsive` | the single `max-width: 760px` query |

Ordering rules, from the core header: `%controls` before the component
sections so equally specific selectors can override base control dimensions;
`%responsive` last; consumer rules welded after all of them.

Known leak, not yet fixed: `%shell` contains three `#dot` rules — graph-viz's
editor host id. `bin/check-purity.sh` greps `dot-language`, not bare `dot`, so
the gate does not catch it.

## 13. Documentation panel

Three different sources, easy to conflate:

| Step | Source | Failure |
| --- | --- | --- |
| availability probe | a hard-coded `GET /docs` on the same origin, requiring `text/html` | any failure ⇒ `disableDocsExplorer()`: docs tabs cleared, help shows the consumer's `#fallback-help-content` |
| table of contents | `GET ${config.appId.base}/doc.toc`, requiring `text/plain` | not ok ⇒ the same fallback |
| a leaf page | an iframe at `config.docsRoot + path` | none; the frame just fails to load |

`doc.toc` is an indented `/slug title` list: two spaces per level, one level
of nesting, slugs matching `[A-Za-z0-9._~-]` with at most two segments.
Malformed lines are skipped silently by `parseDocsToc`.
