const { SIZES, TILE, createBlankDraft } = require('./ugc/model');

const WIDTH = 36;
const HEIGHT = 48;

function randomFromSeed(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function mechanismNode(route, nodes, point, start, exit) {
  const separated = node => {
    const [x, y] = point(node);
    return Math.hypot(x - exit[0], y - exit[1]) > 17.5 &&
      Math.hypot(x - start[0], y - start[1]) > 7;
  };
  const routeChoices = route.filter(separated);
  if (routeChoices.length) {
    return routeChoices.reduce((best, node) =>
      Math.abs(route.indexOf(node) / route.length - 0.5) <
      Math.abs(route.indexOf(best) / route.length - 0.5) ? node : best);
  }
  const midpoint = point(route[Math.floor(route.length / 2)]);
  const choices = nodes.filter(separated);
  if (!choices.length) throw new Error('No separate location for sound lock');
  return choices.reduce((best, node) =>
    Math.hypot(point(node)[0] - midpoint[0], point(node)[1] - midpoint[1]) <
    Math.hypot(point(best)[0] - midpoint[0], point(best)[1] - midpoint[1]) ? node : best);
}

function generateLoopMaze(seed, difficulty, dimensions) {
  const width = dimensions?.width ?? 36;
  const height = dimensions?.height ?? 48;
  const random = randomFromSeed(seed);
  const columns = width / 6;
  const rows = height / 6;
  const count = columns * rows;
  const point = node => [3 + node % columns * 6, 3 + Math.floor(node / columns) * 6];
  const links = Array.from({ length: count }, () => []);
  const connect = (a, b) => {
    if (!links[a].includes(b)) {
      links[a].push(b);
      links[b].push(a);
    }
  };
  const neighbors = node => {
    const column = node % columns;
    const row = Math.floor(node / columns);
    return [column > 0 ? node - 1 : -1, column < columns - 1 ? node + 1 : -1,
      row > 0 ? node - columns : -1, row < rows - 1 ? node + columns : -1]
      .filter(next => next >= 0);
  };
  const corners = [0, columns - 1, count - columns, count - 1];
  const startNode = corners[Math.floor(random() * corners.length)];
  const deadEnds = [3 * columns + 2, 4 * columns + 3];
  const visited = new Set([startNode]);
  const active = [startNode];
  while (active.length) {
    const index = random() < 0.68 ? active.length - 1 : Math.floor(random() * active.length);
    const node = active[index];
    const choices = neighbors(node).filter(next => !visited.has(next) && !deadEnds.includes(next));
    if (!choices.length) { active.splice(index, 1); continue; }
    const next = choices[Math.floor(random() * choices.length)];
    connect(node, next);
    visited.add(next);
    active.push(next);
  }
  for (const node of deadEnds) {
    const choices = neighbors(node).filter(next => visited.has(next));
    connect(node, choices[Math.floor(random() * choices.length)]);
  }
  const innerTop = 1 + Math.floor(random() * 2);
  const innerBottom = rows - 3 + Math.floor(random() * 2);
  const outer = [0, columns - 1, 0, rows - 1];
  for (const [left, right, top, bottom] of [outer, [1, columns - 2, innerTop, innerBottom]]) {
    for (let column = left; column < right; column += 1) {
      connect(top * columns + column, top * columns + column + 1);
      connect(bottom * columns + column, bottom * columns + column + 1);
    }
    for (let row = top; row < bottom; row += 1) {
      connect(row * columns + left, (row + 1) * columns + left);
      connect(row * columns + right, (row + 1) * columns + right);
    }
  }
  const graphDistance = (start, goal) => {
    const queue = [[start, 0]];
    const seen = new Set([start]);
    for (let index = 0; index < queue.length; index += 1) {
      const [node, distance] = queue[index];
      if (node === goal) return distance;
      for (const next of links[node]) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push([next, distance + 1]);
      }
    }
    return Infinity;
  };
  const cycles = () => links.reduce((sum, next) => sum + next.length, 0) / 2 - count + 1;
  const targetCycles = Math.round((difficulty === 'hard' ? 12 :
    difficulty === 'normal' ? 10 : 8) * columns * rows / 48);
  while (cycles() < targetCycles) {
    const choices = [];
    for (let node = 0; node < count; node += 1) {
      if (deadEnds.includes(node)) continue;
      for (const next of neighbors(node)) {
        if (next <= node || deadEnds.includes(next) || links[node].includes(next)) continue;
        const distance = graphDistance(node, next);
        if (distance >= 6) choices.push({ node, next, distance });
      }
    }
    if (!choices.length) break;
    choices.sort((a, b) => b.distance - a.distance);
    const pool = Math.max(1, Math.ceil(choices.length / 3));
    const choice = choices[Math.floor(random() * pool)];
    connect(choice.node, choice.next);
  }
  const walls = new Set();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) walls.add(`${x},${y}`);
  }
  const carve = (x, y) => {
    for (let dy = 0; dy < 2; dy += 1) {
      for (let dx = 0; dx < 2; dx += 1) walls.delete(`${x + dx},${y + dy}`);
    }
  };
  for (let node = 0; node < count; node += 1) {
    const [x, y] = point(node);
    carve(x, y);
    for (const next of links[node]) {
      if (next < node) continue;
      const [nx, ny] = point(next);
      for (let cx = Math.min(x, nx); cx <= Math.max(x, nx); cx += 1) {
        for (let cy = Math.min(y, ny); cy <= Math.max(y, ny); cy += 1) carve(cx, cy);
      }
    }
  }
  const queue = [startNode];
  const parent = new Map([[startNode, null]]);
  const distanceFromStart = new Map([[startNode, 0]]);
  for (let index = 0; index < queue.length; index += 1) {
    for (const next of links[queue[index]]) {
      if (parent.has(next)) continue;
      parent.set(next, queue[index]);
      distanceFromStart.set(next, distanceFromStart.get(queue[index]) + 1);
      queue.push(next);
    }
  }
  const exits = Array.from({ length: count }, (_, node) => node)
    .filter(node => links[node].length === 1)
    .sort((a, b) => distanceFromStart.get(b) - distanceFromStart.get(a) || a - b);
  const exitNode = exits[Math.floor(random() * Math.min(3, exits.length))];
  const route = [];
  for (let node = exitNode; node !== null; node = parent.get(node)) route.push(node);
  route.reverse();
  let routeTurns = 0;
  for (let index = 2; index < route.length; index += 1) {
    if (route[index] - route[index - 1] !== route[index - 1] - route[index - 2]) routeTurns += 1;
  }
  const center = node => point(node).map(value => value + 0.5);
  const level = {
    width, height, name: `深巷 ${seed}`, hint: '循着声波寻找出口',
    start: center(startNode), exit: center(exitNode),
    walls: [...walls], pits: [], enemies: [],
  };
  if (difficulty !== 'easy') {
    level.mechanism = center(mechanismNode(route,
      Array.from({ length: count }, (_, node) => node), center, level.start, level.exit));
    const crossings = difficulty === 'hard' ? [0.4, 1] : [1];
    level.spikes = crossings.flatMap((fraction, index) => {
      const edge = Math.min(route.length - 2, Math.floor((route.length - 1) * fraction));
      const [x, y] = point(route[edge]);
      const [nx, ny] = point(route[edge + 1]);
      const spikeX = (x + nx) / 2;
      const spikeY = (y + ny) / 2;
      return (x === nx ? [0, 1].map(dx => [spikeX + dx, spikeY]) :
        [0, 1].map(dy => [spikeX, spikeY + dy]))
        .map(([sx, sy]) => ({ x: sx + 0.5, y: sy + 0.5,
          phase: 0.8 + index * 0.6, period: 3.2,
          duration: difficulty === 'hard' ? 0.8 : 0.55 }));
    });
  }
  if (difficulty === 'hard') {
    const sideNodes = Array.from({ length: count }, (_, node) => node)
      .filter(node => !route.includes(node));
    const patrol = center(sideNodes[0] ?? startNode);
    const bat = center(sideNodes[sideNodes.length - 1] ?? startNode);
    level.patrols = [{ path: [patrol, [patrol[0] + 1, patrol[1]]] }];
    level.bats = [{ x: bat[0], y: bat[1], phase: 0.9, period: 2.7, range: 7 }];
  }
  const leafDepth = node => {
    let depth = 0;
    let previous = -1;
    while (links[node].length <= 2) {
      const next = links[node].find(neighbor => neighbor !== previous);
      if (next === undefined) break;
      previous = node;
      node = next;
      depth += 1;
    }
    return depth;
  };
  let floors = 0;
  let referencedFloors = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (walls.has(`${x},${y}`)) continue;
      floors += 1;
      let reference = false;
      for (let dy = -3; dy <= 3 && !reference; dy += 1) {
        for (let dx = -3; dx <= 3; dx += 1) {
          if (dx * dx + dy * dy <= 9 && walls.has(`${x + dx},${y + dy}`)) {
            reference = true;
            break;
          }
        }
      }
      if (reference) referencedFloors += 1;
    }
  }
  const topology = {
    cycles: cycles(), forks: links.filter(next => next.length >= 3).length,
    deadEnds: links.filter(next => next.length === 1).length,
    maxDeadEndDepth: Math.max(...links.map((next, node) => next.length === 1 ? leafDepth(node) : 0)),
    routeTurns, acousticCoverage: referencedFloors / floors,
    innerLoop: [1, columns - 2, innerTop, innerBottom],
  };
  return { generatorVersion: width === WIDTH && height === HEIGHT ? 8 : 9, algorithm: 'growing-tree-loops', seed, difficulty,
    maze: 'dense', topology, level };
}

