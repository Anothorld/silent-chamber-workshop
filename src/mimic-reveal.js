const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const u = clamp(value); return u * u * (3 - 2 * u); };
const REVEAL_DISTANCE = 5, FULL_REVEAL_DISTANCE = 2;
let seed = 0x846ca68b;
const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
// Overlapping, skewed clouds have soft tails beyond the viewport. A bounded
// uniform rectangle would retain its four straight sides while shrinking.
const clouds = [
  { x: .12, y: .20, sx: .17, sy: .10 }, { x: .73, y: .12, sx: .12, sy: .17 },
  { x: .46, y: .53, sx: .13, sy: .18 }, { x: .85, y: .81, sx: .17, sy: .11 },
  { x: .13, y: .85, sx: .12, sy: .15 }
];
// Stable seeds avoid flicker and let the same motes travel from the screen to the body.
const particles = Object.freeze(Array.from({ length: 1200 }, () => {
  const cloud = clouds[Math.floor(random() * clouds.length)];
  const tail = Math.sqrt(-2 * Math.log(Math.max(1e-6, random()))), direction = random() * Math.PI * 2;
  const gx = Math.cos(direction) * tail, gy = Math.sin(direction) * tail;
  const x = cloud.x + gx * cloud.sx + gy * .06, y = cloud.y + gy * cloud.sy + Math.sin(gx * 2) * .06;
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(random()) * (.28 + .12 * Math.sin(angle * 3 + .4) + .09 * Math.cos(angle * 5));
  return Object.freeze({ x, y, dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius,
    delay: random() * .20, size: .5 + random() * .8, alpha: .2 + random() * .55, phase: random() * Math.PI * 2 });
}));

function createBrownianMotion(seed = 0xb5297a4d) {
  const offsets = particles.map(() => ({ x: 0, y: 0 }));
  let randomState = seed, accumulator = 0;
  const noise = () => {
    randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5;
    return (randomState >>> 0) / 2147483648 - 1;
  };
  // Mean-reverting random walks keep each mote wandering around its anchor.
  // Fixed steps give the same path at different display refresh rates.
  const impulse = () => (noise() + noise() + noise()) * .16;
  return { offsets, advance(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    accumulator += Math.min(.1, seconds);
    while (accumulator + 1e-9 >= 1 / 60) {
      for (const p of offsets) {
        p.x = Math.max(-1.5, Math.min(1.5, p.x * .96 + impulse()));
        p.y = Math.max(-1.5, Math.min(1.5, p.y * .96 + impulse()));
      }
      accumulator = Math.max(0, accumulator - 1 / 60);
    }
  } };
}

function particleFrame({ distance, width, height, cell, enemyX, enemyY, time, motion }) {
  if (distance >= REVEAL_DISTANCE || !Number.isFinite(distance)) return { points: [], opacity: 0, progress: 0 };
  const progress = clamp((REVEAL_DISTANCE - distance) / (REVEAL_DISTANCE - FULL_REVEAL_DISTANCE)), opacity = smooth(progress / .32);
  const jitterRadius = cell * (.012 + .24 * progress ** 1.4);
  const points = particles.map((p, i) => {
    const gather = smooth((progress + .04 - p.delay) / (1.04 - p.delay));
    const drift = Math.sin(time * .8 + p.phase) * 1.5;
    const x = p.x * width + drift;
    const y = p.y * height + Math.cos(time * .6 + p.phase) * 1.5;
    // Add movement after gathering so the fully formed cluster never freezes.
    const px = x + (enemyX + p.dx * cell - x) * gather + (motion?.[i]?.x ?? 0) * jitterRadius;
    const py = y + (enemyY + p.dy * cell - y) * gather + (motion?.[i]?.y ?? 0) * jitterRadius;
    // Fade before clipping, so offscreen tails cannot pile up on a border.
    const edge = smooth(Math.min(px, width - px, py, height - py) / (Math.min(width, height) * .035));
    return { x: Math.max(0, Math.min(width, px)), y: Math.max(0, Math.min(height, py)),
      size: p.size * (1 - gather * .35), alpha: p.alpha * opacity * edge };
  });
  return { points, opacity, progress };
}
module.exports = { particleFrame, createBrownianMotion, REVEAL_DISTANCE, FULL_REVEAL_DISTANCE };
