const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createMaze, graphPath } = require('../src/solo-levels/maze');

const SETTINGS = { columns: 9, rows: 12, loops: 4, newestBias: 0.65 };
const ALGORITHMS = ['dfs', 'prim', 'growing-tree'];
const LABELS = { dfs: 'DFS 深度优先', prim: 'Prim 风格', 'growing-tree': 'Growing Tree 混合' };
const METRICS = ['floors', 'forks', 'deadEnds', 'longBlindBranches', 'maxDeadEndDepth',
  'diameterSteps', 'diameterTurns', 'maxStraightSteps', 'outerEdges'];

function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  return { min: sorted[0], max: sorted.at(-1),
    median: (sorted[Math.floor(middle)] + sorted[Math.ceil(middle) - 1]) / 2,
    mean: +(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2) };
}

function measure(maze) {
  const deadEndBranches = [];
  for (let leaf = 0; leaf < maze.links.length; leaf += 1) {
    if (maze.links[leaf].length !== 1) continue;
    const nodes = [leaf, maze.links[leaf][0]];
    while (maze.links[nodes.at(-1)].length === 2) {
      nodes.push(maze.links[nodes.at(-1)].find(next => next !== nodes.at(-2)));
    }
    deadEndBranches.push({ leaf, join: nodes.at(-1), steps: (nodes.length - 1) * 4, nodes });
  }
  let maxStraightSteps = 0;
  let outerEdges = 0;
  for (let row = 0; row < maze.rows; row += 1) {
    let run = 0;
    for (let column = 0; column < maze.columns - 1; column += 1) {
      const id = row * maze.columns + column;
      const linked = maze.links[id].includes(id + 1);
      run = linked ? run + 4 : 0;
      maxStraightSteps = Math.max(maxStraightSteps, run);
      if (linked && (row === 0 || row === maze.rows - 1)) outerEdges += 1;
    }
  }
  for (let column = 0; column < maze.columns; column += 1) {
    let run = 0;
    for (let row = 0; row < maze.rows - 1; row += 1) {
      const id = row * maze.columns + column;
      const linked = maze.links[id].includes(id + maze.columns);
      run = linked ? run + 4 : 0;
      maxStraightSteps = Math.max(maxStraightSteps, run);
      if (linked && (column === 0 || column === maze.columns - 1)) outerEdges += 1;
    }
  }
  const tree = { ...maze, links: maze.links.map((neighbors, id) => neighbors.filter(next =>
    !maze.braidEdges.some(([a, b]) => a === id && b === next || b === id && a === next))) };
  const braids = maze.braidEdges.map(([a, b]) => {
    const detourBefore = graphPath(tree, a, b);
    assert.ok(detourBefore.length >= 8, 'Added loops must span a genuine detour');
    tree.links[a].push(b); tree.links[b].push(a);
    return { a, b, directSteps: 4, detourBeforeSteps: (detourBefore.length - 1) * 4,
      cycleStepsAtCreation: detourBefore.length * 4, detourBefore };
  });
  return { ...maze.stats, floors: maze.width * maze.height - maze.walls.size,
    maxStraightSteps, outerEdges,
    longBlindBranches: deadEndBranches.filter(branch => branch.steps >= 12).length,
    completeOuterFrame: outerEdges === (maze.columns + maze.rows - 2) * 2,
    deadEndBranches, braids };
}

function representativeSeeds(samples, summary) {
  const selected = [];
  const choose = (label, score) => {
    const sample = samples.filter(item => !selected.some(chosen => chosen.seed === item.seed))
      .sort((a, b) => score(a) - score(b) || a.seed - b.seed)[0];
    selected.push({ seed: sample.seed, label });
  };
  choose('中位结构', item => Math.abs(item.stats.diameterSteps - summary.diameterSteps.median) +
    Math.abs(item.stats.forks - summary.forks.median) * 3);
  choose('长程样本', item => -item.stats.diameterSteps);
  choose('深支样本', item => -item.stats.maxDeadEndDepth);
  return selected;
}

