const geometryCache = new WeakMap();
const EPSILON = 0.001;

function blocked(map, x, y) {
  return x < 0 || y < 0 || x >= map.width || y >= map.height ||
    map.walls.has(`${x},${y}`) || !!map.fences?.has(`${x},${y}`);
}

function blockedPoint(map, x, y) {
  return blocked(map, Math.floor(x), Math.floor(y));
}

function soundBlockedPoint(map, x, y) {
  const cellX = Math.floor(x), cellY = Math.floor(y);
  return x < 0 || y < 0 || x >= map.width || y >= map.height ||
    map.walls.has(`${cellX},${cellY}`) || !!map.pits?.has(`${cellX},${cellY}`);
}

function cellRectangles(map, cells) {
  const rectangles = [];
  let active = new Map();
  for (let y = 0; y < map.height; y += 1) {
    const next = new Map();
    for (let x = 0; x < map.width;) {
      if (!cells.has(`${x},${y}`)) { x += 1; continue; }
      const left = x;
      while (x < map.width && cells.has(`${x},${y}`)) x += 1;
      const key = `${left},${x}`;
      const rectangle = active.get(key) || { left, right: x, top: y, bottom: y };
      rectangle.bottom = y + 1;
      if (!active.has(key)) rectangles.push(rectangle);
      next.set(key, rectangle);
    }
    active = next;
  }
  return rectangles;
}

function entersRectangle(ax, ay, bx, by, rect) {
  let start = 0;
  let end = 1;
  const dx = bx - ax;
  const left = rect.left + EPSILON;
  const right = rect.right - EPSILON;
  if (Math.abs(dx) < 1e-10) {
    if (ax <= left || ax >= right) return false;
  } else {
    const t1 = (left - ax) / dx;
    const t2 = (right - ax) / dx;
    start = Math.max(start, Math.min(t1, t2));
    end = Math.min(end, Math.max(t1, t2));
    if (start >= end) return false;
  }
  const dy = by - ay;
  const top = rect.top + EPSILON;
  const bottom = rect.bottom - EPSILON;
  if (Math.abs(dy) < 1e-10) {
    if (ay <= top || ay >= bottom) return false;
  } else {
    const t1 = (top - ay) / dy;
    const t2 = (bottom - ay) / dy;
    start = Math.max(start, Math.min(t1, t2));
    end = Math.min(end, Math.max(t1, t2));
    if (start >= end) return false;
  }
  return start < 1 && end > 0;
}

function boundaryFaces(map, cells = map.walls) {
  const faces = [];
  for (const key of cells) {
    const [x, y] = key.split(',').map(Number);
    const mechanismWall = !!map.mechanismWalls?.has(key);
    if (!blocked(map, x, y - 1)) faces.push({ x1: x, y1: y, x2: x + 1, y2: y, nx: 0, ny: -1, mechanismWall });
    if (!blocked(map, x + 1, y)) faces.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1, nx: 1, ny: 0, mechanismWall });
    if (!blocked(map, x, y + 1)) faces.push({ x1: x + 1, y1: y + 1, x2: x, y2: y + 1, nx: 0, ny: 1, mechanismWall });
    if (!blocked(map, x - 1, y)) faces.push({ x1: x, y1: y + 1, x2: x, y2: y, nx: -1, ny: 0, mechanismWall });
  }
  return faces;
}

