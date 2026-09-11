---
name: urui-protocol
description: Work on the urui shell protocol inside an application desk that has copied urui's sources in — `sur/urui.hoon` and `lib/urui-{shell,css,js,config,ace,clay,http}.hoon` — to inspect, integrate, extend, debug, or change its contracts. Covers `$app-config`/`$shell-spec`, the emitted `window.URUI_CONFIG` json, the Sail DOM the runtime binds by id, the frozen `window.urui` facade and its hook table, `createRuntime`/`createAceEditorAdapter` options, the Clay/HTTP file wire, and the persisted session record. Not for Graphviz layout, DOT parsing, an application's own rendering logic, or generic browser work that crosses no urui boundary.
---

# urui protocol

urui is not a dependency you call — it is **source your desk contains**. Eight
files carry the whole shared shell:

| File | What it owns |
| --- | --- |
| [sur/urui.hoon](../../../desk/sur/urui.hoon) | the public data contract, as molds |
| [lib/urui-config.hoon](../../../desk/lib/urui-config.hoon) | `$app-config` → `window.URUI_CONFIG` json |
| [lib/urui-shell.hoon](../../../desk/lib/urui-shell.hoon) | the Sail document and every DOM id the runtime binds |
| [lib/urui-js.hoon](../../../desk/lib/urui-js.hoon) | `window.urui`, `createRuntime`, `createAceEditorAdapter` |
| [lib/urui-css.hoon](../../../desk/lib/urui-css.hoon) | composable stylesheet sections |
| [lib/urui-ace.hoon](../../../desk/lib/urui-ace.hoon) | the emitted Ace loader configuration |
| [lib/urui-clay.hoon](../../../desk/lib/urui-clay.hoon) | Clay path validation and browse json |
| [lib/urui-http.hoon](../../../desk/lib/urui-http.hoon) | asset lookup and eyre payload helpers |

Your application supplies everything else: one `$app-config`, one
`$shell-spec`, the marl slots, the hook object it hands to `urui.boot`, its
own HTTP routes, and its own Gall agent.

## When this applies

Use it when the work crosses one of urui's boundaries: a config field, an
emitted json key, a shell element, a `window.urui` method, a hook, a
`createRuntime` option, a Clay/HTTP file operation, a persisted slot, a css
section, or an Ace adapter behaviour.

Do not use it for the application's own domain logic, for layout or parsing
engines, or for browser work that never touches a urui-owned surface.

## Ground rules

**Dependency direction is one-way: consumer → urui.** Nothing in
`sur/urui.hoon` or `lib/urui-*.hoon` may name your application, its marks, its
vocabulary, or its ids. Application-specific behaviour belongs in your own
lib, in a hook, or in a `config` field urui reads generically.

**Those eight files are upstream copies.** Editing one forks it from the urui
source it was copied from. Change them only when the change genuinely belongs
to the shared shell; otherwise solve it in your own consumer code.

**Read the arm before you assert.** Field names are not the contract. The
runtime dispatches on exact strings — slot keys, view names, element ids — and
names that look generic (`explorerView`, `{kind}-files`, `paneWidth`) are
matched literally in `lib/urui-js.hoon`. Verify in the source, then cite the
file and the arm, section banner, or function name.

**One contract usually lives in four places at once.** A field added to
`sur/urui.hoon` is inert until `urui-config.hoon` emits it, `urui-js.hoon`
reads it, and the consumer sets it. Changing one layer is never sufficient on
its own; find every reader before you change a shape.

**Smallest coherent change, then validate every boundary it crossed.**

## Routing

| Question | Read |
| --- | --- |
| Who owns this behaviour? What runs when? | [references/architecture.md](references/architecture.md) |
| What exactly does this field/id/method/slot do? | [references/contracts.md](references/contracts.md) |
| I need to add or change something | [references/extension-workflows.md](references/extension-workflows.md) |
| How do I prove it works? Something is broken | [references/validation.md](references/validation.md) |

Start at `architecture.md` when the request is vague about ownership; go
straight to `contracts.md` when you already know the surface; read
`extension-workflows.md` before editing any of the eight files.

## Companion skills

Reach for one only when its axis is actually involved — a Hoon compile error,
a mold or nest-fail question, or new Sail markup:

- `hoon-style-guide` — any edit to a `.hoon` file here.
- `hoon-type-system` — mold shape, `^-` casts, nest-fails in `$app-config`.
- `sail-markup` — new or changed markup in `urui-shell.hoon` or a consumer's
  marl slots.
- `hoon-debugging-specialist-assistant` — a compile or runtime failure whose
  cause is not already obvious from the boundary that broke.

None of them know the urui contract; they explain the language, not the
protocol.
