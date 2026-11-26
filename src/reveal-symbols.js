function drawAcousticSymbol(ctx, kind, x, y, size) {
  ctx.save();
  ctx.lineWidth = Math.max(1.1, size * 0.085);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 'soundLock') {
    ctx.arc(x - size * 0.14, y, size * 0.14, 0, Math.PI * 2);
    ctx.moveTo(x, y);
    ctx.lineTo(x + size * 0.3, y);
    ctx.lineTo(x + size * 0.3, y + size * 0.13);
    ctx.moveTo(x + size * 0.18, y);
    ctx.lineTo(x + size * 0.18, y + size * 0.1);
    ctx.stroke();
    ctx.beginPath();
    for (const radius of [0.32, 0.47]) {
      ctx.moveTo(x - size * 0.14 + Math.cos(Math.PI * 0.68) * size * radius,
        y + Math.sin(Math.PI * 0.68) * size * radius);
      ctx.arc(x - size * 0.14, y, size * radius, Math.PI * 0.68, Math.PI * 1.32);
    }
  } else if (kind === 'lockedExit') {
    ctx.arc(x, y - size * 0.06, size * 0.17, Math.PI, 0);
    ctx.rect(x - size * 0.24, y - size * 0.06, size * 0.48, size * 0.36);
    ctx.moveTo(x, y + size * 0.08);
    ctx.lineTo(x, y + size * 0.17);
  }
  ctx.stroke();
  ctx.restore();
}

module.exports = { drawAcousticSymbol };