function recommendations(samples, summaries) {
  return [
    { stages: '33–36', algorithm: 'prim', purpose: '潜行与多怪物的局部观察、支路与恢复',
      reason: '岔点与末端最多，适合先观察怪物，再在相邻支路间换路；需要挑选任务位置，避免让大量短盲支成为无效探索。' },
    { stages: '37–40', algorithm: 'growing-tree', purpose: '地形节奏与中程回访',
      reason: '长程与岔路数量居中，可在不同回环安排陷阱及怪物，保留安静接近、等待和绕行的空间。' },
    { stages: '41–44', algorithm: 'dfs', purpose: '跨区声音目标与返回路线',
      reason: '直径与转弯更多，适合把声音目标放在不同分支；优先避开极长单盲支，不能直接把最长路径当作关卡。' },
  ].map(group => {
    const summary = summaries[group.algorithm];
    const pool = samples.filter(sample => sample.algorithm === group.algorithm &&
      sample.stats.maxDeadEndDepth <= 40 && sample.stats.diameterTurns >= summary.diameterTurns.median - 4);
    const ranked = pool.sort((a, b) => {
      const score = item => Math.abs(item.stats.diameterSteps - summary.diameterSteps.median) +
        Math.abs(item.stats.forks - summary.forks.median) * 3 + item.stats.maxDeadEndDepth / 4;
      return score(a) - score(b) || a.seed - b.seed;
    });
    return { ...group, seeds: ranked.slice(0, 4).map(sample => sample.seed) };
  });
}

function collectTrials() {
  const samples = [];
  for (const algorithm of ALGORITHMS) {
    for (let seed = 1; seed <= 32; seed += 1) {
      const maze = createMaze({ seed, algorithm, ...SETTINGS });
      // Check the whole graph independently of the chosen diameter endpoints.
      const seen = new Set([0]), all = [0];
      for (let head = 0; head < all.length; head += 1) {
        for (const next of maze.links[all[head]]) if (!seen.has(next)) { seen.add(next); all.push(next); }
      }
      assert.equal(seen.size, SETTINGS.columns * SETTINGS.rows);
      assert.equal(maze.stats.cycles, SETTINGS.loops);
      for (let id = 0; id < maze.links.length; id += 1) {
        const [x, y] = maze.points[id].map(Math.floor);
        assert.equal(maze.walls.has(`${x},${y}`), false);
        assert.ok(maze.links[id].every(next => maze.links[next].includes(id)));
      }
      assert.equal(Object.hasOwn(maze, 'start'), false);
      assert.equal(Object.hasOwn(maze, 'exit'), false);
      const stats = measure(maze);
      samples.push({ ...maze, walls: [...maze.walls], stats,
        diameterPath: graphPath(maze, ...maze.stats.diameterEnds) });
    }
  }
  const summaries = Object.fromEntries(ALGORITHMS.map(algorithm => {
    const selected = samples.filter(sample => sample.algorithm === algorithm);
    const metrics = Object.fromEntries(METRICS.map(key => [key,
      distribution(selected.map(sample => sample.stats[key]))]));
    const edges = item => new Set(item.links.flatMap((list, id) =>
      list.filter(next => next > id).map(next => `${id},${next}`)));
    const reference = [...edges(selected[0])];
    const fixedEdges = reference.filter(edge => selected.every(sample => edges(sample).has(edge))).length;
    const summary = { count: selected.length, ...metrics,
      fullOuterFrames: selected.filter(sample => sample.stats.completeOuterFrame).length, fixedEdges };
    return [algorithm, { ...summary, representatives: representativeSeeds(selected, summary) }];
  }));
  return { schemaVersion: 1, generator: 'src/solo-levels/maze.js', generatorVersion: samples[0].version,
    settings: SETTINGS, algorithms: ALGORITHMS, labels: LABELS, seedRange: [1, 32],
    method: {
      diameter: '108节点图中任意两点最短路长度的最大值，宏观边长4格。没有选择出生点、出口或玩家通关路线。',
      diameterTurns: '生成器选取的一条直径示例的转弯次数；并列直径可能有不同转弯数。',
      blindBranch: '度数1的末端沿度数2链到最近岔点的长度。>=12格记为长盲支；此处未分配任务或出生点。',
      prim: '当前prim接口随机选择活跃点扩展；是Prim风格的Growing Tree变体，未宣称是按边界边均匀采样的经典Prim。',
      limits: '只验证生成结构与可重复性，不证明陷阱、声路、多怪物或真人体验；这些需要在选定原图后另行设计。',
    }, summaries, recommendations: recommendations(samples, summaries), samples };
}

