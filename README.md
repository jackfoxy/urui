# urui

Shared browser-UI shell for Urbit applications, in Hoon.

urui is the frame that [graph-viz][gv] grew: a three-area workbench with a
file explorer, document tabs, an Ace editor host, resizable panes, dialogs,
theming, and a session record — with no opinion about what any of it
displays. It is **source only**. There is no installable `%urui` desk and no
production agent here; a consuming application links urui's files into its
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
bin/                   staging, linking, and the asset-digest gate
```

Nothing in `desk/` names a consumer. The dependency direction is strictly
consumer → urui, and a grep gate enforces it.

## Using urui from an application

Clone urui **beside** the consumer, then link:

```bash
git clone https://github.com/jackfoxy/urui.git    # sibling of your repo
urui/bin/link.sh --consumer ../graph-viz
urui/bin/verify-links.sh --consumer ../graph-viz
```

The links are committed to the consumer as symlinks, so a clean clone
reproduces them; only the urui checkout has to exist. Put
`verify-links.sh` first in the consumer's test and build scripts — a missing
checkout then fails in a second with a sentence instead of as a Hoon build
error three hundred lines later.

Delivery is always through a materialized copy:

```bash
urui/bin/stage-desk.sh --src desk /tmp/graph-viz-desk   # dereferences links
```

`stage-desk.sh` refuses to emit a tree that still contains a symlink. Copy
the staged directory into the mounted desk and `|commit`.

## Clay and symlinks (W2.1, measured)

Measured on a fakezod, vere 4.6, pier `uriu-zod`, desk `%urui` mounted:

| Question | Answer |
|---|---|
| Does `|commit` ingest a symlinked file? | **Yes** — the target's *content* is committed. `.^(@t %cx /=urui=/lib/linked-file/hoon)` returned the target's text, not the link. |
| Are edits to a target outside the pier seen? | **Yes** — editing the target and re-running `|commit` committed the change (`: /~zod/urui/3/lib/linked-file/hoon`). Vere stats through the link. |
| Does the link survive a remount? | **No.** `|unmount` deletes the mount directory outright; `|mount` re-materializes every file from Clay as a **regular file**. The symlink is gone and the sharing silently stops. |
| What happens to a dangling link? | Vere prints `can't stat <path>: No such file or directory` and **skips the file**. The commit itself succeeds, so the desk is quietly incomplete — `.^(? %cu …)` is `%.n`. |

Commands used:

```
|commit %urui                              :: ingest
.^(@t %cx /=urui=/lib/linked-file/hoon)    :: read back
|unmount %urui                             :: then |mount %urui
.^(? %cu /=urui=/lib/dangling-file/hoon)   :: %.n
```

Consequences, and they are the reason §4.3 of the plan says *always
materialize*:

1. A developer **may** mount a working tree that contains links and commit
   from it — edits to urui through a consumer's link do reach Clay.
2. That state is **not durable**. Any unmount/remount replaces every link
   with a regular file, after which the consumer and urui have silently
   forked. Never mount the git working tree; stage into the mount instead.
3. A missing urui checkout does not fail loudly at commit time. That is
   `verify-links.sh`'s job, which is why it is a prerequisite and not a
   convenience.

## Testing

urui is tested through `%urui-fixture`, a disposable consumer that uses every
part of the contract and none of any real application's vocabulary: two
document kinds, three areas, five chords, one endpoint set.

```bash
#  Hoon: the libs and their unit tests, in a disposable test desk.
#  --base brings /lib/test.hoon; --no-kelvin leaves the ship's own
#  sys.kelvin alone when staging into a desk made by |new-desk.
bin/stage-desk.sh --base ../graph-viz/desk --no-kelvin /tmp/urui-desk
rsync -rL /tmp/urui-desk/ <pier>/urui/        # no --delete: keeps mar/
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

#  Phase 3 gate: assets must hash the same before and after extraction
VERE=/path/to/vere bin/asset-digest.sh --consumer ../graph-viz
VERE=/path/to/vere bin/asset-digest.sh --spec bin/assets-urui-fixture.txt
```

Use staging for both Hoon test commands. Copying only `desk/` omits
`lib/test.hoon`, which the CSS, HTTP, and shell tests import. Clay then
reports `no files match /lib/test/hoon`. The staging script copies that
dependency from `--base` and fails before replacing the output if a required
library is missing. `--no-base` is only for source materialization when the
destination already supplies the dependencies.

To repair an existing `%urui` test desk, run the first staging and rsync
commands above, then run these separately in the dojo:

```hoon
|commit %urui
-test /=urui=/tests ~
```

The browser harness needs a `vere` binary that supports `eval`; it compiles
the fixture's page, css, and app.js from desk sources without a ship.

## Status

Phase 2 of the extraction plan, plus the pre-Phase-3 test net. The contract,
the fixture, and both harnesses are real; `urui-shell` renders and is covered
by 12 structural unit tests, `urui-http` by 4, and the fixture agent by 6.
The remaining libraries are stubs that compile, and Phase 3 fills them by
moving code out of graph-viz under a byte-identical digest gate.

## License

MIT+n — see [LICENSE](LICENSE).
