# urui API overview

Recorded 2026-09-11. A short orientation to the public surface, the entry
points, and where graph-viz — the first consumer — touches each of them.
The full treatment lives in `.agents/skills/urui-protocol/`:
`references/contracts.md` for exact fields, `references/architecture.md` for
ownership and order.

Line references to graph-viz are against its `dev` branch.

## API surface

- **Hoon data contract** — `desk/sur/urui.hoon`: `$app-config` (identity,
  kinds, endpoints, limits, slots, shortcuts, statuses, docs-root,
  share-param, permanent-views, ace-spec) and `$shell-spec` (= app-config
  plus the `brand`, `toolbar`, `areas`, `help`, `dialogs`, `styles`, and
  `scripts` marl slots).
- **Emitted JSON** — `urui-config.hoon` turns that into
  `window.URUI_CONFIG` with camelCase keys; a `(unit)` becomes `null` and a
  `@ud` becomes a number with `scot`'s dots stripped. The json key names,
  not the Hoon field names, are what the browser and the tests bind to.
- **Sail DOM** — `urui-shell.hoon` emits the frame and every id the runtime
  binds: `#workbench`, `#workspace`, `#splitter`, `#explorer-*`,
  `{view}-tab`/`-panel`/`-tree`, `{kind}-document-tabs`, `#help-panel`,
  `#clay-error-*`, `#file-context-*`. `data-role` locates the three panes.
- **`window.urui`** — the frozen facade: `config`, `boot(hooks)` (once
  only), `runtime(options)`, `editor.adapter(host, options)`, plus the
  dispatch groups `tabs`, `explorer`, `session`, `files`, `shortcuts`,
  `layout`, `problem`, `status`, `dialog`. **The groups implement
  nothing** — they forward to the consumer's hook object. Only
  `dialog.confirm` and `dialog.prompt` carry fallbacks.
- **`createRuntime(options)`** — the actual machinery: tab stores, explorer
  views, docs and ref tabs, the Clay file tree, session persistence, Clay
  requests, shortcut dispatch, theme, layout, and dialogs. It returns a
  large **unfrozen, internal** object: `runtime.tabs`, `.theme`, `.layout`,
  `.explorer`, `.session`, `.dialogs`, `.files`, `.shortcuts`, `.wire`.
- **`createAceEditorAdapter(host, {assets, mode, platform, label, …})`** —
  an absolute-offset editor API. `setTheme`, `refresh`, and `isFocused` are
  the three the runtime itself calls.
- **Wire** — four POST operations (`browse`, `load`, `save`, `delete`),
  `{kind}` substituted into the route, `%header` or `%body` transport, and
  a `409` that prompts a confirm and retries once with the overwrite flag.
- **Storage** — one localStorage record keyed by `storageKey` and
  `storageVersion`, described slot by slot. urui's own slots are matched by
  **exact key string**, not by shape alone.
- **CSS** — seven composable sections; the consumer chooses the cascade
  order and welds its own rules last.

## Entry points

**Hoon, at build time**

| Call | Produces |
| --- | --- |
| `build:urui-shell` | the page |
| `emit:urui-config` | the `window.URUI_CONFIG` assignment |
| `compose:urui-css` | the stylesheet |
| `config-js:urui-ace` | the Ace loader script |
| `core:urui-js` | urui's half of the application bundle |
| `respond` / `asset-route` / `require-auth` in `urui-http` | eyre payloads |
| `file-path` / `browse-path` / `browse-json` in `urui-clay` | Clay paths and browse json |

**Browser, at run time, in this order**

1. the inline `theme-bootstrap` script (theme before first paint)
2. the `window.URUI_CONFIG` assignment
3. the `core` IIFE, which publishes `window.urui`
4. `urui.runtime(...)`
5. `urui.editor.adapter(...)` per editor
6. `runtime.wire()`
7. `runtime.session.load()`
8. seed tabs, apply the consumer's own slots, `runtime.session.queue()`
9. `runtime.shortcuts.register(...)` per configured command
10. `urui.boot(hooks)` — **last**

## Where graph-viz calls in

**Hoon**

- `desk/lib/gviz-web.hoon:3-5` imports `urui-shell`, `urui-css`,
  `urui-ace`, `urui-config`, `urui-js`; `:115` `build:shell`; `:565`
  `config-js:uace`; `:570` `compose:ucss`; `:841-842` `(emit:ucfg config)`
  then `core:ujs` then its own `app-js`.
- `desk/lib/gviz-clay.hoon:1-19` — a thin wrapper pinning
  `/data/graph-viz` over `urui-clay`.
- `desk/app/graph-viz-web.hoon:5, 26, 108, 112` — `respond:uhttp` and
  `asset-route:uhttp`. It does **not** use `require-auth`; it inlines its
  own 401 at `:114`.

**JavaScript** (all inside `++app-js` of `gviz-web.hoon`)

| Line | Call |
| --- | --- |
| 964-965 | `window.urui.config`, `window.urui.runtime({...})` |
| 1163 | `window.urui.editor.adapter` |
| 1194-1215 | tab store aliases — `runtime.tabs.*` for `dot` and `svg` |
| 1272, 1458-1486 | theme, dialog, and session aliases |
| 2703-2704 | `runtime.files.save` |
| 2758 | `runtime.shortcuts.register` for its five chords |
| 2889 | `runtime.wire()` |
| 2982 | `runtime.layout.apply()` |
| 2994-3019 | session restore |
| 3032 | `window.urui.boot({...})` — last |

The shape to notice: graph-viz reaches for the **runtime object** for
everything it drives, and uses `urui.boot` only to publish its own
implementations back through the facade.
