'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const application = process.env.URUI_APP_JS;
if (!application) throw new Error('set URUI_APP_JS to the assembled bundle');

function boot() {
  const window = {
    confirm: () => true,
    prompt: () => null
  };
  window.window = window;
  vm.runInNewContext(fs.readFileSync(application, 'utf8'), {window});
  return window;
}

test('publishes and boots the stable API', () => {
  const window = boot();
  const {urui} = window;
  assert.equal(window.uruiFixture.ready, true);
  assert.equal(window.uruiFixture.api, urui);
  assert.deepEqual(Object.keys(urui), [
    'config', 'boot', 'status', 'tabs', 'editor', 'explorer', 'dialog',
    'session', 'files', 'shortcuts', 'layout', 'problem'
  ]);
  assert.deepEqual(Object.keys(urui.tabs), [
    'create', 'close', 'select', 'update', 'list', 'active'
  ]);
  assert.deepEqual(Object.keys(urui.editor), [
    'primary', 'secondary', 'adapter'
  ]);
  assert.deepEqual(Object.keys(urui.explorer), [
    'show', 'refreshTree', 'addRef', 'openDocs'
  ]);
  assert.deepEqual(Object.keys(urui.dialog), [
    'help', 'error', 'confirm', 'prompt'
  ]);
  assert.deepEqual(Object.keys(urui.session), ['save', 'queue', 'get', 'set']);
  assert.deepEqual(
    Object.keys(urui.files),
    ['browse', 'load', 'save', 'delete']
  );
  assert(Object.isFrozen(urui));
  assert(Object.isFrozen(urui.tabs));
  assert.throws(() => urui.boot({}), /called more than once/);
});

test('missing hooks are safe and dialogs use browser fallbacks', () => {
  const {urui} = boot();
  assert.equal(urui.status('source', 'Ready'), undefined);
  assert.equal(urui.tabs.active('text'), undefined);
  assert.equal(urui.dialog.confirm('continue?'), true);
  assert.equal(urui.dialog.prompt('name?'), null);
});
