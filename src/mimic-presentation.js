const { particleFrame, createBrownianMotion } = require('./mimic-reveal.js');

function seedFor(key) {
  let seed = 0x811c9dc5;
  for (const character of String(key)) seed = Math.imul(seed ^ character.charCodeAt(0), 0x01000193);
  return seed >>> 0 || 0xb5297a4d;
}

function cueFrame(cue, now, viewport, camera) {
  if (!cue) return null;
  const age = now - cue.at, lifetime = cue.radius / cue.speed;
  if (age < 0 || age > lifetime) return null;
  return { x: (cue.x - camera.x) * viewport.size, y: (cue.y - camera.y) * viewport.size,
    radius: age * cue.speed * viewport.size, alpha: .7 * (1 - age / lifetime) };
}

// Own visual time independently of the simulation clock and render submissions.
function createMimicPresentation() {
  const instances = new Map();
  let wasActive = false;
  function update(world, viewport, camera, dt, active) {
    const elapsed = active && wasActive && Number.isFinite(dt) ? Math.max(0, Math.min(dt, .1)) : 0;
    wasActive = !!active;
    const current = new Set(), frames = [];
    for (const [index, enemy] of (world.enemies || []).entries()) {
      if (enemy.type !== 'mimic') continue;
      const key = enemy.mimic?.id ?? enemy.id ?? 'npc:' + index;
      current.add(key);
      let instance = instances.get(key);
      if (!instance) {
        instance = { motion: createBrownianMotion(seedFor(key)), time: 0 };
        instances.set(key, instance);
      } else {
        const motionTime = enemy.mode === 'fast' && enemy.mimic?.triggerKind === 'footstep' ? elapsed * 1.8 : elapsed;
        instance.time += motionTime;
        instance.motion.advance(motionTime);
      }
      const { points } = particleFrame({ distance: Math.hypot(enemy.x - world.player.x, enemy.y - world.player.y),
        width: viewport.width, height: viewport.height, cell: viewport.size,
        enemyX: (enemy.x - camera.x) * viewport.size, enemyY: (enemy.y - camera.y) * viewport.size,
        time: instance.time, motion: instance.motion.offsets });
      frames.push({ enemyId: key, points, cue: cueFrame(enemy.mimic?.cue, world.time, viewport, camera),
        stepCues: (enemy.mimic?.stepCues || []).map(cue => cueFrame(cue, world.time, viewport, camera)).filter(Boolean) });
    }
    for (const key of instances.keys()) if (!current.has(key)) instances.delete(key);
    return frames;
  }
  return { update, suspend() { wasActive = false; }, reset() { instances.clear(); wasActive = false; } };
}
module.exports = { createMimicPresentation };
