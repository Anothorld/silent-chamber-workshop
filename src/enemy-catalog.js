const ordinaryRules = [
  ['听声', '脚步、探路声等沿可达路径传播到身边后才会吸引它；未警觉时不会仅因玩家靠近而发现玩家。静步仍有微弱声音，接触怪物仍会死亡。'],
  ['追踪', '已警觉且未被诱饵引开时，玩家在 3 格内且无遮挡，会直接追向玩家；否则追向最后听到的声源。'],
  ['诱导', '石头和替声器可转移注意；再次听到玩家的声音后才改追玩家。'],
  ['显形', '玩家视角下，近距离且无遮挡时可见；探路声或投石声抵达后可短暂确认位置并留下残影。远处或隔墙不会持续显示。'],
];
const searchRule = destination => ['搜索', `到达最后声源后搜索 8 秒；没有新线索就${destination}。`];

// Keep a separate definition per gameplay type so future public names can differ.
const guard = { displayName: '???', ambientSample: 'monster-original', continuousPitch: true, ambientDuration: 13.6088125, ambientVolume: .22, ambientGain: 1.05,
  editor: { description: '原地待命，听声追踪；警觉后近距离直接追人。', marker: '守', limit: 8,
    keywords: '守卫 guard 听声 警觉 追踪 搜索', details: [...ordinaryRules, searchRule('返回原岗位')] } };
const enemyCatalog = {
  guard,
  mimic: { displayName: '???', ambientSample: null, continuousPitch: false, stepManifest: 'mimic-audio-manifest', ambientVolume: guard.ambientVolume, ambientGain: guard.ambientGain },
  patrol: { displayName: '???', ambientSample: 'monster-patrol-loop-diffuse', alertSample: 'monster-patrol-loop-alert', ambientDuration: 2.42, ambientVolume: .28, ambientGain: 1.5 },
  bat: { displayName: '???', ambientSample: 'monster-original', continuousPitch: true, ambientDuration: 13.6088125, ambientVolume: .22, ambientGain: 1.05 },
  wanderer: { displayName: '???', ambientSample: 'monster-wanderer-diffuse', alertSample: 'monster-wanderer-alert', ambientDuration: 3.9, ambientVolume: .22, ambientGain: 1.40 },
  sentinel: { displayName: '???', ambientSample: 'sentinel-ambient-diffuse', alertSample: 'sentinel-ambient-alert', ambientExtension: 'mp3', ambientDuration: 30.35641723356, ambientVolume: .38, ambientGain: 1.20 },
};

// Defaults for ordinary additions: single-cell placement and `${type}s` coordinate pairs.
const editorDefinitions = {
  mimic: { keywords: '拟声者 mimic 探路声 probe 大脚步 脚步 静步 投石 石头 落地 固定目标 粒子 显形',
    description: '单人专属，听声后拟声、沉默再追踪；石头可引开。', marker: '拟', details: [
      ['唤醒', '待机时无持续环境音。探路声、半径大于 1 格的大脚步或石头最终落地声抵达后才唤醒；静步和石头弹跳声不会唤醒。'],
      ['初次响应', '先完整模仿一次脚步声，再沉默 1.3 秒，然后以玩家最大速度的 90% 追向记住的声源。'],
      ['玩家声源', '这一趟若由探路声或大脚步触发，拟声、沉默或慢行时，必须等下一声大脚步实际传到拟声者，才会加速至玩家最大速度的 110%。后续探路声抵达只更新目标，不加速、不重播拟声。'],
      ['近身锁定', '仅在追踪玩家声源且已加速时，2 格内实时锁定玩家；慢行或超过 2 格时追向最后声源。'],
      ['石头诱导', '这一趟若由石头最终落地声触发，目标固定为该落点；途中忽略后续玩家声音、新石头和近身玩家，不被大脚步加速。接触仍会死亡。'],
      ['警戒', '到达目标后停留警戒 10 秒；期间新有效声音抵达会直接快速追踪，不再先拟声。警戒结束后恢复初次响应流程。'],
      ['显形与波纹', '5 格内粒子逐渐聚拢，2 格内完全聚拢。初次拟声产生 8 格波纹，移动每步产生 4 格波纹，均以每秒 6 格扩散；波纹不照亮地形、不触发机关、不唤醒其他怪物。'],
    ] },
  patrol: { description: '两点往返巡逻，听声追踪，搜索后回归巡逻。', keywords: '巡逻者 patrol 起点 终点 往返 追踪',
    details: [['路线', '分两次放置巡逻起点和终点，未警觉时沿可通行路径往返。'], ...ordinaryRules, searchRule('返回巡逻路线')],
    marker: '巡', pair: true, limit: 6, runtime: { key: 'patrols', shape: 'path' } },
  bat: { description: '定向声波扫描，命中玩家后听回声追击。', keywords: '蝙蝠 bat 定向 扫描 回声 追踪',
    details: [['扫描', '待机时原地定向扫描：首次在 0.8 秒后，之后每 2.5 秒一次，范围 9 格。扫描命中玩家会产生回声，回声抵达后追击；追击中暂停扫描。'],
      ...ordinaryRules, searchRule('返回原岗位并恢复扫描')],
    marker: '蝠', runtime: { key: 'bats', defaults: { phase: .8, period: 2.5, range: 9 } } },
  wanderer: { description: '自主游荡，听声追踪，搜索后恢复游荡。', keywords: '游荡者 wanderer 游荡 追踪',
    details: [['游荡', '未警觉时在可通行区域自主游荡，无需设置路线。'], ...ordinaryRules, searchRule('返回原区域并恢复游荡')], marker: '游' },
  sentinel: { description: '环形声呐扫描，命中玩家后离岗追击。', keywords: '声呐 sentinel 哨兵 环形 扫描 回声 蓄力',
    details: [['扫描', '待机时原地环形扫描：首次在 2.2 秒后，之后每 5 秒一次，范围 5 格；扫描前有 0.55 秒蓄力提示。命中玩家产生回声，回声抵达后离岗追击；追击中暂停扫描。'],
      ...ordinaryRules, searchRule('返回原岗位并恢复扫描')],
    marker: '纳', runtime: { key: 'sentinels', defaults: { phase: 2.2, period: 5, range: 5 } } },
};
for (const [type, editor] of Object.entries(editorDefinitions)) enemyCatalog[type].editor = editor;

function getEnemyDefinition(type) {
  return Object.hasOwn(enemyCatalog, type) ? enemyCatalog[type] : enemyCatalog.guard;
}

function enemyDisplayName(type) { return getEnemyDefinition(type).displayName; }

module.exports = { enemyCatalog, getEnemyDefinition, enemyDisplayName };
