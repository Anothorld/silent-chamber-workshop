const test = require('node:test');
const assert = require('node:assert/strict');
const { createBlankDraft, SIZES } = require('../src/ugc/model');
const { createEditorState, undo } = require('../src/ugc/editor');
const { paintRegion, floodFill, entityAt, moveEntity, importDraft, makeExample, createPreviewWorld } = require('../scripts/web-editor/core');

test('fast brush and rectangle gestures fill every cell and undo once', () => {
  const state = createEditorState(createBlankDraft('small'));
  paintRegion(state, 'wall', { x: 2, y: 2 }, { x: 8, y: 2 });
  for (let x = 2; x <= 8; x++) assert.equal(state.draft.tiles[x + 2 * 36], 1);
  assert.equal(state.past.length, 1);
  undo(state);
  assert.equal(state.draft.tiles[5 + 2 * 36], 0);
  paintRegion(state, 'pit', { x: 0, y: 0 }, { x: 3, y: 3 }, { shape: 'rectangle' });
  assert.equal(state.draft.tiles[0], 1);
  assert.equal(state.draft.tiles[2 + 2 * 36], 2);
});

test('flood fills only the connected component and preserves border walls', () => {
  const draft = createBlankDraft('small');
  for (let y = 1; y < 47; y++) draft.tiles[5 + y * 36] = 1;
  const state = createEditorState(draft);
  floodFill(state, { x: 2, y: 2 }, 'pit');
  assert.equal(state.draft.tiles[2 + 20 * 36], 2);
  assert.equal(state.draft.tiles[8 + 20 * 36], 0);
  assert.equal(state.draft.tiles[0], 1);
  assert.equal(state.past.length, 1);
});

test('moving an object is atomic, undoable, and leaves source terrain unchanged', () => {
  const draft = createBlankDraft('small');
  draft.start = [3, 3]; draft.exit = [7, 7];
  const state = createEditorState(draft);
  assert.equal(moveEntity(state, entityAt(state.draft, 3, 3), { x: 7, y: 7 }), false);
  assert.deepEqual(state.draft.start, [3, 3]);
  assert.equal(state.past.length, 0);
  assert.equal(moveEntity(state, entityAt(state.draft, 3, 3), { x: 4, y: 3 }), true);
  assert.deepEqual(state.draft.start, [4, 3]);
  undo(state); assert.deepEqual(state.draft.start, [3, 3]);
  state.draft.tiles[4 + 4 * 36] = 1;
  state.draft.launchers.push({ x: 4, y: 4, dir: 1, tempo: 1, phase: 0 });
  state.draft.tiles[6 + 4 * 36] = 1;
  assert.equal(moveEntity(state, entityAt(state.draft, 4, 4), { x: 6, y: 4 }), true);
  assert.equal(state.draft.tiles[4 + 4 * 36], 1);
});

test('paired endpoints move independently and reject an occupied destination', () => {
  const draft = createBlankDraft('small');
  draft.objects.push({ type: 'patrol', x: 3, y: 3, toX: 7, toY: 3 });
  draft.start = [9, 3];
  const state = createEditorState(draft);
  const endpoint = entityAt(draft, 7, 3);
  assert.equal(moveEntity(state, endpoint, { x: 9, y: 3 }), false);
  assert.equal(moveEntity(state, endpoint, { x: 8, y: 4 }), true);
  assert.deepEqual(state.draft.objects[0], { type: 'patrol', x: 3, y: 3, toX: 8, toY: 4 });
});

test('imports accept unfinished drafts but reject malformed arrays, names and coordinates', () => {
  const draft = createBlankDraft('medium');
  assert.equal(importDraft(JSON.stringify(draft)).size, 'medium');
  for (const invalid of [ { ...draft, tiles: [] }, { ...draft, guards: [null] },
    { ...draft, start: [999, 2] }, { ...draft, objects: [{ type: 'unknown', x: 2, y: 2 }] },
    { ...draft, name: '' }, { ...draft, origin: { seed: -1, generatorVersion: 1 } } ]) {
    assert.throws(() => importDraft(JSON.stringify(invalid)));
  }
  assert.equal(SIZES[importDraft(JSON.stringify(draft)).size][0], 54);
});

test('example and ECL roundtrip launch a real isolated game world', () => {
  const { encodeLevel } = require('../src/ugc/codec');
  const { updateWorld, emitSound } = require('../src/world');
  const draft = makeExample();
  const imported = importDraft(encodeLevel(draft));
  const before = JSON.stringify(imported);
  const world = createPreviewWorld(imported);
  emitSound(world, world.player.x, world.player.y, 'probe', 8, 1);
  updateWorld(world, 0.1);
  assert.ok(world.waves.length > 0);
  assert.equal(world.level.width, 36);
  assert.equal(JSON.stringify(imported), before);
  assert.throws(() => createPreviewWorld(createBlankDraft('small')));
});

test('a shared fragile-floor draft only collapses under player contact in web preview', () => {
  const { encodeLevel } = require('../src/ugc/codec');
  const { updateWorld, emitSound, movePlayer } = require('../src/world');
  const draft = createBlankDraft('small');
  draft.start = [2, 3]; draft.exit = [7, 3];
  draft.objects = [{ type: 'fragile', x: 4, y: 3 }];
  const world = createPreviewWorld(importDraft(encodeLevel(draft)));
  emitSound(world, world.player.x, world.player.y, 'probe', 8);
  updateWorld(world, 1);
  assert.equal(world.fragileFloors[0].phase, 'solid');
  movePlayer(world, 2, 0);
  updateWorld(world, .01);
  assert.equal(world.fragileFloors[0].phase, 'warning');
  movePlayer(world, 1, 0);
  updateWorld(world, 1);
  assert.equal(world.level.pits.has('4,3'), true);
  assert.equal(world.failed, false);
});