function client() {
  const data = JSON.parse(document.getElementById('trial-data').textContent);
  const select = document.getElementById('sample');
  const svg = document.getElementById('maze');
  const ns = 'http://www.w3.org/2000/svg';
  let algorithm = 'growing-tree', seed = 1, zoom = 1;
  const text = (id, value) => { document.getElementById(id).textContent = value; };
  const element = (tag, attributes) => {
    const node = document.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    return node;
  };
  const samples = () => data.samples.filter(item => item.algorithm === algorithm);
  function draw() {
    const sample = samples().find(item => item.seed === seed);
    const walls = new Set(sample.walls);
    svg.replaceChildren();
    svg.setAttribute('aria-label', `${data.labels[algorithm]}，种子${seed}的原始迷宫，没有出生点或机关`);
    const title = element('title', {});
    title.textContent = `${data.labels[algorithm]} / seed ${seed} / 原始地形`;
    svg.append(title, element('rect', { width: 36, height: 48, fill: '#233446' }));
    let floor = '';
    for (let y = 0; y < 48; y += 1) {
      for (let x = 0; x < 36; x += 1) {
        if (walls.has(`${x},${y}`)) continue;
        const from = x;
        while (x + 1 < 36 && !walls.has(`${x + 1},${y}`)) x += 1;
        floor += `M${from} ${y}h${x - from + 1}v1h-${x - from + 1}z`;
      }
    }
    svg.append(element('path', { d: floor, fill: '#eef4ef', 'shape-rendering': 'crispEdges' }));
    if (document.getElementById('braids').checked) {
      for (const [a, b] of sample.braidEdges) {
        const [x, y] = sample.points[a], [tx, ty] = sample.points[b];
        svg.append(element('line', { x1: x + 0.5, y1: y + 0.5, x2: tx + 0.5, y2: ty + 0.5,
          stroke: '#d17a27', 'stroke-width': 0.36, 'stroke-linecap': 'round' }));
      }
    }
    if (document.getElementById('diameter').checked) {
      const points = sample.diameterPath.map(id => sample.points[id].map(value => value + 0.5).join(',')).join(' ');
      svg.append(element('polyline', { points, fill: 'none', stroke: '#8049ab', 'stroke-width': 0.28,
        'stroke-dasharray': '0.6 0.4', 'stroke-linejoin': 'round' }));
    }
    svg.style.width = `${420 * zoom}px`;
    svg.style.maxWidth = zoom === 1 ? '100%' : 'none';
    text('map-title', `${data.labels[algorithm]} · seed ${seed}`);
    text('sample-note', `36 × 48 · ${sample.stats.nodes}个宏观节点 · ${sample.stats.cycles}个环 · 原始底图`);
    const metrics = [
      ['地板格', sample.stats.floors], ['岔点', sample.stats.forks], ['死路末端', sample.stats.deadEnds],
      ['长盲支 ≥12格', sample.stats.longBlindBranches], ['最深盲支', `${sample.stats.maxDeadEndDepth}格`],
      ['图直径', `${sample.stats.diameterSteps}格`], ['直径示例转弯', sample.stats.diameterTurns],
      ['最长直段', `${sample.stats.maxStraightSteps}格`],
    ];
    const container = document.getElementById('metrics');
    container.replaceChildren(...metrics.map(([label, value]) => {
      const item = document.createElement('div'), strong = document.createElement('strong'), span = document.createElement('span');
      strong.textContent = value; span.textContent = label; item.append(strong, span); return item;
    }));
    const list = document.getElementById('braid-list');
    list.replaceChildren(...sample.stats.braids.map((braid, index) => {
      const item = document.createElement('li');
      item.textContent = `连接${index + 1}：原路${braid.detourBeforeSteps}格 → 新连边4格；加入时围成${braid.cycleStepsAtCreation}格的回环。`;
      return item;
    }));
    const recommendation = data.recommendations.find(item => item.algorithm === algorithm);
    text('algorithm-note', recommendation.reason);
    for (const button of document.querySelectorAll('[data-algorithm]')) {
      button.setAttribute('aria-pressed', String(button.dataset.algorithm === algorithm));
    }
    select.value = String(seed);
    const hash = `#${algorithm}-${seed}`;
    try { history.replaceState(null, '', hash); } catch { /* Direct file viewing may restrict history. */ }
  }
  function chooseAlgorithm(next, nextSeed = seed) {
    algorithm = next; seed = nextSeed;
    select.replaceChildren(...samples().map(sample => {
      const option = document.createElement('option'); option.value = sample.seed;
      option.textContent = `seed ${sample.seed} · 直径${sample.stats.diameterSteps} · ${sample.stats.forks}岔 / ${sample.stats.deadEnds}末端`;
      return option;
    }));
    const representatives = document.getElementById('representatives');
    representatives.replaceChildren(...data.summaries[algorithm].representatives.map(item => {
      const button = document.createElement('button'); button.className = 'quiet';
      button.textContent = `${item.label} · ${item.seed}`;
      button.onclick = () => { seed = item.seed; draw(); }; return button;
    }));
    draw();
  }
  for (const button of document.querySelectorAll('[data-algorithm]')) button.onclick = () => chooseAlgorithm(button.dataset.algorithm);
  select.onchange = () => { seed = Number(select.value); draw(); };
  document.getElementById('previous').onclick = () => { seed = seed === 1 ? 32 : seed - 1; draw(); };
  document.getElementById('next').onclick = () => { seed = seed === 32 ? 1 : seed + 1; draw(); };
  for (const id of ['braids', 'diameter']) document.getElementById(id).onchange = draw;
  document.getElementById('zoom-in').onclick = () => { zoom = Math.min(3, zoom + 0.5); draw(); };
  document.getElementById('zoom-out').onclick = () => { zoom = Math.max(1, zoom - 0.5); draw(); };
  document.getElementById('fit').onclick = () => { zoom = 1; draw(); };
  const match = location.hash.match(/^#(dfs|prim|growing-tree)-(\d+)$/);
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 32) { algorithm = match[1]; seed = Number(match[2]); }
  chooseAlgorithm(algorithm, seed);
}

