'use strict';

const assert = require('node:assert/strict');

const {fixture, lastCall} = require('./support.js');

module.exports = async (env) => {
  const {api} = fixture(env);
  const {shortcuts} = api.config;

  assert.equal(shortcuts.length, 5);
  assert.deepEqual(
    shortcuts.map((shortcut) => shortcut.binding),
    ['Ctrl-Enter', 'Ctrl-S', 'Ctrl-Shift-S', 'Ctrl-0', 'Ctrl-1']
  );
  assert.deepEqual(
    shortcuts.map((shortcut) => shortcut.when),
    ['always', 'always', 'always', 'preview', 'preview']
  );
  assert.equal(api.shortcuts.register('Ctrl-K', 'command'), 'registered');
  assert.deepEqual(
    Array.from(lastCall(env, 'shortcuts', 'register').args),
    ['Ctrl-K', 'command']
  );

  const {runtime} = fixture(env);
  let inEditor = true;
  let preview = false;
  let contextual = 0;
  const shell = env.window.urui.runtime({
    editors: [{isFocused: () => inEditor}],
    shortcuts: {
      preview: () => preview,
      onKeydown: () => { contextual += 1; return true; }
    }
  });
  const calls = [];
  for (const entry of shortcuts) {
    shell.shortcuts.register(entry.command, () => calls.push(entry.command));
  }
  function key(key, modifiers = {}) {
    const event = {
      key, target: env.elements['#source'],
      preventDefault() { this.prevented = true; },
      stopPropagation() { this.stopped = true; },
      ...modifiers
    };
    shell.shortcuts.dispatch(event);
    return event;
  }
  assert.equal(key('Enter', {ctrlKey: true}).prevented, true);
  assert.equal(calls.length, 1);
  assert.equal(key('s', {metaKey: true}).stopped, true);
  assert.equal(calls.length, 2);
  assert.equal(key('s', {ctrlKey: true, altKey: true}).prevented, undefined);
  assert.equal(calls.length, 2);
  assert.equal(key('0', {ctrlKey: true}).prevented, undefined);
  preview = true;
  assert.equal(key('0', {ctrlKey: true}).prevented, true);
  assert.equal(calls.length, 3);
  assert.equal(key('Delete').prevented, undefined);
  assert.equal(contextual, 0);
  inEditor = false;
  assert.equal(key('Delete').prevented, true);
  assert.equal(contextual, 1);

  // Context filtering applies before claims, including editor-only entries.
  shortcuts.push({binding: 'Ctrl-K', command: 'inside', when: 'editor'});
  shortcuts.push({binding: 'Ctrl-K', command: 'outside', when: 'no-editor'});
  shell.shortcuts.register('inside', () => calls.push('inside'));
  shell.shortcuts.register('outside', () => calls.push('outside'));
  key('k', {ctrlKey: true});
  assert.equal(calls.at(-1), 'outside');
  inEditor = true;
  key('k', {ctrlKey: true});
  assert.equal(calls.at(-1), 'inside');
  shortcuts.splice(-2);

  // Escape unwinds Help, then Clay errors, then the file menu.
  runtime.dialogs.showError('problem');
  runtime.dialogs.setHelpOpen(true);
  env.elements['#file-context-menu'].hidden = false;
  key('Escape');
  assert.equal(runtime.dialogs.helpIsOpen(), false);
  assert.equal(runtime.dialogs.errorIsOpen(), true);
  key('Escape');
  assert.equal(runtime.dialogs.errorIsOpen(), false);
  assert.equal(env.elements['#file-context-menu'].hidden, false);
  key('Escape');
  assert.equal(env.elements['#file-context-menu'].hidden, true);

};
