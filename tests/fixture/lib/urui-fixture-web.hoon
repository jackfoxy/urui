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
              ext=%text
              leaf=%txt
              mime='text/plain; charset=utf-8'
              tabs=&
              refs=&
          ==
          :*  name=%note
              label='Note'
              untitled='Preview'
              ext=%note
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
      share-param=`[name='text' max=12.288 param-max=16.384]
      :~  [%text-files 'Text Files']
          [%note-files 'Note Files']
      ==
      :*  base='/apps/urui-fixture/ace'
          global='uruiFixtureAceAssets'
          version='1.44.0'
          mode='ace/mode/fixture'
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
      ['preferences.autoEcho' %app %scalar ~]
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
      styles=~['/apps/urui-fixture/app.css']
      :~  '/apps/urui-fixture/ace/ace.js'
          '/apps/urui-fixture/ace/config.js'
          '/apps/urui-fixture/ace/theme-github.js'
          '/apps/urui-fixture/ace/theme-monokai.js'
          '/apps/urui-fixture/ace/ext-beautify.js'
          '/apps/urui-fixture/ace/ext-prompt.js'
          '/apps/urui-fixture/ace/ext-searchbox.js'
          '/apps/urui-fixture/ace/ext-settings_menu.js'
          '/apps/urui-fixture/app.js'
      ==
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
        ;div#editor-load-error.editor-load-error(hidden "", role "alert");
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
      controls=editor-controls
      body=~[editor-host]
      secondary=~
  ==
::
++  editor-controls
  ::  The kind's four file controls, named the way `++wire` in urui-js
  ::  expects: `#browse-text`, `#load-text`, `#save-text`.
  ::
  ::  A `marl` literal is cast here rather than inline: an uncast list of
  ::  Sail elements carries each element's own type into the area's mold,
  ::  and the nest check that follows is slow enough to notice.
  ^-  marl
  :~  ;button#add-text-ref(type "button", disabled ""):"Add Ref"
      ;button#browse-text(type "button"):"Browse"
      ;button#load-text(type "button"):"Load"
      ;button#save-text(type "button"):"Save"
  ==
