const { blocked, propagate, directionalField, traceRicochet, getGeometry } = require('./propagation');
const { createHazards, checkGroundHazards, updateHazards } = require('./hazards');
const { createDevices, onPlayerMove, rebuildTerrain, updateDevices } = require('./devices');
const { isPresence, createAmbientSources, updateAmbient } = require('./acoustic-signatures');
const { enemyAlerted, syncEnemyAlert } = require('./enemy-state');
const { createMimic, resetMimic, hearMimic,
  advanceMimicTimers, updateMimic } = require('./enemies/mimic.js');

const PLAYER_MAX_SPEED = 4.1;
const ACTOR_RADIUS = 0.19;
const ENEMY_ALERT_SPEED = PLAYER_MAX_SPEED * 0.9;
const ENEMY_SEARCH_SPEED = ENEMY_ALERT_SPEED / 2;
const ENEMY_TRACK_RANGE = 3;
const DISTRACTION_SOUNDS = new Set(['lure', 'landing', 'decoy']);
const STONE_PICKUP_DISTANCE = 0.45;
const LURE_TRAIL_HOLD = 0.45;
const SEARCH_DURATION = 8;
const FOOTPRINT_LIFETIME = 15;
const SEARCH_DIRECTIONS = [
  [1, 0], [Math.SQRT1_2, Math.SQRT1_2], [0, 1], [-Math.SQRT1_2, Math.SQRT1_2],
  [-1, 0], [-Math.SQRT1_2, -Math.SQRT1_2], [0, -1], [Math.SQRT1_2, -Math.SQRT1_2],
];
const SEARCH_OFFSETS = [1.4, 2.8].flatMap(radius =>
  SEARCH_DIRECTIONS.map(([dx, dy]) => [dx * radius, dy * radius]));
const routeFields = new WeakMap();

function createWorld(level, options = {}) {
  if (options.actors && level.mimics?.length) throw new Error('mimic placement requires solo world');
  const enemyState = (x, y, index, extra = {}) => ({
    x, y, home: [x, y], mode: 'idle', target: null,
    searchUntil: 0, searchCenter: null, searchTarget: null,
    searchSeed: Math.imul(index + 1, 2654435761) >>> 0,
    targetField: null, alertTransition: { from: 0, to: 0, at: 0 },
    ...extra,
  });
  const guards = (level.enemies || []).map(([x, y], index) => enemyState(x, y, index));
  const patrols = (level.patrols || []).map((patrol, index) =>
    enemyState(...patrol.path[0], guards.length + index,
      { type: 'patrol', mode: 'patrol', path: patrol.path, patrolIndex: 1 % patrol.path.length }));
  const bats = (level.bats || []).map((bat, index) =>
    enemyState(bat.x, bat.y, guards.length + patrols.length + index,
      { type: 'bat', scanAt: bat.phase ?? bat.period, period: bat.period,
        range: bat.range || 9, angles: bat.angles, scanIndex: 0 }));
  const wanderers = (level.wanderers || []).map(([x, y], index) =>
    enemyState(x, y, guards.length + patrols.length + bats.length + index,
      { type: 'wanderer', mode: 'wander', wanderTarget: null, wanderPrevious: null }));
  const sentinels = (level.sentinels || []).map((sentinel, index) =>
    enemyState(sentinel.x, sentinel.y,
      guards.length + patrols.length + bats.length + wanderers.length + index,
      { type: 'sentinel', scanAt: sentinel.phase ?? sentinel.period,
        period: sentinel.period, range: sentinel.range || 6, warned: false }));
  const mimics = (level.mimics || []).map(([x, y], index) => createMimic(x, y, `mimic:${index}`));
  const world = {
    level, time: 0, player: { x: level.start[0], y: level.start[1] },
    enemies: [...guards, ...patrols, ...bats, ...wanderers, ...sentinels, ...mimics],
    waves: [], lures: [], stones: [], stonesHeld: 1, nextWave: 0,
    mimicAudioEvents: [], nextMimicEvent: 0,
    footprints: [], nextFootprintSide: -1,
    mechanismActive: !level.mechanism,
    unlocked: !level.mechanism && !(level.sequenceNodes || []).length,
    ...createHazards(level),
    ...createDevices(level),
    invincible: !!level.debugGallery,
    failed: false, complete: false,
  };
  world.shared = !!options.actors;
  if (world.shared) world.actors = options.actors;
  else {
    let player = world.player;
    Object.defineProperty(world, 'player', {
      enumerable: true,
      get: () => player,
      set: actor => {
        actor.stonesHeld ??= player.stonesHeld;
        player = actor;
      },
    });
    Object.defineProperty(world, 'actors', {
      enumerable: true,
      get: () => [world.player],
    });
  }
  if (world.shared && world.actors.length) world.player = world.actors[0];
  for (const actor of world.actors) actor.stonesHeld ??= 1;
  // Keep the solo UI inventory API while storing inventory on its actor.
  Object.defineProperty(world, 'stonesHeld', {
    enumerable: true,
    get: () => world.player.stonesHeld,
    set: value => { world.player.stonesHeld = value; },
  });
  world.killActor = (actor, cause, metadata = {}) => {
    if (actor.alive === false || actor.escaped || !world.shared && world.time < (world.protectedUntil || 0)) return false;
    actor.deathEvent = Object.freeze({ cause,
      enemyType: cause === 'enemy' ? metadata.enemyType ?? null : null,
      enemyId: cause === 'enemy' ? metadata.enemyId ?? null : null,
      at: world.time });
    actor.alive = false;
    if (options.onActorKilled) options.onActorKilled(actor, cause, actor.deathEvent);
    else if (!world.shared) world.failed = true;
    return true;
  };
  world.ambientSources = createAmbientSources(world);
  return world;
}

