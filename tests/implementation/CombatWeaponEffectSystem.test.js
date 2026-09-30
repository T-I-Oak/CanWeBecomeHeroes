import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import CombatEffectSystem from '../../src/game/CombatEffectSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import { getEnemyDefinition } from '../../src/game/EnemyCatalog.js';
import { WEAPON_ATTACKS, getAttackDamage, getRandomModifier } from '../../src/game/CombatWeaponAttack.js';
import { getActionGaugeMaximum } from '../../src/game/CombatActionGaugeSystem.js';
import gameText from '../../src/game/readGameText.js';
import GameTextRepository, { textPart } from '../../src/game/GameTextRepository.js';
import { expandLanguageResource } from '../../../GameWorksOAK/src/lib/core/i18n.js';

const textRepository = await new GameTextRepository({ loadResource: async (path) => textPart(expandLanguageResource(gameText), path) }).load();

test('holy book reduces every ally attribute with a base reduction even without cloth tags', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const cleric = new HeroFactory().create({ profession: 'cleric', x: 100, y: 100, stamina: 3 });
  const ally = new HeroFactory().create({ profession: 'swordfighter', x: 200, y: 100, stamina: 3 });
  cleric.attributes = { fire: 4, water: 2, lightning: 1 };
  ally.attributes = { fire: 4, water: 2, lightning: 1 };
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  battle.applyHolyBook(cleric, [cleric, ally]);

  assert.equal(cleric.attributes.fire, 3.5);
  assert.equal(ally.attributes.fire, 3.5);
  assert.equal(ally.attributes.water, 1.75);
  const taglessUser = new HeroFactory().create({ profession: 'swordfighter', x: 300, y: 100, stamina: 3 });
  taglessUser.attributes.fire = 4;
  battle.applyHolyBook(taglessUser, [taglessUser]);
  assert.equal(taglessUser.attributes.fire, 3.9);
});

test('shield grants every ally a base physical reduction even without iron tags', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const guard = new HeroFactory().create({ profession: 'guard', x: 100, y: 100, stamina: 3 });
  const ally = new HeroFactory().create({ profession: 'swordfighter', x: 200, y: 100, stamina: 3 });
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  battle.applyShield(guard, [guard, ally]);
  assert.equal(guard.physicalDamageReduction, 0.25);
  assert.equal(ally.physicalDamageReduction, 0.25);

  const taglessUser = new HeroFactory().create({ profession: 'swordfighter', x: 300, y: 100, stamina: 3 });
  battle.applyShield(taglessUser, [taglessUser]);
  assert.equal(taglessUser.physicalDamageReduction, 0.05);
});

test('banner advances only allies using their gauge maximum before bow shortening', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const actor = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  actor.tags.push('reputation', 'reputation');
  const ally = new HeroFactory().create({ profession: 'swordfighter', x: 200, y: 100, stamina: 3 });
  ally.equip(itemFactory.createWeapon({ weapon: 'bow', tags: [], x: 0, y: 0 }));
  ally.equip(itemFactory.createWeapon({ weapon: 'bow', tags: [], x: 0, y: 0 }));
  ally.chip.actionGauge = 1;
  const battle = new BattleSystem(board, { controller: {}, itemFactory, logger: { info: () => {} } });

  battle.applyBanner(actor, [actor, ally]);

  assert.equal(actor.chip.actionGauge, null);
  assert.equal(ally.chip.actionGauge, 2.875);
  assert.equal(getActionGaugeMaximum(ally), 12);
});

test('holy symbol and tarot cards support only other allies', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const actor = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 1 });
  actor.tags.push('blessing', 'blessing', 'fortune', 'fortune');
  const ally = new HeroFactory().create({ profession: 'swordfighter', x: 200, y: 100, stamina: 1 });
  ally.luckBonus = 0.1;
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  battle.applyHolySymbol(actor, [actor, ally]);
  battle.applyTarotCards(actor, [actor, ally]);

  assert.equal(actor.stamina, 1);
  assert.equal(actor.luckBonus, 0);
  assert.equal(ally.stamina, 1.15);
  assert.equal(ally.luckBonus, 0.25);
});

