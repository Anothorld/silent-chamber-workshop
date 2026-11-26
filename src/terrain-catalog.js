// Tile IDs are persisted in drafts: assign a new ID, never renumber an existing one.
const terrainCatalog = {
  floor: { tile: 0, name: '地面', description: '可以行走的基础地面。', walkable: true, color: '#d6dad0', gameColor: '#dcecf0' },
  wall: { tile: 1, name: '墙体', description: '阻挡移动与声波，形成回声轮廓。', walkable: false, runtime: { key: 'walls', shape: 'set' }, color: '#364b3c', gameColor: '#547984' },
  pit: { tile: 2, name: '深坑', description: '无法通行的坠落区域。', walkable: false, runtime: { key: 'pits', shape: 'set' }, color: '#18221e', gameColor: '#ba727c' },
  fence: { tile: 3, name: '栅栏', description: '阻挡移动，允许声波穿过。', walkable: false, runtime: { key: 'fences', shape: 'set' }, color: '#719482', gameColor: '#dcecf0' },
};
const surfaceCatalog = {
  fragile: { name: '脆弱地板', shortName: '裂地', description: '仅玩家踩踏后预警并坍塌，不会被声音触发。', limit: 24, marker: '裂', runtime: { key: 'fragileFloors' } },
  noisy: { name: '响砖', description: '踩踏时发出更大的脚步声。', limit: 24, marker: '响', runtime: { key: 'noisyFloors' } },
  silent: { name: '静音地毯', shortName: '静毯', description: '压低脚步声，便于潜行。', limit: 24, marker: '静', color: '#8fdab7', runtime: { key: 'silentFloors' } },
};
const TERRAIN_TYPES = Object.entries(terrainCatalog).map(([type, spec]) => ({ type, ...spec }));
const TERRAIN_BY_TILE = Object.fromEntries(TERRAIN_TYPES.map(spec => [spec.tile, spec]));
const TERRAIN = Object.fromEntries(TERRAIN_TYPES.map(spec => [spec.type, spec.tile]));
function registerTerrain(type, spec) {
  if (!/^[a-z][A-Za-z0-9_-]{0,63}$/.test(type) || ['constructor', 'prototype'].includes(type) ||
      Object.hasOwn(terrainCatalog, type) || !Number.isInteger(spec?.tile) || spec.tile < 0 || spec.tile > 255 ||
      Object.hasOwn(TERRAIN_BY_TILE, spec.tile) || typeof spec.name !== 'string' || !spec.name || typeof spec.walkable !== 'boolean') {
    throw new Error('invalid-terrain-registration');
  }
  const entry = { ...spec, type };
  terrainCatalog[type] = { ...spec };
  TERRAIN_TYPES.push(entry); TERRAIN_BY_TILE[spec.tile] = entry; TERRAIN[type] = spec.tile;
  return entry;
}
function isKnownTile(tile) { return Number.isInteger(tile) && Object.hasOwn(TERRAIN_BY_TILE, tile); }
function matchesTile(tile, expected = 0) {
  return isKnownTile(tile) && (expected === 0 ? TERRAIN_BY_TILE[tile].walkable : tile === expected);
}
module.exports = { terrainCatalog, surfaceCatalog, TERRAIN_TYPES, TERRAIN_BY_TILE, TERRAIN, isKnownTile, matchesTile, registerTerrain };
