const presence = {
  minePresence: { period: 3.4, radius: 2.2, intensity: 0.24, phase: 0.6 },
  alarmPresence: { period: 4.1, radius: 2.3, intensity: 0.25, phase: 0.85 },
  decoyPresence: { period: 0.42, radius: 1.2, intensity: 0.22, phase: 0.35 },
  relayPresence: { period: 4, radius: 2.3, intensity: 0.22, phase: 1.76 },
};

const waveStyles = {
  exitLockedPresence: { rgb: '230,188,96', shape: 'double' },
  exitOpenPresence: { rgb: '167,240,202', shape: 'double' },
  lockPresence: { rgb: '230,188,96', shape: 'double' },
  minePresence: { rgb: '226,75,77', shape: 'broken' },
  mineWarning: { rgb: '242,90,80', shape: 'rough' },
  mineBlast: { rgb: '242,70,65', shape: 'rough' },
  alarmPresence: { rgb: '230,103,96', shape: 'rough' },
  alarm: { rgb: '244,114,91', shape: 'rough' },
  noisyPresence: { rgb: '220,102,103', shape: 'broken' },
  noisyFloor: { rgb: '220,102,103', shape: 'rough' },
  silentPresence: { rgb: '123,205,170', shape: 'broken' },
  fragilePresence: { rgb: '216,113,100', shape: 'rough' },
  fragileWarning: { rgb: '232,118,91', shape: 'rough' },
  fragileFall: { rgb: '232,83,79', shape: 'rough' },
  gatePresence: { rgb: '217,97,97', shape: 'double' },
  gateWarning: { rgb: '236,102,94', shape: 'double' },
  gateClose: { rgb: '232,86,85', shape: 'double' },
  gateOpen: { rgb: '232,86,85', shape: 'double' },
  decoyPresence: { rgb: '143,230,223', shape: 'smooth' },
  decoy: { rgb: '143,230,223', shape: 'double' },
  laserPresence: { rgb: '112,215,222', shape: 'rough' },
  laser: { rgb: '112,215,222', shape: 'rough' },
  relayPresence: { rgb: '143,230,223', shape: 'double' },
  relay: { rgb: '143,230,223', shape: 'double' },
  sequenceFirstPresence: { rgb: '230,188,96', shape: 'smooth' },
  sequenceSecondPresence: { rgb: '230,188,96', shape: 'double' },
  sequenceCue: { rgb: '230,188,96', shape: 'double' },
  sequenceDone: { rgb: '167,240,202', shape: 'double' },
  spike: { rgb: '240,110,79', shape: 'rough' },
  bow: { rgb: '226,75,77', shape: 'broken' },
  arrow: { rgb: '226,75,77', shape: 'broken' },
  pit: { rgb: '226,75,77', shape: 'smooth' },
  bat: { rgb: '240,105,145', shape: 'rough' },
  sentinel: { rgb: '237,106,155', shape: 'double' },
  beacon: { rgb: '143,230,223', shape: 'smooth' },
};

function isPresence(type) {
  return Object.prototype.hasOwnProperty.call(presence, type);
}

function createAmbientSources(world) {
  const sources = [];
  const add = (type, item, offset = 0) => {
    const config = presence[type];
    sources.push({ type, x: item.x, y: item.y,
      radius: config.radius, intensity: config.intensity,
      period: config.period, nextAt: config.phase + offset,
      seed: (Math.imul(Math.floor(item.x) + 1, 73856093) ^
        Math.imul(Math.floor(item.y) + 1, 19349663)) >>> 0 });
  };
  const addAll = (type, items) => {
    (items || []).forEach((item, index) => add(type, item, index * 0.19));
  };
  addAll('minePresence', world.mines);
  addAll('alarmPresence', world.alarms);
  addAll('decoyPresence', world.decoys);
  addAll('relayPresence', world.relays);
  return sources;
}

function updateAmbient(world, emitSound) {
  for (const source of world.ambientSources) {
    if (world.time < source.nextAt) continue;
    source.nextAt += source.period * (Math.floor((world.time - source.nextAt) / source.period) + 1);
    if (!(world.actors || [world.player]).some(actor =>
      actor.alive !== false && !actor.escaped &&
      Math.hypot(source.x - actor.x, source.y - actor.y) <= 16)) continue;
    if (source.type === 'minePresence' && world.mines.some(mine =>
      mine.x === source.x && mine.y === source.y && mine.armedUntil !== Infinity)) continue;
    if (source.type === 'decoyPresence') {
      source.seed = (Math.imul(source.seed, 1664525) + 1013904223) >>> 0;
      const angle = source.seed / 0x100000000 * Math.PI * 2;
      source.seed = (Math.imul(source.seed, 1664525) + 1013904223) >>> 0;
      const offset = Math.sqrt(source.seed / 0x100000000) * 0.35;
      const wave = emitSound(world, source.x + Math.cos(angle) * offset,
        source.y + Math.sin(angle) * offset, source.type,
        source.radius, source.intensity);
      wave.speed = 3;
      wave.audioSilent = true;
    } else {
      emitSound(world, source.x, source.y, source.type, source.radius, source.intensity);
    }
  }
}

module.exports = { isPresence, waveStyles, createAmbientSources, updateAmbient };
