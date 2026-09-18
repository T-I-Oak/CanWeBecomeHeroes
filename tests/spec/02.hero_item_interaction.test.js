import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import HeroItemInteractionController from '../../src/game/HeroItemInteractionController.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import ItemPickupController from '../../src/game/ItemPickupController.js';
import FacilityReturnSystem from '../../src/game/FacilityReturnSystem.js';
import ShopState from '../../src/game/ShopState.js';
import ShopSystem, { SHOP_PURCHASE_DELIVERY_TICKS } from '../../src/game/ShopSystem.js';
import EntityRegistry from '../../src/game/EntityRegistry.js';

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

test('買い物袋を持つHeroは売却後に2組の装備を受け取り、袋を消費して準備エリアへ帰還する', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'mage', x: 500, y: 500, stamina: 3, bounds: { x: 0, y: 0, width: 600, height: 400 } });
  hero.currentArea = 'shop';
  const itemFactory = new ItemFactory();
  const bag = itemFactory.createDestination({ destination: 'shopping-bag', x: 0, y: 0 });
  bag.store(itemFactory.createBodyItem({ part: 'head', tags: ['fire'], x: 0, y: 0 }));
  hero.equip(bag);
  const purchasedItems = [];
  const entityRegistry = new EntityRegistry();
  entityRegistry.registerTree(bag);
  const returns = new FacilityReturnSystem(board, new HeroSlotManager(), { random: () => 0.5 });
  const shop = new ShopSystem(board, new ShopState({ saleTag: 'fire', nextTag: 'water' }), returns, {
    entityRegistry,
    random: () => 0,
    onItemPurchased: (item) => purchasedItems.push(item),
  });

  const deliverySeconds = (SHOP_PURCHASE_DELIVERY_TICKS + 1) / 60;
  shop.update([hero], deliverySeconds);
  shop.update([hero], deliverySeconds);

  assert.equal(purchasedItems.length, 10);
  assert.equal(bag.storedItems.length, 0);
  assert.equal(hero.targetArea, 'preparation');
});

test('Heroの目的Itemが盤面から消えた場合は、次に装備可能なItemへ目標を切り替える', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const pickupController = new ItemPickupController(board, new HeroSlotManager());
  const hero = new HeroFactory().create({ profession: 'mage', x: 700, y: 700 });
  const selectedItem = new ItemFactory().createWeapon({ weapon: 'staff', tags: [], x: 800, y: 700 });
  const replacementItem = new ItemFactory().createWeapon({ weapon: 'sword', tags: [], x: 900, y: 700 });
  [hero, selectedItem, replacementItem].forEach((entity) => board.addChip(entity.chip));

  pickupController.start(hero, selectedItem);
  board.removeChip(selectedItem.chip);
  pickupController.update([selectedItem, replacementItem], 0.01);

  assert.equal(pickupController.states.get(hero).item, replacementItem);
});
