import test from 'node:test';
import assert from 'node:assert/strict';
import CombatDamageSystem from '../../src/game/CombatDamageSystem.js';

test('damage application exposes its complete event to damage reactions', () => {
  const events = [];
  const actor = { id: 'actor' };
  const target = { hp: 5, chip: { type: 'enemy', tilt: 0 } };
  const damageSystem = new CombatDamageSystem({ random: () => 0, onDamageApplied: (event) => events.push(event) });

  damageSystem.applyDamage(actor, target, 'staff', 2, true);

  assert.equal(target.hp, 3);
  assert.deepEqual(events, [{ actor, target, type: 'staff', damage: 2, critical: true, category: null }]);
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
