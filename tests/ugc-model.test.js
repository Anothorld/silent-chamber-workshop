const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SIZES,
  TILE,
  PERIODS,
  DIRS,
  createBlankDraft,
  toRuntimeLevel,
} = require('../src/ugc/model');

test('exports the fixed editor schema values', () => {
  assert.deepEqual(SIZES, { small: [36, 48], medium: [54, 72], large: [72, 96] });
  assert.deepEqual(TILE, { FLOOR: 0, WALL: 1, PIT: 2, FENCE: 3 });
  assert.deepEqual(PERIODS, [2.6, 3.4, 4.2]);
  assert.deepEqual(DIRS, [[0, -1], [1, 0], [0, 1], [-1, 0]]);
});

test('blank maps have a wall border and convert without sharing mutable state', () => {
  const draft = createBlankDraft('small', '回声试作');
  assert.equal(draft.tiles.length, 36 * 48);
  assert.equal(draft.tiles[0], 1);
  assert.equal(draft.tiles[36 + 1], 0);
  assert.deepEqual(draft.start, null);
  assert.deepEqual(draft.exit, null);
  assert.deepEqual(draft.mechanism, null);
  assert.deepEqual(draft.guards, []);
  assert.deepEqual(draft.spikes, []);
  assert.deepEqual(draft.launchers, []);
  assert.deepEqual(draft.origin, null);
  draft.start = [2, 2]; draft.exit = [3, 2];
  draft.guards.push([4, 2]);
  const level = toRuntimeLevel(draft);
  assert.deepEqual(level.start, [2.5, 2.5]);
  assert.deepEqual(level.enemies, [[4.5, 2.5]]);
  level.walls.add('2,2');
  assert.equal(draft.tiles[2 + 2 * 36], 0);
});

test('converts hazards, launcher direction, and timing to runtime values', () => {
  const draft = createBlankDraft('small', '节奏测试');
  draft.start = [1, 1];
  draft.exit = [34, 46];
  draft.mechanism = [2, 3];
  draft.tiles[4 + 5 * 36] = TILE.WALL;
  draft.tiles[6 + 7 * 36] = TILE.PIT;
  draft.tiles[5 + 7 * 36] = TILE.FENCE;
  draft.spikes.push({ x: 8, y: 9, tempo: 1, phase: 2 });
  draft.launchers.push({ x: 10, y: 11, dir: 3, tempo: 2, phase: 1 });

  const level = toRuntimeLevel(draft);
  assert.equal(level.width, 36);
  assert.equal(level.height, 48);
  assert.equal(level.name, '节奏测试');
  assert.equal(level.hint, '玩家制作');
  assert.equal(level.walls.size, 2 * 36 + 2 * 48 - 4 + 1);
  assert.equal(level.walls.has('0,0'), true);
  assert.equal(level.walls.has('35,47'), true);
  assert.equal(level.walls.has('4,5'), true);
  assert.equal(level.pits.has('6,7'), true);
  assert.equal(level.fences.has('5,7'), true);
  assert.deepEqual(level.exit, [34.5, 46.5]);
  assert.deepEqual(level.mechanism, [2.5, 3.5]);
  assert.deepEqual(level.spikes, [{ x: 8.5, y: 9.5, period: 3.4, phase: 1.7, duration: 0.75 }]);
  assert.deepEqual(level.launchers, [{ x: 10.5, y: 11.5, dx: -1, dy: 0, period: 4.2, phase: 1.05, speed: 7.5, range: 15 }]);
});

test('rejects unknown draft sizes', () => {
  assert.throws(() => createBlankDraft('tiny'), { message: 'invalid-size' });
});
