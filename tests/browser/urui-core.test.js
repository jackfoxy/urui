'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const application = process.env.URUI_APP_JS;
if (!application) throw new Error('set URUI_APP_JS to the assembled bundle');
const applicationSource = fs.readFileSync(application, 'utf8');

//  The bundle now builds a shell runtime at boot, so the bare context
//  needs just enough of a document for element lookups to answer null.
function stubDocument() {
  const root = {dataset: {}, style: {}, classList: {toggle: () => {}}};
  return {
    documentElement: root,
    querySelector: () => null,
    addEventListener: () => {}
  };
}

function evaluate(source) {
  const window = {
    confirm: () => true,
    prompt: () => null,
    addEventListener: () => {}
  };
  window.window = window;
  vm.runInNewContext(source, {
    window,
    document: stubDocument(),
    matchMedia: () => ({matches: false, addEventListener: () => {}}),
    requestAnimationFrame: (callback) => callback()
  });
  return window;
}

function boot() {
  return evaluate(applicationSource);
}

function bootWithoutHooks() {
  const marker = 'const fixtureCalls = [];';
  const appStart = applicationSource.indexOf(marker);
  assert.notEqual(appStart, -1);
  return evaluate(
    `${applicationSource.slice(0, appStart)}window.urui.boot({});`
  );
}

test('publishes and boots the stable API', () => {
  const window = boot();
  const {urui} = window;
  assert.equal(window.uruiFixture.ready, true);
  assert.equal(window.uruiFixture.api, urui);
  assert.deepEqual(Object.keys(urui), [
    'config', 'boot', 'status', 'tabs', 'editor', 'explorer', 'dialog',
    'session', 'files', 'shortcuts', 'layout', 'problem', 'runtime'
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

test('fixture hooks are forwarded through the public API', () => {
  const {urui, uruiFixture} = boot();
  assert.equal(urui.status('source', 'Ready'), 'status');
  assert.equal(urui.tabs.active('text'), 'active');
  assert.equal(urui.dialog.confirm('continue?'), true);
  assert.equal(urui.dialog.prompt('name?'), 'fixture-name');
  assert.deepEqual(
    Array.from(uruiFixture.calls, ({group, method}) => [group, method]),
    [
      ['shell', 'status'],
      ['tabs', 'active'],
      ['dialog', 'confirm'],
      ['dialog', 'prompt']
    ]
  );
});

test('missing hooks are safe and dialogs use browser fallbacks', () => {
  const {urui} = bootWithoutHooks();
  assert.equal(urui.status('source', 'Ready'), undefined);
  assert.equal(urui.tabs.active('text'), undefined);
  assert.equal(urui.dialog.confirm('continue?'), true);
  assert.equal(urui.dialog.prompt('name?'), null);
});
