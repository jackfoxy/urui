::  Browser assets for %urui-fixture, the consumer-neutral test app.
::
::  This is urui's own consumer: the smallest application that exercises
::  every part of the contract, named after nothing real.  It exists so
::  the shell can be tested without graph-viz, obelisk, or heathcliff
::  present, and so a contract change that only a real consumer would
::  notice fails here first.
::
::  Two document stores, three panes, five chords, and one file wire —
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
      :*  base='/apps/urui-fixture/ace'
          global='uruiFixtureAceAssets'
          version='1.44.0'
          mode='ace/mode/fixture'
          light='ace/theme/github'
          dark='ace/theme/monokai'
          ::  the vim keymap is not listed here: `exts` is loaded by
          ::  plain module name, and Ace fetches a keyboard handler
          ::  through its own ["keybinding", id] form instead
          :~  'ace/ext/beautify'  'ace/ext/prompt'
              'ace/ext/searchbox'  'ace/ext/settings_menu'
          ==
          use-worker=|
      ==
      ::  columns, so a fresh session proves the default; the result
      ::  pane collapses, so the control is proved for every consumer
      layout=%columns
      collapse=&
      files=`fixture-files
  ==
::
++  fixture-files
  ::  Two stores: an editable source whose `txt` files show as `.text`
  ::  and share by link, and a note echoed from it, stored as `md`.
  ::
  ::  Named apart from the `files` face: a %* value is read with the bunt
  ::  already in the subject, so a same-named arm would be shadowed.
  ^-  files:urui
  :*  url='/apps/urui-fixture/files'
      :~  :*  name=%text
              noun='Text'
              untitled='Untitled'
              starter='fixture source'
              roots=~[[~ ~[%txt] `%text &]]
              preview=~
              actions=~[%open %save %save-as %ref %browse]
              refs=&
              share=`['text' 12.288 16.384]
          ==
          :*  name=%note
              noun='Note'
              untitled='Preview'
              starter=''
              roots=~[[~ ~[%md] `%note &]]
              preview=`%source
              actions=~[%open %save %save-as %copy %ref %browse]
              refs=&
              share=~
          ==
      ==
      ~[[%text-files %text ~] [%note-files %note ~]]
  ==
::
++  slots
  ::  The session record, key for key.
  ::
  ::  Ordered as it is written, so a reader can compare this list with a
  ::  stored record side by side.
  ^-  (list slot:urui)
  :~  ['paneWidth' %urui %scalar ~]
      ['explorerWidth' %urui %scalar ~]
      ['explorerOpen' %urui %scalar ~]
      ['explorerView' %urui %scalar ~]
      ['explorerOrder' %urui %scalar ~]
      ['docsTabs' %urui %tabs ~]
      ['nextDocs' %urui %next ~]
      ['refTabs' %urui %tabs ~]
      ['nextRef' %urui %next ~]
      ['paneBands' %urui %record ~]
      ['panePaths' %urui %record ~]
      ['textTabs' %urui %tabs `%text]
      ['activeTextTabId' %urui %active `%text]
      ['nextTextTab' %urui %next `%text]
      ['noteTabs' %urui %tabs `%note]
      ['activeNoteTabId' %urui %active `%note]
      ['nextNoteTab' %urui %next `%note]
      ['view' %app %record ~]
      ['preferences.autoEcho' %app %scalar ~]
      ['preferences.theme' %urui %scalar ~]
      ['preferences.layout' %urui %scalar ~]
      ['preferences.keybindings' %urui %scalar ~]
      ['paneHeight' %urui %scalar ~]
      ['resultOpen' %urui %scalar ~]
      ['fileTrees' %urui %record ~]
  ==
::
++  shortcuts
  ::  Five chords with the shapes graph-viz owns: run, a save for each
  ::  store, and two view commands.
  ^-  (list shortcut:urui)
  :~  ['Ctrl-Enter' 'echo' %always]
      ['Ctrl-S' 'save:text' %always]
      ['Ctrl-Shift-S' 'save:note' %always]
      ['Ctrl-0' 'reset-view' %preview]
      ['Ctrl-1' 'fit-view' %preview]
  ==
::
++  spec
  ::  `our` reaches exactly one band — the reference pane's ship label.
  ::  Every other value in the spec is static.
  |=  our=@p
  ^-  shell-spec:urui
  :*  config
      brand
      toolbar
      [(reference-pane our) editor-pane result-pane]
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
        ;button#help(type "button", aria-expanded "false"): Help
        ;button#echo.primary(type "button"): Echo
        ;label.toggle
          ;input#auto-echo(type "checkbox", checked "");
          ;span: Auto
        ==
      ==
  ==
::
++  pinned
  ::  A band the user cannot hide: no reveal key, so no toggle.
  |=  [name=@tas item=band-item:urui]
  ^-  band:urui
  [name [key=~ open=& label=''] item]
::
++  hideable
  ::  A band the user can hide, persisted under `key`.
  |=  [name=@tas key=@t open=? label=@t item=band-item:urui]
  ^-  band:urui
  [name [`key open label] item]
