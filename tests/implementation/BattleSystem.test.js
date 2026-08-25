import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import BattleSystem, { getActionGaugeMaximum, getAttackDamage, getRandomModifier } from '../../src/game/BattleSystem.js';
import CombatEffectSystem from '../../src/game/CombatEffectSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';

test('initial enemy has five tagless equipment items and its affinity as an intrinsic tag', () => {
  const enemy = new EnemyFactory().createInitialEncounter();
  assert.equal(enemy.equipment.length, 5);
  assert.equal(enemy.tags.filter((tag) => tag === 'valor').length, 1);
  assert.equal(enemy.equipment.flatMap((item) => item.tags).length, 0);
  assert.equal(enemy.getStatus('power'), 1);
  assert.equal(enemy.chip.tagPaths.length, 1);
  assert.equal(enemy.hp, 2);
  assert.equal(enemy.chip.radius, 64);
});

test('a full action gauge resolves basic damage, awards contribution, drops an item, and records elapsed ticks', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ random: () => 0 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: enemy.chip.x, y: enemy.chip.y + 224, stamina: 3 });
  hero.equip(itemFactory.createWeapon({ weapon: 'sword', tags: [], x: 0, y: 0 }));
  hero.currentArea = 'battle';
  hero.chip.height = 0;
  enemy.chip.height = 0;
  board.addChip(hero.chip);
  board.addChip(enemy.chip);
  const dropped = [];
  const removed = [];
  const controller = {
    remove: (entity) => removed.push(entity),
    addToWarehouse: (item) => dropped.push(item),
  };
  const records = [];
  const battle = new BattleSystem(board, { controller, itemFactory, random: () => 0, logger: { info: (message) => records.push(message) } });

  battle.update({ heroes: [hero], enemies: [enemy], tick: 0, tickDelta: 1000 });
  battle.update({ heroes: [hero], enemies: [enemy], tick: 1, tickDelta: 1000 });

  assert.equal(board.chips.includes(enemy.chip), false);
  assert.equal(battle.contributionPoints, 2);
  assert.deepEqual(removed, [enemy]);
  assert.equal(dropped.length, 5);
  assert.equal(dropped.reduce((total, item) => total + item.tags.length, 0), 5);
  assert.equal(battle.getElapsedTicks(1), 1);
  assert.match(records[0], /【剣士・アヴェリー】 -> 【ゴブリン】/);
  assert.match(records[0], /damage/);
});

test('enemy rank determines the number and tag budgets of dropped equipment sets', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const battle = new BattleSystem(board, { controller: {}, itemFactory, random: () => 0, logger: { info: () => {} } });
  const enemyFactory = new EnemyFactory({ itemFactory });
  const midBoss = enemyFactory.createInitialEncounter({ rank: 'midBoss' });
  const boss = enemyFactory.createInitialEncounter({ rank: 'boss' });

  const midBossDrops = battle.createEnemyDrops(midBoss);
  const bossDrops = battle.createEnemyDrops(boss);

  assert.equal(midBossDrops.length, 10);
  assert.equal(midBossDrops.reduce((total, item) => total + item.tags.length, 0), 20);
  assert.equal(bossDrops.length, 15);
  assert.equal(bossDrops.reduce((total, item) => total + item.tags.length, 0), 45);
});

test('magic standard damage uses half the physical standard divisor', () => {
  const actor = { getStatus: () => 1 };
  assert.equal(getAttackDamage(actor, { stat: 'power', multiplier: 1 }), 0.75);
  assert.equal(getAttackDamage(actor, { stat: 'magic', multiplier: 1 }), 0.375);
});

test('battle random modifiers range from eighty through one hundred twenty percent', () => {
  assert.equal(getRandomModifier(() => 0), 0.8);
  assert.ok(Math.abs(getRandomModifier(() => 1) - 1.2) < 1e-9);
});

test('an actor with no opponent spends a full action gauge without performing an attack', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  hero.currentArea = 'battle';
  hero.chip.height = 0;
  board.addChip(hero.chip);
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  battle.battleStartTick = 0;
  battle.update({ heroes: [hero], enemies: [], tick: 1, tickDelta: 1000 });

  assert.equal(hero.chip.actionGauge, 0);
  assert.equal(hero.stamina, 3);
});

test('bows shorten the action gauge by ten percent per weapon up to five weapons', () => {
  const itemFactory = new ItemFactory();
  const hero = new HeroFactory().create({ profession: 'hunter', x: 100, y: 100, stamina: 3 });
  hero.equip(itemFactory.createWeapon({ weapon: 'bow', tags: [], x: 0, y: 0 }));
  hero.equip(itemFactory.createWeapon({ weapon: 'bow', tags: [], x: 0, y: 0 }));
  assert.equal(getActionGaugeMaximum(hero), (15 - hero.getStatus('speed')) * 0.8);

  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ totalTagCount: 0 });
  enemy.equipment = Array.from({ length: 6 }, () => itemFactory.createWeapon({ weapon: 'bow', tags: [], x: 0, y: 0 }));
  enemy.refreshDerivedValues();
  assert.equal(getActionGaugeMaximum(enemy), (15 - enemy.getStatus('speed')) * 0.5);
});

