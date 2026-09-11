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

  const {runtime} = fixture(env);
  const {files, tabs} = runtime;
  const reply = async (body, status = 200) => {
    await env.tick();
    const request = env.requests.shift();
    assert(request, `expected a Clay request: ${JSON.stringify({
      error: env.elements['#clay-error-message'].textContent,
      confirmations: env.confirmations, answers: env.confirmationAnswers
    })}`);
    request.resolve(env.response(status < 400, body, status));
    return request;
  };
  const emptyTree = JSON.stringify({file: false, children: []});
  env.prompts.push(null);
  await files.load('text');
  assert.equal(env.requests.length, 0);

  // Walk nested directories, using the configured kind and header.
  let operation = files.browse('text');
  let request = await reply(JSON.stringify({file: false, children: ['a']}));
  assert.equal(request.url, '/apps/urui-fixture/file/text/browse');
  assert.equal(request.options.headers[endpoints.pathHeader], undefined);
  request = await reply(JSON.stringify({file: false, children: ['txt']}));
  assert.equal(request.options.headers[endpoints.pathHeader], 'a');
  await reply(JSON.stringify({file: true, children: []}));
  await operation;
  const tree = env.elements['#text-files-tree'];
  assert(env.descendants(tree).some((node) => node.dataset.path === 'a/txt'));

  operation = files.load('text', '/a/txt');
  request = await reply('original');
  assert.equal(request.options.headers[endpoints.pathHeader], 'a/txt');
  const tab = await operation;
  assert.equal(tab.label, 'a.text');
  assert.equal(tab.cleanSource, 'original');
  assert.equal(tabs.active('text'), tab);
  assert.equal(await files.load('text', 'a/txt'), tab);
  assert.equal(env.requests.length, 0);

  // Declining an externally changed copy preserves the dirty baseline.
  tab.source = 'edited';
  env.confirmationAnswers.push(false);
  operation = files.save('text');
  await reply('external');
  await operation;
  assert.equal(tab.cleanSource, 'original');
  assert.equal(env.requests.length, 0);

  env.confirmationAnswers.push(true);
  operation = files.save('text');
  await reply('external');
  request = await reply('saved');
  assert.equal(request.options.body, 'edited');
  assert.equal(request.options.headers[endpoints.flagHeader], 'true');
  await reply(emptyTree);
  await operation;
  assert.equal(tab.cleanSource, 'edited');

  // A new path can conflict; retry only after approval.
  const fresh = tabs.create('note', 'new');
  tabs.select('note', fresh.id);
  env.prompts.push('new/md');
  env.confirmationAnswers.push(true);
  operation = files.save('note');
  await reply('exists', 409);
  request = await reply('saved');
  assert.equal(request.options.headers[endpoints.flagHeader], 'true');
  await reply(emptyTree);
  await operation;
  assert.equal(fresh.path, 'new/md');

  // JSON transport uses path segments and preserves text independently.
  endpoints.transport = 'body';
  operation = files.load('note', 'json/md');
  request = await reply('json body');
  assert.equal(request.options.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(request.options.body), {
    path: ['json', 'md'], source: '', overwrite: false
  });
  await operation;
  env.confirmationAnswers.push(false);
  await files.delete('note', 'json/md');
  assert.equal(env.requests.length, 0);
  env.confirmationAnswers.push(true);
  operation = files.delete('note', 'json/md');
  request = await reply('deleted');
  assert.deepEqual(JSON.parse(request.options.body).path, ['json', 'md']);
  await reply(emptyTree);
  await operation;
  endpoints.transport = 'header';

  // Invalid browse results and load failures reach the shared dialog.
  operation = files.browse('text');
  await reply(JSON.stringify({file: false, children: ['../escape']}));
  await operation;
  assert.equal(runtime.dialogs.errorIsOpen(), true);
  runtime.dialogs.hideError();
  operation = files.load('text', 'broken/txt');
  await reply('forced failure', 500);
  await operation;
  assert.equal(env.elements['#clay-error-message'].textContent,
    'Error: forced failure');
  assert.equal(tabs.list('text').length, 1);

};
