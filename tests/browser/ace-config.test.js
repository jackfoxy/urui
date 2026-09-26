'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const {evaluate, parseCords} = require('./eval-assets.js');
const {assemble} = require('./serve-app.js');

test('Ace configuration treats consumer strings as data', async () => {
  const source = assemble([
    ['urui', 'desk/sur/urui.hoon'],
    ['uace', 'desk/lib/urui-ace.hoon']
  ], `
=/  spec=ace-spec:urui
  :*  base='line\\0anext\\5cpath'
      global='odd\\22];window.injected=true;//'
      version='custom'
      mode='ace/mode/text'
      light='ace/theme/light'
      dark='ace/theme/dark'
      exts=~
      use-worker=&
  ==
(config-js:uace spec)
`, path.resolve(__dirname, '../..'));
  const [script] = parseCords(await evaluate(source), 1);
  const calls = [];
  const context = vm.createContext({
    window: {ace: {config: {set: (name, value) => calls.push([name, value])}}}
  });
  vm.runInContext(script, context);
  const assets = context.window['odd"];window.injected=true;//'];
  assert.deepEqual(JSON.parse(JSON.stringify(assets)), {
    version: 'custom', basePath: 'line\nnext\\path', mode: 'ace/mode/text',
    lightTheme: 'ace/theme/light', darkTheme: 'ace/theme/dark',
    extensions: [], useWorker: true
  });
  assert.deepEqual(calls, [
    ['basePath', 'line\nnext\\path'], ['modePath', 'line\nnext\\path'],
    ['themePath', 'line\nnext\\path'], ['workerPath', 'line\nnext\\path'],
    ['loadWorkerFromBlob', false]
  ]);
  assert.equal(context.window.injected, undefined);
  assert(Object.isFrozen(assets));
  assert(Object.isFrozen(assets.extensions));
  assert.throws(() => vm.runInNewContext(script, {window: {}}),
    /Could not load the Ace runtime/);
});