test('stealing a bow immediately refreshes the affected action gauge maximum', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const hero = new HeroFactory().create({ profession: 'thief', x: 100, y: 100, stamina: 3 });
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ totalTagCount: 0 });
  const bow = itemFactory.createWeapon({ weapon: 'bow', tags: [], x: 0, y: 0 });
  enemy.equipment = [bow];
  enemy.refreshDerivedValues();
  const battle = new BattleSystem(board, { controller: { addToWarehouse: () => {} }, itemFactory, logger: { info: () => {} } });

  battle.transferStolenItem(hero, enemy, bow);

  assert.equal(enemy.chip.actionGaugeMaximum, 15 - enemy.getStatus('speed'));
});

test('leaving the battle area clears an actor action gauge', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  hero.currentArea = 'battle';
  hero.targetArea = 'preparation';
  hero.chip.actionGauge = 4;
  hero.chip.actionGaugeMaximum = 15;
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  battle.update({ heroes: [hero], enemies: [], tick: 1, tickDelta: 1 });

  assert.equal(hero.chip.actionGauge, null);
  assert.equal(hero.chip.actionGaugeMaximum, null);
});

test('attribute values are applied by maximum and decay every sixty ticks', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  hero.attributes.fire = 2;
  hero.attributes.water = 1;
  hero.attributes.lightning = 0.5;
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory() });

  battle.updateAttributes([hero], 60);

  assert.ok(Math.abs(hero.stamina - 2.8) < 1e-9);
  assert.ok(Math.abs(hero.attributes.fire - 1.8) < 1e-9);
  assert.ok(Math.abs(hero.attributes.water - 0.85) < 1e-9);
  assert.ok(Math.abs(hero.attributes.lightning - 0.375) < 1e-9);
  assert.equal(hero.chip.attributeValues, hero.attributes);
});

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

test('claw steals the highest available eligible item tier for heroes and enemies', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const hero = new HeroFactory().create({ profession: 'thief', x: 100, y: 100, stamina: 3 });
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

test('one action aggregates miss and damage feedback by target with critical priority', () => {
  const effects = new CombatEffectSystem();
  const target = { chip: {} };

  effects.beginAction();
  effects.miss(target);
  effects.damage(target, 0.1);
  effects.damage(target, 0.2, true);
  effects.endAction();

  assert.equal(effects.popups.length, 1);
  assert.equal(effects.popups[0].label, 'critical 30');
  assert.equal(effects.hits.length, 1);
});

test('one action records one visible battle log per actor and target', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  const enemy = new EnemyFactory().createInitialEncounter();
  const records = [];
  const battle = new BattleSystem(board, { gameLog: { log: (message, options) => records.push({ message, options }) } });

  battle.actionLogResults = new Map();
  battle.recordMiss(hero, enemy);
  battle.recordDamage(hero, enemy, 0.1, false);
  battle.recordDamage(hero, enemy, 0.2, true);
  battle.flushActionLogs();

  assert.deepEqual(records, [{
    message: '【剣士・アヴェリー】は【ゴブリン】に会心ダメージ30を与えた。',
    options: { subject: 'hero', level: 'luck' },
  }]);
});

test('a missed action records a visible unlucky battle log', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  const enemy = new EnemyFactory().createInitialEncounter();
  const records = [];
  const battle = new BattleSystem(board, { gameLog: { log: (message, options) => records.push({ message, options }) } });

  battle.actionLogResults = new Map();
  battle.recordMiss(hero, enemy);
  battle.flushActionLogs();

  assert.deepEqual(records, [{
    message: '【剣士・アヴェリー】の【ゴブリン】への攻撃は外れた。',
    options: { subject: 'hero', level: 'unluck' },
  }]);
});

test('a defeat replaces the action damage log with a visible defeat log', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  const enemy = new EnemyFactory().createInitialEncounter();
  const records = [];
  const battle = new BattleSystem(board, { gameLog: { log: (message, options) => records.push({ message, options }) } });

  battle.actionLogResults = new Map();
  battle.recordDamage(hero, enemy, 2, false);
  battle.recordDefeat(hero, enemy);
  battle.flushActionLogs();

  assert.deepEqual(records, [{
    message: '【剣士・アヴェリー】は【ゴブリン】を倒した。',
    options: { subject: 'hero', level: 'info' },
  }]);
});

test('physical reduction is consumed and iron reflects part of the remaining physical damage', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const actor = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  const target = new HeroFactory().create({ profession: 'guard', x: 200, y: 100, stamina: 3 });
  target.physicalDamageReduction = 0.2;
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  const dealt = battle.applyPhysicalDamage(actor, target, 'sword', 1, false, [actor, target]);

  assert.equal(target.physicalDamageReduction, 0);
  assert.equal(target.chip.physicalDamageReduction, 0);
  assert.ok(Math.abs(dealt - 0.72) < 1e-9);
  assert.ok(Math.abs(target.stamina - 2.28) < 1e-9);
  assert.ok(Math.abs(actor.stamina - 2.82) < 1e-9);
});

test('iron reflection uses tag-skill level instead of the raw iron tag count', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const actor = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  const target = new HeroFactory().create({ profession: 'guard', x: 200, y: 100, stamina: 3 });
  target.tags.push('iron', 'iron');
  target.physicalDamageReduction = 0.2;
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  const dealt = battle.applyPhysicalDamage(actor, target, 'sword', 1, false, [actor, target]);

  assert.equal(target.getTagSkillLevel('iron'), 2);
  assert.ok(Math.abs(dealt - 0.54) < 1e-9);
  assert.ok(Math.abs(actor.stamina - 2.64) < 1e-9);
});