function emitSound(world, x, y, type, radius, intensity = 1, fieldOverride = null, ownerId) {
  const tone = type === 'bat' || type === 'footstep' && radius < 8 ? 'high' : 'low';
  let field = fieldOverride || propagate(world.level, x, y, tone, type === 'enemy'
    ? Math.max(16, radius) : radius, radius);
  if (type === 'enemy' && !fieldOverride) {
    const acoustic = field;
    field = {
      at(px, py) {
        const distance = acoustic.at(px, py);
        // Heartbeat volume is constant beyond 16 acoustic cells. Keep that
        // audible floor without solving paths across the entire authored map.
        return Number.isFinite(distance) ? distance : Math.max(16, Math.hypot(px - x, py - y));
      },
      get visual() { return acoustic.visual; },
    };
  }
  const wave = {
    id: world.nextWave++, x, y, type, tone, radius, intensity, ownerId,
    start: world.time, speed: tone === 'high' ? 8 : 6,
    field, heard: new Set(), mechanismChecked: false,
    passive: isPresence(type),
  };
  world.waves.push(wave);
  return wave;
}

function queueMimicEffects(world, effects) {
  for (const effect of effects) {
    world.mimicAudioEvents.push({ ...effect, id: world.nextMimicEvent++ });
  }
}

function takeMimicAudioEvents(world) {
  return world.mimicAudioEvents.splice(0);
}

function emitLure(world, dx, dy, actor = world.player) {
  if (actor.alive === false || actor.escaped || actor.stonesHeld <= 0) return null;
  const path = traceRicochet(world.level, actor.x, actor.y, dx, dy);
  actor.stonesHeld -= 1;
  world.lures.push({
    ...path, ownerId: actor.id, toX: path.x, toY: path.y,
    start: world.time, arrived: false, impactIndex: 0,
    trailUntil: world.time + path.duration + LURE_TRAIL_HOLD,
  });
  return path;
}

function canStand(level, x, y) {
  const r = ACTOR_RADIUS;
  return !blocked(level, Math.floor(x - r), Math.floor(y - r)) &&
    !blocked(level, Math.floor(x + r), Math.floor(y - r)) &&
    !blocked(level, Math.floor(x - r), Math.floor(y + r)) &&
    !blocked(level, Math.floor(x + r), Math.floor(y + r));
}

