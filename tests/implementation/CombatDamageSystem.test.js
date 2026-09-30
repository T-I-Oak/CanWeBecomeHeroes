import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import CombatDamageSystem from '../../src/game/CombatDamageSystem.js';
import CombatConditionSystem from '../../src/game/CombatConditionSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';

test('damage application exposes its complete event to damage reactions', () => {
  const events = [];
  const actor = { id: 'actor' };
  const target = { hp: 5, chip: { type: 'enemy', tilt: 0 } };
  const damageSystem = new CombatDamageSystem({ random: () => 0, onDamageApplied: (event) => events.push(event) });

  damageSystem.applyDamage(actor, target, 'staff', 2, true);

  assert.equal(target.hp, 3);
  assert.deepEqual(events, [{ actor, target, type: 'staff', damage: 2, critical: true, category: null, participants: [] }]);
});

test('damage is rounded to hundredths before effects, logs, and reactions', () => {
  const events = [];
  const effectDamages = [];
  const target = { stamina: 3, chip: { type: 'hero', tilt: 0 } };
  const damageSystem = new CombatDamageSystem({
    random: () => 0,
    effects: { damage: (_target, damage) => effectDamages.push(damage) },
    recordDamage: (_actor, _target, damage) => events.push(damage),
    onDamageApplied: (event) => events.push(event.damage),
  });

  assert.equal(damageSystem.applyDamage({ id: 'actor' }, target, 'fire', 0.004), 0);
  assert.equal(target.stamina, 3);
  assert.deepEqual(effectDamages, []);
  assert.deepEqual(events, []);

  assert.equal(damageSystem.applyDamage({ id: 'actor' }, target, 'fire', 0.005), 0.01);
  assert.equal(target.stamina, 2.99);
  assert.deepEqual(effectDamages, [0.01]);
  assert.deepEqual(events, [0.01, 0.01]);
});

test('misfortune returns the critical share to its attacker before target physical protection', () => {
  const conditions = new CombatConditionSystem();
  const attacker = { stamina: 10, chip: { type: 'hero', tilt: 0 } };
  const target = {
    hp: 10,
    chip: { type: 'enemy', tilt: 0, physicalDamageReduction: 1 },
    physicalDamageReduction: 1,
    getTagSkillLevel: () => 0,
  };
  conditions.applyMisfortune(attacker, 0.5);
  const damageSystem = new CombatDamageSystem({ random: () => 0, conditionSystem: conditions });

  const dealt = damageSystem.applyPhysicalDamage(attacker, target, 'sword', 4, true, [attacker, target]);

  assert.equal(attacker.stamina, 8);
  assert.equal(dealt, 1.5);
  assert.equal(target.hp, 8.5);
});

test('misfortune returns a critical magic damage share without changing the remaining target damage', () => {
  const conditions = new CombatConditionSystem();
  const attacker = { stamina: 10, chip: { type: 'hero', tilt: 0 } };
  const target = { hp: 10, chip: { type: 'enemy', tilt: 0 } };
  conditions.applyMisfortune(attacker, 0.5);
  const damageSystem = new CombatDamageSystem({ random: () => 0, conditionSystem: conditions });

  const dealt = damageSystem.applyDamage(attacker, target, 'staff', 4, true, { category: 'magic', participants: [attacker, target] });

  assert.equal(attacker.stamina, 8);
  assert.equal(dealt, 2);
  assert.equal(target.hp, 8);
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
