'use strict';

const assert = require('node:assert/strict');

const {fixture, lastCall} = require('./support.js');

//  The pane model: the declaration the runtime reads, band reveal and
//  its session round-trip, what a read-only pane refuses, and the three
//  levels of the fixture's result pane.

module.exports = async (env) => {
  const {api, runtime} = fixture(env);
  const panes = runtime.panes;

  //  ---- the declaration -----------------------------------------------
  const result = panes.get('result-pane');
  assert.equal(result.role, 'result');
  assert.equal(result.mode, 'read-write');
  assert.deepEqual(
    panes.levels('result-pane').map((level) => level.name),
    ['document', 'view', 'set']
  );
  assert.deepEqual(
    panes.levels('explorer').map((level) => level.source),
    ['views']
  );
  assert.deepEqual(
    result.bands.map((band) => [band.name, band.item.kind]),
    [['head', 'heading'], ['controls', 'controls'],
      ['tabs', 'tabs'], ['body', 'panel']]
  );

  //  ---- what a read-only pane refuses ---------------------------------
  assert.equal(panes.readOnly('explorer'), true);
  assert.equal(panes.readOnly('editor-pane'), false);
  //  the mode wins over the level, whatever the level declares
  assert.equal(panes.addLabel('explorer', {add: 'Add view'}), undefined);
  assert.equal(panes.closes('explorer', {close: true}), false);
  assert.equal(panes.addLabel('editor-pane', {add: 'Add view'}), 'Add view');
  assert.equal(panes.closes('editor-pane', {close: true}), true);
  //  and a level that asks for no `+` gets none in a read-write pane
  assert.equal(panes.addLabel('result-pane', {}), undefined);

  //  ---- band reveal ---------------------------------------------------
  const band = env.elements['#editor-pane-controls'];
  const toggle = env.elements['#editor-pane-controls-toggle'];
  assert.equal(panes.isOpen('editor-pane', 'controls'), true);
  assert.equal(panes.reveal('editor-pane', 'controls', false), false);
  assert.equal(panes.isOpen('editor-pane', 'controls'), false);
  assert.equal(band.hidden, true);
  assert.equal(toggle['aria-expanded'], 'false');
  //  a band with no reveal key is pinned open and has no toggle
  assert.equal(panes.reveal('editor-pane', 'tabs', false), undefined);
  assert.equal(panes.isOpen('editor-pane', 'tabs'), true);

  //  the closed band survives a save and a reload
  runtime.session.save();
  const written = JSON.parse(env.saved.get(env.sessionKey));
  assert.equal(written.paneBands.editorControls, false);
  panes.reveal('editor-pane', 'controls', true);
  assert.equal(band.hidden, false);
  runtime.session.load();
  assert.equal(panes.isOpen('editor-pane', 'controls'), false);
  assert.equal(band.hidden, true);
  panes.reveal('editor-pane', 'controls', true);

  //  ---- three levels --------------------------------------------------
  //
  //  The doubles skip the fixture's own boot work, so the note store is
  //  seeded here; its strip is depth 0 and the two levels under it are
  //  generated into the pane's panel.
  const note = runtime.tabs.create('note', 'body').id;
  runtime.tabs.select('note', note, {capture: false});
  const views = env.document.querySelector('#result-pane-view-tabs');
  const sets = env.document.querySelector('#result-pane-set-tabs');
  assert.equal(views.dataset.depth, '1');
  assert.equal(views.dataset.source, 'fixed');
  assert.equal(sets.dataset.depth, '2');
  assert.equal(sets.dataset.source, 'dynamic');
  assert.deepEqual(
    views.children.map((item) => item.children[0].textContent),
    ['Rendered', 'Messages']
  );
  //  a %fixed level selects its first tab when the path names none
  assert.deepEqual(panes.path('result-pane'), [note, 'rendered']);
  //  a %dynamic level is empty until the consumer fills it
  assert.deepEqual(sets.children, []);

  panes.set('result-pane', 'set', [
    {id: 'one', label: 'One'}, {id: 'two', label: 'Two'}
  ]);
  assert.deepEqual(
    sets.children.map((item) => item.children[0].textContent),
    ['One', 'Two']
  );
  assert.deepEqual(panes.path('result-pane'), [note, 'rendered', 'one']);
  //  the level declares close=&, so each tab carries a close control
  assert.equal(sets.children[0].children[1].textContent, 'X');

  //  selecting a level drops the path below it and rerenders
  panes.selectLevel('result-pane', 1, 'messages');
  assert.deepEqual(panes.path('result-pane'), [note, 'messages']);
  assert.equal(views.children[1].classes.has('active'), true);
  //  a %dynamic level is keyed by its parent path, so the tabs set
  //  under `rendered` are not the tabs under `messages`
  assert.deepEqual(sets.children, []);

  //  a content panel is cached by its whole path, so what a consumer
  //  filled is the same element when its tab comes back
  panes.select('result-pane', [note, 'rendered', 'two']);
  const panel = panes.panel('result-pane');
  panel.textContent = 'filled';
  panes.selectLevel('result-pane', 1, 'messages');
  panes.select('result-pane', [note, 'rendered', 'two']);
  assert.equal(panes.panel('result-pane'), panel);
  assert.equal(panel.dataset.panePath, `${note}/rendered/two`);

  //  closing a %dynamic tab drops it and moves the path off it
  panes.close('result-pane', 2, 'two');
  assert.deepEqual(
    panes.tabs('result-pane', 2, [note, 'rendered']).map((tab) => tab.id),
    ['one']
  );
  assert.deepEqual(panes.path('result-pane'), [note, 'rendered', 'one']);

  //  the whole path survives a save and a reload
  runtime.session.save();
  const record = JSON.parse(env.saved.get(env.sessionKey));
  assert.deepEqual(record.panePaths['result-pane'], [
    note, 'rendered', 'one'
  ]);
  panes.selectLevel('result-pane', 1, 'messages');
  runtime.session.load();
  assert.deepEqual(panes.path('result-pane'), [note, 'rendered', 'one']);

  //  ---- the public group ----------------------------------------------
  const cases = [
    ['get', ['result-pane'], 'got'],
    ['set', ['result-pane', 'set', []], 'set'],
    ['select', ['result-pane', [note]], 'selected'],
    ['panel', ['result-pane', [note]], 'paneled'],
    ['reveal', ['editor-pane', 'controls', false], 'revealed']
  ];
  for (const [method, args, expected] of cases) {
    assert.equal(api.panes[method](...args), expected);
    assert.deepEqual(Array.from(lastCall(env, 'panes', method).args), args);
  }
};
