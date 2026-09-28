'use strict';

const assert = require('node:assert/strict');

const {fixture, lastCall} = require('./support.js');

//  The fixture's two stores on urui's one file wire: each tree shows only
//  its own marks, labels carry the display extension, a store's actions
//  are bound by id, and a reference follows its tab.  The documents
//  scenario covers the wire's conflicts and deletes in depth.

module.exports = async (env) => {
  const {api, runtime} = fixture(env);
  const results = {
    browse: 'browsed', load: 'loaded', save: 'saved', delete: 'deleted'
  };
  for (const method of ['browse', 'load', 'save', 'delete']) {
    assert.equal(api.files[method]('text', ['sample']), results[method]);
    assert.deepEqual(
      Array.from(lastCall(env, 'files', method).args),
      ['text', ['sample']]
    );
  }
  assert.equal(api.config.files.url, '/apps/urui-fixture/files');
  assert.deepEqual(api.config.files.stores.map((store) => store.name),
    ['text', 'note']);

  const docs = runtime.documents;
  const el = (id) => env.elements[`#${id}`];
  const reply = async (body) => {
    for (let wait = 0; wait < 8 && !env.requests.length; wait += 1) {
      await env.tick();
    }
    const request = env.requests.shift();
    assert(request, 'expected a file-wire request');
    assert.equal(request.url, '/apps/urui-fixture/files');
    request.resolve({
      ok: true,
      status: 200,
      headers: {get: () => 'application/json'},
      text: async () => JSON.stringify(body)
    });
    for (let wait = 0; wait < 4; wait += 1) await env.tick();
    return JSON.parse(request.options.body);
  };
  const listing = {
    ok: true,
    entries: [
      {path: ['left', 'txt'], kind: 'file'},
      {path: ['preview', 'md'], kind: 'file'}
    ]
  };

  //  one draft each, and both trees browse the whole file root
  docs.start();
  assert.deepEqual(await reply(listing), {op: 'browse', scope: []});
  assert.deepEqual(await reply(listing), {op: 'browse', scope: []});
  assert.equal(docs.active('text').label, 'Untitled');
  assert.equal(docs.active('text').text, 'fixture source');
  assert.equal(docs.active('note').label, 'Preview');
  const paths = (id) => env.descendants(el(id)).map((node) => {
    return node.dataset?.path;
  }).filter(Boolean);
  assert.deepEqual(paths('text-files-tree'), ['left/txt']);
  assert.deepEqual(paths('note-files-tree'), ['preview/md']);

  //  a text file opens labelled with its display extension
  const opening = docs.open('text', ['left', 'txt']);
  assert.deepEqual(await reply({ok: true, text: 'left body', hash: '0v1'}),
    {op: 'load', path: ['left', 'txt']});
  const left = await opening;
  assert.equal(left.label, 'left.text');
  assert.equal(docs.active('text'), left);

  //  a note file is Markdown, so it shows the source/preview toggle
  const note = docs.open('note', ['preview', 'md']);
  await reply({ok: true, text: '# Note', hash: '0v2'});
  assert.equal((await note).label, 'preview.note');
  assert.equal(el('note-display').hidden, false);
  assert.equal(el('text-save').hidden, false);

  //  the store's Add Ref action is bound by id and follows its tab
  el('text-ref').listeners.click();
  const ref = runtime.explorer.refs.forParent('text', left.id);
  assert.equal(ref.label, 'left.text');
  assert.equal(ref.data.text, 'left body');
  docs.update('text', left.id, {text: 'edited body'});
  assert.equal(ref.data.text, 'edited body');
  runtime.explorer.refs.close(ref.id);
  assert.equal(runtime.explorer.refs.list().length, 0);
};
