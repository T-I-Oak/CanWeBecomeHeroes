import test from 'node:test';
import assert from 'node:assert/strict';
import CombatDamageSystem from '../../src/game/CombatDamageSystem.js';
import CombatConditionSystem from '../../src/game/CombatConditionSystem.js';

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
