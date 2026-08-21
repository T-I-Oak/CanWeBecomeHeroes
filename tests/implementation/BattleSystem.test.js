import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import BattleSystem, { getAttackDamage } from '../../src/game/BattleSystem.js';
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
  assert.equal(dropped.length, 1);
  assert.equal(dropped[0].tags.includes('valor'), true);
  assert.equal(battle.getElapsedTicks(1), 1);
  assert.match(records[0], /剣士・アヴェリー -> enemy:small-valor/);
  assert.match(records[0], /damage/);
});

test('magic standard damage uses half the physical standard divisor', () => {
  const actor = { getStatus: () => 1 };
  assert.equal(getAttackDamage(actor, { stat: 'power', multiplier: 1 }), 0.75);
  assert.equal(getAttackDamage(actor, { stat: 'magic', multiplier: 1 }), 0.375);
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

test('physical reduction is consumed and iron reflects part of the remaining physical damage', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const actor = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  const target = new HeroFactory().create({ profession: 'guard', x: 200, y: 100, stamina: 3 });
  target.physicalDamageReduction = 0.2;
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  const dealt = battle.applyPhysicalDamage(actor, target, 'sword', 1, false, [actor, target]);

  assert.equal(target.physicalDamageReduction, 0);
  assert.ok(Math.abs(dealt - 0.72) < 1e-9);
  assert.ok(Math.abs(target.stamina - 2.28) < 1e-9);
  assert.ok(Math.abs(actor.stamina - 2.82) < 1e-9);
});
