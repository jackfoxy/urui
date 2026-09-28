'use strict';

const assert = require('node:assert/strict');

const {fixture} = require('./support.js');

//  The shell runtime: theme, status, layout, help, document tabs, the
//  explorer, and persistence.  Everything here is driven through the fixture's runtime, so a
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

  //  the Clay error modal is retired: file errors are toasts
  assert.equal(runtime.dialogs.showError, undefined);
  //  ---- document tabs ----------------------------------------------
  //
  //  The strips belong to the fixture's two stores; the fixture supplies
  //  data, never how a tab behaves.
  const docs = runtime.documents;
  assert.deepEqual(app.api.config.files.stores.map((item) => item.name),
    ['text', 'note']);

  const first = docs.create('text', {text: 'alpha'});
  assert.equal(first.id, 'text-1');
  assert.equal(first.label, 'Untitled');
  assert.deepEqual(first.selection, {start: 0, end: 0});
  const second = docs.create('text', {
    text: 'beta', path: ['notes', 'txt'], hash: '0vnotes'
  });
  assert.equal(second.id, 'text-2');
  //  a path's last segment is the mark; labels show the display extension
  assert.equal(second.label, 'notes.text');
  assert.equal(docs.active('text'), second);
  const activated = env.fixture.calls.filter((call) => {
    return call.group === 'tabs' && call.method === 'activate';
  });
  assert.equal(activated.at(-1).args[0], second);
  assert.equal(activated.at(-1).args[1].previousId, first.id);

  //  the strip is rebuilt from the store, marked and labelled
  const strip = env.elements['#editor-pane-document-tabs'];
  const isAdd = (node) => {
    return String(node.className).includes('document-tab-add-control');
  };
  const controls = strip.children.filter((node) => !isAdd(node));
  assert.equal(controls.length, 2);
  assert.equal(controls[1].classes.has('active'), true);
  assert.equal(controls[1].children[0]['aria-selected'], 'true');
  assert.equal(controls[1].children[0].textContent, 'notes.text');
  assert.equal(controls[1].children[1].textContent, '×');
  assert.equal(controls[0].draggable, true);

  //  a dirty tab is marked, and closing it asks first
  docs.update('text', second.id, {text: 'edited'});
  assert.equal(docs.dirty('text', second.id), true);
  assert.equal(strip.children[1].children[1].textContent, '●');
  let closing = docs.close('text', second.id);
  await env.tick();
  assert.equal(env.elements['#urui-confirm'].hidden, false);
  env.elements['#urui-confirm-cancel'].listeners.click();
  assert.equal(await closing, false);
  assert.equal(docs.list('text').length, 2);
  closing = docs.close('text', second.id);
  await env.tick();
  env.elements['#urui-confirm-ok'].listeners.click();
  assert.equal(await closing, true);
  assert.equal(docs.list('text').length, 1);
  assert.equal(docs.active('text'), first);

  //  the `+` control exists only for a store whose level asked for one
  const add = strip.children.at(-1);
  assert.equal(isAdd(add), true);
  assert.equal(add.children[0]['aria-label'], 'Add empty Text tab');
  assert.equal(
    env.elements['#result-pane-document-tabs'].children.some(isAdd),
    false
  );
  add.children[0].listeners.click();
  const empty = docs.active('text');
  assert.equal(empty.text, 'fixture source');
  assert.equal(empty.label, 'Untitled 2');

  //  an unknown store is a programming error, not a silent no-op
  assert.throws(() => docs.list('nope'), /unknown document store: nope/);
  //  ---- explorer ----------------------------------------------------
  //
  //  One strip holds the permanent trees, documentation tabs and
  //  reference tabs, and the user can reorder all of them together.
  const explorer = runtime.explorer;

  //  The permanent tabs are server-rendered by `urui-shell` into the
  //  strip its %views level names, `{pane}-{level}-tabs`; the doubles
  //  seed that strip for both consumers.

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

  //  a reference mirrors its document, and a second one shows the first
  const parent = docs.list('text')[0];
  docs.update('text', parent.id, {text: 'referenced body'});
  const ref = docs.addRef('text', parent.id);
  assert.equal(ref.kind, 'text');
  assert.equal(ref.parentId, parent.id);
  assert.equal(ref.data.text, 'referenced body');
  assert.equal(docs.addRef('text', parent.id), ref);
  assert.equal(explorer.refs.list().length, 1);
  assert.equal(explorer.view(), ref.id);
  assert.equal(explorer.order().at(-1), ref.id);

  //  editing the parent updates the reference in place
  docs.update('text', parent.id, {text: 'edited body'});
  assert.equal(explorer.refs.list()[0].data.text, 'edited body');

  explorer.refs.close(ref.id);
  assert.equal(explorer.refs.list().length, 0);
  assert.equal(explorer.order().includes(ref.id), false);
  //  ---- persistence -------------------------------------------------
  //
  //  One record, described slot by slot by `config.slots`.  Each slot
  //  names the json key as it appears on disk, so an existing record
  //  keeps loading with no migration.
  const session = runtime.session;
  assert.equal(session.key, 'urui-fixture.session.v1');
  assert.equal(session.version, 1);

  app.view.scale = 3;
  runtime.theme.apply('dark', false);
  session.save();
  const written = JSON.parse(env.saved.get(session.key));
  assert.equal(written.version, 1);
  assert.deepEqual(written.view, {scale: 3});
  //  a dotted slot key nests, it does not become a flat key
  assert.deepEqual(written.preferences, {
    autoEcho: true, theme: 'dark', layout: 'columns', keybindings: 'ace'
  });
  assert.equal(written.resultOpen, true);
  assert.equal(written['preferences.theme'], undefined);
  assert.deepEqual(Object.keys(written).filter((key) => {
    return key.startsWith('next');
  }).sort(), ['nextDocs', 'nextNoteTab', 'nextRef', 'nextTextTab']);
  assert.equal(Array.isArray(written.textTabs), true);
  assert.equal(written.activeTextTabId, docs.active('text').id);
  assert.equal(written.textTabs[0].label, undefined, 'labels are derived');

  //  a record is only loaded when its version matches
  env.saved.set(session.key, JSON.stringify({version: 2, view: {scale: 9}}));
  assert.equal(session.load(), undefined);
  env.saved.set(session.key, 'not json');
  assert.equal(session.load(), undefined);

  //  hostile values are dropped slot by slot, never the whole record
  env.saved.set(session.key, JSON.stringify({
    version: 1,
    paneWidth: 900,
    explorerWidth: 4,
    explorerOpen: false,
    explorerView: 'no-such-view',
    explorerOrder: ['note-files', 'ghost', 'note-files'],
    textTabs: [
      {id: 'text-4', text: 'four', draft: 'Four'},
      {id: 'text-4', text: 'duplicate id'},
      {id: 'bad-id', text: 'wrong prefix'},
      {id: 'text-9', text: 42},
      {id: 'text-5', text: 'outside', path: ['notes', 'md']}
    ],
    activeTextTabId: 'text-404',
    nextTextTab: 1,
    view: {scale: 3}
  }));
  const restored = session.load();

  assert.deepEqual(restored.view, {scale: 3});
  //  clamped to the configured pane limits, floored to minExplorer
  assert.equal(restored.paneWidth, 70);
  assert.equal(restored.explorerWidth, 180);
  assert.equal(restored.explorerOpen, false);
  //  an unknown view falls back; the order keeps only real views, once
  assert.equal(restored.explorerView, 'text-files');
  assert.deepEqual(restored.explorerOrder, ['note-files', 'text-files']);
  //  one duplicate, one bad prefix and one non-string text dropped; a
  //  path no root of the store admits is kept as a draft
  assert.deepEqual(restored.textTabs.map((tab) => tab.id),
    ['text-4', 'text-5']);
  assert.equal(restored.textTabs[1].path, null);
  //  an active id that survived nothing falls back to the first tab
  assert.equal(restored.activeTextTabId, 'text-4');
  //  a saved id carries its own counter, however stale nextTextTab is
  assert.equal(restored.nextTextTab, 6);

  //  and the shell's half is applied, not merely returned
  assert.equal(docs.list('text').length, 2);
  assert.equal(docs.list('text')[0].label, 'Four');
  assert.equal(runtime.layout.explorerOpen(), false);
  assert.deepEqual(explorer.order(), ['note-files', 'text-files']);
  runtime.layout.setExplorerOpen(true, false);

  //  ---- shared source in the url ------------------------------------
  //
  //  The text store declares a share parameter, so a link carries one
  //  source and only what `encodeSource` itself would have produced.
  const share = app.api.config.files.stores[0].share;
  assert.deepEqual(share, {name: 'text', max: 12_288, paramMax: 16_384});
  assert.equal(session.encodeSource('abc'), 'YWJj');
  assert.equal(session.decodeSource('YWJj', share), 'abc');
  assert.throws(() => session.decodeSource('YWJj'), /does not share/);
  assert.throws(() => session.decodeSource('YWJj=', share), /is invalid/);
  assert.throws(() => session.decodeSource('', share),
    /missing or too large/);

  //  the byte limit counts utf-8, not code units
  assert.equal(session.byteLength('a🙂'), 5);
  assert.throws(() => session.validateSource('a\0b'), /null byte/);
  assert.throws(() => session.validateSource(7), /must be text/);
  assert.throws(() => session.validateSource('abcdef', 3), /3-byte limit/);
};
