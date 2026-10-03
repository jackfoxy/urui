# urui

Shared browser-UI shell for Urbit productivity applications, in Hoon.

The urui UI framework drives [graph-viz][gv] and [Obelisk][ob]: a
three-pane workbench with a file explorer, document stores and tabs backed
by Clay, an Ace editor host, previews, resizable panes, dialogs, menus,
theming, drag-n-drop, and a session record — with no opinion about what any of it
displays. It is **source only**. There is no installable `%urui` desk and no
production agent here; a consuming application copies urui's files into its
own desk and builds one page from them.

Copy all the desk/files into the targe apps desk/ and point your clanker at
the protocol and debugger skills in .agents/skills/.

[gv]: https://github.com/jackfoxy/graph-viz
[ob]: https://github.com/jackfoxy/obelisk

## What is here

```
desk/
  sur/urui.hoon        the whole public contract, as molds
  lib/
    urui-shell.hoon    the Sail frame, built from a $shell-spec
    urui-css.hoon      composable stylesheet sections
    urui-js.hoon       the browser runtime, as cords
    urui-config.hoon   $app-config -> window.URUI_CONFIG
    urui-ace.hoon      $ace-spec -> the Ace loader script
    urui-files.hoon    the server half of the json file wire (Clay)
    urui-http.hoon     asset lookup and eyre response helpers
  mar/                 js, txt: what the desk needs to ingest the assets
  web/ace/             the single Ace vendoring point
  tests/lib/           unit tests, run inside a staged desk
tests/
  fixture/             %urui-fixture: the consumers urui tests against
  browser/             node doubles suite and Playwright, against the fixture
bin/                   manual sync, verification, fixture staging, digests
```

Nothing in `desk/` names a consumer. The dependency direction is strictly
consumer → urui, and `bin/check-purity.sh` enforces it.

## Quickstart: a consumer

The full contract is in
[`.agents/skills/urui-protocol/references/`](.agents/skills/urui-protocol/references/):
[contracts](.agents/skills/urui-protocol/references/contracts.md) (every
field, json key, DOM id, and runtime call),
[architecture](.agents/skills/urui-protocol/references/architecture.md)
(ownership, build, load, and startup order),
[extension workflows](.agents/skills/urui-protocol/references/extension-workflows.md),
and [validation](.agents/skills/urui-protocol/references/validation.md).
Graph Viz's `lib/gviz-web.hoon` and Obelisk's `lib/obelisk-web.hoon` are
the complete consumers; `tests/fixture/lib/urui-fixture-docs.hoon` is the
smallest.

1. **Sync the sources** into the consumer checkout (below), and import them:

   ```hoon
   /-  urui
   /+  shell=urui-shell, ucss=urui-css, ujs=urui-js
   /+  ucfg=urui-config, uace=urui-ace, ufiles=urui-files, uhttp=urui-http
   ```

2. **Declare the document stores** as a `files:urui`: one store per kind of
   document, each with its Clay roots (scope, marks, whether the user saves
   there), a default display, its file actions, and the explorer trees
   that browse it.

3. **Build one `$app-config`**: the `app-id` (name, title, base url,
   localStorage key and version), `limits`, the session `slots` (urui's
   named slots plus `%app` slots the consumer validates), `shortcuts`,
   `statuses`, the `ace-spec`, the starting `layout`, and `files`.

4. **Build one `$shell-spec`**: that config, the `brand`, `toolbar`, `help`,
   `dialogs`, and `head` marl, the styles and scripts, and three
   `$pane`s — reference, editor, result. A pane is an ordered stack of
   bands (`%tabs`, `%heading`, `%controls`, `%label`, `%panel`); a
   `%tabs` band's levels are `%views` (the explorer), `%documents` (one
   store, by `kind`), `%fixed`, or `%dynamic`. A `%panel` band carries the
   `$editor` host `[id label mode]` its store's Ace editor mounts into.
   A pane is `%read-write` or `%read-only`.

5. **Compose the assets** and serve them:

   ```hoon
   ++  page        (crip (en-xml:html (build:shell spec)))
   ++  css         (rap 3 ~[(compose:ucss sections) app-css])
   ++  javascript  (rap 3 ~[(emit:ucfg spec) core:ujs app-js])
   ```

   The Ace files come from `web/ace/` with the loader from `urui-ace`; the
   agent looks GET routes up with `asset-route:uhttp`.

6. **Serve the file wire** from the agent: build a policy once with
   `(make-policy:ufiles files /data/<app> strict)`, answer the
   authenticated POST route named by `files.url` with `handle:ufiles`, and
   pass `on-arvo` signs to `take:ufiles`.

7. **Boot in the browser**, in `app-js`:

   ```js
   const runtime = window.urui.runtime({documents: {/* domain hooks */}});
   runtime.documents.previews.register('svg', factory);  // optional
   runtime.shortcuts.register('run', run);
   runtime.start((saved) => { /* read the %app slots */ });
   window.urui.boot({onReady() {}, editor: {primary: () => editor}});
   ```

   `runtime.start` wires the frame, restores the session, draws the
   explorer, and starts the stores. urui owns tabs, files, dialogs,
   previews, menus, keyboard, focus, and feedback; the consumer owns
   its domain: rendering, commands, results, and app session fields.

