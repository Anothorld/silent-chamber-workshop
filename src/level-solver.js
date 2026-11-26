const { createWorld, emitSound, movePlayer, updateWorld } = require('./world');
const { stepMovement, movementSpeed } = require('./movement');
const { hydrateLevel } = require('./level-generator');

const FRAME = 1 / 30;
const DIRECTIONS = [[0, -1], [1, 0], [-1, 0], [0, 1]];

function routeFor(level, from = level.start, to = level.exit) {
  const start = from.map(Math.floor);
  const goal = to.map(Math.floor);
  const key = ([x, y]) => `${x},${y}`;
  const queue = [start];
  const previous = new Map([[key(start), null]]);
  for (let index = 0; index < queue.length; index += 1) {
    const cell = queue[index];
    if (key(cell) === key(goal)) break;
    for (const [dx, dy] of DIRECTIONS) {
      const next = [cell[0] + dx, cell[1] + dy];
      const name = key(next);
      if (next[0] < 0 || next[1] < 0 || next[0] >= level.width || next[1] >= level.height ||
          level.walls.has(name) || level.fences?.has(name) ||
          level.pits?.has(name) || previous.has(name)) continue;
      previous.set(name, cell);
      queue.push(next);
    }
  }
  if (!previous.has(key(goal))) return null;
  const route = [];
  for (let cell = goal; cell; cell = previous.get(key(cell))) route.push(cell);
  return route.reverse();
}

function spikeActiveDuring(spike, from, until) {
  const first = spike.phase ?? spike.period;
  if (until < first) return false;
  const cycle = Math.max(0, Math.floor((from - first) / spike.period));
  for (let index = cycle; first + index * spike.period <= until; index += 1) {
    const start = first + index * spike.period;
    if (start + spike.duration >= from) return true;
  }
  return false;
}

function execute(world, control, action) {
  if (action.type === 'probe') {
    emitSound(world, world.player.x, world.player.y, 'probe', action.radius, action.intensity);
    return;
  }
  if (action.type === 'move') {
    stepMovement(world, control, action.dx, action.dy, action.strength,
      action.dt, movePlayer, emitSound);
  }
  updateWorld(world, action.dt);
}

function replay(input, actions) {
  const level = input.walls instanceof Set ? input : hydrateLevel(input);
  const world = createWorld(level);
  const control = { footstepAt: 0 };
  emitSound(world, world.player.x, world.player.y, 'probe', 2.5);
  for (const action of actions) {
    if (world.failed || world.complete) break;
    execute(world, control, action);
  }
  return world;
}

function solveLevel(input, options = {}) {
  const level = input.walls instanceof Set ? input : hydrateLevel(input);
  const toMechanism = level.mechanism && routeFor(level, level.start, level.mechanism);
  const toExit = routeFor(level, level.mechanism || level.start, level.exit);
  if (!toExit || level.mechanism && !toMechanism) return null;
  const route = toMechanism ? [...toMechanism, ...toExit.slice(1)] : toExit;
  const world = createWorld(level);
  const control = { footstepAt: 0 };
  const actions = [];
  emitSound(world, world.player.x, world.player.y, 'probe', 2.5);
  const strength = options.strength ?? 0.3;
  const random = options.random || (() => 0.5);
  const apply = action => {
    actions.push(action);
    execute(world, control, action);
  };
  const travel = segment => {
    for (const [cellX, cellY] of segment.slice(1)) {
      const targetX = cellX + 0.5;
      const targetY = cellY + 0.5;
      const spike = (level.spikes || []).find(item =>
        Math.hypot(targetX - item.x, targetY - item.y) < 0.1);
      if (spike) {
        const speed = movementSpeed(strength);
        const timingShift = (random() - 0.5) * (options.timingError || 0);
        let waits = 0;
        while (spikeActiveDuring(spike, world.time + 0.54 / speed + timingShift,
          world.time + 1.46 / speed + timingShift)) {
          if (world.failed || waits++ > 240) return false;
          apply({ type: 'wait', dt: FRAME });
        }
      }
      let steps = 0;
      while (Math.hypot(targetX - world.player.x, targetY - world.player.y) > 0.001) {
        if (world.failed || steps++ > 150) return false;
        const dx = targetX - world.player.x;
        const dy = targetY - world.player.y;
        const distance = Math.hypot(dx, dy);
        const speed = movementSpeed(strength);
        const dt = Math.min(FRAME, distance / speed);
        const heading = Math.atan2(dy, dx) + (random() - 0.5) * (options.steeringError || 0);
        apply({ type: 'move', dx: Math.cos(heading), dy: Math.sin(heading), strength, dt });
      }
    }
    return true;
  };
  if (toMechanism && !travel(toMechanism)) return null;
  if (level.mechanism && !world.unlocked) {
    apply({ type: 'probe', radius: 17, intensity: 1 });
    for (let i = 0; i < 90 && !world.unlocked && !world.failed; i += 1) {
      apply({ type: 'wait', dt: FRAME });
    }
  }
  if (!travel(toExit)) return null;
  if (!world.complete && !world.failed) apply({ type: 'wait', dt: FRAME });
  if (world.failed || !world.complete) return null;
  const confirmation = replay(level, actions);
  if (!confirmation.complete || confirmation.failed) return null;
  return { actions, route, time: confirmation.time };
}

module.exports = { routeFor, replay, solveLevel };
