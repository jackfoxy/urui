'use strict';

const assert = require('node:assert/strict');

const {fixture, lastCall} = require('./support.js');

module.exports = async (env) => {
  const {api} = fixture(env);

  assert.deepEqual(
    api.config.permanentViews.map((view) => view.name),
    ['text-files', 'note-files']
  );
  assert.equal(api.explorer.show('note-files'), 'shown');
  assert.deepEqual(Array.from(lastCall(env, 'explorer', 'show').args), [
    'note-files'
  ]);
  assert.equal(api.explorer.refreshTree('text'), 'refreshed');
  assert.deepEqual(
    Array.from(lastCall(env, 'explorer', 'refreshTree').args),
    ['text']
  );
  assert.equal(api.explorer.addRef('note', '/guide'), 'added');
  assert.deepEqual(Array.from(lastCall(env, 'explorer', 'addRef').args), [
    'note', '/guide'
  ]);
};