function reviveWorld(world) {
  if (!world.failed || world.complete || world.invincible) return false;
  const level = world.level;
  const origin = world.baseLevel?.start || level.start;
  const queue = [[Math.floor(origin[0]), Math.floor(origin[1])]];
  const seen = new Set();
  let best = null, bestScore = Infinity;
  for (let index = 0; index < queue.length; index++) {
    const [x,y] = queue[index], key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (blocked(level,x,y) || level.pits?.has(key)) continue;
    const px=x+0.5, py=y+0.5;
    const dangerous = (world.enemies || []).some(enemy=>Math.hypot(enemy.x-px,enemy.y-py)<2) ||
      [...(world.spikes || []), ...(world.mines || []), ...(world.arrows || [])]
        .some(hazard=>Math.hypot(hazard.x-px,hazard.y-py)<1.6) ||
      Math.hypot(px-level.exit[0],py-level.exit[1])<1;
    const score = Math.hypot(px-world.player.x,py-world.player.y)+(dangerous?level.width*level.height:0);
    if (canStand(level,px,py) && score<bestScore) { best={x:px,y:py}; bestScore=score; }
    for (const [dx,dy] of SEARCH_DIRECTIONS.filter(([dx,dy])=>dx===0 || dy===0)) queue.push([x+dx,y+dy]);
  }
  if (!best) return false;
  Object.assign(world.player,best);
  world.failed=false; world.player.alive=true;
  delete world.player.deathEvent;
  world.protectedUntil=world.time+3;
  world.mimicAudioEvents.length = 0;
  for (const enemy of world.enemies) {
    if (enemy.type === 'mimic') resetMimic(enemy, world.time);
  }
  emitSound(world,best.x,best.y,'probe',2.5,0.35);
  return true;
}

function movePlayer(world, dx, dy) {
  return moveActor(world, world.player, dx, dy);
}

function activeActors(world) {
  return world.actors.filter(actor => actor.alive !== false && !actor.escaped);
}

// Shared collision only; no pickups, hazards, sound or other world effects.
function movePosition(level, position, dx, dy) {
  if (canStand(level, position.x + dx, position.y)) position.x += dx;
  if (canStand(level, position.x, position.y + dy)) position.y += dy;
}

function moveActor(world, player, dx, dy) {
  if (player.alive === false || player.escaped) return;
  movePosition(world.level, player, dx, dy);
  world.stones = world.stones.filter(stone => {
    if (Math.hypot(player.x - stone.x, player.y - stone.y) > STONE_PICKUP_DISTANCE) return true;
    player.stonesHeld += 1;
    emitSound(world, player.x, player.y, 'pickup', 2.5, 1, null, player.id);
    return false;
  });
  onPlayerMove(world, emitSound, player);
  checkGroundHazards(world);
}

function routeStep(level, fromX, fromY, targetX, targetY) {
  const tx = Math.floor(targetX);
  const ty = Math.floor(targetY);
  const sx = Math.floor(fromX);
  const sy = Math.floor(fromY);
  if (blocked(level, tx, ty) || level.pits?.has(`${tx},${ty}`)) return null;
  let fields = routeFields.get(level);
  if (!fields) { fields = new Map(); routeFields.set(level, fields); }
  const goal = `${tx},${ty}`;
  let parents = fields.get(goal);
  if (!parents) {
    const queue = [[tx, ty]];
    parents = new Map([[goal, null]]);
    for (let i = 0; i < queue.length; i += 1) {
      const [x, y] = queue[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (blocked(level, nx, ny) || level.pits?.has(key) || parents.has(key)) continue;
        parents.set(key, [x, y]);
        queue.push([nx, ny]);
      }
    }
    if (fields.size >= 32) fields.delete(fields.keys().next().value);
    fields.set(goal, parents);
  }
  if (sx === tx && sy === ty) return [tx, ty];
  return parents.get(`${sx},${sy}`) || null;
}

function stoneMovementTarget(world, enemy, target) {
  if (canStand(world.level, ...target)) return target;
  // A legal stone can stop just short of a wall where an actor cannot fit.
  // Keep its sound coordinates; inset only the movement endpoint in that cell.
  const inset = ACTOR_RADIUS + 1e-6;
  const endpoint = target.map(value => {
    const cell = Math.floor(value);
    return Math.max(cell + inset, Math.min(cell + 1 - inset, value));
  });
  return canStand(world.level, ...endpoint) &&
    routeStep(world.level, enemy.x, enemy.y, ...endpoint) ? endpoint : target;
}

