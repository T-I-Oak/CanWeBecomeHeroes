import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import BattleSystem, { BATTLE_VICTORY_DELAY_TICKS, getActionGaugeMaximum, getAttackDamage, getRandomModifier } from '../../src/game/BattleSystem.js';
import CombatEffectSystem from '../../src/game/CombatEffectSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import { getEnemyDefinition } from '../../src/game/EnemyCatalog.js';

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

test('small arcane enemy resolves to the ghost catalog entry', () => {
  const enemy = new EnemyFactory().create({ size: 'small', tagAffinity: 'arcane', slotPosition: 4, maximumHp: 2, contributionPoints: 2, totalTagCount: 0 });

  assert.equal(enemy.definition.nameJa, 'ゴースト');
  assert.equal(enemy.chip.centerPath, '/assets/enemies/small-arcane.png');
  assert.deepEqual(enemy.tags, ['arcane']);
});

test('new small enemy catalog entries resolve their names and assets', () => {
  assert.deepEqual(getEnemyDefinition({ size: 'small', tagAffinity: 'reputation' }), {
    id: 'small-reputation',
    size: 'small',
    tagAffinity: 'reputation',
    nameKey: 'enemy.smallReputation',
    nameJa: 'ドワーフ',
    assetPath: '/assets/enemies/small-reputation.png',
    intrinsicTags: ['reputation'],
    baseHp: 2,
    baseContributionPoints: 10,
  });
  assert.deepEqual(getEnemyDefinition({ size: 'small', tagAffinity: 'lightning' }), {
    id: 'small-lightning',
    size: 'small',
    tagAffinity: 'lightning',
    nameKey: 'enemy.smallLightning',
    nameJa: '雷狼',
    assetPath: '/assets/enemies/small-lightning.png',
    intrinsicTags: ['lightning'],
    baseHp: 2,
    baseContributionPoints: 10,
  });
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
  assert.equal(battle.contributionPoints, 10);
  assert.deepEqual(removed, [enemy]);
  assert.equal(dropped.length, 5);
  assert.equal(dropped.reduce((total, item) => total + item.tags.length, 0), 5);
  assert.equal(battle.getElapsedTicks(1), 1);
  assert.match(records[0], /【剣士・アヴェリー】 -> 【ゴブリン】/);
  assert.match(records[0], /damage/);
});

test('enemy wipe locks the stage victory before completing it after the victory delay', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter();
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: enemy.chip.x, y: enemy.chip.y + 224, stamina: 3 });
  hero.currentArea = 'battle';
  hero.chip.height = 0;
  enemy.chip.height = 0;
  board.addChip(hero.chip);
  board.addChip(enemy.chip);
  const records = [];
  const battle = new BattleSystem(board, { controller: {}, itemFactory, logger: { info: () => {} }, gameLog: { log: (message, options) => records.push({ message, options }) } });

  battle.update({ heroes: [hero], enemies: [enemy], tick: 0, tickDelta: 1 });
  board.removeChip(enemy.chip);
  battle.update({ heroes: [hero], enemies: [enemy], tick: 1, tickDelta: 1 });

  assert.equal(battle.hasStageVictory(), true);
  assert.equal(battle.isStageComplete(), false);
  assert.equal(battle.defeatTick, 1);
  assert.deepEqual(records, [{ message: '敵を全滅させた。', options: { subject: 'system', level: 'info' } }]);
  battle.update({ heroes: [hero], enemies: [enemy], tick: 1 + BATTLE_VICTORY_DELAY_TICKS, tickDelta: BATTLE_VICTORY_DELAY_TICKS });
  assert.equal(battle.isStageComplete(), true);
  assert.equal(battle.stageCompleteTick, 1 + BATTLE_VICTORY_DELAY_TICKS);
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
  assert.equal(midBoss.contributionPoints, 50);
  assert.equal(boss.contributionPoints, 250);
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

  const board = new ChipBoard({ width: 3000, height: 2000 });
  const battle = new BattleSystem(board, { controller: {}, itemFactory, logger: { info: () => {} } });
  battle.updateActionGaugeMaximum(hero);
  assert.equal(hero.chip.actionGaugeBaseMaximum, 15 - hero.getStatus('speed'));
  assert.equal(hero.chip.actionGaugeMaximum / hero.chip.actionGaugeBaseMaximum, 0.8);

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

