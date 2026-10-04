'use strict';

// The seams an application with its own explorer uses, against
// urui-fixture-docs: a root admitting any mark, tabs the server loads
// read-only, application items in the file context menu, application
// modals, and the registered previewers.

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

  // ---- start: the tree loads both roots ---------------------------------
  await reply(entries());
  await reply(entries());

  // ---- a root listing no marks admits any, and a readonly load locks ----
  const store = config.files.stores.find((item) => item.name === 'page');
  store.roots.push({scope: ['any'], marks: [], ext: null, save: true});
  let opening = docs.open('page', ['any', 'photo', 'png']);
  let sent = await reply({ok: true, text: 'bytes', hash: '0vb', readonly: true});
  assert.deepEqual(sent, {op: 'load', path: ['any', 'photo', 'png']});
  const viewed = await opening;
  assert.equal(viewed.readonly, true);
  assert.equal(viewed.label, 'photo.png');
  assert.equal(el('page-editor').aceReadOnly, true);
  assert.equal(el('page-save').disabled, true);
  assert.equal(await docs.save('page'), undefined);
  assert.equal(env.requests.length, 0, 'a read-only tab saves nowhere');

  opening = docs.open('page', ['any', 'notes', 'txt']);
  await reply({ok: true, text: 'plain', hash: '0vn'});
  const plain = await opening;
  assert.equal(plain.readonly, undefined);
  assert.equal(el('page-editor').aceReadOnly, false);
  assert.equal(el('page-save').disabled, false);

  // ---- the flag survives the session, and nothing else gains it -------
  runtime.session.save();
  const record = JSON.parse(env.saved.get(env.sessionKey));
  const stored = record.pageTabs || Object.values(record).find((value) => {
    return Array.isArray(value) && value.some((tab) => tab?.path);
  });
  const find = (text) => stored.find((tab) => tab.path?.join('/') === text);
  assert.equal(find('any/photo/png').readonly, true);
  assert.equal('readonly' in find('any/notes/txt'), false);

  // ---- application items in the file context menu ----------------------
  const chosen = [];
  const app = env.window.urui.runtime({
    contextMenu: {
      items: [
        {id: 'attributes', label: 'File attributes…'},
        {id: 'upload', label: 'Upload…'}
      ],
      state: (target) => ({
        open: {hidden: target.entry !== 'file'},
        upload: {hidden: target.entry === 'file'},
        delete: {disabled: target.entry !== 'file'}
      }),
      select: (id, target) => chosen.push([id, target])
    }
  });
  const menu = el('file-context-menu');
  const item = (id) => {
    return el(id) || menu.children.find((node) => node.id === id);
  };
  assert.deepEqual(menu.children, [
    item('file-context-open'), item('file-context-attributes'),
    item('file-context-upload'), item('file-context-delete')
  ], 'application items sit between Open and Delete');
  const source = env.document.createElement('button');
  const event = {type: 'click', preventDefault() {}, stopPropagation() {}};
  app.explorer.context.open('page', ['pages', 'docs'], source, event,
    {entry: 'directory', view: 'apps'});
  assert.equal(menu.hidden, false);
  assert.equal(item('file-context-open').hidden, true);
  assert.equal(item('file-context-upload').hidden, false);
  assert.equal(item('file-context-delete').disabled, true);
  assert.equal(app.explorer.context.target().view, 'apps');
  item('file-context-upload').listeners.click();
  assert.equal(menu.hidden, true);
  assert.equal(chosen.length, 1);
  assert.equal(chosen[0][0], 'upload');
  assert.deepEqual(chosen[0][1].path, ['pages', 'docs']);
  assert.equal(chosen[0][1].entry, 'directory');
  assert.equal(chosen[0][1].kind, 'page');

  app.explorer.context.open('page', ['pages', 'a', 'md'], source, event,
    {entry: 'file'});
  assert.equal(item('file-context-open').hidden, false);
  assert.equal(item('file-context-upload').hidden, true);
  assert.equal(item('file-context-delete').disabled, false);
  app.explorer.context.close();

  // ---- an application modal joins the shared controller -----------------
  const dialog = env.document.createElement('aside');
  dialog.hidden = true;
  const field = env.document.createElement('input');
  dialog.append(field);
  env.document.body.append(dialog);
  const modal = app.dialogs.modal(dialog);
  modal.open(field);
  assert.equal(dialog.hidden, false);
  assert.equal(modal.isOpen(), true);
  assert.equal(env.document.activeElement, field);
  app.shortcuts.dispatch({
    key: 'Escape', target: field, preventDefault() {}, stopPropagation() {}
  });
  assert.equal(dialog.hidden, true, 'Escape closes it');
  assert.equal(modal.isOpen(), false);

  // ---- registered previewers can be drawn elsewhere ---------------------
  assert.equal(typeof docs.previews.get('md'), 'function');
  assert.equal(typeof docs.previews.get('md').render, 'function');
  assert.equal(docs.previews.get('png'), undefined);
  store.roots.pop();
};
