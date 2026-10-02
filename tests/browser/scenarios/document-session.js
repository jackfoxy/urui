'use strict';

// Session save and restore of store tabs, against urui-fixture-docs: no
// tab is dropped for size, a bad tab drops alone, and a failing save is
// reported once per run of failures.

const assert = require('node:assert/strict');

const {fileWire} = require('./support.js');

module.exports = async (env) => {
  const {elements} = env;
  const fixture = env.window.uruiDocsFixture;
  assert.equal(fixture?.ready, true);
  const {runtime} = fixture;
  const docs = runtime.documents;
  const el = (id) => elements[`#${id}`];
  const {reply, entries} = fileWire(env);
  const stored = () => JSON.parse(env.saved.get(env.sessionKey));

  // ---- start: one draft, the tree loads both roots ----------------------
  await reply(entries());
  await reply(entries());
  const draft = docs.active('page');

  // ---- a tab over maxSource round-trips ---------------------------------
  const big = 'x'.repeat(262145);
  const large = docs.create('page', {text: big});
  const small = docs.create('page', {text: 'small'});
  runtime.session.save();
  let record = stored();
  assert.equal(record.pageTabs.length, 3);

  // ---- one bad tab drops alone ------------------------------------------
  record.pageTabs.push({
    ...record.pageTabs[2], id: 'page-99', text: 'bad\0text'
  });
  record.pageTabs.push({...record.pageTabs[2], id: 'page-98', text: 42});
  env.saved.set(env.sessionKey, JSON.stringify(record));
  runtime.session.load();
  assert.deepEqual(
    docs.list('page').map((tab) => tab.id),
    [draft.id, large.id, small.id]
  );
  assert.equal(docs.get('page', large.id).text.length, 262145);
  assert.equal(docs.get('page', small.id).text, 'small');

  // ---- a failing save says so once per run of failures ------------------
  const setItem = global.localStorage.setItem;
  global.localStorage.setItem = () => {
    throw new Error('quota exceeded');
  };
  el('urui-toast').hidden = true;
  runtime.session.save();
  assert.equal(el('urui-toast').hidden, false);
  assert.equal(el('urui-toast').dataset.kind, 'error');
  assert.match(el('urui-toast-message').textContent,
    /Session not saved: quota exceeded/);
  el('urui-toast').hidden = true;
  runtime.session.save();
  assert.equal(el('urui-toast').hidden, true, 'reported once per run');

  global.localStorage.setItem = setItem;
  runtime.session.save();
  record = stored();
  assert.equal(record.pageTabs.length, 3);

  global.localStorage.setItem = () => {
    throw new Error('quota exceeded');
  };
  runtime.session.save();
  assert.equal(el('urui-toast').hidden, false, 'a new run reports again');
  global.localStorage.setItem = setItem;
};
