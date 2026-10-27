const LOUPE_WIDTH = 160;
const LOUPE_HEIGHT = 128;
const MAGNIFICATION = 2;
const MARGIN = 8;
const FINGER_GAP = 36;
const SWITCH_MARGIN = 24;

export function getLoupeLayout(point, width, height, previousSide = 'above') {
  const lensWidth = Math.min(LOUPE_WIDTH, Math.max(1, width - MARGIN * 2));
  const lensHeight = Math.min(LOUPE_HEIGHT, Math.max(1, height - MARGIN * 2));
  const aboveFits = point.y >= lensHeight + FINGER_GAP + MARGIN;
  const belowFits = point.y + FINGER_GAP + lensHeight + MARGIN <= height;
  const side = aboveFits && (previousSide === 'above' || !belowFits
    || point.y >= lensHeight + FINGER_GAP + MARGIN + SWITCH_MARGIN) ? 'above' : 'below';
  const clamp = (value, size, limit) => Math.max(MARGIN, Math.min(limit - size - MARGIN, value));
  return {
    x: clamp(point.x - lensWidth / 2, lensWidth, width),
    y: clamp(side === 'above' ? point.y - FINGER_GAP - lensHeight : point.y + FINGER_GAP, lensHeight, height),
    width: lensWidth, height: lensHeight, side,
    sourceX: point.x - lensWidth / MAGNIFICATION / 2,
    sourceY: point.y - lensHeight / MAGNIFICATION / 2,
    sourceWidth: lensWidth / MAGNIFICATION,
    sourceHeight: lensHeight / MAGNIFICATION,
  };
}

export default class TouchDragLoupe {
  constructor(createCanvas = () => document.createElement('canvas')) {
    this.createCanvas = createCanvas;
    this.surface = null;
    this.side = 'above';
  }

  draw(context, boardCanvas, point, renderScene) {
    if (!point) { this.side = 'above'; return; }
    const layout = getLoupeLayout(point, boardCanvas.clientWidth, boardCanvas.clientHeight, this.side);
    this.side = layout.side;
    const scaleX = boardCanvas.width / boardCanvas.clientWidth;
    const scaleY = boardCanvas.height / boardCanvas.clientHeight;
    this.surface ??= this.createCanvas();
    const pixelWidth = Math.round(layout.width * scaleX);
    const pixelHeight = Math.round(layout.height * scaleY);
    if (this.surface.width !== pixelWidth) this.surface.width = pixelWidth;
    if (this.surface.height !== pixelHeight) this.surface.height = pixelHeight;
    const sceneContext = this.surface.getContext('2d');
    sceneContext.resetTransform();
    sceneContext.clearRect(0, 0, pixelWidth, pixelHeight);
    sceneContext.save();
    const renderScaleX = MAGNIFICATION * pixelWidth / layout.width;
    const renderScaleY = MAGNIFICATION * pixelHeight / layout.height;
    sceneContext.setTransform(renderScaleX, 0, 0, renderScaleY,
      -layout.sourceX * renderScaleX, -layout.sourceY * renderScaleY);
    sceneContext.beginPath();
    sceneContext.rect(0, 0, boardCanvas.clientWidth, boardCanvas.clientHeight);
    sceneContext.clip();
    renderScene(sceneContext);
    sceneContext.restore();
    context.save();
    context.beginPath();
    context.roundRect(layout.x, layout.y, layout.width, layout.height, 12);
    context.fillStyle = '#182330';
    context.fill();
    context.save();
    context.clip();
    context.drawImage(this.surface, layout.x, layout.y, layout.width, layout.height);
    context.restore();
    context.strokeStyle = '#e3eef8';
    context.lineWidth = 2;
    context.stroke();
    const centerX = layout.x + layout.width / 2;
    const centerY = layout.y + layout.height / 2;
    context.beginPath();
    context.arc(centerX, centerY, 5, 0, Math.PI * 2);
    context.moveTo(centerX - 10, centerY);
    context.lineTo(centerX + 10, centerY);
    context.moveTo(centerX, centerY - 10);
    context.lineTo(centerX, centerY + 10);
    context.strokeStyle = '#172332';
    context.lineWidth = 4;
    context.stroke();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();
  }
}
