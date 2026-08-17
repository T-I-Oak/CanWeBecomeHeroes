import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_AREA_BASE, GAME_AREAS, getPreparationSubareaBounds, PREPARATION_HEIGHT, PREPARATION_SUBAREA_HEIGHT, SHOP_HEIGHT, WORLD_SIZE } from '../../src/game/GameAreas.js';
import { BATTLE_AREA_HEIGHT, BATTLE_ENEMY_AREA_HEIGHT, BATTLE_ENEMY_SLOT_COUNT, ENEMY_CHIP_DIAMETER, HERO_CHIP_DIAMETER, HERO_SLOT_SIZE, LARGE_ENEMY_SLOT_SPAN } from '../../src/game/HeroSlotLayout.js';

test('game areas form the fixed world with four preparation subareas', () => {
  assert.equal(PREPARATION_HEIGHT, PREPARATION_SUBAREA_HEIGHT * 4 + GAME_AREA_BASE.preparationSubareaGap * 3);
  assert.equal(GAME_AREAS.preparation.height, PREPARATION_HEIGHT);
  assert.equal(GAME_AREAS.warehouse.height, PREPARATION_HEIGHT);
  assert.equal(GAME_AREAS.battle.width, GAME_AREAS.warehouse.width);
  assert.equal(GAME_AREAS.battle.width, HERO_SLOT_SIZE * BATTLE_ENEMY_SLOT_COUNT);
  assert.equal(BATTLE_ENEMY_AREA_HEIGHT, HERO_CHIP_DIAMETER * 2);
  assert.equal(ENEMY_CHIP_DIAMETER.large, HERO_CHIP_DIAMETER * LARGE_ENEMY_SLOT_SPAN);
  assert.equal(GAME_AREAS.battle.height, BATTLE_AREA_HEIGHT);
  assert.equal(SHOP_HEIGHT, PREPARATION_HEIGHT - GAME_AREAS.guild.height - GAME_AREAS.training.height - GAME_AREA_BASE.rightAreaGap * 2);
  assert.equal(GAME_AREAS.shop.height + GAME_AREAS.guild.height + GAME_AREAS.training.height + GAME_AREA_BASE.rightAreaGap * 2, PREPARATION_HEIGHT);
  assert.equal(GAME_AREAS.warehouse.x - GAME_AREAS.preparation.width, GAME_AREA_BASE.warehouseGap);
  assert.equal(GAME_AREAS.warehouse.y - GAME_AREAS.battle.height, GAME_AREA_BASE.warehouseGap);
  assert.equal(GAME_AREAS.shop.x - (GAME_AREAS.warehouse.x + GAME_AREAS.warehouse.width), GAME_AREA_BASE.warehouseGap);
  assert.deepEqual(getPreparationSubareaBounds(1), {
    x: GAME_AREAS.preparation.x,
    y: GAME_AREAS.preparation.y + PREPARATION_SUBAREA_HEIGHT + GAME_AREA_BASE.preparationSubareaGap,
    width: GAME_AREAS.preparation.width,
    height: PREPARATION_SUBAREA_HEIGHT,
  });
  assert.deepEqual(WORLD_SIZE, { width: 2608, height: 1760 });
});
