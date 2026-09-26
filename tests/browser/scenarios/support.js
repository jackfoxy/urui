'use strict';

const assert = require('node:assert/strict');

function fixture(env) {
  assert.equal(env.fixture.ready, true);
  assert.equal(env.fixture.api, env.api);
  return env.fixture;
}

function lastCall(env, group, method) {
  const call = env.fixture.calls.at(-1);
  assert.equal(call.group, group);
  assert.equal(call.method, method);
  return call;
}

module.exports = {fixture, lastCall};
