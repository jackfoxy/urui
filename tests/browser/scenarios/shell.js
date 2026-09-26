'use strict';

const assert = require('node:assert/strict');

const {fixture, lastCall} = require('./support.js');

module.exports = async (env) => {
  const app = fixture(env);
  const {api} = app;

  assert.equal(api.config.appId.name, 'urui-fixture');
  assert.equal(api.config.appId.title, 'urui fixture');
  assert.equal(api.config.appId.base, '/apps/urui-fixture');
  assert.equal(api.config.limits.minExplorer, 180);
  assert.equal(api.config.limits.paneMin, 25);
  assert.equal(api.config.limits.paneMax, 70);
  assert.equal(api.config.limits.narrow, 760);

  assert.equal(api.status('editor', 'Ready'), 'status');
  assert.deepEqual(Array.from(lastCall(env, 'shell', 'status').args), [
    'editor', 'Ready'
  ]);
  assert.equal(api.layout.paneWidth(), 55);
  lastCall(env, 'layout', 'paneWidth');
  assert.equal(api.layout.explorerWidth(), 320);
  lastCall(env, 'layout', 'explorerWidth');
  assert.equal(api.problem.show('bad input'), 'shown');
  lastCall(env, 'problem', 'show');
  assert.equal(api.problem.clear(), 'cleared');
  lastCall(env, 'problem', 'clear');
};
