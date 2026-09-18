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
  assert.deepEqual(events, [{ actor, target, type: 'staff', damage: 2, critical: true }]);
});
