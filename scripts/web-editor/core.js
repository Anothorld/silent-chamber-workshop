const { TERRAIN, isKnownTile, matchesTile } = require('../../src/terrain-catalog');
const { SIZES, TILE, createBlankDraft, toRuntimeLevel } = require('../../src/ugc/model');
const { OBJECT_BY_TYPE, MAX_OBJECTS, ENEMY_TYPES, MAX_ENEMIES } = require('../../src/ugc/objects');
const { createEditorState, beginStroke, endStroke, applyEditorAction } = require('../../src/ugc/editor');
const { validateDraft } = require('../../src/ugc/validation');
const { decodeLevel } = require('../../src/ugc/codec');
const { createWorld } = require('../../src/world');

const copy = value => JSON.parse(JSON.stringify(value));
const UNIQUE = ['start', 'exit', 'mechanism'];
const COLLECTIONS = { guard: 'guards', spike: 'spikes', launcher: 'launchers' };

function lineCells(from, to) {
  const count = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  return Array.from({ length: count + 1 }, (_, i) => ({
    x: Math.round(from.x + (to.x - from.x) * i / (count || 1)),
    y: Math.round(from.y + (to.y - from.y) * i / (count || 1)),
  }));
}

function paintRegion(state, tool, from, to, options = {}) {
  const ownStroke = !state.stroke;
  if (ownStroke) beginStroke(state);
  let changed = false;
  const cells = options.shape === 'rectangle' ? [] : lineCells(from, to);
  if (options.shape === 'rectangle') {
    for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y++) {
      for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x++) cells.push({ x, y });
    }
  }
  const size = Math.max(1, Math.min(3, options.brushSize || 1));
  const offset = Math.floor((size - 1) / 2);
  for (const cell of cells) for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
    const at = { x: cell.x + dx - offset, y: cell.y + dy - offset };
    const action = tool === 'erase' ? { type: 'erase', ...at }
      : tool in TERRAIN ? { type: 'paint', ...at, tile: TERRAIN[tool] }
        : { type: 'place', kind: tool, ...at, ...options.timing };
    changed = applyEditorAction(state, action) || changed;
  }
  if (ownStroke) endStroke(state);
  return changed;
}

function floodFill(state, at, tool) {
  if (!(tool in TERRAIN)) return false;
  const [width, height] = SIZES[state.draft.size];
  if (at.x <= 0 || at.y <= 0 || at.x >= width - 1 || at.y >= height - 1) return false;
  const source = state.draft.tiles[at.x + at.y * width];
  if (source === TERRAIN[tool]) return false;
  const original = state.draft.tiles.slice(), queue = [at], visited = new Set();
  const ownStroke = !state.stroke;
  if (ownStroke) beginStroke(state);
  for (let i = 0; i < queue.length; i++) {
    const { x, y } = queue[i], index = x + y * width;
    if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1 || visited.has(index) || original[index] !== source) continue;
    visited.add(index);
    applyEditorAction(state, { type: 'paint', x, y, tile: TERRAIN[tool] });
    queue.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }
  if (ownStroke) endStroke(state);
  return visited.size > 0;
}

function entities(draft) {
  return [
    ...UNIQUE.filter(kind => draft[kind]).map(kind => ({ kind, x: draft[kind][0], y: draft[kind][1] })),
    ...Object.entries(COLLECTIONS).flatMap(([kind, key]) => draft[key].map((item, index) => ({
      kind, index, ...(kind === 'guard' ? { x: item[0], y: item[1] } : item),
    }))),
    ...(draft.objects || []).map((item, index) => ({ ...item, kind: item.type, index })),
  ];
}

function entityAt(draft, x, y) {
  const items = entities(draft);
  return items.find(item => item.x === x && item.y === y) ||
    items.filter(item => OBJECT_BY_TYPE[item.kind]?.pair).map(item => ({ ...item, endpoint: true }))
      .find(item => item.toX === x && item.toY === y) || null;
}

function moveEntity(state, entity, target) {
  if (!entity) return false;
  const draft = copy(state.draft), { kind, index } = entity;
  let action = { type: 'place', kind, ...entity, x: target.x, y: target.y };
  // The action type must stay "place" when an object also has a persisted type.
  action.type = 'place';
  if (entity.endpoint) { action.x = entity.x; action.y = entity.y; action.toX = target.x; action.toY = target.y; }
  if (UNIQUE.includes(kind)) draft[kind] = null;
  else if (COLLECTIONS[kind]) draft[COLLECTIONS[kind]].splice(index, 1);
  else draft.objects.splice(index, 1);
  const attempt = createEditorState(draft);
  if (!applyEditorAction(attempt, action)) return false;
  return applyEditorAction(state, { type: 'replace', draft: attempt.draft });
}

