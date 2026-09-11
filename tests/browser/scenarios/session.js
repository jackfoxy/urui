'use strict';

const assert = require('node:assert/strict');

const {fixture, lastCall} = require('./support.js');

module.exports = async (env) => {
  const {api} = fixture(env);
  const {appId, slots} = api.config;

  assert.equal(appId.storageKey, 'urui-fixture.session.v1');
  assert.equal(appId.storageVersion, 1);
  assert.equal(slots.length, 19);
  assert.equal(slots.find((slot) => slot.key === 'source').owner, 'app');
  assert.equal(slots.find((slot) => slot.key === 'docsTabs').shape, 'tabs');
  assert.equal(slots.find((slot) => slot.key === 'view').owner, 'app');
  //  one slot names a nested json key, and urui owns it
  const theme = slots.find((slot) => slot.key === 'preferences.theme');
  assert.equal(theme.owner, 'urui');
  assert.equal(theme.shape, 'scalar');

  const cases = [
    ['save', [{source: 'hello'}], 'saved'],
    ['queue', [], 'queued'],
    ['get', [], 'loaded'],
    ['set', ['source', 'hello'], 'stored']
  ];
  for (const [method, args, expected] of cases) {
    assert.equal(api.session[method](...args), expected);
    assert.deepEqual(
      Array.from(lastCall(env, 'session', method).args),
      args
    );
  }
};
