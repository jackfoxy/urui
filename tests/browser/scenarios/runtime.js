'use strict';

const assert = require('node:assert/strict');

const {fixture} = require('./support.js');

//  The shell runtime: theme, status, layout, and the two dialogs urui
//  emits.  Everything here is driven through the fixture's runtime, so a
//  contract change in `urui-js ++runtime` fails without a real consumer.

module.exports = async (env) => {
  const app = fixture(env);
  const {runtime} = app;
  const changes = () => env.fixture.calls.filter((call) => {
    return call.group === 'runtime' && call.method === 'change';
  }).length;

  //  theme
  assert.equal(runtime.theme.valid('dark'), 'dark');
  assert.equal(runtime.theme.valid('sepia'), 'system');
  const before = changes();
  assert.equal(runtime.theme.apply('dark'), 'dark');
  assert.equal(env.document.documentElement.dataset.theme, 'dark');
  assert.equal(env.document.documentElement.dataset.effectiveTheme, 'dark');
  assert.equal(env.elements['#theme'].value, 'dark');
  assert.equal(changes(), before + 1);
  assert.equal(runtime.theme.apply('system', false), 'light');
  assert.equal(changes(), before + 1);
  env.themeMedia.matches = true;
  assert.equal(runtime.theme.apply('system', false), 'dark');
  env.themeMedia.matches = false;

  //  the media listener only moves a system selection
  env.elements['#theme'].value = 'light';
  runtime.theme.systemChanged();
  assert.equal(env.document.documentElement.dataset.theme, 'system');
  env.elements['#theme'].value = 'system';
  env.themeMedia.matches = true;
  runtime.theme.systemChanged();
  assert.equal(env.document.documentElement.dataset.effectiveTheme, 'dark');
  env.themeMedia.matches = false;
  runtime.theme.apply('light', false);

  //  status lines are named by the config, not by the consumer
  assert.equal(runtime.status.set('editor', 'idle'), 'Ready');
  assert.equal(env.elements['#source-status'].textContent, 'Ready');
  assert.equal(runtime.status.set('result', 'working'), 'Working…');
  assert.equal(env.elements['#result-status'].textContent, 'Working…');
  assert.equal(runtime.status.set('result', 'Custom'), 'Custom');

  //  layout clamps to the configured limits
  assert.equal(runtime.layout.paneWidth(), 44);
  assert.equal(runtime.layout.setPaneWidth(99, false), 70);
  assert.equal(runtime.layout.setPaneWidth(1, false), 25);
  assert.equal(env.elements['#workspace'].values['--editor-width'], '25%');
  assert.equal(runtime.layout.setExplorerWidth(10), 180);
  assert.equal(env.elements['#workbench'].values['--explorer-width'], '180px');
  assert.equal(runtime.layout.maxExplorerWidth(), 790);

  //  collapse writes every attribute the frame promises
  assert.equal(runtime.layout.explorerOpen(), true);
  runtime.layout.setExplorerOpen(false);
  const collapse = env.elements['#explorer-collapse'];
  assert.equal(collapse['aria-expanded'], 'false');
  assert.equal(collapse['aria-label'], 'Expand explorer');
  assert.equal(collapse.textContent, '›');
  assert.equal(env.elements['#explorer'].classes.has('collapsed'), true);
  assert.equal(
    env.elements['#workbench'].classes.has('explorer-collapsed'),
    true
  );
  assert.equal(env.elements['#explorer-resizer'].disabled, true);
  runtime.layout.setExplorerOpen(true);
  assert.equal(collapse['aria-label'], 'Collapse explorer');
  assert.equal(env.elements['#explorer-resizer'].disabled, false);

  //  dialogs
  assert.equal(runtime.dialogs.helpIsOpen(), false);
  runtime.dialogs.setHelpOpen(true);
  assert.equal(runtime.dialogs.helpIsOpen(), true);
  assert.equal(env.elements['#help']['aria-expanded'], 'true');
  assert.equal(env.document.activeElement, env.elements['#close-help']);
  runtime.dialogs.setHelpOpen(false, true);
  assert.equal(env.elements['#help-panel'].hidden, true);
  assert.equal(env.document.activeElement, env.elements['#help']);

  runtime.dialogs.showError('clay says no');
  assert.equal(runtime.dialogs.errorIsOpen(), true);
  assert.equal(
    env.elements['#clay-error-message'].textContent,
    'clay says no'
  );
  assert.equal(env.document.activeElement, env.elements['#close-clay-error']);
  runtime.dialogs.hideError();
  assert.equal(env.elements['#clay-error-modal'].hidden, true);
  assert.equal(env.document.activeElement, env.elements['#help']);
  //  ---- document tabs ----------------------------------------------
  //
  //  The store is kind-parameterized over `config.kinds`; the fixture
  //  supplies only what differs between Text and Note.
  const tabs = runtime.tabs;
  assert.deepEqual(tabs.kinds.map((kind) => kind.name), ['text', 'note']);
  assert.equal(tabs.kind('text').leaf, 'txt');

  //  a path's last segment is the clay leaf, not a file name
  assert.equal(tabs.label('text', ''), 'Untitled');
  assert.equal(tabs.label('note', ''), 'Preview');
  assert.equal(tabs.label('text', 'notes/txt'), 'notes.txt');
  assert.equal(tabs.label('text', 'txt'), 'txt');

  const first = tabs.create('text', 'alpha');
  assert.equal(first.id, 'text-1');
  assert.equal(first.label, 'Untitled');
  assert.deepEqual(first.selection, {start: 0, end: 0});
  const second = tabs.create('text', 'beta', {path: 'notes/txt'});
  assert.equal(second.id, 'text-2');
  assert.equal(second.label, 'notes.txt');
  assert.equal(tabs.next('text'), 3);

  tabs.select('text', first.id);
  assert.equal(tabs.activeId('text'), first.id);
  tabs.select('text', second.id);
  assert.equal(tabs.activeId('text'), second.id);
  assert.equal(tabs.active('text'), second);
  const activated = env.fixture.calls.filter((call) => {
    return call.group === 'tabs' && call.method === 'activate';
  });
  assert.equal(activated.at(-1).args[0], second);
  assert.equal(activated.at(-1).args[1].previousId, first.id);

  //  the strip is rebuilt from the store, marked and labelled
  const strip = env.elements['#text-document-tabs'];
  const isAdd = (node) => {
    return String(node.className).includes('document-tab-add-control');
  };
  const controls = strip.children.filter((node) => !isAdd(node));
  assert.equal(controls.length, 2);
  assert.equal(controls[1].classes.has('active'), true);
  assert.equal(controls[1].children[0]['aria-selected'], 'true');
  assert.equal(controls[1].children[0].textContent, 'notes.txt');
  assert.equal(controls[1].children[1].textContent, 'X');
  assert.equal(controls[0].draggable, true);

  //  a dirty tab is marked O, and closing it asks first
  second.source = 'edited';
  tabs.render('text');
  assert.equal(tabs.dirty('text', second), true);
  assert.equal(strip.children[1].children[1].textContent, 'O');
  env.confirmationAnswers.push(false);
  tabs.close('text', second.id);
  assert.equal(tabs.list('text').length, 2);
  env.confirmationAnswers.push(true);
  tabs.close('text', second.id);
  assert.equal(tabs.list('text').length, 1);
  assert.equal(tabs.activeId('text'), first.id);

  //  the `+` control exists only for a kind that asked for one
  const add = strip.children.at(-1);
  assert.equal(isAdd(add), true);
  assert.equal(add.children[0]['aria-label'], 'Add empty Text tab');
  assert.equal(
    env.elements['#note-document-tabs'].children.some(isAdd),
    false
  );
  const empty = tabs.addEmpty('text');
  assert.equal(empty.source, '');
  assert.equal(tabs.activeId('text'), empty.id);

  //  reordering keeps the array identity a consumer may hold
  const held = tabs.list('text');
  tabs.move('text', empty.id, first.id, false);
  assert.deepEqual(held.map((tab) => tab.id), [empty.id, first.id]);
  assert.equal(tabs.list('text'), held);

  //  an unknown kind is a programming error, not a silent no-op
  assert.throws(() => tabs.list('nope'), /unknown document kind: nope/);
  //  ---- explorer ----------------------------------------------------
  //
  //  One strip holds the permanent trees, documentation tabs and
  //  reference tabs, and the user can reorder all of them together.
  const explorer = runtime.explorer;

  //  The permanent tabs are server-rendered by `urui-shell`; the doubles
  //  only hand out elements by selector, so wire the strip the way the
  //  page ships it before driving the view.
  for (const name of ['text-files', 'note-files']) {
    const tab = env.elements[`#${name}-tab`];
    tab.role = 'tab';
    tab.dataset.explorerView = name;
    tab.setAttribute('aria-controls', `${name}-panel`);
    const wrapper = new env.Element('div');
    wrapper.append(tab);
    env.elements['#explorer-tabs'].append(wrapper);
  }

  assert.equal(explorer.view(), 'text-files');
  assert.deepEqual(explorer.order(), ['text-files', 'note-files']);
  assert.equal(explorer.validView('text-files'), true);
  assert.equal(explorer.validView('nope'), false);

  //  an unknown view falls back to the first permanent one
  explorer.setView('nope');
  assert.equal(explorer.view(), 'text-files');
  explorer.setView('note-files');
  assert.equal(explorer.view(), 'note-files');
  assert.equal(env.elements['#note-files-tab']['aria-selected'], 'true');
  assert.equal(env.elements['#text-files-tab']['aria-selected'], 'false');
  assert.equal(env.elements['#note-files-panel'].hidden, false);
  assert.equal(env.elements['#text-files-panel'].hidden, true);
  explorer.setView('text-files');

  //  a documentation title repeats the site and the application; the
  //  tab keeps only the leaf
  assert.equal(explorer.docs.label('Docs > urui fixture > Guide'), 'Guide');
  assert.equal(explorer.docs.label('urui fixture'), 'Docs');
  assert.equal(explorer.docs.label(''), 'Docs');

  //  doc.toc: `/slug/mark` is a page, a bare `/slug` opens a folder,
  //  nesting is two spaces, and anything else is skipped
  const toc = explorer.docs.parseToc([
    '/guide/md      Guide',
    '/reference     Reference',
    '  /colors/md     Colors',
    '   /odd/md       ignored, odd indentation',
    '  /bad$name/md   ignored, unsafe segment',
    '/deep/one/two/md ignored, too many segments'
  ].join('\n'));
  assert.deepEqual(toc.map((entry) => [entry.slug, entry.folder]), [
    ['guide', false], ['reference', true]
  ]);
  assert.equal(toc[0].title, 'Guide');
  assert.deepEqual(toc[1].children.map((entry) => entry.title), ['Colors']);
  assert.equal(toc[1].children.length, 1);

  //  reference tabs mirror a document and block a second one
  const parent = tabs.list('text')[0];
  parent.source = 'referenced body';
  assert.equal(explorer.refs.can('text', parent.id), true);
  explorer.refs.add('text', parent.id);
  const ref = explorer.refs.list()[0];
  assert.equal(ref.kind, 'text');
  assert.equal(ref.parentId, parent.id);
  assert.equal(ref.source, 'referenced body');
  assert.equal(explorer.refs.can('text', parent.id), false);
  assert.equal(env.elements['#add-text-ref'].disabled, true);
  assert.equal(explorer.view(), ref.id);
  assert.equal(explorer.order().at(-1), ref.id);

  //  editing the parent updates the reference in place
  parent.source = 'edited body';
  explorer.refs.syncFromParent('text', parent.id);
  assert.equal(explorer.refs.list()[0].source, 'edited body');

  explorer.refs.close(ref.id);
  assert.equal(explorer.refs.list().length, 0);
  assert.equal(explorer.order().includes(ref.id), false);
  assert.equal(env.elements['#add-text-ref'].disabled, false);

  //  the tree collapses a directory holding one leaf into one row
  explorer.tree.render(['notes/txt', 'deep/leaf/txt'], 'text');
  const tree = env.elements['#text-files-tree'];
  assert.equal(tree['aria-busy'], 'false');
  const files = env.descendants(tree).filter((node) => {
    return String(node.className).includes('file-tree-file');
  });
  assert.deepEqual(files.map((node) => node.textContent),
    ['leaf/txt', 'notes/txt']);
  assert.deepEqual(files.map((node) => node.dataset.path),
    ['deep/leaf/txt', 'notes/txt']);
  const directories = env.descendants(tree).filter((node) => {
    return String(node.className).includes('file-tree-directory');
  });
  assert.deepEqual(directories.map((node) => node.textContent), ['deep/']);

  //  an empty listing names the kind's clay leaf, not its label
  explorer.tree.render([], 'text');
  assert.equal(tree.textContent, 'No /txt files found.');

  //  a path that escapes the root is refused
  assert.throws(() => explorer.tree.normalize('../secret'),
    /Enter a relative Clay path/);
  assert.throws(() => explorer.tree.normalize('a b'),
    /unsupported characters/);
  assert.equal(explorer.tree.normalize('/notes/txt'), 'notes/txt');
  //  ---- persistence -------------------------------------------------
  //
  //  One record, described slot by slot by `config.slots`.  Each slot
  //  names the json key as it appears on disk, so an existing record
  //  keeps loading with no migration.
  const session = runtime.session;
  assert.equal(session.key, 'urui-fixture.session.v1');
  assert.equal(session.version, 1);

  app.source = 'saved body';
  runtime.theme.apply('dark', false);
  session.save();
  const written = JSON.parse(env.saved.get(session.key));
  assert.equal(written.version, 1);
  assert.equal(written.source, 'saved body');
  //  a dotted slot key nests, it does not become a flat key
  assert.deepEqual(written.preferences, {theme: 'dark'});
  assert.equal(written['preferences.theme'], undefined);
  assert.deepEqual(Object.keys(written).filter((key) => {
    return key.startsWith('next');
  }).sort(), ['nextDocs', 'nextNoteTab', 'nextRef', 'nextTextTab']);
  assert.equal(Array.isArray(written.textTabs), true);
  assert.equal(written.activeTextTabId, tabs.activeId('text'));

  //  a record is only loaded when its version matches
  env.saved.set(session.key, JSON.stringify({version: 2, source: 'wrong'}));
  assert.equal(session.load(), undefined);
  env.saved.set(session.key, 'not json');
  assert.equal(session.load(), undefined);

  //  hostile values are dropped slot by slot, never the whole record
  env.saved.set(session.key, JSON.stringify({
    version: 1,
    source: 'restored body',
    paneWidth: 900,
    explorerWidth: 4,
    explorerOpen: false,
    explorerView: 'no-such-view',
    explorerOrder: ['note-files', 'ghost', 'note-files'],
    textTabs: [
      {id: 'text-4', source: 'four', label: 'Four'},
      {id: 'text-4', source: 'duplicate id'},
      {id: 'bad-id', source: 'wrong prefix'},
      {id: 'text-9', source: 42}
    ],
    activeTextTabId: 'text-404',
    nextTextTab: 1,
    view: {scale: 3}
  }));
  const restored = session.load();

  assert.equal(restored.source, 'restored body');
  assert.deepEqual(restored.view, {scale: 3});
  //  clamped to the configured pane limits, floored to minExplorer
  assert.equal(restored.paneWidth, 70);
  assert.equal(restored.explorerWidth, 180);
  assert.equal(restored.explorerOpen, false);
  //  an unknown view falls back; the order keeps only real views, once
  assert.equal(restored.explorerView, 'text-files');
  assert.deepEqual(restored.explorerOrder, ['note-files', 'text-files']);
  //  one duplicate, one bad prefix and one non-string source dropped
  assert.deepEqual(restored.textTabs.map((tab) => tab.id), ['text-4']);
  //  an active id that survived nothing falls back to the first tab
  assert.equal(restored.activeTextTabId, 'text-4');
  //  a saved id carries its own counter, however stale nextTextTab is
  assert.equal(restored.nextTextTab, 5);

  //  and the shell's half is applied, not merely returned
  assert.equal(tabs.list('text').length, 1);
  assert.equal(tabs.activeId('text'), 'text-4');
  assert.equal(runtime.layout.explorerOpen(), false);
  assert.deepEqual(explorer.order(), ['note-files', 'text-files']);
  runtime.layout.setExplorerOpen(true, false);

  //  ---- shared source in the url ------------------------------------
  //
  //  The fixture declares no share parameter, so the import is refused
  //  rather than silently accepting an arbitrary payload.
  assert.equal(app.api.config.shareParam, null);
  assert.equal(session.sourceFromUrl(), undefined);
  assert.throws(() => session.decodeSource('YWJj'),
    /does not share sources/);

  //  the byte limit counts utf-8, not code units
  assert.equal(session.byteLength('a🙂'), 5);
  assert.throws(() => session.validateSource('a\0b'), /null byte/);
  assert.throws(() => session.validateSource(7), /must be text/);
  assert.throws(() => session.validateSource('abcdef', 3), /3-byte limit/);
};
