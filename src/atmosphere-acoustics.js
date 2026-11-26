const { getGeometry } = require('./geometry');
const { onSilentFloor } = require('./devices');

const ROUTE_RANGE = 18;
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const unit = value => Math.max(0, Math.min(1, value));
const panFor = (dx, dy) => .75 * dx / Math.max(1, Math.hypot(dx, dy));

function roomAt(geometry, x, y) {
  const clearances = DIRECTIONS.map(([dx, dy]) => {
    let steps = 0;
    while (steps < 5 && !geometry.obstacleAt(x + dx * (steps + 1), y + dy * (steps + 1))) steps++;
    return steps;
  });
  // The short span distinguishes a long corridor from a room. Two- to
  // three-cell lanes have a short tail; a six-cell span has the long tail.
  const shortSpan = 1 + Math.min(clearances[0] + clearances[1], clearances[2] + clearances[3]);
  return unit((shortSpan - 3) / 3);
}

function surfaceAt(world, wave) {
  if (onSilentFloor(world, wave)) return 'silent';
  const x = Math.floor(wave.x), y = Math.floor(wave.y);
  const matches = floor => Math.floor(floor.x) === x && Math.floor(floor.y) === y;
  if (world.fragileFloors?.some(floor => floor.phase !== 'collapsed' && matches(floor))) return 'fragile';
  if (world.noisyFloors?.some(matches)) return 'noisy';
  return 'floor';
}

function nearbySoundRoutes(level, geometry, x, y) {
  const { width, height } = level;
  const start = y * width + x;
  const steps = new Uint8Array(width * height);
  const parents = new Int32Array(steps.length);
  const queue = [start];
  steps[start] = 1;
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    if (steps[cell] > ROUTE_RANGE) continue;
    for (const [dx, dy] of DIRECTIONS) {
      const nextX = cell % width + dx, nextY = Math.floor(cell / width) + dy;
      if (geometry.obstacleAt(nextX, nextY)) continue;
      const next = nextY * width + nextX;
      if (steps[next]) continue;
      steps[next] = steps[cell] + 1;
      parents[next] = cell;
      queue.push(next);
    }
  }
  return { steps, parents, start };
}

function createSceneAcoustics() {
  let world, level, geometry, listenerX, listenerY, routes, roomOpenness, targetRoom, blend;
  let enemyMix = new WeakMap();
  function update(nextWorld, dt) {
    const changedWorld = nextWorld !== world;
    world = nextWorld;
    const x = Math.floor(world.player.x), y = Math.floor(world.player.y);
    if (changedWorld || world.level !== level || x !== listenerX || y !== listenerY) {
      level = world.level;
      geometry = getGeometry(level);
      listenerX = x;
      listenerY = y;
      routes = null;
      targetRoom = roomAt(geometry, x, y);
    }
    blend = 1 - Math.exp(-dt / .18);
    if (changedWorld) {
      roomOpenness = targetRoom;
      enemyMix = new WeakMap();
    } else roomOpenness += (targetRoom - roomOpenness) * blend;
  }

  function waveOptions(wave) {
    if (wave.type === 'footstep') return { surface: surfaceAt(world, wave), roomOpenness };
    if (wave.type === 'probe') return { roomOpenness };
  }

  function enemySound(enemy) {
    const { player } = world;
    const dx = enemy.x - player.x, dy = enemy.y - player.y;
    const directDistance = Math.hypot(dx, dy);
    let distance = directDistance, occlusion = 0, pan = panFor(dx, dy);
    if (!geometry.visible(player.x, player.y, enemy.x, enemy.y)) {
      const x = Math.floor(enemy.x), y = Math.floor(enemy.y);
      if (directDistance > ROUTE_RANGE || geometry.obstacleAt(x, y)) return null;
      routes ||= nearbySoundRoutes(level, geometry, listenerX, listenerY);
      const source = y * level.width + x;
      const steps = routes.steps[source];
      if (!steps) return null;
      distance = Math.max(directDistance, steps - 1);
      occlusion = .43 + .27 * unit((distance - directDistance) / 9);
      // Pan from the furthest route waypoint that has a direct path to the
      // listener. This locates the opening, rather than the enemy behind it.
      for (let cell = source; cell !== routes.start; cell = routes.parents[cell]) {
        const px = cell % level.width + .5, py = Math.floor(cell / level.width) + .5;
        if (geometry.visible(player.x, player.y, px, py)) {
          pan = panFor(px - player.x, py - player.y);
          break;
        }
      }
    }
    const previous = enemyMix.get(enemy);
    if (previous) {
      distance = previous.distance + (distance - previous.distance) * blend;
      occlusion = previous.occlusion + (occlusion - previous.occlusion) * blend;
      pan = previous.pan + (pan - previous.pan) * blend;
    }
    const mix = { distance, occlusion, pan };
    enemyMix.set(enemy, mix);
    return mix;
  }

  return { update, waveOptions, enemySound };
}

module.exports = { createSceneAcoustics };
