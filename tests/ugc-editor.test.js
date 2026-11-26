const test = require('node:test');
const assert = require('node:assert/strict');
const { createBlankDraft, TILE } = require('../src/ugc/model');
const { createEditorState, beginStroke, applyEditorAction: act, endStroke, undo, redo, screenToCell } = require('../src/ugc/editor');
test('drag grouping, no-op strokes, copying and history branching', () => {
  const draft = createBlankDraft('small'), s = createEditorState(draft);
  beginStroke(s); act(s, { type: 'paint', x: 2, y: 2, tile: 1 });
  act(s, { type: 'paint', x: 3, y: 2, tile: 1 }); endStroke(s);
  assert.equal(s.past.length, 1); assert.equal(draft.tiles[74], 0);
  undo(s); assert.equal(s.draft.tiles[74], 0); redo(s); assert.equal(s.draft.tiles[74], 1);
  beginStroke(s); act(s, { type: 'paint', x: 0, y: 0, tile: 0 }); endStroke(s);
  assert.equal(s.past.length, 1);
  undo(s); act(s, { type: 'place', kind: 'start', x: 4, y: 4 }); assert.equal(s.future.length, 0);
  s.won = true; act(s, { type: 'place', kind: 'start', x: 5, y: 4 }); assert.equal(s.won, false);
  assert.deepEqual(s.draft.start, [5, 4]); undo(s); assert.deepEqual(s.draft.start, [4, 4]);
});
test('placement guards, caps, timing and tile conflicts', () => {
  const s = createEditorState(createBlankDraft('small'));
  act(s, { type: 'place', kind: 'launcher', x: 0, y: 2, dir: 1 });
  assert.equal(s.draft.launchers.length, 1);
  act(s, { type: 'place', kind: 'start', x: 0, y: 2 }); assert.equal(s.draft.start, null);
  for (let x = 1; x <= 9; x++) act(s, { type: 'place', kind: 'guard', x, y: 5 });
  assert.equal(s.draft.guards.length, 8);
  act(s, { type: 'place', kind: 'spike', x: 3, y: 3 });
  act(s, { type: 'timing', kind: 'spike', x: 3, y: 3, tempo: 2, phase: 3 });
  assert.equal(s.draft.spikes[0].tempo, 2);
  act(s, { type: 'paint', x: 3, y: 3, tile: TILE.PIT }); assert.equal(s.draft.spikes.length, 0);
  act(s, { type: 'erase', x: 1, y: 5 }); assert.equal(s.draft.guards.length, 7);
});
test('fill and replacement are undoable, with bounded history', () => {
  const s = createEditorState(createBlankDraft('small'));
  act(s, { type: 'fill', tile: TILE.WALL }); assert.equal(s.draft.tiles[74], 1); undo(s);
  const generated = createBlankDraft('medium'); generated.origin = { seed: 123, version: 1 }; generated.start = [2, 2];
  act(s, { type: 'replace', draft: generated }); generated.start[0] = 9;
  assert.deepEqual(s.draft.start, [2, 2]); undo(s); assert.equal(s.draft.origin, null); redo(s); assert.equal(s.draft.origin.seed, 123);
  for (let n = 0; n < 45; n++) act(s, { type: 'paint', x: 4, y: 4, tile: n % 2 });
  assert.equal(s.past.length, 40);
});
test('fences can be painted and undone without replacing border walls', () => {
  const state = createEditorState(createBlankDraft('small'));
  act(state, { type: 'paint', x: 3, y: 4, tile: TILE.FENCE });
  assert.equal(state.draft.tiles[4 * 36 + 3], TILE.FENCE);
  act(state, { type: 'paint', x: 0, y: 4, tile: TILE.FENCE });
  assert.equal(state.draft.tiles[4 * 36], TILE.WALL);
  undo(state);
  assert.equal(state.draft.tiles[4 * 36 + 3], TILE.FLOOR);
});
test('screen coordinates use zoom and clamped camera and reject outside viewport', () => {
  const s = createEditorState(createBlankDraft('small')); s.zoom = 2; s.baseTileSize = 10; s.camera = { x: 999, y: -3 };
  const rect = { x: 10, y: 20, width: 200, height: 100 };
  assert.deepEqual(screenToCell(s, 30, 40, rect), { x: 27, y: 1 });
  assert.deepEqual(s.camera, { x: 26, y: 0 }); assert.equal(screenToCell(s, 210, 40, rect), null);
});


test('no-op actions avoid snapshots and changes advance content revision once per action', () => {
  const s = createEditorState(createBlankDraft('large'));
  const stringify = JSON.stringify;
  let serializations = 0;
  JSON.stringify = (...args) => { serializations++; return stringify(...args); };
  try {
    assert.equal(act(s, { type: 'paint', x: 2, y: 2, tile: 0 }), false);
    assert.equal(serializations, 0);
    assert.equal(s.revision, 0);
    beginStroke(s);
    const snapshots = serializations;
    for (let x = 2; x < 20; x++) assert.equal(act(s, { type: 'paint', x, y: 2, tile: 1 }), true);
    assert.equal(serializations, snapshots, 'samples within one stroke never serialize the draft');
    assert.equal(s.revision, 18);
    endStroke(s);
    assert.equal(s.past.length, 1);
    undo(s); assert.equal(s.revision, 19);
    redo(s); assert.equal(s.revision, 20);
  } finally { JSON.stringify = stringify; }
});
