'use strict';

const assert = require('node:assert/strict');

const {fixture} = require('./support.js');

module.exports = async (env) => {
  const {api} = fixture(env);
  const host = env.elements['#dot'];
  const editor = api.editor.adapter(host, {
    assets: env.aceAssets,
    label: 'Fixture source',
    describedBy: 'source-status',
    platform: 'win'
  });

  assert.equal(api.editor.primary(), 'primary-editor');
  assert.equal(api.editor.secondary(), 'secondary-editor');
  assert.equal(host['aria-label'], 'Fixture source');
  assert.equal(host['aria-describedby'], 'source-status');
  assert.equal(host['aria-invalid'], 'false');
  assert.equal(host.aceSession.mode, 'ace/mode/text');
  assert.equal(host.aceSession.worker, false);

  let changes = 0;
  const stop = editor.onChange(() => { changes += 1; });
  editor.setSource('alpha\nbeta', {history: 'reset'});
  assert.equal(editor.getSource(), 'alpha\nbeta');
  assert.equal(changes, 1);
  editor.replaceRange(6, 10, 'gamma');
  assert.equal(editor.getSource(), 'alpha\ngamma');
  assert.equal(changes, 2);
  editor.setSelection(1, 4);
  assert.deepEqual(editor.getSelection(), {start: 1, end: 4});
  assert.deepEqual(editor.offsetToPosition(7), {row: 1, column: 1});
  assert.equal(editor.positionToOffset({row: 1, column: 2}), 8);

  editor.setDiagnostic({line: 2, column: 3, message: 'bad source'});
  assert.equal(host['aria-invalid'], 'true');
  assert.deepEqual(host.aceSession.annotations, [{
    row: 1, column: 2, text: 'bad source', type: 'error'
  }]);
  editor.setDiagnostic(null);
  assert.equal(host['aria-invalid'], 'false');
  assert.deepEqual(host.aceSession.annotations, []);
  editor.setTheme('dark');
  assert.equal(host.aceTheme, 'ace/theme/monokai');
  editor.refresh();
  assert.equal(host.resizeCount, 1);
  editor.focus();
  assert.equal(env.document.activeElement, host);
  stop();
};
