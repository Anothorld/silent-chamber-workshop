const { enemyCatalog } = require('../enemy-catalog');
const { surfaceCatalog } = require('../terrain-catalog');

// ECL2/3 wire IDs never change; new types use ECL4 string identities.
const LEGACY_CODES = { patrol: 1, bat: 2, wanderer: 3, sentinel: 4, mine: 5, alarm: 6,
  fragile: 7, gate: 8, noisy: 9, silent: 10, beacon: 11, decoy: 12, laser: 13,
  lockedWall: 14, relay: 15, sequence: 16 };
const devices = [
  { type: 'mine', name: '地雷', description: '危险的触发陷阱。', group: 'danger', marker: '雷', limit: 16, runtime: { key: 'mines' } },
  { type: 'alarm', name: '警铃', description: '触发后产生噪声，吸引周围敌人。', group: 'danger', marker: '铃', runtime: { key: 'alarms' } },
  { type: 'gate', name: '声闸', description: '随声音改变状态的门。', group: 'link', marker: '闸', limit: 12, runtime: { key: 'gates' } },
  { type: 'beacon', name: '引路灯', shortName: '引路', description: '周期发出引路声波。', group: 'assist', marker: '引', limit: 12, runtime: { key: 'beacons', defaults: { phase: 1.2, period: 4.5, radius: 3.5 } } },
  { type: 'decoy', name: '替声器', shortName: '替声', description: '制造声源，改变敌人的注意方向。', group: 'assist', marker: '替', limit: 12, runtime: { key: 'decoys' } },
  { type: 'laser', name: '激光', description: '放置激光装置。', group: 'assist', marker: '光', limit: 12, runtime: { key: 'lasers' } },
  { type: 'lockedWall', name: '机关墙', description: '放在墙体上；声锁或顺序节点激活后打开。', group: 'goal', marker: '锁', tile: 1, limit: 32, runtime: { key: 'mechanismWalls', shape: 'set' } },
  { type: 'relay', name: '传声器', shortName: '传声', description: '先放输入端，再放输出端；将声音传到远处。', group: 'link', marker: '传', pair: true, runtime: { key: 'relays', shape: 'relay' } },
  { type: 'sequence', name: '顺序节点', shortName: '顺序', description: '依次设置两个节点，用声波按顺序激活。', group: 'link', marker: '①', pair: true, limit: 1, runtime: { key: 'sequenceNodes', shape: 'pairPoints' } },
];
const enemies = Object.entries(enemyCatalog).filter(([type]) => type !== 'guard').map(([type, definition]) => ({
  type, group: 'enemy', name: definition.displayName, description: '放在地面上的敌人。', marker: '敌',
  runtime: { key: `${type}s`, shape: 'coordinates' }, ...definition.editor,
}));
const surfaces = Object.entries(surfaceCatalog).map(([type, spec]) => ({ type, group: 'terrain', ...spec }));
const OBJECT_TYPES = Object.freeze([...enemies, ...surfaces, ...devices].map(spec => Object.freeze({
  tile: 0, limit: 8, ...spec, code: Object.hasOwn(LEGACY_CODES, spec.type) ? LEGACY_CODES[spec.type] : undefined,
})).sort((a, b) => (a.code || 256) - (b.code || 256)));
const OBJECT_BY_TYPE = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(OBJECT_TYPES.map(spec => [spec.type, spec]))));
const OBJECT_BY_CODE = Object.freeze(Object.fromEntries(OBJECT_TYPES.filter(spec => spec.code).map(spec => [spec.code, spec])));
const MAX_OBJECTS = 64;
const ENEMY_TYPES = new Set(enemies.map(spec => spec.type));
const MAX_ENEMIES = 16;

function appendRuntime(target, runtime, item) {
  if (!runtime) return;
  const at = { x: item.x + .5, y: item.y + .5 };
  const end = { x: item.toX + .5, y: item.toY + .5 };
  if (runtime.shape === 'set') {
    (target[runtime.key] ||= new Set()).add(`${item.x},${item.y}`);
    return;
  }
  const entries = target[runtime.key] ||= [];
  if (runtime.shape === 'coordinates') entries.push([at.x, at.y]);
  else if (runtime.shape === 'path') entries.push({ path: [[at.x, at.y], [end.x, end.y]] });
  else if (runtime.shape === 'relay') entries.push({ ...at, toX: end.x, toY: end.y });
  else if (runtime.shape === 'pairPoints') entries.push(at, end);
  else entries.push({ ...at, ...runtime.defaults });
}
module.exports = { OBJECT_TYPES, OBJECT_BY_TYPE, OBJECT_BY_CODE, MAX_OBJECTS, ENEMY_TYPES, MAX_ENEMIES, appendRuntime };