::
++  reference-pane
  ::  Read-only: its level asks for no `+` and no close, and the mode
  ::  would refuse both anyway.  The ship label is the %label band, and
  ::  the reference pane is the only place urui puts one.
  |=  our=@p
  ^-  pane:urui
  :*  role=%reference
      id='explorer'
      label='Fixture explorer'
      mode=%read-only
      kind=~
      :~  (pinned %tabs [%tabs ~[reference-level]])
          (pinned %ship [%label (scot %p our)])
          (pinned %body [%panel 'explorer-body' ~ ~])
      ==
  ==
::
++  reference-level
  ^-  tab-level:urui
  :*  name=%view
      label='Fixture explorer'
      source=%views
      kind=~
      :~  [%text-files 'Text Files']
          [%note-files 'Note Files']
      ==
      add=~
      close=|
      reorder=&
  ==
::
++  editor-pane
  ^-  pane:urui
  :*  role=%editor
      id='editor-pane'
      label='Fixture editor'
      mode=%read-write
      kind=`%text
      ::  The tabs come first and the heading after them: the other
      ::  ordering from the result pane, out of the same two items.  urui
      ::  appends the store's file actions to the heading.
      :~  (pinned %tabs [%tabs ~[editor-level]])
          (pinned %head [%heading `'Source' `'source-status' ~])
          %:  hideable
            %controls
            'editorControls'
            open=&
            label='Editor hints'
            [%controls editor-controls]
          ==
          (pinned %body [%panel 'editor-body' `primary-editor ~])
      ==
  ==
::
++  editor-level
  ^-  tab-level:urui
  :*  name=%document
      label='Text documents'
      source=%documents
      kind=`%text
      fixed=~
      add=`'Add empty Text tab'
      close=&
      reorder=&
  ==
::
++  editor-controls
  ::  A band the user can hide.  Cast rather than inline: an uncast list
  ::  of Sail elements carries each element's own type into the pane's
  ::  mold, and the nest check that follows is slow enough to notice.
  ^-  marl
  :~  ;p.fixture-hint: Ctrl-Enter echoes the source into a note.
  ==
::
++  primary-editor
  ::  The text store's Ace host; urui labels it and mounts it.  `mode` is
  ::  empty, so the ace-spec's fixture mode applies.
  ^-  editor:urui
  :*  id='editor'
      label='Text source editor'
      mode=''
      wrap=&
      read-only=|
      max-bytes=262.144
  ==
::
++  result-pane
  ^-  pane:urui
  ::  Pane 3 has no default: the fixture supplies a <pre>, exactly as a
  ::  real consumer supplies its preview, grid, or report.
  ::
  ::  Its heading is listed before the tabs, and three levels hang off
  ::  them: the note store, two fixed views of it, and one dynamic level
  ::  the fixture fills through `runtime.panes.set`.
  :*  role=%result
      id='result-pane'
      label='Fixture result'
      mode=%read-write
      kind=`%note
      :~  (pinned %head [%heading `'Result' `'result-status' ~])
          (pinned %controls [%controls result-controls])
          (pinned %tabs [%tabs ~[result-level view-level set-level]])
          %+  pinned  %body
          [%panel 'result-body' `secondary-editor result-body]
      ==
  ==
