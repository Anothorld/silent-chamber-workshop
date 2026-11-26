const { isKnownTile, matchesTile } = require('../terrain-catalog');
const { SIZES, TILE, DIRS } = require('./model');
const { OBJECT_BY_TYPE, MAX_OBJECTS, ENEMY_TYPES, MAX_ENEMIES } = require('./objects');
const copy = value => JSON.parse(JSON.stringify(value));
const unique = ['start', 'exit', 'mechanism'];
const collections = { guard: 'guards', spike: 'spikes', launcher: 'launchers' };
const caps = { guard: 8, spike: 32, launcher: 8 };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** Mutable editor state. camera.x/y are tile origins; baseTileSize is pixels at zoom 1.
 * UI may update zoom/camera directly; screenToCell clamps them using rect dimensions.
 */
function createEditorState(draft) {
  return { draft: { ...copy(draft), objects: copy(draft.objects || []) }, past: [], future: [], stroke: null, zoom: 1,
    revision: 0, renderRevision: 0, renderDirty: true, baseTileSize: 20, camera: { x: 0, y: 0 }, won: false };
}
function beginStroke(state) {
  if (!state.stroke) state.stroke = { before: copy(state.draft), won: state.won };
}
function cancelStroke(state) {
  if (!state.stroke) return;
  if (!same(state.draft, state.stroke.before)) state.revision++;
  state.draft = state.stroke.before;
  state.won = state.stroke.won;
  state.stroke = null;
}
function endStroke(state) {
  if (!state.stroke) return;
  if (!same(state.stroke.before, state.draft)) {
    state.past.push(state.stroke.before);
    if (state.past.length > 40) state.past.shift();
    state.future.length = 0;
    state.won = false;
  }
  state.stroke = null;
}
function clearCell(draft, x, y, change) {
  for (const key of unique) if (draft[key] && draft[key][0] === x && draft[key][1] === y) {
    change(); draft[key] = null;
  }
  for (const key of ['guards', 'spikes', 'launchers', 'objects']) {
    const items = draft[key] || [];
    const keep = item => key === 'guards' ? item[0] !== x || item[1] !== y :
      (item.x !== x || item.y !== y) &&
      !(key === 'objects' && OBJECT_BY_TYPE[item.type]?.pair && item.toX === x && item.toY === y);
    if (items.some(item => !keep(item))) { change(); draft[key] = items.filter(keep); }
  }
}
function occupied(draft, x, y, except) {
  return unique.some(key => key !== except && draft[key] && draft[key][0] === x && draft[key][1] === y) ||
    draft.guards.some(p => p[0] === x && p[1] === y) ||
    [...draft.spikes, ...draft.launchers].some(p => p.x === x && p.y === y) ||
    (draft.objects || []).some(item => item.x === x && item.y === y ||
      OBJECT_BY_TYPE[item.type]?.pair && item.type !== 'relay' && item.toX === x && item.toY === y);
}
function canStartObject(draft, kind, x, y) {
  const spec = OBJECT_BY_TYPE[kind];
  if (!spec || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  const [width, height] = SIZES[draft.size];
  const objects = draft.objects || [];
  return x > 0 && y > 0 && x < width - 1 && y < height - 1 &&
    matchesTile(draft.tiles[x + y * width], spec.tile) && !occupied(draft, x, y) &&
    objects.length < MAX_OBJECTS &&
    (!ENEMY_TYPES.has(kind) || draft.guards.length +
      objects.filter(item => ENEMY_TYPES.has(item.type)).length < MAX_ENEMIES) &&
    objects.filter(item => item.type === kind).length < spec.limit;
}
function launcherDirections(draft, x, y) {
  const [width, height] = SIZES[draft.size];
  return DIRS.flatMap(([dx, dy], dir) => {
    const nx = x + dx, ny = y + dy;
    return nx >= 0 && ny >= 0 && nx < width && ny < height &&
      matchesTile(draft.tiles[nx + ny * width]) ? [dir] : [];
  });
}
/** Actions (invalid requests return false):
 * paint {x,y,tile}; place {kind:'start'|'exit'|'mechanism'|'guard'|'spike'|'launcher',x,y,dir?,tempo?,phase?};
 * erase {x,y} removes objects, restores interior floor; timing {kind:'spike'|'launcher',x,y,tempo?,phase?,dir?};
 * fill {tile} changes all interior terrain; replace {draft} replaces the entire draft.
 * Each standalone action commits automatically; beginStroke/endStroke group any number.
 */
function applyEditorAction(state, action) {
  const auto = !state.stroke;
  let changed = false;
  const change = () => { if (auto && !state.stroke) beginStroke(state); changed = true; };
  const d = state.draft, [width, height] = SIZES[d.size];
  const { x, y } = action;
  const inside = Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < width && y < height;
  const interior = inside && x > 0 && y > 0 && x < width - 1 && y < height - 1;
  const tileValid = isKnownTile(action.tile);
  const paint = (px, py, tile) => {
    const index = px + py * width;
    if (d.tiles[index] !== tile) { change(); clearCell(d, px, py, change); d.tiles[index] = tile; }
  };
  const tileAt = (px, py) => px >= 0 && py >= 0 && px < width && py < height
    ? d.tiles[px + py * width] : undefined;
  const tempo = action.tempo === undefined ? 1 : action.tempo;
  const phase = action.phase === undefined ? 0 : action.phase;
  const dir = action.dir === undefined ? 0 : action.dir;
  const validTiming = [0, 1, 2].includes(tempo) && [0, 1, 2, 3].includes(phase);
  const facesFloor = direction => launcherDirections(d, x, y).includes(direction);
  if (action.type === 'paint' && interior && tileValid) paint(x, y, action.tile);
  if (action.type === 'erase' && inside) { clearCell(d, x, y, change); if (interior) paint(x, y, TILE.FLOOR); }
  if (action.type === 'fill' && tileValid) {
    for (let py = 1; py < height - 1; py++) for (let px = 1; px < width - 1; px++) paint(px, py, action.tile);
  }
  if (action.type === 'place' && inside && !occupied(d, x, y, action.kind)) {
    if (unique.includes(action.kind) && matchesTile(d.tiles[x + y * width]) &&
        (d[action.kind]?.[0] !== x || d[action.kind]?.[1] !== y)) { change(); d[action.kind] = [x, y]; }
    const key = collections[action.kind];
    if (key && d[key].length < caps[action.kind] && validTiming &&
        (action.kind !== 'guard' || d.guards.length + d.objects.filter(item => ENEMY_TYPES.has(item.type)).length < MAX_ENEMIES) &&
        matchesTile(d.tiles[x + y * width], action.kind === 'launcher' ? TILE.WALL : TILE.FLOOR) &&
        (action.kind !== 'launcher' || facesFloor(dir))) {
      change();
      d[key].push(action.kind === 'guard' ? [x, y] : { x, y, tempo, phase, ...(action.kind === 'launcher' ? { dir } : {}) });
    }
    const spec = OBJECT_BY_TYPE[action.kind];
    if (spec && canStartObject(d, action.kind, x, y)) {
      const toX = action.toX, toY = action.toY;
      const validPair = !spec.pair ||
        Number.isInteger(toX) && Number.isInteger(toY) &&
        (toX !== x || toY !== y) && matchesTile(tileAt(toX, toY)) &&
        (action.kind === 'relay' || !occupied(d, toX, toY));
      if (validPair) { change(); d.objects.push({ type: action.kind, x, y,
        ...(spec.pair ? { toX, toY } : {}) }); }
    }
  }
  if (action.type === 'timing' && inside && ['spike', 'launcher'].includes(action.kind)) {
    const item = d[collections[action.kind]].find(p => p.x === x && p.y === y);
    if (item) {
      const nextTempo = action.tempo === undefined ? item.tempo : action.tempo;
      const nextPhase = action.phase === undefined ? item.phase : action.phase;
      const nextDir = action.dir === undefined ? item.dir : action.dir;
      if ([0, 1, 2].includes(nextTempo) && [0, 1, 2, 3].includes(nextPhase) &&
          (action.kind !== 'launcher' || facesFloor(nextDir))) {
        if (item.tempo !== nextTempo || item.phase !== nextPhase ||
            (action.kind === 'launcher' && item.dir !== nextDir)) change();
        item.tempo = nextTempo; item.phase = nextPhase;
        if (action.kind === 'launcher') item.dir = nextDir;
      }
    }
  }
  if (action.type === 'replace' && action.draft && Object.prototype.hasOwnProperty.call(SIZES, action.draft.size) &&
      !same(state.draft, action.draft)) { change(); state.draft = copy(action.draft); }
  if (changed) { state.won = false; state.revision++; }
  if (auto) endStroke(state);
  return changed;
}
function undo(state) {
  endStroke(state);
  if (!state.past.length) return false;
  state.future.push(copy(state.draft)); state.draft = state.past.pop(); state.won = false; state.revision++;
  return true;
}
function redo(state) {
  endStroke(state);
  if (!state.future.length) return false;
  state.past.push(copy(state.draft)); state.draft = state.future.pop(); state.won = false; state.revision++;
  return true;
}
/** rect = {x,y,width,height} in the same screen pixels as x/y. Returns {x,y} or null.
 * When viewport exceeds map, camera is 0 and excess pixels return null.
 */
function screenToCell(state, x, y, rect) {
  const [width, height] = SIZES[state.draft.size];
  if (!Number.isFinite(state.zoom) || state.zoom <= 0) state.zoom = 1;
  if (!Number.isFinite(state.baseTileSize) || state.baseTileSize <= 0) state.baseTileSize = 20;
  const scale = state.baseTileSize * state.zoom;
  const clamp = (value, max) => Math.max(0, Math.min(Number.isFinite(value) ? value : 0, Math.max(0, max)));
  state.camera.x = clamp(state.camera.x, width - rect.width / scale);
  state.camera.y = clamp(state.camera.y, height - rect.height / scale);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < rect.x || y < rect.y || x >= rect.x + rect.width || y >= rect.y + rect.height) return null;
  const cx = Math.floor((x - rect.x) / scale + state.camera.x);
  const cy = Math.floor((y - rect.y) / scale + state.camera.y);
  return cx >= 0 && cy >= 0 && cx < width && cy < height ? { x: cx, y: cy } : null;
}
module.exports = { createEditorState, beginStroke, cancelStroke, applyEditorAction,
  canStartObject, launcherDirections, endStroke, undo, redo, screenToCell };