function generateCandidate(seed, difficulty, maze = 'standard', dimensions) {
  if (!Number.isSafeInteger(seed) || !['easy', 'normal', 'hard'].includes(difficulty) ||
      !['standard', 'dense'].includes(maze)) {
    throw new Error('Expected an integer seed, easy/normal/hard difficulty, and standard/dense maze');
  }
  if (maze === 'dense') return generateLoopMaze(seed, difficulty, dimensions);
  const columns = 4;
  const rows = 5;
  const stepX = 9;
  const stepY = 9;
  const random = randomFromSeed(seed);
  const walls = new Set();
  const pits = new Set();
  for (let x = 0; x < WIDTH; x += 1) {
    walls.add(`${x},0`);
    walls.add(`${x},${HEIGHT - 1}`);
  }
  for (let y = 0; y < HEIGHT; y += 1) {
    walls.add(`0,${y}`);
    walls.add(`${WIDTH - 1},${y}`);
  }
  for (let column = 1; column < columns; column += 1) {
    for (let y = 1; y < HEIGHT - 1; y += 1) walls.add(`${column * stepX},${y}`);
  }
  for (let row = 1; row < rows; row += 1) {
    for (let x = 1; x < WIDTH - 1; x += 1) walls.add(`${x},${row * stepY}`);
  }

  const roomCount = columns * rows;
  const roomCenter = room => [room % columns * stepX + 4.5,
    Math.floor(room / columns) * stepY + 4.5];
  const startRoom = [0, columns - 1, roomCount - columns, roomCount - 1][Math.floor(random() * 4)];
  const visited = new Set([startRoom]);
  const stack = [startRoom];
  const links = Array.from({ length: roomCount }, () => []);
  const doors = new Map();
  const doorKey = (a, b) => `${Math.min(a, b)},${Math.max(a, b)}`;
  while (stack.length) {
    const room = stack[stack.length - 1];
    const column = room % columns;
    const row = Math.floor(room / columns);
    const neighbors = [
      column > 0 ? room - 1 : -1, column < columns - 1 ? room + 1 : -1,
      row > 0 ? room - columns : -1, row < rows - 1 ? room + columns : -1,
    ].filter(next => next >= 0 && !visited.has(next));
    if (!neighbors.length) { stack.pop(); continue; }
    const next = neighbors[Math.floor(random() * neighbors.length)];
    const nextColumn = next % columns;
    const nextRow = Math.floor(next / columns);
    const cells = [];
    if (column !== nextColumn) {
      const x = Math.max(column, nextColumn) * stepX;
      const y = row * stepY + 3 + Math.floor(random() * 3);
      cells.push([x, y], [x, y + 1]);
    } else {
      const y = Math.max(row, nextRow) * stepY;
      const x = column * stepX + 3 + Math.floor(random() * 3);
      cells.push([x, y], [x + 1, y]);
    }
    for (const [x, y] of cells) walls.delete(`${x},${y}`);
    doors.set(doorKey(room, next), cells);
    links[room].push(next);
    links[next].push(room);
    visited.add(next);
    stack.push(next);
  }

  const queue = [startRoom];
  const parent = new Map([[startRoom, null]]);
  for (let index = 0; index < queue.length; index += 1) {
    for (const next of links[queue[index]]) {
      if (parent.has(next)) continue;
      parent.set(next, queue[index]);
      queue.push(next);
    }
  }
  const exitRoom = queue[queue.length - 1];
  const routeRooms = [];
  for (let room = exitRoom; room !== null; room = parent.get(room)) routeRooms.push(room);
  routeRooms.reverse();
  const start = roomCenter(startRoom);
  const exit = roomCenter(exitRoom);
  const level = {
    width: WIDTH, height: HEIGHT,
    name: `回声 ${seed}`, hint: '循着声波寻找出口',
    start, exit,
    walls: [...walls], pits: [...pits], enemies: [],
  };
  if (difficulty !== 'easy') {
    level.mechanism = roomCenter(mechanismNode(routeRooms,
      Array.from({ length: roomCount }, (_, room) => room), roomCenter, start, exit));
    const crossings = difficulty === 'hard' ? [0.35, 0.7] : [0.5];
    level.spikes = crossings.flatMap((fraction, index) => {
      const edge = Math.max(0, Math.min(routeRooms.length - 2,
        Math.floor((routeRooms.length - 1) * fraction)));
      return doors.get(doorKey(routeRooms[edge], routeRooms[edge + 1]))
        .map(([x, y]) => ({ x: x + 0.5, y: y + 0.5,
          phase: 0.8 + index * 0.6, period: 3.2,
          duration: difficulty === 'hard' ? 0.8 : 0.55 }));
    });
  }
  if (difficulty === 'hard') {
    const sideRooms = Array.from({ length: roomCount }, (_, room) => room)
      .filter(room => !routeRooms.includes(room));
    const patrolCenter = roomCenter(sideRooms[0] ?? startRoom);
    const batCenter = roomCenter(sideRooms[sideRooms.length - 1] ?? startRoom);
    level.patrols = [{ path: [[patrolCenter[0] - 1, patrolCenter[1] - 1],
      [patrolCenter[0] + 1, patrolCenter[1] - 1]] }];
    level.bats = [{ x: batCenter[0], y: batCenter[1] - 2,
      phase: 0.9, period: 2.7, range: 7 }];
  }
  for (let room = 0; room < roomCount; room += 1) {
    const x0 = room % columns * stepX;
    const y0 = Math.floor(room / columns) * stepY;
    const protectedPoints = [start, exit, level.mechanism,
      ...(level.patrols || []).flatMap(patrol => patrol.path),
      ...(level.bats || []).map(bat => [bat.x, bat.y])].filter(Boolean);
    const placements = [[2, 2], [5, 5], [2, 5], [5, 2]];
    for (const [dx, dy] of placements) {
      const cells = [[x0 + dx, y0 + dy], [x0 + dx + 1, y0 + dy],
        [x0 + dx, y0 + dy + 1], [x0 + dx + 1, y0 + dy + 1]];
      if (cells.some(([x, y]) => protectedPoints.some(([px, py]) =>
        Math.hypot(x + 0.5 - px, y + 0.5 - py) < 0.8))) continue;
      for (const [x, y] of cells) walls.add(`${x},${y}`);
      break;
    }
  }
  level.walls = [...walls];
  return { generatorVersion: 5, seed, difficulty, level };
}

function generateEditableTerrain(seed, size) {
  const dimensions = SIZES[size];
  if (!dimensions || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('invalid-generator-input');
  }
  const [mapWidth, mapHeight] = dimensions;
  const candidate = generateCandidate(seed, 'easy', 'dense',
    { width: mapWidth, height: mapHeight });
  const draft = createBlankDraft(size, candidate.level.name);
  draft.tiles.fill(TILE.FLOOR);
  for (const key of candidate.level.walls) {
    const [x, y] = key.split(',').map(Number);
    draft.tiles[y * mapWidth + x] = TILE.WALL;
  }
  draft.start = candidate.level.start.map(Math.floor);
  draft.exit = candidate.level.exit.map(Math.floor);
  draft.origin = { seed, generatorVersion: candidate.generatorVersion };
  return draft;
}

function hydrateLevel(level) {
  return { ...level, walls: new Set(level.walls), pits: new Set(level.pits || []) };
}

module.exports = { generateCandidate, generateEditableTerrain, hydrateLevel, randomFromSeed };
