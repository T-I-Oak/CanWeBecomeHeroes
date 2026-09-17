import { PREPARATION_LAYOUT } from '../game/PreparationLayout.js';
import { isPointInRect } from './RectHitTest.js';

export function getEquipmentSlotTagAtPoint(point, item, slotX, slotY) {
  if (!item) return null;
  const tagSize = PREPARATION_LAYOUT.equipmentTagIconSize;
  const tagGap = PREPARATION_LAYOUT.equipmentTagGap;
  const tagWidth = item.chip.tagPaths.length * tagSize + Math.max(0, item.chip.tagPaths.length - 1) * tagGap;
  const tagStartX = slotX + (PREPARATION_LAYOUT.equipmentSlotSize - tagWidth) / 2;
  const tagIndex = item.tags.findIndex((tag, index) => isPointInRect(point, tagStartX + index * (tagSize + tagGap), slotY + 2, tagSize, tagSize));
  return tagIndex >= 0 ? item.tags[tagIndex] : null;
}

export function getEquipmentSlotItemAtPoint(point, item, slotX, slotY) {
  if (!item) return null;
  const size = PREPARATION_LAYOUT.equipmentSlotSize;
  return isPointInRect(point, slotX, slotY, size, size) ? item : null;
}
