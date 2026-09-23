import { CHIP_CENTER_ART_SCALE, getCenterImagePlacement } from './ChipArtLayout.js';

const DEFAULT_TAG_SLOT_COUNT = 8;
export const CENTER_IMAGE_SCALE = CHIP_CENTER_ART_SCALE;
const CHIP_RIM_WIDTH_RATIO = 0.065;

export function getContainedImageSize(imageWidth, imageHeight, boxSize) {
  const scale = Math.min(boxSize / imageWidth, boxSize / imageHeight);
  return { width: imageWidth * scale, height: imageHeight * scale };
}

function drawImageContain(context, image, x, y, size) {
  if (!image.complete || image.naturalWidth === 0) return;
  const { width, height } = getContainedImageSize(image.naturalWidth, image.naturalHeight, size);
  context.drawImage(image, x - width / 2, y - height / 2, width, height);
}

export function drawFramedTag(context, assets, path, baseColor, glyphScale = 1, x, y, size) {
  context.fillStyle = '#17253d';
  context.beginPath();
  context.arc(x, y, size * 0.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = baseColor ?? '#e1e8f0';
  context.beginPath();
  context.arc(x, y, size * 0.43, 0, Math.PI * 2);
  context.fill();
  drawImageContain(context, assets.load(path), x, y, size * glyphScale);
  context.lineWidth = Math.max(1, size * 0.035);
  context.strokeStyle = 'rgba(255, 255, 255, 0.78)';
  context.beginPath();
  context.arc(x, y, size * 0.43 - context.lineWidth / 2, 0, Math.PI * 2);
  context.stroke();
}

export function createTagAngles(count, tagSlotCount) {
  return Array.from({ length: count }, (_, index) => (
    count === 1
      ? -Math.PI / 2
      : -Math.PI / 2 + (index - (count - 1) / 2) * (Math.PI * 2 / tagSlotCount)
  ));
}

export { getCenterImagePlacement } from './ChipArtLayout.js';

export function getPhysicalShieldPresentation(reduction) {
  const strength = Math.max(0, Math.min(1, reduction / 0.7));
  return {
    alpha: strength === 0 ? 0 : 0.22 + strength * 0.68,
    pulse: 0.012 + strength * 0.052,
    sizeRatio: 2.2,
  };
}

export function getStaminaPauseWavePresentation(timeSeconds, radius, index) {
  const progress = (timeSeconds / 1.6 + index / 3) % 1;
  return {
    radius: radius * (1.08 + progress * 1.02),
    alpha: 0.3 + (1 - progress) ** 1.25 * 0.7,
    lineWidth: Math.max(4, radius * 0.055) * (1 - progress * 0.18),
  };
}

export function getActionGaugePresentationRatio(chip) {
  if ((chip.actionVisualCount ?? 0) > 0) return 1;
  return Math.max(0, Math.min(1, chip.actionGauge / chip.actionGaugeMaximum));
}

export default class ChipRenderer {
  constructor(context, assets, { tagSlotCount = DEFAULT_TAG_SLOT_COUNT } = {}) {
    this.context = context;
    this.assets = assets;
    this.tagSlotCount = tagSlotCount;
  }

  draw(chip, timeSeconds = 0, { staminaPauseTarget = false } = {}) {
    const { context } = this;
    const scale = chip.scale;
    const visualX = chip.x + (chip.effectOffsetX ?? 0);
    const drawY = chip.y - chip.height + (chip.effectOffsetY ?? 0);
    const airRatio = Math.min(chip.height / (chip.radius * 5), 0.65);
    const shadowAlpha = 0.24 / (1 + airRatio);

    if (staminaPauseTarget) this.drawStaminaPauseWaves(chip, visualX, drawY, timeSeconds);

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
    context.save();
    context.translate(centerImage.x, centerImage.y);
    if (chip.flipped) context.scale(-1, 1);
    drawImageContain(context, this.assets.load(chip.centerPath), 0, 0, centerImage.size);
    context.restore();
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
    this.drawPhysicalShieldOverlay(chip, visualX, drawY, timeSeconds);
    this.drawAttributeOverlays(chip, visualX, drawY, timeSeconds);
  }

  drawStaminaPauseWaves(chip, x, y, timeSeconds) {
    const { context } = this;
    context.save();
    context.lineCap = 'round';
    [0, 1, 2].forEach((index) => {
      const wave = getStaminaPauseWavePresentation(timeSeconds, chip.radius, index);
      context.globalAlpha = wave.alpha;
      context.lineWidth = wave.lineWidth + Math.max(2, chip.radius * 0.025);
      context.strokeStyle = '#315d31';
      context.beginPath();
      context.arc(x, y, wave.radius, 0, Math.PI * 2);
      context.stroke();
      context.lineWidth = wave.lineWidth;
      context.strokeStyle = '#d7ff58';
      context.beginPath();
      context.arc(x, y, wave.radius, 0, Math.PI * 2);
      context.stroke();
    });
    context.restore();
  }

  drawPhysicalShieldOverlay(chip, x, y, timeSeconds) {
    const presentation = getPhysicalShieldPresentation(chip.physicalDamageReduction ?? 0);
    if (presentation.alpha === 0) return;
    const image = this.assets.load('/assets/effects/defense/physical-shield.png');
    if (!image.complete || image.naturalWidth === 0) return;
    const phase = timeSeconds * 2.15;
    const pulse = 1 + Math.sin(phase) * presentation.pulse;
    const size = chip.radius * presentation.sizeRatio;
    this.context.save();
    this.context.translate(x, y);
    this.context.scale(pulse, pulse);
    this.context.globalAlpha = presentation.alpha;
    drawImageContain(this.context, image, 0, 0, size);
    this.context.restore();
  }

  drawAttributeOverlays(chip, x, y, timeSeconds) {
    const values = Object.entries(chip.attributeValues ?? {})
      .filter(([, value]) => value > 0)
      .sort(([leftName, leftValue], [rightName, rightValue]) => rightValue - leftValue || leftName.localeCompare(rightName));
    values.forEach(([attribute, value], index) => {
      const image = this.assets.load(`/assets/effects/attributes/${attribute}.png`);
      if (!image.complete || image.naturalWidth === 0) return;
      const magnitude = Math.min(7, value) / 7;
      // 属性はチップの表面を覆うのではなく、外周を取り囲むリングとして描く。
      // 付与値の減衰・再付与にそのまま追従するため、時間経過で縮小し、
      // max による再付与時には直ちに大きさを取り戻す。
      const size = chip.radius * 2 * (0.8 + 1.2 * magnitude ** 1.1);
      const phase = timeSeconds * (attribute === 'lightning' ? 13 : attribute === 'fire' ? 3.1 : 2.2) + index * 1.7;
      const animationStrength = magnitude ** 1.45;
      const sway = attribute === 'lightning'
        ? Math.sin(phase) * (2 + animationStrength * 10)
        : Math.sin(phase) * (2 + animationStrength * 8);
      this.context.save();
      this.context.translate(x + sway, y + chip.radius * 0.9 + Math.cos(phase * 0.7) * (2 + animationStrength * 7));
      this.context.scale(1 + Math.sin(phase) * (0.025 + animationStrength * 0.1), 1 + Math.cos(phase * 0.8) * (0.025 + animationStrength * 0.1));
      this.context.globalAlpha = 0.72 + magnitude * 0.22;
      // 足元の位置を固定して拡大・縮小する。付与値が小さい間は足元だけに
      // 見え、強い付与値では同じ基点からチップ全体を囲む。
      drawImageContain(this.context, image, 0, -size / 2, size);
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
      drawFramedTag(context, this.assets, path, chip.tagBaseColors[index], chip.tagGlyphScales[index], 0, 0, iconSize);
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
    if (chip.actionGauge === null || chip.actionGaugeMaximum === null || chip.actionGaugeBaseMaximum === null) return;
    const { context } = this;
    const baseWidth = chip.radius * 1.28;
    const width = baseWidth * Math.min(1, chip.actionGaugeMaximum / chip.actionGaugeBaseMaximum);
    const height = Math.max(7, chip.radius * 0.12);
    const x = -width / 2;
    const y = chip.radius * 0.5 - height / 2;
    const ratio = getActionGaugePresentationRatio(chip);
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
