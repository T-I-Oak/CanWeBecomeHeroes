import test from 'node:test';
import assert from 'node:assert/strict';
import HeroFactory from '../../src/game/HeroFactory.js';
import Hero from '../../src/game/Hero.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import { AREA_THEME } from '../../src/game/AreaTheme.js';

test('hero factory creates a profession chip with its two fixed tags', () => {
  const hero = new HeroFactory().create({ profession: 'mage', x: 100, y: 200 });
  assert.deepEqual(hero.tags, ['arcane', 'arcane']);
  assert.equal(hero.chip.weight, 4);
  assert.equal(hero.chip.centerPath, '/assets/heroes/mage.png');
});

test('hero aggregates equipped item tags into status and chip weight', () => {
  const hero = new HeroFactory().create({ profession: 'mage', x: 100, y: 200 });
  const item = new ItemFactory().createWeapon({ weapon: 'sword', tags: ['valor', 'fire'], x: 100, y: 200 });
  hero.equip(item);
  assert.equal(hero.getTagCount('arcane'), 2);
  assert.equal(hero.getTagCount('valor'), 1);
  assert.equal(hero.getStatus('magic'), 2);
  assert.equal(hero.getStatus('power'), 1);
  assert.equal(hero.chip.weight, 9);
});

test('hero converts current luck from zero through seven into a luck rate', () => {
  const chip = { weight: 0 };
  const noLuckHero = new Hero({ profession: 'test', name: {}, tags: [], chip, maximums: { luck: 7 } });
  const maximumLuckHero = new Hero({
    profession: 'test', name: {}, chip, maximums: { luck: 7 },
    tags: ['blessing', 'blessing', 'blessing', 'blessing', 'blessing', 'blessing', 'blessing'],
  });
  assert.equal(noLuckHero.getLuckRate(), 0.05);
  assert.equal(maximumLuckHero.getLuckRate(), 0.75);
});

test('item factory calculates tag weight, price, and equipment assets', () => {
  const item = new ItemFactory().createWeapon({ weapon: 'sword', tags: ['valor', 'fire'], x: 100, y: 200 });
  assert.equal(item.chip.weight, 5);
  assert.equal(item.price, 8);
  assert.equal(item.fixedStatusTag, 'valor');
  assert.equal(item.equipmentAssets.head, '/assets/items/head-1.png');
});

test('tagless items have weight one, price one, and a selectable base asset', () => {
  const item = new ItemFactory().createWeapon({ weapon: 'staff', tags: [], x: 100, y: 200 });
  assert.equal(item.chip.weight, 1);
  assert.equal(item.price, 1);
  assert.equal(item.equipmentAssets.feet, '/assets/items/feet-1.png');
});

test('random body items receive tags and select their image from those tags', () => {
  const item = new ItemFactory().createRandomBodyItem({ part: 'head', x: 100, y: 200, random: () => 0.4 });
  assert.deepEqual(item.tags, ['dexterity', 'dexterity']);
  assert.equal(item.chip.centerPath, '/assets/items/head-3.png');
  assert.equal(item.chip.weight, 2);
});

test('tagless body items use a random image number', () => {
  const item = new ItemFactory().createBodyItem({ part: 'feet', tags: [], x: 100, y: 200, random: () => 0.8 });
  assert.equal(item.chip.centerPath, '/assets/items/feet-5.png');
});

test('random weapons only use their own status tag and up to two attributes', () => {
  const item = new ItemFactory().createRandomWeapon({ x: 100, y: 200, random: () => 0.1 });
  const statusTags = item.tags.filter((tag) => ['valor', 'iron', 'arcane', 'cloth', 'dexterity', 'feather', 'gem', 'reputation', 'blessing', 'fortune'].includes(tag));
  assert.ok(statusTags.every((tag) => tag === item.fixedStatusTag));
  assert.ok(item.tags.length <= 3);
});

test('destination items have no tags, weight one, and their destination asset', () => {
  const item = new ItemFactory().createDestination({ destination: 'shopping-bag', x: 100, y: 200 });
  assert.equal(item.category, 'destination');
  assert.deepEqual(item.tags, []);
  assert.equal(item.chip.weight, 1);
  assert.equal(item.price, 1);
  assert.equal(item.chip.centerPath, '/assets/items/hand-shopping-bag.png');
  assert.equal(item.destination, 'shop');
  assert.equal(item.chip.fillColor, AREA_THEME.shop.chipFill);
});

test('random equipment generation excludes destination items', () => {
  const factory = new ItemFactory();
  [0, 0.2, 0.5, 0.8, 0.99].forEach((randomValue) => {
    const item = factory.createRandomEquipment({ x: 100, y: 200, random: () => randomValue });
    assert.notEqual(item.category, 'destination');
  });
});
