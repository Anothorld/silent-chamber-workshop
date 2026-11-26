const { GROUPS: CATEGORIES, MATERIALS, MATERIAL_BY_KIND } = require('../../src/ugc/catalog');

const PATHS = {
  floor: 'M5 5h2v2H5zM17 5h2v2h-2zM5 17h2v2H5zM17 17h2v2h-2z',
  wall: 'M3 4h18v16H3zM3 12h18M12 4v8M8 12v8M17 12v8',
  fence: 'M4 4v16M9 4v16M15 4v16M20 4v16M3 8h18M3 16h18',
  pit: 'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  erase: 'm3 14 9-10 9 8-7 8H9zM8 9l9 8M14 20h8',
  start: 'M6 21V3h13l-4 5 4 5H6', exit: 'M5 21V3h14v18M9 12h7m-3-3 3 3-3 3',
  mechanism: 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M5 6a9 9 0 0 0 0 12M19 6a9 9 0 0 1 0 12',
  guard: 'M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M5 21v-3a7 7 0 0 1 14 0v3',
  patrol: 'M8 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0M22 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 14l8-6',
  bat: 'm2 8 5 9 5-6 5 6 5-9-7 3-3-5-3 5z',
  wanderer: 'm12 3 9 9-9 9-9-9zM12 9v6M9 12h6',
  mimic: 'M5 4h5v6H5zM14 14h5v6h-5zM7 10v4M17 10V6M10 7h4M10 17h4',
  sentinel: 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6 5a9 9 0 0 0 0 14M18 5a9 9 0 0 1 0 14',
  spike: 'm2 20 4-15 4 15 4-15 4 15 4-15', launcher: 'M6 3q14 9 0 18V3M6 12h16m-5-5 5 5-5 5',
  mine: 'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0M9 9l6 6M15 9l-6 6',
  alarm: 'M4 18h16l-2-6V9a6 6 0 0 0-12 0v3zM10 21h4',
  fragile: 'M3 3h18v18H3zM10 3l4 6-5 4 6 8M14 9l7 2',
  noisy: 'm3 7 5-3 8 6 5-3M3 13l5-3 8 6 5-3M3 19l5-3 8 6 5-3',
  silent: 'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0M6 18 18 6',
  beacon: 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M12 1v5M12 18v5M1 12h5M18 12h5',
  decoy: 'M10 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M13 7a7 7 0 0 1 0 10M17 3a12 12 0 0 1 0 18',
  laser: 'm3 4 10 8L3 20M13 12h10M18 8l4 4-4 4',
  lockedWall: 'M3 4h18v16H3zM3 12h6M15 12h6M12 4v5M15 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  relay: 'M9 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M23 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M9 12h6',
  sequence: 'M10 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M22 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M6 10v4M17 11h2l-2 2h2',
  gate: 'M3 5h18M3 12h18M6 19h12',
  select: 'm5 3 14 11-7 1-4 7z', brush: 'm14 3 7 7-10 10H4v-7zM12 5l7 7',
  rectangle: 'M4 4h16v16H4z', fill: 'm10 2 10 10-9 9L2 12l9-9M4 11h15M21 16q5 6 0 6t0-6',
  undo: 'M9 4 3 10l6 6M3 10h11a7 7 0 0 1 0 14', redo: 'm15 4 6 6-6 6M21 10H10a7 7 0 0 0 0 14',
  play: 'm8 4 13 8-13 8z', save: 'M4 3h14l3 3v15H3V3zM7 3v6h10V3M7 21v-8h10v8',
  plus: 'M12 4v16M4 12h16', import: 'M4 16v5h16v-5M12 3v12m-5-5 5 5 5-5',
  export: 'M4 16v5h16v-5M12 15V3M7 8l5-5 5 5',
  search: 'M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0M16 16l6 6',
  grid: 'M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18',
  fit: 'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6',
  arrow: 'M20 12H4m6-6-6 6 6 6', close: 'm5 5 14 14M19 5 5 19',
  eye: 'M2 12q10-15 20 0-10 15-20 0M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  help: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M9 8a3 3 0 1 1 5 3l-2 2M12 17v1',
  sound: 'm3 9 5 0 5-5v16l-5-5H3zM17 8a6 6 0 0 1 0 8M20 4a11 11 0 0 1 0 16',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
};
const GROUPS = CATEGORIES.map(group => ({ ...group, items: MATERIALS.filter(item => item.group === group.id)
  .map(item => [item.kind, item.name, item.description]) }));
const ITEMS = MATERIAL_BY_KIND;
function pathFor(kind) {
  return PATHS[kind] || (ITEMS[kind]?.group === 'enemy' ? PATHS.guard : ITEMS[kind]?.group === 'terrain' ? PATHS.floor : PATHS.mechanism);
}
function colorFor(kind) {
  const item = ITEMS[kind];
  if (item?.color) return item.color;
  if (['start', 'exit', 'beacon', 'silent'].includes(kind)) return '#8fdab7';
  if (item?.group === 'enemy' || item?.group === 'danger') return '#e5a38f';
  return '#cfbf8f';
}
function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${pathFor(name)}"/></svg>`;
}
module.exports = { PATHS, GROUPS, ITEMS, colorFor, pathFor, icon };
