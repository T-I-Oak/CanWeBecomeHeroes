import { ENEMY_CHIP_DIAMETER } from '../game/HeroSlotLayout.js';
import { MAX_WINDOW_SCALE } from './InformationWindowScale.js';
import { createStaticChipPreviewCanvas } from './ChipPreview.js';

// A regular enemy is the baseline header chip and matches the common header icon.
const REGULAR_ENEMY_HEADER_SIZE = 44;
const HEADER_CHIP_SCALE = REGULAR_ENEMY_HEADER_SIZE / ENEMY_CHIP_DIAMETER.small;

export function getInformationWindowChipPreviewSize(chip) {
  return Math.round(chip.radius * 2 * HEADER_CHIP_SCALE);
}

export function getInformationWindowChipBitmapScale(displayRatio = 1) {
  const density = displayRatio > 0 ? displayRatio : 1;
  return MAX_WINDOW_SCALE * density;
}

export function createInformationWindowChipPreview(chip, assets) {
  const displayRatio = globalThis.devicePixelRatio > 0 ? globalThis.devicePixelRatio : 1;
  return createStaticChipPreviewCanvas(
    chip,
    getInformationWindowChipPreviewSize(chip),
    assets,
    'InformationWindow__ChipPreview',
    getInformationWindowChipBitmapScale(displayRatio),
  );
}
