'use strict';

// Responses that arrive after the tab moved on, against urui-fixture-docs:
// an open or save never overwrites edits made while it was out, and never
// revives a tab closed meanwhile.

const assert = require('node:assert/strict');

const {fileWire} = require('./support.js');

module.exports = async (env) => {
  const {elements} = env;
  const fixture = env.window.uruiDocsFixture;
  assert.equal(fixture?.ready, true);
  const docs = fixture.runtime.documents;
  const el = (id) => elements[`#${id}`];
  const {take, answer, reply, entries} = fileWire(env);
  const onPath = (path) => docs.list('page').filter((tab) => {
    return JSON.stringify(tab.path) === JSON.stringify(path);
  });
  const settleTrees = async () => {
    await reply(entries());
    await reply(entries());
  };

  const A = ['pages', 'a', 'md'];
  const B = ['pages', 'b', 'md'];

  // ---- start: one draft, the tree loads both roots ----------------------
  await settleTrees();
  const draft = docs.active('page');
  const editor = docs.editor('page');
  let opening = docs.open('page', A);
  await reply({ok: true, text: 'one', hash: '0va1'});
  const a = await opening;
  assert.equal(a.text, 'one');

  // ---- an edit made during a reload asks again; declining keeps it ------
  opening = docs.open('page', A);
  let request = await take();
  editor.setSource('mine', {history: 'reset'});
  await answer(request, {ok: true, text: 'theirs', hash: '0va2'});
  assert.equal(el('urui-confirm').hidden, false);
  assert.match(el('urui-confirm-message').textContent, /Discard unsaved/);
  el('urui-confirm-cancel').listeners.click();
  assert.equal(await opening, a);
  assert.equal(a.text, 'mine');
  assert.equal(a.hash, '0va1', 'the declined response leaves the hash');
  assert.equal(docs.dirty('page', a.id), true);
  assert.equal(editor.getSource(), 'mine');

  // ---- accepting both asks takes the response ---------------------------
  opening = docs.open('page', A);
  await env.tick();
  el('urui-confirm-ok').listeners.click();
  request = await take();
  editor.setSource('mine again', {history: 'reset'});
  await answer(request, {ok: true, text: 'theirs', hash: '0va2'});
  assert.equal(el('urui-confirm').hidden, false);
  el('urui-confirm-ok').listeners.click();
  await opening;
  assert.equal(a.text, 'theirs');
  assert.equal(a.hash, '0va2');
  assert.equal(docs.dirty('page', a.id), false);
  assert.equal(editor.getSource(), 'theirs');

  // ---- a tab closed during its reload is not revived --------------------
  opening = docs.open('page', A);
  request = await take();
  assert.equal(await docs.close('page', a.id), true);
  await answer(request, {ok: true, text: 'late', hash: '0va3'});
  assert.equal(await opening, undefined);
  assert.equal(onPath(A).length, 0);

  // ---- two opens of one path load one after the other -------------------
  const first = docs.open('page', B);
  const second = docs.open('page', B);
  request = await take();
  for (let wait = 0; wait < 4; wait += 1) await env.tick();
  assert.equal(env.requests.length, 0, 'the second open waits');
  await answer(request, {ok: true, text: 'b1', hash: '0vb1'});
  const b = await first;
  await reply({ok: true, text: 'b2', hash: '0vb2'});
  assert.equal(await second, b);
  assert.equal(onPath(B).length, 1, 'one tab for one path');
  assert.equal(b.text, 'b2');

  // ---- switching tabs during a reload keeps the other tab's edits -------
  opening = docs.open('page', B);
  request = await take();
  docs.select('page', draft.id);
  editor.setSource('draft edit', {history: 'reset'});
  await answer(request, {ok: true, text: 'b3', hash: '0vb3'});
  await opening;
  assert.equal(docs.active('page').id, b.id);
  assert.equal(b.text, 'b3');
  assert.equal(docs.dirty('page', b.id), false);
  assert.equal(docs.get('page', draft.id).text, 'draft edit');

  // ---- an edit made during a save stays, unsaved ------------------------
  editor.setSource('v1', {history: 'reset'});
  let saving = docs.save('page');
  request = await take();
  editor.setSource('v2', {history: 'reset'});
  const sent = await answer(request, {ok: true, hash: '0vb4'});
  assert.equal(sent.text, 'v1');
  await settleTrees();
  assert.equal(await saving, b);
  assert.equal(b.text, 'v2');
  assert.equal(b.clean, 'v1');
  assert.equal(b.hash, '0vb4');
  assert.equal(docs.dirty('page', b.id), true);
  assert.equal(editor.getSource(), 'v2');

  // ---- a tab closed during its save is not revived ----------------------
  saving = docs.save('page');
  request = await take();
  const closing = docs.close('page', b.id);
  await env.tick();
  el('urui-confirm-ok').listeners.click();
  assert.equal(await closing, true);
  await answer(request, {ok: true, hash: '0vb5'});
  await settleTrees();
  assert.equal(await saving, undefined);
  assert.equal(onPath(B).length, 0);
  assert.match(el('urui-toast-message').textContent, /Saved b\.md/);
};
