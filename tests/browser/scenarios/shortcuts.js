'use strict';

const assert = require('node:assert/strict');

const {fixture, lastCall} = require('./support.js');

module.exports = async (env) => {
  const {api} = fixture(env);
  const {shortcuts} = api.config;

  assert.equal(shortcuts.length, 8);
  assert.deepEqual(
    shortcuts.map((shortcut) => shortcut.binding),
    [
      'Ctrl-Enter', 'F1', 'F2', 'Ctrl-S', 'Ctrl-Shift-S', 'Alt-C',
      'Ctrl-0', 'Ctrl-1'
    ]
  );
  assert.deepEqual(
    shortcuts.map((shortcut) => shortcut.when),
    [
      'always', 'always', 'always', 'always', 'always', 'no-editor',
      'preview', 'preview'
    ]
  );
  //  `policy` says what a chord costs against the pinned keymaps, and
  //  `label` names it for the badge and the help table
  assert.deepEqual(
    shortcuts.map((shortcut) => shortcut.policy),
    ['override', 'override', 'override', 'free', 'free', 'gated', 'free', 'free']
  );
  assert.deepEqual(
    shortcuts.filter((shortcut) => shortcut.policy === 'override')
      .map((shortcut) => shortcut.command),
    //  Ctrl-Enter is Ace's fullscreen in the pinned table; the gate
    //  rejected it as %free
    ['echo', 'help', 'settings']
  );
  assert.ok(shortcuts.every((shortcut) => shortcut.label));
  //  Ctrl-0 fits and Ctrl-1 resets, as in graph-viz; they were inverted
  assert.deepEqual(
    shortcuts.filter((shortcut) => shortcut.when === 'preview')
      .map((shortcut) => shortcut.command),
    ['fit-view', 'reset-view']
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

  // Escape unwinds Help, then the file menu.
  runtime.dialogs.setHelpOpen(true);
  env.elements['#file-context-menu'].hidden = false;
  key('Escape');
  assert.equal(runtime.dialogs.helpIsOpen(), false);
  assert.equal(env.elements['#file-context-menu'].hidden, false);
  key('Escape');
  assert.equal(env.elements['#file-context-menu'].hidden, true);

};
