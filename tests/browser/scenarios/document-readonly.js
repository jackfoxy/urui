'use strict';

// A store in a %read-only pane writes nothing, and a config the runtime
// cannot honour is refused at start, against urui-fixture-docs.  The
// fixture's editor pane is switched to read-only in place: the runtime
// reads a pane's mode each time it asks.

const assert = require('node:assert/strict');

const {fileWire} = require('./support.js');

module.exports = async (env) => {
  const {elements} = env;
  const fixture = env.window.uruiDocsFixture;
  assert.equal(fixture?.ready, true);
  const {runtime} = fixture;
  const docs = runtime.documents;
  const el = (id) => elements[`#${id}`];
  const config = env.window.URUI_CONFIG;
  const {reply, entries} = fileWire(env);
  const settle = async () => {
    for (let wait = 0; wait < 4; wait += 1) await env.tick();
  };

  // ---- start: one draft, the tree loads both roots ----------------------
  await reply(entries());
  await reply(entries());
  const draft = docs.active('page');
  const editor = docs.editor('page');
  editor.setSource('draft text', {history: 'reset'});
  assert.equal(el('page-editor').aceReadOnly, false);

  // ---- read-only: the editor locks, drafts included ---------------------
  config.panes.editor.mode = 'read-only';
  docs.select('page', draft.id, {reactivate: true});
  assert.equal(el('page-editor').aceReadOnly, true);
  assert.equal(el('page-save').hidden, true);
  assert.equal(el('page-save-as').hidden, true);

  // ---- no save by API, button, or shortcut ------------------------------
  assert.equal(await docs.save('page'), undefined);
  assert.equal(await docs.save('page', {as: true}), undefined);
  el('page-save').listeners.click();
  config.shortcuts.push({binding: 'Ctrl-S', command: 'save:page', when: 'always'});
  runtime.shortcuts.dispatch({
    key: 's', ctrlKey: true, target: env.document.activeElement,
    preventDefault() {}, stopPropagation() {}
  });
  config.shortcuts.pop();
  await settle();
  assert.equal(env.requests.length, 0, 'nothing went out');
  assert.equal(el('urui-file-dialog').hidden, true);

  // ---- no delete, no programmatic edit ----------------------------------
  assert.equal(await docs.remove('page', ['pages', 'a', 'md']), false);
  assert.equal(el('urui-confirm').hidden, true);
  assert.equal(docs.update('page', draft.id, {text: 'changed'}), undefined);
  assert.equal(docs.get('page', draft.id).text, 'draft text');
  assert.equal(editor.replaceRange(0, 5, 'x'), false);
  assert.equal(editor.getSource(), 'draft text');

  // ---- back to read-write: all of it returns ----------------------------
  config.panes.editor.mode = 'read-write';
  docs.select('page', draft.id, {reactivate: true});
  assert.equal(el('page-editor').aceReadOnly, false);
  assert.equal(el('page-save').hidden, false);
  assert.equal(el('page-save-as').hidden, false);
  docs.update('page', draft.id, {text: 'changed'});
  assert.equal(docs.get('page', draft.id).text, 'changed');

  // ---- a config the runtime cannot honour is refused --------------------
  const stores = config.files.stores;
  stores.push({...stores[0]});
  assert.throws(() => env.window.urui.runtime({}),
    /urui config: duplicate store "page"/);
  stores.pop();

  const level = config.panes.editor.bands
    .find((band) => band.item?.kind === 'tabs').item.levels[0];
  level.kind = 'missing';
  assert.throws(() => env.window.urui.runtime({}),
    /pane "editor-pane" binds unknown store "missing"; store "page" has no %documents level/);
  level.kind = 'page';

  const panes = config.panes;
  const result = panes.result;
  panes.result = {...panes.editor, role: 'result'};
  assert.throws(() => env.window.urui.runtime({}),
    /duplicate pane id "editor-pane"; store "page" is bound by 2 levels/);
  panes.result = result;
};
