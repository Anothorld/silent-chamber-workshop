const { contourLines } = require('./contours');
const { getGeometry } = require('./geometry');
const { FOOTPRINT_LIFETIME } = require('./world');
const { waveStyles } = require('./acoustic-signatures');
const { drawAcousticSymbol } = require('./reveal-symbols');
const { drawMimicEffects } = require('./mimic-draw.js');
const { enemyAlerted } = require('./enemy-state');
const hostileWaves = new Set(['enemy', 'spike', 'bow', 'arrow', 'pit',
  'mineWarning', 'mineBlast', 'alarm', 'sentinelCharge', 'sentinel',
  'noisyFloor', 'gateWarning', 'gateClose', 'gateOpen',
  'fragileWarning', 'fragileFall', 'fragileReset', 'minePresence',
  'alarmPresence', 'noisyPresence', 'fragilePresence', 'gatePresence']);
const wallColors = ['180,228,226', '225,86,85', '228,173,79', '238,112,75'];
const wallGlowColors = ['#b4e4e2', '#e15655', '#e4ad4f', '#ee704b'];

function cameraFor(viewport, level, player) {
  const visibleWidth = viewport.width / viewport.size;
  const visibleHeight = viewport.height / viewport.size;
  return {
    x: Math.max(0, Math.min(level.width - visibleWidth, player.x - visibleWidth / 2)),
    y: Math.max(0, Math.min(level.height - visibleHeight, player.y - visibleHeight / 2)),
  };
}

function waveAge(wave, now) {
  return wave.age ?? now - wave.start;
}
function effectTime(effect, now) {
  return effect.age == null ? now : effect.at + effect.age;
}

// Geometry is immutable for one terrain phase. Larger authored maps use the exact
// uncached path; cached wall distance storage is bounded to 128 * 8192 doubles.
const wallGeometrySamples = new WeakMap();
const wallFieldSamples = new WeakMap();
const wallSampleEntries = new Set();
function wallSamples(geometry) {
  if (geometry.faces.length > 2048) return null;
  if (wallGeometrySamples.has(geometry)) return wallGeometrySamples.get(geometry);
  const samples = new Float64Array(geometry.faces.length * 4 * 6);
  geometry.faces.forEach((face, faceIndex) => {
    for (let segment = 0; segment < 4; segment++) {
      const start = segment / 4, end = (segment + 1) / 4, middle = (start + end) / 2;
      samples.set([
        face.x1 + (face.x2 - face.x1) * middle + face.nx * 0.03,
        face.y1 + (face.y2 - face.y1) * middle + face.ny * 0.03,
        face.x1 + (face.x2 - face.x1) * start,
        face.y1 + (face.y2 - face.y1) * start,
        face.x1 + (face.x2 - face.x1) * end,
        face.y1 + (face.y2 - face.y1) * end,
      ], (faceIndex * 4 + segment) * 6);
    }
  });
  wallGeometrySamples.set(geometry, samples);
  return samples;
}
function wallDistance(field, samples, index, x, y) {
  let entry = wallFieldSamples.get(field);
  if (!entry || entry.samples !== samples || !entry.distances) {
    if (entry) wallSampleEntries.delete(entry);
    entry = { samples, distances: new Float64Array(samples.length / 6) };
    entry.distances.fill(NaN);
    wallFieldSamples.set(field, entry); wallSampleEntries.add(entry);
    if (wallSampleEntries.size > 128) {
      const oldest = wallSampleEntries.values().next().value;
      oldest.distances = null; wallSampleEntries.delete(oldest);
    }
  }
  if (Number.isNaN(entry.distances[index])) entry.distances[index] = field.at(x, y);
  return entry.distances[index];
}

