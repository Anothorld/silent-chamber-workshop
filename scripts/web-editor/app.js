const { SIZES, createBlankDraft } = require('../../src/ugc/model');
const { OBJECT_BY_TYPE } = require('../../src/ugc/objects');
const { createEditorState, beginStroke, endStroke, cancelStroke, applyEditorAction, canStartObject, undo, redo } = require('../../src/ugc/editor');
const { validateDraft } = require('../../src/ugc/validation');
const { encodeLevel } = require('../../src/ugc/codec');
const { generateEditableTerrain } = require('../../src/level-generator');
const { TERRAIN, paintRegion, floodFill, entities, entityAt, moveEntity, importDraft, makeExample } = require('./core');
const { GROUPS, ITEMS, icon } = require('./palette');
const { createMap } = require('./map');
const { createPreview } = require('./preview');
const { TEMPO_OPTIONS, PHASE_OPTIONS, ALTERNATING_HINT, timingSummary } = require('../../src/ugc/hazard-timing');

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'echo.level-studio.draft.v1';
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let toastTimer, saveTimer, storageError;
function toast(message, error = false) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.toggle('error-toast', error); $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, error ? 5500 : 2600);
}
let initial = makeExample();
try { const stored = localStorage.getItem(STORAGE_KEY); if (stored) initial = importDraft(stored); }
catch (_) { storageError = '本地草稿无法读取，已打开示例。可通过导入恢复备份。'; }
const state = { editor: createEditorState(initial), tool: 'wall', mode: 'brush', group: 'all', hover: null,
  pending: null, selection: null, gesture: null, space: false, brushSize: 1, timing: { tempo: 1, phase: 0, dir: 1 } };
for (const node of document.querySelectorAll('[data-icon]')) node.insertAdjacentHTML('afterbegin', icon(node.dataset.icon));
for (const node of document.querySelectorAll('[data-symbol]')) node.innerHTML = icon(node.dataset.symbol);
const map = createMap($('map'), $('minimap'), () => state);
const preview = createPreview(() => { $('map').focus(); map.draw(); }, message => toast(message, true));
const dialog = $('file-dialog');

