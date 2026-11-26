const { blocked, propagate, traceImpact } = require('./propagation');
const playerSounds = new Set(['probe', 'footstep', 'lure', 'landing', 'pickup',
  'reflection', 'noisyFloor', 'sniper', 'shotgun', 'dagger']);

function pitSources(level) {
  const remaining = new Set(level.pits || []);
  const sources = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    const queue = [first];
    remaining.delete(first);
    for (let index = 0; index < queue.length; index += 1) {
      const [x, y] = queue[index].split(',').map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const next = `${x + dx},${y + dy}`;
        if (!remaining.delete(next)) continue;
        queue.push(next);
      }
    }
    const cells = queue.map(key => key.split(',').map(Number));
    const centerX = cells.reduce((sum, [x]) => sum + x + 0.5, 0) / cells.length;
    const centerY = cells.reduce((sum, [, y]) => sum + y + 0.5, 0) / cells.length;
    const [x, y] = cells.reduce((best, cell) =>
      Math.hypot(cell[0] + 0.5 - centerX, cell[1] + 0.5 - centerY) <
        Math.hypot(best[0] + 0.5 - centerX, best[1] + 0.5 - centerY) ? cell : best);
    sources.push({ x: x + 0.5, y: y + 0.5, cells,
      cellKeys: new Set(queue),
      seed: (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0,
      nextAt: 0.65 + sources.length * 0.2 });
  }
  return sources;
}

function pitWaveField(level, sx, sy, radius, cellKeys) {
  const cellSize = 0.25;
  const at = (x, y) => cellKeys.has(`${Math.floor(x)},${Math.floor(y)}`) &&
    Math.hypot(x - sx, y - sy) <= radius ? Math.hypot(x - sx, y - sy) : Infinity;
  let visual;
  return { at, get visual() {
    if (visual) return visual;
    const width = Math.ceil(level.width / cellSize);
    const height = Math.ceil(level.height / cellSize);
    const times = new Float32Array(width * height);
    times.fill(Infinity);
    const bounds = {
      minX: Math.max(0, Math.floor((sx - radius) / cellSize)),
      maxX: Math.min(width - 1, Math.ceil((sx + radius) / cellSize)),
      minY: Math.max(0, Math.floor((sy - radius) / cellSize)),
      maxY: Math.min(height - 1, Math.ceil((sy + radius) / cellSize)),
    };
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        times[y * width + x] = at((x + 0.5) * cellSize, (y + 0.5) * cellSize);
      }
    }
    visual = { width, height, cellSize, bounds,
      at(x, y) { return times[y * width + x]; } };
    return visual;
  } };
}

function pitRandom(source) {
  source.seed = (Math.imul(source.seed, 1664525) + 1013904223) >>> 0;
  return source.seed / 0x100000000;
}

function createHazards(level) {
  return {
    mines: (level.mines || []).map(mine => ({ ...mine, armedUntil: Infinity,
      readyAt: 0 })),
    alarms: (level.alarms || []).map(alarm => ({ ...alarm, readyAt: 0 })),
    spikes: (level.spikes || []).map(spike => ({
      ...spike, nextAt: spike.phase ?? spike.period, activeUntil: -Infinity,
    })),
    launchers: (level.launchers || []).map(launcher => ({
      ...launcher, nextAt: launcher.phase ?? launcher.period,
    })).filter(launcher => {
      const x = Math.floor(launcher.x);
      const y = Math.floor(launcher.y);
      return Math.abs(launcher.dx) + Math.abs(launcher.dy) === 1 &&
        (level.walls.has(`${x},${y}`) || level.debugGallery && launcher.debugFreeStanding) &&
        !blocked(level, x + launcher.dx, y + launcher.dy);
    }),
    arrows: [],
    pitSources: pitSources(level),
  };
}

function checkGroundHazards(world) {
  if (world.invincible) return;
  for (const actor of world.actors) {
    if (actor.alive === false || actor.escaped) continue;
    const { x, y } = actor;
    if (world.level.pits?.has(`${Math.floor(x)},${Math.floor(y)}`)) world.killActor(actor, 'pit');
    else if (world.spikes.some(spike => world.time < spike.activeUntil &&
      Math.hypot(x - spike.x, y - spike.y) < 0.46)) world.killActor(actor, 'spike');
  }
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const fraction = lengthSquared ? Math.max(0, Math.min(1,
    ((px - ax) * dx + (py - ay) * dy) / lengthSquared)) : 0;
  return Math.hypot(px - ax - dx * fraction, py - ay - dy * fraction);
}

