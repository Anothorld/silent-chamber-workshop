const { blocked, soundBlockedPoint, getGeometry } = require('./geometry');

const SAMPLE_SIZE = 0.25;

function propagate(map, sx, sy, tone, maxDistance, visualRadius = maxDistance) {
  const geometry = getGeometry(map);
  // Every path to a corner is at least its straight-line source distance.
  // Keep source order so equal-cost paths match the global graph exactly.
  const corners = geometry.corners.filter(corner =>
    Math.hypot(corner.x - sx, corner.y - sy) < maxDistance);
  const penalty = tone === 'high' ? 0.8 : 0.08;
  const distances = corners.map(corner => geometry.visible(sx, sy, corner.x, corner.y)
    ? Math.hypot(corner.x - sx, corner.y - sy) + penalty : Infinity);
  const settled = new Uint8Array(corners.length);
  for (let step = 0; step < corners.length; step += 1) {
    let best = -1;
    for (let i = 0; i < distances.length; i += 1) {
      if (!settled[i] && (best === -1 || distances[i] < distances[best])) best = i;
    }
    if (best === -1 || distances[best] >= maxDistance) break;
    settled[best] = 1;
    const from = corners[best];
    for (let next = 0; next < corners.length; next += 1) {
      if (next === best) continue;
      const to = corners[next];
      const remaining = Math.min(distances[next], maxDistance) - distances[best] - penalty;
      if (remaining <= 0) continue;
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      if (dx * dx + dy * dy >= remaining * remaining) continue;
      const cost = distances[best] + Math.hypot(dx, dy) + penalty;
      if (geometry.visible(from.x, from.y, to.x, to.y)) distances[next] = cost;
    }
  }

  function calculateAt(x, y) {
    if (soundBlockedPoint(map, x, y)) return Infinity;
    const direct = Math.hypot(x - sx, y - sy);
    if (direct > maxDistance) return Infinity;
    if (geometry.visible(sx, sy, x, y)) return direct;
    let nearest = Infinity;
    for (let i = 0; i < corners.length; i += 1) {
      const cost = distances[i];
      if (cost >= maxDistance || cost >= nearest) continue;
      const corner = corners[i];
      const remaining = Math.hypot(x - corner.x, y - corner.y);
      if (cost + remaining >= nearest || cost + remaining > maxDistance) continue;
      if (geometry.visible(corner.x, corner.y, x, y)) nearest = cost + remaining;
    }
    return nearest;
  }

  const queried = new Map();
  function at(x, y) {
    const key = `${x},${y}`;
    if (queried.has(key)) return queried.get(key);
    const distance = calculateAt(x, y);
    queried.set(key, distance);
    return distance;
  }

  let sampled;
  return {
    at,
    get visual() {
      if (sampled) return sampled;
      const width = Math.ceil(map.width / SAMPLE_SIZE);
      const height = Math.ceil(map.height / SAMPLE_SIZE);
      const reach = Math.min(maxDistance, visualRadius + SAMPLE_SIZE * 2);
      const minX = Math.max(0, Math.floor((sx - reach) / SAMPLE_SIZE) - 1);
      const maxX = Math.min(width - 1, Math.ceil((sx + reach) / SAMPLE_SIZE));
      const minY = Math.max(0, Math.floor((sy - reach) / SAMPLE_SIZE) - 1);
      const maxY = Math.min(height - 1, Math.ceil((sy + reach) / SAMPLE_SIZE));
      const stride = Math.max(0, maxX - minX + 1);
      const times = new Float32Array(stride * Math.max(0, maxY - minY + 1));
      const computed = new Uint8Array(times.length);
      sampled = {
        width, height, cellSize: SAMPLE_SIZE,
        bounds: { minX, maxX, minY, maxY },
        at(x, y) {
          if (x < minX || x > maxX || y < minY || y > maxY) return Infinity;
          const index = (y - minY) * stride + x - minX;
          if (!computed[index]) {
            const px = (x + 0.5) * SAMPLE_SIZE;
            const py = (y + 0.5) * SAMPLE_SIZE;
            times[index] = (px - sx) ** 2 + (py - sy) ** 2 > reach ** 2
              ? Infinity : calculateAt(px, py);
            computed[index] = 1;
          }
          return times[index];
        },
      };
      return sampled;
    },
  };
}

