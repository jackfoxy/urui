'use strict';

// The store module, against urui-fixture-docs: one `page` store with a
// root the user saves into (`pages`, md and txt) and one the app writes
// (`exports`, txt), one tree, and every file action.

const assert = require('node:assert/strict');

module.exports = async (env) => {
  const {elements, descendants} = env;
  const fixture = env.window.uruiDocsFixture;
  assert.equal(fixture?.ready, true);
  const {runtime} = fixture;
  const docs = runtime.documents;
  const el = (id) => elements[`#${id}`];

  //  The file wire answers each parked request with a json reply.
  const reply = async (body, status = 200) => {
    for (let wait = 0; wait < 8 && !env.requests.length; wait += 1) {
      await env.tick();
    }
    const request = env.requests.shift();
    assert(request, 'expected a file-wire request');
    assert.equal(request.url, '/apps/urui-fixture/files');
    request.resolve({
      ok: status < 400,
      status,
      headers: {get: () => 'application/json'},
      text: async () => JSON.stringify(body)
    });
    for (let wait = 0; wait < 4; wait += 1) await env.tick();
    return JSON.parse(request.options.body);
  };
  const entries = (...paths) => {
    return {ok: true, entries: paths.map((path) => ({path, kind: 'file'}))};
  };

  // ---- start: one draft, the tree loads both roots ----------------------
  let sent = await reply(entries(['pages', 'intro', 'md']));
  assert.deepEqual(sent, {op: 'browse', scope: ['pages']});
  sent = await reply(entries(['exports', 'report', 'txt']));
  assert.deepEqual(sent, {op: 'browse', scope: ['exports']});
  assert.equal(docs.list('page').length, 1);
  const draft = docs.active('page');
  assert.equal(draft.label, 'page');
  assert.equal(docs.dirty('page', draft.id), false);
  const tree = el('page-files-tree');
  assert(descendants(tree).some((node) => {
    return node.dataset?.path === 'pages/intro/md';
  }));
  assert.equal(el('page-display').hidden, false,
    'a draft previews by its store\'s default mark');

  // ---- labels: drafts count up, reusing the lowest --------------------------
  const second = docs.create('page');
  assert.equal(second.label, 'page 2');
  await docs.close('page', second.id);
  assert.equal(docs.create('page').label, 'page 2');
  await docs.close('page', docs.active('page').id);

  // ---- editing marks the tab dirty; its close control says so --------------
  docs.select('page', draft.id);
  const editor = docs.editor('page');
  editor.setSource('# Plan\n\nSome *text*.', {history: 'reset'});
  assert.equal(docs.active('page').text, '# Plan\n\nSome *text*.');
  assert.equal(docs.dirty('page', draft.id), true);
  const strip = el('editor-pane-document-tabs');
  const close = descendants(strip).find((node) => {
    return node.className === 'document-tab-close';
  });
  assert.match(close.getAttribute('aria-label'), /unsaved changes/);

  // ---- Save As: dialog, exists, confirm, overwrite ------------------------
  let saving = docs.save('page');
  await env.tick();
  assert.equal(el('urui-file-dialog').hidden, false);
  await reply(entries());
  assert.equal(el('urui-file-dialog-root-field').hidden, true,
    'one saveable root: no location picker');
  assert.equal(el('urui-file-dialog-mark-field').hidden, false,
    'two marks: a format picker');
  el('urui-file-dialog-path').value = 'plans/first';
  el('urui-file-dialog-mark').value = 'md';
  el('urui-file-dialog-confirm').onclick();
  sent = await reply({
    ok: false,
    error: {code: 'exists', message: 'exists', retryable: false, details: []}
  }, 409);
  assert.deepEqual(sent, {
    op: 'save', path: ['pages', 'plans', 'first', 'md'],
    text: '# Plan\n\nSome *text*.', base: null, overwrite: false
  });
  assert.equal(el('urui-confirm').hidden, false);
  assert.match(el('urui-confirm-message').textContent, /already exists/);
  el('urui-confirm-ok').listeners.click();
  sent = await reply({ok: true, hash: '0vfirst'});
  assert.equal(sent.overwrite, true);
  await saving;
  await reply(entries(['pages', 'plans', 'first', 'md']));
  await reply(entries());
  const first = docs.active('page');
  assert.equal(first.label, 'first.md');
  assert.equal(first.hash, '0vfirst');
  assert.equal(docs.dirty('page', first.id), false);
  assert.equal(el('urui-toast').hidden, false);
  assert.match(el('urui-toast-message').textContent, /Saved first\.md/);

  // ---- a plain Save sends the hash back as `base` ---------------------------
  editor.setSource('# Plan\n\nMore.', {history: 'reset'});
  saving = docs.save('page');
  sent = await reply({ok: true, hash: '0vsecond'});
  assert.equal(sent.base, '0vfirst');
  assert.equal(sent.overwrite, false);
  await saving;
  await reply(entries(['pages', 'plans', 'first', 'md']));
  await reply(entries());

  // ---- md previews; the toggle swaps editor and preview -------------------
  assert.equal(el('page-display').hidden, false);
  const [sourceButton, previewButton] = el('page-display').children;
  previewButton.listeners.click();
  assert.equal(el('page-preview').hidden, false);
  assert.equal(el('page-editor').hidden, true);
  assert(descendants(el('page-preview')).some((node) => {
    return node.localName === 'h1' && descendants(node).some((text) => {
      return text.textContent === 'Plan';
    });
  }));
  sourceButton.listeners.click();
  assert.equal(el('page-preview').hidden, true);
  assert.equal(el('page-editor').hidden, false);

  // ---- reopening: clean reloads, dirty asks first -------------------------
  let opening = docs.open('page', ['pages', 'plans', 'first', 'md']);
  sent = await reply({ok: true, text: 'from clay', hash: '0vthird'});
  assert.deepEqual(sent, {op: 'load', path: ['pages', 'plans', 'first', 'md']});
  await opening;
  assert.equal(docs.list('page').length, 1, 'no second tab for one path');
  assert.equal(docs.active('page').text, 'from clay');
  editor.setSource('local edit', {history: 'reset'});
  opening = docs.open('page', ['pages', 'plans', 'first', 'md']);
  await env.tick();
  assert.equal(el('urui-confirm').hidden, false);
  assert.match(el('urui-confirm-message').textContent, /Discard unsaved/);
  el('urui-confirm-cancel').listeners.click();
  await opening;
  assert.equal(env.requests.length, 0, 'declined: nothing loaded');
  assert.equal(docs.active('page').text, 'local edit');

  // ---- closing a dirty tab asks; declining keeps it ------------------------
  const closing = docs.close('page', first.id);
  await env.tick();
  assert.equal(el('urui-confirm').hidden, false);
  el('urui-confirm-cancel').listeners.click();
  assert.equal(await closing, false);
  assert.equal(docs.list('page').length, 1);

  // ---- delete: the open tab becomes an unsaved draft ----------------------
  const removing = docs.remove('page', ['pages', 'plans', 'first', 'md']);
  await env.tick();
  assert.match(el('urui-confirm-message').textContent, /cannot be undone/);
  el('urui-confirm-ok').listeners.click();
  sent = await reply({ok: true});
  assert.equal(sent.op, 'delete');
  assert.equal(await removing, true);
  await reply(entries());
  await reply(entries());
  const orphan = docs.active('page');
  assert.equal(orphan.path, null);
  assert.equal(orphan.label, 'first.md');
  assert.equal(docs.dirty('page', orphan.id), true);

  // ---- an app-written root: read-only, no Save -----------------------------
  opening = docs.open('page', ['exports', 'report', 'txt']);
  await reply({ok: true, text: 'report', hash: '0vreport'});
  const report = await opening;
  assert.equal(report.label, 'report.txt');
  assert.equal(el('page-save').hidden, true);
  assert.equal(el('page-editor').aceReadOnly, true);
  docs.select('page', orphan.id);
  assert.equal(el('page-save').hidden, false);
  assert.equal(el('page-editor').aceReadOnly, false);

  // ---- references follow their tab -----------------------------------------
  const ref = docs.addRef('page', orphan.id);
  assert.equal(ref.kind, 'page');
  assert.equal(ref.label, 'first.md');
  editor.setSource('changed text', {history: 'reset'});
  assert.equal(ref.data.text, 'changed text');

  // ---- an app action uses the file dialog with its own field ---------------
  const extra = new env.Element('select');
  const picking = docs.pickPath({
    store: 'page', scope: ['exports'], title: 'Save output', extra, mark: false
  });
  await env.tick();
  assert.equal(el('urui-file-dialog-title').textContent, 'Save output');
  assert.equal(el('urui-file-dialog-extra').children[0], extra);
  await reply(entries(['exports', 'report', 'txt']));
  el('urui-file-dialog-path').value = 'runs/latest';
  el('urui-file-dialog-confirm').onclick();
  assert.deepEqual(await picking, ['exports', 'runs', 'latest', 'txt']);
  assert.equal(el('urui-file-dialog-extra').children.length, 0);

  // ---- Escape dismisses a document dialog -----------------------------------
  const cancelled = docs.pickPath({store: 'page', scope: ['pages']});
  await env.tick();
  await reply(entries());
  runtime.shortcuts.dispatch({
    key: 'Escape', preventDefault: () => {}, stopPropagation: () => {}
  });
  assert.equal(await cancelled, null);
  assert.equal(el('urui-file-dialog').hidden, true);

  // ---- the session keeps tabs, hashes, and folds ---------------------------
  runtime.session.save();
  const record = JSON.parse(env.saved.get(env.sessionKey));
  assert.equal(record.pageTabs.length, 2);
  assert.equal(record.pageTabs[1].hash, '0vreport');
  assert.deepEqual(record.pageTabs[1].path, ['exports', 'report', 'txt']);
  assert.equal(record.pageTabs[0].label, undefined, 'labels are derived');
  assert.equal(record.activePageId, orphan.id);
  assert.deepEqual(record.fileTrees, {});
};