test('leaving the battle area clears all temporary battle state', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  hero.currentArea = 'battle';
  hero.targetArea = 'preparation';
  hero.chip.actionGauge = 4;
  hero.chip.actionGaugeMaximum = 15;
  hero.chip.actionGaugeBaseMaximum = 15;
  hero.attributes = { fire: 3, water: 2, lightning: 1 };
  hero.attributeSources = { fire: hero, water: hero, lightning: hero };
  hero.physicalDamageReduction = 0.5;
  hero.chip.attributeValues = hero.attributes;
  hero.chip.physicalDamageReduction = hero.physicalDamageReduction;
  hero.luckBonus = 0.25;
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  battle.update({ heroes: [hero], enemies: [], tick: 1, tickDelta: 1 });

  assert.equal(hero.chip.actionGauge, null);
  assert.equal(hero.chip.actionGaugeMaximum, null);
  assert.equal(hero.chip.actionGaugeBaseMaximum, null);
  assert.deepEqual(hero.attributes, { fire: 0, water: 0, lightning: 0 });
  assert.deepEqual(hero.attributeSources, { fire: null, water: null, lightning: null });
  assert.equal(hero.physicalDamageReduction, 0);
  assert.equal(hero.chip.physicalDamageReduction, 0);
  assert.equal(hero.luckBonus, 0);
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

test('each attribute uses the attacker luck roll to determine its application rate', () => {
  const randomValues = [0.25, 0.5, 0, 0.5];
  const battle = new BattleSystem(new ChipBoard({ width: 3000, height: 2000 }), {
    controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} }, random: () => randomValues.shift(),
  });
  const actor = {
    attributes: { water: 0 },
    getLuckDegree: () => 0.5,
    getTagSkillLevel: () => 0,
    getTagCount: (tag) => ({ fire: 1, water: 1, lightning: 0 })[tag] ?? 0,
  };
  const target = {
    attributes: { fire: 0, water: 0, lightning: 0 },
    attributeSources: { fire: null, water: null, lightning: null },
    chip: {},
    getLuckDegree: () => 0.95,
    getTagSkillLevel: () => 4,
  };

  battle.applyAttributes(actor, target, 1);

  assert.equal(target.attributes.fire, 0.5);
  assert.equal(target.attributes.water, 1);
  assert.equal(target.attributeSources.fire, actor);
  assert.equal(target.attributeSources.water, actor);
});

test('damage leaves a random knockback tilt that each action gradually restores', () => {
  const battle = new BattleSystem(new ChipBoard({ width: 3000, height: 2000 }), {
    controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} }, random: () => 0,
  });
  const target = { chip: { type: 'hero', tilt: 0 }, stamina: 3 };
  const actor = {
    chip: { type: 'hero', actionGauge: 0, tilt: -0.4 }, equipment: {},
    getStatus: () => 0, getCarriedWeight: () => 0,
  };

  battle.applyDamage(null, target, 'sword', 1);
  battle.updateActor(actor, [], 1000);

  assert.ok(target.chip.tilt < 0);
  assert.ok(Math.abs(actor.chip.tilt) < 0.4);
});

test('lightning propagates only through contiguous opponent slots', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const enemyFactory = new EnemyFactory();
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 500, y: 500, stamina: 10, maximums: { stamina: 10 } });
  hero.currentArea = 'battle';
  hero.currentSlotId = 'battle-2';
  const target = enemyFactory.createInitialEncounter({ slotPosition: 3, maximumHp: 10 });
  const adjacent = enemyFactory.createInitialEncounter({ slotPosition: 4, maximumHp: 10 });
  const separated = enemyFactory.createInitialEncounter({ slotPosition: 6, maximumHp: 10 });
  target.attributes.lightning = 3;
  [hero, target, adjacent, separated].forEach((entity) => board.addChip(entity.chip));
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  battle.propagate(hero, target, 'sword', 1, [hero, target, adjacent, separated]);

  assert.equal(adjacent.hp, 9.4);
  assert.equal(separated.hp, 10);
});

test('vitality recovers a fixed 0.2 per tag after a successful luck check', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 1 });
  hero.tags.push('vitality', 'vitality');
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ maximumHp: 3, totalTagCount: 0 });
  enemy.tags.push('vitality', 'vitality', 'vitality');
  enemy.hp = 2.5;
  const battle = new BattleSystem(board, { controller: {}, itemFactory, random: () => 0, logger: { info: () => {} } });

  assert.ok(Math.abs(battle.resolveVitality(hero) - 0.4) < 1e-9);
  assert.equal(hero.stamina, 1.4);
  assert.equal(battle.resolveVitality(enemy), 0.5);
  assert.equal(enemy.hp, 3);
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
  assert.equal(ally.stamina, 1.25);
  assert.equal(ally.luckBonus, 0.25);
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
