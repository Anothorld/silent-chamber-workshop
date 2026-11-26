const { isPresence } = require('./acoustic-signatures');
const { createSceneAcoustics } = require('./atmosphere-acoustics');
const globalResponseWaves = new Set(['unlock', 'exitUnlock',
  'sequenceCue', 'sequenceDone', 'sequenceReset', 'relay',
  'gateWarning', 'gateClose', 'gateOpen', 'decoy', 'laser']);

function playSceneWave(audio, wave, player, viewport, camera, acoustics) {
  const play = (name, volume) => {
    const distance = Math.hypot(wave.x - player.x, wave.y - player.y);
    const visible = wave.x >= camera.x && wave.x <= camera.x + viewport.width / viewport.size &&
      wave.y >= camera.y && wave.y <= camera.y + viewport.height / viewport.size;
    audio.play(name, volume, { distance, visible, global: globalResponseWaves.has(wave.type),
      sourceX: wave.x, sourceY: wave.y, ...acoustics?.waveOptions(wave) });
  };
  if (wave.audioSilent) return;
  if (['sniper', 'shotgun', 'dagger'].includes(wave.type)) play(wave.type, .5);
  else if (wave.type === 'footstep') play('step', 0.006 +
    Math.max(0, Math.min(1, (wave.radius - 0.95) / 7.55)) * 0.45);
  else if (wave.type === 'probe') play('probe', 0.1 + 0.8 * (wave.intensity ?? 1));
  else if (wave.type === 'lure') play('lure', 0.2 + 0.55 * (wave.intensity ?? 1));
  else if (wave.type === 'landing') play('landing', 0.16 + 0.4 * (wave.intensity ?? 1));
  else if (wave.type === 'pickup') play('pickup', 0.36);
  else if (wave.type === 'unlock') play('unlock', 0.32);
  else if (wave.type === 'exitUnlock') play('exitUnlock', 0.3);
  else if (wave.type === 'spike') play('spike', 0.48);
  else if (wave.type === 'bow') play('bow', 0.45);
  else if (wave.type === 'arrow') play('arrow', 0.3);
  else if (wave.type === 'bat') play('bat', 0.47);
  else if (wave.type === 'mineWarning') play('mineWarning', 0.43);
  else if (wave.type === 'mineBlast') play('mineBlast', 0.65);
  else if (wave.type === 'alarm') play('alarm', 0.58);
  else if (wave.type === 'sentinel') play('sentinel', 0.48);
  else if (wave.type === 'noisyFloor') play('noisyFloor', 0.48);
  else if (wave.type === 'beacon') play('beacon', 0.2);
  else if (wave.type === 'decoy') play('decoy', 0.48);
  else if (wave.type === 'gateWarning') play('gateWarning', 0.34);
  else if (wave.type === 'gateClose') play('gateClose', 0.44);
  else if (wave.type === 'gateOpen') play('gateOpen', 0.34);
  else if (wave.type === 'fragileWarning') play('fragileWarning', 0.3);
  else if (wave.type === 'fragileFall') play('fragileFall', 0.45);
  else if (wave.type === 'fragileReset') play('fragileReset', 0.32);
  else if (wave.type === 'laser') play('laser', 0.46);
  else if (wave.type === 'relay') play(wave.audioCue || 'probe', 0.38);
  else if (wave.type === 'sequenceCue') play('sequenceCue', 0.35);
  else if (wave.type === 'sequenceDone') play('sequenceDone', 0.48);
  else if (wave.type === 'sequenceReset') play('sequenceReset', 0.32);
  else if (wave.type === 'reflection') play('reflection', 0.52);
  else if (isPresence(wave.type) && wave.type !== 'decoyPresence') play(wave.type,
    wave.type === 'alarmPresence' ? 0.15 :
      wave.type.includes('exit') || wave.type === 'lockPresence' ? 0.14 : 0.1);
}
function stopSceneLoops(audio) {
  audio.setEnemy(null); audio.setDecoys([]); audio.setPits([]); audio.stopMimics?.();
}
function updateMimicSceneAudio(audio, world, events, viewport, camera, dt) {
  const spatial = source => ({
    distance: Math.hypot(source.x - world.player.x, source.y - world.player.y),
    visible: source.x >= camera.x && source.x <= camera.x + viewport.width / viewport.size &&
      source.y >= camera.y && source.y <= camera.y + viewport.height / viewport.size,
  });
  for (const event of events) audio.playMimic(event, spatial(event));
  const sources = world.enemies.filter(enemy => enemy.type === 'mimic')
    .map(enemy => ({ enemyId: enemy.mimic.id, x: enemy.x, y: enemy.y, ...spatial(enemy) }));
  audio.updateMimics(sources, dt);
}
function updateSceneLoops(audio, world, viewport, camera, acoustics) {
  let nearestEnemy = null;
  for (const enemy of world.enemies) {
    if (enemy.type === 'mimic') continue;
    const mix = acoustics?.enemySound(enemy);
    if (acoustics && !mix) continue;
    const distance = mix?.distance ?? Math.hypot(enemy.x - world.player.x, enemy.y - world.player.y);
    if (nearestEnemy && distance >= nearestEnemy.distance) continue;
    const visible = enemy.x >= camera.x && enemy.x <= camera.x + viewport.width / viewport.size &&
      enemy.y >= camera.y && enemy.y <= camera.y + viewport.height / viewport.size;
    nearestEnemy = { distance, visible, type: enemy.type, mode: enemy.mode, mix };
  }
  const enemyOptions = nearestEnemy?.mix ?
    [{ occlusion: nearestEnemy.mix.occlusion, pan: nearestEnemy.mix.pan }] : [];
  audio.setEnemy(nearestEnemy?.distance,
    nearestEnemy?.visible, nearestEnemy?.type, nearestEnemy?.mode, ...enemyOptions);
  audio.setDecoys((world.decoys || []).map(decoy => ({ x: decoy.x, y: decoy.y,
    distance: Math.hypot(decoy.x - world.player.x, decoy.y - world.player.y),
    visible: decoy.x >= camera.x && decoy.x <= camera.x + viewport.width / viewport.size &&
      decoy.y >= camera.y && decoy.y <= camera.y + viewport.height / viewport.size })));
  audio.setPits((world.pitSources || []).map(source => ({ x: source.x, y: source.y,
    distance: Math.hypot(source.x - world.player.x, source.y - world.player.y),
    visible: source.x >= camera.x && source.x <= camera.x + viewport.width / viewport.size &&
      source.y >= camera.y && source.y <= camera.y + viewport.height / viewport.size })));
}
module.exports = { createSceneAcoustics, playSceneWave, updateSceneLoops, updateMimicSceneAudio, stopSceneLoops };
