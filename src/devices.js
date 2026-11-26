const { traceImpact } = require('./propagation');

const playerSounds = new Set(['probe', 'footstep', 'lure', 'landing', 'pickup',
  'reflection', 'noisyFloor', 'sniper', 'shotgun', 'dagger']);
const probeSounds = new Set(['probe']);

function traceLaser(map, x, y, dx, dy, maxDistance = 160, maxSegments = Infinity) {
  const magnitude = Math.hypot(dx, dy) || 1;
  let vx = dx / magnitude;
  let vy = dy / magnitude;
  let length = 0;
  const segments = [];
  const visited = new Set();
  while (length < maxDistance && segments.length < maxSegments) {
    const state = `${Math.round(x * 100)},${Math.round(y * 100)},${Math.round(vx * 1000)},${Math.round(vy * 1000)}`;
    if (visited.has(state)) break;
    visited.add(state);
    const hit = traceImpact(map, x, y, vx, vy, maxDistance - length);
    if (hit.distance < 0.02) break;
    segments.push({ fromX: x, fromY: y, toX: hit.x, toY: hit.y,
      normalX: hit.normalX, normalY: hit.normalY, hit: hit.hit });
    length += hit.distance;
    x = hit.x;
    y = hit.y;
    if (!hit.hit) break;
    if (hit.normalX) vx = -vx;
    if (hit.normalY) vy = -vy;
  }
  return { length, segments };
}

function createDevices(level) {
  return {
    baseLevel: level,
    noisyFloors: level.noisyFloors || [],
    silentFloors: level.silentFloors || [],
    beacons: (level.beacons || []).map(item => ({ ...item,
      nextAt: item.phase ?? item.period ?? 4 })),
    decoys: (level.decoys || []).map(item => ({ ...item, readyAt: 0, fireAt: Infinity })),
    relays: (level.relays || []).map(item => ({ ...item, readyAt: 0,
      fireAt: Infinity, incomingCue: null })),
    gates: (level.gates || []).map(item => ({ ...item, phase: 'open',
      changeAt: Infinity, readyAt: 0 })),
    fragileFloors: (level.fragileFloors || []).map(item => ({ ...item, phase: 'solid',
      changeAt: Infinity, readyAt: 0 })),
    lasers: (level.lasers || []).map(item => ({ ...item, readyAt: 0 })),
    sequence: { nodes: level.sequenceNodes || [], progress: 0,
      nextWaveId: 0, lastWrongWaveId: -1,
      complete: !(level.sequenceNodes || []).length },
    laserBeams: [], wallGlows: [],
  };
}

function onSilentFloor(world, actor = world.player) {
  return (world.silentFloors || []).some(item =>
    Math.floor(item.x) === Math.floor(actor.x) &&
    Math.floor(item.y) === Math.floor(actor.y));
}

function onPlayerMove(world, emitSound, actor = world.player) {
  const key = `${Math.floor(actor.x)},${Math.floor(actor.y)}`;
  if (actor.noisyFloorCell === key) return;
  actor.noisyFloorCell = key;
  const floor = world.noisyFloors.find(item =>
    Math.floor(item.x) === Math.floor(actor.x) &&
    Math.floor(item.y) === Math.floor(actor.y));
  if (floor) emitSound(world, actor.x, actor.y, 'noisyFloor', 12, 1, null, actor.id);
}

function arrivedWave(world, item, accepted = playerSounds) {
  return world.waves.find(wave => {
    if (!accepted.has(wave.type)) return false;
    const distance = wave.field.at(item.x, item.y);
    return Number.isFinite(distance) && world.time - wave.start >= distance / wave.speed;
  });
}

