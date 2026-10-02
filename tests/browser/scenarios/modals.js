'use strict';

// The modal controller, against urui-fixture-docs: settings, and the
// confirm dialog stacked on the file dialog.  Focus moves in and comes
// back, Tab stays inside the top modal, Escape closes only that one, the
// page behind is inert, and no app shortcut runs behind a modal.

const assert = require('node:assert/strict');

const {fileWire} = require('./support.js');

module.exports = async (env) => {
  const {elements} = env;
  const fixture = env.window.uruiDocsFixture;
  assert.equal(fixture?.ready, true);
  const {runtime} = fixture;
  const docs = runtime.documents;
  const el = (id) => elements[`#${id}`];
  const active = () => env.document.activeElement;
  const {reply, entries} = fileWire(env);
  const key = (name, modifiers = {}) => {
    const event = {
      key: name,
      target: active(),
      preventDefault() { this.prevented = true; },
      stopPropagation() {},
      ...modifiers
    };
    runtime.shortcuts.dispatch(event);
    return event;
  };

  // ---- start: one draft, the tree loads both roots ----------------------
  await reply(entries());
  await reply(entries());

  // ---- a bound chord runs while no modal is open ------------------------
  const bindings = env.window.URUI_CONFIG.shortcuts;
  assert(Array.isArray(bindings));
  bindings.push({binding: 'Ctrl-Enter', command: 'probe-run', when: 'always'});
  let runs = 0;
  runtime.shortcuts.register('probe-run', () => { runs += 1; });
  key('Enter', {ctrlKey: true});
  assert.equal(runs, 1);

  // ---- settings: focus in, page inert, shortcuts swallowed --------------
  el('settings').focus();
  runtime.dialogs.setSettingsOpen(true);
  assert.equal(el('settings-modal').hidden, false);
  assert.equal(active(), el('close-settings'));
  assert.equal(el('workbench').inert, true);
  assert.equal(el('help-panel').inert, true);
  assert.notEqual(el('settings-modal').inert, true);
  assert.notEqual(el('urui-toast').inert, true, 'the live region stays live');
  assert.equal(key('Enter', {ctrlKey: true}).prevented, true,
    'a bound chord is swallowed');
  assert.equal(runs, 1, 'and not run');
  assert.equal(key('a').prevented, undefined, 'other keys reach the modal');

  // ---- Tab and Shift+Tab stay inside ------------------------------------
  el('workbench').focus();
  assert.equal(key('Tab').prevented, true);
  assert.equal(active(), el('close-settings'));
  assert.equal(key('Tab', {shiftKey: true}).prevented, true);
  assert.equal(active(), el('close-settings'));

  // ---- Escape closes it and gives focus back ----------------------------
  key('Escape');
  assert.equal(el('settings-modal').hidden, true);
  assert.equal(active(), el('settings'));
  assert.equal(el('workbench').inert, false);
  assert.equal(el('help-panel').inert, false);
  key('Enter', {ctrlKey: true});
  assert.equal(runs, 2);

  // ---- a confirm stacked on the file dialog -----------------------------
  el('page-save').focus();
  const picking = docs.pickPath({store: 'page', scope: ['pages']});
  await env.tick();
  await reply(entries());
  assert.equal(el('urui-file-dialog').hidden, false);
  const inside = active();
  assert.equal(inside, el('urui-file-dialog-path'));
  assert.equal(el('workbench').inert, true);

  const confirming = runtime.confirm('delete', {path: '/pages/x/md'});
  assert.equal(el('urui-confirm').hidden, false);
  assert.equal(active(), el('urui-confirm-cancel'));
  assert.equal(el('urui-file-dialog').inert, true,
    'the dialog under the confirm is inert');
  assert.notEqual(el('urui-confirm').inert, true);

  el('urui-confirm-ok').focus();
  assert.equal(key('Tab').prevented, true);
  assert.equal(active(), el('urui-confirm-cancel'), 'Tab wraps to the first');
  assert.equal(key('Tab', {shiftKey: true}).prevented, true);
  assert.equal(active(), el('urui-confirm-ok'), 'Shift+Tab wraps to the last');

  // ---- Escape unwinds one modal at a time -------------------------------
  key('Escape');
  assert.equal(await confirming, false);
  assert.equal(el('urui-confirm').hidden, true);
  assert.equal(el('urui-file-dialog').hidden, false);
  assert.equal(el('urui-file-dialog').inert, false);
  assert.equal(el('workbench').inert, true);
  assert.equal(active(), inside);

  key('Escape');
  assert.equal(await picking, null);
  assert.equal(el('urui-file-dialog').hidden, true);
  assert.equal(el('workbench').inert, false);
  assert.equal(active(), el('page-save'));
  key('Enter', {ctrlKey: true});
  assert.equal(runs, 3);
};
