import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import HeroItemInteractionController from '../../src/game/HeroItemInteractionController.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import ItemPickupController from '../../src/game/ItemPickupController.js';

test('shopping bag stores up to three warehouse items without allowing retrieval', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const controller = new HeroItemInteractionController(board, new ItemPickupController(board, new HeroSlotManager()));
  const factory = new ItemFactory();
  const bag = factory.createDestination({ destination: 'shopping-bag', x: 700, y: 700 });
  const destination = factory.createDestination({ destination: 'hero-license', x: 750, y: 700 });
  const items = ['staff', 'sword', 'shield', 'bow'].map((weapon, index) => factory.createWeapon({ weapon, tags: [], x: 800 + index * 50, y: 700 }));
  controller.addToWarehouse(bag);
  controller.addToWarehouse(destination);
  items.forEach((item) => controller.addToWarehouse(item));

  assert.equal(controller.storeInShoppingBag(items[0], bag), true);
  assert.equal(controller.storeInShoppingBag(items[1], bag), true);
  assert.equal(controller.storeInShoppingBag(items[2], bag), true);
  assert.equal(controller.storeInShoppingBag(items[3], bag), false);
  assert.equal(controller.storeInShoppingBag(destination, bag), false);
  assert.equal(bag.storedItems.length, 3);
  assert.equal(bag.chip.storageCount, 3);
  assert.equal(items[0].chip.isAbsorbing, true);
  controller.update(0.3);
  assert.equal(board.chips.includes(items[0].chip), false);
  assert.equal(board.chips.includes(items[3].chip), true);
});

test('an invalid target clears an item-to-bag selection', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const controller = new HeroItemInteractionController(board, new ItemPickupController(board, new HeroSlotManager()));
  const factory = new ItemFactory();
  const item = factory.createWeapon({ weapon: 'sword', tags: [], x: 800, y: 700 });
  const invalidItem = factory.createDestination({ destination: 'hero-license', x: 900, y: 700 });
  controller.add(item);
  controller.add(invalidItem);

  controller.tap(item.chip.x, item.chip.y);
  assert.equal(controller.hasSelectionSource(), true);
  assert.equal(controller.tap(invalidItem.chip.x, invalidItem.chip.y), false);
  assert.equal(controller.hasSelectionSource(), false);
});