## Ownership and synchronization

| Path | Owner | Consumer treatment |
|---|---|---|
| `desk/sur/urui.hoon`, `desk/lib/urui-*.hoon` | urui | synced regular files |
| `desk/web/ace/` shared assets | urui | synced regular files |
| `tests/browser/doubles/`, Ace shortcut inventory | urui | synced test support |
| `.urui-sync.json` | sync tool | generated: urui revision and checksums |
| consumer app/lib/tests, modes, manifests | consumer | never overwritten |
| `tests/fixture/` | urui test harness | never shipped to consumers |

[`bin/sync-manifest.txt`](bin/sync-manifest.txt) is the authoritative managed
path list. The sync operation copies only those paths and removes only paths
that it managed previously.

Clone urui **beside** the consumer, then sync explicitly:

```bash
bin/sync.sh --dest ../graph-viz
bin/verify-sync.sh --dest ../graph-viz --strict
```

Consumers contain ordinary files and build without the sibling checkout.
There is no watcher or automatic sync. Edit shared files in urui, then sync.

The consumer's `.urui-sync.json` records the urui commit it came from
(`-dirty` when urui had uncommitted changes) and the checksum of every
synced file, so verification reports the revision and tells `in-sync`,
`stale`, `missing`, and `modified-locally` apart. An older checksum-only
file still verifies, with the revision `unrecorded`. `--strict` makes any
drift a failure, and so is a symbolic link in a managed path, above one, or
anywhere in the consumer's `desk/`; add `--all-symlinks` to reject links
anywhere in the checkout. Sync overwrites listed consumer copies, so
inspect local modifications first.

Copy the consumer's `desk/` directly into its mounted desk and `|commit`.
`stage-desk.sh` is needed only to assemble urui's disposable fixture desk.

## Testing

urui is tested through `%urui-fixture`, a disposable consumer that uses every
part of the contract and none of any real application's vocabulary, and
`urui-fixture-docs`, the smallest document-store consumer.

The harness has four layers: `/tests/lib` exercises pure Hoon libraries;
`%urui-fixture` proves the assembled desk and Gall boundary; Node doubles
exercise runtime behavior cheaply; Playwright compiles the same fixture
assets with `vere eval` and runs them in pinned Chromium. `stage-desk.sh` is
only for the fixture desk.

```bash
#  Hoon: the libs and their unit tests, in a disposable test desk.
#  lib/test.hoon and mar/js.hoon are vendored; preserve other ship files.
rsync -rL desk/ <pier>/urui/                # no --delete
#    then in the dojo:  |commit %urui ; -test /=urui=/tests ~

#  Hoon: the fixture desk — urui's libs, the fixture agent, and %base.
#  This one is assembled from three sources, so it needs the staging step.
bin/stage-desk.sh --fixture --base ../graph-viz/desk /tmp/urui-fixture-desk
rsync -rL /tmp/urui-fixture-desk/ <pier>/urui-fixture/
#    then:  |commit %urui-fixture ; -test /=urui-fixture=/tests ~

#  Browser: doubles under node, then real Chromium against the fixture
npm install
VERE=/path/to/vere tests/browser/run.sh
VERE=/path/to/vere tests/browser/run-real.sh

#  Ace Windows/Linux inventory and fixture collision accounting
npm run test:shortcuts

#  Consumer-vocabulary purity (also run by test:browser and verify-sync.sh)
npm run test:purity

#  Phase 3 gate: compare assets with the accepted work-unit baselines
VERE=/path/to/vere bin/asset-digest.sh --consumer ../graph-viz
VERE=/path/to/vere bin/asset-digest.sh --spec bin/assets-urui-fixture.txt
```

The source desk includes its test framework and the JavaScript mark needed
to ingest the vendored Ace files. Copy `desk/mar/` along with the libraries
and assets; a desk without `mar/js.hoon` rejects `.js` files with
`%no-cast-between %mime %js` during `|commit`.

The fixture still needs staging to merge its agent and standard
dependencies. Consumer desks can be copied directly. After copying, run
these separately in the dojo (substitute the fixture or consumer desk as
appropriate):

```hoon
|commit %urui
-test /=urui=/tests ~
```

The browser harness needs a `vere` binary that supports `eval`; it compiles
the fixture's page, css, and app.js from desk sources without a ship.

`run-real.sh` executes **50 Chromium cases** against the fixture, and they
are where generic behavior is proved: the Ace baseline in full (editing and
navigation chords, the remaining chords, macros, undo/redo, the adapter
smoke and its load failure, the pinned module set) plus the shell's own
half of the editor surface, lifecycle, document tabs, and shortcut
boundaries. A consumer's suite keeps only what that application alone can
show — graph-viz's `run-real.sh` is **14 cases** — so no generic behavior
is proved twice.

`tests/browser/ace-win-linux-shortcuts.json` is the source of truth for the
100-row Ace Windows/Linux inventory. It is checksum-synced into consumers;
the adjacent Node test accounts for 102 executions, 97 bindings, five
exclusions, five duplicates, and the fixture's one override.

## License

MIT+n — see [LICENSE](LICENSE).
