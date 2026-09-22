import test from 'node:test';
import assert from 'node:assert/strict';
import CombatConditionSystem from '../../src/game/CombatConditionSystem.js';

test('two-edged sword keeps the highest granted multiplier for one combatant', () => {
  const conditions = new CombatConditionSystem();
  const combatant = {};

  conditions.applyTwoEdgedSword(combatant, 2);
  conditions.applyTwoEdgedSword(combatant, 4);
  conditions.applyTwoEdgedSword(combatant, 2);

  assert.equal(conditions.getTwoEdgedSwordMultiplier(combatant), 4);
});

test('a critical uses the higher two-edged sword multiplier of its attacker and target', () => {
  const conditions = new CombatConditionSystem();
  const attacker = {};
  const target = {};

  conditions.applyTwoEdgedSword(attacker, 2);
  conditions.applyTwoEdgedSword(target, 4);

  assert.equal(conditions.getCriticalDamageMultiplier(attacker, target), 4);
  conditions.clearTwoEdgedSword(target);
  assert.equal(conditions.getCriticalDamageMultiplier(attacker, target), 2);
  conditions.clearTwoEdgedSword(attacker);
  assert.equal(conditions.getCriticalDamageMultiplier(attacker, target), 1);
});
