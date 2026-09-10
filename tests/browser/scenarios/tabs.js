'use strict';

const assert = require('node:assert/strict');

const {fixture, lastCall} = require('./support.js');

module.exports = async (env) => {
  const {api} = fixture(env);
  const cases = [
    ['create', ['text', 'hello'], 'created'],
    ['close', ['text', 2], 'closed'],
    ['select', ['text', 3, true], 'selected'],
    ['update', ['text'], 'updated'],
    ['list', ['text'], 'listed'],
    ['active', ['text'], 'active']
  ];

  for (const [method, args, expected] of cases) {
    assert.equal(api.tabs[method](...args), expected);
    assert.deepEqual(
      Array.from(lastCall(env, 'tabs', method).args),
      args
    );
  }
};
