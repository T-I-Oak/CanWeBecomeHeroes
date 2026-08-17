import { PREPARATION_LAYOUT, PREPARATION_SUBAREA_HEIGHT } from './PreparationLayout.js';
import { BATTLE_AREA_HEIGHT, BATTLE_ENEMY_SLOT_COUNT, HERO_SLOT_SIZE } from './HeroSlotLayout.js';

export { PREPARATION_LAYOUT, PREPARATION_SUBAREA_HEIGHT };

export const GAME_AREA_BASE = Object.freeze({
  preparationSubareaCount: 4,
  preparationSubareaGap: 32,
  warehouseGap: 32,
  rightAreaGap: 32,
  warehouseWidth: HERO_SLOT_SIZE * BATTLE_ENEMY_SLOT_COUNT,
  battleHeight: BATTLE_AREA_HEIGHT,
  rightAreaWidth: 600,
  guildAndTrainingHeight: 320,
});

export const PREPARATION_HEIGHT = PREPARATION_SUBAREA_HEIGHT * GAME_AREA_BASE.preparationSubareaCount
  + GAME_AREA_BASE.preparationSubareaGap * (GAME_AREA_BASE.preparationSubareaCount - 1);
export const SHOP_HEIGHT = PREPARATION_HEIGHT
  - GAME_AREA_BASE.guildAndTrainingHeight * 2
  - GAME_AREA_BASE.rightAreaGap * 2;

const WAREHOUSE_X = PREPARATION_LAYOUT.panelWidth + GAME_AREA_BASE.warehouseGap;
const WAREHOUSE_Y = GAME_AREA_BASE.battleHeight + GAME_AREA_BASE.warehouseGap;
const RIGHT_AREA_X = WAREHOUSE_X + GAME_AREA_BASE.warehouseWidth + GAME_AREA_BASE.warehouseGap;
const GUILD_Y = WAREHOUSE_Y + SHOP_HEIGHT + GAME_AREA_BASE.rightAreaGap;
const TRAINING_Y = GUILD_Y + GAME_AREA_BASE.guildAndTrainingHeight + GAME_AREA_BASE.rightAreaGap;

export const WORLD_SIZE = Object.freeze({
  width: RIGHT_AREA_X + GAME_AREA_BASE.rightAreaWidth,
  height: WAREHOUSE_Y + PREPARATION_HEIGHT,
});

export const GAME_AREAS = Object.freeze({
  battle: Object.freeze({ x: WAREHOUSE_X, y: 0, width: GAME_AREA_BASE.warehouseWidth, height: GAME_AREA_BASE.battleHeight }),
  preparation: Object.freeze({ x: 0, y: WAREHOUSE_Y, width: PREPARATION_LAYOUT.panelWidth, height: PREPARATION_HEIGHT }),
  warehouse: Object.freeze({ x: WAREHOUSE_X, y: WAREHOUSE_Y, width: GAME_AREA_BASE.warehouseWidth, height: PREPARATION_HEIGHT }),
  shop: Object.freeze({ x: RIGHT_AREA_X, y: WAREHOUSE_Y, width: GAME_AREA_BASE.rightAreaWidth, height: SHOP_HEIGHT }),
  guild: Object.freeze({ x: RIGHT_AREA_X, y: GUILD_Y, width: GAME_AREA_BASE.rightAreaWidth, height: GAME_AREA_BASE.guildAndTrainingHeight }),
  training: Object.freeze({ x: RIGHT_AREA_X, y: TRAINING_Y, width: GAME_AREA_BASE.rightAreaWidth, height: GAME_AREA_BASE.guildAndTrainingHeight }),
});

export function getPreparationSubareaBounds(index) {
  if (!Number.isInteger(index) || index < 0 || index >= GAME_AREA_BASE.preparationSubareaCount) {
    throw new RangeError(`Unknown preparation subarea: ${index}`);
  }
  return Object.freeze({
    x: GAME_AREAS.preparation.x,
    y: GAME_AREAS.preparation.y + index * (PREPARATION_SUBAREA_HEIGHT + GAME_AREA_BASE.preparationSubareaGap),
    width: GAME_AREAS.preparation.width,
    height: PREPARATION_SUBAREA_HEIGHT,
  });
}
