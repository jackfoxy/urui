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
};