function visibilityAt(waves, x, y, now, samples, sampleIndex) {
  let strength = 0;
  for (const wave of waves) {
    const travel = waveAge(wave, now) * wave.speed;
    if (travel < 0) continue;
    if (Number.isFinite(wave.x) && Number.isFinite(wave.y)) {
      const dx = x - wave.x;
      const dy = y - wave.y;
      const limit = wave.radius ? Math.min(travel, wave.radius) : travel;
      if (dx * dx + dy * dy > limit * limit) continue;
    }
    const distance = samples ? wallDistance(wave.field, samples, sampleIndex, x, y) : wave.field.at(x, y);
    if (!Number.isFinite(distance)) continue;
    const afterArrival = waveAge(wave, now) - distance / wave.speed;
    if (afterArrival >= 0 && afterArrival < 1) {
      const reach = wave.radius ? Math.max(0, 1 - distance / wave.radius) ** 0.8 : 1;
      strength = Math.max(strength, (1 - afterArrival) * reach);
    }
  }
  return strength;
}

function waveOpacity(wave, now) {
  if (!wave.radius) return 1;
  const progress = Math.max(0, waveAge(wave, now) * wave.speed / wave.radius);
  return progress >= 1 ? 0 : (1 - progress) ** 0.8;
}

function waveOpacityAt(wave, now, level, x, y) {
  const opacity = waveOpacity(wave, now);
  if (!level.pits?.size) return opacity;
  if (wave.type === 'pit') {
    const rectangle = getGeometry(level).pitRectangles.find(rect =>
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
    if (!rectangle) return 0;
    const edge = Math.min(x - rectangle.left, rectangle.right - x,
      y - rectangle.top, rectangle.bottom - y);
    return opacity * Math.min(1, Math.max(0, edge / 0.55));
  }
  return opacity * Math.min(1, getGeometry(level).pitDistance(x, y) / 0.55);
}

function enemyWallLightAt(enemies, geometry, x, y) {
  let strength = 0;
  for (const enemy of enemies) {
    const distance = Math.hypot(x - enemy.x, y - enemy.y);
    const light = (1 - distance / 3.1) * enemy.intensity;
    if (light <= strength || !geometry.visible(enemy.x, enemy.y, x, y)) continue;
    strength = light;
  }
  return strength;
}

function drawScene(ctx, l, world, ui = {}) {
  const fullReveal = !!(ui.developerAvailable && ui.fullReveal);
  const camera = ui.camera || cameraFor(l, world.level, world.player);
  const px = x => l.left + (x - camera.x) * l.size;
  const py = y => l.top + (y - camera.y) * l.size;
  const inView = (x, y, margin = 1) => x >= camera.x - margin &&
    x <= camera.x + l.width / l.size + margin &&
    y >= camera.y - margin && y <= camera.y + l.height / l.size + margin;
  ctx.save();
  ctx.beginPath(); ctx.rect(l.left, l.top, l.width, l.height); ctx.clip();

  const now = world.time;
  const geometry = getGeometry(world.level);
  if (fullReveal) {
    ctx.fillStyle = 'rgba(90,18,24,0.18)';
    ctx.strokeStyle = '#a04d54';
    ctx.lineWidth = 1;
    for (const pit of geometry.pitRectangles) {
      if (!inView((pit.left + pit.right) / 2, (pit.top + pit.bottom) / 2,
        Math.max(pit.right - pit.left, pit.bottom - pit.top) / 2)) continue;
      const left = px(pit.left);
      const top = py(pit.top);
      const pitWidth = (pit.right - pit.left) * l.size;
      const pitHeight = (pit.bottom - pit.top) * l.size;
      ctx.fillRect(left, top, pitWidth, pitHeight);
      ctx.strokeRect(left, top, pitWidth, pitHeight);
    }
  }
  const perception = fullReveal ? null : ui.enemyPerception;
  const enemyLights = (perception ? perception.samples : world.enemies || [])
    .filter(enemy => enemy.type !== 'mimic' && (enemy.opacity ?? 1) > 0 && inView(enemy.x, enemy.y, 4))
    .map(enemy => {
      const alerted = enemyAlerted(enemy);
      const sampleTime = enemy.sampleTime ?? now;
      const phase = sampleTime * (alerted ? 9.2 : 5.2) + enemy.x * 1.7;
      const pulse = alerted ? 0.72 + 0.28 * Math.sin(phase) : 0.78 + 0.22 * Math.sin(phase);
      return { x: enemy.x, y: enemy.y, intensity: pulse * (alerted ? 0.38 : 0.32) * (enemy.opacity ?? 1) };
    });
  for (const mark of world.footprints || []) {
    const age = mark.age ?? now - mark.at;
    if (age < 0 || age >= FOOTPRINT_LIFETIME || !inView(mark.x, mark.y)) continue;
    const w = l.size * 0.11;
    const h = l.size * 0.24;
    ctx.save();
    ctx.translate(px(mark.x), py(mark.y));
    ctx.rotate(mark.angle + Math.PI / 2);
    ctx.globalAlpha = 0.48 * (1 - age / FOOTPRINT_LIFETIME);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#bddbd5';
    ctx.beginPath();
    ctx.moveTo(-w * 0.55, h * 0.9);
    ctx.quadraticCurveTo(-w, h * 0.4, -w, -h * 0.3);
    ctx.quadraticCurveTo(-w * 0.85, -h, 0, -h);
    ctx.quadraticCurveTo(w * 0.85, -h, w, -h * 0.3);
    ctx.quadraticCurveTo(w, h * 0.55, w * 0.5, h * 0.9);
    ctx.quadraticCurveTo(0, h, -w * 0.55, h * 0.9);
    ctx.fill();
    ctx.restore();
  }

  for (const wave of world.waves) {
    if (wave.type === 'enemy') continue;
    if (Number.isFinite(wave.x) && Number.isFinite(wave.y) &&
        !inView(wave.x, wave.y, wave.radius + 1)) continue;
    const elapsed = waveAge(wave, now) * wave.speed;
    const opacity = waveOpacity(wave, now);
    if (opacity <= 0) continue;
    const hostile = hostileWaves.has(wave.type);
    const style = waveStyles[wave.type];
    const shape = style?.shape || 'smooth';
    const rgb = style?.rgb || (hostile ? '226,75,77' :
      ['unlock', 'exitUnlock', 'sequenceCue', 'sequenceDone', 'sequenceReset'].includes(wave.type) ? '230,188,96' :
      wave.type === 'bat' ? '240,105,145' :
          ['lure', 'beacon', 'decoy', 'laser', 'relay'].includes(wave.type) ? '143,230,223' : '210,240,237');
    ctx.lineWidth = wave.tone === 'high' ? 1.3 : 1.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash?.(shape === 'broken' ? [2.5, 3.5] : []);
    ctx.strokeStyle = `rgba(${rgb},${((hostile ? 0.58 : wave.type === 'unlock' ? 0.35 : 0.8) * opacity * (wave.intensity ?? 1)).toFixed(2)})`;
    ctx.shadowColor = `rgba(${rgb},${(0.6 * opacity * (wave.intensity ?? 1)).toFixed(2)})`;
    ctx.shadowBlur = hostile ? 5 : 7;
    const pitSegments = world.level.pits?.size ? Array.from({ length: 8 }, () => []) : null;
    const fronts = shape === 'double' && elapsed > 0.18 ? [elapsed, elapsed - 0.18] : [elapsed];
    for (const front of fronts) for (const line of contourLines(wave.field, front, {
      left: Number.isFinite(wave.x) ? Math.max(camera.x, wave.x - front) : camera.x,
      right: Number.isFinite(wave.x) ? Math.min(camera.x + l.width / l.size, wave.x + front) : camera.x + l.width / l.size,
      top: Number.isFinite(wave.y) ? Math.max(camera.y, wave.y - front) : camera.y,
      bottom: Number.isFinite(wave.y) ? Math.min(camera.y + l.height / l.size, wave.y + front) : camera.y + l.height / l.size,
    })) {
      if (line.length < 2) continue;
      const toScreen = point => {
        if (shape !== 'rough') return [px(point[0]), py(point[1])];
        const angle = Math.atan2(point[1] - wave.y, point[0] - wave.x);
        const offset = 0.045 * Math.sin(angle * 19 - (wave.age == null ? now : wave.start + wave.age) * 7);
        return [px(point[0] + Math.cos(angle) * offset),
          py(point[1] + Math.sin(angle) * offset)];
      };
      if (pitSegments) {
        for (let i = 1; i < line.length; i += 1) {
          const from = line[i - 1];
          const to = line[i];
          const localOpacity = waveOpacityAt(wave, now, world.level,
            (from[0] + to[0]) / 2, (from[1] + to[1]) / 2);
          if (localOpacity < 0.02) continue;
          const bucket = Math.min(pitSegments.length - 1,
            Math.floor(localOpacity / opacity * pitSegments.length));
          pitSegments[bucket].push(from[0], from[1], to[0], to[1]);
        }
        continue;
      }
      const closed = line.length > 3 && Math.hypot(
        line[0][0] - line[line.length - 1][0],
        line[0][1] - line[line.length - 1][1],
      ) < 0.001;
      ctx.beginPath();
      if (closed) {
        if (shape === 'rough') {
          ctx.moveTo(...toScreen(line[0]));
          for (let i = 1; i < line.length; i += 1) ctx.lineTo(...toScreen(line[i]));
        } else {
          const last = toScreen(line[line.length - 2]);
          const first = toScreen(line[0]);
          ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
          for (let i = 0; i < line.length - 1; i += 1) {
            const point = toScreen(line[i]);
            const next = toScreen(line[i + 1]);
            ctx.quadraticCurveTo(point[0], point[1], (point[0] + next[0]) / 2, (point[1] + next[1]) / 2);
          }
        }
        ctx.closePath();
      } else {
        const first = toScreen(line[0]);
        ctx.moveTo(first[0], first[1]);
        for (let i = 1; i < line.length - 1; i += 1) {
          const point = toScreen(line[i]);
          const next = toScreen(line[i + 1]);
          if (shape === 'rough') ctx.lineTo(point[0], point[1]);
          else ctx.quadraticCurveTo(point[0], point[1],
            (point[0] + next[0]) / 2, (point[1] + next[1]) / 2);
        }
        const last = toScreen(line[line.length - 1]);
        ctx.lineTo(last[0], last[1]);
      }
      ctx.globalAlpha = front === elapsed ? 1 : 0.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (pitSegments) {
      for (let bucket = 0; bucket < pitSegments.length; bucket += 1) {
        const segments = pitSegments[bucket];
        if (!segments.length) continue;
        const fade = bucket === pitSegments.length - 1 ? 1 :
          (bucket + 0.5) / pitSegments.length;
        const alpha = opacity * fade * (wave.intensity ?? 1);
        ctx.strokeStyle = `rgba(${rgb},${((hostile ? 0.58 : 0.8) * alpha).toFixed(2)})`;
        ctx.shadowColor = `rgba(${rgb},${(0.6 * alpha).toFixed(2)})`;
        ctx.lineWidth = (wave.tone === 'high' ? 1.3 : 1.7) * Math.max(0.25, fade);
        ctx.beginPath();
        for (let i = 0; i < segments.length; i += 4) {
          ctx.moveTo(px(segments[i]), py(segments[i + 1]));
          ctx.lineTo(px(segments[i + 2]), py(segments[i + 3]));
        }
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
    ctx.setLineDash?.([]);
  }

  if (perception) {
    ctx.save(); ctx.shadowBlur = 0; ctx.lineCap = 'round';
    // One small wave fan per passage direction. Same-direction threats share
    // a cue, so extra enemies do not stack bright markers or draw submissions.
    const directions = new Map();
    for (const clue of perception.clues) {
      const key = `${clue.dx},${clue.dy}`, previous = directions.get(key);
      if (!previous || clue.urgent && !previous.urgent ||
          clue.urgent === previous.urgent && clue.opacity > previous.opacity) directions.set(key, clue);
    }
    for (const clue of directions.values()) {
      const angle = Math.atan2(clue.dy, clue.dx);
      ctx.strokeStyle = clue.urgent ? '#eab199' : '#a98a8d';
      ctx.lineWidth = clue.urgent ? 1.5 : 1.1;
      for (let band = 0; band < 3; band++) {
        const phase = (now * 1.15 + band / 3) % 1;
        const radius = Math.max(13, l.size * .72) + (clue.response ? 1 - phase : phase) * Math.max(9, l.size * .45);
        ctx.globalAlpha = clue.opacity * Math.sin(phase * Math.PI) * .85;
        ctx.beginPath();
        for (let step = 0; step <= 16; step++) {
          const u = step / 16, theta = angle + (u - .5) * 1.05;
          const ripple = Math.sin(u * Math.PI * 6 - now * 9) * Math.sin(u * Math.PI) * 1.3;
          const x = px(world.player.x) + Math.cos(theta) * (radius + ripple);
          const y = py(world.player.y) + Math.sin(theta) * (radius + ripple);
          if (step) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  const whiteWaves = world.waves.filter(wave => !hostileWaves.has(wave.type));
  const redWaves = world.waves.filter(wave => wave.type !== 'enemy' && hostileWaves.has(wave.type));
  const wallShades = 12;
  const wallSegments = Array.from({ length: wallShades * 4 }, () => []);
  const samples = wallSamples(geometry);
  for (let faceIndex = 0; faceIndex < geometry.faces.length; faceIndex++) {
    const face = geometry.faces[faceIndex];
    if (!inView((face.x1 + face.x2) / 2, (face.y1 + face.y2) / 2)) continue;
    for (let segment = 0; segment < 4; segment += 1) {
      const start = segment / 4;
      const end = (segment + 1) / 4;
      const middle = (start + end) / 2;
      const sampleIndex = faceIndex * 4 + segment, offset = sampleIndex * 6;
      const x = samples ? samples[offset] : face.x1 + (face.x2 - face.x1) * middle + face.nx * 0.03;
      const y = samples ? samples[offset + 1] : face.y1 + (face.y2 - face.y1) * middle + face.ny * 0.03;
      const white = fullReveal ? 0.7 : visibilityAt(whiteWaves, x, y, now, samples, sampleIndex);
      const enemyLight = enemyWallLightAt(enemyLights, geometry, x, y);
      const enemyTint = enemyLight >= 0.03;
      const red = Math.max(visibilityAt(redWaves, x, y, now, samples, sampleIndex), enemyLight);
      if (Math.max(white, red) < 0.03) continue;
      const isRed = enemyTint || red > white;
      const shade = Math.min(wallShades - 1,
        Math.floor((isRed ? red : white) * wallShades));
      const palette = enemyTint ? 1 : face.mechanismWall ? (isRed ? 3 : 2) : (isRed ? 1 : 0);
      wallSegments[palette * wallShades + shade].push(
        samples ? samples[offset + 2] : face.x1 + (face.x2 - face.x1) * start,
        samples ? samples[offset + 3] : face.y1 + (face.y2 - face.y1) * start,
        samples ? samples[offset + 4] : face.x1 + (face.x2 - face.x1) * end,
        samples ? samples[offset + 5] : face.y1 + (face.y2 - face.y1) * end,
      );
    }
  }
  ctx.shadowBlur = 4;
  ctx.lineWidth = 1.5;
  for (let index = 0; index < wallSegments.length; index += 1) {
    const segments = wallSegments[index];
    if (!segments.length) continue;
    const palette = Math.floor(index / wallShades);
    const shade = index % wallShades;
    const brightness = shade === wallShades - 1 ? 1 : (shade + 0.5) / wallShades;
    ctx.strokeStyle = `rgba(${wallColors[palette]},${(brightness *
      (palette === 2 ? 0.9 : palette === 0 ? 0.82 : 0.72)).toFixed(2)})`;
    ctx.shadowColor = wallGlowColors[palette];
    ctx.beginPath();
    for (let i = 0; i < segments.length; i += 4) {
      ctx.moveTo(px(segments[i]), py(segments[i + 1]));
      ctx.lineTo(px(segments[i + 2]), py(segments[i + 3]));
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.strokeStyle = '#a1d7c5';
  ctx.lineWidth = 1.5;
  ctx.setLineDash?.([l.size * 0.25, l.size * 0.17]);
  for (const face of geometry.fenceFaces) {
    const x = (face.x1 + face.x2) / 2;
    const y = (face.y1 + face.y2) / 2;
    if (!inView(x, y)) continue;
    const light = fullReveal ? 0.85 : visibilityAt(world.waves,
      x + face.nx * 0.03, y + face.ny * 0.03, now);
    if (light < 0.03) continue;
    ctx.globalAlpha = light;
    ctx.beginPath();
    ctx.moveTo(px(face.x1), py(face.y1));
    ctx.lineTo(px(face.x2), py(face.y2));
    ctx.stroke();
  }
  ctx.restore();

  if (fullReveal) {
    for (const [items, color] of [
      [world.mines, '#e15655'], [world.alarms, '#ee704b'],
      [world.spikes, '#ee704b'], [world.launchers, '#e15655'],
      [world.gates, '#e4ad4f'],
      [world.beacons, '#8fe6df'], [world.decoys, '#8fe6df'],
      [world.relays, '#8fe6df'], [world.lasers, '#8fe6df'],
    ]) {
      ctx.fillStyle = color;
      for (const item of items || []) {
        if (!inView(item.x, item.y)) continue;
        ctx.beginPath();
        ctx.arc(px(item.x), py(item.y), l.size * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const drawHatchedFloor = (item, rgb, reverse = false) => {
    if (!inView(item.x, item.y)) return;
    const light = fullReveal ? 1 : visibilityAt(world.waves, item.x, item.y, now);
    if (light < 0.03) return;
    const left = Math.floor(item.x) + 0.11;
    const top = Math.floor(item.y) + 0.11;
    const side = 0.78;
    ctx.strokeStyle = `rgba(${rgb},${(light * 0.78).toFixed(2)})`;
    ctx.lineWidth = reverse ? 1.4 : 1;
    ctx.beginPath();
    for (let i = 1; i <= (reverse ? 5 : 7); i += 1) {
      const diagonal = i * side / (reverse ? 3 : 4);
      const startX = Math.max(0, diagonal - side);
      const endX = Math.min(side, diagonal);
      const startY = diagonal - startX;
      const endY = diagonal - endX;
      ctx.moveTo(px(left + startX), py(top + (reverse ? side - startY : startY)));
      ctx.lineTo(px(left + endX), py(top + (reverse ? side - endY : endY)));
    }
    ctx.stroke();
    return light;
  };
  for (const item of world.silentFloors || []) drawHatchedFloor(item, '185,196,195');
  for (const item of world.fragileFloors || []) {
    const light = drawHatchedFloor(item, '145,58,58');
    if (ui.mode !== 'campaign' || item.phase !== 'warning' || !light) continue;
    const x = Math.floor(item.x), y = Math.floor(item.y);
    ctx.strokeStyle = `rgba(242,152,117,${(light * 0.88).toFixed(2)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(px(x + 0.19), py(y + 0.22));
    ctx.lineTo(px(x + 0.43), py(y + 0.46));
    ctx.lineTo(px(x + 0.56), py(y + 0.40));
    ctx.lineTo(px(x + 0.80), py(y + 0.77));
    ctx.moveTo(px(x + 0.43), py(y + 0.46));
    ctx.lineTo(px(x + 0.32), py(y + 0.75));
    ctx.stroke();
  }
  for (const item of world.noisyFloors || []) drawHatchedFloor(item, '118,38,48', true);

  const drawRevealedRing = (x, y, rgb, label, symbol) => {
    if (!inView(x, y)) return;
    const light = fullReveal ? 1 : visibilityAt(world.waves, x, y, now);
    if (light < 0.03) return;
    ctx.strokeStyle = `rgba(${rgb},${(light * 0.9).toFixed(2)})`;
    ctx.lineWidth = 1.5;
    for (const radius of symbol ? [0.42, 0.58] : [0.29, 0.42]) {
      ctx.beginPath();
      ctx.arc(px(x), py(y), l.size * radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (symbol) drawAcousticSymbol(ctx, symbol, px(x), py(y), l.size);
    if (label) {
      ctx.fillStyle = `rgba(${rgb},${light.toFixed(2)})`;
      ctx.font = '600 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, px(x), py(y));
    }
  };
  if (world.level.mechanism) drawRevealedRing(...world.level.mechanism,
    world.mechanismActive ? '167,240,202' : '230,188,96', null, 'soundLock');
  if (world.level.exit) drawRevealedRing(...world.level.exit,
    world.unlocked ? '167,240,202' : '230,188,96', null,
    world.unlocked ? null : 'lockedExit');
  if (world.sequence && !world.sequence.complete) (world.sequence.nodes || []).forEach((node, index) =>
    drawRevealedRing(node.x, node.y,
      index === 0 && world.sequence.progress > 0 ? '167,240,202' : '230,188,96',
      String(index + 1)));
  for (const laser of world.lasers || []) {
    drawRevealedRing(laser.x, laser.y, '112,215,222');
  }

  for (const beam of world.laserBeams || []) {
    const alpha = Math.min(1, Math.max(0, (beam.until - effectTime(beam, now)) / 0.4));
    ctx.strokeStyle = `rgba(143,230,223,${(alpha * 0.8).toFixed(2)})`;
    ctx.shadowColor = '#8fe6df';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.3;
    for (const segment of beam.segments) {
      if (!inView((segment.fromX + segment.toX) / 2,
        (segment.fromY + segment.toY) / 2, Math.hypot(segment.toX - segment.fromX,
          segment.toY - segment.fromY) / 2)) continue;
      ctx.beginPath();
      ctx.moveTo(px(segment.fromX), py(segment.fromY));
      ctx.lineTo(px(segment.toX), py(segment.toY));
      ctx.stroke();
    }
  }
  for (const glow of world.wallGlows || []) {
    if (!inView((glow.x1 + glow.x2) / 2, (glow.y1 + glow.y2) / 2)) continue;
    const alpha = Math.min(1, Math.max(0, glow.until - effectTime(glow, now)));
    ctx.strokeStyle = `rgba(143,230,223,${(alpha * 0.86).toFixed(2)})`;
    ctx.shadowColor = '#8fe6df';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(px(glow.x1), py(glow.y1));
    ctx.lineTo(px(glow.x2), py(glow.y2));
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.beginPath(); ctx.rect(l.left, l.top, l.width, l.height); ctx.clip();
  for (const lure of world.lures || []) {
    const arrivalTime = lure.duration ?? lure.distance / lure.speed;
    const elapsed = Math.max(0, waveAge(lure, now));
    if (elapsed >= (lure.trailUntil == null ? arrivalTime + 0.45 : lure.trailUntil - lure.start)) continue;
    const traveled = lure.duration == null ? Math.min(lure.distance, elapsed * lure.speed) :
      elapsed >= lure.duration ? lure.distance : lure.segments.reduce((covered, segment) => {
        if (elapsed >= segment.endTime) return segment.startDistance + segment.distance;
        if (elapsed <= segment.startTime) return covered;
        const t = elapsed - segment.startTime;
        return segment.startDistance + Math.min(segment.distance,
          segment.startSpeed * t - segment.deceleration * t * t / 2);
      }, 0);
    const tail = Math.max(0, traveled - 2.4);
    const segments = lure.segments || [{ fromX: lure.fromX, fromY: lure.fromY,
      toX: lure.toX, toY: lure.toY, startDistance: 0, distance: lure.distance }];
    const pointAt = distance => {
      const segment = segments.find(part => distance <= part.startDistance + part.distance) || segments[segments.length - 1];
      const progress = segment.distance ? Math.max(0, Math.min(1, (distance - segment.startDistance) / segment.distance)) : 1;
      return [px(segment.fromX + (segment.toX - segment.fromX) * progress),
        py(segment.fromY + (segment.toY - segment.fromY) * progress)];
    };
    for (const segment of segments) {
      const visibleStart = Math.max(tail, segment.startDistance);
      const visibleEnd = Math.min(traveled, segment.startDistance + segment.distance);
      for (let part = 0; part < 4; part += 1) {
        const from = visibleStart + (visibleEnd - visibleStart) * part / 4;
        const to = visibleStart + (visibleEnd - visibleStart) * (part + 1) / 4;
        if (to - from < 0.01) continue;
        const start = pointAt(from);
        const end = pointAt(to);
        const brightness = traveled > tail ? (to - tail) / (traveled - tail) : 1;
        ctx.strokeStyle = `rgba(132,211,227,${(0.12 + brightness * 0.42).toFixed(2)})`;
        ctx.lineWidth = 1.2 + brightness * 0.6;
        ctx.beginPath(); ctx.moveTo(...start); ctx.lineTo(...end); ctx.stroke();
      }
    }
    if (!lure.arrived && elapsed < arrivalTime) {
      const head = pointAt(traveled);
      ctx.fillStyle = 'rgba(177,237,244,0.85)';
      ctx.shadowColor = '#84d3e3'; ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.arc(...head, l.size * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  ctx.restore();

  for (const stone of world.stones || []) {
    if (!inView(stone.x, stone.y)) continue;
    const light = fullReveal ? 1 : visibilityAt(world.waves, stone.x, stone.y, now);
    if (light <= 0) continue;
    ctx.save();
    ctx.globalAlpha = light;
    ctx.strokeStyle = '#e8d49b';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#e8d49b';
    ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.arc(px(stone.x), py(stone.y), l.size * 0.12, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  drawMimicEffects(ctx, ui.mimicFrames || [], l);

  const playerX = px(world.player.x);
  const playerY = py(world.player.y);
  ctx.save();
  if (ui.hidePlayer) ctx.globalAlpha = 0;
  ctx.shadowColor = '#d4ffff';
  ctx.shadowBlur = 19;
  ctx.fillStyle = '#ebffff';
  ctx.beginPath(); ctx.arc(playerX, playerY, l.size * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  if (Number.isFinite(ui.probeCharge) && !ui.hidePlayer) {
    const charge = Math.max(0, Math.min(1, ui.probeCharge));
    ctx.save();
    ctx.shadowBlur = 0; ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(201,241,230,0.18)';
    ctx.beginPath(); ctx.arc(playerX, playerY, l.size * .75, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#c9f1e6';
    ctx.beginPath(); ctx.arc(playerX, playerY, l.size * .75, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge); ctx.stroke();
    ctx.restore();
  }

  if (ui.touch && ui.touch.action === 1 && world.stonesHeld !== 0) {
    let dx = ui.touch.x - ui.touch.startX;
    let dy = ui.touch.y - ui.touch.startY;
    const magnitude = Math.hypot(dx, dy);
    if (magnitude < 8) { dx = 0; dy = -1; }
    else { dx /= magnitude; dy /= magnitude; }
    ctx.save();
    ctx.beginPath(); ctx.rect(l.left, l.top, l.width, l.height); ctx.clip();
    const startX = playerX + dx * l.size * 0.38;
    const startY = playerY + dy * l.size * 0.38;
    const tipX = playerX + dx * l.size * 2.6;
    const tipY = playerY + dy * l.size * 2.6;
    ctx.strokeStyle = 'rgba(132,211,227,0.10)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(132,211,227,0.36)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(132,211,227,0.48)';
    ctx.lineWidth = 1.25;
    const wing = l.size * 0.28;
    const backX = tipX - dx * wing;
    const backY = tipY - dy * wing;
    ctx.beginPath();
    ctx.moveTo(backX - dy * wing * 0.45, backY + dx * wing * 0.45);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(backX + dy * wing * 0.45, backY - dx * wing * 0.45);
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + dx * wing * 0.25, tipY + dy * wing * 0.25);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

module.exports = { drawScene, cameraFor };