function renderReport(data) {
  const format = metric => `${metric.mean} <small>${metric.min}–${metric.max}</small>`;
  const rows = ALGORITHMS.map(algorithm => {
    const s = data.summaries[algorithm];
    return `<tr><th scope="row">${LABELS[algorithm]}</th><td>${format(s.forks)}</td><td>${format(s.deadEnds)}</td><td>${format(s.maxDeadEndDepth)}</td><td>${format(s.diameterSteps)}</td><td>${format(s.diameterTurns)}</td><td>${format(s.maxStraightSteps)}</td></tr>`;
  }).join('');
  const groups = data.recommendations.map(item => `<article><span class="eyebrow">第${item.stages}关 · 候选底图</span><h3>${LABELS[item.algorithm]}</h3><p>${item.purpose}</p><p>${item.reason}</p><div class="seed-links">${item.seeds.map(seed => `<a href="#${item.algorithm}-${seed}" onclick="location.hash=this.hash;location.reload()">seed ${seed}</a>`).join('')}</div></article>`).join('');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>迷宫算法试用 · 96张原始底图</title>
<style>
:root{color-scheme:light;--ink:#203344;--muted:#62717c;--paper:#f5f3ec;--line:#d6dcd7;--accent:#126a62}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.65 system-ui,-apple-system,"PingFang SC",sans-serif}main{max-width:1180px;margin:auto;padding:36px 24px 64px}h1,h2,h3,p{margin:0}h1{font-size:clamp(28px,4vw,42px);letter-spacing:-.04em;line-height:1.2}h2{font-size:23px;margin-bottom:12px}h3{font-size:18px;margin:5px 0 8px}.eyebrow{color:var(--accent);font-size:12px;font-weight:750;letter-spacing:.08em}header p{max-width:800px;color:var(--muted);margin-top:14px}.badge{display:inline-block;background:#e0ebe5;border:1px solid #c5d9d0;border-radius:30px;padding:4px 11px;margin-top:18px;font-size:13px}section{margin-top:30px}.toolbar,.options,.sample-row,.representatives,.zoom{display:flex;align-items:center;gap:9px;flex-wrap:wrap}button,select{font:inherit;color:var(--ink);border:1px solid #b9c6c1;border-radius:9px;background:#fff;padding:9px 13px;cursor:pointer}button:hover,a:hover{background:#e5efe8}button:focus-visible,select:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #d17a27;outline-offset:3px}button[aria-pressed=true]{background:var(--accent);color:#fff;border-color:var(--accent)}button.quiet{font-size:12px;padding:5px 9px;background:transparent}select{max-width:100%;min-width:0;flex:1}.sample-row{margin:15px 0 10px}.representatives{margin-bottom:12px}.lab{display:grid;grid-template-columns:minmax(320px,1.1fr) minmax(280px,1fr);gap:24px}.panel{min-width:0;background:#fffdf8;border:1px solid var(--line);border-radius:15px;padding:20px}.map-window{height:610px;max-height:76vh;overflow:auto;border-radius:9px;background:#233446;margin-top:12px;display:flex;align-items:flex-start;justify-content:flex-start}.map-window svg{display:block;flex:none;margin:0 auto;height:auto}.caption{font-size:12px;color:var(--muted)}.options{font-size:13px;margin-top:14px}.options label{display:flex;gap:5px;align-items:center}.zoom{margin-top:12px}.zoom button{font-size:12px;padding:5px 10px}.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;margin-top:10px}.swatch{display:inline-block;width:11px;height:11px;margin-right:6px;vertical-align:middle;border:1px solid #aebdb6}.wall{background:#233446}.floor{background:#eef4ef}.orange{background:#d17a27}.purple{background:#8049ab}.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden;margin:16px 0}.metrics div{background:#fffdf8;padding:11px 14px}.metrics strong{display:block;font-size:25px;line-height:1.3}.metrics span{font-size:12px;color:var(--muted)}.note{border-left:3px solid var(--accent);padding:9px 13px;background:#eaf1e9;font-size:13px;margin:14px 0}.detail{font-size:13px;color:var(--muted)}.detail ol{padding-left:20px}table{border-collapse:collapse;width:100%;background:#fffdf8;font-size:13px}th,td{text-align:left;border-bottom:1px solid var(--line);padding:12px;white-space:nowrap}thead th{color:var(--muted);font-weight:650}td small{display:block;color:var(--muted)}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:12px}.conclusions,.groups{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:16px}.conclusions article,.groups article{border-top:2px solid #99b1a5;padding:16px 4px}.conclusions p,.groups p{font-size:13px;margin-bottom:10px;color:var(--muted)}.seed-links{display:flex;gap:7px;flex-wrap:wrap}a{color:var(--accent)}.seed-links a{border:1px solid #b9c6c1;border-radius:7px;padding:3px 8px;text-decoration:none;font-size:12px}details{border-top:1px solid var(--line);padding-top:16px;font-size:13px;color:var(--muted)}summary{cursor:pointer;font-weight:700;color:var(--ink)}code{background:#e8ece5;border-radius:4px;padding:2px 5px}footer{margin-top:28px;font-size:12px;color:var(--muted)}@media(max-width:760px){main{padding:24px 14px 40px}.lab{grid-template-columns:1fr;gap:15px}.panel{padding:15px}.map-window{height:auto;max-height:72vh}.conclusions,.groups{grid-template-columns:1fr;gap:0}.toolbar button{flex:1;padding:9px 6px;font-size:13px}.sample-row button{padding:8px}.caption{font-size:11px}}
</style></head><body><main>
<header><span class="eyebrow">先生成地形，再设计关卡</span><h1>迷宫算法试用</h1><p>三种算法，各取 seed 1–32。全部96张底图先生成，再比较岔路、盲支与曲折程度。这里还没有出生点、出口、机关、陷阱或怪物。</p><span class="badge">36 × 48 · 9 × 12节点 · 每张局部加4环 · 全部样本可切换</span></header>
<section aria-label="迷宫样本浏览"><div class="toolbar">${ALGORITHMS.map(algorithm => `<button data-algorithm="${algorithm}" aria-pressed="false">${LABELS[algorithm]}</button>`).join('')}</div><div class="sample-row"><label for="sample">样本</label><select id="sample"></select><button id="previous" aria-label="上一个种子">←</button><button id="next" aria-label="下一个种子">→</button></div><div id="representatives" class="representatives"></div>
<div class="lab"><article class="panel"><h2 id="map-title"></h2><p id="sample-note" class="caption"></p><div class="map-window"><svg id="maze" viewBox="0 0 36 48" role="img"></svg></div><div class="legend"><span><i class="swatch wall"></i>实墙</span><span><i class="swatch floor"></i>可走地板</span><span><i class="swatch orange"></i>后加连接</span><span><i class="swatch purple"></i>直径示例</span></div><div class="options"><label><input id="braids" type="checkbox">显示4处后加连接</label><label><input id="diameter" type="checkbox">显示直径示例（非通关路线）</label></div><div class="zoom"><button id="zoom-out">缩小</button><button id="zoom-in">放大</button><button id="fit">适应宽度</button></div></article>
<aside class="panel"><span class="eyebrow">当前原图的结构</span><div id="metrics" class="metrics"></div><p class="note">图直径是“所有点对最短路中的最长值”。它没有指定出生与出口，不等于玩家路线、完整任务步数或难度。</p><p id="algorithm-note" class="detail"></p><div class="detail"><h3>4处局部加环</h3><p>先生成树，再打开4处连接。以下比较每次打开前的绕路与新连接；不是玩家操作方案。</p><ol id="braid-list"></ol></div></aside></div></section>
<section><h2>32个 seed 的整体比较</h2><p class="caption">每格第一行是均值，第二行是最小–最大。地板均为${data.summaries.dfs.floors.mean}格、节点均为108、环均为4；比较的是连接形态。</p><div class="table-wrap"><table><thead><tr><th>算法</th><th>岔点</th><th>死路末端</th><th>最深盲支 / 格</th><th>图直径 / 格</th><th>直径示例转弯</th><th>最长直段 / 格</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="conclusions"><article><h3>DFS：长程更曲折</h3><p>平均图直径${data.summaries.dfs.diameterSteps.mean}格、${data.summaries.dfs.diameterTurns.mean}次转弯。岔点较少，长链更明显；需要给长支安排可读线索和恢复，避免单纯走长路。</p></article><article><h3>Prim风格：近处分支多</h3><p>平均${data.summaries.prim.forks.mean}个岔点、${data.summaries.prim.deadEnds.mean}个末端，图直径较短。适合局部观察与换路；不能把所有盲支都塞成任务。</p></article><article><h3>Growing Tree：中间形态</h3><p>最新点偏好0.65。平均图直径${data.summaries['growing-tree'].diameterSteps.mean}格，岔点${data.summaries['growing-tree'].forks.mean}个。保留长链，也有较多可分工的支路。</p></article></div><p class="note">96张样本中，完整外框回环共${data.samples.filter(sample => sample.stats.completeOuterFrame).length}张。没有强制外框或内矩形；4环来自实际树结构上的局部连接。环数相同，也不代表路线或体验相同。</p></section>
<section><h2>供三组关卡继续设计的候选</h2><p class="caption">以下只选底图。出生、跨区目标、陷阱、多怪物、安全观察位和两条通关策略，都要在这些真实迷宫上另行设计与验证。</p><div class="groups">${groups}</div></section>
<section><details><summary>口径、实现与复现</summary><p>${data.method.diameter}</p><p>${data.method.diameterTurns}</p><p>${data.method.blindBranch}</p><p>${data.method.prim}</p><p>原图数据由当前共享生成器实际生成；页面内嵌全部96个样本，离线不请求网络。JSON保留完整walls、points、links、braidEdges、seed、统计与直径示例。每张检查108节点连通、连接对称、恰好4环及节点位于地板。</p><p>${data.method.limits}</p><p>仓库根目录运行 <code>node scripts/trial-solo-mazes.js</code> 可重建HTML和JSON。</p></details></section>
<footer>数据来源：src/solo-levels/maze.js，生成器版本${data.generatorVersion}。<a href="maze-algorithm-trials.json" download>下载完整JSON</a> · 真人盲测待进行。</footer>
</main><script id="trial-data" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script><script>(${client.toString()})();</script></body></html>`;
}

function main() {
  const data = collectTrials();
  const directory = path.resolve(__dirname, '../output/trials');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'maze-algorithm-trials.json'), `${JSON.stringify(data, null, 2)}\n`);
  fs.writeFileSync(path.join(directory, 'maze-algorithm-trials.html'), renderReport(data));
  console.log(JSON.stringify({ samples: data.samples.length, summaries: data.summaries,
    recommendations: data.recommendations }, null, 2));
}

if (require.main === module) main();
module.exports = { collectTrials, renderReport };
