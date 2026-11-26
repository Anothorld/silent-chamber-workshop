const { clips } = require('../mimic-audio-manifest.js');

const loudStep = wave => wave.type === 'footstep' && wave.radius > 1;
const playerSound = wave => loudStep(wave) || wave.type === 'probe';
const newer = (wave, last) => !last || wave.start > last.start ||
  wave.start === last.start && wave.id > last.id;

function mimicState(id, now, stoppedAt = -Infinity) {
  return {
    id, enteredAt: now, triggerKind: null, lastHeard: null, fixedTarget: null,
    locked: false, mimicEndsAt: 0, quietUntil: 0, stoppedAt, alertUntil: 0,
    stride: 1, voiceIndex: 0, consumed: new Set(), cue: null, stepCues: [],
  };
}

function createMimic(x, y, id, now = 0) {
  return { type: 'mimic', x, y, home: [x, y], mode: 'idle', target: null,
    mimic: mimicState(id, now) };
}

function resetMimic(enemy, now) {
  enemy.mode = 'idle';
  enemy.target = null;
  enemy.mimic = mimicState(enemy.mimic.id, now, now);
}

function remember(enemy, wave) {
  enemy.mimic.lastHeard = {
    id: wave.id, start: wave.start, x: wave.x, y: wave.y,
    kind: wave.type === 'landing' ? 'stone' : wave.type,
  };
  enemy.target = [wave.x, wave.y];
}

function advanceMimicTimers(enemy, now) {
  const m = enemy.mimic;
  if (enemy.mode === 'alert' && now >= m.alertUntil) {
    enemy.mode = 'idle'; m.enteredAt = m.alertUntil;
  }
  if (enemy.mode === 'mimic' && now >= m.mimicEndsAt) {
    enemy.mode = 'quiet'; m.enteredAt = m.mimicEndsAt;
  }
  if (enemy.mode === 'quiet' && now >= m.quietUntil) {
    enemy.mode = 'slow'; m.enteredAt = m.quietUntil; m.cue = null;
  }
}

function effect(enemy, kind, at) {
  const m = enemy.mimic;
  const clip = clips[m.voiceIndex++ % clips.length];
  return { enemyId: m.id, kind, x: enemy.x, y: enemy.y, at, clipId: clip.id };
}

function hearMimic(enemy, wave, heardAt) {
  advanceMimicTimers(enemy, heardAt);
  const m = enemy.mimic;
  if ((!playerSound(wave) && wave.type !== 'landing') ||
      m.consumed.has(wave.id) || wave.start <= m.stoppedAt ||
      !newer(wave, m.lastHeard)) return [];
  m.consumed.add(wave.id);
  const stationary = enemy.mode === 'idle' || enemy.mode === 'alert';
  if (!stationary) {
    if (m.triggerKind !== 'footstep' || !playerSound(wave)) return [];
    remember(enemy, wave);
    if (loudStep(wave) && ['mimic', 'quiet', 'slow'].includes(enemy.mode)) {
      enemy.mode = 'fast'; m.enteredAt = heardAt; m.cue = null;
    }
    return [];
  }

  m.triggerKind = wave.type === 'landing' ? 'stone' : 'footstep';
  remember(enemy, wave);
  m.fixedTarget = m.triggerKind === 'stone' ? [wave.x, wave.y] : null;
  m.stride = 1; m.locked = false; m.enteredAt = heardAt;
  if (enemy.mode === 'alert') {
    enemy.mode = 'fast'; m.cue = null;
    return [];
  }

  enemy.mode = 'mimic';
  const sound = effect(enemy, 'mimic', heardAt);
  const clip = clips[(m.voiceIndex - 1) % clips.length];
  m.mimicEndsAt = heardAt + clip.duration;
  m.quietUntil = m.mimicEndsAt + 1.3;
  m.cue = { x: enemy.x, y: enemy.y, at: heardAt, radius: 8, speed: 6 };
  return [sound];
}

function stopMimic(enemy, now) {
  const m = enemy.mimic;
  enemy.mode = 'alert'; enemy.target = null;
  m.cue = null; m.locked = false;
  m.enteredAt = now; m.stoppedAt = now; m.alertUntil = now + 10;
}

function updateMimic(enemy, { now, dt, player, maxSpeed, move, resolveStoneTarget }) {
  advanceMimicTimers(enemy, now);
  const m = enemy.mimic;
  m.stepCues = m.stepCues.filter(cue => now - cue.at < cue.radius / cue.speed);
  if (enemy.mode !== 'slow' && enemy.mode !== 'fast') return [];
  m.locked = enemy.mode === 'fast' && m.triggerKind === 'footstep' &&
    Math.hypot(enemy.x - player.x, enemy.y - player.y) <= 2;
  const stoneTarget = m.triggerKind === 'stone' ? [...m.fixedTarget] : null;
  enemy.target = stoneTarget ? (resolveStoneTarget?.(enemy, stoneTarget) ?? stoneTarget) : m.locked ?
    [player.x, player.y] : [m.lastHeard.x, m.lastHeard.y];
  const arrived = () => !m.locked &&
    Math.hypot(enemy.x - enemy.target[0], enemy.y - enemy.target[1]) < .06;
  if (arrived()) {
    stopMimic(enemy, now);
    return [];
  }

  const movingDt = Math.max(0, now - Math.max(now - dt, m.enteredAt));
  const oldX = enemy.x, oldY = enemy.y;
  move(enemy, enemy.target, movingDt, maxSpeed * (enemy.mode === 'fast' ? 1.1 : .9));
  const traveled = Math.hypot(enemy.x - oldX, enemy.y - oldY);
  const effects = [];
  if (traveled > 0) {
    const strideLength = enemy.mode === 'fast' && m.triggerKind === 'footstep' ? .5 : 1;
    m.stride = Math.min(m.stride, strideLength) + traveled;
    while (m.stride >= strideLength) {
      effects.push(effect(enemy, 'step', now));
      m.stepCues.push({ x: enemy.x, y: enemy.y, at: now, radius: 4, speed: 6 });
      m.stride -= strideLength;
    }
  }
  if (arrived()) stopMimic(enemy, now);
  return effects;
}

module.exports = {
  createMimic, resetMimic, hearMimic,
  advanceMimicTimers, updateMimic,
};
