'use strict';

const assert = require('node:assert/strict');

const {fixture, lastCall} = require('./support.js');

module.exports = async (env) => {
  const {api} = fixture(env);
  const {endpoints} = api.config;

  assert.equal(endpoints.transport, 'header');
  assert.equal(endpoints.pathHeader, 'x-urui-fixture-path');
  assert.equal(endpoints.flagHeader, 'x-urui-fixture-overwrite');
  const results = {
    browse: 'browsed', load: 'loaded', save: 'saved', delete: 'deleted'
  };
  for (const method of ['browse', 'load', 'save', 'delete']) {
    assert.equal(
      endpoints[method],
      `/apps/urui-fixture/file/{kind}/${method}`
    );
    assert.equal(api.files[method]('text', '/sample'), results[method]);
    assert.deepEqual(
      Array.from(lastCall(env, 'files', method).args),
      ['text', '/sample']
    );
  }
};
