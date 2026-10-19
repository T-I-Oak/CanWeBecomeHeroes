import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../../src/chips/ChipBoard.js';
import CombatGustSystem from '../../../src/game/CombatGustSystem.js';
import HeroFactory from '../../../src/game/HeroFactory.js';
import ItemFactory from '../../../src/game/ItemFactory.js';
import HeroSlotManager from '../../../src/game/HeroSlotManager.js';
import ItemPickupController from '../../../src/game/ItemPickupController.js';
import HeroItemInteractionController from '../../../src/game/HeroItemInteractionController.js';
import { GAME_AREAS } from '../../../src/game/GameAreas.js';

function createFixture({ stamina = 3, random = () => 0.25 } = {}) {
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
  hero.chip.height = 0;
  controller.add(hero);
  const returns = [];
  const gustSystem = new CombatGustSystem({
    board,
    controller,
    pickupController,
    returnSystem: { begin: (target) => returns.push(target) },
    getWarehouseDropPosition: () => ({ x: GAME_AREAS.warehouse.x + 500, y: GAME_AREAS.warehouse.y + 500 }),
    random,
  });
  return { board, controller, gustSystem, hero, sword, shield, pickupController, returns };
}

test('gust launches a full-size hero upward before dropping the hero and equipment together in the warehouse', () => {
  const { board, controller, gustSystem, hero, sword, shield, pickupController } = createFixture();

  assert.equal(gustSystem.begin(hero), true);
  assert.equal(hero.equipment.rightHand, null);
  assert.equal(hero.equipment.leftHand, null);
  assert.equal(hero.targetArea, 'warehouse');
  assert.equal(controller.hasEntity(sword), false);
  assert.equal(controller.hasEntity(shield), false);
  assert.equal(board.chips.includes(sword.chip), true);
  assert.equal(sword.chip.height, hero.chip.height);
  const start = { x: hero.chip.x, y: hero.chip.y };
  const destination = { x: GAME_AREAS.warehouse.x + 500, y: GAME_AREAS.warehouse.y + 500 };

  board.update(0.14);
  gustSystem.update();
  assert.ok(hero.chip.x > start.x && hero.chip.x < destination.x);
  assert.ok(hero.chip.y > start.y && hero.chip.y < destination.y);
  assert.ok(hero.chip.height > 0);
  assert.equal(hero.chip.scale, 1);
  assert.equal(controller.hasEntity(sword), false);
  assert.equal(sword.chip.height, hero.chip.height);
  assert.equal(sword.chip.scale, 1);
  assert.equal(pickupController.states.has(hero), false);

  board.update(2);
  assert.equal(hero.chip.height, hero.chip.dropHeight);
  const apexHeight = hero.chip.height;
  const beforeDrop = { x: hero.chip.x, y: hero.chip.y };
  gustSystem.update();

  assert.equal(gustSystem.isGusting(hero), true);
  assert.equal(hero.chip.x, destination.x);
  assert.equal(hero.chip.y, destination.y);
  assert.deepEqual({ x: hero.chip.x, y: hero.chip.y }, beforeDrop);
  assert.equal(hero.chip.scale, 1);
  assert.equal(hero.chip.height, apexHeight);
  assert.equal(sword.chip.height, apexHeight);
  assert.equal(controller.hasEntity(sword), true);
  assert.equal(controller.hasEntity(shield), true);
  assert.equal(sword.chip.bounds.x, GAME_AREAS.warehouse.x);
  assert.equal(shield.chip.bounds.x, GAME_AREAS.warehouse.x);
  assert.ok(Math.hypot(sword.chip.x - hero.chip.x, sword.chip.y - hero.chip.y) > hero.chip.radius * 2);
  assert.ok(sword.chip.height > 0);
  assert.ok(hero.chip.height > 0);
  assert.equal(hero.chip.verticalVelocity, 0);
  assert.equal(sword.chip.verticalVelocity, 0);
  assert.equal(shield.chip.verticalVelocity, 0);
  assert.equal(pickupController.states.has(hero), false);
  finishGust(board, gustSystem, hero);
  assert.equal(pickupController.states.get(hero).item, sword);
});

function finishGust(board, gustSystem, hero) {
  for (let frame = 0; frame < 600 && gustSystem.isGusting(hero); frame += 1) {
    board.update(1 / 60);
    gustSystem.update();
  }
  assert.equal(gustSystem.isGusting(hero), false);
}

test('gust returns a low-stamina hero to preparation instead of starting another warehouse search', () => {
  const { board, gustSystem, hero, pickupController, returns } = createFixture({ stamina: 2.99 });

  gustSystem.begin(hero);
  finishGust(board, gustSystem, hero);

  assert.deepEqual(returns, [hero]);
  assert.equal(pickupController.states.has(hero), false);
});

test('equipment emerges from the hero and retains its position and height when flight becomes a fall', () => {
  const { board, gustSystem, hero, sword, shield } = createFixture();
  gustSystem.begin(hero);
  for (const item of [sword, shield]) {
    assert.equal(item.chip.x, hero.chip.x);
    assert.equal(item.chip.y, hero.chip.y);
    assert.equal(item.chip.height, hero.chip.height);
  }
  board.update(0.01);
  gustSystem.update();
  const separation = Math.hypot(sword.chip.x - hero.chip.x, sword.chip.y - hero.chip.y);
  assert.ok(separation > 0 && separation < hero.chip.radius);
  board.update(hero.chip.rise.duration - hero.chip.rise.elapsed - 0.00001);
  gustSystem.update();
  const before = [hero, sword, shield].map(({ chip }) => ({ x: chip.x, y: chip.y, height: chip.height }));
  board.update(0.00002);
  gustSystem.update();
  [hero, sword, shield].forEach(({ chip }, index) => {
    assert.ok(Math.abs(chip.x - before[index].x) < 0.1);
    assert.ok(Math.abs(chip.y - before[index].y) < 0.1);
    assert.ok(Math.abs(chip.height - before[index].height) < 0.1);
    assert.equal(chip.scale, 1);
  });
});

test('all five equipped items scatter at varied directions and distances within the warehouse', () => {
  const draws = [0.2, 0.1, 0.1, 0.9, 0.8, 0.3, 0.4, 0.7, 0.2, 0.4, 0.9];
  const { board, controller, gustSystem, hero } = createFixture({ random: () => draws.shift() });
  const factory = new ItemFactory();
  for (const part of ['head', 'torso', 'feet']) hero.equip(factory.createBodyItem({ part, tags: [], x: 0, y: 0, random: () => 0 }));
  gustSystem.begin(hero);
  board.update(2);
  gustSystem.update();
  const equipment = [...controller.entities.values()].filter((entity) => entity.chip.type === 'item');
  assert.equal(equipment.length, 5);
  const distances = equipment.map((item) => Math.hypot(item.chip.x - hero.chip.x, item.chip.y - hero.chip.y));
  assert.ok(Math.max(...distances) - Math.min(...distances) > 50);
  const area = GAME_AREAS.warehouse;
  for (const item of equipment) {
    assert.ok(item.chip.x - item.chip.radius >= area.x);
    assert.ok(item.chip.x + item.chip.radius <= area.x + area.width);
    assert.ok(item.chip.y - item.chip.radius >= area.y);
    assert.ok(item.chip.y + item.chip.radius <= area.y + area.height);
    assert.ok(item.chip.height > 0);
    assert.equal(item.chip.verticalVelocity, 0);
  }
  assert.equal(draws.length, 0);
});
