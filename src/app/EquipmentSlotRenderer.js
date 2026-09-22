import { AREA_THEME } from '../game/AreaTheme.js';
import { PREPARATION_LAYOUT } from '../game/PreparationLayout.js';

export function drawFramedTag(context, assets, tagPath, baseColor, glyphScale = 1, x, y, size) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  context.fillStyle = '#17253d'; context.beginPath(); context.arc(centerX, centerY, size * 0.5, 0, Math.PI * 2); context.fill();
  context.fillStyle = baseColor ?? '#e1e8f0'; context.beginPath(); context.arc(centerX, centerY, size * 0.43, 0, Math.PI * 2); context.fill();
  const icon = assets.load(tagPath); const glyphSize = size * glyphScale;
  if (icon.complete && icon.naturalWidth > 0) context.drawImage(icon, x + (size - glyphSize) / 2, y + (size - glyphSize) / 2, glyphSize, glyphSize);
  context.lineWidth = Math.max(1, size * 0.035); context.strokeStyle = 'rgba(255, 255, 255, 0.78)'; context.beginPath(); context.arc(centerX, centerY, size * 0.43 - context.lineWidth / 2, 0, Math.PI * 2); context.stroke();
}

export function drawItemSlot(context, assets, item, x, y) {
  const size = PREPARATION_LAYOUT.equipmentSlotSize;
  context.fillStyle = item?.category === 'destination' ? AREA_THEME[item.destination].chipFill : '#eef1f6';
  context.strokeStyle = '#aab4c6'; context.lineWidth = 2; context.beginPath(); context.roundRect(x, y, size, size, 8); context.fill(); context.stroke();
  if (!item) return;
  const image = assets.load(item.chip.centerPath); const imageSize = size - PREPARATION_LAYOUT.equipmentImagePadding * 2;
  if (image.complete && image.naturalWidth > 0) context.drawImage(image, x + (size - imageSize) / 2, y + size - imageSize, imageSize, imageSize);
  const tagSize = PREPARATION_LAYOUT.equipmentTagIconSize;
  const tagWidth = item.chip.tagPaths.length * tagSize + Math.max(0, item.chip.tagPaths.length - 1) * PREPARATION_LAYOUT.equipmentTagGap;
  item.chip.tagPaths.forEach((tagPath, index) => drawFramedTag(context, assets, tagPath, item.chip.tagBaseColors[index], item.chip.tagGlyphScales[index], x + (size - tagWidth) / 2 + index * (tagSize + PREPARATION_LAYOUT.equipmentTagGap), y + 2, tagSize));
}
