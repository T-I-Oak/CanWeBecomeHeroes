function drawPointer(context, indicator) {
  const { x, y, angle, radius, color } = indicator;
  const length = 12;
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(radius - 3, -radius * 0.42);
  context.lineTo(radius + length, 0);
  context.lineTo(radius - 3, radius * 0.42);
  context.closePath();
  context.fill();
  context.restore();
}

function drawPortrait(context, assets, indicator) {
  const image = assets.load(indicator.hero.chip.centerPath);
  if (!image.complete || image.naturalWidth === 0) return;
  const { x, y, radius } = indicator;
  const diameter = radius * 2 - 6;
  context.save();
  context.beginPath();
  context.arc(x, y, radius - 3, 0, Math.PI * 2);
  context.clip();
  const size = diameter * 1.9;
  context.drawImage(image, x - size / 2, y - size * 0.36, size, size);
  context.restore();
}

export function getDirectionIndicatorBackground(indicator, timeSeconds) {
  if (!indicator.staminaReady) return '#132235';
  const pulse = (Math.sin(timeSeconds * Math.PI * 2.4) + 1) / 2;
  const start = [49, 93, 49];
  const end = [215, 255, 88];
  const color = start.map((value, index) => Math.round(value + (end[index] - value) * pulse));
  return `rgb(${color.join(', ')})`;
}

export default class HeroDirectionIndicatorRenderer {
  constructor(context, assets) {
    this.context = context;
    this.assets = assets;
  }

  draw(indicators, timeSeconds = 0) {
    indicators.forEach((indicator) => {
      const { context } = this;
      drawPointer(context, indicator);
      context.save();
      context.fillStyle = getDirectionIndicatorBackground(indicator, timeSeconds);
      context.beginPath();
      context.arc(indicator.x, indicator.y, indicator.radius, 0, Math.PI * 2);
      context.fill();
      drawPortrait(context, this.assets, indicator);
      context.lineWidth = 4;
      context.strokeStyle = indicator.color;
      context.beginPath();
      context.arc(indicator.x, indicator.y, indicator.radius - 2, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    });
  }
}
