::  Browser assets for the store module's fixture.
::
::  The smallest application urui's documents module runs in: no
::  $doc-kind, one store with a root the user saves into and a root only
::  the application writes, one tree, and every file action.  Named after
::  nothing real, like urui-fixture-web beside it.
::
/-  urui
/+  shell=urui-shell, ucss=urui-css, ujs=urui-js
/+  ucfg=urui-config, uace=urui-ace
|%
::
++  page-files
  ::  Named apart from the `files` face: a %* value is read with the
  ::  bunt already in the subject, so a same-named arm would be shadowed.
  ^-  files:urui
  :*  url='/apps/urui-fixture/files'
      :~  :*  name=%page
              noun='Page'
              untitled='page'
              starter=''
              :~  [/pages ~[%md %txt] ~ &]
                  [/exports ~[%txt] ~ |]
              ==
              preview=`%source
              actions=~[%open %save %save-as %copy %ref %browse]
              refs=&
              share=`['page' 12.288 16.384]
      ==  ==
      ~[[view=%page-files store=%page scopes=~]]
  ==
::
++  identity
  ^-  app-id:urui
  :*  name=%urui-fixture
      title='urui docs fixture'
      base='/apps/urui-fixture'
      storage-key='urui-fixture.session.v1'
      storage-version=1
  ==
::
++  numbers
  ::  graph-viz's numbers, as urui-fixture-web runs with
  ^-  limits:urui
  :*  render-debounce=350
      save-debounce=150
      min-explorer=180
      divider=10
      pane-min=25
      pane-max=70
      max-source=262.144
  ==
::
++  ace
  ^-  ace-spec:urui
  :*  base='/apps/urui-fixture/ace'
      global='uruiFixtureAceAssets'
      version='1.44.0'
      mode='ace/mode/text'
      light='ace/theme/github'
      dark='ace/theme/monokai'
      ~['ace/ext/beautify']
      use-worker=|
  ==
::
++  record-slots
  ^-  (list slot:urui)
  :~  ['pageTabs' %urui %tabs `%page]
      ['activePageId' %urui %active `%page]
      ['nextPage' %urui %next `%page]
      ['fileTrees' %urui %record ~]
      ['explorerView' %urui %scalar ~]
      ['preferences.theme' %urui %scalar ~]
  ==
::
++  config
  ^-  app-config:urui
  %*  .  *app-config:urui
    app-id     identity
    limits     numbers
    slots      record-slots
    ace-spec   ace
    files      `page-files
  ==
::
++  pinned
  |=  [name=@tas item=band-item:urui]
  ^-  band:urui
  [name [key=~ open=& label=''] item]
::
++  reference-pane
  ^-  pane:urui
  :*  role=%reference
      id='explorer'
      label='Docs fixture explorer'
      mode=%read-only
      kind=~
      :~  %+  pinned  %tabs
          :-  %tabs
          :~  :*  name=%view
                  label='Docs fixture explorer'
                  source=%views
                  kind=~
                  fixed=~[[%page-files 'Pages']]
                  add=~
                  close=|
                  reorder=&
              ==
          ==
          (pinned %body [%panel 'explorer-body' ~ ~])
      ==
  ==
::
++  editor-pane
  ::  The store's strip, its heading (where urui puts the actions), and
  ::  its panel (where urui mounts the editor and the preview).
  ^-  pane:urui
  :*  role=%editor
      id='editor-pane'
      label='Page editor'
      mode=%read-write
      kind=~
      :~  %+  pinned  %tabs
          :-  %tabs
          :~  :*  name=%document
                  label='Pages'
                  source=%documents
                  kind=`%page
                  fixed=~
                  add=`'New page'
                  close=&
                  reorder=&
              ==
          ==
          (pinned %head [%heading `'Page' ~ ~])
          %+  pinned  %body
          :*  %panel
              'editor-body'
              `['page-editor' 'Page source' '' & | 0]
              ~
          ==
      ==
  ==
::
++  result-pane
  ^-  pane:urui
  :*  role=%result
      id='result-pane'
      label='Docs fixture result'
      mode=%read-write
      kind=~
      :~  (pinned %head [%heading `'Result' ~ ~])
          (pinned %body [%panel 'result-body' ~ ~])
      ==
  ==
::
++  brand
  ^-  marl
  :~  ;h1.app-title: urui docs fixture
  ==
::
++  toolbar
  ^-  marl
  :~  ;nav.toolbar(aria-label "Fixture controls")
        ;button#help(type "button"): Help
      ==
  ==
::
++  spec
  ^-  shell-spec:urui
  :*  config
      brand
      toolbar
      [reference-pane editor-pane result-pane]
      help=~
      dialogs=~
      styles=~['/apps/urui-fixture/app.css']
      :~  '/apps/urui-fixture/ace/ace.js'
          '/apps/urui-fixture/ace/config.js'
          '/apps/urui-fixture/ace/ext-beautify.js'
          '/apps/urui-fixture/app.js'
      ==
      head=~
  ==
::
++  page
  ^-  @t
  (crip (en-xml:html (build:shell spec)))
::
++  css
  ^-  @t
  %-  compose:ucss
  :~  %tokens  %controls  %shell  %explorer
      %tabs  %dialogs  %responsive
  ==
::
++  javascript
  ^-  @t
  %+  rap  3
  :~  (emit:ucfg spec)
      core:ujs
      app-js
  ==
::
++  ace-config-js
  ^-  @t
  (config-js:uace ace)
::
++  app-js
  ::  The whole application: urui's runtime, booted in the order the
  ::  store module asks for, and published for the scenarios.
  ^-  @t
  '''
  (() => {
    const runtime = window.urui.runtime({});
    runtime.wire();
    runtime.session.load();
    runtime.documents.start();
    window.urui.boot({});
    window.uruiDocsFixture = {ready: true, runtime};
  })();
  '''
--