function rebuildTerrain(world) {
  const walls = new Set(world.baseLevel.walls);
  const pits = new Set(world.baseLevel.pits || []);
  if (world.unlocked) {
    for (const key of world.baseLevel.mechanismWalls || []) walls.delete(key);
  }
  for (const gate of world.gates) {
    if (gate.phase === 'closed') walls.add(`${Math.floor(gate.x)},${Math.floor(gate.y)}`);
  }
  for (const floor of world.fragileFloors) {
    if (floor.phase === 'collapsed') pits.add(`${Math.floor(floor.x)},${Math.floor(floor.y)}`);
  }
  world.level = { ...world.baseLevel, walls, pits };
}

function wallGlow(map, segment, until) {
  if (!segment.hit) return null;
  const x = segment.toX;
  const y = segment.toY;
  if (segment.normalX) {
    const wallX = Math.floor(x - segment.normalX * 0.02);
    const wallY = Math.floor(y);
    if (!map.walls.has(`${wallX},${wallY}`)) return null;
    return { x1: Math.round(x), y1: wallY, x2: Math.round(x), y2: wallY + 1, until };
  }
  const wallX = Math.floor(x);
  const wallY = Math.floor(y - segment.normalY * 0.02);
  if (!map.walls.has(`${wallX},${wallY}`)) return null;
  return { x1: wallX, y1: Math.round(y), x2: wallX + 1, y2: Math.round(y), until };
}