function save(silent = false) {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.editor.stroke?.before || state.editor.draft));
    $('save-status').innerHTML = '<span class="status-dot"></span>所有更改已保存';
    if (!silent) toast('草稿已保存在当前浏览器');
    return true;
  } catch (_) {
    $('save-status').textContent = '保存失败 · 请导出备份';
    if (!silent || !storageError) toast('本地存储不可用，请导出 JSON 保存草稿', true);
    storageError = 'unavailable'; return false;
  }
}
function changed({ fit = false } = {}) {
  state.selection = null; refresh(); map.draw(); if (fit) map.fit();
  $('save-status').innerHTML = '<span class="status-dot"></span>正在保存…';
  clearTimeout(saveTimer); saveTimer = setTimeout(() => save(true), 350);
}
function setMode(mode) {
  finishGesture(true); state.mode = mode; state.pending = null; refreshTools(); refreshAsset(); map.draw();
}
function selectTool(tool) {
  finishGesture(true); state.tool = tool; state.pending = null; state.selection = null;
  if (state.mode === 'select' || !(tool in TERRAIN)) state.mode = 'brush';
  refreshPalette(); refreshTools(); refreshInspector(); map.draw();
}
function refreshPalette() {
  const scrollTop = $('palette').scrollTop;
  const query = $('search').value.trim().toLowerCase();
  $('categories').innerHTML = [['all', '全部'], ...GROUPS.map(group => [group.id, group.name])].map(([id, name]) =>
    `<button data-group="${id}" class="${state.group === id ? 'active' : ''}" aria-pressed="${state.group === id}">${name}</button>`).join('');
  let count = 0;
  $('palette').innerHTML = GROUPS.filter(group => state.group === 'all' || group.id === state.group).map(group => {
    const items = group.items.filter(([kind, name, description]) => `${kind} ${name} ${description} ${ITEMS[kind].keywords || ''}`.toLowerCase().includes(query)); count += items.length;
    return items.length ? `<section><h3>${group.name}<span>${String(items.length).padStart(2, '0')}</span></h3><div class="asset-list">${items.map(([kind, name, desc]) =>
      `<button class="asset ${state.tool === kind ? 'active' : ''}" data-tool="${kind}" aria-pressed="${state.tool === kind}" aria-label="${esc(name)} · ${esc(desc)}" title="${esc(name)} · ${esc(desc)}">${icon(kind)}<span class="asset-copy"><span class="asset-title"><strong>${esc(name)}</strong><code>${esc(kind)}</code></span><small>${esc(desc)}</small></span></button>`).join('')}</div></section>` : '';
  }).join('');
  if (!count) $('palette').innerHTML = '<p class="empty-search">没有找到对应素材<br>试试“墙”“声”或“敌人”</p>';
  $('palette').scrollTop = scrollTop;
}
function refreshTools() {
  for (const button of document.querySelectorAll('[data-mode]')) {
    const active = state.mode === button.dataset.mode;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', active);
    button.disabled = ['rectangle', 'fill'].includes(button.dataset.mode) && !(state.tool in TERRAIN) && state.tool !== 'erase';
    if (button.dataset.mode === 'fill' && state.tool === 'erase') button.disabled = true;
  }
  $('eraser').classList.toggle('active', state.tool === 'erase'); $('eraser').setAttribute('aria-pressed', state.tool === 'erase');
  $('brush-size').disabled = state.mode !== 'brush' || !(state.tool in TERRAIN) && state.tool !== 'erase';
  $('undo').disabled = !state.editor.past.length; $('redo').disabled = !state.editor.future.length;
  const modes = { select: '选择与移动', brush: '画笔', rectangle: '矩形', fill: '连通填充' };
  $('tool-status').textContent = `${modes[state.mode]} · ${ITEMS[state.tool].name}`;
  $('interaction-hint').textContent = state.mode === 'select' ? '点击选择 · 拖动对象 · Delete 删除 · 空格平移' :
    state.mode === 'rectangle' ? '拖动框选区域 · 松开填满 · Esc 取消' : state.mode === 'fill' ? '点击填充连通区域 · ⌘/Ctrl Z 撤销' : '左键绘制 · 右键擦除 · 空格拖动平移';
  $('map').style.cursor = state.space || state.gesture?.type === 'pan' ? 'grab' : state.mode === 'select' ? 'default' : 'crosshair';
  $('pair-hint').hidden = !state.pending;
  if (state.pending) $('pair-hint').textContent = `${ITEMS[state.tool].name}：点击第二个位置完成连线 · Esc 取消`;
}
function refreshAsset() {
  const item = ITEMS[state.tool];
  $('current-asset').innerHTML = `<div class="asset-preview">${icon(state.tool)}</div><div>${item.name}<small>${state.tool.toUpperCase()}</small></div>`;
  $('asset-description').textContent = item.description;
  $('placement-note').textContent = OBJECT_BY_TYPE[state.tool]?.pair ? '↗ 分两次点击放置；选择工具可移动任一端点。' :
    ['launcher', 'lockedWall'].includes(state.tool) ? '▧ 需要放在墙体上。' :
      state.tool in TERRAIN || state.tool === 'erase' ? '↳ 支持拖动绘制。外边界始终保持为墙体。' : '↳ 放在空地上；不能与已有物件重叠。';
  const kind = state.selection?.kind || state.tool, details = ITEMS[kind].details || [];
  $('behavior-section').hidden = !details.length;
  $('behavior-heading').textContent = `${state.selection ? '选中对象' : '当前素材'}规则 · ${kind.toUpperCase()}`;
  $('behavior-details').innerHTML = details.map(([label, text]) => `<dt>${esc(label)}</dt><dd>${esc(text)}</dd>`).join('');
}
function hazardProperties(timing, kind, placement = false) {
  const row = (label, key, values) => `<label class="property-row">${label}<select data-timing="${key}" data-placement="${placement}" aria-label="${label}">${values.map(([value, text]) => `<option value="${value}" ${timing[key] === value ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`;
  return `<p class="property-hint">${placement ? '后续放置默认值' : '当前对象设置'}</p>` +
    row(placement ? '放置节奏' : '节奏', 'tempo', TEMPO_OPTIONS) +
    row(placement ? '放置相位' : '相位', 'phase', PHASE_OPTIONS) +
    (kind === 'launcher' ? row(placement ? '放置弓箭朝向' : '方向', 'dir', [[0, '↑ 上'], [1, '→ 右'], [2, '↓ 下'], [3, '← 左']]) : '') +
    `<p class="property-hint">${timingSummary(timing.tempo, timing.phase)}<br>${ALTERNATING_HINT}。</p>`;
}
function refreshInspector() {
  refreshAsset();
  const selected = state.selection;
  $('selection-count').textContent = selected ? '1 个对象' : '未选择';
  $('selection').className = selected ? '' : 'selection-empty'; $('object-properties').innerHTML = '';
  if (selected) {
    const at = selected.endpoint ? { x: selected.toX, y: selected.toY } : selected;
    $('selection').innerHTML = `<div class="selected-object">${icon(selected.kind)}<span>${ITEMS[selected.kind].name}${selected.endpoint ? ' · 终点' : ''}</span><button id="delete-object" class="text-button" title="删除整个对象">删除</button></div>
      <div class="coordinate-row"><label>X<input id="object-x" type="number" aria-label="对象 X 坐标" value="${at.x}"></label><label>Y<input id="object-y" type="number" aria-label="对象 Y 坐标" value="${at.y}"></label></div>`;
    if (['spike', 'launcher'].includes(selected.kind)) {
      $('object-properties').innerHTML = hazardProperties(selected, selected.kind);
    }
    $('object-properties').insertAdjacentHTML('beforeend', '<p class="property-hint">拖动对象或输入坐标调整位置。修改可撤销。</p>');
  } else {
    $('selection').innerHTML = '切换选择工具，点击地图中的对象<br>拖动即可调整位置';
    if (['spike', 'launcher'].includes(state.tool)) {
      $('object-properties').innerHTML = hazardProperties(state.timing, state.tool, true);
    }
  }
}
function refreshValidation() {
  const { errors, warnings } = validateDraft(state.editor.draft);
  const messages = errors.map(error => ({ ...error, message: error.code === 'start' ? '请在地面放置一个玩家起点' : error.code === 'exit' ? '请在地面放置一个关卡出口' : error.message }));
  $('validation').innerHTML = `<div class="check-head ${errors.length ? 'invalid' : ''}"><span class="check-badge">${errors.length ? '!' : '✓'}</span>${errors.length ? `${errors.length} 项需要修复` : '可以进入真实场景'}</div>` +
    (errors.length ? messages.slice(0, 5).map(error => `<div class="issue error-item">· ${esc(error.message)}</div>`).join('') : '<div class="check-note">起点与出口完整 · 路径可达<br>试玩时可检查机关、节奏与通关体验</div>') +
    warnings.map(warning => `<div class="issue">△ ${esc(warning.message)}</div>`).join('');
  return errors;
}
function refresh() {
  $('level-name').value = state.editor.draft.name;
  const [w, h] = SIZES[state.editor.draft.size]; $('map-dimensions').textContent = `${w} × ${h}`;
  $('object-count').textContent = `${entities(state.editor.draft).length} 个物件`;
  $('size-label').textContent = `${{ small: '小型', medium: '中型', large: '大型' }[state.editor.draft.size]} · ${w} × ${h}`;
  refreshPalette(); refreshTools(); refreshInspector(); refreshValidation();
}
function rename() {
  const name = $('level-name').value.trim();
  if (!name || [...name].length > 16 || new TextEncoder().encode(name).length > 48) {
    $('level-name').value = state.editor.draft.name; toast('名称须为 1–16 个字，最多 48 字节', true); return;
  }
  if (name !== state.editor.draft.name) {
    applyEditorAction(state.editor, { type: 'replace', draft: { ...state.editor.draft, name } }); changed();
  }
}

function finishGesture(cancel = false, at = state.hover) {
  const gesture = state.gesture; if (!gesture) return;
  state.gesture = null;
  if (cancel) { cancelStroke(state.editor); map.draw(); refreshTools(); return; }
  if (gesture.type === 'rectangle' && at) paintRegion(state.editor, gesture.tool, gesture.from, at, { shape: 'rectangle' });
  if (gesture.type === 'move' && at && (at.x !== gesture.from.x || at.y !== gesture.from.y)) {
    if (!moveEntity(state.editor, gesture.entity, at)) toast('这个位置无法放置该对象，请检查地形或重叠', true);
    else {
      const entity = entityAt(state.editor.draft, at.x, at.y); changed(); state.selection = entity; refreshInspector(); map.draw(); return;
    }
  }
  if (gesture.type === 'brush') endStroke(state.editor);
  if (['brush', 'rectangle'].includes(gesture.type)) changed();
  refreshTools(); map.draw();
}
function placePair(at) {
  if (!state.pending) {
    if (!canStartObject(state.editor.draft, state.tool, at.x, at.y)) { toast('请选择未被占用的地面格', true); return; }
    state.pending = { ...at }; refreshTools(); map.draw(); return;
  }
  if (applyEditorAction(state.editor, { type: 'place', kind: state.tool, ...state.pending, toX: at.x, toY: at.y })) {
    state.pending = null; changed();
  } else toast('第二个位置不可用，请选择其他地面格，Esc 可取消', true);
}
const canvas = $('map');
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('pointerdown', event => {
  if (preview.active() || dialog.open || ![0, 1, 2].includes(event.button)) return;
  canvas.focus(); event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  const at = map.cell(event); state.hover = at;
  if (event.button === 1 || state.space) {
    state.gesture = { type: 'pan', clientX: event.clientX, clientY: event.clientY, x: map.view.x, y: map.view.y }; refreshTools(); return;
  }
  if (!at) return;
  const tool = event.button === 2 ? 'erase' : state.tool;
  if (state.mode === 'select' && event.button !== 2) {
    const entity = entityAt(state.editor.draft, at.x, at.y); state.selection = entity;
    if (entity) state.gesture = { type: 'move', entity, from: at };
    refreshInspector(); map.draw(); return;
  }
  state.selection = null;
  if (OBJECT_BY_TYPE[tool]?.pair) { placePair(at); return; }
  if (state.mode === 'fill' && tool in TERRAIN) { floodFill(state.editor, at, tool); changed(); return; }
  if (state.mode === 'rectangle' && (tool in TERRAIN || tool === 'erase')) {
    state.gesture = { type: 'rectangle', from: at, tool }; map.draw(); return;
  }
  if (tool in TERRAIN || tool === 'erase') {
    beginStroke(state.editor); state.gesture = { type: 'brush', from: at, last: at, tool };
    paintRegion(state.editor, tool, at, at, { brushSize: state.brushSize }); map.draw();
  } else {
    if (paintRegion(state.editor, tool, at, at, { timing: state.timing })) changed();
    else toast(['launcher', 'lockedWall'].includes(tool) ? '请放在合适的墙体上；弓箭需要朝向相邻地面' : '无法放置：检查地面、物件重叠或数量上限', true);
  }
});
canvas.addEventListener('pointermove', event => {
  const at = map.cell(event); state.hover = at;
  $('coordinates').textContent = at ? `X ${String(at.x).padStart(2, '0')}   Y ${String(at.y).padStart(2, '0')}` : 'X —   Y —';
  const gesture = state.gesture;
  if (gesture?.type === 'pan') {
    map.view.x = gesture.x + event.clientX - gesture.clientX; map.view.y = gesture.y + event.clientY - gesture.clientY;
  }
  if (gesture?.type === 'brush' && at) {
    paintRegion(state.editor, gesture.tool, gesture.last, at, { brushSize: state.brushSize }); gesture.last = at;
  }
  map.draw();
});
canvas.addEventListener('pointerup', event => { finishGesture(false, map.cell(event)); if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); });
canvas.addEventListener('pointercancel', () => finishGesture(true));
canvas.addEventListener('lostpointercapture', () => { if (state.gesture) finishGesture(true); });
canvas.addEventListener('pointerleave', () => { if (!state.gesture) { state.hover = null; map.draw(); } });
canvas.addEventListener('wheel', event => {
  event.preventDefault(); const r = canvas.getBoundingClientRect();
  map.zoom(Math.exp(-event.deltaY * (event.ctrlKey ? .012 : .002)), event.clientX - r.left, event.clientY - r.top);
}, { passive: false });

$('categories').onclick = event => { const button = event.target.closest('[data-group]'); if (button) { state.group = button.dataset.group; $('palette').scrollTop = 0; refreshPalette(); } };
$('palette').onclick = event => { const button = event.target.closest('[data-tool]'); if (button) selectTool(button.dataset.tool); };
$('search').oninput = () => { $('palette').scrollTop = 0; refreshPalette(); };
for (const button of document.querySelectorAll('[data-mode]')) button.onclick = () => setMode(button.dataset.mode);
$('eraser').onclick = () => selectTool('erase');
$('brush-size').onchange = () => { state.brushSize = Number($('brush-size').value); map.draw(); };
function history(direction) {
  finishGesture(true); state.pending = null; const size = state.editor.draft.size;
  if (direction(state.editor)) changed({ fit: size !== state.editor.draft.size });
}
$('undo').onclick = () => history(undo); $('redo').onclick = () => history(redo);
$('zoom-in').onclick = () => map.zoom(1.25); $('zoom-out').onclick = () => map.zoom(.8);
$('fit').onclick = $('zoom-value').onclick = () => map.fit();
$('grid').onclick = () => { map.view.grid = !map.view.grid; $('grid').setAttribute('aria-pressed', map.view.grid); map.draw(); };
$('level-name').onchange = rename;
$('validate').onclick = () => { const errors = refreshValidation(); toast(errors.length ? '请先修复右侧列出的问题' : '检查通过，可以进入快速预览', !!errors.length); };
function startPreview() {
  finishGesture(false); state.pending = null; rename(); save(true); refreshTools();
  if (refreshValidation().length) { toast('暂时无法预览，请修复右侧关卡检查中的问题', true); return; }
  try { preview.start(state.editor.draft); } catch (error) { toast(`预览未启动：${error.message}`, true); }
}
$('preview').onclick = startPreview;
function deleteSelection() {
  if (!state.selection) return;
  const d = JSON.parse(JSON.stringify(state.editor.draft)), item = state.selection;
  if (['start', 'exit', 'mechanism'].includes(item.kind)) d[item.kind] = null;
  else if (['guard', 'spike', 'launcher'].includes(item.kind)) d[{ guard: 'guards', spike: 'spikes', launcher: 'launchers' }[item.kind]].splice(item.index, 1);
  else d.objects.splice(item.index, 1);
  applyEditorAction(state.editor, { type: 'replace', draft: d }); changed();
}
$('selection').addEventListener('click', event => { if (event.target.closest('#delete-object')) deleteSelection(); });
$('selection').addEventListener('change', event => {
  if (!['object-x', 'object-y'].includes(event.target.id)) return;
  const to = { x: Number($('object-x').value), y: Number($('object-y').value) };
  if (moveEntity(state.editor, state.selection, to)) {
    changed(); state.selection = entityAt(state.editor.draft, to.x, to.y); refreshInspector(); map.draw();
  } else { toast('坐标无效或目标位置不可用', true); refreshInspector(); }
});
$('object-properties').addEventListener('change', event => {
  const key = event.target.dataset.timing; if (!key) return;
  if (event.target.dataset.placement === 'true') {
    state.timing[key] = Number(event.target.value); refreshInspector(); return;
  }
  if (!state.selection) return;
  const item = state.selection;
  if (applyEditorAction(state.editor, { type: 'timing', kind: item.kind, x: item.x, y: item.y, [key]: Number(event.target.value) })) {
    changed(); state.selection = entityAt(state.editor.draft, item.x, item.y); refreshInspector(); map.draw();
  } else { toast('这个方向没有相邻地面，请选择其他方向', true); refreshInspector(); }
});

function openDialog(title, body, footer) {
  finishGesture(true); rename(); state.pending = null; refreshTools();
  $('dialog-title').textContent = title; $('dialog-body').innerHTML = body; $('dialog-footer').innerHTML = footer;
  $('dialog-error').textContent = ''; dialog.showModal();
}
function replaceDraft(draft) { applyEditorAction(state.editor, { type: 'replace', draft }); state.pending = null; changed({ fit: true }); dialog.close(); }
$('new').onclick = () => {
  openDialog('开始一个新关卡', '<p>从空白地图开始，或用迷宫作为创作底图。此操作将替换当前草稿，可通过撤销恢复；需要长期保留的作品请先导出。</p><label>关卡名称<input id="new-name" value="我的新关卡" maxlength="16"></label><div class="size-options">' +
    [['small', '小型', '36 × 48'], ['medium', '中型', '54 × 72'], ['large', '大型', '72 × 96']].map(([value, title, size], i) => `<label><input type="radio" name="map-size" value="${value}" ${i ? '' : 'checked'}><span>${title}<br><small>${size}</small></span></label>`).join('') + '</div><p class="dialog-info">空白地图需要自行放置起点和出口。迷宫已配置基础路线，可以继续添加敌人与机关。</p>',
    '<button type="button" id="create-example">打开示例</button><button type="button" id="create-maze">生成迷宫</button><button type="button" id="create-blank" class="primary">创建空白地图</button>');
  const create = generated => {
    const size = dialog.querySelector('input[name="map-size"]:checked').value, name = $('new-name').value.trim();
    if (!name || [...name].length > 16 || new TextEncoder().encode(name).length > 48) { $('dialog-error').textContent = '名称须为 1–16 个字，最多 48 字节'; return; }
    try {
      const draft = generated ? generateEditableTerrain(crypto.getRandomValues(new Uint32Array(1))[0], size) : createBlankDraft(size);
      draft.name = name; replaceDraft(draft); toast(generated ? '迷宫已生成，可以继续编辑' : '地图已创建，先试着放置起点和出口');
    } catch (error) { $('dialog-error').textContent = error.message; }
  };
  $('create-blank').onclick = () => create(false); $('create-maze').onclick = () => create(true); $('create-example').onclick = () => replaceDraft(makeExample());
};
$('import').onclick = () => {
  openDialog('导入关卡', '<p>粘贴已保存的 ECL 关卡码，或打开之前导出的 JSON 草稿。导入后可以撤销。</p><textarea id="import-text" aria-label="关卡码或 JSON" placeholder="ECL1–4 关卡码 / JSON 草稿" spellcheck="false"></textarea><label class="file-drop">从电脑选择文件<input id="import-file" type="file" accept=".json,.txt,.ecl,application/json,text/plain"></label>',
    '<button value="cancel">取消</button><button type="button" id="import-confirm" class="primary">导入并编辑</button>');
  $('import-file').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 262144) { $('dialog-error').textContent = '文件过大，最多支持 256 KB'; return; }
    try { $('import-text').value = await file.text(); $('dialog-error').textContent = ''; } catch (_) { $('dialog-error').textContent = '文件读取失败，请重新选择'; }
  };
  $('import-confirm').onclick = () => {
    try { const draft = importDraft($('import-text').value); replaceDraft(draft); toast('导入成功，草稿已保存'); }
    catch (error) { $('dialog-error').textContent = /^level-code-/.test(error.message) ? '关卡码无效、损坏或包含不可达位置，请检查后重试' : error.message; }
  };
};
function download(text, extension) {
  const url = URL.createObjectURL(new Blob([text], { type: extension === 'json' ? 'application/json' : 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = `${state.editor.draft.name.replace(/[\\/:*?"<>|]/g, '_')}.${extension}`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('export').onclick = () => {
  save(true); let format = 'json', output;
  openDialog('导出你的关卡', '<p>JSON 保存完整草稿，支持未完成地图；关卡码可在小游戏工坊手动粘贴，审核通过后即可导入。</p><div class="categories" style="margin:16px 0 0"><button type="button" id="format-json" class="active">草稿 JSON</button><button type="button" id="format-code">游戏关卡码</button></div><textarea id="export-text" aria-label="导出内容" readonly spellcheck="false"></textarea>',
    '<button type="button" id="copy-export">复制内容</button><button type="button" id="download-export" class="primary">下载 JSON</button>');
  const update = value => {
    try {
      output = value === 'json' ? JSON.stringify(state.editor.draft, null, 2) : encodeLevel(state.editor.draft);
      format = value; $('export-text').value = output; $('dialog-error').textContent = '';
      $('format-json').classList.toggle('active', value === 'json'); $('format-code').classList.toggle('active', value === 'code');
      $('download-export').textContent = value === 'json' ? '下载 JSON' : '下载关卡码';
    } catch (_) { $('dialog-error').textContent = '生成关卡码前，请先修复右侧关卡检查中的问题。当前仍可导出 JSON。'; }
  };
  $('format-json').onclick = () => update('json'); $('format-code').onclick = () => update('code');
  $('download-export').onclick = () => download(output, format === 'json' ? 'json' : 'txt');
  $('copy-export').onclick = async () => {
    try { await navigator.clipboard.writeText(output); toast('已复制到剪贴板'); }
    catch (_) { $('export-text').focus(); $('export-text').select(); toast('请按 ⌘/Ctrl C 复制选中的内容'); }
  }; update('json');
};
function showHelp() {
  const shortcuts = [['选择 / 画笔 / 矩形 / 填充', 'V / B / R / F'], ['橡皮擦 / 临时擦除', 'X / 右键拖动'], ['移动画布', '空格 + 拖动 / 中键'], ['以指针为中心缩放', '滚轮'], ['撤销 / 重做', '⌘ Ctrl Z / Shift Z'], ['保存草稿', '⌘ Ctrl S'], ['适应画布 / 网格', '0 / G'], ['快速预览 / 返回编辑', 'P / Esc'], ['删除所选对象 / 取消操作', 'Delete / Esc'], ['搜索素材', '/']];
  openDialog('让创作快一点', '<div class="shortcut-list">' + shortcuts.map(([label, keys]) => `<span>${label}</span><kbd>${keys}</kbd>`).join('') + '</div><p class="dialog-info">小游戏工坊可导入经审核的关卡码。草稿只保存在当前浏览器，重要作品请下载 JSON 备份。</p>', '<button value="cancel" class="primary">开始创作</button>');
}
$('help').onclick = $('shortcuts').onclick = showHelp;
document.addEventListener('keydown', event => {
  if (preview.active() || dialog.open || event.isComposing) return;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
  const mod = event.ctrlKey || event.metaKey;
  if (mod && event.code === 'KeyS') { event.preventDefault(); rename(); save(); return; }
  if (typing) return;
  if (mod && event.code === 'KeyZ') { event.preventDefault(); history(event.shiftKey ? redo : undo); return; }
  if (mod && event.code === 'KeyY') { event.preventDefault(); history(redo); return; }
  if (mod || event.altKey) return;
  if (event.code === 'Space') { event.preventDefault(); state.space = true; refreshTools(); return; }
  if (event.code === 'Escape') { finishGesture(true); state.pending = null; state.selection = null; refreshTools(); refreshInspector(); map.draw(); return; }
  if (['Delete', 'Backspace'].includes(event.code)) { event.preventDefault(); deleteSelection(); return; }
  const mode = { KeyV: 'select', KeyB: 'brush', KeyR: 'rectangle', KeyF: 'fill' }[event.code];
  if (mode) { event.preventDefault(); if (['rectangle', 'fill'].includes(mode) && !(state.tool in TERRAIN)) selectTool('wall'); setMode(mode); return; }
  if (event.code === 'KeyX') selectTool('erase');
  if (event.code === 'KeyP') { event.preventDefault(); startPreview(); }
  if (event.code === 'KeyG') $('grid').click();
  if (event.code === 'Digit0') map.fit();
  if (['Equal', 'NumpadAdd'].includes(event.code)) map.zoom(1.25);
  if (['Minus', 'NumpadSubtract'].includes(event.code)) map.zoom(.8);
  if (event.code === 'Slash') { event.preventDefault(); if (event.shiftKey) showHelp(); else $('search').focus(); }
});
document.addEventListener('keyup', event => { if (event.code === 'Space') { state.space = false; refreshTools(); } });
window.addEventListener('blur', () => { state.space = false; finishGesture(true); refreshTools(); });
window.addEventListener('pagehide', () => { endStroke(state.editor); rename(); save(true); });
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
refresh(); save(true); if (storageError && storageError !== 'unavailable') toast(storageError, true);
