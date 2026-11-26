const { createPreviewWorld } = require('./core');
const { emitSound, emitLure, movePlayer, updateWorld, takeMimicAudioEvents } = require('../../src/world');
const { stepMovement } = require('../../src/movement');
const { drawScene, cameraFor } = require('../../src/render');
const { playSceneWave, updateSceneLoops, updateMimicSceneAudio, stopSceneLoops } = require('../../src/scene-audio');
const { createMimicPresentation } = require('../../src/mimic-presentation');
const { createReplayAudio } = require('./web-audio');
const { MAX_PROBE_RADIUS } = require('../../src/sound-ranges');

function createPreview(onExit, onAudioError) {
  const $ = id => document.getElementById(id);
  const screen = $('preview-screen'), canvas = $('game-canvas'), ctx = canvas.getContext('2d');
  let world, draft, control, frame = 0, last = 0, audio, muted = false, paused = false, reveal = false, chargeAt = null;
  let waves = new WeakSet(), outcome = null, viewport, aim = { dx: 0, dy: -1 };
  const keys = new Set();
  const mimicPresentation = createMimicPresentation();
  const chargeFor = now => chargeAt === null ? 0 : Math.max(0, Math.min(1, (now - chargeAt) / 1500));
  function stopAudio() {
    if (audio) {
      stopSceneLoops(audio.audio); if (!audio.audio.muted) audio.audio.toggle();
      audio.context.suspend().catch(() => {});
    }
  }
  function ensureAudio() {
    if (muted) return;
    try {
      if (!audio) audio = createReplayAudio();
      if (audio.audio.muted) audio.audio.toggle();
      audio.resume().catch(() => onAudioError('浏览器暂未开启音效，可点击「音效」重试'));
    } catch (_) { muted = true; $('preview-sound').textContent = '音效关'; onAudioError('当前浏览器不支持音效，仍可继续试玩'); }
  }
  function resize() {
    const available = canvas.parentElement.getBoundingClientRect();
    const h = Math.max(240, Math.min(available.height - 32, (available.width - 300) * 4 / 3, 900));
    const w = Math.round(h * .75), height = Math.round(h);
    canvas.style.width = `${w}px`; canvas.style.height = `${height}px`;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(height * dpr);
    }
    viewport = { left: 0, top: 0, width: w, height, size: Math.min(w / 18, height / 24) };
    return { width: w, height, dpr };
  }
  function restart() {
    stopAudio();
    mimicPresentation.reset(); world = createPreviewWorld(draft); control = { footstepAt: 0 }; waves = new WeakSet();
    paused = false; outcome = null; chargeAt = null; keys.clear();
    $('preview-pause').textContent = '暂停'; $('preview-outcome').hidden = true;
    emitSound(world, world.player.x, world.player.y, 'probe', 2.5, .35);
    ensureAudio(); canvas.focus();
  }
  function start(input) {
    draft = JSON.parse(JSON.stringify(input));
    // Validate before exposing the overlay, so a failed preview leaves editing intact.
    createPreviewWorld(draft);
    reveal = false; $('preview-reveal').setAttribute('aria-pressed', false);
    screen.hidden = false;
    for (const node of document.querySelectorAll('.app-header,.workspace,.statusbar')) node.inert = true;
    $('preview-name').textContent = draft.name;
    restart(); last = performance.now(); cancelAnimationFrame(frame); frame = requestAnimationFrame(tick);
  }
  function exit() {
    screen.hidden = true; cancelAnimationFrame(frame); stopAudio(); mimicPresentation.reset(); keys.clear(); chargeAt = null;
    for (const node of document.querySelectorAll('.app-header,.workspace,.statusbar')) node.inert = false;
    onExit();
  }
  function togglePause() {
    if (outcome) return;
    paused = !paused; chargeAt = null; keys.clear(); $('preview-pause').textContent = paused ? '继续' : '暂停';
    if (paused) stopAudio(); else ensureAudio(); canvas.focus();
  }
  function tick(now) {
    if (screen.hidden) return;
    const dt = Math.min(.04, Math.max(0, (now - last) / 1000)); last = now;
    const stage = resize();
    if (!paused && !world.failed && !world.complete) {
      let dx = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
      let dy = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
      if (dx || dy) {
        chargeAt = null;
        const magnitude = Math.hypot(dx, dy); dx /= magnitude; dy /= magnitude;
        // Keep quiet footsteps below the mimic's radius > 1 trigger threshold.
        stepMovement(world, control, dx, dy, keys.has('ShiftLeft') || keys.has('ShiftRight') ? .1 : .65, dt, movePlayer, emitSound);
      }
      updateWorld(world, dt);
    }
    ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, stage.width, stage.height);
    const camera = cameraFor(viewport, world.level, world.player);
    const sceneActive = !paused && !world.failed && !world.complete;
    if (!sceneActive) chargeAt = null;
    const charge = chargeFor(now);
    const events = takeMimicAudioEvents(world);
    const mimicFrames = mimicPresentation.update(world, viewport, camera, dt, sceneActive);
    drawScene(ctx, viewport, world, { developerAvailable: true, fullReveal: reveal, camera, mimicFrames,
      probeCharge: chargeAt === null ? null : charge });
    if (audio && !muted && sceneActive) {
      for (const wave of world.waves) if (!waves.has(wave)) { waves.add(wave); playSceneWave(audio.audio, wave, world.player, viewport, camera); }
      updateSceneLoops(audio.audio, world, viewport, camera);
      updateMimicSceneAudio(audio.audio, world, events, viewport, camera, dt);
    }
    if ((world.failed || world.complete) && !outcome) {
      outcome = world.complete ? 'complete' : 'failed'; stopAudio(); keys.clear();
      $('preview-outcome').innerHTML = `<h2>${world.complete ? '抵达出口' : '再试一次'}</h2><p>${world.complete ? '这张地图已经可以顺利通关。' : '调整路线，或返回编辑完善你的设计。'}</p><button id="outcome-restart">重新开始</button>`;
      $('preview-outcome').hidden = false; $('outcome-restart').onclick = restart;
    }
    $('preview-state').textContent = outcome === 'complete' ? '已通关' : outcome === 'failed' ? '试玩结束' : paused ? '已暂停' : `正在试玩 · ${world.time.toFixed(1)}s`;
    $('preview-charge').textContent = chargeAt === null ? '按住空格蓄力声波 · E 投掷诱饵' : `声波蓄力 ${Math.round(charge * 100)}%`;
    $('preview-player').textContent = `X ${world.player.x.toFixed(1)}   Y ${world.player.y.toFixed(1)}  ·  诱饵 ${world.stonesHeld}`;
    frame = requestAnimationFrame(tick);
  }
  function lure() { if (!paused && !outcome) emitLure(world, aim.dx, aim.dy); }
  $('back-to-editor').onclick = exit; $('preview-restart').onclick = restart; $('preview-pause').onclick = togglePause;
  $('preview-reveal').onclick = () => { reveal = !reveal; $('preview-reveal').setAttribute('aria-pressed', reveal); canvas.focus(); };
  $('preview-sound').onclick = () => {
    muted = !muted; $('preview-sound').innerHTML = muted ? '音效关' : '音效开'; $('preview-sound').setAttribute('aria-pressed', !muted);
    if (muted || paused) stopAudio(); else ensureAudio(); canvas.focus();
  };
  document.addEventListener('keydown', event => {
    if (screen.hidden) return;
    if (event.code === 'Escape') { event.preventDefault(); exit(); return; }
    if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName) && ['Space', 'Enter'].includes(event.code)) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE'].includes(event.code)) event.preventDefault();
    const held = keys.has(event.code);
    keys.add(event.code);
    if (held || event.repeat || paused || outcome) return;
    if (event.code === 'Space' && ![...keys].some(key => /^(Key[WASD]|Arrow)/.test(key))) { chargeAt = performance.now(); ensureAudio(); }
    if (event.code === 'KeyE') lure();
  });
  document.addEventListener('keyup', event => {
    keys.delete(event.code);
    if (screen.hidden || event.code !== 'Space' || chargeAt === null) return;
    event.preventDefault();
    if (!paused && !outcome) {
      const charge = chargeFor(performance.now());
      emitSound(world, world.player.x, world.player.y, 'probe', 4 + (MAX_PROBE_RADIUS - 4) * charge, .35 + .65 * charge);
    }
    chargeAt = null;
  });
  canvas.addEventListener('pointermove', event => {
    const r = canvas.getBoundingClientRect(), camera = cameraFor(viewport, world.level, world.player);
    aim = { dx: (event.clientX - r.left) / viewport.size + camera.x - world.player.x,
      dy: (event.clientY - r.top) / viewport.size + camera.y - world.player.y };
  });
  canvas.addEventListener('contextmenu', event => { event.preventDefault(); lure(); });
  window.addEventListener('blur', () => { keys.clear(); chargeAt = null; if (!screen.hidden && !paused && !outcome) togglePause(); });
  return { start, active: () => !screen.hidden };
}
module.exports = { createPreview };