function clearEnemyPath(level, enemy, target) {
  const dx = target[0] - enemy.x, dy = target[1] - enemy.y;
  const left = Math.floor(Math.min(enemy.x, target[0]) - ACTOR_RADIUS);
  const right = Math.floor(Math.max(enemy.x, target[0]) + ACTOR_RADIUS);
  const top = Math.floor(Math.min(enemy.y, target[1]) - ACTOR_RADIUS);
  const bottom = Math.floor(Math.max(enemy.y, target[1]) + ACTOR_RADIUS);
  // Sweep the body's square footprint, including fences and pit edges. A clear
  // sight ray alone would let a direct chase clip corners or get stuck at fences.
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
    if (!blocked(level, x, y) && !level.pits?.has(`${x},${y}`)) continue;
    let enter = 0, leave = 1;
    for (const [origin, delta, low, high] of [
      [enemy.x, dx, x - ACTOR_RADIUS, x + 1 + ACTOR_RADIUS],
      [enemy.y, dy, y - ACTOR_RADIUS, y + 1 + ACTOR_RADIUS],
    ]) {
      if (delta === 0) {
        if (origin < low || origin > high) { enter = Infinity; break; }
      } else {
        const a = (low - origin) / delta, b = (high - origin) / delta;
        enter = Math.max(enter, Math.min(a, b));
        leave = Math.min(leave, Math.max(a, b));
      }
    }
    if (enter <= leave) return false;
  }
  return true;
}

function moveEnemyToward(world, enemy, target, dt, speed, direct = false) {
  let waypointX = target[0], waypointY = target[1];
  if (!direct || !clearEnemyPath(world.level, enemy, target)) {
    const step = routeStep(world.level, enemy.x, enemy.y, ...target);
    if (!step) return;
    const [cellX, cellY] = step;
    if (cellX !== Math.floor(enemy.x) || cellY !== Math.floor(enemy.y)) {
      waypointX = cellX + 0.5; waypointY = cellY + 0.5;
    }
  }
  const dx = waypointX - enemy.x;
  const dy = waypointY - enemy.y;
  const distance = Math.hypot(dx, dy);
  const amount = Math.min(distance, dt * speed);
  if (distance > 0) {
    const nextX = enemy.x + dx / distance * amount;
    const nextY = enemy.y + dy / distance * amount;
    if (canStand(world.level, nextX, enemy.y)) enemy.x = nextX;
    if (canStand(world.level, enemy.x, nextY)) enemy.y = nextY;
  }
}

function chooseSearchTarget(world, enemy) {
  const [cx, cy] = enemy.searchCenter;
  const candidates = SEARCH_OFFSETS.map(([dx, dy]) => [cx + dx, cy + dy])
    .filter(([x, y]) => canStand(world.level, x, y) &&
      !world.level.pits?.has(`${Math.floor(x)},${Math.floor(y)}`) &&
      (!enemy.targetField || enemy.targetField.at(x, y) <= 3.8) &&
      Math.hypot(x - enemy.x, y - enemy.y) > 0.45);
  if (!candidates.length) return null;
  enemy.searchSeed = (Math.imul(enemy.searchSeed, 1664525) + 1013904223) >>> 0;
  return candidates[enemy.searchSeed % candidates.length];
}

function chooseWanderTarget(world, enemy) {
  const x = Math.floor(enemy.x);
  const y = Math.floor(enemy.y);
  const choices = [[0, -1], [1, 0], [0, 1], [-1, 0]]
    .map(([dx, dy]) => [x + dx + 0.5, y + dy + 0.5])
    .filter(([nx, ny]) => canStand(world.level, nx, ny) &&
      !world.level.pits?.has(`${Math.floor(nx)},${Math.floor(ny)}`));
  const forward = choices.filter(([nx, ny]) =>
    !enemy.wanderPrevious || nx !== enemy.wanderPrevious[0] || ny !== enemy.wanderPrevious[1]);
  const pool = forward.length ? forward : choices;
  if (!pool.length) return null;
  enemy.searchSeed = (Math.imul(enemy.searchSeed, 1664525) + 1013904223) >>> 0;
  enemy.wanderPrevious = [x + 0.5, y + 0.5];
  return pool[enemy.searchSeed % pool.length];
}