function getGeometry(map) {
  if (geometryCache.has(map)) return geometryCache.get(map);
  const rectangles = cellRectangles(map, map.walls);
  const fenceRectangles = cellRectangles(map, map.fences || new Set());
  const pitRectangles = cellRectangles(map, map.pits || new Set());
  const obstacles = [...rectangles, ...pitRectangles];
  // One byte per map cell replaces string construction in dust's hot ray loop.
  // This follows the same immutable terrain identity as the rectangle index.
  const obstacleCells = new Uint8Array(map.width * map.height);
  for (const rect of obstacles) for (let y = rect.top; y < rect.bottom; y++) {
    obstacleCells.fill(1, y * map.width + rect.left, y * map.width + rect.right);
  }
  // Integer cell coordinates, as supplied by grid traversal.
  const obstacleAt = (x, y) => x < 0 || y < 0 || x >= map.width || y >= map.height ||
    obstacleCells[y * map.width + x] === 1;
  const buckets = new Map();
  obstacles.forEach((rect, id) => {
    for (let y = Math.floor(rect.top / 8); y <= Math.floor(rect.bottom / 8); y += 1) {
      for (let x = Math.floor(rect.left / 8); x <= Math.floor(rect.right / 8); x += 1) {
        const key = `${x},${y}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(id);
      }
    }
  });
  const visited = new Uint32Array(obstacles.length);
  let query = 0;
  const obstaclesIn = box => {
    query = (query + 1) >>> 0;
    if (!query) { visited.fill(0); query = 1; }
    const found = [];
    for (let y = Math.floor(box.top / 8); y <= Math.floor(box.bottom / 8); y++) {
      for (let x = Math.floor(box.left / 8); x <= Math.floor(box.right / 8); x++) {
        for (const id of buckets.get(`${x},${y}`) || []) {
          if (visited[id] === query) continue;
          visited[id] = query;
          const rect = obstacles[id];
          if (rect.right > box.left && rect.left < box.right &&
              rect.bottom > box.top && rect.top < box.bottom) found.push(rect);
        }
      }
    }
    return found;
  };
  const visible = (ax, ay, bx, by) => {
    if (soundBlockedPoint(map, ax, ay) || soundBlockedPoint(map, bx, by)) return false;
    const minX = Math.min(ax, bx);
    const maxX = Math.max(ax, bx);
    const minY = Math.min(ay, by);
    const maxY = Math.max(ay, by);
    query = (query + 1) >>> 0;
    if (!query) { visited.fill(0); query = 1; }
    for (let y = Math.floor(minY / 8); y <= Math.floor(maxY / 8); y += 1) {
      for (let x = Math.floor(minX / 8); x <= Math.floor(maxX / 8); x += 1) {
        for (const id of buckets.get(`${x},${y}`) || []) {
          if (visited[id] === query) continue;
          visited[id] = query;
          const rect = obstacles[id];
          if (rect.right - EPSILON > minX && rect.left + EPSILON < maxX &&
              rect.bottom - EPSILON > minY && rect.top + EPSILON < maxY &&
              entersRectangle(ax, ay, bx, by, rect)) return false;
        }
      }
    }
    return true;
  };
  const corners = [];
  for (const rect of obstacles) {
    for (const [x, y, dx, dy] of [
      [rect.left, rect.top, -1, -1], [rect.right, rect.top, 1, -1],
      [rect.right, rect.bottom, 1, 1], [rect.left, rect.bottom, -1, 1],
    ]) {
      const point = { x: x + dx * 0.02, y: y + dy * 0.02 };
      if (!soundBlockedPoint(map, point.x, point.y)) corners.push(point);
    }
  }
  let edges;
  function globalEdges() {
    if (edges) return edges;
    edges = corners.map(() => []);
    for (let i = 0; i < corners.length; i += 1) {
      for (let j = i + 1; j < corners.length; j += 1) {
        const a = corners[i];
        const b = corners[j];
        if (!visible(a.x, a.y, b.x, b.y)) continue;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        edges[i].push([j, distance]);
        edges[j].push([i, distance]);
      }
    }
    return edges;
  }
  const pitDistance = (x, y) => pitRectangles.reduce((nearest, rect) => Math.min(nearest,
    Math.hypot(Math.max(rect.left - x, 0, x - rect.right),
      Math.max(rect.top - y, 0, y - rect.bottom))), Infinity);
  const geometry = { rectangles, fenceRectangles, pitRectangles, pitDistance, corners, obstaclesIn, obstacleAt,
    get edges() { return globalEdges(); }, visible,
    faces: boundaryFaces(map), fenceFaces: boundaryFaces(map, map.fences || new Set()) };
  geometryCache.set(map, geometry);
  return geometry;
}

module.exports = { blocked, blockedPoint, soundBlockedPoint, getGeometry };
