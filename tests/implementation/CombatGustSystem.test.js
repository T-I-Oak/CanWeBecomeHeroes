import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import CombatGustSystem from '../../src/game/CombatGustSystem.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';
import ItemPickupController from '../../src/game/ItemPickupController.js';
import HeroItemInteractionController from '../../src/game/HeroItemInteractionController.js';
import { GAME_AREAS } from '../../src/game/GameAreas.js';

function createFixture({ stamina = 3 } = {}) {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const slotManager = new HeroSlotManager();
  const pickupController = new ItemPickupController(board, slotManager);
  const controller = new HeroItemInteractionController(board, pickupController);
  const itemFactory = new ItemFactory();
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 760, y: 760, stamina });
  const sword = itemFactory.createWeapon({ weapon: 'sword', tags: ['valor'], x: 0, y: 0 });
  const shield = itemFactory.createWeapon({ weapon: 'shield', tags: ['iron'], x: 0, y: 0 });
  hero.equip(sword);
  hero.equip(shield);
  hero.currentArea = 'battle';
  controller.add(hero);
  const returns = [];
  const gustSystem = new CombatGustSystem({
    board,
    controller,
    pickupController,
    returnSystem: { begin: (target) => returns.push(target) },
    getWarehouseDropPosition: () => ({ x: GAME_AREAS.warehouse.x + 300, y: GAME_AREAS.warehouse.y + 300 }),
  });
  return { board, controller, gustSystem, hero, sword, shield, pickupController, returns };
}

test('gust moves a hero to the warehouse, drops every equipped item, then starts from its first weapon', () => {
  const { board, controller, gustSystem, hero, sword, shield, pickupController } = createFixture();

  assert.equal(gustSystem.begin(hero), true);
  assert.equal(hero.equipment.rightHand, null);
  assert.equal(hero.equipment.leftHand, null);
  assert.equal(hero.targetArea, 'warehouse');
  assert.equal(controller.hasEntity(sword), true);
  assert.equal(controller.hasEntity(shield), true);
  assert.equal(sword.chip.bounds.x, GAME_AREAS.warehouse.x);
  assert.equal(shield.chip.bounds.x, GAME_AREAS.warehouse.x);

  board.update(1);
  gustSystem.update();

  assert.equal(gustSystem.isGusting(hero), false);
  assert.equal(pickupController.states.get(hero).item, sword);
});

test('gust returns a low-stamina hero to preparation instead of starting another warehouse search', () => {
  const { board, gustSystem, hero, pickupController, returns } = createFixture({ stamina: 2.99 });

  gustSystem.begin(hero);
  board.update(1);
  gustSystem.update();

  assert.deepEqual(returns, [hero]);
  assert.equal(pickupController.states.has(hero), false);
});
