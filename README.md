# urui

Shared browser-UI shell for Urbit applications, in Hoon.

urui is the frame that [graph-viz][gv] grew: a three-area workbench with a
file explorer, document tabs, an Ace editor host, resizable panes, dialogs,
theming, and a session record — with no opinion about what any of it
displays. It is **source only**. There is no installable `%urui` desk and no
production agent here; a consuming application copies urui's files into its
own desk and builds one page from them.

[gv]: https://github.com/jackfoxy/graph-viz

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
    urui-clay.hoon     clay path validation and browse listings
    urui-http.hoon     eyre response helpers
  web/ace/             the single Ace vendoring point (W3.4)
  tests/lib/           unit tests, run inside a staged desk
tests/
  fixture/             %urui-fixture: the consumer urui tests against
  browser/             node doubles suite and Playwright, against the fixture
bin/                   manual sync, fixture staging, and asset digests
```

Nothing in `desk/` names a consumer. The dependency direction is strictly
consumer → urui, and a grep gate enforces it.

## Using urui from an application

Clone urui **beside** the consumer, then explicitly sync shared sources:

```bash
bin/sync.sh --dest ../graph-viz
bin/verify-sync.sh --dest ../graph-viz --strict
```

Consumers contain ordinary files and build without the sibling checkout.
The generated `bin/sync-manifest.txt` lists only shared files; application
sources and the consumer's own `lib/test.hoon` are never overwritten.
Ace and browser support enter the manifest when their extraction lands.
There is no watcher or automatic sync.

Edit shared files in urui, then sync manually. The consumer's
`.urui-sync.json` records last-synced checksums so verification distinguishes
`in-sync`, `stale`, `missing`, and `modified-locally`. Normal build scripts
warn about drift; `--strict` makes it a release failure. Sync overwrites
listed consumer copies, so inspect local modifications before syncing.

Copy the consumer's `desk/` directly into its mounted desk and `|commit`.
`stage-desk.sh` is needed only to assemble urui's disposable fixture desk.

## Testing

urui is tested through `%urui-fixture`, a disposable consumer that uses every
part of the contract and none of any real application's vocabulary: two
document kinds, three areas, five chords, one endpoint set.

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

## Status

W3.1 extracts Clay path validation and browse JSON. Graph-viz consumes the
shared library through synced source copies and retains only storage-policy
wrappers. `file-path` accepts a root, raw path, and extension list: it keeps
any listed suffix, otherwise appends the first extension, and rejects an
empty list. A single-extension list preserves the previous consumer policy.
HTTP adapters decode their header or body before calling these pure gates.

W3.2 adds HTTP payload construction with exact content types and byte
lengths, asset-table lookup, and consumer-defined authentication refusals.
Graph-viz uses tables for GET assets and POST actions with common file
validation. Its URLs, statuses, headers, and response bodies are preserved.

W3.3 extracts the seven CSS sections. Compose `%tokens %controls %shell
%explorer %tabs %dialogs %responsive`, then append application rules with
`rap 3`. Base controls precede component overrides; `compose` itself adds
no separators and preserves the requested order, including repetitions.
Graph-viz retains preview, inspector, zoom, and fullscreen rules. Regrouping
changes its CSS digest and its page digest because the page embeds CSS;
the HTML outside the style block and the JavaScript remain byte-identical.

W3.4 vendors the nine shared Ace files and generates each consumer's loader
configuration from `$ace-spec`. `mode` and `exts` contain full Ace module
ids; the consumer supplies its global name, base URL, version, themes and
worker policy. Graph-viz keeps its DOT mode and configuration URL. The
fixture can load a real text editor using the shared runtime.
See [the accepted configuration diff](docs/w3.4-ace-config.md).

W3.5 publishes the frozen `window.urui` API, one-shot boot dispatcher,
parameterized theme bootstrap, and shared Ace editor adapter. Graph-viz
composes the shared core before its application tail and supplies its
behavior through boot hooks. The fixture exercises the same public contract.

W3.6 emits every `$app-config` field as `window.URUI_CONFIG` and expands the
shell to the explorer, workspace, document strips, resizers, help panel,
context menu, and dialogs. Consumers now define their brand, controls,
content, and extra dialogs as marl slots and build the page with
`(build:shell spec)`. See [the Graph-reviewed page diff](docs/w3.6-page-diff.md).

W4.2 moves the nine consumer-neutral Node scenarios and their browser doubles
to urui. The fixture supplies traceable hooks for every public API group;
Graph-viz keeps four application scenarios and consumes checksum-tracked
copies of the shared doubles.

## License

MIT+n — see [LICENSE](LICENSE).