function directionalField(map, sx, sy, angle, halfAngle, maxDistance) {
  const geometry = getGeometry(map);
  function at(x, y) {
    const dx = x - sx;
    const dy = y - sy;
    const distance = Math.hypot(dx, dy);
    const difference = Math.atan2(Math.sin(Math.atan2(dy, dx) - angle),
      Math.cos(Math.atan2(dy, dx) - angle));
    if (distance > maxDistance || Math.abs(difference) > halfAngle ||
        !geometry.visible(sx, sy, x, y)) return Infinity;
    return distance;
  }
  let sampled;
  return {
    at,
    get visual() {
      if (sampled) return sampled;
      const width = Math.ceil(map.width / SAMPLE_SIZE);
      const height = Math.ceil(map.height / SAMPLE_SIZE);
      const minX = Math.max(0, Math.floor((sx - maxDistance) / SAMPLE_SIZE) - 1);
      const maxX = Math.min(width - 1, Math.ceil((sx + maxDistance) / SAMPLE_SIZE));
      const minY = Math.max(0, Math.floor((sy - maxDistance) / SAMPLE_SIZE) - 1);
      const maxY = Math.min(height - 1, Math.ceil((sy + maxDistance) / SAMPLE_SIZE));
      const stride = Math.max(0, maxX - minX + 1);
      const times = new Float32Array(stride * Math.max(0, maxY - minY + 1));
      times.fill(Infinity);
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          times[(y - minY) * stride + x - minX] = at((x + 0.5) * SAMPLE_SIZE,
            (y + 0.5) * SAMPLE_SIZE);
        }
      }
      sampled = { width, height, cellSize: SAMPLE_SIZE,
        bounds: { minX, maxX, minY, maxY },
        at(x, y) { return x < minX || x > maxX || y < minY || y > maxY
          ? Infinity : times[(y - minY) * stride + x - minX]; } };
      return sampled;
    },
  };
}

function traceImpact(map, x, y, dx, dy, maxDistance = 22) {
  const geometry = getGeometry(map);
  const magnitude = Math.hypot(dx, dy) || 1;
  const vx = dx / magnitude;
  const vy = dy / magnitude;
  let distance = maxDistance;
  let normalX = 0;
  let normalY = 0;
  let hit = false;
  for (const rect of [...geometry.rectangles, ...geometry.fenceRectangles]) {
    let entry = -Infinity;
    let exit = Infinity;
    let entryX = -Infinity;
    let entryY = -Infinity;
    for (const [axis, [origin, velocity, low, high]] of [
      [x, vx, rect.left, rect.right], [y, vy, rect.top, rect.bottom],
    ].entries()) {
      if (Math.abs(velocity) < 1e-10) {
        if (origin < low || origin > high) { entry = Infinity; break; }
        continue;
      }
      const a = (low - origin) / velocity;
      const b = (high - origin) / velocity;
      const axisEntry = Math.min(a, b);
      if (axis === 0) entryX = axisEntry;
      else entryY = axisEntry;
      entry = Math.max(entry, axisEntry);
      exit = Math.min(exit, Math.max(a, b));
    }
    if (entry >= 0 && entry <= exit && entry < distance) {
      distance = entry;
      hit = true;
      normalX = entryX >= entryY - 1e-8 ? -Math.sign(vx) : 0;
      normalY = entryY >= entryX - 1e-8 ? -Math.sign(vy) : 0;
    }
  }
  for (const [time, nx, ny] of [
    vx > 0 ? [(map.width - x) / vx, -1, 0] : vx < 0 ? [-x / vx, 1, 0] : [Infinity, 0, 0],
    vy > 0 ? [(map.height - y) / vy, 0, -1] : vy < 0 ? [-y / vy, 0, 1] : [Infinity, 0, 0],
  ]) {
    if (time >= 0 && time < distance) {
      distance = time;
      hit = true;
      normalX = nx;
      normalY = ny;
    }
  }
  const traveled = Math.max(0, distance - (hit ? 0.001 : 0));
  return { x: x + vx * traveled, y: y + vy * traveled,
    distance: traveled, hit, normalX, normalY };
}

function traceRicochet(map, x, y, dx, dy, maxDistance = 22) {
  const initialSpeed = 18;
  const stopSpeed = 2;
  const deceleration = (initialSpeed ** 2 - stopSpeed ** 2) / (2 * maxDistance);
  const restitution = 0.72;
  const magnitude = Math.hypot(dx, dy) || 1;
  let vx = dx / magnitude;
  let vy = dy / magnitude;
  let speed = initialSpeed;
  let distance = 0;
  let duration = 0;
  const segments = [];
  for (let bounce = 0; bounce < 32 && speed > stopSpeed; bounce += 1) {
    const stoppingDistance = (speed ** 2 - stopSpeed ** 2) / (2 * deceleration);
    const impact = traceImpact(map, x, y, vx, vy, stoppingDistance);
    const endSpeed = impact.hit
      ? Math.sqrt(Math.max(stopSpeed ** 2, speed ** 2 - 2 * deceleration * impact.distance))
      : stopSpeed;
    const endTime = duration + (speed - endSpeed) / deceleration;
    segments.push({ fromX: x, fromY: y, toX: impact.x, toY: impact.y,
      startDistance: distance, distance: impact.distance, startTime: duration, endTime,
      startSpeed: speed, endSpeed, deceleration, hit: impact.hit,
      intensity: endSpeed / initialSpeed });
    distance += impact.distance;
    duration = endTime;
    x = impact.x;
    y = impact.y;
    if (!impact.hit) break;
    speed = endSpeed * restitution;
    if (impact.normalX) vx = -vx;
    if (impact.normalY) vy = -vy;
  }
  return { x, y, distance, duration, segments, hit: segments.some(segment => segment.hit) };
}

module.exports = { blocked, propagate, directionalField, traceImpact, traceRicochet, getGeometry };