::
++  editor-host
  ::  Labelled by the pane heading and described by both problem lines:
  ::  the shape the Ace adapter carries onto its own text input.
  ^-  manx
  ;div#editor.editor-host
    =role               "region"
    =aria-labelledby    "text-source-heading"
    =aria-describedby   "error editor-load-error"
    ;span(hidden "");
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
      controls=result-controls
      body=result-body
      secondary=`secondary-editor
  ==
::
++  result-controls
  ^-  marl
  :~  ;button#add-note-ref(type "button", disabled ""):"Add Ref"
      ;button#browse-note(type "button"):"Browse"
      ;button#load-note(type "button"):"Load"
      ;button#save-note(type "button"):"Save"
  ==
::
++  result-body
  ::  The fixture's problem line above its result, the shape a consumer
  ::  uses to report a failed request beside what it last produced.
  ^-  marl
  :~  ;pre#error.error(hidden "", role "alert");
      ;pre#fixture-result.fixture-result;
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
  ::  Two panels: the consumer's own text, and the documentation tree the
  ::  runtime fills in when this ship serves /docs.
  ^-  marl
  :~  ;div#fallback-help-content
        ;p: The fixture exists to test urui, and has no documentation.
      ==
      ;div#docs-help-content.docs-help-content(hidden "")
        ;nav#docs-help-nav.docs-help-nav
          =aria-label  "Fixture documentation"
          =aria-busy   "true"
          ;p.docs-help-loading: Loading documentation…
        ==
      ==
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
      mode-js
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
  .preview-pane { flex-direction: column; }

  .error {
    color: var(--danger, #b3261e);
    margin: 0;
    padding: 0.5rem 0.75rem;
    white-space: pre-wrap;
  }

  .fixture-result {
    white-space: pre-wrap;
    font-family: monospace;
  }

  #editor, #result-editor {
    background: var(--surface);
    border: 0;
    flex: 1;
    min-height: 12rem;
    width: 100%;
  }

  #editor.ace_focus, #editor:focus-within,
  #result-editor.ace_focus, #result-editor:focus-within {
    box-shadow: inset 0 0 0 2px var(--accent);
    outline: 3px solid var(--focus);
    outline-offset: -3px;
  }
  '''
::
++  mode-js
  ::  The fixture's own language mode.
  ::
  ::  urui vendors no language mode: a consumer owns its own, and the text
  ::  mode built into Ace has neither comments nor folding.  The generic
  ::  editor tests need both, so the fixture defines the smallest mode that
  ::  has them — `//` and `/* */` comments over brace folding — the shapes
  ::  a real consumer's mode file supplies from its own asset.
  ^-  @t
  '''
  if (typeof window.ace?.define === 'function') {
    window.ace.define('ace/mode/fixture', [
      'require', 'exports', 'module',
      'ace/lib/oop', 'ace/mode/text', 'ace/mode/folding/fold_mode'
    ], (require, exports) => {
      const oop = require('ace/lib/oop');
      const TextMode = require('ace/mode/text').Mode;
      const BaseFoldMode = require('ace/mode/folding/fold_mode').FoldMode;

      const FoldMode = function FixtureFoldMode() {};
      oop.inherits(FoldMode, BaseFoldMode);
      FoldMode.prototype.foldingStartMarker = /({)[^}]*$/;
      FoldMode.prototype.foldingStopMarker = /^[^{]*(})/;
      FoldMode.prototype.getFoldWidgetRange = function (session, style, row) {
        const line = session.getLine(row);
        const opening = line.match(this.foldingStartMarker);
        if (opening) {
          return this.openingBracketBlock(session, '{', row, opening.index);
        }
        if (style !== 'markbeginend') return undefined;
        const closing = line.match(this.foldingStopMarker);
        if (!closing) return undefined;
        return this.closingBracketBlock(
          session, '}', row, closing.index + closing[0].length
        );
      };

      const Mode = function FixtureMode() {
        TextMode.call(this);
        this.foldingRules = new FoldMode();
      };
      oop.inherits(Mode, TextMode);
      Mode.prototype.lineCommentStart = '//';
      Mode.prototype.blockComment = {start: '/*', end: '*/'};
      Mode.prototype.$id = 'ace/mode/fixture';
      exports.Mode = Mode;
    });
  }
  '''
