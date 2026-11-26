const { SIZES } = require('../../src/ugc/model');
const { entities } = require('./core');
const { pathFor, colorFor } = require('./palette');

const { TERRAIN, TERRAIN_BY_TILE } = require('../../src/terrain-catalog');
const paths = new Map();
function glyph(ctx, kind, x, y, size) {
  if (!paths.has(kind)) paths.set(kind, new Path2D(pathFor(kind)));
  ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 24, size / 24);
  ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke(paths.get(kind)); ctx.restore();
}

function createMap(canvas, minimap, getState) {
  const ctx = canvas.getContext('2d'), mini = minimap.getContext('2d');
  const view = { x: 0, y: 0, scale: 14, fitScale: 14, grid: true };
  let width = 0, height = 0, queued = false, miniView;

  function fit() {
    const [cols, rows] = SIZES[getState().editor.draft.size];
    view.scale = Math.max(3, Math.min((width - 100) / cols, (height - 110) / rows, 25));
    view.fitScale = view.scale;
    view.x = (width - cols * view.scale) / 2; view.y = (height - rows * view.scale) / 2;
    draw();
  }
  function zoom(factor, x = width / 2, y = height / 2) {
    const old = view.scale;
    view.scale = Math.max(3, Math.min(60, old * factor));
    view.x = x - (x - view.x) * view.scale / old;
    view.y = y - (y - view.y) * view.scale / old;
    draw();
  }
  function cell(event) {
    const rect = canvas.getBoundingClientRect();
    const [cols, rows] = SIZES[getState().editor.draft.size];
    const x = Math.floor((event.clientX - rect.left - view.x) / view.scale);
    const y = Math.floor((event.clientY - rect.top - view.y) / view.scale);
    return x >= 0 && y >= 0 && x < cols && y < rows ? { x, y } : null;
  }
  function paintMap(target, draft, ox, oy, scale, grid) {
    const [cols, rows] = SIZES[draft.size];
    target.fillStyle = '#26382c'; target.fillRect(ox, oy, cols * scale, rows * scale);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const tile = draft.tiles[x + y * cols];
      if (tile === 1) continue;
      target.fillStyle = TERRAIN_BY_TILE[tile]?.color || '#d6dad0'; target.fillRect(ox + x * scale, oy + y * scale, scale + .2, scale + .2);
      if (tile === 2 && scale > 7) {
        target.strokeStyle = '#6e8d79'; target.lineWidth = .5;
        target.beginPath(); target.moveTo(ox + x * scale + 2, oy + (y + 1) * scale - 2);
        target.lineTo(ox + (x + 1) * scale - 2, oy + y * scale + 2); target.stroke();
      }
      if (tile === 3 && scale > 6) {
        target.strokeStyle = '#365b46'; target.lineWidth = 1;
        for (const at of [.3, .7]) {
          target.beginPath(); target.moveTo(ox + (x + at) * scale, oy + y * scale);
          target.lineTo(ox + (x + at) * scale, oy + (y + 1) * scale); target.stroke();
        }
      }
    }
    if (grid && scale >= 8) {
      target.strokeStyle = '#203b3028'; target.lineWidth = .5; target.beginPath();
      for (let x = 0; x <= cols; x++) { target.moveTo(ox + x * scale, oy); target.lineTo(ox + x * scale, oy + rows * scale); }
      for (let y = 0; y <= rows; y++) { target.moveTo(ox, oy + y * scale); target.lineTo(ox + cols * scale, oy + y * scale); }
      target.stroke();
    }
    for (const item of entities(draft)) {
      const cx = ox + (item.x + .5) * scale, cy = oy + (item.y + .5) * scale;
      const color = colorFor(item.kind);
      if (item.toX != null) {
        const tx = ox + (item.toX + .5) * scale, ty = oy + (item.toY + .5) * scale;
        target.strokeStyle = item.kind === 'patrol' ? '#bc745e' : '#927e4e'; target.lineWidth = Math.max(1, scale * .08);
        target.setLineDash([scale * .25, scale * .22]); target.beginPath(); target.moveTo(cx, cy); target.lineTo(tx, ty); target.stroke(); target.setLineDash([]);
        target.fillStyle = color; target.beginPath(); target.arc(tx, ty, scale * .23, 0, Math.PI * 2); target.fill();
        target.strokeStyle = '#20352b'; target.lineWidth = Math.max(1, scale * .06); target.stroke();
      }
      target.fillStyle = color;
      target.beginPath(); target.roundRect(cx - scale * .43, cy - scale * .43, scale * .86, scale * .86, scale * .15); target.fill();
      if (scale > 6) { target.strokeStyle = '#243b2c'; glyph(target, item.kind, cx, cy, scale * .69); }
      if (item.kind === 'launcher' && scale > 9) {
        target.save(); target.translate(cx, cy); target.rotate((item.dir - 1) * Math.PI / 2);
        target.strokeStyle = '#784636'; target.lineWidth = 1.4;
        target.beginPath(); target.moveTo(scale * .5, 0); target.lineTo(scale * 1.05, 0);
        target.moveTo(scale * .82, -scale * .17); target.lineTo(scale * 1.05, 0); target.lineTo(scale * .82, scale * .17); target.stroke(); target.restore();
      }
    }
    target.strokeStyle = '#749e7d'; target.lineWidth = 1; target.strokeRect(ox, oy, cols * scale, rows * scale);
  }
  function render() {
    queued = false;
    const state = getState(), draft = state.editor.draft;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const [cols, rows] = SIZES[draft.size];
    ctx.shadowColor = '#0007'; ctx.shadowBlur = 30;
    ctx.fillStyle = '#233329'; ctx.fillRect(view.x, view.y, cols * view.scale, rows * view.scale); ctx.shadowBlur = 0;
    paintMap(ctx, draft, view.x, view.y, view.scale, view.grid);
    if (view.scale > 9) {
      ctx.fillStyle = '#688b71'; ctx.font = '9px ui-monospace,monospace'; ctx.textAlign = 'center';
      for (let x = 0; x < cols; x += 5) ctx.fillText(x, view.x + (x + .5) * view.scale, view.y - 10);
      ctx.textAlign = 'right'; for (let y = 0; y < rows; y += 5) ctx.fillText(y, view.x - 10, view.y + (y + .7) * view.scale);
    }
    const highlight = (at, color, line = 2) => {
      ctx.strokeStyle = color; ctx.lineWidth = line;
      ctx.strokeRect(view.x + at.x * view.scale + 1, view.y + at.y * view.scale + 1, view.scale - 2, view.scale - 2);
    };
    if (state.selection) highlight(state.selection.endpoint ? { x: state.selection.toX, y: state.selection.toY } : state.selection, '#d5a64c');
    if (state.hover) {
      const size = state.mode === 'brush' && (state.tool in TERRAIN || state.tool === 'erase') ? state.brushSize : 1;
      const offset = Math.floor((size - 1) / 2);
      ctx.strokeStyle = '#a4e9c7'; ctx.lineWidth = 1.5;
      ctx.strokeRect(view.x + (state.hover.x - offset) * view.scale + 1,
        view.y + (state.hover.y - offset) * view.scale + 1, view.scale * size - 2, view.scale * size - 2);
    }
    if (state.gesture?.type === 'rectangle' && state.hover) {
      const a = state.gesture.from, b = state.hover;
      ctx.fillStyle = '#a4e9c733'; ctx.strokeStyle = '#a4e9c7'; ctx.lineWidth = 1.5;
      const x = view.x + Math.min(a.x, b.x) * view.scale, y = view.y + Math.min(a.y, b.y) * view.scale;
      const w = (Math.abs(a.x - b.x) + 1) * view.scale, h = (Math.abs(a.y - b.y) + 1) * view.scale;
      ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    }
    if (state.pending) {
      highlight(state.pending, '#d8c798');
      if (state.hover) {
        ctx.strokeStyle = '#d8c798'; ctx.setLineDash([5, 4]); ctx.beginPath();
        ctx.moveTo(view.x + (state.pending.x + .5) * view.scale, view.y + (state.pending.y + .5) * view.scale);
        ctx.lineTo(view.x + (state.hover.x + .5) * view.scale, view.y + (state.hover.y + .5) * view.scale); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    const mw = minimap.clientWidth, mh = minimap.clientHeight;
    if (minimap.width !== Math.round(mw * dpr) || minimap.height !== Math.round(mh * dpr)) {
      minimap.width = Math.round(mw * dpr); minimap.height = Math.round(mh * dpr);
    }
    mini.setTransform(dpr, 0, 0, dpr, 0, 0); mini.clearRect(0, 0, mw, mh);
    const ms = Math.min((mw - 18) / cols, (mh - 16) / rows), mx = (mw - cols * ms) / 2, my = (mh - rows * ms) / 2;
    miniView = { x: mx, y: my, scale: ms };
    paintMap(mini, draft, mx, my, ms, false);
    mini.save(); mini.beginPath(); mini.rect(mx, my, cols * ms, rows * ms); mini.clip();
    mini.fillStyle = '#c5e7b51a'; mini.strokeStyle = '#c2dfa8'; mini.lineWidth = 1;
    const vx = mx - view.x / view.scale * ms, vy = my - view.y / view.scale * ms;
    mini.fillRect(vx, vy, width / view.scale * ms, height / view.scale * ms);
    mini.strokeRect(vx, vy, width / view.scale * ms, height / view.scale * ms); mini.restore();
    document.getElementById('zoom-value').textContent = `${Math.round(view.scale / view.fitScale * 100)}%`;
  }
  function draw() { if (!queued) { queued = true; requestAnimationFrame(render); } }
  const observer = new ResizeObserver(() => {
    // A hidden workspace reports zero size; retain its last viewport until shown.
    if (!canvas.clientWidth || !canvas.clientHeight) return;
    const oldWidth = width, oldHeight = height;
    width = canvas.clientWidth; height = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    if (!oldWidth) fit();
    else { view.x += (width - oldWidth) / 2; view.y += (height - oldHeight) / 2; draw(); }
  }); observer.observe(canvas);
  minimap.addEventListener('pointerdown', event => {
    const r = minimap.getBoundingClientRect();
    const [cols, rows] = SIZES[getState().editor.draft.size];
    const x = Math.max(0, Math.min(cols, (event.clientX - r.left - miniView.x) / miniView.scale));
    const y = Math.max(0, Math.min(rows, (event.clientY - r.top - miniView.y) / miniView.scale));
    view.x = width / 2 - x * view.scale; view.y = height / 2 - y * view.scale; draw();
  });
  return { view, fit, zoom, cell, draw };
}
module.exports = { createMap };
