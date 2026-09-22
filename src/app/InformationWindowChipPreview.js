import { ENEMY_CHIP_DIAMETER } from '../game/HeroSlotLayout.js';
import { createStaticChipPreviewCanvas } from './ChipPreview.js';

// A regular enemy is the baseline header chip and matches the common header icon.
const REGULAR_ENEMY_HEADER_SIZE = 44;
const HEADER_CHIP_SCALE = REGULAR_ENEMY_HEADER_SIZE / ENEMY_CHIP_DIAMETER.small;

export function getInformationWindowChipPreviewSize(chip) {
  return Math.round(chip.radius * 2 * HEADER_CHIP_SCALE);
}

export function createInformationWindowChipPreview(chip, assets) {
  return createStaticChipPreviewCanvas(chip, getInformationWindowChipPreviewSize(chip), assets);
}
