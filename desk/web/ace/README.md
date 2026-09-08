# Ace, vendored once

This directory is the single vendoring point for the Ace editor across every
urui consumer. Phase 3 (W3.4) moves the runtime here byte-for-byte from
`graph-viz/desk/web/ace/`; until then it holds only this note.

What lands here:

| File | Role |
|---|---|
| `ace.js` | Ace core |
| `theme-github.js`, `theme-monokai.js` | light and dark themes |
| `ext-beautify.js`, `ext-prompt.js`, `ext-searchbox.js`, `ext-settings-menu.js` | extensions |
| `license.txt` | Ace's license, kept beside the code |

What does not land here: language modes. A mode is the consuming
application's own — graph-viz keeps `mode-dot.js` in its desk — which is why
this directory is linked per file and never as a whole.

The loader configuration is not a file at all. It is generated from
`$ace-spec` by `lib/urui-ace.hoon`, so each consumer serves it at its own URL
with its own global name and asset base.
