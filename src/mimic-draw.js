// Frames are prepared by the presentation controller; drawing never advances motion.
function drawMimicEffects(ctx, frames, viewport) {
  ctx.save(); ctx.shadowBlur = 0;
  for (const frame of frames) {
    for (const point of frame.points) {
      if (point.alpha <= 0) continue;
      ctx.globalAlpha = point.alpha;
      ctx.fillStyle = '#ff6464';
      ctx.fillRect(viewport.left + point.x, viewport.top + point.y, point.size, point.size);
    }
    for (const cue of [frame.cue, ...(frame.stepCues || [])]) {
      if (!cue) continue;
      ctx.globalAlpha = cue.alpha; ctx.strokeStyle = '#c8d9d3'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(viewport.left + cue.x, viewport.top + cue.y,
        cue.radius, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}
module.exports = { drawMimicEffects };