::
++  app-js
  ::  Mount both editors and bind fixture policy to the shared runtime.
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
    source: 'fixture source',
    view: {scale: 1}
  };
  let editor;
  let noteEditor;
  let echoTimer;
  //  the fixture's own problem line, the way a consumer reports a failed
  //  request beside its result
  const showProblem = (message) => {
    const problem = document.querySelector('#error');
    if (!problem) return;
    problem.textContent = message;
    problem.hidden = !message;
  };
  const dispatchEcho = () => runtime.shortcuts.dispatch({
    key: 'Enter', ctrlKey: true,
    preventDefault: () => {}, stopPropagation: () => {}
  });
  const runtime = window.urui.runtime({
    elements: {
      explorerPane: document.querySelector('#explorer'),
      editorPane: document.querySelector('#editor-pane'),
      resultPane: document.querySelector('#result-pane'),
      editorStatus: document.querySelector('#source-status'),
      resultStatus: document.querySelector('#result-status')
    },
    editors: () => [editor, noteEditor],
    //  a persisted value moved: record it, then write the record, the
    //  way a consumer keeps its session current
    onChange: (...args) => {
      fixtureCalls.push({group: 'runtime', method: 'change', args});
      if (!window.__URUI_DOUBLES_TEST__) runtime.session.queue();
    },
    onResize: fixtureHook('runtime', 'resize', undefined),
    onHelpOpen: fixtureHook('runtime', 'helpOpen', undefined),
    onTabsRendered: fixtureHook('runtime', 'tabsRendered', undefined),
    session: {
      read: (key) => {
        if (key === 'source') {
          return window.__URUI_DOUBLES_TEST__
            ? fixture.source
            : editor?.getSource() ?? fixture.source;
        }
        if (key === 'view') return fixture.view;
        if (key === 'preferences.autoEcho') {
          return document.querySelector('#auto-echo')?.checked ?? true;
        }
        return undefined;
      },
      validate: (key, value) => {
        if (key === 'source') return typeof value === 'string' ? value : '';
        if (key === 'view') return value && typeof value === 'object'
          ? {scale: Number(value.scale) || 1}
          : undefined;
        if (key === 'preferences.autoEcho') return value !== false;
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
        onCapture: (tab) => {
          if (!window.__URUI_DOUBLES_TEST__) {
            tab.source = editor?.getSource() ?? tab.source;
            tab.selection = editor?.getSelection() ?? tab.selection;
          }
          fixtureCalls.push({group: 'tabs', method: 'capture', args: [tab]});
        },
        onActivate: (tab, choices) => {
          if (!window.__URUI_DOUBLES_TEST__) {
            editor?.setSource(tab.source, {
              history: 'reset', notify: false, selection: tab.selection
            });
          }
          fixtureCalls.push({
            group: 'tabs', method: 'activate', args: [tab, choices]
          });
        },
        afterActivate: (...args) => {
          fixtureCalls.push({group: 'tabs', method: 'afterActivate', args});
          if (document.querySelector('#auto-echo')?.checked) dispatchEcho();
        },
        onClose: fixtureHook('tabs', 'closed', undefined)
      },
      note: {
        defaults: (options, source) => ({editBaseSource: source}),
        empty: () => runtime.tabs.create('note', ''),
        onCapture: (tab) => {
          if (!window.__URUI_DOUBLES_TEST__) {
            tab.source = noteEditor?.getSource() ?? tab.source;
          }
        },
        onActivate: (tab) => {
          if (!window.__URUI_DOUBLES_TEST__) {
            noteEditor?.setSource(
              tab.source, {history: 'reset', notify: false}
            );
          }
          const result = document.querySelector('#fixture-result');
          if (result) result.textContent = tab.source;
        }
      }
    }
  });
  try {
    const assets = window.uruiFixtureAceAssets;
    editor = window.urui.editor.adapter(document.querySelector('#editor'), {
      assets,
      label: 'Text source editor',
      labelledBy: 'text-source-heading',
      describedBy: 'error editor-load-error',
      platform: window.__URUI_BROWSER_TEST__?.acePlatform
    });
    noteEditor = window.urui.editor.adapter(
      document.querySelector('#result-editor'),
      {
        assets,
        label: 'Note source editor',
        describedBy: 'editor-load-error',
        platform: window.__URUI_BROWSER_TEST__?.acePlatform
      }
    );
  } catch (cause) {
    const primaryHost = document.querySelector('#editor');
    const noteHost = document.querySelector('#result-editor');
    if (primaryHost) primaryHost.hidden = true;
    if (noteHost) noteHost.hidden = true;
    const failure = document.querySelector('#editor-load-error');
    if (failure) {
      failure.hidden = false;
      failure.title = String(cause);
      failure.textContent = 'Source editors unavailable. Reload after '
        + 'checking the Ace assets.';
    }
  }
  fixture.editors = [editor, noteEditor];
  fixture.editor = editor;
  fixture.noteEditor = noteEditor;
  window.__URUI_EDITOR_TEST__ = editor;
  window.__URUI_NOTE_EDITOR_TEST__ = noteEditor;
  fixture.runtime = runtime;
  runtime.wire();
  if (!window.__URUI_DOUBLES_TEST__) {
    const saved = runtime.session.load();
    const autoEcho = document.querySelector('#auto-echo');
    if (saved && autoEcho) autoEcho.checked = saved['preferences.autoEcho'];
    let shared;
    try {
      shared = runtime.session.sourceFromUrl();
    } catch (cause) {
      //  a bad shared link is a client-side problem, not a Clay failure
      showProblem(String(cause));
    }
    if (shared !== undefined) {
      const tab = runtime.tabs.create('text', shared, {label: 'Shared'});
      runtime.tabs.setActiveId('text', tab.id);
    }
    if (!runtime.tabs.list('text').length) {
      runtime.tabs.create('text', saved?.source ?? fixture.source);
    }
    if (!runtime.tabs.list('note').length) runtime.tabs.create('note', '');
    runtime.tabs.select(
      'text', runtime.tabs.activeId('text') || runtime.tabs.list('text')[0].id,
      {capture: false}
    );
    runtime.tabs.select(
      'note', runtime.tabs.activeId('note') || runtime.tabs.list('note')[0].id,
      {capture: false}
    );
    //  the startup record is worth keeping: a shared link's source only
    //  reaches storage if the first state is written back
    runtime.session.queue();
    editor?.onChange(() => {
      runtime.tabs.capture('text');
      runtime.tabs.render('text');
      runtime.session.queue();
      if (document.querySelector('#auto-echo')?.checked) {
        clearTimeout(echoTimer);
        echoTimer = setTimeout(dispatchEcho,
          window.URUI_CONFIG.limits.renderDebounce);
      }
    });
    noteEditor?.onChange(() => {
      runtime.tabs.capture('note');
      runtime.tabs.render('note');
      const result = document.querySelector('#fixture-result');
      if (result) result.textContent = noteEditor.getSource();
      runtime.session.queue();
    });
  }
  if (!window.__URUI_DOUBLES_TEST__) {
    //  the explorer's restored strip: docs and reference tabs come back
    //  from the session, and each reference re-reads its parent
    runtime.explorer.docs.render();
    runtime.explorer.refs.render();
    runtime.explorer.refs.syncAll();
    runtime.explorer.setView(runtime.explorer.view());
    runtime.explorer.tree.refresh('text');
    runtime.explorer.tree.refresh('note');
    runtime.explorer.docs.refreshVariant();
  }
  //  the note a source echoes into is named after that source and bound
  //  to it, so echoing twice replaces one note instead of stacking them
  const noteLabelFor = (tab) => {
    if (!tab || tab.label === 'Untitled') return 'Preview';
    return tab.label.endsWith('.text')
      ? `${tab.label.slice(0, -5)}.note`
      : `${tab.label}.note`;
  };
  const echoedNote = (parentId) => {
    const notes = runtime.tabs.list('note');
    return notes.find((tab) => tab.parentTextId === parentId)
      || notes.find((tab) => !tab.source && !tab.path && !tab.parentTextId)
      || runtime.tabs.create('note', '');
  };
  runtime.shortcuts.register('echo', async () => {
    runtime.tabs.capture('text');
    const parent = runtime.tabs.active('text');
    const source = editor?.getSource() ?? '';
    runtime.status.set('editor', 'working');
    try {
      const response = await fetch('/apps/urui-fixture/echo', {
        method: 'POST', body: source
      });
      if (!response.ok) throw new Error(await response.text());
      const body = await response.text();
      runtime.tabs.capture('note');
      const note = echoedNote(parent?.id);
      note.label = noteLabelFor(parent);
      note.source = body;
      note.editBaseSource = body;
      note.parentTextId = parent?.id;
      runtime.explorer.refs.syncFromParent('note', note.id);
      runtime.tabs.setActiveId('note', undefined);
      runtime.tabs.select('note', note.id, {capture: false});
      runtime.status.set('editor', 'idle');
      showProblem('');
    } catch (cause) {
      runtime.status.set('editor', 'failed');
      showProblem(String(cause));
      throw cause;
    }
  });
  runtime.shortcuts.register('save', () => runtime.files.save('text'));
  runtime.shortcuts.register('save-as', () => runtime.files.save('note'));
  runtime.shortcuts.register('reset-view', () => { fixture.view.scale = 1; });
  runtime.shortcuts.register('fit-view', () => { fixture.view.scale = 2; });
  document.querySelector('#echo')?.addEventListener('click', dispatchEcho);
  for (const name of ['text', 'note']) {
    document.querySelector(`#add-${name}-ref`)?.addEventListener('click', () => {
      runtime.explorer.refs.add(name, runtime.tabs.activeId(name));
    });
  }
  //  a consumer that renders on change renders what it starts with too
  if (!window.__URUI_DOUBLES_TEST__
    && document.querySelector('#auto-echo')?.checked) {
    dispatchEcho();
  }
  document.querySelector('#auto-echo')?.addEventListener('change', (event) => {
    runtime.session.queue();
    if (event.target.checked) dispatchEcho();
  });
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
      primary: () => editor,
      secondary: () => noteEditor
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
