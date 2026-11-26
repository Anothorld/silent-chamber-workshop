const { enemyCatalog } = require('../enemy-catalog');
const { TERRAIN_TYPES } = require('../terrain-catalog');
const { OBJECT_TYPES } = require('./objects');
const GROUPS = [
  { id: 'terrain', name: '地形与地面' }, { id: 'goal', name: '目标' },
  { id: 'enemy', name: '敌人' }, { id: 'danger', name: '陷阱' },
  { id: 'assist', name: '声音与辅助' }, { id: 'link', name: '机关' },
];
const MATERIALS = [
  ...TERRAIN_TYPES.map(spec => ({ ...spec, kind: spec.type, group: 'terrain' })),
  { kind: 'start', group: 'goal', name: '玩家起点', shortName: '起点', description: '放置玩家出生点。每张地图只有一个。' },
  { kind: 'exit', group: 'goal', name: '关卡出口', shortName: '出口', description: '放置到达后通关的终点。' },
  { kind: 'mechanism', group: 'goal', name: '声锁', description: '用声波激活，开启机关墙。' },
  { kind: 'guard', group: 'enemy', name: enemyCatalog.guard.displayName, ...enemyCatalog.guard.editor },
  { kind: 'spike', group: 'danger', name: '地刺', description: '周期弹出的地刺，可调整节奏与相位。' },
  { kind: 'launcher', group: 'danger', name: '弓箭机关', shortName: '弓箭', description: '放在墙上并朝向相邻地面，可调整方向、节奏与相位。' },
  ...OBJECT_TYPES.map(spec => ({ ...spec, kind: spec.type })),
  { kind: 'erase', name: '橡皮擦', shortName: '擦除', description: '移除物件并恢复地面。也可以按鼠标右键擦除。' },
];
const MATERIAL_BY_KIND = Object.fromEntries(MATERIALS.map(spec => [spec.kind, spec]));
function materialsFor(group) { return MATERIALS.filter(spec => spec.group === group); }
module.exports = { GROUPS, MATERIALS, MATERIAL_BY_KIND, materialsFor };
