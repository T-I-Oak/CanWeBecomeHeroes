import test from 'node:test';
import assert from 'node:assert/strict';
import HeroFactory from '../../src/game/HeroFactory.js';
import Hero from '../../src/game/Hero.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import Enemy from '../../src/game/Enemy.js';
import { AREA_THEME } from '../../src/game/AreaTheme.js';
import { ATTRIBUTE_TAGS, TAG_ORDER } from '../../src/game/TagCatalog.js';

test('attribute tags use the shared fire water lightning area vitality order', () => {
  assert.deepEqual(ATTRIBUTE_TAGS, ['fire', 'water', 'lightning', 'area', 'vitality']);
  assert.deepEqual(TAG_ORDER, [
    'valor', 'arcane', 'dexterity', 'reputation', 'blessing',
    'iron', 'cloth', 'feather', 'gem', 'fortune',
    'fire', 'water', 'lightning', 'area', 'vitality',
  ]);
});

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

test('hero derives luck degree from its current stamina and blessing or fortune skill level', () => {
  const chip = { weight: 0 };
  const noLuckHero = new Hero({ profession: 'test', name: {}, tags: [], chip, maximums: { luck: 7 } });
  const blessingHero = new Hero({
    profession: 'test', name: {}, tags: ['blessing'], chip, stamina: 0, maximums: { luck: 7, stamina: 3 },
  });
  const fortuneHero = new Hero({
    profession: 'test', name: {}, tags: ['fortune', 'fortune', 'fortune'], chip, stamina: 3, maximums: { luck: 7, stamina: 3 },
  });

  assert.equal(noLuckHero.getLuckRate(), 0.05);
  assert.ok(Math.abs(blessingHero.getLuckRate() - 0.235) < 1e-9);
  blessingHero.stamina = 0.3;
  assert.ok(Math.abs(blessingHero.getLuckRate() - 0.15) < 1e-9);
  assert.ok(Math.abs(fortuneHero.getLuckRate() - 0.48) < 1e-9);
  fortuneHero.stamina = 2.4;
  assert.ok(Math.abs(fortuneHero.getLuckRate() - 0.35) < 1e-9);

  const fortuneEnemy = new Enemy({
    definition: {}, tags: ['fortune', 'fortune', 'fortune'], chip: {}, maximumHp: 10, contributionPoints: 0,
  });
  assert.ok(Math.abs(fortuneEnemy.getLuckDegree() - 0.48) < 1e-9);
});

test('status values use the greater of their two tag types instead of their sum', () => {
  const hero = new Hero({
    profession: 'test', name: {}, chip: { weight: 0 },
    maximums: { power: 7, magic: 7, speed: 7, negotiation: 7, luck: 7 },
    tags: [
      'valor', 'valor', 'iron', 'iron', 'iron', 'iron',
      'arcane', 'cloth', 'cloth', 'cloth',
      'dexterity', 'feather', 'feather',
      'reputation', 'gem', 'gem',
      'blessing', 'fortune', 'fortune', 'fortune',
    ],
  });

  assert.equal(hero.getStatus('power'), 4);
  assert.equal(hero.getStatus('magic'), 3);
  assert.equal(hero.getStatus('speed'), 2);
  assert.equal(hero.getStatus('negotiation'), 2);
  assert.equal(hero.getStatus('luck'), 3);
});

test('enemy maximums can cap its status independently of the default maximum', () => {
  const enemy = new EnemyFactory().create({
    size: 'small', tagAffinity: 'valor', slotPosition: 3, maximumHp: 3, contributionPoints: 0, totalTagCount: 0,
    maximums: { power: 3 },
  });
  enemy.tags = ['valor', 'valor', 'valor', 'valor'];
  assert.equal(enemy.getStatus('power'), 3);
});

test('entity tag counts use the corresponding status maximum while keeping raw equipment tags', () => {
  const hero = new Hero({
    profession: 'test', name: {}, chip: { weight: 0 },
    maximums: { power: 3, magic: 7, speed: 7, negotiation: 7, luck: 7 },
    tags: ['valor', 'valor', 'valor', 'valor', 'iron', 'iron', 'iron', 'iron', 'fire', 'fire', 'fire', 'fire'],
  });
  assert.equal(hero.getTagCount('valor'), 3);
  assert.equal(hero.getTagCount('iron'), 3);
  assert.equal(hero.getTagCount('fire'), 3);
  assert.equal(hero.getTagSkillLevel('valor'), 2);
  assert.equal(hero.getTags().filter((tag) => tag === 'fire').length, 4);
});

test('enemy equipment independently rolls each item three-tag candidate set', () => {
  let seed = 7;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const enemy = new EnemyFactory().create({
    size: 'small', tagAffinity: 'valor', slotPosition: 3, maximumHp: 3, contributionPoints: 0, totalTagCount: 15, random,
  });
  const bodyCandidates = enemy.equipment
    .filter((item) => item.category !== 'weapon')
    .map((item) => [...item.tags].sort().join(','));

  assert.ok(new Set(bodyCandidates).size > 1);
});

test('item factory calculates tag weight, price, and equipment assets', () => {
  const item = new ItemFactory().createWeapon({ weapon: 'sword', tags: ['valor', 'fire'], x: 100, y: 200 });
  assert.equal(item.chip.weight, 5);
  assert.equal(item.price, 8);
  assert.equal(item.fixedStatusTag, 'valor');
  assert.equal(item.equipmentAssets.head, '/assets/items/head-1.png');
  assert.deepEqual(item.chip.tagBaseColors, ['#8d5b3d', '#e1e8f0']);
  assert.deepEqual(item.chip.tagGlyphScales, [0.72, 0.72]);
});

test('body equipment variation follows the first sorted tag in the shared tag order', () => {
  const factory = new ItemFactory();
  assert.equal(factory.createBodyItem({ part: 'head', tags: ['vitality'], x: 0, y: 0 }).type, 'head-5');
  assert.equal(factory.createBodyItem({ part: 'head', tags: ['area'], x: 0, y: 0 }).type, 'head-4');
  assert.equal(factory.createBodyItem({ part: 'head', tags: ['water', 'cloth'], x: 0, y: 0 }).type, 'head-2');
});

test('tagless items have weight one, price one, and a selectable base asset', () => {
  const item = new ItemFactory().createWeapon({ weapon: 'staff', tags: [], x: 100, y: 200 });
  assert.equal(item.chip.weight, 1);
  assert.equal(item.price, 1);
  assert.equal(item.equipmentAssets.feet, '/assets/items/feet-1.png');
});

test('random body items receive tags and select their image from those tags', () => {
  const item = new ItemFactory().createRandomBodyItem({ part: 'head', x: 100, y: 200, random: () => 0.4 });
  assert.deepEqual(item.tags, ['blessing', 'blessing']);
  assert.equal(item.chip.centerPath, '/assets/items/head-5.png');
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