function updateHazards(world, dt, emitSound) {
  for (const mine of world.mines) {
    if (world.time >= mine.armedUntil) {
      mine.armedUntil = Infinity;
      mine.readyAt = world.time + 4;
      const blast = emitSound(world, mine.x, mine.y, 'mineBlast', 1.2);
      if (!world.invincible) {
        for (const actor of world.actors) {
          if (blast.field.at(actor.x, actor.y) <= 1.2) world.killActor(actor, 'mine');
        }
      }
    }
    if (world.time < mine.readyAt || mine.armedUntil !== Infinity) continue;
    for (const wave of world.waves) {
      if (!playerSounds.has(wave.type)) continue;
      const distance = wave.field.at(mine.x, mine.y);
      if (!Number.isFinite(distance) || world.time - wave.start < distance / wave.speed) continue;
      mine.armedUntil = world.time + 0.9;
      emitSound(world, mine.x, mine.y, 'mineWarning', 2.4);
      break;
    }
  }
  for (const alarm of world.alarms) {
    if (world.time < alarm.readyAt) continue;
    for (const wave of world.waves) {
      if (!playerSounds.has(wave.type)) continue;
      const distance = wave.field.at(alarm.x, alarm.y);
      if (!Number.isFinite(distance) || world.time - wave.start < distance / wave.speed) continue;
      alarm.readyAt = world.time + 6;
      const broadcast = emitSound(world, alarm.x, alarm.y, 'alarm', 18);
      broadcast.targetOrigin = [wave.x, wave.y];
      broadcast.targetField = propagate(world.level, wave.x, wave.y, 'low', 18);
      broadcast.targetType = wave.type;
      break;
    }
  }
  const heardSpikeGroups = new Set();
  for (const spike of world.spikes) {
    while (world.time >= spike.nextAt) {
      spike.activeUntil = spike.nextAt + spike.duration;
      if (spike.waveGroup == null || !heardSpikeGroups.has(spike.waveGroup)) {
        emitSound(world, spike.soundX ?? spike.x, spike.soundY ?? spike.y, 'spike', 4.2);
        if (spike.waveGroup != null) heardSpikeGroups.add(spike.waveGroup);
      }
      spike.nextAt += spike.period;
    }
  }
  for (const launcher of world.launchers) {
    while (world.time >= launcher.nextAt) {
      const magnitude = Math.hypot(launcher.dx, launcher.dy) || 1;
      const x = launcher.x + launcher.dx * 0.51;
      const y = launcher.y + launcher.dy * 0.51;
      world.arrows.push({ x, y,
        dx: launcher.dx / magnitude, dy: launcher.dy / magnitude,
        speed: launcher.range, remaining: launcher.range, waveAt: world.time + 0.14 });
      emitSound(world, x, y, 'bow', 2.8);
      emitSound(world, x, y, 'arrow', 0.9);
      launcher.nextAt += launcher.period;
    }
  }
  for (const source of world.pitSources) {
    while (world.time >= source.nextAt) {
      const [cellX, cellY] = source.cells[Math.floor(pitRandom(source) * source.cells.length)];
      const x = cellX + 0.3 + pitRandom(source) * 0.4;
      const y = cellY + 0.3 + pitRandom(source) * 0.4;
      const radius = 1.85 + pitRandom(source) * 0.3;
      const wave = emitSound(world, x, y, 'pit', radius, 0.38,
        pitWaveField(world.level, x, y, radius, source.cellKeys));
      wave.speed = 2.8;
      wave.audioSilent = true;
      source.nextAt += 0.32 + pitRandom(source) * 0.2;
    }
  }
  world.arrows = world.arrows.filter(arrow => {
    const distance = Math.min(arrow.remaining, arrow.speed * dt);
    const hit = traceImpact(world.level, arrow.x, arrow.y, arrow.dx, arrow.dy, distance);
    const fromX = arrow.x;
    const fromY = arrow.y;
    arrow.x = hit.x;
    arrow.y = hit.y;
    arrow.remaining -= hit.distance;
    if (!world.invincible) {
      for (const actor of world.actors) {
        if (segmentDistance(actor.x, actor.y, fromX, fromY, arrow.x, arrow.y) < 0.34) {
          world.killActor(actor, 'arrow');
        }
      }
    }
    if (world.time >= arrow.waveAt && !hit.hit && arrow.remaining > 0) {
      emitSound(world, arrow.x, arrow.y, 'arrow', 0.9).audioSilent = true;
      arrow.waveAt = world.time + 0.14;
    }
    return !hit.hit && arrow.remaining > 0;
  });
  checkGroundHazards(world);
}

module.exports = { pitSources, pitWaveField, createHazards, checkGroundHazards, updateHazards };