function updateEnemy(world, enemy, dt) {
  let trackingPlayer = false;
  // Only enemies alerted to the player acquire them at close range. Stones
  // and decoys keep their diversion; quiet proximity never wakes an enemy.
  if (enemyAlerted(enemy) && !enemy.distracted) {
    let target = null, nearest = ENEMY_TRACK_RANGE;
    for (const actor of activeActors(world)) {
      const distance = Math.hypot(actor.x - enemy.x, actor.y - enemy.y);
      if (distance <= nearest && getGeometry(world.level).visible(enemy.x, enemy.y, actor.x, actor.y)) {
        target = actor;
        nearest = distance;
      }
    }
    if (target) {
      trackingPlayer = true;
      enemy.mode = 'chase';
      enemy.target = [target.x, target.y];
      enemy.targetField = null;
      enemy.searchCenter = null;
      enemy.searchTarget = null;
    }
  }
  if (enemy.mode === 'wander') {
    if (!enemy.wanderTarget ||
        Math.hypot(enemy.x - enemy.wanderTarget[0], enemy.y - enemy.wanderTarget[1]) < 0.2) {
      enemy.wanderTarget = chooseWanderTarget(world, enemy);
    }
    if (enemy.wanderTarget) moveEnemyToward(world, enemy, enemy.wanderTarget, dt, ENEMY_SEARCH_SPEED);
  }
  if (enemy.mode === 'patrol') {
    const waypoint = enemy.path[enemy.patrolIndex];
    moveEnemyToward(world, enemy, waypoint, dt, ENEMY_SEARCH_SPEED);
    if (Math.hypot(enemy.x - waypoint[0], enemy.y - waypoint[1]) < 0.2) {
      enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.path.length;
    }
  }
  if (enemy.mode === 'chase' && enemy.target) {
    if (Math.hypot(enemy.x - enemy.target[0], enemy.y - enemy.target[1]) < 0.3) {
      enemy.mode = 'search';
      enemy.searchCenter = enemy.target;
      enemy.searchTarget = null;
      enemy.searchUntil = world.time + SEARCH_DURATION;
      enemy.target = null;
    } else {
      moveEnemyToward(world, enemy, enemy.target, dt, ENEMY_ALERT_SPEED, trackingPlayer);
    }
  }
  if (enemy.mode === 'search') {
    if (world.time >= enemy.searchUntil) {
      enemy.mode = 'return';
      enemy.searchCenter = null;
      enemy.searchTarget = null;
      enemy.targetField = null;
    } else {
      if (!enemy.searchTarget ||
          Math.hypot(enemy.x - enemy.searchTarget[0], enemy.y - enemy.searchTarget[1]) < 0.2) {
        enemy.searchTarget = chooseSearchTarget(world, enemy);
      }
      if (enemy.searchTarget) moveEnemyToward(world, enemy, enemy.searchTarget, dt, ENEMY_SEARCH_SPEED);
    }
  }
  if (enemy.mode === 'return') {
    const post = enemy.type === 'patrol' ? enemy.path[enemy.patrolIndex] : enemy.home;
    if (Math.hypot(enemy.x - post[0], enemy.y - post[1]) < 0.2) {
      [enemy.x, enemy.y] = post;
      enemy.mode = enemy.type === 'patrol' ? 'patrol' :
        enemy.type === 'wanderer' ? 'wander' : 'idle';
      enemy.wanderTarget = null;
      if (enemy.type === 'sentinel') enemy.warned = false;
    } else {
      moveEnemyToward(world, enemy, post, dt, ENEMY_SEARCH_SPEED);
    }
  }
}

function checkEnemyContact(world, enemy) {
  if (!world.invincible) {
    for (const actor of activeActors(world)) {
      if (Math.hypot(enemy.x - actor.x, enemy.y - actor.y) < 0.48) {
        world.killActor(actor, 'enemy', { enemyType: enemy.type ?? 'guard', enemyId: enemy.id ?? null });
      }
    }
  }
}

