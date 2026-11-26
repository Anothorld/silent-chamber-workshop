const { TERRAIN_TYPES, TERRAIN_BY_TILE } = require('../terrain-catalog');
const { OBJECT_TYPES, OBJECT_BY_TYPE, appendRuntime } = require('./objects');
const SIZES = Object.freeze({ small: [36, 48], medium: [54, 72], large: [72, 96] });
const TILE = Object.freeze(Object.fromEntries(TERRAIN_TYPES.map(spec => [spec.type.toUpperCase(), spec.tile])));
const PERIODS = [2.6, 3.4, 4.2];
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

function createBlankDraft(size, name = '未命名关卡') {
  const dimensions = SIZES[size];
  if (!dimensions) throw new Error('invalid-size');
  const [width, height] = dimensions;
  const tiles = Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    return x === 0 || y === 0 || x === width - 1 || y === height - 1
      ? TILE.WALL
      : TILE.FLOOR;
  });
  return {
    size,
    name,
    tiles,
    start: null,
    exit: null,
    mechanism: null,
    guards: [],
    spikes: [],
    launchers: [],
    objects: [],
    origin: null,
  };
}

function toRuntimeLevel(draft) {
  const [width, height] = SIZES[draft.size];
  const walls = new Set();
  const pits = new Set();
  const fences = new Set();
  const center = ([x, y]) => [x + 0.5, y + 0.5];
  const timing = item => ({
    period: PERIODS[item.tempo],
    phase: PERIODS[item.tempo] * item.phase / 4,
  });
  const objects = draft.objects || [];
  const level = {
    width,
    height,
    name: draft.name,
    hint: '玩家制作',
    walls,
    pits,
    fences,
    start: center(draft.start),
    exit: center(draft.exit),
    mechanism: draft.mechanism && center(draft.mechanism),
    enemies: draft.guards.map(center),
    spikes: draft.spikes.map(item => ({
      x: item.x + 0.5,
      y: item.y + 0.5,
      ...timing(item),
      duration: 0.75,
    })),
    launchers: draft.launchers.map(item => ({
      x: item.x + 0.5,
      y: item.y + 0.5,
      dx: DIRS[item.dir][0],
      dy: DIRS[item.dir][1],
      ...timing(item),
      speed: 7.5,
      range: 15,
    })),
  };
  for (const spec of OBJECT_TYPES) {
    if (spec.runtime) level[spec.runtime.key] ||= spec.runtime.shape === 'set' ? new Set() : [];
  }
  draft.tiles.forEach((tile, index) => appendRuntime(level, TERRAIN_BY_TILE[tile]?.runtime,
    { x: index % width, y: Math.floor(index / width) }));
  for (const item of objects) appendRuntime(level, OBJECT_BY_TYPE[item.type]?.runtime, item);
  return level;
}

module.exports = { SIZES, TILE, PERIODS, DIRS, createBlankDraft, toRuntimeLevel };
