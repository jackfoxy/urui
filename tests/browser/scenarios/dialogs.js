'use strict';

const assert = require('node:assert/strict');

const {fixture, lastCall} = require('./support.js');

module.exports = async (env) => {
  const {api} = fixture(env);

  assert.equal(api.dialog.help(true), 'helped');
  assert.deepEqual(Array.from(lastCall(env, 'dialog', 'help').args), [true]);
  assert.equal(api.dialog.error('Clay failed'), 'errored');
  assert.deepEqual(Array.from(lastCall(env, 'dialog', 'error').args), [
    'Clay failed'
  ]);
  assert.equal(api.dialog.confirm('continue?'), true);
  assert.deepEqual(Array.from(lastCall(env, 'dialog', 'confirm').args), [
    'continue?'
  ]);
  assert.equal(api.dialog.prompt('name?'), 'fixture-name');
  assert.deepEqual(Array.from(lastCall(env, 'dialog', 'prompt').args), [
    'name?'
  ]);
};