function updateStep(world, dt) {
  if (!world.shared && (world.failed || world.complete)) return;
  const stepStart = world.time;
  world.time += dt;
  while (world.footprints.length &&
      world.time - world.footprints[0].at >= FOOTPRINT_LIFETIME) {
    world.footprints.shift();
  }
  for (const lure of world.lures) {
    while (lure.impactIndex < lure.segments.length) {
      const segment = lure.segments[lure.impactIndex];
      if (world.time - lure.start < segment.endTime) break;
      if (segment.hit) emitSound(world, segment.toX, segment.toY, 'lure',
        4 + 13 * segment.intensity, segment.intensity, null, lure.ownerId);
      lure.impactIndex += 1;
    }
    if (!lure.arrived && world.time - lure.start >= lure.duration) {
      lure.arrived = true;
      world.stones.push({ x: lure.toX, y: lure.toY, ownerId: lure.ownerId });
      const lastImpact = [...lure.segments].reverse().find(segment => segment.hit);
      const intensity = lastImpact ? Math.max(0.08, lastImpact.intensity * 0.45) : 0.25;
      emitSound(world, lure.toX, lure.toY, 'landing', 3 + 5 * intensity, intensity, null, lure.ownerId);
    }
  }
  world.lures = world.lures.filter(lure => world.time < lure.trailUntil);
  updateHazards(world, dt, emitSound);
  updateDevices(world, emitSound);
  updateAmbient(world, emitSound);
  checkGroundHazards(world);
  for (const enemy of world.enemies) {
    if (enemy.type === 'sentinel' && enemy.mode === 'idle') {
      if (world.time - enemy.scanAt >= enemy.period) enemy.scanAt = world.time + enemy.period;
      if (!enemy.warned && world.time >= enemy.scanAt - 0.55) {
        emitSound(world, enemy.x, enemy.y, 'sentinelCharge', 2.2);
        enemy.warned = true;
      }
      if (world.time >= enemy.scanAt) {
        emitSound(world, enemy.x, enemy.y, 'sentinel', enemy.range);
        enemy.scanAt = world.time + enemy.period;
        enemy.warned = false;
      }
    }
    if (enemy.type !== 'bat' || enemy.mode !== 'idle') continue;
    if (world.time - enemy.scanAt >= enemy.period) enemy.scanAt = world.time;
    if (world.time >= enemy.scanAt) {
      enemy.searchSeed = (Math.imul(enemy.searchSeed, 1664525) + 1013904223) >>> 0;
      const angle = enemy.angles?.[enemy.scanIndex % enemy.angles.length] ??
        enemy.searchSeed / 0x100000000 * Math.PI * 2;
      enemy.scanIndex += 1;
      const scan = emitSound(world, enemy.x, enemy.y, 'bat', enemy.range, 1,
        directionalField(world.level, enemy.x, enemy.y, angle, 0.16, enemy.range));
      scan.angle = angle;
      scan.halfAngle = 0.16;
      enemy.scanAt = world.time + enemy.period;
    }
  }
  for (const wave of world.waves) {
    if (wave.type === 'bat' || wave.type === 'sentinel') {
      wave.hitActors ||= new Set();
      for (const actor of activeActors(world)) {
        if (wave.hitActors.has(actor)) continue;
        const distance = wave.field.at(actor.x, actor.y);
        const front = (world.time - wave.start) * wave.speed;
        if (Number.isFinite(distance) && front >= distance - 0.25 &&
            front - distance <= wave.speed * dt + 0.24) {
          wave.hitActors.add(actor);
          if (actor === world.player) wave.hitPlayer = true;
          emitSound(world, actor.x, actor.y, 'reflection', 9, 1, null, actor.id);
        }
      }
    }
    for (const enemy of world.enemies) {
      if (enemy.type === 'mimic') continue;
      if (wave.passive || ['enemy', 'spike', 'bow', 'arrow', 'pit', 'bat', 'mineWarning', 'mineBlast',
        'sentinelCharge', 'sentinel', 'beacon', 'gateWarning', 'gateClose', 'gateOpen',
        'fragileWarning', 'fragileFall', 'fragileReset', 'laser', 'relay',
        'sequenceCue', 'sequenceDone', 'sequenceReset'].includes(wave.type) ||
          wave.heard.has(enemy)) continue;
      const distance = wave.field.at(enemy.x, enemy.y);
      if (!Number.isFinite(distance) || world.time - wave.start < distance / wave.speed) continue;
      wave.heard.add(enemy);
      enemy.mode = 'chase';
      syncEnemyAlert(enemy, world.time);
      enemy.target = wave.targetOrigin || [wave.x, wave.y];
      enemy.targetField = wave.targetField || wave.field;
      enemy.distracted = DISTRACTION_SOUNDS.has(wave.targetType || wave.type);
      enemy.searchCenter = null;
      enemy.searchTarget = null;
    }
    if (world.level.mechanism && !world.mechanismActive &&
        (wave.type === 'probe' || wave.type === 'relay') && !wave.mechanismChecked) {
      const distance = wave.field.at(...world.level.mechanism);
      if (Number.isFinite(distance) && world.time - wave.start >= distance / wave.speed) {
        wave.mechanismChecked = true;
        world.mechanismActive = true;
      }
    }
  }
  for (const enemy of world.enemies) {
    if (enemy.type !== 'mimic') continue;
    // Dispatch in arrival order before expiring timers at the substep end.
    // A 9.999 arrival still belongs to an alert that expires at 10.
    const arrivals = world.waves.map(wave => {
      const distance = wave.field.at(enemy.x, enemy.y);
      return { wave, at: Math.max(stepStart, wave.start + distance / wave.speed) };
    }).filter(item => Number.isFinite(item.at) && item.at <= world.time &&
      !item.wave.heard.has(enemy))
      .sort((a, b) => a.at - b.at || a.wave.start - b.wave.start || a.wave.id - b.wave.id);
    for (const { wave, at } of arrivals) {
      wave.heard.add(enemy);
      queueMimicEffects(world, hearMimic(enemy, wave, at));
    }
    advanceMimicTimers(enemy, world.time);
  }
  if (!world.unlocked && world.mechanismActive && world.sequence.complete) {
    world.unlocked = true;
    if (world.baseLevel.mechanismWalls?.size) rebuildTerrain(world);
    emitSound(world, ...(world.level.mechanism || world.level.exit), 'unlock', 3.5);
    if (world.level.mechanism) {
      emitSound(world, ...world.level.exit, 'exitUnlock', 3.5, 0.65);
    }
  }
  world.waves = world.waves.filter(w => world.time - w.start < w.radius / w.speed + 0.6);
  const activeWaveIds = new Set(world.waves.map(wave => wave.id));
  for (const enemy of world.enemies) {
    if (enemy.type === 'mimic') {
      queueMimicEffects(world, updateMimic(enemy, {
        now: world.time, dt, player: world.player, maxSpeed: PLAYER_MAX_SPEED,
        resolveStoneTarget: (e, target) => stoneMovementTarget(world, e, target),
        move: (e, target, delta, speed) => moveEnemyToward(world, e, target, delta, speed),
      }));
      for (const id of enemy.mimic.consumed) {
        if (!activeWaveIds.has(id)) enemy.mimic.consumed.delete(id);
      }
    } else {
      updateEnemy(world, enemy, dt);
      syncEnemyAlert(enemy, world.time);
    }
    checkEnemyContact(world, enemy);
  }
  if (!world.shared && !world.failed && !world.invincible && world.unlocked &&
      Math.hypot(world.player.x - world.level.exit[0], world.player.y - world.level.exit[1]) < 0.58) {
    world.complete = true;
  }
}

function updateWorld(world, dt) {
  const steps = Math.max(1, Math.ceil(dt / 0.08));
  for (let i = 0; i < steps; i += 1) updateStep(world, dt / steps);
}

module.exports = { createWorld, reviveWorld, emitSound, emitLure, movePlayer, moveActor, movePosition, canStand, updateWorld,
  takeMimicAudioEvents, PLAYER_MAX_SPEED, FOOTPRINT_LIFETIME };
