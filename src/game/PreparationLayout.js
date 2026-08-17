import { CHIP_RADIUS } from '../chips/Chip.js';
import { CENTER_IMAGE_SCALE } from '../chips/ChipRenderer.js';

export const PREPARATION_LAYOUT = Object.freeze({
  panelWidth: 600,
  leftAreaWidth: 200,
  topPadding: 12,
  sectionGap: 8,
  bottomPadding: 12,
  headerHeight: 30,
  statusRowHeight: 22,
  statusCount: 6,
  tagIconSize: 16,
  tagCellWidth: 22,
  tagBadgeHeight: 42,
  tagListOffset: 60,
  equipmentSlotSize: 72,
  equipmentGap: 8,
  equipmentImagePadding: 4,
  equipmentTagIconSize: 16,
  equipmentTagGap: 2,
});

export const HERO_PREPARATION_IMAGE_SIZE = CHIP_RADIUS.hero * 2 * CENTER_IMAGE_SCALE;
export const ITEM_PREPARATION_IMAGE_SIZE = CHIP_RADIUS.item * 2 * CENTER_IMAGE_SCALE;
export const PREPARATION_TOP_CONTENT_HEIGHT = Math.max(
  HERO_PREPARATION_IMAGE_SIZE,
  PREPARATION_LAYOUT.headerHeight + PREPARATION_LAYOUT.statusRowHeight * PREPARATION_LAYOUT.statusCount,
  PREPARATION_LAYOUT.equipmentSlotSize * 3 + PREPARATION_LAYOUT.equipmentGap * 2,
);
export const PREPARATION_SUBAREA_HEIGHT = Math.ceil(
  PREPARATION_LAYOUT.topPadding
  + PREPARATION_TOP_CONTENT_HEIGHT
  + PREPARATION_LAYOUT.bottomPadding,
);
