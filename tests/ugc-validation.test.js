const test = require('node:test');
const assert = require('node:assert/strict');
const { createBlankDraft, TILE, SIZES, toRuntimeLevel } = require('../src/ugc/model');
const { validateDraft } = require('../src/ugc/validation');
const draft = (size = 'small') => {
  const value = createBlankDraft(size);
  value.start = [2, 2]; value.exit = [3, 3];
  return value;
};
const has = (value, code) => validateDraft(value).errors.some(item => item.code === code);

test('valid drafts in every size are pure and open rooms only warn', () => {
  for (const size of Object.keys(SIZES)) {
    const value = draft(size), before = structuredClone(value);
    const result = validateDraft(value);
    assert.deepEqual(result.errors, []);
    assert.ok(result.warnings.some(item => item.code === 'acoustic-reference'));
    assert.deepEqual(value, before);
  }
});
test('rejects malformed size and terrain including sparse arrays', () => {
  assert.ok(has(null, 'size'));
  for (const tiles of [null, [], new Array(36 * 48), Array(36 * 48).fill(4)]) {
    assert.ok(has({ ...draft(), tiles }, 'terrain'));
  }
  const value = draft(); value.tiles[0] = TILE.FLOOR;
  assert.ok(has(value, 'terrain'));
});
test('requires floor endpoints and rejects overlap and object limits', () => {
  const value = draft(); value.start = null;
  assert.ok(has(value, 'start')); value.start = [2, 2]; value.exit = [2, 2];
  assert.ok(has(value, 'overlap')); value.exit = [3, 3];
  value.guards = Array(9).fill([4, 4]); assert.ok(has(value, 'count'));
  value.guards = [[2, 2]]; assert.ok(has(value, 'overlap'));
  value.guards = []; value.spikes = Array(33).fill({x:4,y:4,tempo:0,phase:0});
  assert.ok(has(value, 'count')); value.spikes = []; value.launchers = Array(9).fill(null);
  assert.ok(has(value, 'count'));
});
test('validates names, coordinates, rhythms, and launcher direction', () => {
  for (const name of ['', 'a'.repeat(17), '\ud800']) assert.ok(has({...draft(), name}, 'placement'));
  for (const guard of [null, [1.5, 2], [-1, 2], [0, 0]]) assert.ok(has({...draft(), guards:[guard]}, 'placement'));
  for (const spike of [null, {x:4,y:4,tempo:3,phase:0}, {x:4,y:4,tempo:0,phase:4}]) {
    assert.ok(has({...draft(), spikes:[spike]}, 'placement'));
  }
  const value = draft(); value.launchers = [{x:4,y:4,dir:1,tempo:0,phase:0}];
  assert.ok(has(value, 'placement'));
  value.launchers = [{x:0,y:4,dir:1,tempo:0,phase:0}];
  assert.deepEqual(validateDraft(value).errors, []);
  for (const dir of [-1, 0, 4, 1.5]) {
    value.launchers[0].dir = dir; assert.ok(has(value, 'placement'));
  }
});
test('walls, pits, and fences can seal the exit', () => {
  for (const tile of [TILE.WALL, TILE.PIT, TILE.FENCE]) {
    const value = draft(); value.exit = [3, 30];
    for (let x=1;x<35;x++) value.tiles[24*36+x] = tile;
    assert.ok(has(value, 'unreachable'));
  }
});
test('sound lock across diagonal gaps is activatable without walking onto it', () => {
  const value = draft(); value.mechanism = [10, 10];
  for (const [x,y] of [[9,10],[11,10],[10,9],[10,11]]) value.tiles[y*36+x] = TILE.PIT;
  const level = toRuntimeLevel(value);
  const { propagate } = require('../src/propagation');
  const forward = propagate(level, 9.5, 9.5, 'low', 17).at(...level.mechanism);
  const reverse = propagate(level, ...level.mechanism, 'low', 17).at(9.5, 9.5);
  assert.ok(Number.isFinite(forward));
  assert.equal(forward, reverse);
  assert.deepEqual(validateDraft(value).errors, []);
});
test('sound lock behind sealed walls is acoustically unreachable', () => {
  const value = draft(); value.mechanism = [10, 10];
  for (let y=9;y<=11;y++) for(let x=9;x<=11;x++) value.tiles[y*36+x] = TILE.WALL;
  value.tiles[10*36+10] = TILE.FLOOR;
  assert.ok(has(value, 'lock-unreachable'));
});
test('sound lock beyond maximum probe radius is unreachable', () => {
  const value = draft(); value.mechanism = [30, 40];
  for(let y=1;y<47;y++) for(let x=1;x<35;x++) value.tiles[y*36+x] = TILE.PIT;
  for(const [x,y] of [value.start,value.exit,value.mechanism]) value.tiles[y*36+x] = TILE.FLOOR;
  value.exit = [3,2]; value.tiles[2*36+3]=TILE.FLOOR;
  assert.ok(has(value, 'lock-unreachable'));
});

test('size must be a supported string without coercing JSON objects or arrays', () => {
  for (const size of [{ toString: null }, ['small'], {}, 1, null]) {
    const value = { ...draft(), size };
    assert.ok(has(value, 'size'));
  }
});

test('large dense map rejects a distant sealed lock without building global acoustics', t => {
  const value = draft('large');
  value.exit = [3, 2]; value.mechanism = [60, 80];
  for (let y = 1; y < 95; y += 1) for (let x = 1; x < 71; x += 1) {
    value.tiles[y * 72 + x] = x % 2 === 0 && y % 2 === 0 ? TILE.WALL : TILE.FLOOR;
  }
  for (let y = 1; y <= 3; y += 1) for (let x = 1; x <= 4; x += 1) value.tiles[y * 72 + x] = TILE.WALL;
  for (let y = 79; y <= 81; y += 1) for (let x = 59; x <= 61; x += 1) value.tiles[y * 72 + x] = TILE.WALL;
  for (const [x, y] of [value.start, value.exit, value.mechanism]) value.tiles[y * 72 + x] = TILE.FLOOR;
  const start = performance.now();
  assert.ok(has(value, 'lock-unreachable'));
  const elapsed = performance.now() - start;
  t.diagnostic(`dense distant-lock validation: ${elapsed.toFixed(2)} ms (Node)`);
  assert.ok(elapsed < 500, `distant lock validation took ${elapsed.toFixed(2)} ms`);
});

test('local acoustic bounds preserve runtime activation with distant geometry', () => {
  const { propagate } = require('../src/propagation');
  for (const sealed of [false, true]) {
    const value = draft('large'); value.mechanism = [10, 10];
    for (let y = 60; y <= 80; y += 5) for (let x = 40; x <= 60; x += 5) {
      value.tiles[y * 72 + x] = TILE.WALL;
    }
    const ring = sealed
      ? [[9,9],[10,9],[11,9],[9,10],[11,10],[9,11],[10,11],[11,11]]
      : [[10,9],[9,10],[11,10],[10,11]];
    for (const [x, y] of ring) value.tiles[y * 72 + x] = TILE.PIT;
    const level = toRuntimeLevel(value);
    const runtimeActivation = Number.isFinite(propagate(level, 9.5, 9.5, 'low', 17).at(...level.mechanism));
    assert.equal(runtimeActivation, !sealed);
    assert.equal(has(value, 'lock-unreachable'), !runtimeActivation);
  }
});
