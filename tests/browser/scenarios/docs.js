'use strict';

const assert = require('node:assert/strict');

const {fixture, lastCall} = require('./support.js');

module.exports = async (env) => {
  const {api} = fixture(env);

  assert.equal(api.config.docsRoot, '/docs/d/urui-fixture/');
  assert.equal(api.explorer.openDocs('users-guide'), 'opened');
  assert.deepEqual(
    Array.from(lastCall(env, 'explorer', 'openDocs').args),
    ['users-guide']
  );
};
