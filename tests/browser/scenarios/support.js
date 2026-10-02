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

//  The docs fixture's file wire: every request parks until answered
//  with a json reply.  `take` claims the next request unanswered.
function fileWire(env, url = '/apps/urui-fixture/files') {
  const take = async () => {
    for (let wait = 0; wait < 8 && !env.requests.length; wait += 1) {
      await env.tick();
    }
    const request = env.requests.shift();
    assert(request, 'expected a file-wire request');
    assert.equal(request.url, url);
    return request;
  };
  const answer = async (request, body, status = 200) => {
    request.resolve({
      ok: status < 400,
      status,
      headers: {get: () => 'application/json'},
      text: async () => JSON.stringify(body)
    });
    for (let wait = 0; wait < 4; wait += 1) await env.tick();
    return JSON.parse(request.options.body);
  };
  const reply = async (body, status) => answer(await take(), body, status);
  const entries = (...paths) => {
    return {ok: true, entries: paths.map((path) => ({path, kind: 'file'}))};
  };
  return {take, answer, reply, entries};
}

module.exports = {fixture, lastCall, fileWire};
