// Immutable visual samples only; current thresholds and output polylines are never cached.
// Row chunks are lazy down to individual cells, preserving clipped first-frame work.
// At most 512 chunks/field and 16384 globally: 12.25 MiB of typed sample storage.
const CELL_CHUNK = 16;
const FIELD_CHUNKS = 512;
const TOTAL_CHUNKS = 16384;
const sampledFields = new WeakMap();
// A ring makes eviction constant-time during repeated field/terrain bursts.
// Restarting a Map iterator for each oldest deletion scans its deleted entries.
const sampledChunks = new Array(TOTAL_CHUNKS);
let nextChunk = 0;
function cellChunk(grid, x, y) {
  let chunks = sampledFields.get(grid);
  if (!chunks) { chunks = new Map(); sampledFields.set(grid, chunks); }
  const start = Math.floor(x / CELL_CHUNK) * CELL_CHUNK;
  const key = y * Math.ceil(grid.width / CELL_CHUNK) + start / CELL_CHUNK;
  let chunk = chunks.get(key);
  if (!chunk) {
    if (chunks.size >= FIELD_CHUNKS) return null;
    chunk = { start, readyCount: 0, min: Infinity, max: -Infinity, values: new Float64Array(CELL_CHUNK * 6), ready: new Uint8Array(CELL_CHUNK) };
    chunks.set(key, chunk);
    const oldest = sampledChunks[nextChunk];
    if (oldest) oldest.chunks.delete(oldest.key);
    sampledChunks[nextChunk] = { chunks, key };
    nextChunk = (nextChunk + 1) % TOTAL_CHUNKS;
  }
  return chunk;
}
function sampleCell(grid, x, y, chunk) {
  const i = chunk ? x - chunk.start : 0, offset = i * 6;
  const values = chunk ? chunk.values : new Float64Array(6);
  if (!chunk || !chunk.ready[i]) {
    values[offset] = grid.at(x, y);
    values[offset + 1] = grid.at(x + 1, y);
    values[offset + 2] = grid.at(x + 1, y + 1);
    values[offset + 3] = grid.at(x, y + 1);
    const a=values[offset], b=values[offset+1], c=values[offset+2], d=values[offset+3];
    values[offset+4] = Math.min(a,b,c,d);
    values[offset+5] = Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && Number.isFinite(d)
      ? Math.max(a,b,c,d) : -Infinity;
    if (chunk) {
      chunk.ready[i] = 1; chunk.readyCount++;
      if (values[offset+5] !== -Infinity) {
        chunk.min = Math.min(chunk.min, values[offset+4]);
        chunk.max = Math.max(chunk.max, values[offset+5]);
      }
    }
  }
  return values;
}

function contourLines(field, threshold, clip) {
  const grid = field.visual || field;
  const size = grid.cellSize || 1;
  const segments = [];
  const bounds = grid.bounds;
  const minX = Math.max(0, (bounds?.minX ?? 0) - 1,
    clip ? Math.floor(clip.left / size - 0.5) - 1 : 0);
  const maxX = Math.min(grid.width - 2, bounds?.maxX ?? grid.width - 2,
    clip ? Math.ceil(clip.right / size - 0.5) + 1 : grid.width - 2);
  const minY = Math.max(0, (bounds?.minY ?? 0) - 1,
    clip ? Math.floor(clip.top / size - 0.5) - 1 : 0);
  const maxY = Math.min(grid.height - 2, bounds?.maxY ?? grid.height - 2,
    clip ? Math.ceil(clip.bottom / size - 0.5) + 1 : grid.height - 2);
  for (let y = minY; y <= maxY; y += 1) {
    let chunk;
    for (let x = minX; x <= maxX; x += 1) {
      if (x === minX || x % CELL_CHUNK === 0) chunk = cellChunk(grid, x, y);
      if (chunk && chunk.readyCount === CELL_CHUNK &&
          !(chunk.min < threshold && chunk.max >= threshold)) {
        x = Math.min(maxX, chunk.start + CELL_CHUNK - 1);
        continue;
      }
      const values = sampleCell(grid, x, y, chunk);
      const offset = chunk ? (x - chunk.start) * 6 : 0;
      // Equality intentionally matches the original strict corner < threshold test.
      if (!(values[offset+4] < threshold && values[offset+5] >= threshold)) continue;
      const corners = [
        [(x + 0.5) * size, (y + 0.5) * size, values[offset]],
        [(x + 1.5) * size, (y + 0.5) * size, values[offset + 1]],
        [(x + 1.5) * size, (y + 1.5) * size, values[offset + 2]],
        [(x + 0.5) * size, (y + 1.5) * size, values[offset + 3]],
      ];
      const crossings = [];
      for (let edge = 0; edge < 4; edge += 1) {
        const a = corners[edge];
        const b = corners[(edge + 1) % 4];
        if ((a[2] < threshold) === (b[2] < threshold)) continue;
        const t = (threshold - a[2]) / (b[2] - a[2]);
        crossings[edge] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
      const edges = crossings.map((point, edge) => point && edge).filter(edge => edge !== undefined);
      if (edges.length === 2) {
        segments.push([crossings[edges[0]], crossings[edges[1]]]);
      } else if (edges.length === 4) {
        const pairs = corners[0][2] < threshold ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]];
        for (const [a, b] of pairs) segments.push([crossings[a], crossings[b]]);
      }
    }
  }

  const key = point => `${point[0].toFixed(5)},${point[1].toFixed(5)}`;
  const links = new Map();
  segments.forEach((segment, index) => {
    for (let end = 0; end < 2; end += 1) {
      const id = key(segment[end]);
      if (!links.has(id)) links.set(id, []);
      links.get(id).push([index, end]);
    }
  });
  const used = new Set();
  const lines = [];
  function extend(line, front) {
    while (true) {
      const candidates = links.get(key(front ? line[0] : line[line.length - 1])) || [];
      const next = candidates.find(([index]) => !used.has(index));
      if (!next) break;
      const [index, end] = next;
      used.add(index);
      const point = segments[index][1 - end];
      if (front) line.unshift(point);
      else line.push(point);
    }
  }
  segments.forEach((segment, index) => {
    if (used.has(index)) return;
    used.add(index);
    const line = [segment[0], segment[1]];
    extend(line, false);
    extend(line, true);
    lines.push(line);
  });
  return lines;
}

module.exports = { contourLines };
