const fs = require('node:fs');
const { createMaze } = require('../src/solo-levels/maze');
const { createBlankDraft, TILE } = require('../src/ugc/model');

const algorithms = ['dfs', 'prim', 'growing-tree'];

function generateDraft(seed, algorithm = 'growing-tree') {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || !algorithms.includes(algorithm)) {
    throw new Error('种子须为 0–4294967295 的整数，算法可选 dfs、prim 或 growing-tree');
  }
  const maze = createMaze({ seed, algorithm });
  const draft = createBlankDraft('small', '回声迷宫');
  draft.tiles = draft.tiles.map((_, index) => {
    const x = index % maze.width, y = Math.floor(index / maze.width);
    return maze.walls.has(x + ',' + y) ? TILE.WALL : TILE.FLOOR;
  });
  const [start, exit] = maze.stats.diameterEnds;
  draft.start = maze.points[start].map(Math.floor);
  draft.exit = maze.points[exit].map(Math.floor);
  // ECL records a numeric generator version, so reserve a distinct ID for each algorithm.
  const generatorVersion = 10 + algorithms.indexOf(algorithm);
  draft.origin = { seed, generatorVersion };
  return { draft, stats: maze.stats };
}

if (require.main === module) {
  try {
    const [seedText, algorithm = 'growing-tree', output] = process.argv.slice(2);
    if (!/^\d+$/.test(seedText || '') || process.argv.length > 5) {
      throw new Error('用法：node scripts/generate-draft.js <seed> [dfs|prim|growing-tree] [新建的输出文件]');
    }
    const { draft, stats } = generateDraft(Number(seedText), algorithm);
    const json = JSON.stringify(draft) + '\n';
    if (output) fs.writeFileSync(output, json, { flag: 'wx' });
    else process.stdout.write(json);
    console.error(JSON.stringify({ algorithm, ...draft.origin, ...stats }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { generateDraft };