::
++  result-level
  ::  No `+`: the note store is filled by echoing a text tab, so its
  ::  strip draws no add control.
  ^-  tab-level:urui
  :*  name=%document
      label='Note documents'
      source=%documents
      kind=`%note
      fixed=~
      add=~
      close=&
      reorder=&
  ==
::
++  view-level
  ::  Depth 1: two fixed views of whatever note tab is selected.
  ^-  tab-level:urui
  :*  name=%view
      label='Note views'
      source=%fixed
      kind=~
      :~  [%rendered 'Rendered']
          [%messages 'Messages']
      ==
      add=~
      close=|
      reorder=|
  ==
::
++  set-level
  ::  Depth 2: filled by the fixture through `runtime.panes.set`.
  ^-  tab-level:urui
  :*  name=%set
      label='Note sections'
      source=%dynamic
      kind=~
      fixed=~
      add=~
      close=&
      reorder=|
  ==
::
++  result-controls
  ^-  marl
  :~  ;p.fixture-hint: A note is Markdown: its toggle shows a preview.
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
      label='Note source editor'
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
  ::  The page as ~zod.  The offline browser server and the digest
  ::  tooling compile this arm and neither has a ship; a running agent
  ::  serves `(page-for our.bowl)` through the same gate.
  ^-  @t
  (page-for ~zod)
::
++  page-for
  |=  our=@p
  ^-  @t
  (crip (en-xml:html (build:shell (spec our))))
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
  :~  (emit:ucfg (spec ~zod))
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
  ::  The fixture's own rules: enough to see the result pane.
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

  .fixture-hint {
    color: var(--muted);
    margin: 0;
    padding: 0.25rem 0.75rem;
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
  ::  Bind fixture policy to the shared runtime: urui owns both stores,
  ::  their editors, files, tree, and references; the fixture echoes a
  ::  text into a note and splits the active note into sections.
  ^-  @t
  '''
  const fixtureCalls = [];

  function fixtureHook(group, method, result) {
    return (...args) => {
      fixtureCalls.push({group, method, args});
      return result;
    };
  }

  const fixture = {calls: fixtureCalls, view: {scale: 1}};
  //  urui mounts both editors in `docs.start()`; they are bound after it
  let editor;
  let noteEditor;
  let echoTimer;
  const autoEcho = () => document.querySelector('#auto-echo')?.checked;
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
  //  the result pane's two generated levels: %view is fixed and needs
  //  no call, %set is dynamic and is refilled from the active note
  //  whenever that note changes.  A blank line starts a new section.
  let sections = [];
  const noteSections = (source) => {
    return String(source || '').split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part, index) => ({
        id: `part-${index + 1}`,
        label: `Part ${index + 1}`,
        source: part
      }));
  };
  const paintSection = () => {
    const [, view, part] = runtime.panes.path('result-pane');
    const panel = runtime.panes.panel('result-pane');
    if (!panel) return;
    panel.textContent = view === 'messages'
      ? `${sections.length} section(s)`
      : sections.find((item) => item.id === part)?.source ?? '';
  };
  //  filled from a store hook, never from `onRendered`: ++setLevelTabs
  //  renders, and rendering back into it would not terminate
  const syncSections = (text) => {
    sections = noteSections(text);
    runtime.panes.set('result-pane', 'set', sections.map((item) => {
      return {id: item.id, label: item.label};
    }));
    paintSection();
  };
  const showNote = (text) => {
    const result = document.querySelector('#fixture-result');
    if (result) result.textContent = text;
    syncSections(text);
  };
  const runtime = window.urui.runtime({
    elements: {
      explorerPane: document.querySelector('#explorer'),
      editorPane: document.querySelector('#editor-pane'),
      resultPane: document.querySelector('#result-pane'),
      editorStatus: document.querySelector('#source-status'),
      resultStatus: document.querySelector('#result-status')
    },
    //  a persisted value moved: record it, then write the record, the
    //  way a consumer keeps its session current
    onChange: (...args) => {
      fixtureCalls.push({group: 'runtime', method: 'change', args});
      if (!window.__URUI_DOUBLES_TEST__) runtime.session.queue();
    },
    //  the browser specs pin Ace's keyboard platform
    acePlatform: window.__URUI_BROWSER_TEST__?.acePlatform,
    onResize: fixtureHook('runtime', 'resize', undefined),
    onHelpOpen: fixtureHook('runtime', 'helpOpen', undefined),
    panes: {onSelect: () => paintSection()},
    session: {
      read: (key) => {
        if (key === 'view') return fixture.view;
        if (key === 'preferences.autoEcho') return autoEcho() ?? true;
        return undefined;
      },
      validate: (key, value) => {
        if (key === 'view') return value && typeof value === 'object'
          ? {scale: Number(value.scale) || 1}
          : undefined;
        if (key === 'preferences.autoEcho') return value !== false;
        return undefined;
      }
    },
    documents: {
      text: {
        activate: (tab, choices) => {
          fixtureCalls.push({
            group: 'tabs', method: 'activate', args: [tab, choices]
          });
        },
        afterActivate: (tab, choices) => {
          fixtureCalls.push({
            group: 'tabs', method: 'afterActivate', args: [tab, choices]
          });
          if (!choices.restore && autoEcho()) dispatchEcho();
        }
      },
      //  a note remembers the text it was echoed from
      note: {
        fields: {
          defaults: () => ({parentTextId: undefined}),
          validate: (candidate, tab, ids) => ({
            parentTextId: ids.get('text')?.has(candidate.parentTextId)
              ? candidate.parentTextId : undefined
          })
        },
        activate: (tab) => showNote(tab.text)
      }
    }
  });
  const docs = runtime.documents;
  fixture.runtime = runtime;
  runtime.wire();
  if (!window.__URUI_DOUBLES_TEST__) {
    const saved = runtime.session.load();
    const toggle = document.querySelector('#auto-echo');
    if (saved && toggle) toggle.checked = saved['preferences.autoEcho'];
    //  the explorer's restored strip: docs and reference tabs come back
    //  from the session
    runtime.explorer.docs.render();
    runtime.explorer.refs.render();
    runtime.explorer.setView(runtime.explorer.view());
    docs.start();
    runtime.explorer.docs.refreshVariant();
  }
  //  under the doubles a scenario starts the stores itself
  const bindEditors = () => {
    editor = docs.editor('text');
    noteEditor = docs.editor('note');
    fixture.editors = [editor, noteEditor];
    fixture.editor = editor;
    fixture.noteEditor = noteEditor;
    window.__URUI_EDITOR_TEST__ = editor;
    window.__URUI_NOTE_EDITOR_TEST__ = noteEditor;
    editor?.onChange(() => {
      if (!autoEcho()) return;
      clearTimeout(echoTimer);
      echoTimer = setTimeout(dispatchEcho,
        window.URUI_CONFIG.limits.renderDebounce);
    });
    noteEditor?.onChange(() => showNote(noteEditor.getSource()));
  };
  fixture.bindEditors = bindEditors;
  if (!window.__URUI_DOUBLES_TEST__) bindEditors();
  //  the note a source echoes into is named after that source and bound
  //  to it, so echoing twice replaces one note instead of stacking them
  const noteLabelFor = (tab) => {
    if (!tab?.path) return 'Preview';
    return tab.label.endsWith('.text')
      ? `${tab.label.slice(0, -5)}.note`
      : `${tab.label}.note`;
  };
  const echoedNote = (parentId) => {
    const notes = docs.list('note');
    return notes.find((tab) => tab.parentTextId === parentId)
      || notes.find((tab) => !tab.text && !tab.path && !tab.parentTextId)
      || docs.create('note', {text: '', activate: false});
  };
  runtime.shortcuts.register('echo', async () => {
    const parent = docs.active('text');
    const source = editor?.getSource() ?? parent?.text ?? '';
    runtime.status.set('editor', 'working');
    try {
      const response = await fetch('/apps/urui-fixture/echo', {
        method: 'POST', body: source
      });
      if (!response.ok) throw new Error(await response.text());
      const body = await response.text();
      const note = echoedNote(parent?.id);
      const wasActive = docs.active('note')?.id === note.id;
      docs.update('note', note.id, {
        text: body,
        label: noteLabelFor(parent),
        fields: {parentTextId: parent?.id}
      });
      if (wasActive) showNote(body);
      else docs.select('note', note.id);
      runtime.status.set('editor', 'idle');
      showProblem('');
    } catch (cause) {
      runtime.status.set('editor', 'failed');
      showProblem(String(cause));
      throw cause;
    }
  });
  runtime.shortcuts.register('reset-view', () => { fixture.view.scale = 1; });
  runtime.shortcuts.register('fit-view', () => { fixture.view.scale = 2; });
  document.querySelector('#echo')?.addEventListener('click', dispatchEcho);
  //  a consumer that renders on change renders what it starts with too
  if (!window.__URUI_DOUBLES_TEST__ && autoEcho()) dispatchEcho();
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
    panes: {
      get: fixtureHook('panes', 'get', 'got'),
      set: fixtureHook('panes', 'set', 'set'),
      select: fixtureHook('panes', 'select', 'selected'),
      panel: fixtureHook('panes', 'panel', 'paneled'),
      reveal: fixtureHook('panes', 'reveal', 'revealed')
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
