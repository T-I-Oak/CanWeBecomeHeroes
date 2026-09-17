import { getPreparationSubareaBounds } from '../game/GameAreas.js';
import { PREPARATION_LAYOUT } from '../game/PreparationLayout.js';
import { getEquipmentSlotItemAtPoint, getEquipmentSlotTagAtPoint } from './EquipmentSlotHitTest.js';
import { isPointInRect } from './RectHitTest.js';

export const PREPARATION_TAG_GRID = Object.freeze([
  Object.freeze(['valor', 'arcane', 'dexterity', 'reputation', 'blessing']),
  Object.freeze(['iron', 'cloth', 'feather', 'gem', 'fortune']),
  Object.freeze(['fire', 'water', 'lightning', 'area', 'vitality']),
]);
export const EQUIPMENT_SLOTS = Object.freeze(['head', 'torso', 'rightHand', 'leftHand', 'feet']);
export const EQUIPMENT_SLOT_GRID = Object.freeze({ head: [1, 0], rightHand: [0, 1], torso: [1, 1], leftHand: [2, 1], feet: [1, 2] });

export function getPreparationEquipmentOrigin(heroIndex) {
  const bounds = getPreparationSubareaBounds(heroIndex);
  return {
    x: bounds.x + PREPARATION_LAYOUT.topPadding + PREPARATION_LAYOUT.characterAreaWidth + PREPARATION_LAYOUT.areaGap + PREPARATION_LAYOUT.informationAreaWidth + PREPARATION_LAYOUT.areaGap,
    y: bounds.y + PREPARATION_LAYOUT.topPadding,
  };
}

export function getPreparationInformationOrigin(heroIndex) {
  const bounds = getPreparationSubareaBounds(heroIndex);
  return Object.freeze({
    x: bounds.x + PREPARATION_LAYOUT.topPadding + PREPARATION_LAYOUT.characterAreaWidth + PREPARATION_LAYOUT.areaGap,
    y: bounds.y + PREPARATION_LAYOUT.topPadding,
  });
}

export function getPreparationTagAtPoint(point, heroes) {
  const { statusGaugeHeight, sectionGap, statusColumnWidth, statusColumnGap, tagBadgeWidth, tagBadgeHeight, tagRowGap, topPadding } = PREPARATION_LAYOUT;
  for (let heroIndex = 0; heroIndex < heroes.length; heroIndex += 1) {
    const bounds = getPreparationSubareaBounds(heroIndex);
    const informationX = bounds.x + topPadding + PREPARATION_LAYOUT.characterAreaWidth + PREPARATION_LAYOUT.areaGap;
    const tagStartY = bounds.y + topPadding + statusGaugeHeight + sectionGap;
    for (let rowIndex = 0; rowIndex < PREPARATION_TAG_GRID.length; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < PREPARATION_TAG_GRID[rowIndex].length; columnIndex += 1) {
        const badgeX = informationX + columnIndex * (statusColumnWidth + statusColumnGap) + (statusColumnWidth - tagBadgeWidth) / 2;
        const badgeY = tagStartY + rowIndex * (tagBadgeHeight + tagRowGap);
        if (isPointInRect(point, badgeX, badgeY, tagBadgeWidth, tagBadgeHeight)) return PREPARATION_TAG_GRID[rowIndex][columnIndex];
      }
    }
  }
  return null;
}

export function getPreparationStatusAtPoint(point, heroes, statusDefinitions) {
  const { statusGaugeHeight, statusColumnWidth, statusColumnGap, statusGaugeWidth, topPadding } = PREPARATION_LAYOUT;
  for (let heroIndex = 0; heroIndex < heroes.length; heroIndex += 1) {
    const bounds = getPreparationSubareaBounds(heroIndex);
    const informationX = bounds.x + topPadding + PREPARATION_LAYOUT.characterAreaWidth + PREPARATION_LAYOUT.areaGap;
    for (let statusIndex = 0; statusIndex < statusDefinitions.length; statusIndex += 1) {
      const gaugeX = informationX + statusIndex * (statusColumnWidth + statusColumnGap) + (statusColumnWidth - statusGaugeWidth) / 2;
      if (isPointInRect(point, gaugeX, bounds.y + topPadding, statusGaugeWidth, statusGaugeHeight)) return { status: statusDefinitions[statusIndex].key };
    }
  }
  return null;
}

function getPreparationEquipmentEntryAtPoint(point, heroes, findAtPoint) {
  const { equipmentSlotSize: slotSize, equipmentGap: gap } = PREPARATION_LAYOUT;
  for (let heroIndex = 0; heroIndex < heroes.length; heroIndex += 1) {
    const hero = heroes[heroIndex];
    const origin = getPreparationEquipmentOrigin(heroIndex);
    for (const slot of EQUIPMENT_SLOTS) {
      const [column, row] = EQUIPMENT_SLOT_GRID[slot];
      const entry = findAtPoint(point, hero.equipment[slot], origin.x + column * (slotSize + gap), origin.y + row * (slotSize + gap));
      if (entry) return entry;
    }
  }
  return null;
}

export function getPreparationEquipmentTagAtPoint(point, heroes) {
  return getPreparationEquipmentEntryAtPoint(point, heroes, getEquipmentSlotTagAtPoint);
}

export function getPreparationEquipmentItemAtPoint(point, heroes) {
  return getPreparationEquipmentEntryAtPoint(point, heroes, getEquipmentSlotItemAtPoint);
}

export function isPreparationPanelPoint(point, bounds) {
  return isPointInRect(point, bounds.x, bounds.y, bounds.width, bounds.height);
}
