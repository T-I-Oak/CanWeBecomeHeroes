export function drawSelectionGuide(context, guide) {
  if (!guide) return;
  context.save();
  const drawLink = (source, target, color) => { context.strokeStyle = color; context.lineWidth = 4; context.setLineDash([10, 8]); context.beginPath(); context.moveTo(source.chip.x, source.chip.y - source.chip.height); context.lineTo(target.chip.x, target.chip.y - target.chip.height); context.stroke(); };
  guide.links.forEach((link) => drawLink(link.source, link.target, '#54c96b'));
  if (!guide.source) { context.setLineDash([]); context.restore(); return; }
  const source = guide.source.chip; const target = guide.target?.chip; const color = target ? (guide.valid ? '#54c96b' : '#d88989') : '#88b6e8';
  context.strokeStyle = color; context.fillStyle = `${color}33`; context.lineWidth = 4; context.setLineDash([10, 8]); context.beginPath(); context.moveTo(source.x, source.y - source.height); context.lineTo(guide.pointerX, guide.pointerY); context.stroke(); context.setLineDash([]); context.beginPath(); context.arc(source.x, source.y - source.height, source.radius + 7, 0, Math.PI * 2); context.stroke();
  if (target) { context.beginPath(); context.arc(target.x, target.y - target.height, target.radius + 8, 0, Math.PI * 2); context.fill(); context.stroke(); }
  context.restore();
}