function importDraft(text) {
  if (typeof text !== 'string' || text.length > 262144) throw new Error('文件过大，最多支持 256 KB');
  text = text.trim();
  if (/^ECL/.test(text)) return decodeLevel(text);
  let input;
  try { input = JSON.parse(text); } catch (_) { throw new Error('请粘贴有效关卡码或草稿 JSON'); }
  const fail = () => { throw new Error('草稿格式无效，请检查尺寸、地形与物件数据'); };
  if (!input || typeof input !== 'object' || !Object.hasOwn(SIZES, input.size)) fail();
  const [width, height] = SIZES[input.size];
  if (typeof input.name !== 'string' || !input.name.trim() || [...input.name].length > 16) fail();
  try { if (encodeURIComponent(input.name).replace(/%[A-F\d]{2}|./gi, 'x').length > 48) fail(); } catch (_) { fail(); }
  if (!Array.isArray(input.tiles) || input.tiles.length !== width * height ||
      input.tiles.some(tile => !isKnownTile(tile))) fail();
  const point = (x, y, tile = 0) => Number.isInteger(x) && Number.isInteger(y) &&
    x >= 0 && y >= 0 && x < width && y < height && matchesTile(input.tiles[x + y * width], tile);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if ((x === 0 || y === 0 || x === width - 1 || y === height - 1) && input.tiles[x + y * width] !== 1) fail();
  }
  for (const kind of UNIQUE) if (input[kind] !== null &&
    (!Array.isArray(input[kind]) || input[kind].length !== 2 || !point(...input[kind]))) fail();
  for (const [key, max] of [['guards', 8], ['spikes', 32], ['launchers', 8], ['objects', MAX_OBJECTS]]) {
    if (key === 'objects' && input[key] === undefined) input.objects = [];
    if (!Array.isArray(input[key]) || input[key].length > max) fail();
  }
  for (const at of input.guards) if (!Array.isArray(at) || at.length !== 2 || !point(...at)) fail();
  for (const [key, tile] of [['spikes', 0], ['launchers', 1]]) for (const item of input[key]) {
    if (!item || !point(item.x, item.y, tile) || ![0, 1, 2].includes(item.tempo) || ![0, 1, 2, 3].includes(item.phase)) fail();
    if (key === 'launchers') {
      const dir = [[0, -1], [1, 0], [0, 1], [-1, 0]][item.dir];
      if (!Number.isInteger(item.dir) || !dir || !point(item.x + dir[0], item.y + dir[1])) fail();
    }
  }
  const counts = {}, used = new Set();
  const occupy = (x, y) => { const key = `${x},${y}`; if (used.has(key)) fail(); used.add(key); };
  for (const kind of UNIQUE) if (input[kind]) occupy(...input[kind]);
  for (const at of input.guards) occupy(...at);
  for (const item of [...input.spikes, ...input.launchers]) occupy(item.x, item.y);
  for (const item of input.objects) {
    const spec = item && typeof item.type === 'string' && OBJECT_BY_TYPE[item.type];
    if (!spec || !point(item.x, item.y, spec.tile) || (counts[item.type] = (counts[item.type] || 0) + 1) > spec.limit) fail();
    if (item.type === 'lockedWall' && (item.x === 0 || item.y === 0 || item.x === width - 1 || item.y === height - 1)) fail();
    occupy(item.x, item.y);
    if (spec.pair) {
      if (!point(item.toX, item.toY) || item.x === item.toX && item.y === item.toY) fail();
      if (item.type !== 'relay') occupy(item.toX, item.toY);
    } else if ('toX' in item || 'toY' in item) fail();
  }
  if (input.guards.length + input.objects.filter(item => ENEMY_TYPES.has(item.type)).length > MAX_ENEMIES) fail();
  if (input.origin !== null && (!input.origin || !Number.isInteger(input.origin.seed) || input.origin.seed < 0 ||
    input.origin.seed > 0xffffffff || !Number.isInteger(input.origin.generatorVersion) ||
    input.origin.generatorVersion < 0 || input.origin.generatorVersion > 255)) fail();
  const result = createBlankDraft(input.size, input.name);
  for (const key of Object.keys(result)) result[key] = copy(input[key]);
  return result;
}

function makeExample() {
  const d = createBlankDraft('small', '回声之间');
  d.tiles.fill(TILE.WALL);
  const room = (x1, y1, x2, y2) => {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) d.tiles[x + y * 36] = TILE.FLOOR;
  };
  room(4, 34, 15, 43); room(9, 23, 11, 36); room(5, 18, 19, 27);
  room(17, 22, 28, 24); room(26, 7, 28, 37); room(22, 4, 31, 13); room(20, 31, 31, 41);
  d.start = [7, 40]; d.exit = [27, 7]; d.mechanism = [7, 21];
  d.objects = [ { type: 'patrol', x: 23, y: 37, toX: 29, toY: 37 },
    { type: 'beacon', x: 10, y: 25 }, { type: 'silent', x: 26, y: 32 },
    { type: 'silent', x: 27, y: 32 }, { type: 'silent', x: 28, y: 32 },
    { type: 'noisy', x: 18, y: 23 }, { type: 'relay', x: 25, y: 11, toX: 7, toY: 21 } ];
  d.spikes = [{ x: 27, y: 19, tempo: 1, phase: 0 }];
  for (const [x, y] of [[13, 40], [14, 40], [13, 41], [14, 41]]) d.tiles[x + y * 36] = TILE.PIT;
  for (let y = 19; y <= 23; y++) d.tiles[16 + y * 36] = TILE.FENCE;
  return d;
}

function createPreviewWorld(draft) {
  const { errors } = validateDraft(draft);
  if (errors.length) throw new Error(errors.map(error => error.message).join('；'));
  return createWorld(toRuntimeLevel(copy(draft)));
}

module.exports = { TERRAIN, lineCells, paintRegion, floodFill, entities, entityAt, moveEntity, importDraft, makeExample, createPreviewWorld };
