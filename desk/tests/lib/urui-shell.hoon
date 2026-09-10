::  Tests for /lib/urui-shell.
::
::  The shell is asserted structurally — tags, attributes, and order — not
::  by searching the rendered text.  A substring test passes when the same
::  id appears in the wrong element, which is exactly the mistake Phase 3's
::  rewrite could make.
::
::  The spec below is a probe, not the browser fixture: keeping it here
::  lets `-test /=urui=/tests ~` run against the source desk alone, with no
::  consumer staged in.  The fixture covers the same ground through a real
::  agent in /tests/app/urui-fixture.
::
/-  urui
/+  *test, shell=urui-shell
|%
::
++  config
  ^-  app-config:urui
  %*  .  *app-config:urui
    name.app-id   %probe
    title.app-id  'Probe'
  ==
::
++  reference-area
  ::  heading, tab strip, no status, no secondary
  ^-  area:urui
  :*  role=%reference
      id='probe-reference'
      label='Probe reference'
      heading=`'Files'
      status-id=~
      kind=~
      strip=&
      controls=~
      body=~[;div#probe-tree.tree;]
      secondary=~
  ==
::
++  editor-area
  ::  status, no heading, no tab strip: the other branch of each test
  ^-  area:urui
  :*  role=%editor
      id='probe-editor'
      label='Probe editor'
      heading=~
      status-id=`'probe-status'
      kind=`%text
      strip=|
      controls=~[;button#probe-save(type "button"):"Save"]
      body=~[;div#probe-source.source;]
      secondary=~
  ==
::
++  result-area
  ^-  area:urui
  :*  role=%result
      id='probe-result'
      label='Probe result'
      heading=`'Result'
      status-id=~
      kind=~
      strip=&
      controls=~
      body=~[;pre#probe-output.output;]
      secondary=`secondary-editor
  ==
::
++  secondary-editor
  ^-  editor:urui
  :*  id='probe-secondary'
      label='Probe secondary'
      mode='ace/mode/text'
      wrap=&
      read-only=|
      max-bytes=1.024
  ==
::
++  spec
  ^-  shell-spec:urui
  :*  config
      brand=~[;h1.brand:"Probe"]
      toolbar=~[;button#probe-run(type "button"):"Run"]
      [reference-area editor-area result-area]
      help=~[;p.probe-help:"nothing to see"]
      dialogs=~[;div#probe-dialog.dialog;]
      styles=~['/probe/app.css']
      scripts=~['/probe/app.js' '/probe/extra.js']
  ==
::
++  doc  (build:shell spec)
::
++  full-config
  ^-  app-config:urui
  %*  .  config
    storage-key.app-id      'probe.session.v1'
    storage-version.app-id  1
    kinds
      :~  :*  name=%text
              label='Text'
              untitled='Untitled'
              ext=%txt
              mime='text/plain'
              tabs=&
              refs=&
          ==
          :*  name=%note
              label='Note'
              untitled='Preview'
              ext=%md
              mime='text/markdown'
              tabs=&
              refs=&
          ==
      ==
    statuses         ~[[%ready 'Ready'] [%busy 'Busy'] [%empty 'Empty']]
    permanent-views  ~[[%text-files 'Text Files'] [%note-files 'Note Files']]
  ==
::
++  full-spec
  ^-  shell-spec:urui
  =/  full-editor=area:urui
    %*  .  editor-area
      strip  &
      body
        :~  ;p#editor-load-error(hidden "", role "alert");
            ;div#probe-source.source;
        ==
    ==
  =/  full-result=area:urui
    %*  .  result-area
      kind  `%note
    ==
  =/  fixture-toolbar=marl
    :~  ;nav.toolbar(aria-label "Fixture controls")
          ;label.theme-control
            ;span: Theme
            ;select#theme(aria-label "Theme")
              ;option(value "system"): System
              ;option(value "light"): Light
              ;option(value "dark"): Dark
            ==
          ==
          ;button#help(type "button", aria-expanded "false"): Help
        ==
    ==
  =/  fixture-help=marl
    :~  ;div#fallback-help-content
          ;p: Consumer-neutral fallback help.
        ==
        ;div#docs-help-content.docs-help-content(hidden "")
          ;nav#docs-help-nav.docs-help-nav
            =aria-label  "Fixture documentation"
            =aria-busy   "true"
            ;p.docs-help-loading: Loading documentation…
          ==
        ==
    ==
  :*  full-config
      brand=~[;h1.brand:"Probe"]
      fixture-toolbar
      :*  reference-area
          full-editor
          full-result
      ==
      fixture-help
      dialogs=~[;div#probe-dialog.dialog;]
      styles=~['body { color: black; }']
      scripts=~['/probe/app.js']
  ==
::
++  full-doc  (build:shell full-spec)
::
++  fixture-spec  full-spec
::
++  fixture-doc  (build:shell fixture-spec)
::
++  elements
  ::  Every element with this tag, depth first.
  ::
  ::  The recursive results are bound before `weld` sees them: `weld` is a
  ::  wet gate, and a bare `^$` in its argument mulls against a type that
  ::  is still being computed.
  |=  [top=manx name=@tas]
  ^-  (list manx)
  =/  here=(list manx)  ?:(=(name n.g.top) ~[top] ~)
  =/  below=(list manx)
    |-  ^-  (list manx)
    ?~  c.top  ~
    =/  head=(list manx)  ^$(top i.c.top)
    =/  rest=(list manx)  $(c.top t.c.top)
    (weld head rest)
  (weld here below)
::
++  attribute
  ::  One attribute's value, or "" when absent.
  |=  [=manx name=@tas]
  ^-  tape
  =/  found  (skim a.g.manx |=([n=mane v=tape] =(name n)))
  ?~  found  ""
  v.i.found
::
++  has-attribute
  |=  [=manx name=@tas]
  ^-  ?
  ?=(^ (skim a.g.manx |=([n=mane v=tape] =(name n))))
::
++  has-id
  |=  [nodes=(list manx) id=tape]
  ^-  ?
  ?=(^ (skim nodes |=(kid=manx =(id (attribute kid %id)))))
::
++  node-by-id
  ::  The first element with this id, depth first.
  |=  [top=manx id=tape]
  ^-  (unit manx)
  ?:  =(id (attribute top %id))  `top
  =/  children=(list manx)  c.top
  |-
  ?~  children  ~
  =/  found=(unit manx)  ^$(top i.children)
  ?^  found  found
  $(children t.children)
::
++  has-node-id
  |=  [top=manx id=tape]
  ^-  ?
  ?=(^ (node-by-id top id))
::
++  panes
  ::  The three area sections, in document order.
  ^-  (list manx)
  =/  shells  (elements doc %main)
  ?~  shells  ~
  %+  skim  c.i.shells
  |=(=manx =(%section n.g.manx))
::
++  text-of
  ::  The concatenated text of an element's immediate children.
  ::
  ::  `top`, not `=manx`: a face of that name would shadow the mold, and
  ::  the inner gate's `kid=manx` would then be a noun used as a gate.
  |=  top=manx
  ^-  tape
  %-  zing
  %+  turn  c.top
  |=  kid=manx
  ^-  tape
  ?.  =(%$ n.g.kid)  ""
  =/  found  (skim a.g.kid |=([n=mane v=tape] =(%$ n)))
  ?~(found "" v.i.found)
::
++  test-shell-page
  ::  Shared page contract, exercised through the fixture-shaped spec.
  =/  ids=(list tape)
    :~  "probe-reference"
        "explorer-tabs"
        "explorer-collapse"
        "text-files-tab"
        "note-files-tab"
        "text-files-tree"
        "note-files-tree"
        "explorer-resizer"
        "workspace"
        "splitter"
        "probe-editor"
        "probe-result"
        "text-document-tabs"
        "note-document-tabs"
        "probe-secondary"
        "editor-load-error"
        "theme"
        "help"
        "help-panel"
        "fallback-help-content"
        "docs-help-content"
        "docs-help-nav"
        "file-context-menu"
        "file-context-open"
        "file-context-delete"
        "clay-error-modal"
        "clay-error-message"
        "probe-status"
        "probe-save"
    ==
  =/  dialogs=(list manx)
    %+  skim  (elements fixture-doc %aside)
    |=(kid=manx =("dialog" (attribute kid %role)))
  =/  options  (elements fixture-doc %option)
  =/  id-tests=tang
    %-  zing
    %+  turn  ids
    |=  id=tape
    (expect !>((has-node-id fixture-doc id)))
  ;:  weld
    id-tests
    (expect-eq !>(2) !>((lent dialogs)))
    (expect-eq !>("true") !>((attribute (snag 0 dialogs) %aria-modal)))
    (expect-eq !>("true") !>((attribute (snag 1 dialogs) %aria-modal)))
    (expect-eq !>(3) !>((lent options)))
    (expect-eq !>("system") !>((attribute (snag 0 options) %value)))
    (expect-eq !>("light") !>((attribute (snag 1 options) %value)))
    (expect-eq !>("dark") !>((attribute (snag 2 options) %value)))
    (expect-eq !>(0) !>((lent (elements fixture-doc %iframe))))
  ==
::
++  test-shell-emits-three-panes-in-document-order
  =/  found  panes
  ;:  weld
    (expect-eq !>(3) !>((lent found)))
    (expect-eq !>("probe-reference") !>((attribute (snag 0 found) %id)))
    (expect-eq !>("probe-editor") !>((attribute (snag 1 found) %id)))
    (expect-eq !>("probe-result") !>((attribute (snag 2 found) %id)))
  ==
::
++  test-shell-pane-carries-role-label-and-data-role
  =/  found  panes
  =/  first  (snag 0 found)
  ;:  weld
    (expect-eq !>("region") !>((attribute first %role)))
    (expect-eq !>("Probe reference") !>((attribute first %aria-label)))
    (expect-eq !>("reference") !>((attribute first %data-role)))
    (expect-eq !>("editor") !>((attribute (snag 1 found) %data-role)))
    (expect-eq !>("result") !>((attribute (snag 2 found) %data-role)))
  ==
::
++  test-shell-heading-appears-only-when-supplied
  =/  found  panes
  =/  titled  (elements (snag 0 found) %h2)
  ;:  weld
    (expect-eq !>(1) !>((lent titled)))
    (expect-eq !>("Files") !>((text-of (snag 0 titled))))
    (expect-eq !>(0) !>((lent (elements (snag 1 found) %h2))))
  ==
::
++  test-shell-status-appears-only-when-supplied
  =/  found  panes
  =/  status  (elements (snag 1 found) %span)
  ;:  weld
    (expect-eq !>(1) !>((lent status)))
    (expect-eq !>("probe-status") !>((attribute (snag 0 status) %id)))
    (expect-eq !>("status") !>((attribute (snag 0 status) %role)))
    (expect-eq !>(0) !>((lent (elements (snag 0 found) %span))))
  ==
::
++  test-shell-tab-strip-follows-the-area-flag
  =/  found  panes
  =/  strips
    %+  turn  found
    |=  pane=manx
    ^-  @ud
    %-  lent
    %+  skim  (elements pane %div)
    |=(kid=manx =("tab-strip" (attribute kid %class)))
  =/  first-strip=manx
    %-  head
    %+  skim  (elements (snag 0 found) %div)
    |=(kid=manx =("tab-strip" (attribute kid %class)))
  ;:  weld
    (expect-eq !>(~[1 0 1]) !>(strips))
    ::  the strip is named after its area, so two areas cannot collide
    (expect-eq !>("probe-reference-tabs") !>((attribute first-strip %id)))
    (expect-eq !>("tablist") !>((attribute first-strip %role)))
  ==
::
++  test-shell-hosts-the-secondary-editor-in-its-own-area
  =/  found  panes
  =/  hosts
    %+  turn  found
    |=  pane=manx
    ^-  @ud
    %-  lent
    %+  skim  (elements pane %div)
    |=(kid=manx =("editor-host" (attribute kid %class)))
  =/  host
    %-  head
    %+  skim  (elements (snag 2 found) %div)
    |=(kid=manx =("editor-host" (attribute kid %class)))
  ;:  weld
    (expect-eq !>(~[0 0 1]) !>(hosts))
    (expect-eq !>("probe-secondary") !>((attribute host %id)))
    (expect-eq !>("Probe secondary") !>((attribute host %aria-label)))
    (expect-eq !>("ace/mode/text") !>((attribute host %data-mode)))
  ==
::
++  test-shell-splices-consumer-body-and-controls
  =/  found  panes
  =/  bodies
    %+  skim  (elements (snag 1 found) %div)
    |=(kid=manx =("pane-body" (attribute kid %class)))
  ::  ++elements counts the pane body itself, so the consumer's own div is
  ::  the second hit: it is inside the body, not beside it
  =/  inside=(list manx)  (elements (head bodies) %div)
  =/  control=manx  (head (elements (snag 1 found) %button))
  ;:  weld
    (expect-eq !>(2) !>((lent inside)))
    (expect-eq !>("probe-source") !>((attribute (snag 1 inside) %id)))
    (expect-eq !>("probe-save") !>((attribute control %id)))
  ==
::
++  test-shell-emits-scripts-in-list-order
  =/  scripts  (elements doc %script)
  ;:  weld
    (expect-eq !>(2) !>((lent scripts)))
    (expect-eq !>("/probe/app.js") !>((attribute (snag 0 scripts) %src)))
    (expect-eq !>("/probe/extra.js") !>((attribute (snag 1 scripts) %src)))
  ==
::
++  test-shell-emits-styles-as-stylesheet-links
  =/  links  (elements doc %link)
  ;:  weld
    (expect-eq !>(1) !>((lent links)))
    (expect-eq !>("stylesheet") !>((attribute (snag 0 links) %rel)))
    (expect-eq !>("/probe/app.css") !>((attribute (snag 0 links) %href)))
  ==
::
++  test-shell-titles-the-document-from-the-app-id
  =/  titles  (elements doc %title)
  =/  frame=manx  (head (elements doc %body))
  ;:  weld
    (expect-eq !>(1) !>((lent titles)))
    (expect-eq !>("Probe") !>((text-of (snag 0 titles))))
    (expect-eq !>("probe") !>((attribute frame %data-app)))
  ==
::
++  test-shell-hides-the-help-container
  =/  helps
    %+  skim  (elements doc %div)
    |=(=manx =("app-help" (attribute manx %class)))
  ;:  weld
    (expect-eq !>(1) !>((lent helps)))
    (expect !>((has-attribute (head helps) %hidden)))
    (expect-eq !>(1) !>((lent (elements (head helps) %p))))
  ==
::
++  test-shell-splices-consumer-dialogs
  =/  holders
    %+  skim  (elements doc %div)
    |=(=manx =("app-dialogs" (attribute manx %class)))
  =/  inside=(list manx)  (elements (head holders) %div)
  ;:  weld
    (expect-eq !>(1) !>((lent holders)))
    (expect-eq !>("probe-dialog") !>((attribute (snag 1 inside) %id)))
  ==
::
++  test-full-shell-emits-explorer-regions
  =/  asides  (elements full-doc %aside)
  =/  tabs  (elements full-doc %button)
  =/  panels
    %+  skim  (elements (snag 0 asides) %div)
    |=(kid=manx =("explorer-panel" (attribute kid %class)))
  ;:  weld
    (expect-eq !>("probe-reference") !>((attribute (snag 0 asides) %id)))
    (expect-eq !>(%.y) !>((has-id tabs "text-files-tab")))
    (expect-eq !>(%.y) !>((has-id tabs "note-files-tab")))
    (expect-eq !>(2) !>((lent panels)))
  ==
::
++  test-full-shell-emits-workspace-and-resizers
  =/  sections  (elements full-doc %section)
  =/  separators
    %+  skim  ;:  weld  (elements full-doc %button)
                       (elements full-doc %div)
             ==
    |=(kid=manx =("separator" (attribute kid %role)))
  ;:  weld
    (expect-eq !>(%.y) !>((has-id sections "workspace")))
    (expect-eq !>(2) !>((lent separators)))
    (expect-eq !>("explorer-resizer") !>((attribute (snag 0 separators) %id)))
    (expect-eq !>("splitter") !>((attribute (snag 1 separators) %id)))
  ==
::
++  test-full-shell-emits-document-tab-strips
  =/  strips
    %+  skim  (elements full-doc %div)
    |=(kid=manx =("document-tabs" (attribute kid %class)))
  =/  first-id  (attribute (snag 0 strips) %id)
  =/  second-id  (attribute (snag 1 strips) %id)
  ;:  weld
    (expect-eq !>(2) !>((lent strips)))
    (expect-eq !>("text-document-tabs") !>(first-id))
    (expect-eq !>("note-document-tabs") !>(second-id))
  ==
::
++  test-full-shell-emits-help-and-dialogs
  =/  dialogs
    %+  skim  (elements full-doc %aside)
    |=(kid=manx =("dialog" (attribute kid %role)))
  =/  menus
    %+  skim  (elements full-doc %div)
    |=(kid=manx =("menu" (attribute kid %role)))
  ;:  weld
    (expect-eq !>(2) !>((lent dialogs)))
    (expect-eq !>("help-panel") !>((attribute (snag 0 dialogs) %id)))
    (expect-eq !>("clay-error-modal") !>((attribute (snag 1 dialogs) %id)))
    (expect-eq !>(1) !>((lent menus)))
    (expect-eq !>("file-context-menu") !>((attribute (head menus) %id)))
  ==
::
++  test-full-shell-emits-prepaint-style-and-assets
  =/  scripts  (elements full-doc %script)
  =/  styles  (elements full-doc %style)
  ;:  weld
    (expect-eq !>(2) !>((lent scripts)))
    (expect-eq !>("") !>((attribute (snag 0 scripts) %src)))
    (expect-eq !>("/probe/app.js") !>((attribute (snag 1 scripts) %src)))
    (expect-eq !>(1) !>((lent styles)))
  ==
--
