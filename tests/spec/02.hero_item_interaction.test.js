import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import HeroItemInteractionController from '../../src/game/HeroItemInteractionController.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import ItemPickupController from '../../src/game/ItemPickupController.js';

test('買い物袋には倉庫Itemを3個まで格納でき、行き先Itemは格納できない', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const controller = new HeroItemInteractionController(board, new ItemPickupController(board, new HeroSlotManager()));
  const itemFactory = new ItemFactory();
  const bag = itemFactory.createDestination({ destination: 'shopping-bag', x: 700, y: 700 });
  const items = ['sword', 'shield', 'bow', 'staff'].map((weapon, index) => itemFactory.createWeapon({ weapon, tags: [], x: 800 + index * 40, y: 700 }));
  const destination = itemFactory.createDestination({ destination: 'hero-license', x: 1000, y: 700 });
  controller.addToWarehouse(bag);
  items.forEach((item) => controller.addToWarehouse(item));
  controller.addToWarehouse(destination);

  assert.deepEqual(items.map((item) => controller.storeInShoppingBag(item, bag)), [true, true, true, false]);
  assert.equal(controller.storeInShoppingBag(destination, bag), false);
  assert.equal(bag.storedItems.length, 3);
});
