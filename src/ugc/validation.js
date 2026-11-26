const { isKnownTile, matchesTile } = require('../terrain-catalog');
const { SIZES, TILE, DIRS, toRuntimeLevel } = require('./model');
const { OBJECT_BY_TYPE, MAX_OBJECTS, ENEMY_TYPES, MAX_ENEMIES } = require('./objects');
const { propagate } = require('../propagation');
function utf8Size(value) {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code >= 0xd800 && code <= 0xdfff) return Infinity;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}
function validateDraft(draft) {
  const errors = [], warnings = [];
  const dimensions = draft && typeof draft.size === 'string' &&
    Object.prototype.hasOwnProperty.call(SIZES, draft.size)
    ? SIZES[draft.size] : null;
  if (!dimensions) return { errors: [{ code: 'size', message: '地图尺寸无效' }], warnings };
  const [width, height] = dimensions;
  if (!Array.isArray(draft.tiles) || draft.tiles.length !== width * height ||
      Array.from(draft.tiles).some(tile => !isKnownTile(tile))) {
    return { errors: [{ code: 'terrain', message: '地形数据无效' }], warnings };
  }
  if (typeof draft.name !== 'string' || Array.from(draft.name).length < 1 ||
      Array.from(draft.name).length > 16 || utf8Size(draft.name) > 48) {
    errors.push({ code: 'placement', message: '关卡名称无效' });
  }
  const tileAt = (x, y) => x >= 0 && y >= 0 && x < width && y < height
    ? draft.tiles[y * width + x] : undefined;
  const occupied = new Set();
  const point = (value, code, expectedTile = TILE.FLOOR) => {
    if (!Array.isArray(value) || value.length !== 2 ||
        !value.every(Number.isInteger) || value[0] < 0 || value[0] >= width ||
        value[1] < 0 || value[1] >= height ||
        !matchesTile(tileAt(value[0], value[1]), expectedTile)) {
      errors.push({ code, message: '物件位置无效' });
      return false;
    }
    const key = value.join(',');
    if (occupied.has(key)) errors.push({ code: 'overlap', message: '物件不能重合' });
    occupied.add(key);
    return true;
  };
  for (let x = 0; x < width; x += 1) {
    if (tileAt(x, 0) !== TILE.WALL || tileAt(x, height - 1) !== TILE.WALL) {
      errors.push({ code: 'terrain', message: '地图边界必须是墙' }); break;
    }
  }
  for (let y = 0; y < height; y += 1) {
    if (tileAt(0, y) !== TILE.WALL || tileAt(width - 1, y) !== TILE.WALL) {
      errors.push({ code: 'terrain', message: '地图边界必须是墙' }); break;
    }
  }
  point(draft.start, 'start');
  point(draft.exit, 'exit');
  if (draft.mechanism !== null) point(draft.mechanism, 'placement');
  for (const [items, limit] of [[draft.guards, 8], [draft.spikes, 32],
    [draft.launchers, 8], [draft.objects === undefined ? [] : draft.objects, MAX_OBJECTS]]) {
    if (!Array.isArray(items) || items.length > limit) {
      errors.push({ code: 'count', message: '危险物数量超限' });
    }
  }
  if (errors.length) return { errors, warnings };
  for (const guard of draft.guards) point(guard, 'placement');
  for (const spike of draft.spikes) {
    if (!spike || typeof spike !== 'object') {
      errors.push({ code: 'placement', message: '地刺数据无效' }); continue;
    }
    point([spike.x, spike.y], 'placement');
    if (![0, 1, 2].includes(spike.tempo) || ![0, 1, 2, 3].includes(spike.phase)) {
      errors.push({ code: 'placement', message: '地刺节奏无效' });
    }
  }
  for (const launcher of draft.launchers) {
    if (!launcher || typeof launcher !== 'object') {
      errors.push({ code: 'placement', message: '弓箭数据无效' }); continue;
    }
    if (point([launcher.x, launcher.y], 'placement', TILE.WALL) &&
        (!Number.isInteger(launcher.dir) || launcher.dir < 0 || launcher.dir > 3 ||
        !matchesTile(tileAt(launcher.x + DIRS[launcher.dir][0],
          launcher.y + DIRS[launcher.dir][1])) ||
        ![0, 1, 2].includes(launcher.tempo) ||
        ![0, 1, 2, 3].includes(launcher.phase))) {
      errors.push({ code: 'placement', message: '弓箭方向或节奏无效' });
    }
  }
  const objects = draft.objects || [];
  const counts = {};
  for (const item of objects) {
    const spec = item && typeof item.type === 'string' && OBJECT_BY_TYPE[item.type];
    if (!spec) { errors.push({ code: 'placement', message: '机关类型无效' }); continue; }
    counts[item.type] = (counts[item.type] || 0) + 1;
    if (counts[item.type] > spec.limit) errors.push({ code: 'count', message: '机关数量超限' });
    if (!point([item.x, item.y], 'placement', spec.tile)) continue;
    if (item.type === 'lockedWall' &&
        (item.x === 0 || item.y === 0 || item.x === width - 1 || item.y === height - 1)) {
      errors.push({ code: 'placement', message: '机关墙不能放在地图边界' });
    }
    if (spec.pair) {
      const target = [item.toX, item.toY];
      if (target[0] === item.x && target[1] === item.y) {
        errors.push({ code: 'placement', message: '起点和终点不能相同' });
      } else if (item.type === 'relay') {
        if (!target.every(Number.isInteger) || !matchesTile(tileAt(...target))) {
          errors.push({ code: 'placement', message: '传声目标位置无效' });
        }
      } else point(target, 'placement');
    } else if ('toX' in item || 'toY' in item) {
      errors.push({ code: 'placement', message: '机关数据无效' });
    }
  }
  if (errors.length) return { errors, warnings };
  if (draft.guards.length + objects.filter(item => ENEMY_TYPES.has(item.type)).length > MAX_ENEMIES) {
    errors.push({ code: 'count', message: '敌人数量超限' });
  }
  if (objects.some(item => item.type === 'lockedWall') && !draft.mechanism &&
      !objects.some(item => item.type === 'sequence')) {
    errors.push({ code: 'placement', message: '机关墙需要声锁或顺序声节点' });
  }
  if (errors.length) return { errors, warnings };
  const level = toRuntimeLevel(draft);
  const lockedWalls = level.mechanismWalls;
  const flood = unlocked => {
    const reachable = new Set([draft.start.join(',')]);
    const queue = [draft.start];
    for (let index = 0; index < queue.length; index += 1) {
      const [x, y] = queue[index];
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        const key = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height ||
            !matchesTile(tileAt(nx, ny)) && !(unlocked && lockedWalls.has(key)) ||
            reachable.has(key)) continue;
        reachable.add(key);
        queue.push([nx, ny]);
      }
    }
    return { reachable, queue };
  };
  const beforeUnlock = flood(false);
  const reachable = beforeUnlock.reachable;
  const queue = beforeUnlock.queue;
  if (!(lockedWalls.size ? flood(true).reachable : reachable).has(draft.exit.join(','))) {
    errors.push({ code: 'unreachable', message: '出口不可达' });
  }
  for (const item of objects.filter(object => object.type === 'sequence')) {
    if (!reachable.has(`${item.x},${item.y}`) || !reachable.has(`${item.toX},${item.toY}`)) {
      errors.push({ code: 'unreachable', message: '顺序声节点不可达' });
    }
  }
  if (level.mechanism && !reachable.has(draft.mechanism.join(','))) {
    // A charged probe may hit the lock directly or trigger a reachable relay.
    const reachableByProbe = (sx, sy) => {
      const candidates = queue.filter(([x, y]) => (x - sx) ** 2 + (y - sy) ** 2 <= 17 ** 2);
      if (!candidates.length) return false;
      const localCells = cells => new Set([...cells].filter(key => {
        const [x, y] = key.split(',').map(Number);
        return Math.abs(x - sx) <= 18 && Math.abs(y - sy) <= 18;
      }));
      const acousticMap = { width, height,
        walls: localCells(level.walls), pits: localCells(level.pits),
        fences: localCells(level.fences) };
      const field = propagate(acousticMap, sx + 0.5, sy + 0.5, 'low', 17);
      return candidates.some(([x, y]) => Number.isFinite(field.at(x + 0.5, y + 0.5)));
    };
    const activatable = reachableByProbe(...draft.mechanism) ||
      objects.filter(item => item.type === 'relay').some(item =>
        reachableByProbe(item.x, item.y) &&
        Number.isFinite(propagate(level, item.toX + 0.5, item.toY + 0.5, 'low', 7)
          .at(...level.mechanism)));
    if (!activatable) {
      errors.push({ code: 'lock-unreachable', message: '声锁不可达' });
    }
  }
  let floorCount = 0, referenced = 0;
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
    if (!matchesTile(tileAt(x, y))) continue;
    floorCount += 1;
    let nearWall = false;
    for (let dy = -3; dy <= 3 && !nearWall; dy += 1) {
      for (let dx = -3; dx <= 3; dx += 1) {
        if (dx * dx + dy * dy <= 9 && x + dx >= 0 && x + dx < width &&
            y + dy >= 0 && y + dy < height &&
            [TILE.WALL, TILE.FENCE].includes(tileAt(x + dx, y + dy))) {
          nearWall = true; break;
        }
      }
    }
    if (nearWall) referenced += 1;
  }
  if (floorCount && referenced / floorCount < 0.9) {
    warnings.push({ code: 'acoustic-reference', message: '开阔区缺少声波参照物' });
  }
  return { errors, warnings };
}
module.exports = { validateDraft };
