import { CHIP_RADIUS } from '../chips/Chip.js';
import { CENTER_IMAGE_SCALE } from '../chips/ChipRenderer.js';

export const PREPARATION_LAYOUT = Object.freeze({
  characterAreaWidth: 168,
  informationAreaWidth: 304,
  itemAreaWidth: 232,
  topPadding: 12,
  areaGap: 8,
  sectionGap: 8,
  bottomPadding: 12,
  headerHeight: 30,
  statusCount: 6,
  statusColumnWidth: 44,
  statusColumnGap: 8,
  statusGaugeWidth: 40,
  statusGaugeHeight: 124,
  statusIconSize: 24,
  statusIconTopPadding: 3,
  statusIconSegmentGap: 4,
  statusGaugeHorizontalPadding: 3,
  statusGaugeBottomPadding: 4,
  statusSegmentHeight: 11,
  statusSegmentGap: 2,
  tagBadgeWidth: 44,
  tagBadgeHeight: 28,
  tagIconSize: 20,
  tagIconNumberGap: 2,
  tagRowGap: 8,
  equipmentSlotSize: 72,
  equipmentGap: 8,
  equipmentImagePadding: 4,
  equipmentTagIconSize: 16,
  equipmentTagGap: 2,
});

export const PREPARATION_INFORMATION_HEIGHT = PREPARATION_LAYOUT.statusGaugeHeight
  + PREPARATION_LAYOUT.sectionGap
  + PREPARATION_LAYOUT.tagBadgeHeight * 3
  + PREPARATION_LAYOUT.tagRowGap * 2;

export const PREPARATION_PANEL_WIDTH = PREPARATION_LAYOUT.characterAreaWidth
  + PREPARATION_LAYOUT.informationAreaWidth
  + PREPARATION_LAYOUT.itemAreaWidth
  + PREPARATION_LAYOUT.areaGap * 2
  + PREPARATION_LAYOUT.topPadding * 2;

export const HERO_PREPARATION_IMAGE_SIZE = CHIP_RADIUS.hero * 2 * CENTER_IMAGE_SCALE;
export const ITEM_PREPARATION_IMAGE_SIZE = CHIP_RADIUS.item * 2 * CENTER_IMAGE_SCALE;
export const PREPARATION_TOP_CONTENT_HEIGHT = Math.max(
  PREPARATION_LAYOUT.headerHeight + PREPARATION_LAYOUT.sectionGap + HERO_PREPARATION_IMAGE_SIZE,
  PREPARATION_INFORMATION_HEIGHT,
  PREPARATION_LAYOUT.equipmentSlotSize * 3 + PREPARATION_LAYOUT.equipmentGap * 2,
);
export const PREPARATION_SUBAREA_HEIGHT = Math.ceil(
  PREPARATION_LAYOUT.topPadding
  + PREPARATION_TOP_CONTENT_HEIGHT
  + PREPARATION_LAYOUT.bottomPadding,
);
