const { randomFromSeed } = require('../level-generator');

function graphPath(maze, from, to) {
  const queue = [from];
  const previous = new Map([[from, null]]);
  for (let head = 0; head < queue.length; head += 1) {
    const id = queue[head];
    if (id === to) {
      const path = [];
      for (let at = to; at !== null; at = previous.get(at)) path.push(at);
      return path.reverse();
    }
    for (const next of maze.links[id]) if (!previous.has(next)) {
      previous.set(next, id);
      queue.push(next);
    }
  }
  return null;
}

// A complete cross section, suitable for a gate or a deliberate analysis cut.
function edgeCells(maze, a, b) {
  const [ax, ay] = maze.points[a].map(Math.floor);
  const [bx, by] = maze.points[b].map(Math.floor);
  if (Math.abs(ax - bx) + Math.abs(ay - by) !== 4) throw new Error('Not a maze edge');
  return ax === bx
    ? [`${ax},${Math.min(ay, by) + 2}`, `${ax + 1},${Math.min(ay, by) + 2}`]
    : [`${Math.min(ax, bx) + 2},${ay}`, `${Math.min(ax, bx) + 2},${ay + 1}`];
}

function topology(maze) {
  const { links, points } = maze;
  let maxDeadEndDepth = 0;
  for (let id = 0; id < links.length; id += 1) if (links[id].length === 1) {
    let previous = id, at = links[id][0], depth = 1;
    while (links[at].length === 2) {
      const next = links[at].find(node => node !== previous);
      previous = at;
      at = next;
      depth += 1;
    }
    maxDeadEndDepth = Math.max(maxDeadEndDepth, depth * 4);
  }
  let diameter = [];
  for (let from = 0; from < links.length; from += 1) {
    const queue = [from], distances = new Map([[from, 0]]), previous = new Map();
    for (let head = 0; head < queue.length; head += 1) {
      for (const next of links[queue[head]]) if (!distances.has(next)) {
        distances.set(next, distances.get(queue[head]) + 1);
        previous.set(next, queue[head]);
        queue.push(next);
      }
    }
    const to = queue[queue.length - 1];
    if (distances.get(to) + 1 > diameter.length) {
      diameter = [to];
      while (diameter[diameter.length - 1] !== from) diameter.push(previous.get(diameter[diameter.length - 1]));
      diameter.reverse();
    }
  }
  let turns = 0;
  for (let i = 2; i < diameter.length; i += 1) {
    const [a, b, c] = diameter.slice(i - 2, i + 1).map(id => points[id]);
    if (b[0] - a[0] !== c[0] - b[0] || b[1] - a[1] !== c[1] - b[1]) turns += 1;
  }
  return { nodes: links.length, cycles: links.reduce((sum, list) => sum + list.length, 0) / 2 - links.length + 1,
    forks: links.filter(list => list.length >= 3).length,
    deadEnds: links.filter(list => list.length === 1).length, maxDeadEndDepth,
    diameterSteps: Math.max(0, diameter.length - 1) * 4, diameterTurns: turns,
    diameterEnds: [diameter[0], diameter[diameter.length - 1]] };
}

// Generate geometry before any spawn, objective or enemy is selected. No fixed perimeter loops.
function createMaze({ seed, algorithm = 'growing-tree', columns = 9, rows = 12,
  loops = 4, newestBias = 0.65 } = {}) {
  if (!Number.isInteger(seed) || !['dfs', 'prim', 'growing-tree'].includes(algorithm) ||
      !Number.isInteger(columns) || columns < 3 || columns > 9 ||
      !Number.isInteger(rows) || rows < 3 || rows > 12 ||
      !Number.isInteger(loops) || loops < 0) throw new Error('Invalid maze options');
  const random = randomFromSeed(seed);
  const pick = array => array[Math.floor(random() * array.length)];
  const count = columns * rows;
  const links = Array.from({ length: count }, () => []);
  const neighbors = id => [id % columns > 0 ? id - 1 : -1,
    id % columns < columns - 1 ? id + 1 : -1, id >= columns ? id - columns : -1,
    id < count - columns ? id + columns : -1].filter(node => node >= 0);
  const connect = (a, b) => { links[a].push(b); links[b].push(a); };
  const first = Math.floor(random() * count);
  const visited = new Set([first]);
  const active = [first];
  while (active.length) {
    const index = algorithm === 'dfs' || (algorithm === 'growing-tree' && random() < newestBias)
      ? active.length - 1 : Math.floor(random() * active.length);
    const id = active[index];
    const options = neighbors(id).filter(next => !visited.has(next));
    if (!options.length) { active.splice(index, 1); continue; }
    const next = pick(options);
    connect(id, next);
    visited.add(next);
    active.push(next);
  }
  const originX = Math.floor((36 - ((columns - 1) * 4 + 2)) / 2);
  const originY = Math.floor((48 - ((rows - 1) * 4 + 2)) / 2);
  const points = Array.from({ length: count }, (_, id) =>
    [originX + (id % columns) * 4 + 0.5, originY + Math.floor(id / columns) * 4 + 0.5]);
  const maze = { width: 36, height: 48, seed, algorithm, columns, rows, newestBias, links, points };
  const braidEdges = [];
  for (let i = 0; i < loops; i += 1) {
    const candidates = [];
    for (let a = 0; a < count; a += 1) for (const b of neighbors(a)) {
      if (b <= a || links[a].includes(b) || links[a].length >= 3 || links[b].length >= 3) continue;
      // Keep meaningful detours, rather than opening every small square.
      if (graphPath(maze, a, b).length >= 8) candidates.push([a, b]);
    }
    if (!candidates.length) throw new Error('Requested too many long maze loops');
    const edge = pick(candidates);
    connect(...edge);
    braidEdges.push(edge);
  }
  const walls = new Set();
  for (let y = 0; y < 48; y += 1) for (let x = 0; x < 36; x += 1) walls.add(`${x},${y}`);
  const carve = (x1, y1, x2, y2) => {
    for (let y = y1; y <= y2; y += 1) for (let x = x1; x <= x2; x += 1) walls.delete(`${x},${y}`);
  };
  for (let a = 0; a < count; a += 1) {
    const [ax, ay] = points[a].map(Math.floor);
    carve(ax, ay, ax + 1, ay + 1);
    for (const b of links[a]) if (b > a) {
      const [bx, by] = points[b].map(Math.floor);
      carve(Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx) + 1, Math.max(ay, by) + 1);
    }
  }
  return { ...maze, walls, braidEdges, stats: topology(maze), version: 1 };
}

module.exports = { createMaze, graphPath, edgeCells, topology };
