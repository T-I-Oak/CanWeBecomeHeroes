import { CHIP_RADIUS } from '../chips/Chip.js';
import { CONDITION_ICON_PADDING, CONDITION_ICON_SIZE } from '../chips/ConditionIconLayout.js';

export const HERO_SLOT_PADDING = 16;
export const HERO_CHIP_DIAMETER = CHIP_RADIUS.hero * 2;
export const HERO_SLOT_SIZE = HERO_CHIP_DIAMETER + HERO_SLOT_PADDING * 2;
export const BATTLE_ENEMY_SLOT_COUNT = 6;
export const BATTLE_FRIENDLY_SLOT_COUNT = 4;
// Large enemies and their floating combat information need dedicated space above
// the enemy slot lane; it is not part of the lanes where chips stand.
export const BATTLE_OVERHEAD_DISPLAY_HEIGHT = 70;
export const BATTLE_ENEMY_AREA_HEIGHT = BATTLE_OVERHEAD_DISPLAY_HEIGHT + HERO_CHIP_DIAMETER * 2;
export const BATTLE_CONDITION_ICON_ROW_HEIGHT = CONDITION_ICON_SIZE + CONDITION_ICON_PADDING;
export const BATTLE_FRIENDLY_AREA_HEIGHT = HERO_SLOT_SIZE + BATTLE_CONDITION_ICON_ROW_HEIGHT;
export const BATTLE_AREA_HEIGHT = BATTLE_ENEMY_AREA_HEIGHT + BATTLE_FRIENDLY_AREA_HEIGHT;
export const BATTLE_ENEMY_SLOT_TOP = BATTLE_OVERHEAD_DISPLAY_HEIGHT + (HERO_CHIP_DIAMETER * 2 - HERO_SLOT_SIZE) / 2;
export const ENEMY_CHIP_DIAMETER = Object.freeze({ small: 128, medium: HERO_CHIP_DIAMETER, large: HERO_CHIP_DIAMETER * 2 });
export const LARGE_ENEMY_SLOT_SPAN = 2;

/** Returns an enemy chip's rendered diameter as a fraction of one battle slot. */
export function getEnemyChipScale(size) {
  const diameter = ENEMY_CHIP_DIAMETER[size];
  if (!diameter) throw new RangeError(`Unknown enemy size: ${size}`);
  return diameter / HERO_SLOT_SIZE;
}
