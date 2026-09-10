::  Browser assets for %urui-fixture, the consumer-neutral test app.
::
::  This is urui's own consumer: the smallest application that exercises
::  every part of the contract, named after nothing real.  It exists so
::  the shell can be tested without graph-viz, obelisk, or heathcliff
::  present, and so a contract change that only a real consumer would
::  notice fails here first.
::
::  Two document kinds, three areas, five chords, and one endpoint set —
::  the shapes graph-viz uses, with none of its vocabulary.
::
/-  urui
/+  shell=urui-shell, ucss=urui-css, ujs=urui-js
/+  ucfg=urui-config, uace=urui-ace
|%
::
++  config
  ^-  app-config:urui
  :*  :*  name=%urui-fixture
          title='urui fixture'
          base='/apps/urui-fixture'
          storage-key='urui-fixture.session.v1'
          storage-version=1
      ==
      ::  two kinds: one editable source, one read-mostly note
      :~  :*  name=%text
              label='Text'
              untitled='Untitled'
              ext=%txt
              leaf=%txt
              mime='text/plain; charset=utf-8'
              tabs=&
              refs=&
          ==
          :*  name=%note
              label='Note'
              untitled='Preview'
              ext=%md
              leaf=%md
              mime='text/markdown; charset=utf-8'
              tabs=&
              refs=&
          ==
      ==
      :*  transport=%header
          path-header=`'x-urui-fixture-path'
          flag-header=`'x-urui-fixture-overwrite'
          browse='/apps/urui-fixture/file/{kind}/browse'
          load='/apps/urui-fixture/file/{kind}/load'
          save='/apps/urui-fixture/file/{kind}/save'
          delete='/apps/urui-fixture/file/{kind}/delete'
      ==
      ::  the same numbers graph-viz runs with, so a limit that only
      ::  matters at graph-viz's scale still matters here
      :*  render-debounce=350
          save-debounce=150
          min-explorer=180
          divider=10
          pane-min=25
          pane-max=70
          narrow=760
          max-source=262.144
      ==
      slots
      shortcuts
      :~  [%idle 'Ready']
          [%working 'Working…']
          [%saved 'Saved']
          [%failed 'Failed']
      ==
      docs-root=`'/docs/d/urui-fixture/'
      share-param=~
      :~  [%text-files 'Text Files']
          [%note-files 'Note Files']
      ==
      :*  base='/apps/urui-fixture/ace'
          global='uruiFixtureAceAssets'
          version='1.44.0'
          mode='ace/mode/text'
          light='ace/theme/github'
          dark='ace/theme/monokai'
          :~  'ace/ext/beautify'  'ace/ext/prompt'
              'ace/ext/searchbox'  'ace/ext/settings_menu'
          ==
          use-worker=|
      ==
  ==
::
++  slots
  ::  The session record, key for key.
  ::
  ::  Ordered as it is written, so a reader can compare this list with a
  ::  stored record side by side.
  ^-  (list slot:urui)
  :~  ['source' %app %scalar ~]
      ['paneWidth' %urui %scalar ~]
      ['explorerWidth' %urui %scalar ~]
      ['explorerOpen' %urui %scalar ~]
      ['explorerView' %urui %scalar ~]
      ['explorerOrder' %urui %scalar ~]
      ['docsTabs' %urui %tabs ~]
      ['nextDocs' %urui %next ~]
      ['refTabs' %urui %tabs ~]
      ['nextRef' %urui %next ~]
      ['textTabs' %urui %tabs `%text]
      ['activeTextTabId' %urui %active `%text]
      ['nextTextTab' %urui %next `%text]
      ['noteTabs' %urui %tabs `%note]
      ['activeNoteTabId' %urui %active `%note]
      ['nextNoteTab' %urui %next `%note]
      ['view' %app %record ~]
      ['preferences.theme' %urui %scalar ~]
  ==
::
++  shortcuts
  ::  Five chords with the shapes graph-viz owns: run, save, save-as,
  ::  and two view commands.
  ^-  (list shortcut:urui)
  :~  ['Ctrl-Enter' 'echo' %always]
      ['Ctrl-S' 'save' %always]
      ['Ctrl-Shift-S' 'save-as' %always]
      ['Ctrl-0' 'reset-view' %preview]
      ['Ctrl-1' 'fit-view' %preview]
  ==
::
++  spec
  ^-  shell-spec:urui
  :*  config
      brand
      toolbar
      [reference-area editor-area result-area]
      help
      dialogs=~
      styles=~
      scripts=~['/apps/urui-fixture/app.js']
  ==
::
++  brand
  ^-  marl
  :~  ;h1.app-title: urui fixture
  ==
::
++  toolbar
  ^-  marl
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
        ;button#echo.primary(type "button"): Echo
        ;label.toggle
          ;input#auto-echo(type "checkbox", checked "");
          ;span: Auto
        ==
      ==
  ==
::
++  reference-area
  ^-  area:urui
  :*  role=%reference
      id='explorer'
      label='Fixture explorer'
      heading=`'Files'
      status-id=~
      kind=~
      strip=&
      controls=~
      body=~[;div#explorer-panels.explorer-panels;]
      secondary=~
  ==
::
++  editor-area
  ^-  area:urui
  :*  role=%editor
      id='editor-pane'
      label='Fixture editor'
      heading=`'Source'
      status-id=`'source-status'
      kind=`%text
      strip=&
      controls=~[;button#save-text(type "button"):"Save"]
      body=~[;div#editor.editor-host(aria-label "Source");]
      secondary=~
  ==
::
++  result-area
  ^-  area:urui
  ::  Area 3 has no default: the fixture supplies a <pre>, exactly as a
  ::  real consumer supplies its preview, grid, or report.
  :*  role=%result
      id='result-pane'
      label='Fixture result'
      heading=`'Result'
      status-id=`'result-status'
      kind=`%note
      strip=&
      controls=~[;button#save-note(type "button"):"Save"]
      body=~[;pre#fixture-result.fixture-result;]
      secondary=`secondary-editor
  ==
::
++  secondary-editor
  ^-  editor:urui
  :*  id='result-editor'
      label='Result source'
      mode='ace/mode/text'
      wrap=&
      read-only=|
      max-bytes=262.144
  ==
::
++  help
  ^-  marl
  :~  ;p: The fixture exists to test urui, and has no documentation.
  ==
::
++  page
  ^-  @t
  (crip (en-xml:html (build:shell spec)))
::
++  css
  ^-  @t
  %+  rap  3
  :~  %-  compose:ucss
      :~  %tokens  %controls  %shell  %explorer
          %tabs  %dialogs  %responsive
      ==
      app-css
  ==
::
++  javascript
  ^-  @t
  %+  rap  3
  :~  (emit:ucfg config)
      core:ujs
      app-js
  ==
::
++  ace-config-js
  ::  `config` is an arm: bind it before reaching into it, or the wing
  ::  resolves against the arm rather than its product.
  ^-  @t
  =/  app=app-config:urui  config
  (config-js:uace ace-spec.app)
::
++  app-css
  ::  The fixture's own rules: enough to see the result area.
  ^-  @t
  '''
  .fixture-result {
    white-space: pre-wrap;
    font-family: monospace;
  }
  '''
::
++  app-js
  ::  The fixture's own script: the hooks a real consumer supplies.
  ^-  @t
  '''
  const fixtureCalls = [];

  function fixtureHook(group, method, result) {
    return (...args) => {
      fixtureCalls.push({group, method, args});
      return result;
    };
  }

  const fixture = {
    calls: fixtureCalls,
    files: {text: ['notes/txt', 'deep/leaf/txt'], note: []},
    source: 'fixture source',
    view: {scale: 1}
  };
  const runtime = window.urui.runtime({
    elements: {
      explorerPane: document.querySelector('#explorer'),
      editorPane: document.querySelector('#editor-pane'),
      resultPane: document.querySelector('#result-pane'),
      editorStatus: document.querySelector('#source-status'),
      resultStatus: document.querySelector('#result-status')
    },
    editors: () => fixture.editors || [],
    onChange: fixtureHook('runtime', 'change', undefined),
    onResize: fixtureHook('runtime', 'resize', undefined),
    onHelpOpen: fixtureHook('runtime', 'helpOpen', undefined),
    onTabsRendered: fixtureHook('runtime', 'tabsRendered', undefined),
    browse: async (kind) => fixture.files[kind] || [],
    openFile: fixtureHook('files', 'open', undefined),
    session: {
      read: (key) => {
        if (key === 'source') return fixture.source;
        if (key === 'view') return fixture.view;
        return undefined;
      },
      validate: (key, value) => {
        if (key === 'source') return typeof value === 'string' ? value : '';
        if (key === 'view') return value && typeof value === 'object'
          ? {scale: Number(value.scale) || 1}
          : undefined;
        return undefined;
      }
    },
    tabs: {
      text: {
        add: 'Add empty Text tab',
        validate: (candidate, base) => ({
          selection: candidate.selection || {start: 0, end: 0}
        }),
        defaults: (options) => ({
          selection: options.selection || {start: 0, end: 0}
        }),
        empty: () => runtime.tabs.create('text', ''),
        onCapture: fixtureHook('tabs', 'capture', undefined),
        onActivate: fixtureHook('tabs', 'activate', undefined),
        afterActivate: fixtureHook('tabs', 'afterActivate', undefined),
        onClose: fixtureHook('tabs', 'closed', undefined)
      },
      note: {
        defaults: (options, source) => ({editBaseSource: source}),
        empty: () => runtime.tabs.create('note', ''),
        onActivate: fixtureHook('tabs', 'activate', undefined)
      }
    }
  });
  fixture.runtime = runtime;
  runtime.wire();
  window.uruiFixture = fixture;
  window.urui.boot({
    onReady(api) {
      fixture.ready = true;
      fixture.api = api;
    },
    status: fixtureHook('shell', 'status', 'status'),
    tabs: {
      create: fixtureHook('tabs', 'create', 'created'),
      close: fixtureHook('tabs', 'close', 'closed'),
      select: fixtureHook('tabs', 'select', 'selected'),
      update: fixtureHook('tabs', 'update', 'updated'),
      list: fixtureHook('tabs', 'list', 'listed'),
      active: fixtureHook('tabs', 'active', 'active')
    },
    editor: {
      primary: fixtureHook('editor', 'primary', 'primary-editor'),
      secondary: fixtureHook('editor', 'secondary', 'secondary-editor')
    },
    explorer: {
      show: fixtureHook('explorer', 'show', 'shown'),
      refreshTree: fixtureHook('explorer', 'refreshTree', 'refreshed'),
      addRef: fixtureHook('explorer', 'addRef', 'added'),
      openDocs: fixtureHook('explorer', 'openDocs', 'opened')
    },
    dialog: {
      help: fixtureHook('dialog', 'help', 'helped'),
      error: fixtureHook('dialog', 'error', 'errored'),
      confirm: fixtureHook('dialog', 'confirm', true),
      prompt: fixtureHook('dialog', 'prompt', 'fixture-name')
    },
    session: {
      save: fixtureHook('session', 'save', 'saved'),
      queue: fixtureHook('session', 'queue', 'queued'),
      get: fixtureHook('session', 'get', 'loaded'),
      set: fixtureHook('session', 'set', 'stored')
    },
    files: {
      browse: fixtureHook('files', 'browse', 'browsed'),
      load: fixtureHook('files', 'load', 'loaded'),
      save: fixtureHook('files', 'save', 'saved'),
      delete: fixtureHook('files', 'delete', 'deleted')
    },
    shortcuts: {
      register: fixtureHook('shortcuts', 'register', 'registered')
    },
    layout: {
      paneWidth: fixtureHook('layout', 'paneWidth', 55),
      explorerWidth: fixtureHook('layout', 'explorerWidth', 320)
    },
    problem: {
      show: fixtureHook('problem', 'show', 'shown'),
      clear: fixtureHook('problem', 'clear', 'cleared')
    }
  });
  '''
--