function updateDevices(world, emitSound) {
  let terrainChanged = false;
  const afterTerrain = [];
  for (const beacon of world.beacons) {
    if (world.time < beacon.nextAt) continue;
    emitSound(world, beacon.x, beacon.y, 'beacon', beacon.radius || 3.5, 0.48);
    beacon.nextAt = world.time + (beacon.period || 4);
  }
  for (const decoy of world.decoys) {
    if (world.time >= decoy.fireAt) {
      decoy.fireAt = Infinity;
      emitSound(world, decoy.x, decoy.y, 'decoy', 12);
    }
    if (world.time < decoy.readyAt || decoy.fireAt !== Infinity) continue;
    if (arrivedWave(world, decoy)) {
      decoy.fireAt = world.time + 0.2;
      decoy.readyAt = world.time + 10;
    }
  }
  for (const relay of world.relays) {
    if (world.time >= relay.fireAt) {
      relay.fireAt = Infinity;
      const wave = emitSound(world, relay.toX, relay.toY, 'relay', relay.radius || 7);
      wave.audioCue = relay.incomingCue;
    }
    if (world.time < relay.readyAt || relay.fireAt !== Infinity ||
        relay.requiresSequence && !world.sequence.complete) continue;
    const incoming = arrivedWave(world, relay, relay.probeOnly ? probeSounds : playerSounds);
    if (incoming) {
      relay.incomingCue = incoming.type === 'footstep' ? 'step' : incoming.type;
      const response = emitSound(world, relay.x, relay.y, 'relay', 3, 0.75);
      response.audioCue = relay.incomingCue;
      response.mechanismChecked = true;
      relay.fireAt = world.time + 0.25;
      relay.readyAt = world.time + 6;
    }
  }
  const sequence = world.sequence;
  if (!sequence.complete && sequence.nodes.length === 2) {
    const arrivedProbe = (target, minId = sequence.nextWaveId) => world.waves.find(candidate => {
      if (candidate.type !== 'probe' || candidate.id < minId) return false;
      const distance = candidate.field.at(target.x, target.y);
      return Number.isFinite(distance) &&
        world.time - candidate.start >= distance / candidate.speed;
    });
    const target = sequence.nodes[sequence.progress];
    const wave = arrivedProbe(target);
    if (wave && sequence.progress === 0) {
      sequence.progress = 1;
      sequence.nextWaveId = world.nextWave;
      emitSound(world, target.x, target.y, 'sequenceCue', 4);
    } else if (wave) {
      sequence.progress = 2;
      sequence.complete = true;
      emitSound(world, target.x, target.y, 'sequenceDone', 4);
    } else if (sequence.progress === 0) {
      const wrongNode = sequence.nodes[1];
      const wrongWave = arrivedProbe(wrongNode,
        Math.max(sequence.nextWaveId, sequence.lastWrongWaveId + 1));
      if (wrongWave) {
        sequence.lastWrongWaveId = wrongWave.id;
        emitSound(world, wrongNode.x, wrongNode.y, 'sequenceReset', 2.2);
      }
    }
  }
  for (const gate of world.gates) {
    if (world.time >= gate.changeAt && gate.phase === 'warning') {
      const occupied = [...world.actors.filter(actor => actor.alive !== false && !actor.escaped), ...world.enemies].some(actor =>
        Math.floor(actor.x) === Math.floor(gate.x) && Math.floor(actor.y) === Math.floor(gate.y));
      if (occupied) gate.changeAt = world.time + 0.1;
      else {
        gate.phase = 'closed';
        gate.changeAt = world.time + 3;
        emitSound(world, gate.x, gate.y, 'gateClose', 2.5);
        terrainChanged = true;
      }
    } else if (world.time >= gate.changeAt && gate.phase === 'closed') {
      gate.phase = 'open';
      gate.changeAt = Infinity;
      gate.readyAt = world.time + 1;
      afterTerrain.push([gate.x, gate.y, 'gateOpen', 2.5]);
      terrainChanged = true;
    }
    if (gate.phase === 'open' && world.time >= gate.readyAt && arrivedWave(world, gate)) {
      gate.phase = 'warning';
      gate.changeAt = world.time + 0.6;
      emitSound(world, gate.x, gate.y, 'gateWarning', 3);
    }
  }
  for (const floor of world.fragileFloors) {
    if (world.time >= floor.changeAt && floor.phase === 'warning') {
      floor.phase = 'collapsed';
      floor.changeAt = world.time + 2;
      emitSound(world, floor.x, floor.y, 'fragileFall', 3);
      terrainChanged = true;
    } else if (world.time >= floor.changeAt && floor.phase === 'collapsed') {
      floor.phase = 'solid';
      floor.changeAt = Infinity;
      floor.readyAt = world.time + 1;
      afterTerrain.push([floor.x, floor.y, 'fragileReset', 2]);
      terrainChanged = true;
    }
    if (floor.phase === 'solid' && world.time >= floor.readyAt &&
        world.actors.some(actor => actor.alive !== false && !actor.escaped &&
          Math.floor(actor.x) === Math.floor(floor.x) && Math.floor(actor.y) === Math.floor(floor.y))) {
      floor.phase = 'warning';
      floor.changeAt = world.time + 0.9;
      emitSound(world, floor.x, floor.y, 'fragileWarning', 3);
    }
  }
  if (terrainChanged) rebuildTerrain(world);
  for (const sound of afterTerrain) emitSound(world, ...sound);
  for (const laser of world.lasers) {
    if (world.time < laser.readyAt) continue;
    const wave = arrivedWave(world, laser);
    if (!wave) continue;
    const source = wave.ownerId == null ? wave :
      world.actors.find(actor => actor.id === wave.ownerId) || wave;
    const dx = laser.x - source.x;
    const dy = laser.y - source.y;
    const path = traceLaser(world.level, laser.x, laser.y, dx, dy);
    world.laserBeams.push({ ...path, until: world.time + 0.4 });
    for (const segment of path.segments) {
      const glow = wallGlow(world.level, segment, world.time + 2.5);
      if (glow) world.wallGlows.push(glow);
    }
    emitSound(world, laser.x, laser.y, 'laser', 3);
    laser.readyAt = world.time + 4;
  }
  world.laserBeams = world.laserBeams.filter(beam => beam.until > world.time);
  world.wallGlows = world.wallGlows.filter(glow => glow.until > world.time);
}

module.exports = { traceLaser, wallGlow, createDevices, onSilentFloor, onPlayerMove,
  rebuildTerrain, updateDevices };