test('claw steals the highest available eligible item tier for heroes and enemies', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const hero = new HeroFactory().create({ profession: 'thief', x: 100, y: 100, stamina: 3, maximums: { speed: 7 } });
  hero.tags.push('dexterity', 'dexterity', 'dexterity');
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ totalTagCount: 0 });
  const enemyItem = itemFactory.createWeapon({ weapon: 'sword', tags: ['valor', 'valor', 'fire'], x: 0, y: 0 });
  enemy.equipment = [enemyItem];
  enemy.refreshDerivedValues();
  const dropped = [];
  const heroBattle = new BattleSystem(board, { controller: { addToWarehouse: (item) => dropped.push(item) }, itemFactory, random: () => 0, logger: { info: () => {} } });

  assert.equal(heroBattle.resolveTheft(hero, enemy), enemyItem);
  assert.equal(enemy.equipment.length, 0);
  assert.deepEqual(dropped, [enemyItem]);

  const enemyThief = new EnemyFactory({ itemFactory }).createInitialEncounter({ totalTagCount: 0 });
  enemyThief.tags = ['dexterity', 'dexterity', 'dexterity', 'dexterity', 'dexterity'];
  enemyThief.equipment = [];
  enemyThief.refreshDerivedValues();
  const targetHero = new HeroFactory().create({ profession: 'swordfighter', x: 200, y: 100, stamina: 3 });
  const warehouseItem = itemFactory.createWeapon({ weapon: 'staff', tags: ['arcane', 'water'], x: 300, y: 100 });
  board.addChip(warehouseItem.chip);
  const entities = new Map([[warehouseItem.chip.id, warehouseItem]]);
  const enemyBattle = new BattleSystem(board, {
    controller: { entities, remove: (item) => { board.removeChip(item.chip); entities.delete(item.chip.id); } }, itemFactory, random: () => 0, logger: { info: () => {} },
  });

  assert.equal(enemyBattle.resolveTheft(enemyThief, targetHero), warehouseItem);
  assert.deepEqual(enemyThief.equipment, [warehouseItem]);
  assert.equal(entities.size, 0);
});

test('claw transfers between same-side combatants through the target equipment', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const heroThief = new HeroFactory().create({ profession: 'thief', x: 100, y: 100, stamina: 3 });
  const targetHero = new HeroFactory().create({ profession: 'swordfighter', x: 200, y: 100, stamina: 3 });
  const heroItem = itemFactory.createWeapon({ weapon: 'sword', tags: ['valor'], x: 0, y: 0 });
  targetHero.equip(heroItem);
  const heroDrops = [];
  const heroBattle = new BattleSystem(board, {
    controller: { addToWarehouse: (item) => heroDrops.push(item) }, itemFactory, random: () => 0, logger: { info: () => {} },
  });

  assert.equal(heroBattle.resolveTheft(heroThief, targetHero), heroItem);
  assert.equal(targetHero.equipment.rightHand, null);
  assert.deepEqual(heroDrops, [heroItem]);

  const enemyThief = new EnemyFactory({ itemFactory }).createInitialEncounter({ totalTagCount: 0 });
  enemyThief.tags = ['dexterity', 'dexterity', 'dexterity'];
  enemyThief.equipment = [];
  enemyThief.refreshDerivedValues();
  const targetEnemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ totalTagCount: 0 });
  const enemyItem = itemFactory.createWeapon({ weapon: 'staff', tags: ['arcane'], x: 0, y: 0 });
  targetEnemy.equipment = [enemyItem];
  targetEnemy.refreshDerivedValues();
  const enemyBattle = new BattleSystem(board, { controller: {}, itemFactory, random: () => 0, logger: { info: () => {} } });

  assert.equal(enemyBattle.resolveTheft(enemyThief, targetEnemy), enemyItem);
  assert.deepEqual(targetEnemy.equipment, []);
  assert.deepEqual(enemyThief.equipment, [enemyItem]);
});

test('claw proceeds to lower theft tiers when a higher tag tier is absent', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const hero = new HeroFactory().create({ profession: 'thief', x: 100, y: 100, stamina: 3 });
  hero.tags.push('dexterity');
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ totalTagCount: 0 });
  const item = itemFactory.createWeapon({ weapon: 'sword', tags: ['valor', 'fire'], x: 0, y: 0 });
  enemy.equipment = [item];
  const dropped = [];
  const battle = new BattleSystem(board, { controller: { addToWarehouse: (stolen) => dropped.push(stolen) }, itemFactory, random: () => 0, logger: { info: () => {} } });

  assert.equal(hero.getTagSkillLevel('dexterity'), 2);
  assert.equal(battle.resolveTheft(hero, enemy), item);
  assert.deepEqual(dropped, [item]);
});
