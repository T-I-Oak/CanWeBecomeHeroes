import { getPreparationSubareaBounds } from '../game/GameAreas.js';
import { PREPARATION_LAYOUT } from '../game/PreparationLayout.js';

export const PREPARATION_TAG_GRID = Object.freeze([
  Object.freeze(['valor', 'arcane', 'dexterity', 'reputation', 'blessing']),
  Object.freeze(['iron', 'cloth', 'feather', 'gem', 'fortune']),
  Object.freeze(['fire', 'water', 'lightning', 'area', 'vitality']),
]);

function isPointInRect(point, x, y, width, height) {
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
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

export function isPreparationPanelPoint(point, bounds) {
  return isPointInRect(point, bounds.x, bounds.y, bounds.width, bounds.height);
}
