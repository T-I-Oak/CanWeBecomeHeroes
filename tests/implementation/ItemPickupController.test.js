import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';
import ItemPickupController from '../../src/game/ItemPickupController.js';
import HeroItemInteractionController from '../../src/game/HeroItemInteractionController.js';
import { CHIP_RADIUS } from '../../src/chips/Chip.js';

test('pickup controller keeps independent active states for multiple heroes', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const controller = new ItemPickupController(board, new HeroSlotManager());
  const heroFactory = new HeroFactory();
  const itemFactory = new ItemFactory();
  const firstHero = heroFactory.create({ profession: 'mage', x: 700, y: 700 });
  const secondHero = heroFactory.create({ profession: 'cleric', x: 900, y: 700 });
  const firstItem = itemFactory.createWeapon({ weapon: 'staff', tags: [], x: 800, y: 700 });
  const secondItem = itemFactory.createWeapon({ weapon: 'holy-book', tags: [], x: 1000, y: 700 });
  [firstHero, secondHero, firstItem, secondItem].forEach((entity) => board.addChip(entity.chip));

  controller.start(firstHero, firstItem);
  controller.start(secondHero, secondItem);

  assert.equal(controller.states.size, 2);
  assert.equal(controller.states.get(firstHero).item, firstItem);
  assert.equal(controller.states.get(secondHero).item, secondItem);
});

test('pickup controller retargets when another hero removes its target item', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const controller = new ItemPickupController(board, new HeroSlotManager());
  const hero = new HeroFactory().create({ profession: 'mage', x: 700, y: 700 });
  const target = new ItemFactory().createWeapon({ weapon: 'staff', tags: [], x: 800, y: 700 });
  const replacement = new ItemFactory().createWeapon({ weapon: 'sword', tags: [], x: 900, y: 700 });
  [hero, target, replacement].forEach((entity) => board.addChip(entity.chip));
  controller.start(hero, target);
  board.removeChip(target.chip);

  controller.update([target, replacement], 0.01);

  assert.equal(controller.states.get(hero).item, replacement);
});

test('pickup controller logs the facility when a hero starts for a reserved destination slot', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const messages = [];
  const controller = new ItemPickupController(board, new HeroSlotManager(), { log: (message, options) => messages.push({ message, options }) });
  const hero = new HeroFactory().create({ profession: 'cleric', x: 700, y: 700 });
  const item = new ItemFactory().createWeapon({ weapon: 'staff', tags: [], x: 800, y: 700 });
  [hero, item].forEach((entity) => board.addChip(entity.chip));
  controller.start(hero, item);
  controller.states.get(hero).item = null;

  controller.moveToDestinationSlot(controller.states.get(hero));

  assert.deepEqual(messages, [{ message: '【僧侶・ダーシー】は戦闘に向かって出発した。', options: { subject: 'hero', level: 'info', channel: 'battle' } }]);
});

test('a hero fills an equipped shopping bag with nearby normal items before going to the shop', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const controller = new ItemPickupController(board, new HeroSlotManager());
  const factory = new ItemFactory();
  const hero = new HeroFactory().create({ profession: 'mage', x: 700, y: 700 });
  const bag = factory.createDestination({ destination: 'shopping-bag', x: 0, y: 0 });
  const heldWeapon = factory.createWeapon({ weapon: 'staff', tags: [], x: 0, y: 0 });
  const saleItem = factory.createWeapon({ weapon: 'sword', tags: [], x: 700, y: 700 });
  hero.equip(bag);
  hero.equip(heldWeapon);
  board.addChip(hero.chip);
  board.addChip(saleItem.chip);
  const state = { hero, item: null, absorption: null, destinationSlot: null };

  controller.moveToNextItemOrDestination(state, [saleItem]);
  assert.equal(state.item, saleItem);
  assert.equal(state.collectionBag, bag);
  controller.updateState(state, [saleItem], 0);
  controller.updateState(state, [saleItem], 0.3);

  assert.deepEqual(bag.storedItems, [saleItem]);
  assert.equal(board.chips.includes(saleItem.chip), false);
});

test('a ready hero starts moving when one item is selected', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const pickupController = new ItemPickupController(board, new HeroSlotManager());
  const controller = new HeroItemInteractionController(board, pickupController);
  const hero = new HeroFactory().create({ profession: 'mage', x: 700, y: 700, stamina: 3 });
  const item = new ItemFactory().createWeapon({ weapon: 'staff', tags: [], x: 800, y: 700 });
  controller.add(hero);
  controller.add(item);

  controller.beginSelection(hero);
  controller.completeSelectionAt(item.chip.x, item.chip.y);

  assert.equal(controller.activeHero, null);
  assert.equal(pickupController.states.get(hero).item, item);
});

test('a stamina-five hero starts moving after selecting one item', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const pickupController = new ItemPickupController(board, new HeroSlotManager());
  const controller = new HeroItemInteractionController(board, pickupController);
  const hero = new HeroFactory().create({ profession: 'mage', x: 700, y: 700, stamina: 5 });
  const firstItem = new ItemFactory().createWeapon({ weapon: 'staff', tags: [], x: 800, y: 700 });
  [hero, firstItem].forEach((entity) => controller.add(entity));

  controller.beginSelection(hero);
  controller.completeSelectionAt(firstItem.chip.x, firstItem.chip.y);
  assert.equal(pickupController.states.get(hero).item, firstItem);
  assert.deepEqual(pickupController.states.get(hero).selectedItems, []);
});

test('adding an item to the warehouse starts the same drop used for new chips', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const controller = new HeroItemInteractionController(board, new ItemPickupController(board, new HeroSlotManager()));
  const item = new ItemFactory().createWeapon({ weapon: 'staff', tags: [], x: 800, y: 700 });
  item.chip.height = 0;

  controller.addToWarehouse(item);

  assert.equal(item.chip.height, CHIP_RADIUS.item * 2.8);
  assert.equal(item.chip.verticalVelocity, 0);
  assert.equal(board.chips.includes(item.chip), true);
});
