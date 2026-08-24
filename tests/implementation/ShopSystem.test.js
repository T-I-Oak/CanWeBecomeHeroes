import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import FacilityReturnSystem from '../../src/game/FacilityReturnSystem.js';
import ShopState from '../../src/game/ShopState.js';
import ShopSystem, { getGemAttempts, getSaleTagCount, SHOP_PURCHASE_DELIVERY_TICKS, SHOP_REVEAL_INTERVAL_TICKS, SHOP_SET_COUNT } from '../../src/game/ShopSystem.js';
import { GAME_AREAS } from '../../src/game/GameAreas.js';
import { createTrendEquipmentSet, createTrendProductTags } from '../../src/game/TrendEquipmentGenerator.js';

test('shop converts a bag sale into two nearby five-part equipment sets and returns the hero', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'mage', x: 500, y: 500, stamina: 3, bounds: { x: 0, y: 0, width: 600, height: 400 } });
  hero.currentArea = 'shop';
  const factory = new ItemFactory();
  const bag = factory.createDestination({ destination: 'shopping-bag', x: 0, y: 0 });
  bag.store(factory.createBodyItem({ part: 'head', tags: ['fire', 'fire', 'fire'], x: 0, y: 0 }));
  hero.equip(bag);
  board.addChip(hero.chip);
  const bought = [];
  const returns = new FacilityReturnSystem(board, new HeroSlotManager(), { random: () => 0.5 });
  hero.tags.push('gem');
  const logs = [];
  const shop = new ShopSystem(board, new ShopState({ saleTag: 'fire', nextTag: 'water' }), returns, { onItemPurchased: (item) => bought.push(item), random: () => 0, gameLog: { log: (message, options) => logs.push({ message, options }) } });

  shop.update([hero], 0);
  shop.update([hero], (SHOP_REVEAL_INTERVAL_TICKS - 1) / 60);
  assert.equal(bought.length, 0);
  assert.equal(shop.getTransaction().revealed, 0);
  assert.equal(bag.storedItems.length, 1);
  shop.update([hero], 1 / 60);
  assert.equal(shop.getTransaction().revealed, 1);
  shop.update([hero], (SHOP_PURCHASE_DELIVERY_TICKS - SHOP_REVEAL_INTERVAL_TICKS * 2) / 60);
  assert.equal(shop.getTransaction().revealed, 5);
  assert.ok(logs.some(({ options }) => options.subject === 'hero' && options.level === 'luck'));
  shop.update([hero], SHOP_REVEAL_INTERVAL_TICKS / 60);

  assert.equal(bought.length, 5);
  assert.equal(bag.storedItems.length, 1);
  assert.equal(shop.getTransaction().deliveredSets, 1);
  shop.update([hero], (SHOP_PURCHASE_DELIVERY_TICKS - SHOP_REVEAL_INTERVAL_TICKS) / 60);
  assert.equal(shop.getTransaction().revealed, 10);
  shop.update([hero], SHOP_REVEAL_INTERVAL_TICKS / 60);

  assert.equal(bag.storedItems.length, 0);
  assert.equal(bought.length, 10);
  assert.deepEqual(bought.map((item) => item.category), ['head', 'weapon', 'torso', 'weapon', 'feet', 'head', 'weapon', 'torso', 'weapon', 'feet']);
  assert.ok(bought.every((item) => item.chip.bounds.width === GAME_AREAS.warehouse.width));
  Array.from({ length: SHOP_SET_COUNT }, (_, index) => bought.slice(index * 5, index * 5 + 5)).forEach((set) => {
    const purchaseSpan = Math.max(...set.map((item) => item.chip.x)) - Math.min(...set.map((item) => item.chip.x));
    assert.ok(purchaseSpan <= 64);
  });
  assert.equal(hero.equipment.rightHand, null);
  assert.equal(hero.stamina, 0);
  assert.equal(hero.targetArea, 'preparation');
});

test('shop pricing and gem skill tiers follow the sale rules', () => {
  assert.equal(getSaleTagCount(0, 0), 5);
  assert.equal(getSaleTagCount(10, 0), 6);
  assert.equal(getSaleTagCount(117, 7), 15);
  assert.deepEqual([0, 1, 2, 3, 4].map(getGemAttempts), [0, 1, 2, 3, 4]);
});

test('shop creates a valid three-tag product before selecting each equipment item from it', () => {
  const productTags = createTrendProductTags('water', () => 0.75);
  assert.equal(productTags.filter((tag) => tag === 'water').length, 2);
  assert.equal(productTags.filter((tag) => ['fire', 'water', 'lightning', 'vitality', 'area'].includes(tag)).length, 2);

  const set = createTrendEquipmentSet({
    trendTag: 'water',
    tagBudget: 15,
    itemFactory: new ItemFactory(),
    random: () => 0.75,
  });

  assert.ok(set.every(({ item }) => item.tags.filter((tag) => tag === 'water').length <= 2));
  assert.equal(set.reduce((total, { item }) => total + item.tags.length, 0), 15);
});

test('hero exposes the highest unlocked tag-skill level', () => {
  const hero = new HeroFactory().create({ profession: 'merchant', x: 0, y: 0 });
  assert.equal(hero.getTagSkillLevel('gem'), 1);
  hero.tags.push('gem', 'gem', 'gem', 'gem');
  assert.equal(hero.getTagSkillLevel('gem'), 3);
});
