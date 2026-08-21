const DEFAULT_TAG_SLOT_COUNT = 8;
export const CENTER_IMAGE_SCALE = 0.85;
const CHIP_RIM_WIDTH_RATIO = 0.065;

function drawImageCover(context, image, x, y, size) {
  if (!image.complete || image.naturalWidth === 0) return;
  context.drawImage(image, x - size / 2, y - size / 2, size, size);
}

export function createTagAngles(count, tagSlotCount) {
  return Array.from({ length: count }, (_, index) => (
    count === 1
      ? -Math.PI / 2
      : -Math.PI / 2 + (index - (count - 1) / 2) * (Math.PI * 2 / tagSlotCount)
  ));
}

export function getCenterImagePlacement(radius) {
  const size = radius * 2 * CENTER_IMAGE_SCALE;
  return { x: 0, y: radius - size / 2, size };
}

export default class ChipRenderer {
  constructor(context, assets, { tagSlotCount = DEFAULT_TAG_SLOT_COUNT } = {}) {
    this.context = context;
    this.assets = assets;
    this.tagSlotCount = tagSlotCount;
  }

  draw(chip, timeSeconds = 0) {
    const { context } = this;
    const scale = chip.scale;
    const visualX = chip.x + (chip.effectOffsetX ?? 0);
    const drawY = chip.y - chip.height + (chip.effectOffsetY ?? 0);
    const airRatio = Math.min(chip.height / (chip.radius * 5), 0.65);
    const shadowAlpha = 0.24 / (1 + airRatio);

    context.save();
    context.fillStyle = `rgba(19, 28, 46, ${shadowAlpha})`;
    context.beginPath();
    context.ellipse(
      visualX,
      chip.y + (chip.effectOffsetY ?? 0),
      chip.radius * scale * (1 + airRatio * 0.45),
      chip.radius * scale * (1 - airRatio * 0.5),
      0,
      0,
      Math.PI * 2,
    );
    context.fill();

    context.translate(visualX, drawY);
    context.save();
    context.rotate(chip.tilt + chip.poseTilt + (chip.effectRotation ?? 0));
    context.scale(scale, scale);
    context.fillStyle = chip.fillColors
      ? chip.fillColors[Math.floor(timeSeconds * 2) % chip.fillColors.length]
      : chip.fillColor;
    context.beginPath();
    context.arc(0, 0, chip.radius, 0, Math.PI * 2);
    context.fill();

    context.save();
    context.beginPath();
    context.arc(0, 0, chip.radius * 0.94, 0, Math.PI * 2);
    context.clip();
    const centerImage = getCenterImagePlacement(chip.radius);
    drawImageCover(context, this.assets.load(chip.centerPath), centerImage.x, centerImage.y, centerImage.size);
    context.restore();

    this.drawTags(chip);
    this.drawStorageCount(chip);
    this.drawActionGauge(chip);
    context.restore();
    context.scale(scale, scale);
    context.lineWidth = Math.max(3, chip.radius * CHIP_RIM_WIDTH_RATIO);
    const rimGradient = context.createLinearGradient(-chip.radius, -chip.radius, chip.radius, chip.radius);
    rimGradient.addColorStop(0, 'rgba(255, 255, 255, 0.86)');
    rimGradient.addColorStop(0.48, 'rgba(214, 223, 235, 0.72)');
    rimGradient.addColorStop(1, 'rgba(23, 35, 57, 0.40)');
    context.strokeStyle = rimGradient;
    context.beginPath();
    context.arc(0, 0, chip.radius - context.lineWidth / 2, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    this.drawAttributeOverlays(chip, visualX, drawY, timeSeconds);
  }

  drawAttributeOverlays(chip, x, y, timeSeconds) {
    const values = Object.entries(chip.attributeValues ?? {})
      .filter(([, value]) => value > 0)
      .sort(([leftName, leftValue], [rightName, rightValue]) => rightValue - leftValue || leftName.localeCompare(rightName));
    values.forEach(([attribute, value], index) => {
      const image = this.assets.load(`/assets/effects/attributes/${attribute}.png`);
      if (!image.complete || image.naturalWidth === 0) return;
      const magnitude = Math.min(7, value) / 7;
      const size = chip.radius * 2 * (0.82 + magnitude * 0.42);
      const phase = timeSeconds * (attribute === 'lightning' ? 13 : attribute === 'fire' ? 3.1 : 2.2) + index * 1.7;
      const sway = attribute === 'lightning'
        ? Math.sin(phase) * (1.5 + magnitude * 3)
        : Math.sin(phase) * (1 + magnitude * 4);
      this.context.save();
      this.context.translate(x + sway, y + Math.cos(phase * 0.7) * magnitude * 2);
      this.context.scale(1 + Math.sin(phase) * magnitude * 0.035, 1 + Math.cos(phase * 0.8) * magnitude * 0.035);
      this.context.globalAlpha = 0.72 + magnitude * 0.22;
      drawImageCover(this.context, image, 0, 0, size);
      this.context.restore();
    });
  }

  drawTags(chip) {
    const { context } = this;
    const count = chip.tagPaths.length;
    const iconSize = chip.radius * 0.42;
    const tagRadius = chip.radius * 0.7;

    createTagAngles(count, this.tagSlotCount).forEach((angle, index) => {
      const path = chip.tagPaths[index];
      const x = Math.cos(angle) * tagRadius;
      const y = Math.sin(angle) * tagRadius;
      context.save();
      context.translate(x, y);
      drawImageCover(context, this.assets.load(path), 0, 0, iconSize);
      context.restore();
    });
  }

  drawStorageCount(chip) {
    if (chip.storageCapacity === null) return;
    const { context } = this;
    const size = Math.max(18, chip.radius * 0.42);
    context.fillStyle = '#24334d';
    context.beginPath();
    context.roundRect(chip.radius * 0.28, chip.radius * 0.28, size, size * 0.7, size * 0.25);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = `bold ${Math.max(10, chip.radius * 0.19)}px system-ui`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${chip.storageCount}/${chip.storageCapacity}`, chip.radius * 0.28 + size / 2, chip.radius * 0.28 + size * 0.35);
    context.textAlign = 'start';
    context.textBaseline = 'alphabetic';
  }

  drawActionGauge(chip) {
    if (chip.actionGauge === null || chip.actionGaugeMaximum === null) return;
    const { context } = this;
    const width = chip.radius * 1.28;
    const height = Math.max(7, chip.radius * 0.12);
    const x = -width / 2;
    const y = chip.radius * 0.5 - height / 2;
    const ratio = Math.max(0, Math.min(1, chip.actionGauge / chip.actionGaugeMaximum));
    context.fillStyle = 'rgba(18, 30, 49, 0.72)';
    context.beginPath();
    context.roundRect(x, y, width, height, height / 2);
    context.fill();
    if (ratio > 0) {
      context.fillStyle = '#8de3ff';
      context.beginPath();
      context.roundRect(x + 1, y + 1, Math.max(0, (width - 2) * ratio), height - 2, Math.max(1, (height - 2) / 2));
      context.fill();
    }
  }
}
